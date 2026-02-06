-- ==============================================
-- SUPPLIER AUDIT TRAIL SYSTEM
-- ==============================================
-- Comprehensive audit logging for:
-- - Purchase orders (create, update, status changes)
-- - Order items (modifications, substitutions)
-- - Payments (received, marked paid)
-- - Inventory changes (stock adjustments)
-- - Invoices (created, sent, paid)
-- - Product catalog changes
-- - Buyer link changes
-- ==============================================

-- 1. Create the audit log table
CREATE TABLE IF NOT EXISTS supplier_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who made the change
  actor_id UUID REFERENCES auth.users(id),
  actor_type VARCHAR(50), -- 'supplier', 'buyer', 'system', 'admin'
  actor_name VARCHAR(255),
  
  -- What entity was changed
  entity_type VARCHAR(100) NOT NULL, -- 'order', 'order_item', 'payment', 'invoice', 'product', 'buyer_link', 'inventory'
  entity_id UUID NOT NULL,
  entity_ref VARCHAR(100), -- Human-readable reference (order_number, invoice_number, SKU, etc.)
  
  -- The change
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'status_change', 'payment', 'adjustment'
  action_label VARCHAR(255), -- Human-readable action description
  
  -- Details
  old_values JSONB, -- Previous state (for updates)
  new_values JSONB, -- New state
  changed_fields TEXT[], -- List of fields that changed
  
  -- Context
  supplier_id UUID REFERENCES professionals(id),
  buyer_id UUID REFERENCES professionals(id),
  order_id UUID, -- Reference to order if applicable
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  notes TEXT,
  
  -- Financial tracking
  amount_before DECIMAL(12,2),
  amount_after DECIMAL(12,2),
  amount_change DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'DZD',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'order', 'order_item', 'payment', 'invoice', 'product', 
    'buyer_link', 'inventory', 'settings', 'warehouse', 'catalog'
  )),
  CONSTRAINT valid_action CHECK (action IN (
    'create', 'update', 'delete', 'status_change', 'payment_received',
    'payment_marked', 'adjustment', 'substitution', 'approval', 'rejection',
    'shipment', 'delivery', 'cancellation', 'refund', 'import', 'export'
  ))
);

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_supplier_id ON supplier_audit_log(supplier_id);
CREATE INDEX IF NOT EXISTS idx_audit_buyer_id ON supplier_audit_log(buyer_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON supplier_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON supplier_audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON supplier_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON supplier_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_order_id ON supplier_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON supplier_audit_log(actor_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_supplier_date ON supplier_audit_log(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_date ON supplier_audit_log(entity_type, created_at DESC);

-- 3. RLS Policies
ALTER TABLE supplier_audit_log ENABLE ROW LEVEL SECURITY;

-- Suppliers can view their own audit logs
DROP POLICY IF EXISTS "supplier_audit_select" ON supplier_audit_log;
CREATE POLICY "supplier_audit_select" ON supplier_audit_log
  FOR SELECT
  USING (
    supplier_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
    OR buyer_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Only system can insert (via triggers or service role)
DROP POLICY IF EXISTS "supplier_audit_insert" ON supplier_audit_log;
CREATE POLICY "supplier_audit_insert" ON supplier_audit_log
  FOR INSERT
  WITH CHECK (true);

-- 4. Helper function to log audit events
CREATE OR REPLACE FUNCTION log_supplier_audit(
  p_actor_id UUID,
  p_actor_type VARCHAR,
  p_actor_name VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_entity_ref VARCHAR,
  p_action VARCHAR,
  p_action_label VARCHAR,
  p_old_values JSONB,
  p_new_values JSONB,
  p_changed_fields TEXT[],
  p_supplier_id UUID,
  p_buyer_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_amount_before DECIMAL DEFAULT NULL,
  p_amount_after DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO supplier_audit_log (
    actor_id, actor_type, actor_name,
    entity_type, entity_id, entity_ref,
    action, action_label,
    old_values, new_values, changed_fields,
    supplier_id, buyer_id, order_id,
    amount_before, amount_after, amount_change,
    notes
  ) VALUES (
    p_actor_id, p_actor_type, p_actor_name,
    p_entity_type, p_entity_id, p_entity_ref,
    p_action, p_action_label,
    p_old_values, p_new_values, p_changed_fields,
    p_supplier_id, p_buyer_id, p_order_id,
    p_amount_before, p_amount_after, 
    CASE WHEN p_amount_before IS NOT NULL AND p_amount_after IS NOT NULL 
         THEN p_amount_after - p_amount_before 
         ELSE NULL END,
    p_notes
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- 5. Trigger function for order changes
CREATE OR REPLACE FUNCTION audit_supplier_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_old_values JSONB;
  v_new_values JSONB;
  v_action VARCHAR;
  v_action_label VARCHAR;
  v_actor_name VARCHAR;
BEGIN
  -- Get actor name
  SELECT COALESCE(business_name, 'Unknown') INTO v_actor_name
  FROM professionals WHERE auth_user_id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_action_label := 'Order created: ' || NEW.order_number;
    v_new_values := jsonb_build_object(
      'order_number', NEW.order_number,
      'status', NEW.status,
      'total', NEW.total,
      'items_count', (SELECT COUNT(*) FROM supplier_purchase_order_items WHERE order_id = NEW.id)
    );
    
    INSERT INTO supplier_audit_log (
      actor_id, actor_type, actor_name,
      entity_type, entity_id, entity_ref,
      action, action_label,
      new_values,
      supplier_id, buyer_id, order_id,
      amount_after
    ) VALUES (
      auth.uid(), 'buyer', v_actor_name,
      'order', NEW.id, NEW.order_number,
      v_action, v_action_label,
      v_new_values,
      NEW.supplier_id, NEW.buyer_id, NEW.id,
      NEW.total
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed_fields := array_append(v_changed_fields, 'status');
    END IF;
    IF OLD.total IS DISTINCT FROM NEW.total THEN
      v_changed_fields := array_append(v_changed_fields, 'total');
    END IF;
    IF OLD.paid_at IS DISTINCT FROM NEW.paid_at AND NEW.paid_at IS NOT NULL THEN
      v_changed_fields := array_append(v_changed_fields, 'paid_at');
    END IF;
    IF OLD.shipped_at IS DISTINCT FROM NEW.shipped_at AND NEW.shipped_at IS NOT NULL THEN
      v_changed_fields := array_append(v_changed_fields, 'shipped_at');
    END IF;
    IF OLD.delivered_at IS DISTINCT FROM NEW.delivered_at AND NEW.delivered_at IS NOT NULL THEN
      v_changed_fields := array_append(v_changed_fields, 'delivered_at');
    END IF;
    
    -- Only log if something important changed
    IF array_length(v_changed_fields, 1) > 0 THEN
      -- Determine action type
      IF 'status' = ANY(v_changed_fields) THEN
        v_action := 'status_change';
        v_action_label := 'Order ' || NEW.order_number || ' status: ' || OLD.status || ' → ' || NEW.status;
      ELSIF 'paid_at' = ANY(v_changed_fields) THEN
        v_action := 'payment_marked';
        v_action_label := 'Order ' || NEW.order_number || ' marked as paid';
      ELSIF 'shipped_at' = ANY(v_changed_fields) THEN
        v_action := 'shipment';
        v_action_label := 'Order ' || NEW.order_number || ' shipped';
      ELSIF 'delivered_at' = ANY(v_changed_fields) THEN
        v_action := 'delivery';
        v_action_label := 'Order ' || NEW.order_number || ' delivered';
      ELSE
        v_action := 'update';
        v_action_label := 'Order ' || NEW.order_number || ' updated';
      END IF;
      
      v_old_values := jsonb_build_object(
        'status', OLD.status,
        'total', OLD.total,
        'paid_at', OLD.paid_at,
        'shipped_at', OLD.shipped_at
      );
      v_new_values := jsonb_build_object(
        'status', NEW.status,
        'total', NEW.total,
        'paid_at', NEW.paid_at,
        'shipped_at', NEW.shipped_at
      );
      
      INSERT INTO supplier_audit_log (
        actor_id, actor_type, actor_name,
        entity_type, entity_id, entity_ref,
        action, action_label,
        old_values, new_values, changed_fields,
        supplier_id, buyer_id, order_id,
        amount_before, amount_after
      ) VALUES (
        auth.uid(), 
        CASE WHEN EXISTS (SELECT 1 FROM professionals WHERE id = NEW.supplier_id AND auth_user_id = auth.uid()) 
             THEN 'supplier' ELSE 'buyer' END,
        v_actor_name,
        'order', NEW.id, NEW.order_number,
        v_action, v_action_label,
        v_old_values, v_new_values, v_changed_fields,
        NEW.supplier_id, NEW.buyer_id, NEW.id,
        OLD.total, NEW.total
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Trigger function for invoice changes
CREATE OR REPLACE FUNCTION audit_supplier_invoice_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action VARCHAR;
  v_action_label VARCHAR;
  v_actor_name VARCHAR;
BEGIN
  SELECT COALESCE(business_name, 'Unknown') INTO v_actor_name
  FROM professionals WHERE auth_user_id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO supplier_audit_log (
      actor_id, actor_type, actor_name,
      entity_type, entity_id, entity_ref,
      action, action_label,
      new_values,
      supplier_id, buyer_id, order_id,
      amount_after
    ) VALUES (
      auth.uid(), 'supplier', v_actor_name,
      'invoice', NEW.id, NEW.invoice_number,
      'create', 'Invoice created: ' || NEW.invoice_number,
      jsonb_build_object('invoice_number', NEW.invoice_number, 'total', NEW.total_amount, 'status', NEW.status),
      NEW.supplier_id, NEW.buyer_id, NEW.order_id,
      NEW.total_amount
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO supplier_audit_log (
      actor_id, actor_type, actor_name,
      entity_type, entity_id, entity_ref,
      action, action_label,
      old_values, new_values, changed_fields,
      supplier_id, buyer_id, order_id,
      amount_before, amount_after
    ) VALUES (
      auth.uid(), 'supplier', v_actor_name,
      'invoice', NEW.id, NEW.invoice_number,
      'status_change', 'Invoice ' || NEW.invoice_number || ' status: ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      ARRAY['status'],
      NEW.supplier_id, NEW.buyer_id, NEW.order_id,
      OLD.total_amount, NEW.total_amount
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Trigger function for product catalog changes
CREATE OR REPLACE FUNCTION audit_supplier_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_name VARCHAR;
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT COALESCE(business_name, 'Unknown') INTO v_actor_name
  FROM professionals WHERE auth_user_id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO supplier_audit_log (
      actor_id, actor_type, actor_name,
      entity_type, entity_id, entity_ref,
      action, action_label,
      new_values,
      supplier_id,
      amount_after
    ) VALUES (
      auth.uid(), 'supplier', v_actor_name,
      'product', NEW.id, NEW.sku,
      'create', 'Product added: ' || NEW.name || ' (SKU: ' || COALESCE(NEW.sku, 'N/A') || ')',
      jsonb_build_object('name', NEW.name, 'sku', NEW.sku, 'price', NEW.unit_price, 'stock', NEW.stock_quantity),
      NEW.supplier_id,
      NEW.unit_price
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track price changes
    IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
      v_changed_fields := array_append(v_changed_fields, 'unit_price');
    END IF;
    -- Track stock changes
    IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
      v_changed_fields := array_append(v_changed_fields, 'stock_quantity');
    END IF;
    -- Track status changes
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      v_changed_fields := array_append(v_changed_fields, 'is_active');
    END IF;
    
    IF array_length(v_changed_fields, 1) > 0 THEN
      INSERT INTO supplier_audit_log (
        actor_id, actor_type, actor_name,
        entity_type, entity_id, entity_ref,
        action, action_label,
        old_values, new_values, changed_fields,
        supplier_id,
        amount_before, amount_after
      ) VALUES (
        auth.uid(), 'supplier', v_actor_name,
        'product', NEW.id, NEW.sku,
        CASE WHEN 'stock_quantity' = ANY(v_changed_fields) THEN 'adjustment' ELSE 'update' END,
        'Product ' || NEW.name || ' updated: ' || array_to_string(v_changed_fields, ', '),
        jsonb_build_object('price', OLD.unit_price, 'stock', OLD.stock_quantity, 'active', OLD.is_active),
        jsonb_build_object('price', NEW.unit_price, 'stock', NEW.stock_quantity, 'active', NEW.is_active),
        v_changed_fields,
        NEW.supplier_id,
        OLD.unit_price, NEW.unit_price
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO supplier_audit_log (
      actor_id, actor_type, actor_name,
      entity_type, entity_id, entity_ref,
      action, action_label,
      old_values,
      supplier_id
    ) VALUES (
      auth.uid(), 'supplier', v_actor_name,
      'product', OLD.id, OLD.sku,
      'delete', 'Product deleted: ' || OLD.name,
      jsonb_build_object('name', OLD.name, 'sku', OLD.sku, 'price', OLD.unit_price),
      OLD.supplier_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. Create the triggers
DROP TRIGGER IF EXISTS audit_order_trigger ON supplier_purchase_orders;
CREATE TRIGGER audit_order_trigger
  AFTER INSERT OR UPDATE ON supplier_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_supplier_order_changes();

DROP TRIGGER IF EXISTS audit_invoice_trigger ON supplier_invoices;
CREATE TRIGGER audit_invoice_trigger
  AFTER INSERT OR UPDATE ON supplier_invoices
  FOR EACH ROW
  EXECUTE FUNCTION audit_supplier_invoice_changes();

DROP TRIGGER IF EXISTS audit_product_trigger ON supplier_product_catalog;
CREATE TRIGGER audit_product_trigger
  AFTER INSERT OR UPDATE OR DELETE ON supplier_product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION audit_supplier_product_changes();

-- 9. Create view for accounting reports
CREATE OR REPLACE VIEW supplier_audit_summary AS
SELECT 
  supplier_id,
  DATE_TRUNC('month', created_at) as month,
  entity_type,
  action,
  COUNT(*) as event_count,
  SUM(COALESCE(amount_change, 0)) as total_amount_change,
  SUM(CASE WHEN amount_change > 0 THEN amount_change ELSE 0 END) as total_credits,
  SUM(CASE WHEN amount_change < 0 THEN ABS(amount_change) ELSE 0 END) as total_debits
FROM supplier_audit_log
GROUP BY supplier_id, DATE_TRUNC('month', created_at), entity_type, action;

-- 10. Grant access to the view
GRANT SELECT ON supplier_audit_summary TO authenticated;

SELECT 'Supplier audit trail system created successfully' as result;

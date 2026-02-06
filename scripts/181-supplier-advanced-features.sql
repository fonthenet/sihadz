-- ============================================================================
-- SUPPLIER ADVANCED COMMERCIAL FEATURES
-- Tiered Pricing, Buyer Groups, Order Templates, Advanced Inventory
-- ============================================================================

-- ============================================================================
-- BUYER GROUPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_buyer_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_payment_terms TEXT DEFAULT 'cash',
  default_discount_percent DECIMAL(5,2) DEFAULT 0,
  default_credit_limit DECIMAL(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_buyer_groups_supplier ON supplier_buyer_groups(supplier_id);

-- Add buyer_group_id to supplier_buyer_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_buyer_links' AND column_name = 'buyer_group_id'
  ) THEN
    ALTER TABLE supplier_buyer_links ADD COLUMN buyer_group_id UUID REFERENCES supplier_buyer_groups(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_buyer_links_group ON supplier_buyer_links(buyer_group_id);

-- ============================================================================
-- TIERED PRICING (Volume Discounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES supplier_product_catalog(id) ON DELETE CASCADE,
  buyer_group_id UUID REFERENCES supplier_buyer_groups(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Tier definition
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER, -- NULL means unlimited
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  fixed_price DECIMAL(12,2), -- Alternative to discount
  
  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: Must have product_id OR buyer_group_id OR buyer_id
  CONSTRAINT pricing_tier_target CHECK (
    (product_id IS NOT NULL)::int + 
    (buyer_group_id IS NOT NULL)::int + 
    (buyer_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_supplier ON supplier_pricing_tiers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product ON supplier_pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_buyer_group ON supplier_pricing_tiers(buyer_group_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_buyer ON supplier_pricing_tiers(buyer_id);

-- ============================================================================
-- ORDER TEMPLATES (Frequently Ordered Items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_order_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES professionals(id) ON DELETE CASCADE, -- NULL = general template
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template items stored as JSONB for flexibility
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{"product_id": "uuid", "quantity": 10, "notes": "..."}, ...]
  
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_templates_supplier ON supplier_order_templates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_templates_buyer ON supplier_order_templates(buyer_id);

-- ============================================================================
-- RECURRING ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_recurring_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  template_id UUID REFERENCES supplier_order_templates(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday) for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  custom_schedule JSONB, -- For custom schedules
  
  -- Items
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  next_order_date DATE NOT NULL,
  last_order_date DATE,
  total_orders_created INTEGER DEFAULT 0,
  
  -- Auto-processing
  auto_confirm BOOLEAN DEFAULT FALSE,
  auto_ship BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_orders_supplier ON supplier_recurring_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_buyer ON supplier_recurring_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_next_date ON supplier_recurring_orders(next_order_date) WHERE is_active = TRUE;

-- ============================================================================
-- MULTI-WAREHOUSE SUPPORT
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT, -- Warehouse code (e.g., "WH-001")
  address_line1 TEXT,
  address_line2 TEXT,
  wilaya TEXT,
  commune TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Only one default per supplier
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, code)
);

CREATE INDEX IF NOT EXISTS idx_supplier_warehouses_supplier ON supplier_warehouses(supplier_id);

-- Add warehouse_id to product catalog (for stock tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_product_catalog' AND column_name = 'default_warehouse_id'
  ) THEN
    ALTER TABLE supplier_product_catalog ADD COLUMN default_warehouse_id UUID REFERENCES supplier_warehouses(id);
  END IF;
END $$;

-- Warehouse stock levels
CREATE TABLE IF NOT EXISTS supplier_warehouse_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES supplier_warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES supplier_product_catalog(id) ON DELETE CASCADE,
  
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0, -- Reserved for pending orders
  
  -- Batch tracking
  batch_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  
  -- Location within warehouse
  location_code TEXT, -- e.g., "A-12-B-3"
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(warehouse_id, product_id, batch_number, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON supplier_warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON supplier_warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_expiry ON supplier_warehouse_stock(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================================================
-- ADVANCED ORDER FEATURES
-- ============================================================================

-- Add warehouse_id to purchase orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_purchase_orders' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE supplier_purchase_orders ADD COLUMN warehouse_id UUID REFERENCES supplier_warehouses(id);
  END IF;
END $$;

-- Add template_id to purchase orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_purchase_orders' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE supplier_purchase_orders ADD COLUMN template_id UUID REFERENCES supplier_order_templates(id);
  END IF;
END $$;

-- Add recurring_order_id to purchase orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_purchase_orders' AND column_name = 'recurring_order_id'
  ) THEN
    ALTER TABLE supplier_purchase_orders ADD COLUMN recurring_order_id UUID REFERENCES supplier_recurring_orders(id);
  END IF;
END $$;

-- ============================================================================
-- COMMERCIAL REPORTS & ANALYTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_sales_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_products_sold INTEGER DEFAULT 0,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  unique_buyers INTEGER DEFAULT 0,
  
  -- Top buyers (JSONB array)
  top_buyers JSONB DEFAULT '[]'::jsonb,
  
  -- Top products (JSONB array)
  top_products JSONB DEFAULT '[]'::jsonb,
  
  -- Calculated at
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_sales_summary_supplier ON supplier_sales_summary(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_summary_period ON supplier_sales_summary(period_start, period_end);

-- ============================================================================
-- PRICE HISTORY (for tracking price changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES supplier_product_catalog(id) ON DELETE CASCADE,
  
  old_price DECIMAL(12,2),
  new_price DECIMAL(12,2) NOT NULL,
  changed_by UUID, -- User who made the change
  reason TEXT,
  
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON supplier_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON supplier_price_history(effective_date);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to calculate price with tiers
CREATE OR REPLACE FUNCTION calculate_supplier_price(
  p_product_id UUID,
  p_buyer_id UUID,
  p_quantity INTEGER,
  p_supplier_id UUID
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_base_price DECIMAL(12,2);
  v_final_price DECIMAL(12,2);
  v_buyer_group_id UUID;
  v_tier RECORD;
BEGIN
  -- Get base price
  SELECT unit_price INTO v_base_price
  FROM supplier_product_catalog
  WHERE id = p_product_id AND supplier_id = p_supplier_id;
  
  IF v_base_price IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get buyer group
  SELECT buyer_group_id INTO v_buyer_group_id
  FROM supplier_buyer_links
  WHERE buyer_id = p_buyer_id AND supplier_id = p_supplier_id AND status = 'active';
  
  -- Find applicable pricing tier (priority order: buyer-specific > group > product)
  SELECT * INTO v_tier
  FROM supplier_pricing_tiers
  WHERE supplier_id = p_supplier_id
    AND (
      (buyer_id = p_buyer_id) OR
      (buyer_group_id = v_buyer_group_id) OR
      (product_id = p_product_id)
    )
    AND min_quantity <= p_quantity
    AND (max_quantity IS NULL OR max_quantity >= p_quantity)
    AND is_active = TRUE
  ORDER BY 
    CASE WHEN buyer_id IS NOT NULL THEN 1 ELSE 2 END,
    priority ASC,
    min_quantity DESC
  LIMIT 1;
  
  -- Apply tier pricing
  IF v_tier IS NOT NULL THEN
    IF v_tier.fixed_price IS NOT NULL THEN
      v_final_price := v_tier.fixed_price;
    ELSE
      v_final_price := v_base_price * (1 - v_tier.discount_percent / 100);
    END IF;
  ELSE
    v_final_price := v_base_price;
  END IF;
  
  RETURN v_final_price;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track price changes
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
    INSERT INTO supplier_price_history (product_id, old_price, new_price, effective_date)
    VALUES (NEW.id, OLD.unit_price, NEW.unit_price, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_price_changes ON supplier_product_catalog;
CREATE TRIGGER trigger_track_price_changes
  AFTER UPDATE ON supplier_product_catalog
  FOR EACH ROW
  WHEN (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
  EXECUTE FUNCTION track_price_changes();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE supplier_buyer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;

-- Buyer Groups: Supplier can manage their own
DROP POLICY IF EXISTS supplier_buyer_groups_owner ON supplier_buyer_groups;
CREATE POLICY supplier_buyer_groups_owner ON supplier_buyer_groups
  FOR ALL USING (supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Pricing Tiers: Supplier can manage their own
DROP POLICY IF EXISTS supplier_pricing_tiers_owner ON supplier_pricing_tiers;
CREATE POLICY supplier_pricing_tiers_owner ON supplier_pricing_tiers
  FOR ALL USING (supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Order Templates: Supplier can manage their own
DROP POLICY IF EXISTS supplier_order_templates_owner ON supplier_order_templates;
CREATE POLICY supplier_order_templates_owner ON supplier_order_templates
  FOR ALL USING (supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Recurring Orders: Supplier can manage their own
DROP POLICY IF EXISTS supplier_recurring_orders_owner ON supplier_recurring_orders;
CREATE POLICY supplier_recurring_orders_owner ON supplier_recurring_orders
  FOR ALL USING (supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Warehouses: Supplier can manage their own
DROP POLICY IF EXISTS supplier_warehouses_owner ON supplier_warehouses;
CREATE POLICY supplier_warehouses_owner ON supplier_warehouses
  FOR ALL USING (supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Warehouse Stock: Supplier can manage their own
DROP POLICY IF EXISTS supplier_warehouse_stock_owner ON supplier_warehouse_stock;
CREATE POLICY supplier_warehouse_stock_owner ON supplier_warehouse_stock
  FOR ALL USING (
    warehouse_id IN (
      SELECT id FROM supplier_warehouses 
      WHERE supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- Sales Summary: Supplier can view their own
DROP POLICY IF EXISTS supplier_sales_summary_owner ON supplier_sales_summary;
CREATE POLICY supplier_sales_summary_owner ON supplier_sales_summary
  FOR SELECT USING (supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Price History: Supplier can view their own
DROP POLICY IF EXISTS supplier_price_history_owner ON supplier_price_history;
CREATE POLICY supplier_price_history_owner ON supplier_price_history
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM supplier_product_catalog 
      WHERE supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- DONE
-- ============================================================================

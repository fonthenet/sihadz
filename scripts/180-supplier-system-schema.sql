-- ============================================================================
-- SUPPLIER SYSTEM - DATABASE SCHEMA
-- Pharmaceutical Suppliers & Medical Equipment Suppliers
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ADD NEW PROFESSIONAL TYPES
-- ============================================================================

-- Add supplier types to professional_type enum
DO $$ 
BEGIN
  -- Add pharma_supplier if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pharma_supplier' AND enumtypid = 'professional_type'::regtype) THEN
    ALTER TYPE professional_type ADD VALUE IF NOT EXISTS 'pharma_supplier';
  END IF;
  
  -- Add equipment_supplier if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'equipment_supplier' AND enumtypid = 'professional_type'::regtype) THEN
    ALTER TYPE professional_type ADD VALUE IF NOT EXISTS 'equipment_supplier';
  END IF;
EXCEPTION
  WHEN others THEN
    -- If enum doesn't exist or other error, try direct add
    BEGIN
      ALTER TYPE professional_type ADD VALUE IF NOT EXISTS 'pharma_supplier';
      ALTER TYPE professional_type ADD VALUE IF NOT EXISTS 'equipment_supplier';
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- Update profiles table check constraint if it exists
DO $$
BEGIN
  -- Drop existing constraint if exists
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
  
  -- Add new constraint including supplier types
  ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
    CHECK (user_type IN (
      'patient', 'doctor', 'pharmacy', 'laboratory', 'clinic', 
      'ambulance', 'nurse', 'professional', 'admin', 'super_admin',
      'pharma_supplier', 'equipment_supplier'
    ));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ============================================================================
-- SUPPLIER PRODUCT CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  parent_id UUID REFERENCES supplier_product_categories(id),
  supplier_type TEXT CHECK (supplier_type IN ('pharma_supplier', 'equipment_supplier', 'both')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories for pharma suppliers
INSERT INTO supplier_product_categories (id, name, name_ar, name_fr, supplier_type, sort_order) VALUES
  ('10000000-0000-0000-0001-000000000001', 'Medications', 'أدوية', 'Médicaments', 'pharma_supplier', 1),
  ('10000000-0000-0000-0001-000000000002', 'Generic Drugs', 'أدوية جنيسة', 'Médicaments Génériques', 'pharma_supplier', 2),
  ('10000000-0000-0000-0001-000000000003', 'Brand Drugs', 'أدوية الماركات', 'Médicaments de Marque', 'pharma_supplier', 3),
  ('10000000-0000-0000-0001-000000000004', 'OTC Products', 'منتجات بدون وصفة', 'Produits OTC', 'pharma_supplier', 4),
  ('10000000-0000-0000-0001-000000000005', 'Vaccines', 'لقاحات', 'Vaccins', 'pharma_supplier', 5),
  ('10000000-0000-0000-0001-000000000006', 'Controlled Substances', 'مواد مراقبة', 'Substances Contrôlées', 'pharma_supplier', 6),
  ('10000000-0000-0000-0001-000000000007', 'Medical Consumables', 'مستهلكات طبية', 'Consommables Médicaux', 'both', 7),
  ('10000000-0000-0000-0001-000000000008', 'Diagnostic Equipment', 'معدات التشخيص', 'Équipement de Diagnostic', 'equipment_supplier', 8),
  ('10000000-0000-0000-0001-000000000009', 'Surgical Instruments', 'أدوات جراحية', 'Instruments Chirurgicaux', 'equipment_supplier', 9),
  ('10000000-0000-0000-0001-000000000010', 'Laboratory Equipment', 'معدات المختبر', 'Équipement de Laboratoire', 'equipment_supplier', 10),
  ('10000000-0000-0000-0001-000000000011', 'Patient Monitoring', 'مراقبة المرضى', 'Surveillance des Patients', 'equipment_supplier', 11),
  ('10000000-0000-0000-0001-000000000012', 'Mobility Aids', 'أجهزة مساعدة الحركة', 'Aides à la Mobilité', 'equipment_supplier', 12),
  ('10000000-0000-0000-0001-000000000013', 'Rehabilitation Equipment', 'معدات إعادة التأهيل', 'Équipement de Réhabilitation', 'equipment_supplier', 13),
  ('10000000-0000-0000-0001-000000000014', 'Dental Equipment', 'معدات طب الأسنان', 'Équipement Dentaire', 'equipment_supplier', 14)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUPPLIER PRODUCT CATALOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Product identification
  sku TEXT,                              -- Supplier's internal SKU
  barcode TEXT,                          -- EAN-13 or internal code
  name TEXT NOT NULL,                    -- Product name (English)
  name_ar TEXT,                          -- Product name (Arabic)
  name_fr TEXT,                          -- Product name (French)
  description TEXT,
  
  -- For medications
  dci_code TEXT,                         -- DCI code for generic matching
  generic_name TEXT,                     -- Generic/DCI name
  form TEXT,                             -- tablet, capsule, syrup, injection, etc.
  dosage TEXT,                           -- e.g., "500mg", "10mg/ml"
  packaging TEXT,                        -- e.g., "Box of 20", "100ml Bottle"
  
  -- Classification
  category_id UUID REFERENCES supplier_product_categories(id),
  manufacturer TEXT,
  country_of_origin TEXT,
  
  -- Pricing
  unit_price DECIMAL(12,2) NOT NULL,     -- Price per unit (DZD)
  min_order_qty INTEGER DEFAULT 1,       -- Minimum order quantity
  pack_size INTEGER DEFAULT 1,           -- Units per pack
  bulk_discount_qty INTEGER,             -- Quantity for bulk discount
  bulk_discount_percent DECIMAL(5,2),    -- Discount percentage
  
  -- CNAS/Chifa (for pharma)
  is_chifa_listed BOOLEAN DEFAULT FALSE,
  reimbursement_rate INTEGER DEFAULT 0,  -- 0, 80, or 100
  tarif_reference DECIMAL(10,2),         -- CNAS reference price
  
  -- Regulatory (for pharma)
  requires_prescription BOOLEAN DEFAULT FALSE,
  is_controlled BOOLEAN DEFAULT FALSE,
  controlled_tableau TEXT,               -- A, B, or C
  storage_conditions TEXT,               -- room_temp, refrigerated, frozen
  
  -- Availability
  in_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER,                -- Available stock (optional)
  lead_time_days INTEGER DEFAULT 1,      -- Days to deliver
  
  -- For equipment
  warranty_months INTEGER,
  installation_included BOOLEAN DEFAULT FALSE,
  maintenance_available BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(supplier_id, sku)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_supplier ON supplier_product_catalog(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_category ON supplier_product_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_barcode ON supplier_product_catalog(barcode);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_name ON supplier_product_catalog(name);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_dci ON supplier_product_catalog(dci_code);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_active ON supplier_product_catalog(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- SUPPLIER-BUYER LINKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_buyer_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  
  -- Terms
  payment_terms TEXT DEFAULT 'cash',     -- cash, 15_days, 30_days, 60_days, 90_days
  credit_limit DECIMAL(12,2),            -- Max outstanding credit
  discount_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  requested_by TEXT CHECK (requested_by IN ('supplier', 'buyer')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  
  -- Constraints
  UNIQUE(supplier_id, buyer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_buyer_links_supplier ON supplier_buyer_links(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_buyer_links_buyer ON supplier_buyer_links(buyer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_buyer_links_status ON supplier_buyer_links(status);

-- ============================================================================
-- SUPPLIER PURCHASE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Order identification
  order_number TEXT NOT NULL,            -- PO-2026-00001
  
  -- Parties
  buyer_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  link_id UUID REFERENCES supplier_buyer_links(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',       -- Being prepared by buyer
    'submitted',   -- Sent to supplier
    'confirmed',   -- Accepted by supplier
    'processing',  -- Being prepared
    'shipped',     -- In transit
    'delivered',   -- Received by buyer
    'completed',   -- Fully received and closed
    'cancelled',   -- Cancelled
    'rejected'     -- Rejected by supplier
  )),
  
  -- Financials
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Delivery
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_address TEXT,
  delivery_wilaya TEXT,
  delivery_commune TEXT,
  
  -- Tracking
  tracking_number TEXT,
  carrier TEXT,
  
  -- Notes
  buyer_notes TEXT,
  supplier_notes TEXT,
  internal_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(order_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_orders_buyer ON supplier_purchase_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier ON supplier_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_number ON supplier_purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_created ON supplier_purchase_orders(created_at DESC);

-- ============================================================================
-- SUPPLIER PURCHASE ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES supplier_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES supplier_product_catalog(id),
  
  -- Ordered
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  
  -- Received (filled when order is received)
  quantity_received INTEGER DEFAULT 0,
  batch_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  received_at TIMESTAMPTZ,
  
  -- Product snapshot (in case product changes)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_barcode TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_order ON supplier_purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_product ON supplier_purchase_order_items(product_id);

-- ============================================================================
-- SUPPLIER INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Invoice identification
  invoice_number TEXT NOT NULL,          -- INV-SUP-2026-00001
  
  -- Parties
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  order_id UUID REFERENCES supplier_purchase_orders(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',       -- Being prepared
    'sent',        -- Sent to buyer
    'partial',     -- Partially paid
    'paid',        -- Fully paid
    'overdue',     -- Past due date
    'cancelled',   -- Cancelled
    'disputed'     -- Under dispute
  )),
  
  -- Financials
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  
  -- Payment terms
  payment_terms TEXT DEFAULT 'cash',     -- cash, 15_days, 30_days, etc.
  due_date DATE,
  
  -- Notes
  notes TEXT,
  payment_instructions TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(invoice_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_buyer ON supplier_invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_order ON supplier_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due ON supplier_invoices(due_date);

-- ============================================================================
-- SUPPLIER INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES supplier_purchase_order_items(id),
  
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice ON supplier_invoice_items(invoice_id);

-- ============================================================================
-- SUPPLIER INVOICE PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash', 'bank_transfer', 'cheque', 'mobile_payment', 'credit'
  )),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,                        -- Check number, transfer ID, etc.
  
  notes TEXT,
  recorded_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice ON supplier_invoice_payments(invoice_id);

-- ============================================================================
-- LINK PHARMACY INVENTORY TO SUPPLIER ORDERS
-- ============================================================================

-- Add supplier_order_id to pharmacy_inventory if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pharmacy_inventory' AND column_name = 'supplier_order_id'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD COLUMN supplier_order_id UUID REFERENCES supplier_purchase_orders(id);
    ALTER TABLE pharmacy_inventory ADD COLUMN supplier_order_item_id UUID REFERENCES supplier_purchase_order_items(id);
  END IF;
END $$;

-- ============================================================================
-- SUPPLIER SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE UNIQUE,
  
  -- Order settings
  min_order_value DECIMAL(12,2),         -- Minimum order amount
  free_shipping_threshold DECIMAL(12,2), -- Free shipping above this
  default_shipping_cost DECIMAL(12,2) DEFAULT 0,
  default_payment_terms TEXT DEFAULT 'cash',
  default_lead_time_days INTEGER DEFAULT 3,
  
  -- Acceptance settings
  auto_accept_orders BOOLEAN DEFAULT FALSE,
  accept_orders_from_anyone BOOLEAN DEFAULT TRUE,
  
  -- Business hours
  business_hours JSONB,                  -- {"mon": {"open": "08:00", "close": "17:00"}, ...}
  
  -- Notifications
  notify_new_orders BOOLEAN DEFAULT TRUE,
  notify_new_link_requests BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORDER NUMBER SEQUENCE
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS supplier_order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS supplier_invoice_number_seq START 1;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_supplier_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('supplier_order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_supplier_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-SUP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('supplier_invoice_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_supplier_order_number ON supplier_purchase_orders;
CREATE TRIGGER trigger_supplier_order_number
  BEFORE INSERT ON supplier_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION generate_supplier_order_number();

DROP TRIGGER IF EXISTS trigger_supplier_invoice_number ON supplier_invoices;
CREATE TRIGGER trigger_supplier_invoice_number
  BEFORE INSERT ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION generate_supplier_invoice_number();

-- ============================================================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all supplier tables
DROP TRIGGER IF EXISTS trigger_supplier_catalog_updated ON supplier_product_catalog;
CREATE TRIGGER trigger_supplier_catalog_updated
  BEFORE UPDATE ON supplier_product_catalog
  FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at();

DROP TRIGGER IF EXISTS trigger_supplier_links_updated ON supplier_buyer_links;
CREATE TRIGGER trigger_supplier_links_updated
  BEFORE UPDATE ON supplier_buyer_links
  FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at();

DROP TRIGGER IF EXISTS trigger_supplier_orders_updated ON supplier_purchase_orders;
CREATE TRIGGER trigger_supplier_orders_updated
  BEFORE UPDATE ON supplier_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at();

DROP TRIGGER IF EXISTS trigger_supplier_invoices_updated ON supplier_invoices;
CREATE TRIGGER trigger_supplier_invoices_updated
  BEFORE UPDATE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at();

DROP TRIGGER IF EXISTS trigger_supplier_settings_updated ON supplier_settings;
CREATE TRIGGER trigger_supplier_settings_updated
  BEFORE UPDATE ON supplier_settings
  FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE supplier_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_buyer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_settings ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read
DROP POLICY IF EXISTS supplier_categories_read ON supplier_product_categories;
CREATE POLICY supplier_categories_read ON supplier_product_categories
  FOR SELECT USING (true);

-- Product Catalog: suppliers can manage their own, linked buyers can view
DROP POLICY IF EXISTS supplier_catalog_supplier_all ON supplier_product_catalog;
CREATE POLICY supplier_catalog_supplier_all ON supplier_product_catalog
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS supplier_catalog_buyer_read ON supplier_product_catalog;
CREATE POLICY supplier_catalog_buyer_read ON supplier_product_catalog
  FOR SELECT USING (
    is_active = TRUE AND (
      -- Linked buyers can see
      supplier_id IN (
        SELECT supplier_id FROM supplier_buyer_links 
        WHERE buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
        AND status = 'active'
      )
      OR
      -- Or anyone if supplier accepts orders from anyone
      supplier_id IN (
        SELECT supplier_id FROM supplier_settings WHERE accept_orders_from_anyone = TRUE
      )
    )
  );

-- Buyer Links: both parties can see, manage appropriately
DROP POLICY IF EXISTS supplier_links_supplier ON supplier_buyer_links;
CREATE POLICY supplier_links_supplier ON supplier_buyer_links
  FOR ALL USING (
    supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS supplier_links_buyer ON supplier_buyer_links;
CREATE POLICY supplier_links_buyer ON supplier_buyer_links
  FOR ALL USING (
    buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Purchase Orders: both parties can see and manage
DROP POLICY IF EXISTS supplier_orders_supplier ON supplier_purchase_orders;
CREATE POLICY supplier_orders_supplier ON supplier_purchase_orders
  FOR ALL USING (
    supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS supplier_orders_buyer ON supplier_purchase_orders;
CREATE POLICY supplier_orders_buyer ON supplier_purchase_orders
  FOR ALL USING (
    buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Order Items: same as orders
DROP POLICY IF EXISTS supplier_order_items_access ON supplier_purchase_order_items;
CREATE POLICY supplier_order_items_access ON supplier_purchase_order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM supplier_purchase_orders 
      WHERE supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      OR buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- Invoices: both parties can see
DROP POLICY IF EXISTS supplier_invoices_supplier ON supplier_invoices;
CREATE POLICY supplier_invoices_supplier ON supplier_invoices
  FOR ALL USING (
    supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS supplier_invoices_buyer ON supplier_invoices;
CREATE POLICY supplier_invoices_buyer ON supplier_invoices
  FOR ALL USING (
    buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Invoice Items: same as invoices
DROP POLICY IF EXISTS supplier_invoice_items_access ON supplier_invoice_items;
CREATE POLICY supplier_invoice_items_access ON supplier_invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM supplier_invoices 
      WHERE supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      OR buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- Payments: same as invoices
DROP POLICY IF EXISTS supplier_payments_access ON supplier_invoice_payments;
CREATE POLICY supplier_payments_access ON supplier_invoice_payments
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM supplier_invoices 
      WHERE supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      OR buyer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- Settings: supplier can manage their own
DROP POLICY IF EXISTS supplier_settings_owner ON supplier_settings;
CREATE POLICY supplier_settings_owner ON supplier_settings
  FOR ALL USING (
    supplier_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is a supplier
CREATE OR REPLACE FUNCTION is_supplier(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM professionals 
    WHERE auth_user_id = user_id 
    AND type IN ('pharma_supplier', 'equipment_supplier')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get supplier stats
CREATE OR REPLACE FUNCTION get_supplier_stats(p_supplier_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_products', (SELECT COUNT(*) FROM supplier_product_catalog WHERE supplier_id = p_supplier_id AND is_active = TRUE),
    'active_buyers', (SELECT COUNT(*) FROM supplier_buyer_links WHERE supplier_id = p_supplier_id AND status = 'active'),
    'pending_orders', (SELECT COUNT(*) FROM supplier_purchase_orders WHERE supplier_id = p_supplier_id AND status IN ('submitted', 'confirmed', 'processing')),
    'pending_invoices', (SELECT COUNT(*) FROM supplier_invoices WHERE supplier_id = p_supplier_id AND status IN ('sent', 'partial', 'overdue')),
    'monthly_revenue', (
      SELECT COALESCE(SUM(amount_paid), 0) 
      FROM supplier_invoices 
      WHERE supplier_id = p_supplier_id 
      AND paid_at >= date_trunc('month', CURRENT_DATE)
    ),
    'outstanding_balance', (
      SELECT COALESCE(SUM(balance), 0) 
      FROM supplier_invoices 
      WHERE supplier_id = p_supplier_id 
      AND status IN ('sent', 'partial', 'overdue')
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create invoice from delivered order
CREATE OR REPLACE FUNCTION create_invoice_from_order(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_order supplier_purchase_orders%ROWTYPE;
  v_invoice_id UUID;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM supplier_purchase_orders WHERE id = p_order_id;
  
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM supplier_invoices WHERE order_id = p_order_id) THEN
    SELECT id INTO v_invoice_id FROM supplier_invoices WHERE order_id = p_order_id;
    RETURN v_invoice_id;
  END IF;
  
  -- Create invoice
  INSERT INTO supplier_invoices (
    supplier_id, buyer_id, order_id,
    subtotal, tax_amount, discount_amount, total,
    payment_terms, due_date, status
  ) VALUES (
    v_order.supplier_id, v_order.buyer_id, p_order_id,
    v_order.subtotal, v_order.tax_amount, v_order.discount_amount, v_order.total,
    COALESCE((SELECT payment_terms FROM supplier_buyer_links WHERE supplier_id = v_order.supplier_id AND buyer_id = v_order.buyer_id), 'cash'),
    CASE 
      WHEN (SELECT payment_terms FROM supplier_buyer_links WHERE supplier_id = v_order.supplier_id AND buyer_id = v_order.buyer_id) = '15_days' THEN CURRENT_DATE + 15
      WHEN (SELECT payment_terms FROM supplier_buyer_links WHERE supplier_id = v_order.supplier_id AND buyer_id = v_order.buyer_id) = '30_days' THEN CURRENT_DATE + 30
      WHEN (SELECT payment_terms FROM supplier_buyer_links WHERE supplier_id = v_order.supplier_id AND buyer_id = v_order.buyer_id) = '60_days' THEN CURRENT_DATE + 60
      WHEN (SELECT payment_terms FROM supplier_buyer_links WHERE supplier_id = v_order.supplier_id AND buyer_id = v_order.buyer_id) = '90_days' THEN CURRENT_DATE + 90
      ELSE CURRENT_DATE
    END,
    'draft'
  ) RETURNING id INTO v_invoice_id;
  
  -- Copy order items to invoice items
  INSERT INTO supplier_invoice_items (invoice_id, order_item_id, description, quantity, unit_price, line_total)
  SELECT v_invoice_id, id, product_name, quantity_received, unit_price, 
         (quantity_received * unit_price * (1 - COALESCE(discount_percent, 0) / 100))
  FROM supplier_purchase_order_items
  WHERE order_id = p_order_id AND quantity_received > 0;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE
-- ============================================================================

-- ============================================================================
-- PHARMACY INVENTORY & POS SYSTEM - DATABASE SCHEMA
-- Phase 1: Inventory Management
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PRODUCT CATEGORIES (Reference table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  parent_id UUID REFERENCES pharmacy_product_categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO pharmacy_product_categories (id, name, name_ar, sort_order) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Médicaments', 'أدوية', 1),
  ('00000000-0000-0000-0001-000000000002', 'Parapharmacie', 'شبه صيدلة', 2),
  ('00000000-0000-0000-0001-000000000003', 'Dispositifs Médicaux', 'أجهزة طبية', 3),
  ('00000000-0000-0000-0001-000000000004', 'Compléments Alimentaires', 'مكملات غذائية', 4),
  ('00000000-0000-0000-0001-000000000005', 'Cosmétiques', 'مستحضرات تجميل', 5),
  ('00000000-0000-0000-0001-000000000006', 'Hygiène', 'نظافة', 6),
  ('00000000-0000-0000-0001-000000000007', 'Bébé & Maternité', 'طفل وأمومة', 7),
  ('00000000-0000-0000-0001-000000000008', 'Matériel Médical', 'معدات طبية', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHARMACY PRODUCTS - Product catalog per pharmacy
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Product identification
  barcode TEXT,                          -- EAN-13 or internal code
  sku TEXT,                              -- Internal SKU
  name TEXT NOT NULL,                    -- Product name (French)
  name_ar TEXT,                          -- Product name (Arabic)
  generic_name TEXT,                     -- Generic/DCI name
  dci_code TEXT,                         -- DCI code for generic matching
  
  -- Classification
  category_id UUID REFERENCES pharmacy_product_categories(id),
  form TEXT,                             -- tablet, capsule, syrup, injection, cream, etc.
  dosage TEXT,                           -- e.g., "500mg", "10mg/ml"
  packaging TEXT,                        -- e.g., "Boîte de 20", "Flacon 100ml"
  manufacturer TEXT,
  country_of_origin TEXT,
  
  -- Pricing
  purchase_price DECIMAL(10,2),          -- Cost from supplier (DZD)
  selling_price DECIMAL(10,2) NOT NULL,  -- Price to customer (DZD)
  margin_percent DECIMAL(5,2),           -- Calculated margin %
  
  -- CNAS/Chifa reimbursement
  is_chifa_listed BOOLEAN DEFAULT FALSE,
  reimbursement_rate INTEGER DEFAULT 0,  -- 0, 80, or 100
  tarif_reference DECIMAL(10,2),         -- CNAS reference price
  
  -- Regulatory
  requires_prescription BOOLEAN DEFAULT FALSE,
  is_controlled BOOLEAN DEFAULT FALSE,   -- Stupéfiants/Psychotropes
  controlled_tableau TEXT,               -- A, B, or C
  storage_conditions TEXT,               -- room_temp, refrigerated, frozen
  
  -- Stock management
  min_stock_level INTEGER DEFAULT 0,     -- Reorder point
  reorder_quantity INTEGER DEFAULT 0,    -- Suggested order quantity
  
  -- TVA/Tax
  tva_rate DECIMAL(4,2) DEFAULT 0,       -- 0, 9, or 19
  
  -- Source tracking
  source TEXT DEFAULT 'manual',          -- manual, lncpp, import
  external_id TEXT,                      -- ID from external source
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  UNIQUE(pharmacy_id, barcode),
  UNIQUE(pharmacy_id, sku)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_pharmacy ON pharmacy_products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_barcode ON pharmacy_products(barcode);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_name ON pharmacy_products(name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_dci ON pharmacy_products(dci_code);
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_category ON pharmacy_products(category_id);

-- ============================================================================
-- PHARMACY SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  fax TEXT,
  
  address TEXT,
  wilaya TEXT,
  commune TEXT,
  
  payment_terms TEXT,                    -- cash, 30_days, 60_days, etc.
  credit_limit DECIMAL(12,2),
  
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_suppliers_pharmacy ON pharmacy_suppliers(pharmacy_id);

-- ============================================================================
-- PHARMACY INVENTORY - Stock per product/batch
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  
  -- Batch/Lot tracking
  batch_number TEXT,
  lot_number TEXT,
  
  -- Quantities
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,   -- Reserved for pending prescriptions
  
  -- Pricing for this batch
  purchase_price_unit DECIMAL(10,2),     -- Unit cost for this batch
  
  -- Dates
  expiry_date DATE,
  received_date DATE DEFAULT CURRENT_DATE,
  
  -- Source
  supplier_id UUID REFERENCES pharmacy_suppliers(id),
  purchase_order_id UUID,                -- Future: link to PO
  
  -- Location
  location TEXT,                         -- Shelf, drawer, refrigerator, etc.
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,        -- FALSE when batch is depleted or expired
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity >= 0),
  CONSTRAINT positive_reserved CHECK (reserved_quantity >= 0),
  CONSTRAINT reserved_not_exceed CHECK (reserved_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy ON pharmacy_inventory(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_product ON pharmacy_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_expiry ON pharmacy_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_batch ON pharmacy_inventory(batch_number);

-- ============================================================================
-- INVENTORY TRANSACTIONS - All stock movements (audit trail)
-- ============================================================================
CREATE TYPE inventory_transaction_type AS ENUM (
  'purchase',           -- Stock received from supplier
  'sale',               -- Sold to customer
  'prescription',       -- Dispensed via prescription
  'adjustment_add',     -- Inventory count correction (increase)
  'adjustment_remove',  -- Inventory count correction (decrease)
  'return_supplier',    -- Returned to supplier
  'return_customer',    -- Customer return
  'expired',            -- Marked as expired
  'damage',             -- Damaged/broken/lost
  'transfer_in',        -- Transferred in from another location
  'transfer_out'        -- Transferred out to another location
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pharmacy_products(id),
  inventory_id UUID REFERENCES pharmacy_inventory(id),
  
  -- Transaction details
  transaction_type inventory_transaction_type NOT NULL,
  quantity_change INTEGER NOT NULL,      -- Positive for in, negative for out
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Pricing
  unit_price DECIMAL(10,2),
  total_value DECIMAL(12,2),
  
  -- Reference to source document
  reference_type TEXT,                   -- prescription, sale, purchase_order, adjustment
  reference_id UUID,                     -- ID of the source document
  
  -- Batch info (copied for historical record)
  batch_number TEXT,
  expiry_date DATE,
  
  -- Reason and notes
  reason_code TEXT,                      -- count_correction, damage, theft, expiry, etc.
  notes TEXT,
  
  -- Audit
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For adjustments requiring approval
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_status TEXT DEFAULT 'approved' -- pending, approved, rejected
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_pharmacy ON inventory_transactions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- ============================================================================
-- STOCK ALERTS - Pre-computed alerts for dashboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pharmacy_products(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES pharmacy_inventory(id),
  
  alert_type TEXT NOT NULL,              -- low_stock, expiring_30, expiring_7, expired
  severity TEXT NOT NULL,                -- info, warning, critical
  
  message TEXT,
  
  -- Alert data
  current_quantity INTEGER,
  min_stock_level INTEGER,
  expiry_date DATE,
  days_until_expiry INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_alerts_pharmacy ON pharmacy_stock_alerts(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_alerts_active ON pharmacy_stock_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_alerts_type ON pharmacy_stock_alerts(alert_type);

-- ============================================================================
-- PRODUCT IMPORT HISTORY - Track CSV/Excel imports
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_product_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  filename TEXT,
  file_size INTEGER,
  
  total_rows INTEGER,
  imported_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'pending',         -- pending, processing, completed, failed
  error_log JSONB,                       -- Array of errors with row numbers
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE pharmacy_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_product_imports ENABLE ROW LEVEL SECURITY;

-- Categories are public (read-only for everyone)
CREATE POLICY "categories_select_all" ON pharmacy_product_categories
  FOR SELECT USING (true);

-- Products: pharmacy can only see/manage their own
CREATE POLICY "products_select_own" ON pharmacy_products
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "products_insert_own" ON pharmacy_products
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "products_update_own" ON pharmacy_products
  FOR UPDATE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "products_delete_own" ON pharmacy_products
  FOR DELETE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Suppliers: pharmacy can only see/manage their own
CREATE POLICY "suppliers_select_own" ON pharmacy_suppliers
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "suppliers_insert_own" ON pharmacy_suppliers
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "suppliers_update_own" ON pharmacy_suppliers
  FOR UPDATE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "suppliers_delete_own" ON pharmacy_suppliers
  FOR DELETE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Inventory: pharmacy can only see/manage their own
CREATE POLICY "inventory_select_own" ON pharmacy_inventory
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "inventory_insert_own" ON pharmacy_inventory
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "inventory_update_own" ON pharmacy_inventory
  FOR UPDATE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "inventory_delete_own" ON pharmacy_inventory
  FOR DELETE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Transactions: pharmacy can only see/manage their own
CREATE POLICY "transactions_select_own" ON inventory_transactions
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "transactions_insert_own" ON inventory_transactions
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Alerts: pharmacy can only see/manage their own
CREATE POLICY "alerts_select_own" ON pharmacy_stock_alerts
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "alerts_update_own" ON pharmacy_stock_alerts
  FOR UPDATE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Imports: pharmacy can only see/manage their own
CREATE POLICY "imports_select_own" ON pharmacy_product_imports
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "imports_insert_own" ON pharmacy_product_imports
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate available quantity (on-hand minus reserved)
CREATE OR REPLACE FUNCTION get_available_quantity(p_product_id UUID, p_pharmacy_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(quantity - reserved_quantity), 0)::INTEGER
  FROM pharmacy_inventory
  WHERE product_id = p_product_id
    AND pharmacy_id = p_pharmacy_id
    AND is_active = TRUE
    AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE);
$$ LANGUAGE SQL STABLE;

-- Function to get total stock value for a pharmacy
CREATE OR REPLACE FUNCTION get_pharmacy_stock_value(p_pharmacy_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(
    pi.quantity * COALESCE(pi.purchase_price_unit, pp.purchase_price, 0)
  ), 0)
  FROM pharmacy_inventory pi
  JOIN pharmacy_products pp ON pi.product_id = pp.id
  WHERE pi.pharmacy_id = p_pharmacy_id
    AND pi.is_active = TRUE;
$$ LANGUAGE SQL STABLE;

-- Function to refresh stock alerts for a pharmacy
CREATE OR REPLACE FUNCTION refresh_stock_alerts(p_pharmacy_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Deactivate resolved alerts
  UPDATE pharmacy_stock_alerts
  SET is_active = FALSE, resolved_at = NOW()
  WHERE pharmacy_id = p_pharmacy_id AND is_active = TRUE;
  
  -- Insert low stock alerts
  INSERT INTO pharmacy_stock_alerts (pharmacy_id, product_id, alert_type, severity, message, current_quantity, min_stock_level)
  SELECT 
    pp.pharmacy_id,
    pp.id,
    'low_stock',
    CASE 
      WHEN COALESCE(SUM(pi.quantity - pi.reserved_quantity), 0) = 0 THEN 'critical'
      ELSE 'warning'
    END,
    pp.name || ' - Stock bas (' || COALESCE(SUM(pi.quantity - pi.reserved_quantity), 0) || ' unités)',
    COALESCE(SUM(pi.quantity - pi.reserved_quantity), 0)::INTEGER,
    pp.min_stock_level
  FROM pharmacy_products pp
  LEFT JOIN pharmacy_inventory pi ON pi.product_id = pp.id AND pi.is_active = TRUE
  WHERE pp.pharmacy_id = p_pharmacy_id
    AND pp.is_active = TRUE
    AND pp.min_stock_level > 0
  GROUP BY pp.id
  HAVING COALESCE(SUM(pi.quantity - pi.reserved_quantity), 0) < pp.min_stock_level;
  
  -- Insert expiring soon alerts (30 days)
  INSERT INTO pharmacy_stock_alerts (pharmacy_id, product_id, inventory_id, alert_type, severity, message, expiry_date, days_until_expiry)
  SELECT 
    pi.pharmacy_id,
    pi.product_id,
    pi.id,
    CASE 
      WHEN pi.expiry_date <= CURRENT_DATE THEN 'expired'
      WHEN pi.expiry_date <= CURRENT_DATE + 7 THEN 'expiring_7'
      ELSE 'expiring_30'
    END,
    CASE 
      WHEN pi.expiry_date <= CURRENT_DATE THEN 'critical'
      WHEN pi.expiry_date <= CURRENT_DATE + 7 THEN 'critical'
      ELSE 'warning'
    END,
    pp.name || ' (Lot: ' || COALESCE(pi.batch_number, 'N/A') || ') - ' ||
    CASE 
      WHEN pi.expiry_date <= CURRENT_DATE THEN 'EXPIRÉ'
      ELSE 'Expire dans ' || (pi.expiry_date - CURRENT_DATE) || ' jours'
    END,
    pi.expiry_date,
    pi.expiry_date - CURRENT_DATE
  FROM pharmacy_inventory pi
  JOIN pharmacy_products pp ON pi.product_id = pp.id
  WHERE pi.pharmacy_id = p_pharmacy_id
    AND pi.is_active = TRUE
    AND pi.quantity > 0
    AND pi.expiry_date IS NOT NULL
    AND pi.expiry_date <= CURRENT_DATE + 30;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pharmacy_products IS 'Product catalog per pharmacy with pricing and CNAS info';
COMMENT ON TABLE pharmacy_inventory IS 'Stock levels per product batch with expiry tracking';
COMMENT ON TABLE inventory_transactions IS 'Audit trail of all stock movements';
COMMENT ON TABLE pharmacy_suppliers IS 'Supplier contacts and payment terms';
COMMENT ON TABLE pharmacy_stock_alerts IS 'Pre-computed alerts for low stock and expiring items';
COMMENT ON TABLE pharmacy_product_imports IS 'History of product imports from CSV/Excel';

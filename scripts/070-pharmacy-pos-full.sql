-- ============================================================================
-- PHARMACY POS, WAREHOUSES, TREASURY, LOYALTY - FULL FEATURE SET
-- ============================================================================

-- ============================================================================
-- 1. WAREHOUSES - Multi-location stock management
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  code TEXT NOT NULL,                    -- Short code: "MAIN", "BACK", "FRIDGE"
  name TEXT NOT NULL,                    -- "Main Sales Floor", "Back Storage"
  name_ar TEXT,
  
  -- Type
  warehouse_type TEXT DEFAULT 'storage', -- storage, sales_floor, refrigerated, controlled
  
  -- Location details
  description TEXT,
  address TEXT,                          -- If separate location
  
  -- Settings
  is_default BOOLEAN DEFAULT FALSE,      -- Default for new stock
  is_sales_enabled BOOLEAN DEFAULT TRUE, -- Can sell from this warehouse
  temperature_controlled BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_warehouses_pharmacy ON pharmacy_warehouses(pharmacy_id);

-- Add warehouse_id to inventory
ALTER TABLE pharmacy_inventory 
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES pharmacy_warehouses(id);

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_warehouse ON pharmacy_inventory(warehouse_id);

-- ============================================================================
-- 2. WAREHOUSE TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Transfer details
  transfer_number TEXT NOT NULL,         -- TR-2026-00001
  from_warehouse_id UUID NOT NULL REFERENCES pharmacy_warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES pharmacy_warehouses(id),
  
  -- Status
  status TEXT DEFAULT 'pending',         -- pending, in_transit, completed, cancelled
  
  -- Timing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  requested_by UUID,
  shipped_by UUID,
  received_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, transfer_number)
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  
  product_id UUID NOT NULL REFERENCES pharmacy_products(id),
  inventory_id UUID REFERENCES pharmacy_inventory(id), -- Specific batch
  
  quantity_requested INTEGER NOT NULL,
  quantity_shipped INTEGER,
  quantity_received INTEGER,
  
  batch_number TEXT,
  expiry_date DATE,
  
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_pharmacy ON warehouse_transfers(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfer_items_transfer ON warehouse_transfer_items(transfer_id);

-- ============================================================================
-- 3. CASH DRAWERS / TILLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_cash_drawers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,                    -- "Till 1", "Main Register"
  code TEXT NOT NULL,                    -- "TILL1", "MAIN"
  
  -- Location
  warehouse_id UUID REFERENCES pharmacy_warehouses(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, code)
);

-- ============================================================================
-- 4. CASH DRAWER SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  drawer_id UUID NOT NULL REFERENCES pharmacy_cash_drawers(id),
  
  -- Session info
  session_number TEXT NOT NULL,          -- SESSION-2026-01-29-001
  
  -- Opening
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by UUID NOT NULL,
  opened_by_name TEXT,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  opening_notes TEXT,
  
  -- Closing
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  closed_by_name TEXT,
  
  -- Counted amounts at close
  counted_cash DECIMAL(12,2),
  counted_cheques DECIMAL(12,2),
  counted_cards DECIMAL(12,2),
  
  -- Calculated totals (system)
  system_cash DECIMAL(12,2),
  system_cheques DECIMAL(12,2),
  system_cards DECIMAL(12,2),
  system_chifa DECIMAL(12,2),            -- Chifa claims pending
  
  -- Variance
  variance_cash DECIMAL(12,2),
  variance_notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'open',            -- open, closing, closed
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, session_number)
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_pharmacy ON cash_drawer_sessions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_drawer ON cash_drawer_sessions(drawer_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_drawer_sessions(status) WHERE status = 'open';

-- ============================================================================
-- 5. POS SALES / TICKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Sale identification
  sale_number TEXT NOT NULL,             -- TICKET-2026-01-29-0001
  receipt_number TEXT,                   -- Fiscal receipt number
  
  -- Session & drawer
  session_id UUID REFERENCES cash_drawer_sessions(id),
  drawer_id UUID REFERENCES pharmacy_cash_drawers(id),
  warehouse_id UUID REFERENCES pharmacy_warehouses(id),
  
  -- Customer (optional)
  customer_id UUID,                      -- Future: customers table
  customer_name TEXT,
  customer_phone TEXT,
  
  -- Prescription link (if dispensing)
  prescription_id UUID,
  
  -- Totals
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Chifa/CNAS split
  chifa_total DECIMAL(12,2) DEFAULT 0,   -- Amount to claim from CNAS
  patient_total DECIMAL(12,2) DEFAULT 0, -- Amount patient pays
  
  -- Payment breakdown
  paid_cash DECIMAL(12,2) DEFAULT 0,
  paid_card DECIMAL(12,2) DEFAULT 0,
  paid_cheque DECIMAL(12,2) DEFAULT 0,
  paid_mobile DECIMAL(12,2) DEFAULT 0,   -- BaridiMob/CCP
  paid_credit DECIMAL(12,2) DEFAULT 0,   -- Store credit/loyalty
  change_given DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'completed',       -- draft, completed, voided, returned
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
  
  -- Loyalty
  loyalty_points_earned INTEGER DEFAULT 0,
  loyalty_points_used INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, sale_number)
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_pharmacy ON pos_sales(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_session ON pos_sales(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON pos_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_sales_prescription ON pos_sales(prescription_id);

-- ============================================================================
-- 6. POS SALE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  
  -- Product
  product_id UUID NOT NULL REFERENCES pharmacy_products(id),
  inventory_id UUID REFERENCES pharmacy_inventory(id), -- Specific batch used
  
  -- Product snapshot (for historical record)
  product_name TEXT NOT NULL,
  product_barcode TEXT,
  
  -- Quantities
  quantity INTEGER NOT NULL,
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,     -- Selling price
  unit_cost DECIMAL(10,2),               -- Purchase price (for margin calc)
  
  -- Discounts
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Tax
  tva_rate DECIMAL(4,2) DEFAULT 0,
  tva_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Chifa
  is_chifa_item BOOLEAN DEFAULT FALSE,
  reimbursement_rate INTEGER DEFAULT 0,
  chifa_amount DECIMAL(10,2) DEFAULT 0,  -- CNAS pays this
  patient_amount DECIMAL(10,2) DEFAULT 0, -- Patient pays this
  
  -- Line total
  line_total DECIMAL(12,2) NOT NULL,
  
  -- Batch info (copied)
  batch_number TEXT,
  expiry_date DATE,
  
  -- For returns
  quantity_returned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product ON pos_sale_items(product_id);

-- ============================================================================
-- 7. CHIFA CLAIMS QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chifa_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Claim batch
  batch_number TEXT,                     -- Monthly batch: CHIFA-2026-01
  
  -- Source
  sale_id UUID REFERENCES pos_sales(id),
  sale_item_id UUID REFERENCES pos_sale_items(id),
  
  -- Patient info
  patient_name TEXT,
  patient_chifa_number TEXT,             -- Chifa card number
  patient_nss TEXT,                      -- NSS (social security)
  beneficiary_type TEXT,                 -- assure, ayant_droit
  
  -- Product info
  product_id UUID REFERENCES pharmacy_products(id),
  product_name TEXT,
  quantity INTEGER,
  
  -- Amounts
  tarif_reference DECIMAL(10,2),
  reimbursement_rate INTEGER,
  amount_claimed DECIMAL(10,2),
  amount_paid DECIMAL(10,2),             -- When CNAS pays
  
  -- Status
  status TEXT DEFAULT 'pending',         -- pending, submitted, accepted, rejected, paid
  rejection_reason TEXT,
  
  -- Timing
  sale_date TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chifa_claims_pharmacy ON chifa_claims(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_chifa_claims_status ON chifa_claims(status);
CREATE INDEX IF NOT EXISTS idx_chifa_claims_batch ON chifa_claims(batch_number);

-- ============================================================================
-- 8. CUSTOMER LOYALTY
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Identity
  customer_code TEXT,                    -- CUST-00001
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  
  -- Chifa/CNAS
  chifa_number TEXT,
  nss TEXT,
  
  -- Address
  address TEXT,
  wilaya TEXT,
  commune TEXT,
  
  -- Loyalty
  loyalty_card_number TEXT,
  loyalty_tier TEXT DEFAULT 'bronze',    -- bronze, silver, gold, platinum
  loyalty_points INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_used INTEGER DEFAULT 0,
  
  -- Credit
  credit_limit DECIMAL(12,2) DEFAULT 0,
  credit_balance DECIMAL(12,2) DEFAULT 0, -- Outstanding credit
  
  -- Stats
  total_purchases DECIMAL(14,2) DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  allergies TEXT,                        -- Medical notes
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, customer_code),
  UNIQUE(pharmacy_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_customers_pharmacy ON pharmacy_customers(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_customers_phone ON pharmacy_customers(phone);
CREATE INDEX IF NOT EXISTS idx_pharmacy_customers_loyalty ON pharmacy_customers(loyalty_card_number);

-- ============================================================================
-- 9. LOYALTY TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES pharmacy_customers(id) ON DELETE CASCADE,
  
  -- Transaction
  transaction_type TEXT NOT NULL,        -- earn, redeem, adjust, expire
  points INTEGER NOT NULL,               -- Positive for earn, negative for redeem
  
  -- Source
  sale_id UUID REFERENCES pos_sales(id),
  
  -- Details
  description TEXT,
  
  -- Balance tracking
  points_before INTEGER,
  points_after INTEGER,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_sale ON loyalty_transactions(sale_id);

-- ============================================================================
-- 10. PURCHASE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- PO identification
  po_number TEXT NOT NULL,               -- PO-2026-00001
  
  -- Supplier
  supplier_id UUID REFERENCES pharmacy_suppliers(id),
  supplier_name TEXT,
  
  -- Destination
  warehouse_id UUID REFERENCES pharmacy_warehouses(id),
  
  -- Status
  status TEXT DEFAULT 'draft',           -- draft, sent, confirmed, partial, received, cancelled
  
  -- Dates
  order_date TIMESTAMPTZ DEFAULT NOW(),
  expected_date DATE,
  received_date DATE,
  
  -- Totals
  subtotal DECIMAL(14,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  
  -- Payment
  payment_terms TEXT,                    -- cash, 30_days, 60_days
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid, partial, paid
  amount_paid DECIMAL(14,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Audit
  created_by UUID,
  created_by_name TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, po_number)
);

CREATE TABLE IF NOT EXISTS pharmacy_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES pharmacy_purchase_orders(id) ON DELETE CASCADE,
  
  -- Product
  product_id UUID REFERENCES pharmacy_products(id),
  product_name TEXT NOT NULL,
  product_barcode TEXT,
  
  -- Quantities
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  
  -- Pricing
  unit_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2),
  
  -- Suggested by system
  suggested_quantity INTEGER,
  suggestion_reason TEXT,                -- low_stock, rotation, manual
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_pharmacy ON pharmacy_purchase_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON pharmacy_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON pharmacy_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON pharmacy_purchase_order_items(purchase_order_id);

-- ============================================================================
-- 11. DAILY SALES SUMMARY (for reporting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  summary_date DATE NOT NULL,
  
  -- Counts
  total_transactions INTEGER DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  
  -- Revenue
  gross_sales DECIMAL(14,2) DEFAULT 0,
  discounts DECIMAL(12,2) DEFAULT 0,
  returns DECIMAL(12,2) DEFAULT 0,
  net_sales DECIMAL(14,2) DEFAULT 0,
  
  -- Payments
  cash_collected DECIMAL(14,2) DEFAULT 0,
  card_collected DECIMAL(14,2) DEFAULT 0,
  cheque_collected DECIMAL(14,2) DEFAULT 0,
  mobile_collected DECIMAL(14,2) DEFAULT 0,
  chifa_pending DECIMAL(14,2) DEFAULT 0,
  
  -- Margins
  total_cost DECIMAL(14,2) DEFAULT 0,
  gross_profit DECIMAL(14,2) DEFAULT 0,
  gross_margin_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Tax
  tva_collected DECIMAL(12,2) DEFAULT 0,
  
  -- Loyalty
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_pharmacy ON daily_sales_summary(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_sales_summary(summary_date);

-- ============================================================================
-- 12. SEQUENCE GENERATORS FOR DOCUMENT NUMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  sequence_type TEXT NOT NULL,           -- sale, po, transfer, session
  prefix TEXT NOT NULL,                  -- TICKET, PO, TR, SESSION
  
  current_year INTEGER NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  
  format TEXT DEFAULT '{PREFIX}-{YEAR}-{NUMBER}', -- Customizable format
  number_padding INTEGER DEFAULT 5,      -- Pad to 5 digits: 00001
  
  UNIQUE(pharmacy_id, sequence_type, current_year)
);

-- Function to get next sequence number
CREATE OR REPLACE FUNCTION get_next_sequence(
  p_pharmacy_id UUID,
  p_sequence_type TEXT,
  p_prefix TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_number INTEGER;
  v_prefix TEXT;
  v_format TEXT;
  v_padding INTEGER;
  v_result TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get or create sequence
  INSERT INTO pharmacy_sequences (pharmacy_id, sequence_type, prefix, current_year, current_number)
  VALUES (p_pharmacy_id, p_sequence_type, COALESCE(p_prefix, UPPER(p_sequence_type)), v_year, 0)
  ON CONFLICT (pharmacy_id, sequence_type, current_year) DO NOTHING;
  
  -- Increment and get
  UPDATE pharmacy_sequences
  SET current_number = current_number + 1, 
      prefix = COALESCE(p_prefix, prefix)
  WHERE pharmacy_id = p_pharmacy_id 
    AND sequence_type = p_sequence_type 
    AND current_year = v_year
  RETURNING current_number, prefix, format, number_padding 
  INTO v_number, v_prefix, v_format, v_padding;
  
  -- Format result
  v_result := REPLACE(v_format, '{PREFIX}', v_prefix);
  v_result := REPLACE(v_result, '{YEAR}', v_year::TEXT);
  v_result := REPLACE(v_result, '{NUMBER}', LPAD(v_number::TEXT, v_padding, '0'));
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pharmacy_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chifa_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_sequences ENABLE ROW LEVEL SECURITY;

-- Warehouses
CREATE POLICY "warehouses_select_own" ON pharmacy_warehouses
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "warehouses_insert_own" ON pharmacy_warehouses
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "warehouses_update_own" ON pharmacy_warehouses
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "warehouses_delete_own" ON pharmacy_warehouses
  FOR DELETE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Transfers
CREATE POLICY "transfers_select_own" ON warehouse_transfers
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "transfers_insert_own" ON warehouse_transfers
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "transfers_update_own" ON warehouse_transfers
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Transfer items (via transfer)
CREATE POLICY "transfer_items_select" ON warehouse_transfer_items
  FOR SELECT USING (transfer_id IN (
    SELECT id FROM warehouse_transfers WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "transfer_items_insert" ON warehouse_transfer_items
  FOR INSERT WITH CHECK (transfer_id IN (
    SELECT id FROM warehouse_transfers WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));

-- Cash drawers
CREATE POLICY "drawers_select_own" ON pharmacy_cash_drawers
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "drawers_insert_own" ON pharmacy_cash_drawers
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "drawers_update_own" ON pharmacy_cash_drawers
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Sessions
CREATE POLICY "sessions_select_own" ON cash_drawer_sessions
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "sessions_insert_own" ON cash_drawer_sessions
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "sessions_update_own" ON cash_drawer_sessions
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- POS Sales
CREATE POLICY "sales_select_own" ON pos_sales
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "sales_insert_own" ON pos_sales
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "sales_update_own" ON pos_sales
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Sale items
CREATE POLICY "sale_items_select" ON pos_sale_items
  FOR SELECT USING (sale_id IN (
    SELECT id FROM pos_sales WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "sale_items_insert" ON pos_sale_items
  FOR INSERT WITH CHECK (sale_id IN (
    SELECT id FROM pos_sales WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));

-- Chifa claims
CREATE POLICY "claims_select_own" ON chifa_claims
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "claims_insert_own" ON chifa_claims
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "claims_update_own" ON chifa_claims
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Customers
CREATE POLICY "customers_select_own" ON pharmacy_customers
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "customers_insert_own" ON pharmacy_customers
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "customers_update_own" ON pharmacy_customers
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Loyalty transactions
CREATE POLICY "loyalty_select_own" ON loyalty_transactions
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "loyalty_insert_own" ON loyalty_transactions
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Purchase orders
CREATE POLICY "po_select_own" ON pharmacy_purchase_orders
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "po_insert_own" ON pharmacy_purchase_orders
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "po_update_own" ON pharmacy_purchase_orders
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- PO items
CREATE POLICY "po_items_select" ON pharmacy_purchase_order_items
  FOR SELECT USING (purchase_order_id IN (
    SELECT id FROM pharmacy_purchase_orders WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "po_items_insert" ON pharmacy_purchase_order_items
  FOR INSERT WITH CHECK (purchase_order_id IN (
    SELECT id FROM pharmacy_purchase_orders WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));

-- Daily summary
CREATE POLICY "summary_select_own" ON daily_sales_summary
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "summary_insert_own" ON daily_sales_summary
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "summary_update_own" ON daily_sales_summary
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Sequences
CREATE POLICY "sequences_select_own" ON pharmacy_sequences
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "sequences_all_own" ON pharmacy_sequences
  FOR ALL USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pharmacy_warehouses IS 'Multi-warehouse stock locations';
COMMENT ON TABLE warehouse_transfers IS 'Inter-warehouse stock transfers';
COMMENT ON TABLE pharmacy_cash_drawers IS 'POS cash drawer/till definitions';
COMMENT ON TABLE cash_drawer_sessions IS 'Cashier sessions with open/close balances';
COMMENT ON TABLE pos_sales IS 'Counter sales / receipts';
COMMENT ON TABLE pos_sale_items IS 'Line items in sales';
COMMENT ON TABLE chifa_claims IS 'CNAS reimbursement claims queue';
COMMENT ON TABLE pharmacy_customers IS 'Customer database with loyalty';
COMMENT ON TABLE loyalty_transactions IS 'Points earn/redeem history';
COMMENT ON TABLE pharmacy_purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE daily_sales_summary IS 'Pre-aggregated daily sales for reporting';
COMMENT ON FUNCTION get_next_sequence IS 'Generate sequential document numbers';

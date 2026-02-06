-- ============================================================================
-- PROFESSIONAL POS - All professional types (doctor, nurse, lab, clinic, ambulance)
-- Cash-focused, manual line items, Chifa optional via settings
-- ============================================================================

-- ============================================================================
-- 1. PROFESSIONAL POS SETTINGS (Chifa on/off)
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_pos_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Chifa / CNAS integration (optional)
  chifa_enabled BOOLEAN DEFAULT FALSE,
  
  -- Card payments (optional, cash is primary)
  card_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(professional_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_pos_settings_pro ON professional_pos_settings(professional_id);

-- ============================================================================
-- 2. PROFESSIONAL CASH DRAWERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_cash_drawers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(professional_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pro_cash_drawers_pro ON professional_cash_drawers(professional_id);

-- ============================================================================
-- 3. PROFESSIONAL CASH DRAWER SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_cash_drawer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  drawer_id UUID NOT NULL REFERENCES professional_cash_drawers(id),
  
  session_number TEXT NOT NULL,
  
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by UUID NOT NULL,
  opened_by_name TEXT,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  opening_notes TEXT,
  
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  closed_by_name TEXT,
  
  counted_cash DECIMAL(12,2),
  counted_cheques DECIMAL(12,2),
  counted_cards DECIMAL(12,2),
  
  system_cash DECIMAL(12,2),
  system_cheques DECIMAL(12,2),
  system_cards DECIMAL(12,2),
  system_chifa DECIMAL(12,2),
  
  variance_cash DECIMAL(12,2),
  variance_notes TEXT,
  
  status TEXT DEFAULT 'open',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(professional_id, session_number)
);

CREATE INDEX IF NOT EXISTS idx_pro_sessions_pro ON professional_cash_drawer_sessions(professional_id);
CREATE INDEX IF NOT EXISTS idx_pro_sessions_drawer ON professional_cash_drawer_sessions(drawer_id);
CREATE INDEX IF NOT EXISTS idx_pro_sessions_status ON professional_cash_drawer_sessions(status) WHERE status = 'open';

-- ============================================================================
-- 4. PROFESSIONAL SEQUENCES (sale/session numbering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL,
  prefix TEXT,
  current_year INTEGER NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  format TEXT DEFAULT '{PREFIX}-{YEAR}-{NUMBER}',
  number_padding INTEGER DEFAULT 5,
  
  UNIQUE(professional_id, sequence_type, current_year)
);

CREATE INDEX IF NOT EXISTS idx_pro_sequences_pro ON professional_sequences(professional_id);

CREATE OR REPLACE FUNCTION get_next_professional_sequence(
  p_professional_id UUID,
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
  
  INSERT INTO professional_sequences (professional_id, sequence_type, prefix, current_year, current_number)
  VALUES (p_professional_id, p_sequence_type, COALESCE(p_prefix, UPPER(p_sequence_type)), v_year, 0)
  ON CONFLICT (professional_id, sequence_type, current_year) DO NOTHING;
  
  UPDATE professional_sequences
  SET current_number = current_number + 1, prefix = COALESCE(p_prefix, prefix)
  WHERE professional_id = p_professional_id AND sequence_type = p_sequence_type AND current_year = v_year
  RETURNING current_number, prefix, format, number_padding INTO v_number, v_prefix, v_format, v_padding;
  
  v_result := REPLACE(v_format, '{PREFIX}', v_prefix);
  v_result := REPLACE(v_result, '{YEAR}', v_year::TEXT);
  v_result := REPLACE(v_result, '{NUMBER}', LPAD(v_number::TEXT, v_padding, '0'));
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. PROFESSIONAL POS SALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_pos_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  sale_number TEXT NOT NULL,
  receipt_number TEXT,
  
  session_id UUID REFERENCES professional_cash_drawer_sessions(id),
  drawer_id UUID REFERENCES professional_cash_drawers(id),
  
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  chifa_total DECIMAL(12,2) DEFAULT 0,
  patient_total DECIMAL(12,2) DEFAULT 0,
  
  paid_cash DECIMAL(12,2) DEFAULT 0,
  paid_card DECIMAL(12,2) DEFAULT 0,
  paid_cheque DECIMAL(12,2) DEFAULT 0,
  paid_mobile DECIMAL(12,2) DEFAULT 0,
  paid_credit DECIMAL(12,2) DEFAULT 0,
  change_given DECIMAL(12,2) DEFAULT 0,
  
  status TEXT DEFAULT 'completed',
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
  
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(professional_id, sale_number)
);

CREATE INDEX IF NOT EXISTS idx_pro_pos_sales_pro ON professional_pos_sales(professional_id);
CREATE INDEX IF NOT EXISTS idx_pro_pos_sales_session ON professional_pos_sales(session_id);
CREATE INDEX IF NOT EXISTS idx_pro_pos_sales_date ON professional_pos_sales(created_at);

-- ============================================================================
-- 6. PROFESSIONAL POS SALE ITEMS (manual line items, no product catalog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS professional_pos_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES professional_pos_sales(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  
  -- Chifa (optional, when enabled in settings)
  is_chifa_item BOOLEAN DEFAULT FALSE,
  reimbursement_rate INTEGER DEFAULT 0,
  chifa_amount DECIMAL(10,2) DEFAULT 0,
  patient_amount DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_pos_sale_items_sale ON professional_pos_sale_items(sale_id);

-- ============================================================================
-- 7. RLS
-- ============================================================================
ALTER TABLE professional_pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_cash_drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_pos_sale_items ENABLE ROW LEVEL SECURITY;

-- Settings
CREATE POLICY "pro_pos_settings_select_own" ON professional_pos_settings
  FOR SELECT USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_pos_settings_insert_own" ON professional_pos_settings
  FOR INSERT WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_pos_settings_update_own" ON professional_pos_settings
  FOR UPDATE USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Drawers
CREATE POLICY "pro_drawers_select_own" ON professional_cash_drawers
  FOR SELECT USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_drawers_insert_own" ON professional_cash_drawers
  FOR INSERT WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_drawers_update_own" ON professional_cash_drawers
  FOR UPDATE USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Sessions
CREATE POLICY "pro_sessions_select_own" ON professional_cash_drawer_sessions
  FOR SELECT USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_sessions_insert_own" ON professional_cash_drawer_sessions
  FOR INSERT WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_sessions_update_own" ON professional_cash_drawer_sessions
  FOR UPDATE USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Sales
CREATE POLICY "pro_sales_select_own" ON professional_pos_sales
  FOR SELECT USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_sales_insert_own" ON professional_pos_sales
  FOR INSERT WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "pro_sales_update_own" ON professional_pos_sales
  FOR UPDATE USING (professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Sale items (via sale)
CREATE POLICY "pro_sale_items_select" ON professional_pos_sale_items
  FOR SELECT USING (sale_id IN (
    SELECT id FROM professional_pos_sales WHERE professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "pro_sale_items_insert" ON professional_pos_sale_items
  FOR INSERT WITH CHECK (sale_id IN (
    SELECT id FROM professional_pos_sales WHERE professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));

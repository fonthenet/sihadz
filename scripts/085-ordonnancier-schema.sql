-- ============================================================================
-- ORDONNANCIER (Controlled Substances Register) - Algeria Compliance
-- ============================================================================
-- Required by Algerian law for Tableau A (Stupéfiants), B (Psychotropes), 
-- and C (Substances dangereuses) medications.
-- 
-- Each entry must record:
-- - Date, patient name, prescriber name
-- - Medication, quantity dispensed
-- - Prescription number, patient ID verified
-- - Pharmacist signature (digital)
-- - Running balance of controlled stock
-- ============================================================================

-- ============================================================================
-- ORDONNANCIER REGISTERS (One per pharmacy, per year)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ordonnancier_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Register info
  register_number TEXT NOT NULL,           -- ORD-2026-001
  year INTEGER NOT NULL,
  tableau TEXT NOT NULL CHECK (tableau IN ('A', 'B', 'C')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE(pharmacy_id, year, tableau)
);

CREATE INDEX IF NOT EXISTS idx_ordonnancier_registers_pharmacy 
  ON ordonnancier_registers(pharmacy_id);

-- ============================================================================
-- ORDONNANCIER ENTRIES (Each dispensing of controlled substance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ordonnancier_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  register_id UUID NOT NULL REFERENCES ordonnancier_registers(id) ON DELETE CASCADE,
  
  -- Entry number (sequential within register)
  entry_number INTEGER NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Product info
  product_id UUID REFERENCES pharmacy_products(id),
  product_name TEXT NOT NULL,
  product_dci TEXT,
  dosage TEXT,
  tableau TEXT NOT NULL CHECK (tableau IN ('A', 'B', 'C')),
  
  -- Batch/Stock info
  inventory_id UUID REFERENCES pharmacy_inventory(id),
  batch_number TEXT,
  
  -- Quantity
  quantity_dispensed INTEGER NOT NULL,
  unit TEXT DEFAULT 'unités',              -- unités, comprimés, ampoules, etc.
  
  -- Stock balance after this entry
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  
  -- Patient info
  patient_name TEXT NOT NULL,
  patient_id_type TEXT,                    -- CIN, passport, etc.
  patient_id_number TEXT,
  patient_id_verified BOOLEAN DEFAULT FALSE,
  patient_address TEXT,
  patient_phone TEXT,
  
  -- Prescriber info
  prescriber_name TEXT NOT NULL,
  prescriber_specialty TEXT,
  prescriber_order_number TEXT,            -- Numéro d'inscription à l'Ordre
  prescriber_address TEXT,
  
  -- Prescription info
  prescription_number TEXT NOT NULL,
  prescription_date DATE NOT NULL,
  treatment_duration_days INTEGER,
  
  -- POS link
  sale_id UUID REFERENCES pos_sales(id),
  sale_item_index INTEGER,
  
  -- Pharmacist
  dispensed_by UUID NOT NULL,              -- Employee or owner
  dispensed_by_name TEXT NOT NULL,
  verified_by UUID,                        -- Second pharmacist for Tableau A
  verified_by_name TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(register_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_ordonnancier_entries_pharmacy 
  ON ordonnancier_entries(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_ordonnancier_entries_register 
  ON ordonnancier_entries(register_id);
CREATE INDEX IF NOT EXISTS idx_ordonnancier_entries_product 
  ON ordonnancier_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_ordonnancier_entries_date 
  ON ordonnancier_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ordonnancier_entries_patient 
  ON ordonnancier_entries(patient_name);

-- ============================================================================
-- ORDONNANCIER STOCK RECONCILIATION (Weekly requirement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ordonnancier_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  register_id UUID NOT NULL REFERENCES ordonnancier_registers(id) ON DELETE CASCADE,
  
  -- Reconciliation info
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reconciliation_number TEXT NOT NULL,     -- REC-2026-001
  
  -- Per product
  product_id UUID NOT NULL REFERENCES pharmacy_products(id),
  product_name TEXT NOT NULL,
  
  -- Counts
  system_quantity INTEGER NOT NULL,        -- What system says
  physical_count INTEGER NOT NULL,         -- What was counted
  variance INTEGER NOT NULL,               -- difference
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'discrepancy')),
  variance_explanation TEXT,
  
  -- Approval (required for any discrepancy)
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ordonnancier_reconciliations_pharmacy 
  ON ordonnancier_reconciliations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_ordonnancier_reconciliations_product 
  ON ordonnancier_reconciliations(product_id);

-- ============================================================================
-- INVOICE SEQUENCES (Enforce sequential numbering with no gaps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Sequence type
  sequence_type TEXT NOT NULL,             -- 'ticket', 'facture', 'avoir', 'bordereau'
  fiscal_year INTEGER NOT NULL,
  
  -- Current state
  prefix TEXT NOT NULL,                    -- 'TKT', 'FAC', 'AVO', 'BOR'
  last_number INTEGER NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, sequence_type, fiscal_year)
);

-- Function to get next invoice number (atomic, no gaps)
CREATE OR REPLACE FUNCTION get_next_invoice_number(
  p_pharmacy_id UUID,
  p_sequence_type TEXT,
  p_fiscal_year INTEGER DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_prefix TEXT;
  v_next_number INTEGER;
  v_result TEXT;
BEGIN
  v_year := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  
  -- Get or create sequence
  INSERT INTO invoice_sequences (pharmacy_id, sequence_type, fiscal_year, prefix, last_number)
  VALUES (
    p_pharmacy_id,
    p_sequence_type,
    v_year,
    CASE p_sequence_type
      WHEN 'ticket' THEN 'TKT'
      WHEN 'facture' THEN 'FAC'
      WHEN 'avoir' THEN 'AVO'
      WHEN 'bordereau' THEN 'BOR'
      ELSE UPPER(LEFT(p_sequence_type, 3))
    END,
    0
  )
  ON CONFLICT (pharmacy_id, sequence_type, fiscal_year) DO NOTHING;
  
  -- Atomically increment and get next number
  UPDATE invoice_sequences
  SET last_number = last_number + 1,
      updated_at = NOW()
  WHERE pharmacy_id = p_pharmacy_id
    AND sequence_type = p_sequence_type
    AND fiscal_year = v_year
  RETURNING prefix, last_number INTO v_prefix, v_next_number;
  
  -- Format: FAC-2026-00001
  v_result := v_prefix || '-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 5, '0');
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- B2B CUSTOMERS (For credit sales / accounts receivable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Company info
  company_name TEXT NOT NULL,
  company_name_ar TEXT,
  legal_form TEXT,                         -- SARL, EURL, SPA, etc.
  
  -- Fiscal/Legal identifiers
  nif TEXT,                                -- Numéro d'Identification Fiscale
  nis TEXT,                                -- Numéro d'Identification Statistique
  rc TEXT,                                 -- Registre du Commerce
  article_imposition TEXT,
  
  -- Contact
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- Address
  address TEXT,
  wilaya TEXT,
  commune TEXT,
  
  -- Payment terms
  payment_terms INTEGER DEFAULT 30,        -- Days (0 = cash, 30, 60, 90)
  credit_limit DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Balances (computed)
  current_balance DECIMAL(12,2) DEFAULT 0, -- Amount owed
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_b2b_customers_pharmacy 
  ON b2b_customers(pharmacy_id);

-- ============================================================================
-- B2B INVOICES (Factures for credit sales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES b2b_customers(id),
  
  -- Invoice info
  invoice_number TEXT NOT NULL,            -- From get_next_invoice_number()
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Linked POS sales
  sale_ids UUID[] DEFAULT '{}',
  
  -- Amounts
  subtotal_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  tva_0_base DECIMAL(12,2) DEFAULT 0,
  tva_9_base DECIMAL(12,2) DEFAULT 0,
  tva_9_amount DECIMAL(12,2) DEFAULT 0,
  tva_19_base DECIMAL(12,2) DEFAULT 0,
  tva_19_amount DECIMAL(12,2) DEFAULT 0,
  total_tva DECIMAL(12,2) DEFAULT 0,
  total_ttc DECIMAL(12,2) NOT NULL,
  
  -- Payment status
  amount_paid DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled')),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE(pharmacy_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_b2b_invoices_pharmacy 
  ON b2b_invoices(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_b2b_invoices_customer 
  ON b2b_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_invoices_status 
  ON b2b_invoices(status);

-- ============================================================================
-- B2B INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES b2b_invoices(id) ON DELETE CASCADE,
  
  -- Product
  product_id UUID REFERENCES pharmacy_products(id),
  product_name TEXT NOT NULL,
  product_barcode TEXT,
  
  -- Quantities
  quantity INTEGER NOT NULL,
  unit_price_ht DECIMAL(10,2) NOT NULL,
  
  -- TVA
  tva_rate DECIMAL(4,2) DEFAULT 0,
  tva_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Totals
  line_total_ht DECIMAL(10,2) NOT NULL,
  line_total_ttc DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_invoice_items_invoice 
  ON b2b_invoice_items(invoice_id);

-- ============================================================================
-- B2B PAYMENTS (Track payments against invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES b2b_customers(id),
  invoice_id UUID REFERENCES b2b_invoices(id),
  
  -- Payment info
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,            -- cash, cheque, virement, etc.
  reference TEXT,                          -- Cheque number, transfer ref
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_b2b_payments_customer 
  ON b2b_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_payments_invoice 
  ON b2b_payments(invoice_id);

-- ============================================================================
-- CHIFA CLAIM STATUS TRACKING (Enhanced lifecycle)
-- ============================================================================
-- Add status history to chifa_bordereaux if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chifa_bordereaux' AND column_name = 'status_history'
  ) THEN
    ALTER TABLE chifa_bordereaux ADD COLUMN status_history JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chifa_bordereaux' AND column_name = 'cnas_reference'
  ) THEN
    ALTER TABLE chifa_bordereaux ADD COLUMN cnas_reference TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chifa_bordereaux' AND column_name = 'cnas_submission_date'
  ) THEN
    ALTER TABLE chifa_bordereaux ADD COLUMN cnas_submission_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chifa_bordereaux' AND column_name = 'cnas_processing_date'
  ) THEN
    ALTER TABLE chifa_bordereaux ADD COLUMN cnas_processing_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chifa_bordereaux' AND column_name = 'expected_payment_date'
  ) THEN
    ALTER TABLE chifa_bordereaux ADD COLUMN expected_payment_date DATE;
  END IF;
END $$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE ordonnancier_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordonnancier_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordonnancier_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_payments ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY ordonnancier_registers_owner ON ordonnancier_registers
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY ordonnancier_entries_owner ON ordonnancier_entries
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY ordonnancier_reconciliations_owner ON ordonnancier_reconciliations
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY invoice_sequences_owner ON invoice_sequences
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY b2b_customers_owner ON b2b_customers
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY b2b_invoices_owner ON b2b_invoices
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY b2b_invoice_items_owner ON b2b_invoice_items
  FOR ALL USING (
    invoice_id IN (SELECT id FROM b2b_invoices WHERE pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()))
  );

CREATE POLICY b2b_payments_owner ON b2b_payments
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE ordonnancier_registers IS 'Registers for controlled substances per Tableau (A, B, C) per year';
COMMENT ON TABLE ordonnancier_entries IS 'Individual dispensing entries for controlled substances';
COMMENT ON TABLE ordonnancier_reconciliations IS 'Weekly stock reconciliation for controlled substances';
COMMENT ON TABLE invoice_sequences IS 'Sequential invoice numbering with no gaps (regulatory requirement)';
COMMENT ON TABLE b2b_customers IS 'Business customers for credit sales';
COMMENT ON TABLE b2b_invoices IS 'Invoices for B2B credit sales';
COMMENT ON TABLE b2b_payments IS 'Payment tracking for B2B invoices';
COMMENT ON FUNCTION get_next_invoice_number IS 'Atomically generates next invoice number with no gaps';

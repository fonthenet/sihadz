-- ============================================================================
-- PHARMACY ACCOUNTING & CHIFA SYSTEM - COMPLETE SCHEMA
-- SCF-Compliant Accounting + CNAS/CASNOS Bordereau Management
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCED CHIFA/CNAS SYSTEM
-- ============================================================================

-- 1.1 CHRONIC DISEASE CODES (ALD - 26 pathologies at 100%)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chronic_disease_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,              -- ALD-01, ALD-02, etc.
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  category TEXT,                          -- cardiovascular, neurological, etc.
  coverage_rate INTEGER DEFAULT 100,      -- Always 100 for ALD
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 26 chronic diseases from CNAS
INSERT INTO chronic_disease_codes (code, name_fr, name_ar, category) VALUES
  ('ALD-01', 'Hypertension artérielle maligne', 'ارتفاع ضغط الدم الخبيث', 'cardiovascular'),
  ('ALD-02', 'Angine de poitrine', 'الذبحة الصدرية', 'cardiovascular'),
  ('ALD-03', 'Infarctus du myocarde', 'احتشاء عضلة القلب', 'cardiovascular'),
  ('ALD-04', 'Accident vasculaire cérébral (AVC)', 'السكتة الدماغية', 'cardiovascular'),
  ('ALD-05', 'Troubles du rythme cardiaque', 'اضطرابات نظم القلب', 'cardiovascular'),
  ('ALD-06', 'Maladies des valves cardiaques', 'أمراض صمامات القلب', 'cardiovascular'),
  ('ALD-07', 'Sclérose en plaques', 'التصلب المتعدد', 'neurological'),
  ('ALD-08', 'Épilepsie', 'الصرع', 'neurological'),
  ('ALD-09', 'Paralysie faciale d''origine cérébrale', 'شلل الوجه من أصل دماغي', 'neurological'),
  ('ALD-10', 'Amyotrophie spinale progressive', 'ضمور العضلات الشوكي التقدمي', 'neurological'),
  ('ALD-11', 'Myopathie', 'اعتلال عضلي', 'neurological'),
  ('ALD-12', 'Myasthénie', 'الوهن العضلي', 'neurological'),
  ('ALD-13', 'Inflammation des nerfs', 'التهاب الأعصاب', 'neurological'),
  ('ALD-14', 'Tuberculose (toutes formes)', 'السل (جميع الأشكال)', 'infectious'),
  ('ALD-15', 'Cancers', 'السرطان', 'oncological'),
  ('ALD-16', 'Maladies du sang', 'أمراض الدم', 'hematological'),
  ('ALD-17', 'Maladies rénales', 'أمراض الكلى', 'renal'),
  ('ALD-18', 'Diabète', 'داء السكري', 'metabolic'),
  ('ALD-19', 'Cirrhose du foie', 'تليف الكبد', 'hepatic'),
  ('ALD-20', 'Arthrite rhumatoïde', 'التهاب المفاصل الروماتويدي', 'rheumatic'),
  ('ALD-21', 'Spondylarthrite ankylosante', 'التهاب الفقار المقسط', 'rheumatic'),
  ('ALD-22', 'Insuffisance respiratoire chronique', 'القصور التنفسي المزمن', 'respiratory'),
  ('ALD-23', 'Lupus érythémateux disséminé', 'الذئبة الحمامية الجهازية', 'autoimmune'),
  ('ALD-24', 'Lèpre et complications', 'الجذام ومضاعفاته', 'infectious'),
  ('ALD-25', 'Insuffisance cardiaque', 'قصور القلب', 'cardiovascular'),
  ('ALD-26', 'Psoriasis grave', 'الصدفية الحادة', 'dermatological')
ON CONFLICT (code) DO NOTHING;

-- 1.2 ENHANCED CHIFA INVOICES (Factures Chifa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chifa_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Invoice identification
  invoice_number TEXT NOT NULL,           -- FAC-CHIFA-2026-00001
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Link to POS sale
  sale_id UUID REFERENCES pos_sales(id),
  
  -- Patient/Insured info (from Chifa card)
  insured_number TEXT NOT NULL,           -- Numéro d'assuré
  insured_name TEXT NOT NULL,
  insured_rank INTEGER DEFAULT 1,         -- 1=principal, 2+=ayant-droit
  beneficiary_name TEXT,                  -- If different (ayant-droit)
  beneficiary_relationship TEXT,          -- conjoint, enfant, parent
  
  -- Insurance type
  insurance_type TEXT NOT NULL DEFAULT 'CNAS', -- CNAS, CASNOS, CVM
  is_chronic BOOLEAN DEFAULT FALSE,       -- ALD - 100% coverage
  chronic_code TEXT REFERENCES chronic_disease_codes(code),
  
  -- Prescription info
  prescriber_name TEXT,
  prescriber_specialty TEXT,
  prescription_date DATE,
  prescription_number TEXT,
  treatment_duration INTEGER DEFAULT 10,  -- Durée en jours
  
  -- Financial totals
  total_tarif_reference DECIMAL(12,2) DEFAULT 0, -- Sum of tarif référence
  total_chifa DECIMAL(12,2) DEFAULT 0,    -- What CNAS pays (Montant Officine)
  total_patient DECIMAL(12,2) DEFAULT 0,  -- What patient pays (Montant Assuré)
  total_majoration DECIMAL(12,2) DEFAULT 0, -- 20% local product bonus
  grand_total DECIMAL(12,2) DEFAULT 0,    -- Total sale amount
  
  -- Status tracking
  status TEXT DEFAULT 'pending',          -- pending, in_bordereau, submitted, paid, rejected
  bordereau_id UUID,                      -- Link to bordereau when batched
  
  -- Rejection info
  rejection_code TEXT,
  rejection_reason TEXT,
  rejection_date DATE,
  
  -- Payment info
  paid_amount DECIMAL(12,2),
  paid_date DATE,
  payment_reference TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_chifa_invoices_pharmacy ON chifa_invoices(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_chifa_invoices_status ON chifa_invoices(status);
CREATE INDEX IF NOT EXISTS idx_chifa_invoices_bordereau ON chifa_invoices(bordereau_id);
CREATE INDEX IF NOT EXISTS idx_chifa_invoices_insured ON chifa_invoices(insured_number);
CREATE INDEX IF NOT EXISTS idx_chifa_invoices_date ON chifa_invoices(invoice_date);

-- 1.3 CHIFA INVOICE LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chifa_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES chifa_invoices(id) ON DELETE CASCADE,
  
  -- Product info
  product_id UUID REFERENCES pharmacy_products(id),
  product_name TEXT NOT NULL,
  product_barcode TEXT,
  cnas_code TEXT,                         -- N°Enregistrement CNAS
  
  -- Batch info
  batch_number TEXT,
  expiry_date DATE,
  
  -- Quantities
  quantity INTEGER NOT NULL,
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,      -- Selling price (PPVG)
  tarif_reference DECIMAL(10,2),          -- CNAS reference price
  purchase_price DECIMAL(10,2),           -- For margin calculation
  
  -- Reimbursement
  reimbursement_rate INTEGER NOT NULL DEFAULT 0, -- 0, 60, 80, 100
  chifa_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- CNAS pays this
  patient_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- Patient pays this
  
  -- 20% majoration for local products
  is_local_product BOOLEAN DEFAULT FALSE,
  majoration_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Line total
  line_total DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chifa_invoice_items_invoice ON chifa_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_chifa_invoice_items_product ON chifa_invoice_items(product_id);

-- 1.4 BORDEREAUX (Batch submissions to CNAS/CASNOS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chifa_bordereaux (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Bordereau identification
  bordereau_number TEXT NOT NULL,         -- BOR-CNAS-2026-01-001
  insurance_type TEXT NOT NULL,           -- CNAS, CASNOS, CVM
  
  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Counts and totals
  invoice_count INTEGER DEFAULT 0,
  total_tarif_reference DECIMAL(14,2) DEFAULT 0,
  total_chifa_amount DECIMAL(14,2) DEFAULT 0,
  total_patient_amount DECIMAL(14,2) DEFAULT 0,
  total_majoration DECIMAL(14,2) DEFAULT 0,
  
  -- Status workflow
  status TEXT DEFAULT 'draft',            -- draft, finalized, submitted, processing, paid, partial, rejected
  
  -- Dates
  finalized_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  response_date DATE,
  
  -- Submission details
  submitted_by UUID,
  submitted_by_name TEXT,
  submission_notes TEXT,
  
  -- Payment tracking
  amount_paid DECIMAL(14,2),
  payment_date DATE,
  payment_reference TEXT,
  
  -- Rejection tracking
  rejected_count INTEGER DEFAULT 0,
  rejection_total DECIMAL(14,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, bordereau_number)
);

CREATE INDEX IF NOT EXISTS idx_chifa_bordereaux_pharmacy ON chifa_bordereaux(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_chifa_bordereaux_status ON chifa_bordereaux(status);
CREATE INDEX IF NOT EXISTS idx_chifa_bordereaux_insurance ON chifa_bordereaux(insurance_type);
CREATE INDEX IF NOT EXISTS idx_chifa_bordereaux_period ON chifa_bordereaux(period_start, period_end);

-- 1.5 CHIFA REJECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chifa_rejections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Source
  invoice_id UUID NOT NULL REFERENCES chifa_invoices(id),
  bordereau_id UUID REFERENCES chifa_bordereaux(id),
  
  -- Rejection details
  rejection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rejection_code TEXT,
  rejection_motif TEXT NOT NULL,          -- Reason text
  rejected_amount DECIMAL(10,2) NOT NULL,
  
  -- Resolution
  status TEXT DEFAULT 'pending',          -- pending, corrected, resubmitted, written_off
  corrected_invoice_id UUID REFERENCES chifa_invoices(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  
  -- For resubmission
  new_bordereau_id UUID REFERENCES chifa_bordereaux(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chifa_rejections_pharmacy ON chifa_rejections(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_chifa_rejections_invoice ON chifa_rejections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_chifa_rejections_status ON chifa_rejections(status);

-- ============================================================================
-- PART 2: ACCOUNTING SYSTEM (SCF-COMPLIANT)
-- ============================================================================

-- 2.1 FISCAL YEARS
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_fiscal_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,                     -- "Exercice 2026"
  code TEXT NOT NULL,                     -- "2026"
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'open',             -- open, closing, closed
  is_current BOOLEAN DEFAULT FALSE,
  
  -- Closing info
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_years_pharmacy ON accounting_fiscal_years(pharmacy_id);

-- 2.2 CHART OF ACCOUNTS (Plan Comptable SCF)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Account identification
  code TEXT NOT NULL,                     -- "411", "531", "700"
  name TEXT NOT NULL,                     -- "Clients", "Caisse", "Ventes de marchandises"
  name_ar TEXT,
  
  -- Classification
  account_class INTEGER NOT NULL,         -- 1-7 (SCF classes)
  account_type TEXT NOT NULL,             -- asset, liability, equity, expense, revenue
  parent_code TEXT,                       -- For hierarchy (e.g., "41" is parent of "411")
  
  -- Behavior
  normal_balance TEXT NOT NULL,           -- debit, credit
  is_detail BOOLEAN DEFAULT TRUE,         -- FALSE for summary accounts
  
  -- TVA
  tva_applicable BOOLEAN DEFAULT FALSE,
  default_tva_rate DECIMAL(4,2),
  
  -- For specialized accounts
  account_subtype TEXT,                   -- client, supplier, bank, cash, cnas, casnos
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,        -- System-created, cannot delete
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_pharmacy ON accounting_accounts(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_accounts_class ON accounting_accounts(account_class);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounting_accounts(account_type);

-- 2.3 JOURNAL TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_journal_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  code TEXT NOT NULL,                     -- VT, AC, CA, BQ, OD, SA
  name TEXT NOT NULL,
  name_ar TEXT,
  
  description TEXT,
  
  -- Default accounts
  default_debit_account TEXT,
  default_credit_account TEXT,
  
  -- Numbering
  prefix TEXT,                            -- For entry numbering: VT-2026-00001
  
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, code)
);

-- 2.4 JOURNAL ENTRIES (Écritures comptables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Entry identification
  entry_number TEXT NOT NULL,             -- VT-2026-00001
  journal_type_id UUID REFERENCES accounting_journal_types(id),
  fiscal_year_id UUID REFERENCES accounting_fiscal_years(id),
  
  -- Entry details
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,              -- Libellé
  
  -- Reference to source document
  reference_type TEXT,                    -- pos_sale, purchase, chifa_payment, adjustment
  reference_id UUID,
  reference_number TEXT,                  -- Original document number
  
  -- Totals (for validation - must balance)
  total_debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft',            -- draft, posted, cancelled
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  
  -- Audit
  is_auto_generated BOOLEAN DEFAULT FALSE, -- From POS, purchases, etc.
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, entry_number),
  CONSTRAINT entry_balanced CHECK (total_debit = total_credit)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_pharmacy ON accounting_journal_entries(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_journal ON accounting_journal_entries(journal_type_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_fiscal ON accounting_journal_entries(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON accounting_journal_entries(reference_type, reference_id);

-- 2.5 JOURNAL ENTRY LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
  
  -- Line number
  line_number INTEGER NOT NULL,
  
  -- Account
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  account_code TEXT NOT NULL,             -- Denormalized for speed
  
  -- Description
  description TEXT,
  
  -- Amounts (one must be 0)
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Third party (for receivables/payables)
  third_party_type TEXT,                  -- client, supplier, cnas, casnos
  third_party_id UUID,                    -- pharmacy_customers.id, pharmacy_suppliers.id
  third_party_name TEXT,
  
  -- Due date (for receivables/payables)
  due_date DATE,
  
  -- TVA
  tva_rate DECIMAL(4,2),
  tva_amount DECIMAL(10,2),
  
  -- Reconciliation (for bank/client/supplier)
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciliation_ref TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT line_single_side CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON accounting_journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON accounting_journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_third ON accounting_journal_lines(third_party_type, third_party_id);

-- 2.6 TVA TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_tva_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Period
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  
  -- Type
  tva_type TEXT NOT NULL,                 -- collectee (on sales), deductible (on purchases)
  
  -- Amounts per rate
  tva_19_base DECIMAL(14,2) DEFAULT 0,
  tva_19_amount DECIMAL(14,2) DEFAULT 0,
  tva_9_base DECIMAL(14,2) DEFAULT 0,
  tva_9_amount DECIMAL(14,2) DEFAULT 0,
  tva_0_base DECIMAL(14,2) DEFAULT 0,     -- Exempt
  
  -- Totals
  total_base DECIMAL(14,2) DEFAULT 0,
  total_tva DECIMAL(14,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'open',             -- open, closed, declared
  g50_reference TEXT,                     -- G50 declaration reference
  declared_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pharmacy_id, period_year, period_month, tva_type)
);

CREATE INDEX IF NOT EXISTS idx_tva_entries_pharmacy ON accounting_tva_entries(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_tva_entries_period ON accounting_tva_entries(period_year, period_month);

-- ============================================================================
-- PART 3: AUTO-POSTING RULES
-- ============================================================================

-- 3.1 POSTING RULES (define how transactions become journal entries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting_posting_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_code TEXT NOT NULL,                -- pos_sale_cash, pos_sale_chifa, purchase_stock
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger
  source_type TEXT NOT NULL,              -- pos_sale, chifa_payment, stock_receipt, expense
  
  -- Template
  journal_type_code TEXT NOT NULL,        -- VT, AC, CA, etc.
  description_template TEXT,              -- "Vente {sale_number} - {customer_name}"
  
  -- Lines template (JSON array)
  -- [{"account_code": "531", "side": "debit", "field": "paid_cash"},
  --  {"account_code": "700", "side": "credit", "field": "subtotal"}]
  lines_template JSONB NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE chronic_disease_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chifa_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE chifa_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chifa_bordereaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE chifa_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_journal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_tva_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_posting_rules ENABLE ROW LEVEL SECURITY;

-- Chronic codes are public (read-only)
CREATE POLICY "chronic_codes_select_all" ON chronic_disease_codes
  FOR SELECT USING (true);

-- Chifa invoices
CREATE POLICY "chifa_invoices_select_own" ON chifa_invoices
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "chifa_invoices_insert_own" ON chifa_invoices
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "chifa_invoices_update_own" ON chifa_invoices
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Chifa invoice items (via invoice)
CREATE POLICY "chifa_items_select" ON chifa_invoice_items
  FOR SELECT USING (invoice_id IN (
    SELECT id FROM chifa_invoices WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "chifa_items_insert" ON chifa_invoice_items
  FOR INSERT WITH CHECK (invoice_id IN (
    SELECT id FROM chifa_invoices WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));

-- Bordereaux
CREATE POLICY "bordereaux_select_own" ON chifa_bordereaux
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "bordereaux_insert_own" ON chifa_bordereaux
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "bordereaux_update_own" ON chifa_bordereaux
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Rejections
CREATE POLICY "rejections_select_own" ON chifa_rejections
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "rejections_insert_own" ON chifa_rejections
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "rejections_update_own" ON chifa_rejections
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- Accounting tables
CREATE POLICY "fiscal_years_select_own" ON accounting_fiscal_years
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "fiscal_years_all_own" ON accounting_fiscal_years
  FOR ALL USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

CREATE POLICY "accounts_select_own" ON accounting_accounts
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "accounts_all_own" ON accounting_accounts
  FOR ALL USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

CREATE POLICY "journal_types_select_own" ON accounting_journal_types
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "journal_types_all_own" ON accounting_journal_types
  FOR ALL USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

CREATE POLICY "journal_entries_select_own" ON accounting_journal_entries
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "journal_entries_insert_own" ON accounting_journal_entries
  FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "journal_entries_update_own" ON accounting_journal_entries
  FOR UPDATE USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

CREATE POLICY "journal_lines_select" ON accounting_journal_lines
  FOR SELECT USING (entry_id IN (
    SELECT id FROM accounting_journal_entries WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "journal_lines_insert" ON accounting_journal_lines
  FOR INSERT WITH CHECK (entry_id IN (
    SELECT id FROM accounting_journal_entries WHERE pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "tva_entries_select_own" ON accounting_tva_entries
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "tva_entries_all_own" ON accounting_tva_entries
  FOR ALL USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

CREATE POLICY "posting_rules_select_own" ON accounting_posting_rules
  FOR SELECT USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));
CREATE POLICY "posting_rules_all_own" ON accounting_posting_rules
  FOR ALL USING (pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()));

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Generate Chifa invoice number
CREATE OR REPLACE FUNCTION generate_chifa_invoice_number(p_pharmacy_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN get_next_sequence(p_pharmacy_id, 'chifa_invoice', 'FAC-CHIFA');
END;
$$ LANGUAGE plpgsql;

-- Generate bordereau number
CREATE OR REPLACE FUNCTION generate_bordereau_number(p_pharmacy_id UUID, p_insurance_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
BEGIN
  v_prefix := 'BOR-' || p_insurance_type;
  RETURN get_next_sequence(p_pharmacy_id, 'bordereau_' || LOWER(p_insurance_type), v_prefix);
END;
$$ LANGUAGE plpgsql;

-- Generate journal entry number
CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_pharmacy_id UUID, p_journal_code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN get_next_sequence(p_pharmacy_id, 'journal_' || LOWER(p_journal_code), p_journal_code);
END;
$$ LANGUAGE plpgsql;

-- Update bordereau totals after invoice changes
CREATE OR REPLACE FUNCTION update_bordereau_totals(p_bordereau_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chifa_bordereaux b
  SET 
    invoice_count = (SELECT COUNT(*) FROM chifa_invoices WHERE bordereau_id = b.id),
    total_tarif_reference = (SELECT COALESCE(SUM(total_tarif_reference), 0) FROM chifa_invoices WHERE bordereau_id = b.id),
    total_chifa_amount = (SELECT COALESCE(SUM(total_chifa), 0) FROM chifa_invoices WHERE bordereau_id = b.id),
    total_patient_amount = (SELECT COALESCE(SUM(total_patient), 0) FROM chifa_invoices WHERE bordereau_id = b.id),
    total_majoration = (SELECT COALESCE(SUM(total_majoration), 0) FROM chifa_invoices WHERE bordereau_id = b.id),
    updated_at = NOW()
  WHERE id = p_bordereau_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate Chifa split for a product
CREATE OR REPLACE FUNCTION calculate_chifa_split(
  p_unit_price DECIMAL,
  p_tarif_reference DECIMAL,
  p_reimbursement_rate INTEGER,
  p_is_chronic BOOLEAN,
  p_quantity INTEGER,
  p_is_local_product BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  chifa_amount DECIMAL,
  patient_amount DECIMAL,
  majoration_amount DECIMAL,
  line_total DECIMAL
) AS $$
DECLARE
  v_effective_rate INTEGER;
  v_base_for_calc DECIMAL;
  v_chifa DECIMAL;
  v_patient DECIMAL;
  v_majoration DECIMAL;
  v_total DECIMAL;
BEGIN
  -- Use 100% for chronic diseases
  v_effective_rate := CASE WHEN p_is_chronic THEN 100 ELSE p_reimbursement_rate END;
  
  -- Use tarif_reference for CNAS calculation, or unit_price if not set
  v_base_for_calc := COALESCE(p_tarif_reference, p_unit_price) * p_quantity;
  v_total := p_unit_price * p_quantity;
  
  -- Calculate Chifa portion
  v_chifa := ROUND(v_base_for_calc * v_effective_rate / 100, 2);
  
  -- 20% majoration for local products
  v_majoration := 0;
  IF p_is_local_product AND v_chifa > 0 THEN
    v_majoration := ROUND(v_chifa * 0.20, 2);
  END IF;
  
  -- Patient pays the rest
  v_patient := v_total - v_chifa - v_majoration;
  IF v_patient < 0 THEN
    v_patient := 0;
  END IF;
  
  RETURN QUERY SELECT v_chifa, v_patient, v_majoration, v_total;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE chronic_disease_codes IS '26 ALD pathologies covered at 100% by CNAS';
COMMENT ON TABLE chifa_invoices IS 'Chifa/CNAS invoice headers with patient and insurance info';
COMMENT ON TABLE chifa_invoice_items IS 'Line items in Chifa invoices with reimbursement details';
COMMENT ON TABLE chifa_bordereaux IS 'Batch submissions to CNAS/CASNOS (max 20 invoices per batch)';
COMMENT ON TABLE chifa_rejections IS 'Rejected claims with correction and resubmission tracking';
COMMENT ON TABLE accounting_fiscal_years IS 'Fiscal year periods for accounting';
COMMENT ON TABLE accounting_accounts IS 'SCF-compliant chart of accounts';
COMMENT ON TABLE accounting_journal_types IS 'Journal types: Ventes, Achats, Caisse, Banque, OD';
COMMENT ON TABLE accounting_journal_entries IS 'Double-entry journal entries';
COMMENT ON TABLE accounting_journal_lines IS 'Debit/credit lines within entries';
COMMENT ON TABLE accounting_tva_entries IS 'Monthly TVA tracking for G50 declaration';
COMMENT ON TABLE accounting_posting_rules IS 'Auto-posting rules from POS/purchases to accounting';

-- ============================================================================
-- PRESCRIPTION ANTI-FRAUD SYSTEM (Phase 1–3)
-- ============================================================================
-- Prevents double redemption of same prescription at multiple pharmacies.
-- Supports platform patients and walk-in customers (paper prescriptions).
-- Doctors and pharmacies can flag suspicious behavior.
-- ============================================================================

-- ============================================================================
-- 1. PRESCRIPTION REDEMPTIONS (Central registry of dispensed prescriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source prescription (null for external paper RX)
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  
  -- Pharmacy that dispensed
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Patient identifiers (at least one for walk-ins)
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_cin TEXT,
  patient_phone TEXT,
  patient_name TEXT,
  patient_dob DATE,
  
  -- Prescription identifiers
  prescription_number TEXT NOT NULL,
  external_prescription_ref TEXT,  -- For paper RX from non-platform doctor
  
  -- Medication (per-line tracking)
  medication_index INTEGER NOT NULL DEFAULT 0,
  medication_name TEXT,
  medication_dci TEXT,
  quantity_dispensed INTEGER NOT NULL,
  unit TEXT DEFAULT 'unités',
  
  -- Audit
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispensed_by UUID REFERENCES auth.users(id),
  verified_patient_id BOOLEAN DEFAULT FALSE,
  source TEXT NOT NULL CHECK (source IN ('platform', 'walk_in_paper', 'walk_in_digital')),
  
  -- Notes (e.g. substitution)
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent double redemption: ONE redemption per prescription line globally
-- Platform: (prescription_id, medication_index) unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_redemptions_platform_unique 
  ON prescription_redemptions(prescription_id, medication_index) 
  WHERE prescription_id IS NOT NULL;

-- Prescription number: unique globally (covers platform printed + walk-in)
CREATE UNIQUE INDEX IF NOT EXISTS idx_redemptions_number_unique 
  ON prescription_redemptions(prescription_number, medication_index);

-- External paper RX (when used as primary ref)
CREATE UNIQUE INDEX IF NOT EXISTS idx_redemptions_external_unique 
  ON prescription_redemptions(external_prescription_ref, medication_index) 
  WHERE external_prescription_ref IS NOT NULL AND external_prescription_ref != '';

CREATE INDEX IF NOT EXISTS idx_redemptions_prescription ON prescription_redemptions(prescription_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_pharmacy ON prescription_redemptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_patient ON prescription_redemptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_cin ON prescription_redemptions(patient_cin) WHERE patient_cin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_redemptions_phone ON prescription_redemptions(patient_phone) WHERE patient_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_redemptions_dispensed_at ON prescription_redemptions(dispensed_at);

COMMENT ON TABLE prescription_redemptions IS 'Central registry of prescription redemptions to prevent double dispensing across pharmacies';

-- ============================================================================
-- 2. FRAUD FLAGS (Doctors and pharmacies flag suspicious behavior)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who flagged
  flagged_by UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  flagged_by_type TEXT NOT NULL CHECK (flagged_by_type IN ('doctor', 'pharmacy')),
  
  -- Subject (patient)
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_cin TEXT,
  patient_phone TEXT,
  patient_name TEXT,
  
  -- Optional: specific prescription
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  redemption_id UUID REFERENCES prescription_redemptions(id) ON DELETE SET NULL,
  
  -- Flag details
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'double_redemption',
    'doctor_shopping',
    'suspicious_quantity',
    'forged_prescription',
    'abusive_behavior',
    'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  evidence JSONB DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_patient ON prescription_fraud_flags(patient_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_cin ON prescription_fraud_flags(patient_cin) WHERE patient_cin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_flags_phone ON prescription_fraud_flags(patient_phone) WHERE patient_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON prescription_fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_flagged_by ON prescription_fraud_flags(flagged_by);

COMMENT ON TABLE prescription_fraud_flags IS 'Flags from doctors/pharmacies for prescription abuse or suspicious behavior';

-- ============================================================================
-- 3. PATIENT RISK CACHE (Computed risk level for quick lookup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_prescription_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Patient identifier (one of these required)
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_cin TEXT,
  patient_phone TEXT,
  
  -- Risk
  risk_level TEXT NOT NULL DEFAULT 'none' CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'blocked')),
  risk_factors JSONB DEFAULT '[]',
  blocked_reason TEXT,
  
  -- Audit
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT risk_one_identifier CHECK (
    (patient_id IS NOT NULL)::int + (patient_cin IS NOT NULL AND patient_cin != '')::int + (patient_phone IS NOT NULL AND patient_phone != '')::int >= 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_patient_id ON patient_prescription_risk(patient_id) WHERE patient_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_cin ON patient_prescription_risk(patient_cin) WHERE patient_cin IS NOT NULL AND patient_cin != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_phone ON patient_prescription_risk(patient_phone) WHERE patient_phone IS NOT NULL AND patient_phone != '';

COMMENT ON TABLE patient_prescription_risk IS 'Cached risk level for patients; updated when flags are added/resolved';

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================
ALTER TABLE prescription_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_prescription_risk ENABLE ROW LEVEL SECURITY;

-- Redemptions: pharmacy can insert (own); doctors/pharmacies can SELECT for check
CREATE POLICY redemptions_insert_pharmacy ON prescription_redemptions
  FOR INSERT
  WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY redemptions_select_platform ON prescription_redemptions
  FOR SELECT
  USING (
    -- Pharmacies can see all (for check-before-dispense)
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR
    -- Doctors can see redemptions for their prescriptions
    prescription_id IN (SELECT id FROM prescriptions WHERE doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()))
    OR
    -- Super admin (has platform settings access)
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- Fraud flags: doctors and pharmacies can create; can see own + resolved
CREATE POLICY fraud_flags_insert_pro ON prescription_fraud_flags
  FOR INSERT
  WITH CHECK (
    flagged_by IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY fraud_flags_select_pro ON prescription_fraud_flags
  FOR SELECT
  USING (
    flagged_by IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR status IN ('resolved', 'dismissed')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

CREATE POLICY fraud_flags_update_admin ON prescription_fraud_flags
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- Patient risk: professionals can read (for check); admin can write
CREATE POLICY risk_select_pro ON patient_prescription_risk
  FOR SELECT
  USING (true);  -- Any authenticated professional can check risk

CREATE POLICY risk_all_admin ON patient_prescription_risk
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Check if prescription line can be dispensed (not already redeemed at any pharmacy)
CREATE OR REPLACE FUNCTION can_dispense_prescription_line(
  p_prescription_id UUID,
  p_pharmacy_id UUID,
  p_medication_index INT DEFAULT 0
) RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  redeemed_at_pharmacy_id UUID,
  redeemed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    FALSE,
    'already_dispensed'::TEXT,
    r.pharmacy_id,
    r.dispensed_at
  FROM prescription_redemptions r
  WHERE r.prescription_id = p_prescription_id
    AND r.medication_index = p_medication_index
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check by prescription_number (for walk-in or external)
CREATE OR REPLACE FUNCTION can_dispense_by_prescription_number(
  p_prescription_number TEXT,
  p_pharmacy_id UUID,
  p_medication_index INT DEFAULT 0,
  p_external_ref TEXT DEFAULT NULL
) RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  redeemed_at_pharmacy_id UUID
) AS $$
BEGIN
  -- Check platform prescriptions
  RETURN QUERY
  SELECT 
    FALSE,
    'already_dispensed'::TEXT,
    r.pharmacy_id
  FROM prescription_redemptions r
  WHERE (r.prescription_number = p_prescription_number OR r.external_prescription_ref = p_external_ref)
    AND r.medication_index = p_medication_index
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

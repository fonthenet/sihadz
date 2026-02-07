-- ============================================================================
-- PRESCRIPTION ANTI-FRAUD: PROFESSIONAL-CENTRIC TOOLS
-- ============================================================================
-- Pharmacies and doctors handle fraud; they need full visibility and resolution.
-- Super admin retains oversight but is not the primary actor.
-- ============================================================================

-- ============================================================================
-- 1. RLS: Professionals see ALL flags (shared awareness when checking patient)
-- ============================================================================
DROP POLICY IF EXISTS fraud_flags_select_pro ON prescription_fraud_flags;
CREATE POLICY fraud_flags_select_pro ON prescription_fraud_flags
  FOR SELECT
  USING (
    -- Any doctor or pharmacy can see all flags (for patient check, shared awareness)
    EXISTS (SELECT 1 FROM professionals WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- ============================================================================
-- 2. RLS: Flagger can resolve/dismiss their OWN flags (self-service)
-- ============================================================================
DROP POLICY IF EXISTS fraud_flags_update_admin ON prescription_fraud_flags;
DROP POLICY IF EXISTS fraud_flags_update_flagger ON prescription_fraud_flags;
CREATE POLICY fraud_flags_update_flagger ON prescription_fraud_flags
  FOR UPDATE
  USING (
    -- Flagger can update their own flags (resolve, dismiss, add notes)
    flagged_by IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- ============================================================================
-- 3. RLS: Professionals see ALL redemptions (for patient history / pattern check)
-- ============================================================================
DROP POLICY IF EXISTS redemptions_select_platform ON prescription_redemptions;
DROP POLICY IF EXISTS redemptions_select_pro ON prescription_redemptions;
CREATE POLICY redemptions_select_pro ON prescription_redemptions
  FOR SELECT
  USING (
    -- Pharmacies and doctors need to see all redemptions for fraud check
    EXISTS (SELECT 1 FROM professionals WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- ============================================================================
-- 4. RLS: Risk read restricted to professionals; professionals can upsert
-- ============================================================================
DROP POLICY IF EXISTS risk_select_pro ON patient_prescription_risk;
CREATE POLICY risk_select_pro ON patient_prescription_risk
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM professionals WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- Professionals can upsert (when flagging); admin can delete
DROP POLICY IF EXISTS risk_all_admin ON patient_prescription_risk;
DROP POLICY IF EXISTS risk_insert_pro ON patient_prescription_risk;
DROP POLICY IF EXISTS risk_update_pro ON patient_prescription_risk;
DROP POLICY IF EXISTS risk_delete_admin ON patient_prescription_risk;
CREATE POLICY risk_insert_pro ON patient_prescription_risk
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM professionals WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );
CREATE POLICY risk_update_pro ON patient_prescription_risk
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM professionals WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );
CREATE POLICY risk_delete_admin ON patient_prescription_risk
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- ============================================================================
-- 6. TRIGGER: Auto-update patient_prescription_risk when flag created/updated
-- ============================================================================
CREATE OR REPLACE FUNCTION update_patient_risk_on_flag()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
  v_cin TEXT;
  v_phone TEXT;
  v_open_count INT;
  v_critical_count INT;
  v_high_count INT;
  v_risk_level TEXT;
  v_blocked_reason TEXT;
  v_factors JSONB;
BEGIN
  v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
  v_cin := COALESCE(NEW.patient_cin, OLD.patient_cin);
  v_phone := COALESCE(NEW.patient_phone, OLD.patient_phone);

  -- Count open flags for this patient (match by any identifier)
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'high'),
    COUNT(*)
  INTO v_critical_count, v_high_count, v_open_count
  FROM prescription_fraud_flags f
  WHERE f.status IN ('open', 'under_review')
    AND (
      (v_patient_id IS NOT NULL AND f.patient_id = v_patient_id)
      OR (v_cin IS NOT NULL AND v_cin != '' AND f.patient_cin = v_cin)
      OR (v_phone IS NOT NULL AND v_phone != '' AND f.patient_phone = v_phone)
    );

  -- Compute risk level
  IF v_open_count = 0 THEN
    v_risk_level := 'none';
    v_blocked_reason := NULL;
    v_factors := '[]'::JSONB;
  ELSIF v_critical_count >= 1 THEN
    v_risk_level := 'blocked';
    v_blocked_reason := 'Critical fraud flag(s) - ' || v_critical_count || ' open';
    v_factors := jsonb_build_array('critical_severity_flags', v_critical_count);
  ELSIF v_high_count >= 2 OR v_open_count >= 3 THEN
    v_risk_level := 'blocked';
    v_blocked_reason := v_open_count || ' open fraud flag(s)';
    v_factors := jsonb_build_array('open_flags', v_open_count);
  ELSIF v_high_count >= 1 OR v_open_count >= 2 THEN
    v_risk_level := 'high';
    v_blocked_reason := NULL;
    v_factors := jsonb_build_array('open_flags', v_open_count);
  ELSIF v_open_count >= 1 THEN
    v_risk_level := 'low';
    v_blocked_reason := NULL;
    v_factors := jsonb_build_array('open_flags', v_open_count);
  ELSE
    v_risk_level := 'none';
    v_blocked_reason := NULL;
    v_factors := '[]'::JSONB;
  END IF;

  -- Upsert/clear for all identifiers we have
  IF v_patient_id IS NOT NULL THEN
    UPDATE patient_prescription_risk SET risk_level = v_risk_level, risk_factors = v_factors, blocked_reason = v_blocked_reason, last_updated = NOW(), updated_by = auth.uid()
    WHERE patient_id = v_patient_id;
    IF NOT FOUND AND v_open_count > 0 THEN
      INSERT INTO patient_prescription_risk (patient_id, risk_level, risk_factors, blocked_reason, last_updated, updated_by)
      VALUES (v_patient_id, v_risk_level, v_factors, v_blocked_reason, NOW(), auth.uid());
    END IF;
  END IF;
  IF v_cin IS NOT NULL AND v_cin != '' THEN
    UPDATE patient_prescription_risk SET risk_level = v_risk_level, risk_factors = v_factors, blocked_reason = v_blocked_reason, last_updated = NOW(), updated_by = auth.uid()
    WHERE patient_cin = v_cin;
    IF NOT FOUND AND v_open_count > 0 THEN
      INSERT INTO patient_prescription_risk (patient_cin, risk_level, risk_factors, blocked_reason, last_updated, updated_by)
      VALUES (v_cin, v_risk_level, v_factors, v_blocked_reason, NOW(), auth.uid());
    END IF;
  END IF;
  IF v_phone IS NOT NULL AND v_phone != '' THEN
    UPDATE patient_prescription_risk SET risk_level = v_risk_level, risk_factors = v_factors, blocked_reason = v_blocked_reason, last_updated = NOW(), updated_by = auth.uid()
    WHERE patient_phone = v_phone;
    IF NOT FOUND AND v_open_count > 0 THEN
      INSERT INTO patient_prescription_risk (patient_phone, risk_level, risk_factors, blocked_reason, last_updated, updated_by)
      VALUES (v_phone, v_risk_level, v_factors, v_blocked_reason, NOW(), auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_risk_on_flag ON prescription_fraud_flags;
CREATE TRIGGER trg_update_risk_on_flag
  AFTER INSERT OR UPDATE OF status, patient_id, patient_cin, patient_phone
  ON prescription_fraud_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_risk_on_flag();

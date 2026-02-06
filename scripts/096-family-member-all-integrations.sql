-- =====================================================
-- FAMILY MEMBER INTEGRATIONS FOR ALL BUSINESS TYPES
-- Adds family_member_id to prescriptions, referrals, lab_test_requests
-- =====================================================

-- =====================================================
-- 1. PRESCRIPTIONS TABLE
-- =====================================================

-- Add family_member_id column if not exists
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id);

COMMENT ON COLUMN prescriptions.family_member_id IS 'When prescription is for a family member (child, elderly, etc.)';

CREATE INDEX IF NOT EXISTS idx_prescriptions_family_member ON prescriptions(family_member_id);

-- =====================================================
-- 2. REFERRALS TABLE
-- =====================================================

-- Add family_member_id column if not exists
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id);

COMMENT ON COLUMN referrals.family_member_id IS 'When referral is for a family member';

CREATE INDEX IF NOT EXISTS idx_referrals_family_member ON referrals(family_member_id);

-- =====================================================
-- 3. LAB TEST REQUESTS TABLE (ensure column exists)
-- =====================================================

-- Check and add if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lab_test_requests' AND column_name = 'family_member_id'
  ) THEN
    ALTER TABLE lab_test_requests 
    ADD COLUMN family_member_id UUID REFERENCES family_members(id);
    
    CREATE INDEX idx_lab_requests_family_member ON lab_test_requests(family_member_id);
    
    COMMENT ON COLUMN lab_test_requests.family_member_id IS 'When lab test is for a family member';
  END IF;
END $$;

-- =====================================================
-- 4. UPDATE RLS POLICIES FOR PRESCRIPTIONS
-- =====================================================

-- Patients can view prescriptions for their family members
DROP POLICY IF EXISTS "patients_view_family_prescriptions" ON prescriptions;
CREATE POLICY "patients_view_family_prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_view_records = true
    )
  );

-- =====================================================
-- 5. UPDATE RLS POLICIES FOR REFERRALS
-- =====================================================

-- Patients can view referrals for their family members
DROP POLICY IF EXISTS "patients_view_family_referrals" ON referrals;
CREATE POLICY "patients_view_family_referrals" ON referrals
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_view_records = true
    )
  );

-- =====================================================
-- 6. UPDATE RLS POLICIES FOR LAB TEST REQUESTS
-- =====================================================

-- Patients can view lab requests for their family members
DROP POLICY IF EXISTS "patients_view_family_lab_requests" ON lab_test_requests;
CREATE POLICY "patients_view_family_lab_requests" ON lab_test_requests
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_view_records = true
    )
  );

-- =====================================================
-- 7. HELPER VIEW FOR DOCTORS TO SEE PATIENT+FAMILY CONTEXT
-- =====================================================

-- View will be created after ensuring columns exist
-- For now, just query directly in the API

-- Function to get allergies will be handled in API

-- =====================================================
-- 9. ADD allergies COLUMN TO profiles IF NOT EXISTS
-- =====================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.allergies IS 'Patient allergies array [{name, severity, type}]';

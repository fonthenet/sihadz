-- =====================================================
-- FIX RLS FOR RELATED TABLES USED BY PATIENT APPOINTMENTS HOOK
-- =====================================================

-- 1. HEALTHCARE_TICKETS - Patients can view their own tickets
ALTER TABLE healthcare_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_view_tickets" ON healthcare_tickets;
CREATE POLICY "patients_view_tickets" ON healthcare_tickets
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- 2. PRESCRIPTIONS - Patients can view their own prescriptions
-- (Don't drop existing doctor/pharmacy policies)
DROP POLICY IF EXISTS "patients_view_prescriptions" ON prescriptions;
CREATE POLICY "patients_view_prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- 3. PROFESSIONALS - All authenticated users can view professionals (public directory)
-- This is needed to get doctor names
DROP POLICY IF EXISTS "authenticated_view_professionals" ON professionals;
CREATE POLICY "authenticated_view_professionals" ON professionals
  FOR SELECT TO authenticated
  USING (true);

-- 4. LAB_TEST_REQUESTS - Patients can view their own lab requests
DROP POLICY IF EXISTS "patients_view_lab_requests" ON lab_test_requests;
CREATE POLICY "patients_view_lab_requests" ON lab_test_requests
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- 5. REFERRALS - Patients can view referrals where they are the patient
DROP POLICY IF EXISTS "patients_view_referrals" ON referrals;
CREATE POLICY "patients_view_referrals" ON referrals
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

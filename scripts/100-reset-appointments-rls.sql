-- =====================================================
-- RESET APPOINTMENTS RLS COMPLETELY
-- Remove all policies and recreate clean ones
-- =====================================================

-- First check if RLS is enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Get list of all policies on appointments and drop them all
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'appointments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON appointments', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Now create clean policies

-- 1. Patients can SELECT their own appointments
CREATE POLICY "patients_select" ON appointments
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- 2. Patients can INSERT appointments for themselves
CREATE POLICY "patients_insert" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- 3. Patients can UPDATE their own appointments
CREATE POLICY "patients_update" ON appointments
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- 4. Doctors/Professionals can SELECT appointments assigned to them
CREATE POLICY "doctors_select" ON appointments
  FOR SELECT TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- 5. Doctors can UPDATE appointments assigned to them
CREATE POLICY "doctors_update" ON appointments
  FOR UPDATE TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    doctor_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- 6. Service accounts/admins (if needed)
-- CREATE POLICY "service_role_all" ON appointments
--   FOR ALL TO service_role
--   USING (true)
--   WITH CHECK (true);

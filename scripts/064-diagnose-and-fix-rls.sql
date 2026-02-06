-- Comprehensive RLS diagnosis and fix for appointments and professional_patients
-- Run this in Supabase SQL Editor

-- ============ PART 1: DIAGNOSE ============
-- See all current policies on appointments
SELECT 'APPOINTMENTS POLICIES:' as section;
SELECT policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'appointments'
ORDER BY cmd, policyname;

-- See all current policies on professional_patients
SELECT 'PROFESSIONAL_PATIENTS POLICIES:' as section;
SELECT policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'professional_patients'
ORDER BY cmd, policyname;

-- Check if doctor_id in appointments references professionals.id
SELECT 'SAMPLE APPOINTMENTS CHECK:' as section;
SELECT 
  a.id as apt_id,
  a.doctor_id,
  p.id as prof_id,
  p.auth_user_id,
  p.business_name
FROM appointments a
LEFT JOIN professionals p ON a.doctor_id = p.id
LIMIT 5;

-- ============ PART 2: FIX APPOINTMENTS RLS ============
-- Drop all conflicting SELECT policies
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "appointments_select_guest" ON appointments;
DROP POLICY IF EXISTS "doctors_view_own_appointments" ON appointments;
DROP POLICY IF EXISTS "professionals_view_own_appointments" ON appointments;
DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;

-- Create the correct SELECT policy
CREATE POLICY "appointments_select_policy" ON appointments
FOR SELECT
USING (
  -- Patients can view their own appointments
  auth.uid() = patient_id
  OR
  -- Professionals (doctors) can view appointments where they are the provider
  -- doctor_id stores professionals.id, so lookup via auth_user_id
  doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR
  -- Guest bookings visible for token lookup
  (is_guest_booking = true)
);

-- ============ PART 3: FIX APPOINTMENTS UPDATE POLICY ============
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "professionals_update_own_appointments" ON appointments;

CREATE POLICY "appointments_update_policy" ON appointments
FOR UPDATE
USING (
  auth.uid() = patient_id
  OR
  doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

-- ============ PART 4: FIX PROFESSIONAL_PATIENTS RLS ============
-- Ensure RLS is enabled
ALTER TABLE professional_patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professionals_view_own_patients" ON professional_patients;
DROP POLICY IF EXISTS "professional_patients_select" ON professional_patients;

CREATE POLICY "professional_patients_select" ON professional_patients
FOR SELECT
USING (
  professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "professional_patients_insert" ON professional_patients;
CREATE POLICY "professional_patients_insert" ON professional_patients
FOR INSERT
WITH CHECK (
  professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "professional_patients_update" ON professional_patients;
CREATE POLICY "professional_patients_update" ON professional_patients
FOR UPDATE
USING (
  professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

-- ============ VERIFICATION ============
SELECT 'UPDATED APPOINTMENTS POLICIES:' as section;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'appointments' ORDER BY cmd;

SELECT 'UPDATED PROFESSIONAL_PATIENTS POLICIES:' as section;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'professional_patients' ORDER BY cmd;

SELECT 'DONE - RLS policies fixed!' as result;

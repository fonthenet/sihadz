-- =====================================================
-- FIX APPOINTMENTS RLS - Clear conflicting policies
-- =====================================================

-- First, let's see what policies exist and reset them properly

-- Remove all patient-related SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "patients_view_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_view_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_can_view_own_appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Allow patient to view own appointments" ON appointments;
DROP POLICY IF EXISTS "patients_select_own" ON appointments;

-- Create a single, clean SELECT policy for patients
CREATE POLICY "patients_select_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Also ensure the family member column on appointments doesn't break anything
-- by allowing patients to also see appointments they booked for family members
DROP POLICY IF EXISTS "patients_view_family_appointments" ON appointments;
CREATE POLICY "patients_view_family_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    -- Appointment is for a family member the user owns
    family_member_id IS NOT NULL 
    AND family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Ensure INSERT policy exists for patients
DROP POLICY IF EXISTS "patients_insert_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_can_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
CREATE POLICY "patients_can_create_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Ensure UPDATE policy exists for patients (cancel their appointments)
DROP POLICY IF EXISTS "patients_update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_can_update_appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
CREATE POLICY "patients_can_update_own_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

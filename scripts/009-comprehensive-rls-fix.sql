-- =============================================================================
-- COMPREHENSIVE RLS AND POLICY FIX
-- Version: 009
-- Description: Fixes ALL RLS policies to ensure proper access control across
--              the entire system. This is a complete overhaul.
-- =============================================================================

-- ============================================
-- 1. PROFESSIONALS TABLE - COMPLETE RLS FIX
-- ============================================

-- Drop ALL existing policies on professionals and recreate properly
DROP POLICY IF EXISTS "professionals_select_all" ON professionals;
DROP POLICY IF EXISTS "Allow authenticated to check professional status" ON professionals;
DROP POLICY IF EXISTS "Professionals can update own data" ON professionals;
DROP POLICY IF EXISTS "Allow authenticated users to insert professional records" ON professionals;
DROP POLICY IF EXISTS "Public can view verified professionals" ON professionals;
DROP POLICY IF EXISTS "Super admins can delete professionals" ON professionals;
DROP POLICY IF EXISTS "Super admins can view all professionals" ON professionals;
DROP POLICY IF EXISTS "Super admins can update any professional" ON professionals;
DROP POLICY IF EXISTS "admins_can_update_professionals" ON professionals;
DROP POLICY IF EXISTS "admins_can_view_all_professionals" ON professionals;
DROP POLICY IF EXISTS "admins_can_delete_professionals" ON professionals;

-- Create clean, proper policies
-- 1. Anyone can view verified/active professionals (for public directory)
CREATE POLICY "public_view_verified_professionals" ON professionals
  FOR SELECT
  USING (status = 'verified' OR is_verified = true);

-- 2. Authenticated users can check if they are a professional
CREATE POLICY "users_check_own_professional_status" ON professionals
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- 3. Professionals can update their own record
CREATE POLICY "professionals_update_own" ON professionals
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 4. Authenticated users can register as professionals
CREATE POLICY "users_can_register_as_professional" ON professionals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- 5. Super admins can view ALL professionals (including pending)
CREATE POLICY "super_admin_view_all" ON professionals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('super_admin', 'admin')
    )
  );

-- 6. Super admins can update ANY professional (for approvals)
CREATE POLICY "super_admin_update_all" ON professionals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('super_admin', 'admin')
    )
  );

-- 7. Super admins can delete professionals
CREATE POLICY "super_admin_delete_all" ON professionals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 2. APPOINTMENTS TABLE - FIX RLS
-- ============================================

-- Add policy for doctors to view their appointments
DROP POLICY IF EXISTS "doctors_view_own_appointments" ON appointments;
CREATE POLICY "doctors_view_own_appointments" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
    OR
    doctor_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid() AND type = 'doctor'
    )
  );

-- Add policy for doctors to update their appointments
DROP POLICY IF EXISTS "doctors_update_own_appointments" ON appointments;
CREATE POLICY "doctors_update_own_appointments" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 3. HEALTHCARE_TICKETS TABLE - FIX RLS
-- ============================================

-- Drop existing and recreate
DROP POLICY IF EXISTS "tickets_insert" ON healthcare_tickets;
DROP POLICY IF EXISTS "tickets_patient_select" ON healthcare_tickets;
DROP POLICY IF EXISTS "tickets_provider_select" ON healthcare_tickets;
DROP POLICY IF EXISTS "tickets_update" ON healthcare_tickets;

-- Patients can view their own tickets
CREATE POLICY "tickets_patient_view" ON healthcare_tickets
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Patients can create tickets
CREATE POLICY "tickets_patient_insert" ON healthcare_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Providers can view tickets assigned to them
CREATE POLICY "tickets_provider_view" ON healthcare_tickets
  FOR SELECT
  TO authenticated
  USING (
    primary_provider_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
    OR
    secondary_provider_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Providers can update tickets assigned to them
CREATE POLICY "tickets_provider_update" ON healthcare_tickets
  FOR UPDATE
  TO authenticated
  USING (
    primary_provider_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
    OR
    secondary_provider_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 4. PRESCRIPTIONS TABLE - FIX RLS
-- ============================================

-- Allow pharmacies to update prescriptions sent to them
DROP POLICY IF EXISTS "pharmacies_update_prescriptions" ON prescriptions;
CREATE POLICY "pharmacies_update_prescriptions" ON prescriptions
  FOR UPDATE
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid() AND type = 'pharmacy'
    )
    OR
    pharmacy_id IN (
      SELECT id FROM pharmacies WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. LAB_TEST_REQUESTS TABLE - FIX RLS
-- ============================================

-- Allow labs to view and update their requests via professionals table
DROP POLICY IF EXISTS "labs_view_requests_via_professionals" ON lab_test_requests;
CREATE POLICY "labs_view_requests_via_professionals" ON lab_test_requests
  FOR SELECT
  TO authenticated
  USING (
    laboratory_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid() AND type = 'laboratory'
    )
  );

DROP POLICY IF EXISTS "labs_update_requests_via_professionals" ON lab_test_requests;
CREATE POLICY "labs_update_requests_via_professionals" ON lab_test_requests
  FOR UPDATE
  TO authenticated
  USING (
    laboratory_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid() AND type = 'laboratory'
    )
  );

-- ============================================
-- 6. FIX PROFESSIONAL_PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "prof_profiles_own" ON professional_profiles;
CREATE POLICY "prof_profiles_own" ON professional_profiles
  FOR ALL
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 7. FIX APPOINTMENT_NOTES - ADD RLS POLICIES
-- ============================================

-- Enable proper policies for appointment_notes (currently has 0)
CREATE POLICY "notes_doctor_access" ON appointment_notes
  FOR ALL
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "notes_patient_view" ON appointment_notes
  FOR SELECT
  TO authenticated
  USING (
    is_visible_to_patient = true
    AND appointment_id IN (
      SELECT id FROM appointments WHERE patient_id = auth.uid()
    )
  );

-- ============================================
-- 8. ENSURE verified_by COLUMN IS NULLABLE
-- ============================================

ALTER TABLE professionals 
  ALTER COLUMN verified_by DROP NOT NULL;

-- Remove any foreign key constraint that might cause issues
ALTER TABLE professionals
  DROP CONSTRAINT IF EXISTS professionals_verified_by_fkey;

-- ============================================
-- 9. CREATE HELPER FUNCTION FOR ADMIN CHECK
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_type IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. FIX CONVERSATIONS AND MESSAGES
-- ============================================

-- Allow professionals to access conversations related to their patients
DROP POLICY IF EXISTS "professionals_view_conversations" ON conversations;
CREATE POLICY "professionals_view_conversations" ON conversations
  FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
    OR patient_id = auth.uid()
  );

-- ============================================
-- DONE
-- ============================================

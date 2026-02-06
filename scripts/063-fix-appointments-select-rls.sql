-- Fix: appointments SELECT RLS policy for doctors/professionals
-- The previous policy incorrectly compared auth.uid() = doctor_id
-- but doctor_id stores professionals.id, not auth_user_id.
-- This policy allows professionals to see their own appointments.

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "appointments_select_guest" ON appointments;
DROP POLICY IF EXISTS "doctors_view_own_appointments" ON appointments;
DROP POLICY IF EXISTS "professionals_view_own_appointments" ON appointments;

-- Create the corrected SELECT policy
CREATE POLICY "appointments_select_policy" ON appointments
FOR SELECT
USING (
  -- Patients can view their own appointments
  auth.uid() = patient_id
  OR
  -- Professionals (doctors) can view appointments where they are the provider
  -- doctor_id stores professionals.id, so we need to check via auth_user_id
  doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR
  -- Guest bookings are publicly viewable (filtered by token in app)
  (is_guest_booking = true)
);

COMMENT ON POLICY "appointments_select_policy" ON appointments IS 'Patients see their appointments; professionals see appointments where they are the doctor; guest bookings visible for token lookup.';

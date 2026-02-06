-- Allow professionals (doctors) to UPDATE appointments where they are the provider.
-- The existing doctors_update_own_appointments policy only allows doctors from the legacy doctors table.
-- This adds UPDATE for professionals table (auth_user_id = auth.uid()) so visit note and status updates work.

DROP POLICY IF EXISTS "professionals_update_own_appointments" ON appointments;
CREATE POLICY "professionals_update_own_appointments" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "professionals_update_own_appointments" ON appointments IS 'Professionals can update appointments where they are the provider (doctor_id or professional_id).';

-- Fix: Visit note (doctor_note_for_patient) editing and saving for ALL users.
-- Applies to doctors, clinics, nurses, and any professional with appointments.
-- Safe to re-run.

-- 1. Ensure column exists
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS doctor_note_for_patient text;

COMMENT ON COLUMN public.appointments.doctor_note_for_patient IS 'Note from doctor to patient about the visit; visible only to the patient.';

-- 2. Ensure doctor_id and professional_id exist (appointments may use either)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES professionals(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL;

-- 3. Backfill doctor_id from professional_id where missing (one-time)
UPDATE public.appointments
SET doctor_id = professional_id
WHERE doctor_id IS NULL AND professional_id IS NOT NULL;

-- 4. Professionals can UPDATE appointments where they are the provider.
--    Supports BOTH doctor_id and professional_id for all professional types.
DROP POLICY IF EXISTS "professionals_update_own_appointments" ON appointments;
CREATE POLICY "professionals_update_own_appointments" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    (doctor_id IS NOT NULL AND doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()))
    OR (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()))
  );

COMMENT ON POLICY "professionals_update_own_appointments" ON appointments IS 'Professionals can update appointments where they are the provider (doctor_id or professional_id).';

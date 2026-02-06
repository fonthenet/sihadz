-- One-shot: Wire the "Note for patient" (visit note) feature.
-- Run this in Supabase SQL Editor if save visit note fails (column missing or RLS).
-- Safe to re-run.

-- 1. Add column if missing (from 051)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS doctor_note_for_patient text;

COMMENT ON COLUMN public.appointments.doctor_note_for_patient IS 'Note from doctor to patient about the visit; visible only to the patient.';

-- 2. Allow professionals to UPDATE appointments (from 052)
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

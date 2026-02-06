-- Add doctor note for patient on visit (visible only to patient)
-- Run this once; safe to re-run (IF NOT EXISTS).

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS doctor_note_for_patient text;

COMMENT ON COLUMN public.appointments.doctor_note_for_patient IS 'Note from doctor to patient about the visit; visible only to the patient.';

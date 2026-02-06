-- Add patient vitals to appointments (copied at booking, displayed directly to doctor)
-- Run with: npm run db:run -- scripts/147-appointments-patient-vitals.sql

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_date_of_birth date,
  ADD COLUMN IF NOT EXISTS patient_gender text,
  ADD COLUMN IF NOT EXISTS patient_blood_type text,
  ADD COLUMN IF NOT EXISTS patient_allergies text,
  ADD COLUMN IF NOT EXISTS patient_chronic_conditions text,
  ADD COLUMN IF NOT EXISTS patient_current_medications text,
  ADD COLUMN IF NOT EXISTS patient_height_cm decimal(5,1),
  ADD COLUMN IF NOT EXISTS patient_weight_kg decimal(5,2);

COMMENT ON COLUMN public.appointments.patient_date_of_birth IS 'Patient DOB copied at booking for doctor display';
COMMENT ON COLUMN public.appointments.patient_gender IS 'Patient gender copied at booking for doctor display';
COMMENT ON COLUMN public.appointments.patient_blood_type IS 'Patient blood type copied at booking';
COMMENT ON COLUMN public.appointments.patient_allergies IS 'Patient allergies copied at booking';
COMMENT ON COLUMN public.appointments.patient_chronic_conditions IS 'Patient chronic conditions copied at booking';
COMMENT ON COLUMN public.appointments.patient_current_medications IS 'Patient current medications copied at booking';
COMMENT ON COLUMN public.appointments.patient_height_cm IS 'Patient height copied at booking';
COMMENT ON COLUMN public.appointments.patient_weight_kg IS 'Patient weight copied at booking';

-- Backfill existing appointments from profiles
UPDATE public.appointments a
SET
  patient_date_of_birth = p.date_of_birth,
  patient_gender = p.gender,
  patient_blood_type = p.blood_type,
  patient_allergies = CASE WHEN p.allergies IS NULL THEN NULL WHEN jsonb_typeof(p.allergies) = 'array' THEN (SELECT string_agg(elem, ', ') FROM jsonb_array_elements_text(p.allergies) elem) ELSE p.allergies #>> '{}' END,
  patient_chronic_conditions = p.chronic_conditions,
  patient_current_medications = p.current_medications,
  patient_height_cm = p.height_cm,
  patient_weight_kg = p.weight_kg
FROM public.profiles p
WHERE a.patient_id = p.id
  AND a.patient_id IS NOT NULL
  AND (a.patient_date_of_birth IS NULL AND p.date_of_birth IS NOT NULL
    OR a.patient_gender IS NULL AND p.gender IS NOT NULL
    OR a.patient_blood_type IS NULL AND p.blood_type IS NOT NULL);

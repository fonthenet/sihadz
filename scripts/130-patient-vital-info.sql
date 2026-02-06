-- Add vital info columns to profiles (patient profile)
-- Run with: npm run db:run -- scripts/130-patient-vital-info.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blood_type text
    CHECK (blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  ADD COLUMN IF NOT EXISTS height_cm decimal(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg decimal(5,2),
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS chronic_conditions text,
  ADD COLUMN IF NOT EXISTS current_medications text;

COMMENT ON COLUMN public.profiles.blood_type IS 'Patient blood type for medical records';
COMMENT ON COLUMN public.profiles.height_cm IS 'Patient height in cm';
COMMENT ON COLUMN public.profiles.weight_kg IS 'Patient weight in kg';
COMMENT ON COLUMN public.profiles.allergies IS 'Known allergies (free text)';
COMMENT ON COLUMN public.profiles.chronic_conditions IS 'Chronic conditions (free text)';
COMMENT ON COLUMN public.profiles.current_medications IS 'Current medications (free text)';

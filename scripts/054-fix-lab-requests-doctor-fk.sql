-- Fix lab_test_requests.doctor_id foreign key to reference professionals instead of doctors
-- The unified provider architecture uses professionals table for all providers (doctors, pharmacies, labs, etc.)

-- Step 1: Drop the old foreign key constraint
ALTER TABLE public.lab_test_requests
  DROP CONSTRAINT IF EXISTS lab_test_requests_doctor_id_fkey;

-- Step 2: If there are existing rows with doctor_id pointing to doctors table, 
-- we need to migrate them. For now, set orphaned doctor_ids to NULL (they'll be re-linked when requests are recreated).
-- This is safe because lab_test_requests are typically created fresh, not migrated from legacy data.
UPDATE public.lab_test_requests
SET doctor_id = NULL
WHERE doctor_id IS NOT NULL 
  AND doctor_id NOT IN (SELECT id FROM public.professionals WHERE type = 'doctor');

-- Step 3: Add new foreign key constraint referencing professionals
ALTER TABLE public.lab_test_requests
  ADD CONSTRAINT lab_test_requests_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES public.professionals(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.lab_test_requests.doctor_id IS 'Provider ID from professionals(id). References the doctor who requested the lab tests.';

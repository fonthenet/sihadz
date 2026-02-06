-- Backfill doctor_id from professional_id for existing appointments.
-- Only runs if appointments has both doctor_id and professional_id.
-- Safe to re-run (no-op if professional_id does not exist).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments'
    AND column_name = 'professional_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments'
    AND column_name = 'doctor_id'
  ) THEN
    UPDATE appointments
    SET doctor_id = professional_id
    WHERE doctor_id IS NULL AND professional_id IS NOT NULL;
  END IF;
END $$;

-- Allow doctor_id to be NULL (for appointments with sample/demo providers)
ALTER TABLE appointments ALTER COLUMN doctor_id DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'doctor_id';

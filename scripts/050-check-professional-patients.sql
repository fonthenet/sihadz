-- Diagnostic: Check if professional_patients table exists and has data
-- Run this to verify the migration and trigger are working

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'professional_patients'
) AS table_exists;

-- 2. Check if trigger exists
SELECT EXISTS (
  SELECT FROM pg_trigger 
  WHERE tgname = 'trigger_sync_professional_patient_on_completed'
) AS trigger_exists;

-- 3. Count completed appointments
SELECT COUNT(*) as completed_appointments_count
FROM appointments 
WHERE status = 'completed';

-- 4. Count patients in professional_patients
SELECT COUNT(*) as professional_patients_count
FROM professional_patients;

-- 5. Show sample data (if any)
SELECT 
  professional_id,
  patient_id,
  full_name,
  last_visit_date,
  visit_count
FROM professional_patients
LIMIT 10;

-- 6. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'professional_patients';

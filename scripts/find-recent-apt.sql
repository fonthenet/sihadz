-- Find the most recent appointments
SELECT 
  id,
  patient_id,
  doctor_id,
  status,
  appointment_date,
  appointment_time,
  created_at,
  payment_method
FROM appointments
ORDER BY created_at DESC
LIMIT 5;

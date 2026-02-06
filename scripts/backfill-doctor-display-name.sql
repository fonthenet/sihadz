-- Backfill doctor_display_name for existing sample-provider appointments (doctor_id IS NULL)
UPDATE appointments
SET 
  doctor_display_name = 'Dr. Fatima Mansouri',
  doctor_specialty = 'dentist'
WHERE id = '1906b9a7-2022-49ec-9d5c-ed30f181906c'
  AND doctor_id IS NULL;

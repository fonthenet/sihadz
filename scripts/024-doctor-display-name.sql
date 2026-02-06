-- Store doctor name/specialty for appointments without doctor_id (sample providers)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_display_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_specialty TEXT;
COMMENT ON COLUMN appointments.doctor_display_name IS 'Display name when doctor_id is null (e.g. sample providers)';
COMMENT ON COLUMN appointments.doctor_specialty IS 'Specialty when doctor_id is null';

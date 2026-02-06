-- Add lab_staff JSONB column to professionals table for managing lab technicians and pathologists
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS lab_staff JSONB DEFAULT '{"technicians": [], "pathologists": []}';

COMMENT ON COLUMN professionals.lab_staff IS 'Lab-only: staff directory. { technicians: [{id, name, phone?, specialization?}], pathologists: [{id, name, credentials?, phone?}] }';

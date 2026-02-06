-- Add lab_equipment JSONB column to professionals table for laboratory equipment inventory
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS lab_equipment JSONB DEFAULT '[]';

COMMENT ON COLUMN professionals.lab_equipment IS 'Lab-only: equipment inventory. Array of {id, name, model, manufacturer, serial_number, category, status, location, purchase_date, warranty_expiry, last_maintenance, next_maintenance, notes}';

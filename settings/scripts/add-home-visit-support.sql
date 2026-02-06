-- Add home visit support to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS supports_home_visit BOOLEAN DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS home_visit_fee INTEGER;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS home_visit_radius INTEGER DEFAULT 10; -- km radius
COMMIT;

-- Add home visit fields to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS home_visit_address TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS home_visit_address_ar TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS home_visit_wilaya_code TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS home_visit_city TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS home_visit_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_response TEXT; -- Doctor's approval message or rejection reason
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
COMMIT;

-- Update the status check constraint to include home visit statuses
-- First, drop the existing constraint if it exists
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
COMMIT;

-- Add the updated constraint with new statuses
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'pending_approval', 'rejected'));
COMMIT;

-- Create index for faster queries on pending home visit requests
CREATE INDEX IF NOT EXISTS idx_appointments_home_visit_pending 
  ON appointments(doctor_id, status) 
  WHERE status = 'pending_approval';
COMMIT;

-- Add comment to document the home visit workflow
COMMENT ON COLUMN appointments.status IS 'Appointment status: pending, confirmed, completed, cancelled, pending_approval (for home visits), rejected';
COMMIT;

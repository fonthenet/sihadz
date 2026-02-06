-- Add guest booking fields to appointments table
-- This allows guests to book without creating an account

-- Add guest booking columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS is_guest_booking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS guest_phone text,
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS guest_linked_to_user_id uuid REFERENCES auth.users(id);

-- Create index for fast guest token lookups
CREATE INDEX IF NOT EXISTS idx_appointments_guest_token ON appointments(guest_token) WHERE is_guest_booking = true;

-- Create index for linking guest bookings to users
CREATE INDEX IF NOT EXISTS idx_appointments_guest_email ON appointments(guest_email) WHERE is_guest_booking = true;
CREATE INDEX IF NOT EXISTS idx_appointments_guest_phone ON appointments(guest_phone) WHERE is_guest_booking = true;

-- Update RLS policies to allow guest bookings to be created without authentication
-- and viewed via guest token

-- Drop existing insert policy
DROP POLICY IF EXISTS appointments_insert_patient ON appointments;

-- Create new insert policy that allows guest bookings
CREATE POLICY appointments_insert_patient ON appointments
FOR INSERT
WITH CHECK (
  -- Authenticated users can create their own appointments
  (auth.uid() = patient_id)
  OR
  -- Guest bookings (no auth required, but must have guest fields)
  (is_guest_booking = true AND guest_email IS NOT NULL AND guest_token IS NOT NULL)
);

-- Create policy for guests to view their own appointments via token
DROP POLICY IF EXISTS appointments_select_guest ON appointments;
CREATE POLICY appointments_select_guest ON appointments
FOR SELECT
USING (
  -- Authenticated users can view their appointments
  (auth.uid() = patient_id OR auth.uid() = doctor_id)
  OR
  -- Guest bookings are publicly viewable (will be filtered by token in app)
  (is_guest_booking = true)
);

-- Create policy for guests to update their own appointments
DROP POLICY IF EXISTS appointments_update_guest ON appointments;
CREATE POLICY appointments_update_guest ON appointments
FOR UPDATE
USING (
  -- Authenticated users can update their appointments
  (auth.uid() = patient_id)
  OR
  -- Guest bookings can be updated (will be validated by token in app)
  (is_guest_booking = true)
);

-- Add comment for documentation
COMMENT ON COLUMN appointments.is_guest_booking IS 'True if this is a guest booking (no account required)';
COMMENT ON COLUMN appointments.guest_email IS 'Email address for guest booking notifications and tracking';
COMMENT ON COLUMN appointments.guest_phone IS 'Phone number for guest booking (for SMS notifications)';
COMMENT ON COLUMN appointments.guest_name IS 'Guest name for the booking';
COMMENT ON COLUMN appointments.guest_token IS 'Unique token for guest to access their booking details';
COMMENT ON COLUMN appointments.guest_linked_to_user_id IS 'User ID if guest later creates an account and links their bookings';

-- Fix: appointments.doctor_id must reference professionals(id), not doctors(id).
-- Run this in Supabase SQL Editor if you get: violates foreign key constraint "appointments_doctor_id_fkey"

-- Drop the existing FK (whether it points to doctors or professionals)
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;

-- Re-add FK to professionals(id) so booking with professionals.id works
ALTER TABLE appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES professionals(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.doctor_id IS 'Provider ID from professionals(id). Required for booking.';

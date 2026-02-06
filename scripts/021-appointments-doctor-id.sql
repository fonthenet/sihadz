-- Ensure appointments has doctor_id for API compatibility (MASTER uses professional_id only).
-- Add doctor_id if missing; we write both for fetches that use doctor_id ?? professional_id.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES professionals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id) WHERE doctor_id IS NOT NULL;

COMMENT ON COLUMN appointments.doctor_id IS 'Provider ID (same as professional_id). Kept for API compatibility.';

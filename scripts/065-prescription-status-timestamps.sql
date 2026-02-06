-- Add pharmacy workflow timestamp columns to prescriptions table
-- Run in Supabase SQL Editor
-- These columns track when each status transition occurred (received, ready, picked_up, etc.)

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

COMMENT ON COLUMN prescriptions.received_at IS 'When pharmacy received/accepted the prescription';
COMMENT ON COLUMN prescriptions.ready_at IS 'When medications are ready for pickup';
COMMENT ON COLUMN prescriptions.picked_up_at IS 'When patient picked up the medications';
COMMENT ON COLUMN prescriptions.delivered_at IS 'When medications were delivered (e.g. home delivery)';
COMMENT ON COLUMN prescriptions.declined_at IS 'When pharmacy declined the prescription';

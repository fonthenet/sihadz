-- Add decline_reason column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Add denied_at and deny_reason columns to lab_test_requests table
ALTER TABLE lab_test_requests ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;
ALTER TABLE lab_test_requests ADD COLUMN IF NOT EXISTS deny_reason TEXT;

COMMENT ON COLUMN prescriptions.decline_reason IS 'Reason provided by pharmacy when declining a prescription';
COMMENT ON COLUMN lab_test_requests.denied_at IS 'Timestamp when lab request was denied';
COMMENT ON COLUMN lab_test_requests.deny_reason IS 'Reason provided by laboratory when denying a lab request';

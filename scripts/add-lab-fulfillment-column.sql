-- Lab fulfillment: per-test status so lab can mark each test as processed, completed, or failed.
-- One entry per lab_test_items.id: status (pending | sample_collected | processing | completed | failed),
-- optional lab_notes, failed_reason, completed_at.
-- Run in Supabase SQL Editor.

ALTER TABLE lab_test_requests
ADD COLUMN IF NOT EXISTS lab_fulfillment JSONB DEFAULT NULL;

COMMENT ON COLUMN lab_test_requests.lab_fulfillment IS 'Lab-only: per-test fulfillment status. Array of { item_id, status, lab_notes?, failed_reason?, completed_at? }. Original lab_test_items are never modified.';

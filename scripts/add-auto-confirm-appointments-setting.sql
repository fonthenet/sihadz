-- Add doctor setting: auto-confirm appointments vs manual confirmation
-- Run this entire script in Supabase → SQL Editor → New query, then Run.
-- After adding a column, PostgREST's schema cache must be reloaded or you get
-- "Could not find the 'auto_confirm_appointments' column in the schema cache".

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS auto_confirm_appointments BOOLEAN DEFAULT false;

COMMENT ON COLUMN professionals.auto_confirm_appointments IS 'When true, new bookings are confirmed automatically; when false, doctor must confirm manually (pending until then).';

-- Reload PostgREST schema cache so the new column is visible to the API immediately
NOTIFY pgrst, 'reload schema';

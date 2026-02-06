-- Add unavailable_dates (holidays / time off) for professionals so they can block booking on specific dates.
-- Run in Supabase SQL Editor if your professionals table doesn't have this column yet.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS unavailable_dates JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN professionals.unavailable_dates IS 'Array of date strings (YYYY-MM-DD) when the professional is not available for booking (holidays, time off).';

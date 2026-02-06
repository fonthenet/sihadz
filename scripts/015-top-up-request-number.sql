-- Paste only the SQL below in Supabase SQL Editor.
-- Adds a globally unique human-readable request number to top_up_requests (e.g. TOP-20250128-00001).

-- Sequence for daily request numbers (globally unique)
CREATE SEQUENCE IF NOT EXISTS public.top_up_request_number_seq;

-- Column: human-readable, globally unique (entire site)
-- TOP-YYYYMMDD-XXXXXXXX = 21 chars (backfill); TOP-YYYYMMDD-NNNNN = 18 chars (trigger)
ALTER TABLE public.top_up_requests
  ADD COLUMN IF NOT EXISTS request_number VARCHAR(25) UNIQUE;
-- If column already existed as VARCHAR(20), enlarge it:
ALTER TABLE public.top_up_requests
  ALTER COLUMN request_number TYPE VARCHAR(25);

-- Backfill existing rows: TOP-YYYYMMDD- + first 8 chars of id (unique, no sequence used)
UPDATE public.top_up_requests
SET request_number = 'TOP-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE request_number IS NULL;

-- Trigger: set request_number on insert
CREATE OR REPLACE FUNCTION public.set_top_up_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := 'TOP-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('public.top_up_request_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_top_up_request_number_trigger ON public.top_up_requests;
CREATE TRIGGER set_top_up_request_number_trigger
  BEFORE INSERT ON public.top_up_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_top_up_request_number();

COMMENT ON COLUMN public.top_up_requests.request_number IS 'Human-readable globally unique ref (e.g. TOP-20250128-00001)';

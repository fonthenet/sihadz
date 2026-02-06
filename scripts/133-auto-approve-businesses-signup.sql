-- Auto-approve businesses (professionals) when they sign up
-- Set defaults so new professionals are verified by default

-- Change default status from 'pending' to 'verified'
ALTER TABLE professionals 
  ALTER COLUMN status SET DEFAULT 'verified';

-- Ensure is_verified defaults to true (add column if missing, then set default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'professionals' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE professionals ALTER COLUMN is_verified SET DEFAULT true;
  END IF;
END $$;

-- Ensure is_active defaults to true
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'professionals' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE professionals ALTER COLUMN is_active SET DEFAULT true;
  END IF;
END $$;

-- Optional: backfill any existing pending professionals to verified (uncomment if desired)
-- UPDATE professionals SET status = 'verified', is_verified = true, is_active = true 
-- WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days';

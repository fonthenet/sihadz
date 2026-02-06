-- Add preferred_language to profiles (patient and professional)
-- Run with: npm run db:run -- scripts/131-profiles-preferred-language.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text
    CHECK (preferred_language IS NULL OR preferred_language IN ('ar', 'fr', 'en'));

COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred display language (ar, fr, en). Overrides platform language when set.';

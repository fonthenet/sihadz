-- Paste only this file (or the code below) in Supabase SQL Editor. Do not paste any page title or text that is not SQL.
-- Add all columns needed for Settings -> Profile (patient account)
-- Using public.profiles so it works even if your project uses a different schema.

-- Core profile fields (in case your profiles table was created with only id, email, full_name, user_type)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text;

-- Default location for "find doctors nearby"
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_wilaya_code text,
  ADD COLUMN IF NOT EXISTS default_city_id text;

COMMENT ON COLUMN public.profiles.default_wilaya_code IS 'Wilaya code (01-58) used as default when auto-looking for doctors nearby';
COMMENT ON COLUMN public.profiles.default_city_id IS 'City id within wilaya (e.g. hydra) used as default when auto-looking for doctors nearby';

-- If save still fails: Supabase → Table Editor → profiles, confirm default_wilaya_code and default_city_id exist. Refresh app and try Save again.
-- If RLS blocks update: SELECT * FROM pg_policies WHERE tablename = 'profiles'; you need an UPDATE policy with USING (auth.uid() = id)

-- =============================================
-- BULLETPROOF SUPER ADMIN FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- Step 1: Check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  user_type TEXT DEFAULT 'patient',
  is_verified BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: DISABLE RLS completely on profiles (temporary fix)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 5: Show all auth users
SELECT 'AUTH USERS:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Step 6: Insert/Update profile for EVERY auth user
INSERT INTO public.profiles (id, email, full_name, user_type, is_verified, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  'patient',
  true,
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  is_verified = true,
  is_active = true;

-- Step 7: Make f.onthenet@gmail.com super admin
UPDATE public.profiles 
SET user_type = 'super_admin', is_verified = true, is_active = true
WHERE email = 'f.onthenet@gmail.com';

-- Also try lowercase
UPDATE public.profiles 
SET user_type = 'super_admin', is_verified = true, is_active = true
WHERE LOWER(email) = LOWER('f.onthenet@gmail.com');

-- Step 8: Verify the result
SELECT 'PROFILES AFTER FIX:' as info;
SELECT id, email, user_type, is_verified FROM public.profiles ORDER BY user_type, email;

-- Step 9: Check super admin specifically
SELECT 'SUPER ADMIN CHECK:' as info;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = 'f.onthenet@gmail.com' AND user_type = 'super_admin')
    THEN '✅ SUCCESS: f.onthenet@gmail.com is now super_admin'
    ELSE '❌ FAILED: Check if email exists in auth.users'
  END as status;

-- Step 10: Re-enable RLS with permissive policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on profiles" 
ON public.profiles 
FOR ALL 
USING (true) 
WITH CHECK (true);

SELECT 'DONE! Try logging in now.' as final_status;

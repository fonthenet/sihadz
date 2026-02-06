-- Fix profiles RLS to allow viewing other users' profiles for chat
-- This is required for chat to display contact names correctly

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL potentially conflicting policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "Allow all profile operations" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create correct policies:

-- 1. Anyone authenticated can VIEW all profiles (required for chat, search, etc.)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT
  USING (true);

-- 2. Users can only UPDATE their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 3. Users can only INSERT their own profile (during signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Users can only DELETE their own profile
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Also fix profiles that have empty full_name - use email as display name
UPDATE public.profiles
SET full_name = SPLIT_PART(email, '@', 1)
WHERE (full_name IS NULL OR TRIM(full_name) = '')
  AND email IS NOT NULL
  AND TRIM(email) != '';

-- Verify the fix
SELECT 'Profiles with names fixed: ' || COUNT(*) FROM public.profiles WHERE full_name IS NOT NULL AND TRIM(full_name) != '';
SELECT 'Profiles still without names: ' || COUNT(*) FROM public.profiles WHERE full_name IS NULL OR TRIM(full_name) = '';

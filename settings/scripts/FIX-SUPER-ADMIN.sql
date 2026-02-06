-- =============================================
-- FIX SUPER ADMIN LOGIN - RUN THIS FIRST!
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  full_name_ar TEXT,
  phone TEXT,
  user_type TEXT DEFAULT 'patient',
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Enable RLS but allow all operations for now
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all profile operations" ON profiles;
CREATE POLICY "Allow all profile operations" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Step 3: See all auth users
SELECT 'AUTH USERS:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Step 4: See all profiles  
SELECT 'CURRENT PROFILES:' as info;
SELECT id, email, full_name, user_type FROM profiles LIMIT 10;

-- Step 5: Create profiles for ALL auth users who don't have one
INSERT INTO profiles (id, email, full_name, user_type, is_verified, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'user_type', 'patient'),
  true,
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);

-- Step 6: Make f.onthenet@gmail.com a super_admin
UPDATE profiles 
SET user_type = 'super_admin', 
    is_verified = true,
    is_active = true
WHERE email = 'f.onthenet@gmail.com';

-- Step 7: Also update jijelbackup4@gmail.com to be verified
UPDATE profiles 
SET is_verified = true,
    is_active = true
WHERE email = 'jijelbackup4@gmail.com';

-- Step 8: Show final result
SELECT 'UPDATED PROFILES:' as info;
SELECT id, email, full_name, user_type, is_verified FROM profiles ORDER BY 
  CASE WHEN user_type = 'super_admin' THEN 0 ELSE 1 END,
  created_at DESC;

-- Step 9: Verify the super admin exists
SELECT 'SUPER ADMIN CHECK:' as info;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM profiles WHERE email = 'f.onthenet@gmail.com' AND user_type = 'super_admin'
  ) 
  THEN '✅ Super admin is set correctly!' 
  ELSE '❌ Super admin NOT found - check if email exists in auth.users' 
  END as status;

-- ================================================
-- DIAGNOSTIC AND FIX SCRIPT
-- Run this in Supabase SQL Editor to diagnose issues
-- ================================================

-- 1. CHECK IF KEY TABLES EXIST
SELECT 'CHECKING TABLES...' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'professionals', 'doctors', 'chat_threads', 'appointments', 'prescriptions')
ORDER BY table_name;

-- 2. COUNT RECORDS IN KEY TABLES
SELECT 'COUNTING RECORDS...' as status;

SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'professionals', COUNT(*) FROM professionals
UNION ALL
SELECT 'chat_threads', COUNT(*) FROM chat_threads;

-- 3. CHECK PROFILES TABLE - See if your accounts exist
SELECT 'CHECKING USER PROFILES...' as status;

SELECT id, email, full_name, user_type, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 20;

-- 4. CHECK PROFESSIONALS TABLE - See if doctors exist
SELECT 'CHECKING PROFESSIONALS...' as status;

SELECT id, business_name, type, wilaya, status, is_verified, is_active
FROM professionals
ORDER BY created_at DESC
LIMIT 20;

-- 5. FIX: Make all professionals visible (if they exist but are hidden)
UPDATE professionals 
SET is_active = true, 
    is_verified = true,
    status = 'verified'
WHERE status != 'verified' OR is_active = false OR is_verified = false;

-- 6. CHECK AUTH USERS - See all registered users
SELECT 'CHECKING AUTH USERS...' as status;

SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- 7. ENSURE PROFILES EXIST FOR ALL AUTH USERS
INSERT INTO profiles (id, email, full_name, user_type, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'user_type', 'patient')::text,
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 8. REPORT RESULTS
SELECT 'FINAL COUNTS AFTER FIX...' as status;

SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'professionals (verified)', COUNT(*) FROM professionals WHERE status = 'verified'
UNION ALL
SELECT 'professionals (total)', COUNT(*) FROM professionals;

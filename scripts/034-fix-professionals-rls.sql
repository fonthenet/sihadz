-- Fix RLS on professionals table - allow public read access
-- Run: node scripts/run-sql.js scripts/034-fix-professionals-rls.sql

BEGIN;

-- Check current RLS status
SELECT 'Current RLS status:' as info, relname, relrowsecurity 
FROM pg_class WHERE relname = 'professionals';

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Professionals are viewable by everyone" ON professionals;
DROP POLICY IF EXISTS "Anyone can view professionals" ON professionals;
DROP POLICY IF EXISTS "Public can view active professionals" ON professionals;
DROP POLICY IF EXISTS "professionals_select_policy" ON professionals;
DROP POLICY IF EXISTS "Enable read access for all users" ON professionals;

-- Create a permissive public read policy
CREATE POLICY "Anyone can view professionals"
ON professionals FOR SELECT
TO public
USING (true);

-- Also make sure RLS is enabled (it needs policies to work)
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Force the policy to apply to table owner too (for service role)
ALTER TABLE professionals FORCE ROW LEVEL SECURITY;

-- Actually, for public access we might want to disable RLS entirely for SELECT
-- Let's try a different approach - make the policy very permissive
DROP POLICY IF EXISTS "Anyone can view professionals" ON professionals;
CREATE POLICY "Anyone can view professionals"
ON professionals FOR SELECT
TO anon, authenticated
USING (true);

-- Verify
SELECT 'RLS policies on professionals after fix:' as info;
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'professionals';

-- Test query
SELECT 'Test query - active doctors:' as info, count(*) 
FROM professionals 
WHERE type = 'doctor' AND is_active = true;

COMMIT;

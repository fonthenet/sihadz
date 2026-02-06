-- Fix: Activate ONLY your real accounts, deactivate all test accounts
-- Run: node scripts/run-sql.js scripts/032-fix-my-accounts.sql

BEGIN;

-- 1. Deactivate fake @algeriamed.test accounts
UPDATE professionals 
SET is_active = false 
WHERE email LIKE '%@algeriamed.test';

-- 2. Activate all NON-test accounts (your real signups)
UPDATE professionals
SET is_active = true, status = 'verified'
WHERE email NOT LIKE '%@algeriamed.test'
  AND email IS NOT NULL;

-- 3. Also fix doctors table
UPDATE doctors SET is_active = false
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@algeriamed.test'
);

UPDATE doctors SET is_active = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email NOT LIKE '%@algeriamed.test'
);

-- Show results
SELECT 'Active professionals (your real accounts):' as info;
SELECT email, business_name, type, status, is_active FROM professionals WHERE is_active = true ORDER BY created_at DESC;

COMMIT;

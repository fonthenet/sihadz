-- Show ALL professionals and fix is_active
-- Run: node scripts/run-sql.js scripts/035-show-and-fix-all.sql

-- 1. Show ALL professionals (regardless of is_active)
SELECT 'ALL professionals in database:' as info;
SELECT email, business_name, type, status, is_active 
FROM professionals 
ORDER BY created_at DESC;

-- 2. Count by is_active status
SELECT 'Count by is_active:' as info;
SELECT is_active, count(*) FROM professionals GROUP BY is_active;

-- 3. FIX: Activate all NON-test accounts
UPDATE professionals
SET is_active = true
WHERE email NOT LIKE '%@algeriamed.test';

-- 4. Show result
SELECT 'After fix - active professionals:' as info;
SELECT email, business_name, type, status, is_active 
FROM professionals 
WHERE is_active = true
ORDER BY created_at DESC;

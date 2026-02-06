-- Show ALL active professionals (what the website queries)
-- Run: node scripts/run-sql.js scripts/033-find-all-active.sql

-- This is exactly what the search/booking pages query:
SELECT 
  id,
  business_name,
  email,
  type,
  status,
  is_active,
  is_verified,
  onboarding_completed
FROM professionals
WHERE is_active = true
  AND status IN ('verified', 'pending')
ORDER BY type, created_at DESC;

-- Also show ALL professionals regardless of status
SELECT '--- ALL PROFESSIONALS ---' as info;
SELECT 
  id,
  business_name,
  email,
  type,
  status,
  is_active
FROM professionals
ORDER BY created_at DESC;

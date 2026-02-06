-- Diagnose what's in doctors and professionals tables
-- Run: node scripts/run-sql.js scripts/028-diagnose-doctors.sql

-- 0. Check specifically for jijelbackup5@gmail.com
SELECT 'AUTH USER' as source, id, email, created_at
FROM auth.users
WHERE email LIKE '%jijelbackup%'
UNION ALL
SELECT 'PROFESSIONAL', pr.id, pr.email, pr.created_at
FROM professionals pr
WHERE pr.email LIKE '%jijelbackup%'
UNION ALL
SELECT 'DOCTOR (by user_id)', d.id, u.email, d.created_at
FROM doctors d
JOIN auth.users u ON u.id = d.user_id
WHERE u.email LIKE '%jijelbackup%';

-- 1. All doctors in the doctors table (with emails)
SELECT 
  d.id,
  d.user_id,
  d.clinic_name,
  d.specialty,
  d.is_active,
  d.is_verified,
  u.email as auth_email,
  d.created_at
FROM doctors d
LEFT JOIN auth.users u ON u.id = d.user_id
ORDER BY d.created_at DESC
LIMIT 20;

-- 2. All doctor-type professionals (with onboarding status)
SELECT 
  pr.id,
  pr.auth_user_id,
  pr.business_name,
  pr.email,
  pr.status,
  pr.is_active,
  pr.is_verified,
  pr.onboarding_completed,
  pr.profile_completed,
  pr.created_at
FROM professionals pr
WHERE pr.type = 'doctor'
ORDER BY pr.created_at DESC
LIMIT 20;

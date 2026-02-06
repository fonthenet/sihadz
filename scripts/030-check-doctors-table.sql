-- Check what's in the DOCTORS table (not professionals)
-- Run: node scripts/run-sql.js scripts/030-check-doctors-table.sql

-- All doctors with their auth email
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
ORDER BY d.created_at DESC;

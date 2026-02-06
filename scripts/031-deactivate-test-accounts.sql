-- Deactivate all @algeriamed.test fake accounts
-- Run: node scripts/run-sql.js scripts/031-deactivate-test-accounts.sql

BEGIN;

-- Deactivate professionals with @algeriamed.test email
UPDATE professionals
SET is_active = false
WHERE email LIKE '%@algeriamed.test';

-- Deactivate doctors linked to @algeriamed.test users
UPDATE doctors
SET is_active = false
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@algeriamed.test'
);

-- Show what was deactivated
SELECT 'Deactivated professionals:' as info, count(*) as count
FROM professionals WHERE email LIKE '%@algeriamed.test' AND is_active = false;

COMMIT;

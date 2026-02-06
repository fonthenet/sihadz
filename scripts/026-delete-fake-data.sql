-- Remove fake/sample data. Keep only real user-created accounts.
-- Run: node scripts/run-sql.js scripts/026-delete-fake-data.sql
-- Requires DATABASE_URL in .env.local (use Supabase connection pooler).

BEGIN;

-- Sample professional UUIDs from COMPLETE-FIX / seed scripts
-- 1. Appointments that reference these (as doctor_id) – remove first to avoid FK issues
DELETE FROM appointments
WHERE doctor_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- 2. Sample professionals (fixed UUIDs)
DELETE FROM professionals
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- 3. Test accounts (@algeriamed.test): delete from our tables.
--    Auth users remain; delete them via Supabase Dashboard or Auth Admin API if desired.

DO $$
DECLARE
  fake_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO fake_ids
  FROM auth.users
  WHERE email LIKE '%@algeriamed.test';

  IF fake_ids IS NULL OR array_length(fake_ids, 1) IS NULL THEN
    RAISE NOTICE 'No @algeriamed.test users found.';
    RETURN;
  END IF;

  -- Appointments: where patient or doctor is fake
  DELETE FROM appointments
  WHERE patient_id = ANY(fake_ids)
     OR doctor_id IN (SELECT id FROM doctors WHERE user_id = ANY(fake_ids));

  -- Other tables that reference doctors or users (add as needed)
  -- e.g. prescriptions, lab_test_requests, etc.

  DELETE FROM doctors WHERE user_id = ANY(fake_ids);
  DELETE FROM professionals WHERE auth_user_id = ANY(fake_ids);
  DELETE FROM profiles WHERE id = ANY(fake_ids);

  -- Pharmacies, clinics, laboratories: typically keyed by user_id or professional id
  DELETE FROM pharmacies WHERE user_id = ANY(fake_ids);
  DELETE FROM clinics WHERE user_id = ANY(fake_ids);
  DELETE FROM laboratories WHERE user_id = ANY(fake_ids);

  RAISE NOTICE 'Removed data for % fake user(s).', array_length(fake_ids, 1);
END $$;

COMMIT;

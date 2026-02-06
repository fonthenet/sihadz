-- Remove test/AI-created doctors by email. Keep only real user-created accounts.
-- Run: node scripts/run-sql.js scripts/027-delete-test-doctors-by-email.sql
-- 1. Replace the emails below with the 5 AI doctor emails (one per line, quoted, comma-separated).
-- 2. Run the script.

BEGIN;

DO $$
DECLARE
  exclude_emails TEXT[] := ARRAY[
    'ai-doctor-1@example.com',
    'ai-doctor-2@example.com'
    -- Add more test emails; keep your real accounts (e.g. jijelbackup5@gmail.com) out of this list.
  ];
  fake_ids UUID[];
BEGIN
  IF exclude_emails IS NULL OR array_length(exclude_emails, 1) IS NULL THEN
    RAISE NOTICE 'exclude_emails is empty. Add test account emails and re-run.';
    RETURN;
  END IF;

  SELECT ARRAY_AGG(id) INTO fake_ids
  FROM auth.users
  WHERE email = ANY(exclude_emails);

  IF fake_ids IS NULL OR array_length(fake_ids, 1) IS NULL THEN
    RAISE NOTICE 'No auth.users found for the given emails.';
    RETURN;
  END IF;

  -- Appointments
  DELETE FROM appointments
  WHERE patient_id = ANY(fake_ids)
     OR doctor_id IN (SELECT id FROM doctors WHERE user_id = ANY(fake_ids));

  DELETE FROM doctors WHERE user_id = ANY(fake_ids);
  DELETE FROM professionals WHERE auth_user_id = ANY(fake_ids);
  DELETE FROM profiles WHERE id = ANY(fake_ids);
  DELETE FROM pharmacies WHERE user_id = ANY(fake_ids);
  DELETE FROM clinics WHERE user_id = ANY(fake_ids);
  DELETE FROM laboratories WHERE user_id = ANY(fake_ids);

  RAISE NOTICE 'Removed data for % test user(s).', array_length(fake_ids, 1);
END $$;

COMMIT;

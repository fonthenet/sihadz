-- Keep ONLY your real accounts. Deactivate all others.
-- Run: node scripts/run-sql.js scripts/029-keep-only-my-accounts.sql
--
-- BEFORE RUNNING: Edit the my_emails array below with YOUR real account emails.
-- Example: 'jijelbackup5@gmail.com', 'myother@email.com'

BEGIN;

DO $$
DECLARE
  my_emails TEXT[] := ARRAY[
    'jijelbackup5@gmail.com'
    -- Add your other real account emails here (comma-separated, quoted)
  ];
  my_user_ids UUID[];
BEGIN
  -- Get user IDs for your real accounts
  SELECT ARRAY_AGG(id) INTO my_user_ids
  FROM auth.users
  WHERE email = ANY(my_emails);

  IF my_user_ids IS NULL OR array_length(my_user_ids, 1) IS NULL THEN
    RAISE NOTICE 'No users found for the given emails. Check my_emails array.';
    RETURN;
  END IF;

  RAISE NOTICE 'Keeping % real account(s): %', array_length(my_user_ids, 1), my_user_ids;

  -- Deactivate all doctors EXCEPT yours
  UPDATE doctors
  SET is_active = false
  WHERE user_id IS NULL OR user_id != ALL(my_user_ids);

  -- Deactivate all professionals EXCEPT yours
  UPDATE professionals
  SET is_active = false
  WHERE auth_user_id IS NULL OR auth_user_id != ALL(my_user_ids);

  -- Make sure YOUR accounts are active
  UPDATE doctors
  SET is_active = true
  WHERE user_id = ANY(my_user_ids);

  UPDATE professionals
  SET is_active = true, status = 'verified'
  WHERE auth_user_id = ANY(my_user_ids);

  RAISE NOTICE 'Done. Your accounts are active; all others are deactivated.';
END $$;

COMMIT;

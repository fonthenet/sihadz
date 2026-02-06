-- FULL CLEANUP: Remove ALL test, seed, and transactional data
-- Use with caution - this wipes all clinical data, chats, appointments, etc.
-- Run in Supabase SQL Editor (or: node scripts/run-sql.js scripts/058-full-cleanup-all-data.sql)

BEGIN;

-- 1. Chat (children first)
DELETE FROM chat_attachments;
DELETE FROM chat_messages;
DELETE FROM chat_thread_members;
DELETE FROM chat_threads;

-- 2. Lab tests
DELETE FROM lab_test_items;
DELETE FROM lab_results;
DELETE FROM lab_test_requests;

-- 3. Prescriptions
DELETE FROM prescriptions;

-- 4. Notifications
DELETE FROM notifications;

-- 5. Healthcare tickets
DELETE FROM healthcare_tickets;

-- 6. Appointments
DELETE FROM appointments;

-- 7. Wallet (if tables exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
    DELETE FROM wallet_transactions;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'top_up_requests') THEN
    DELETE FROM top_up_requests;
  END IF;
END $$;

-- 8. Reset fallback sequences (used only on random collision)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'lab_test_number_fallback_seq') THEN
    ALTER SEQUENCE lab_test_number_fallback_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'prescription_number_fallback_seq') THEN
    ALTER SEQUENCE prescription_number_fallback_seq RESTART WITH 1;
  END IF;
END $$;

-- 9. Test/seed accounts: @algeriamed.test, @test., demo@, etc.
DO $$
DECLARE
  test_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO test_ids
  FROM auth.users
  WHERE email LIKE '%@algeriamed.test'
     OR email LIKE '%@test.%'
     OR email LIKE 'demo%@%'
     OR email LIKE 'test%@%'
     OR email LIKE 'seed%@%';

  IF test_ids IS NOT NULL AND array_length(test_ids, 1) > 0 THEN
    -- Remove from our tables (order matters for FK)
    DELETE FROM chat_user_settings WHERE user_id = ANY(test_ids);
    DELETE FROM chat_presence WHERE user_id = ANY(test_ids);
    DELETE FROM notifications WHERE user_id = ANY(test_ids);
    DELETE FROM professionals WHERE auth_user_id = ANY(test_ids);
    DELETE FROM profiles WHERE id = ANY(test_ids);
    RAISE NOTICE 'Removed % test account(s). Delete from Auth manually if needed.', array_length(test_ids, 1);
  END IF;
END $$;

COMMIT;

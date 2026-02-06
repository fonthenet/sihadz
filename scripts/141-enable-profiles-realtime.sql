-- Enable realtime for profiles table so chat can show live presence status
-- Run with: npm run db:run -- scripts/141-enable-profiles-realtime.sql

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    RAISE NOTICE 'Added profiles to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'profiles already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'profiles table does not exist';
  END;
END $$;

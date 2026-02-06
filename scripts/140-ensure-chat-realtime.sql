-- Ensure realtime is enabled for all chat tables
-- Run with: npm run db:run -- scripts/140-ensure-chat-realtime.sql

DO $$
BEGIN
  -- Enable realtime for chat_messages
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    RAISE NOTICE 'Added chat_messages to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'chat_messages already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'chat_messages table does not exist';
  END;
  
  -- Enable realtime for chat_threads
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
    RAISE NOTICE 'Added chat_threads to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'chat_threads already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'chat_threads table does not exist';
  END;
  
  -- Enable realtime for chat_thread_members
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_thread_members;
    RAISE NOTICE 'Added chat_thread_members to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'chat_thread_members already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'chat_thread_members table does not exist';
  END;
  
  -- Enable realtime for chat_attachments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_attachments;
    RAISE NOTICE 'Added chat_attachments to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'chat_attachments already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'chat_attachments table does not exist';
  END;

  -- Enable realtime for chat_message_deletes (delete-for-me)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_deletes;
    RAISE NOTICE 'Added chat_message_deletes to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'chat_message_deletes already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'chat_message_deletes table does not exist';
  END;

  -- Enable realtime for notifications (notification center)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    RAISE NOTICE 'Added notifications to supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'notifications already in supabase_realtime';
  WHEN undefined_table THEN
    RAISE NOTICE 'notifications table does not exist';
  END;
END $$;

-- Verify what tables are in the realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename LIKE 'chat%'
ORDER BY tablename;

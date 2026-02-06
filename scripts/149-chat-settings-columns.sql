-- Ensure chat_user_settings has show_typing_indicator (some older DBs may have different schema)
-- 012-chat-complete-v2 uses show_typing_indicator (singular), show_online_status (TEXT)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_user_settings' AND column_name = 'show_typing_indicator') THEN
    ALTER TABLE chat_user_settings ADD COLUMN show_typing_indicator BOOLEAN DEFAULT true;
  END IF;
END $$;

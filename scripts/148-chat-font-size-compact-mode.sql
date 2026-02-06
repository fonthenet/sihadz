-- Add font_size and compact_mode to chat_user_settings if they don't exist
-- Fixes Font Size and Compact Mode settings not working (columns missing in older DBs)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_user_settings' AND column_name = 'font_size') THEN
    ALTER TABLE chat_user_settings ADD COLUMN font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_user_settings' AND column_name = 'compact_mode') THEN
    ALTER TABLE chat_user_settings ADD COLUMN compact_mode BOOLEAN DEFAULT false;
  END IF;
END $$;

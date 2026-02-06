-- Add multilingual columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_fr TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_ar TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_fr TEXT;

-- Verify
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name IN ('title_ar', 'title_fr', 'message_ar', 'message_fr');

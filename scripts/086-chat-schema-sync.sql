-- ============================================
-- CHAT SCHEMA SYNC
-- Ensure all expected columns exist
-- ============================================

-- Add thread_type column if missing (code expects thread_type, some tables have type)
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS thread_type TEXT DEFAULT 'direct';
UPDATE chat_threads SET thread_type = type WHERE thread_type IS NULL OR thread_type = '';

-- Add description for group chats (admin controls)
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing columns to chat_thread_members
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS notification_level TEXT DEFAULT 'all';
ALTER TABLE chat_thread_members ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

SELECT 'Chat schema sync complete' as status;

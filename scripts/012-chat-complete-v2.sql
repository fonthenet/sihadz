-- ============================================
-- CHAT SYSTEM - COMPLETE DATABASE SCHEMA
-- Version: 2.0 - Full SOP Implementation
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing tables if they exist (be careful in production!)
-- Uncomment these lines only if you want to start fresh:
-- DROP TABLE IF EXISTS chat_message_reactions CASCADE;
-- DROP TABLE IF EXISTS chat_attachments CASCADE;
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS chat_thread_members CASCADE;
-- DROP TABLE IF EXISTS chat_threads CASCADE;
-- DROP TABLE IF EXISTS chat_blocks CASCADE;
-- DROP TABLE IF EXISTS chat_user_settings CASCADE;
-- DROP TABLE IF EXISTS chat_read_receipts CASCADE;
-- DROP TABLE IF EXISTS chat_pinned_messages CASCADE;
-- DROP TABLE IF EXISTS chat_presence CASCADE;

-- ============================================
-- USER CHAT SETTINGS (Availability & Privacy)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Availability Settings
  accepting_new_chats BOOLEAN DEFAULT true,
  accept_from_patients BOOLEAN DEFAULT true,
  accept_from_providers BOOLEAN DEFAULT true,
  accept_from_anyone BOOLEAN DEFAULT false,
  
  -- Auto-reply
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT,
  
  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  -- Privacy
  show_online_status TEXT DEFAULT 'contacts' CHECK (show_online_status IN ('everyone', 'contacts', 'nobody')),
  show_read_receipts BOOLEAN DEFAULT true,
  show_typing_indicator BOOLEAN DEFAULT true,
  
  -- Notification Preferences
  notifications_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  desktop_notifications BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT false,
  
  -- UI Preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  enter_to_send BOOLEAN DEFAULT true,
  compact_mode BOOLEAN DEFAULT false,
  message_preview_lines INTEGER DEFAULT 2,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRESENCE TRACKING (Online Status)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline', 'dnd')),
  status_message TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  current_device TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHAT THREADS (Conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_type TEXT NOT NULL DEFAULT 'direct' CHECK (thread_type IN ('direct', 'group', 'support', 'broadcast')),
  
  -- Group info (null for direct chats)
  title TEXT,
  avatar_url TEXT,
  description TEXT,
  
  -- Settings
  is_archived BOOLEAN DEFAULT false,
  allow_reactions BOOLEAN DEFAULT true,
  allow_replies BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_type ON chat_threads(thread_type);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated ON chat_threads(updated_at DESC);

-- ============================================
-- THREAD MEMBERS (Participants)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_thread_members (
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role (for groups)
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  -- Per-conversation settings
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  notification_level TEXT DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
  
  -- Read tracking
  last_read_message_id UUID,
  unread_count INTEGER DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES profiles(id),
  
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_members_user ON chat_thread_members(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_members_thread ON chat_thread_members(thread_id);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Content
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'audio', 'video', 'system')),
  
  -- Reply & Forward
  reply_to_message_id UUID REFERENCES chat_messages(id),
  forwarded_from_id UUID REFERENCES chat_messages(id),
  
  -- Edit & Delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_for UUID[] DEFAULT '{}', -- Array of user IDs who deleted locally
  edited_at TIMESTAMPTZ,
  original_content TEXT, -- Store original before edit
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON chat_messages(reply_to_message_id);

-- ============================================
-- ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  
  -- Media info
  thumbnail_path TEXT,
  duration INTEGER, -- For audio/video (in seconds)
  dimensions JSONB, -- {width, height} for images/videos
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);

-- ============================================
-- MESSAGE REACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_message_reactions(message_id);

-- ============================================
-- READ RECEIPTS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON chat_read_receipts(message_id);

-- ============================================
-- PINNED MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS chat_pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  pinned_by UUID REFERENCES profiles(id),
  pinned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, message_id)
);

-- ============================================
-- BLOCKED USERS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocker ON chat_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked ON chat_blocks(blocked_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE chat_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_blocks ENABLE ROW LEVEL SECURITY;

-- User Settings policies
CREATE POLICY "Users can view own settings" ON chat_user_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings" ON chat_user_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON chat_user_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Presence policies
CREATE POLICY "Anyone can view presence" ON chat_presence FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own presence" ON chat_presence FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Thread policies
CREATE POLICY "Thread members can view threads" ON chat_threads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_thread_members 
    WHERE thread_id = id 
    AND user_id = auth.uid()
    AND left_at IS NULL
  ));

CREATE POLICY "Users can create threads" ON chat_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Thread owners can update threads" ON chat_threads FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_thread_members 
    WHERE thread_id = id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND left_at IS NULL
  ));

-- Thread members policies
CREATE POLICY "Members can view thread members" ON chat_thread_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_thread_members m 
    WHERE m.thread_id = thread_id 
    AND m.user_id = auth.uid()
    AND m.left_at IS NULL
  ));

CREATE POLICY "Can join threads" ON chat_thread_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM chat_thread_members 
    WHERE thread_id = chat_thread_members.thread_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Members can update own membership" ON chat_thread_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Thread members can view messages" ON chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_thread_members 
    WHERE thread_id = chat_messages.thread_id 
    AND user_id = auth.uid()
    AND left_at IS NULL
  ));

CREATE POLICY "Thread members can send messages" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM chat_thread_members 
      WHERE thread_id = chat_messages.thread_id 
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
  );

CREATE POLICY "Users can update own messages" ON chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Attachments policies
CREATE POLICY "Thread members can view attachments" ON chat_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_thread_members tm ON tm.thread_id = m.thread_id
    WHERE m.id = message_id 
    AND tm.user_id = auth.uid()
    AND tm.left_at IS NULL
  ));

CREATE POLICY "Message senders can add attachments" ON chat_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_messages 
    WHERE id = message_id 
    AND sender_id = auth.uid()
  ));

-- Reactions policies
CREATE POLICY "Thread members can view reactions" ON chat_message_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_thread_members tm ON tm.thread_id = m.thread_id
    WHERE m.id = message_id 
    AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Thread members can add reactions" ON chat_message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions" ON chat_message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Read receipts policies
CREATE POLICY "Thread members can view read receipts" ON chat_read_receipts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_thread_members tm ON tm.thread_id = m.thread_id
    WHERE m.id = message_id 
    AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Users can mark as read" ON chat_read_receipts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Pinned messages policies
CREATE POLICY "Thread members can view pins" ON chat_pinned_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_thread_members 
    WHERE thread_id = chat_pinned_messages.thread_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can pin messages" ON chat_pinned_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_thread_members 
    WHERE thread_id = chat_pinned_messages.thread_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));

-- Blocks policies
CREATE POLICY "Users can view own blocks" ON chat_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others" ON chat_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock" ON chat_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Find or create direct chat between two users
CREATE OR REPLACE FUNCTION find_or_create_direct_thread(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  existing_thread_id UUID;
  new_thread_id UUID;
BEGIN
  -- Check for existing direct thread between these users
  SELECT ct.id INTO existing_thread_id
  FROM chat_threads ct
  WHERE ct.thread_type = 'direct'
  AND EXISTS (SELECT 1 FROM chat_thread_members WHERE thread_id = ct.id AND user_id = user1_id AND left_at IS NULL)
  AND EXISTS (SELECT 1 FROM chat_thread_members WHERE thread_id = ct.id AND user_id = user2_id AND left_at IS NULL)
  AND (SELECT COUNT(*) FROM chat_thread_members WHERE thread_id = ct.id AND left_at IS NULL) = 2
  LIMIT 1;

  IF existing_thread_id IS NOT NULL THEN
    RETURN existing_thread_id;
  END IF;

  -- Create new thread
  INSERT INTO chat_threads (thread_type, created_by) 
  VALUES ('direct', user1_id) 
  RETURNING id INTO new_thread_id;

  -- Add both users as members
  INSERT INTO chat_thread_members (thread_id, user_id, role) 
  VALUES 
    (new_thread_id, user1_id, 'member'),
    (new_thread_id, user2_id, 'member');

  RETURN new_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can start chat with another user
CREATE OR REPLACE FUNCTION can_start_chat(from_user_id UUID, to_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_to_settings chat_user_settings%ROWTYPE;
  v_from_type TEXT;
  v_is_blocked BOOLEAN;
BEGIN
  -- Check if blocked
  SELECT EXISTS (
    SELECT 1 FROM chat_blocks 
    WHERE blocker_id = to_user_id AND blocked_id = from_user_id
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN false;
  END IF;
  
  -- Get target's settings
  SELECT * INTO v_to_settings FROM chat_user_settings WHERE user_id = to_user_id;
  
  -- If no settings, default to accepting
  IF v_to_settings IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if accepting new chats
  IF NOT v_to_settings.accepting_new_chats THEN
    RETURN false;
  END IF;
  
  -- Get from user type
  SELECT user_type INTO v_from_type FROM profiles WHERE id = from_user_id;
  
  -- Check based on type
  IF v_from_type = 'patient' AND v_to_settings.accept_from_patients THEN
    RETURN true;
  END IF;
  
  IF v_from_type IN ('doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance') AND v_to_settings.accept_from_providers THEN
    RETURN true;
  END IF;
  
  IF v_to_settings.accept_from_anyone THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update thread timestamp when new message is sent
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON chat_messages;
CREATE TRIGGER trigger_update_thread_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_timestamp();

-- ============================================
-- ENABLE REALTIME
-- ============================================
DO $$
BEGIN
  -- Enable realtime for chat tables
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reactions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_thread_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ============================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================
-- Run this separately in Supabase Storage settings or via:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false);

-- Storage policies (run in Supabase dashboard)
-- CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');
-- CREATE POLICY "Users can view their chat attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-attachments');

-- ============================================
-- DONE!
-- ============================================
SELECT 'Chat system schema created successfully!' AS status;

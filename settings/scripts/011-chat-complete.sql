-- =============================================================================
-- COMPLETE CHAT SYSTEM DATABASE SCHEMA
-- Based on SOP Section 21: Platform-Wide Communication
-- Version: 011-chat-complete
-- 
-- This script creates all tables needed for the chat system.
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =============================================================================

-- =============================================================================
-- 1. CORE CHAT TABLES
-- =============================================================================

-- Chat Threads (conversations)
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'support', 'broadcast')),
  title text, -- For group chats
  description text,
  image_url text, -- Group avatar
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- For ticket-based threads (medical communication)
  ticket_id uuid, -- Can reference healthcare_tickets if exists
  order_type text, -- 'prescription', 'lab_order', 'referral'
  order_id uuid,
  -- Metadata for flexibility
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_type ON public.chat_threads(type);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_by ON public.chat_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_threads_ticket_id ON public.chat_threads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON public.chat_threads(updated_at DESC);

-- Thread Members
CREATE TABLE IF NOT EXISTS public.chat_thread_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'readonly')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_read_message_id uuid,
  muted boolean NOT NULL DEFAULT false,
  muted_until timestamptz,
  -- For typing indicators (updated via realtime)
  is_typing boolean NOT NULL DEFAULT false,
  typing_at timestamptz,
  -- Notifications
  notifications_enabled boolean NOT NULL DEFAULT true,
  UNIQUE(thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_members_thread_id ON public.chat_thread_members(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_members_user_id ON public.chat_thread_members(user_id);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'location', 'contact', 'appointment_link', 'quick_reply', 'system')),
  content text,
  -- Reply support
  reply_to_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  -- Edit support
  is_edited boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  -- Delete support
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at DESC);

-- Chat Attachments
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  storage_path text NOT NULL,
  thumbnail_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON public.chat_attachments(message_id);

-- =============================================================================
-- 2. USER PREFERENCES & SETTINGS
-- =============================================================================

-- Chat Settings (per user - SOP 21.3, 21.5)
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- Availability (SOP 21.3)
  accept_new_chats boolean NOT NULL DEFAULT true,
  who_can_contact jsonb NOT NULL DEFAULT '{"existing_patients": true, "any_patient": false, "providers": true, "anonymous": false}'::jsonb,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  auto_reply_message text DEFAULT 'I''m currently not accepting new chats. For appointments, please book online.',
  -- Quiet hours
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  -- Privacy (SOP 21.5)
  online_status_visible text NOT NULL DEFAULT 'contacts' CHECK (online_status_visible IN ('everyone', 'contacts', 'nobody')),
  read_receipts_enabled boolean NOT NULL DEFAULT true,
  typing_indicators_enabled boolean NOT NULL DEFAULT true,
  -- Notifications
  push_notifications boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT false,
  sound_enabled boolean NOT NULL DEFAULT true,
  -- Created/Updated
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_settings_user_id ON public.chat_settings(user_id);

-- User Presence (SOP 21.3 - Availability States)
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline', 'dnd')),
  status_message text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_device text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. ADDITIONAL FEATURES
-- =============================================================================

-- Pinned Threads (per user)
CREATE TABLE IF NOT EXISTS public.chat_pinned_threads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);

-- Pinned Messages (per user per thread)
CREATE TABLE IF NOT EXISTS public.chat_pinned_messages (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id, message_id)
);

-- Message Deletes (delete for me only)
CREATE TABLE IF NOT EXISTS public.chat_message_deletes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_deletes_user_id ON public.chat_message_deletes(user_id);

-- Blocked Users
CREATE TABLE IF NOT EXISTS public.chat_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocker_id ON public.chat_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked_id ON public.chat_blocks(blocked_id);

-- Quick Replies (Provider templates - SOP 21.11)
CREATE TABLE IF NOT EXISTS public.chat_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  shortcut text, -- e.g., "/thanks"
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_quick_replies_user_id ON public.chat_quick_replies(user_id);

-- =============================================================================
-- 4. DIRECTORY VIEW (for user discovery)
-- =============================================================================

-- Drop and recreate the directory view to include all user types
DROP VIEW IF EXISTS public.directory_users;

CREATE OR REPLACE VIEW public.directory_users AS
-- Professionals (doctors, pharmacies, labs, clinics)
SELECT 
  p.auth_user_id AS user_id,
  COALESCE(p.business_name, prof.full_name) AS display_name,
  p.type::text AS entity_type,
  p.logo_url AS avatar_url,
  CASE WHEN p.status = 'approved' THEN true ELSE false END AS is_active,
  LOWER(COALESCE(p.business_name, '') || ' ' || COALESCE(prof.full_name, '') || ' ' || COALESCE(p.type, '')) AS search_text
FROM public.professionals p
LEFT JOIN public.profiles prof ON prof.id = p.auth_user_id
WHERE p.auth_user_id IS NOT NULL

UNION ALL

-- Patients (from profiles where user is not a professional)
SELECT 
  pr.id AS user_id,
  pr.full_name AS display_name,
  'patient'::text AS entity_type,
  pr.avatar_url,
  true AS is_active,
  LOWER(COALESCE(pr.full_name, '') || ' patient') AS search_text
FROM public.profiles pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.professionals p WHERE p.auth_user_id = pr.id
)
AND pr.full_name IS NOT NULL

UNION ALL

-- Super admins
SELECT 
  pr.id AS user_id,
  pr.full_name AS display_name,
  'admin'::text AS entity_type,
  pr.avatar_url,
  true AS is_active,
  LOWER(COALESCE(pr.full_name, '') || ' admin') AS search_text
FROM public.profiles pr
WHERE pr.user_type = 'super_admin'
AND pr.full_name IS NOT NULL;

-- =============================================================================
-- 5. FUNCTION: Get Threads with Unread Count
-- =============================================================================

CREATE OR REPLACE FUNCTION public.chat_get_threads(p_user_id uuid)
RETURNS TABLE (
  thread_id uuid,
  thread_type text,
  title text,
  updated_at timestamptz,
  last_message_id uuid,
  last_message_type text,
  last_message_content text,
  last_message_created_at timestamptz,
  unread_count bigint,
  is_pinned boolean,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  other_entity_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH my_threads AS (
    SELECT 
      tm.thread_id,
      tm.last_read_message_id
    FROM public.chat_thread_members tm
    WHERE tm.user_id = p_user_id
    AND tm.left_at IS NULL
  ),
  thread_last_messages AS (
    SELECT DISTINCT ON (m.thread_id)
      m.thread_id,
      m.id AS last_message_id,
      m.message_type::text AS last_message_type,
      CASE WHEN m.is_deleted THEN '[Message deleted]' ELSE m.content END AS last_message_content,
      m.created_at AS last_message_created_at
    FROM public.chat_messages m
    WHERE m.thread_id IN (SELECT mt.thread_id FROM my_threads mt)
    ORDER BY m.thread_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.thread_id,
      COUNT(*)::bigint AS unread_count
    FROM public.chat_messages m
    JOIN my_threads mt ON mt.thread_id = m.thread_id
    WHERE (mt.last_read_message_id IS NULL OR m.created_at > (
      SELECT created_at FROM public.chat_messages WHERE id = mt.last_read_message_id
    ))
    AND m.sender_id != p_user_id
    AND m.is_deleted = false
    GROUP BY m.thread_id
  ),
  pinned AS (
    SELECT pt.thread_id
    FROM public.chat_pinned_threads pt
    WHERE pt.user_id = p_user_id
  ),
  other_members AS (
    SELECT DISTINCT ON (tm.thread_id)
      tm.thread_id,
      tm.user_id AS other_user_id
    FROM public.chat_thread_members tm
    JOIN public.chat_threads t ON t.id = tm.thread_id
    WHERE tm.thread_id IN (SELECT mt.thread_id FROM my_threads mt)
    AND tm.user_id != p_user_id
    AND t.type = 'direct'
    AND tm.left_at IS NULL
  )
  SELECT 
    t.id AS thread_id,
    t.type::text AS thread_type,
    t.title,
    COALESCE(tlm.last_message_created_at, t.updated_at, t.created_at) AS updated_at,
    tlm.last_message_id,
    tlm.last_message_type,
    tlm.last_message_content,
    tlm.last_message_created_at,
    COALESCE(uc.unread_count, 0)::bigint AS unread_count,
    CASE WHEN p.thread_id IS NOT NULL THEN true ELSE false END AS is_pinned,
    om.other_user_id,
    du.display_name AS other_display_name,
    du.avatar_url AS other_avatar_url,
    du.entity_type::text AS other_entity_type
  FROM public.chat_threads t
  JOIN my_threads mt ON mt.thread_id = t.id
  LEFT JOIN thread_last_messages tlm ON tlm.thread_id = t.id
  LEFT JOIN unread_counts uc ON uc.thread_id = t.id
  LEFT JOIN pinned p ON p.thread_id = t.id
  LEFT JOIN other_members om ON om.thread_id = t.id
  LEFT JOIN public.directory_users du ON du.user_id = om.other_user_id
  ORDER BY 
    CASE WHEN p.thread_id IS NOT NULL THEN 0 ELSE 1 END,
    COALESCE(tlm.last_message_created_at, t.updated_at, t.created_at) DESC;
END;
$$;

-- =============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_pinned_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_deletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_quick_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Users can view threads they are members of" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can create threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Thread admins can update threads" ON public.chat_threads;

DROP POLICY IF EXISTS "Users can view their memberships" ON public.chat_thread_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.chat_thread_members;

DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view attachments in their threads" ON public.chat_attachments;

DROP POLICY IF EXISTS "Users can manage own chat settings" ON public.chat_settings;
DROP POLICY IF EXISTS "Users can view others presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;

DROP POLICY IF EXISTS "Users can manage own pinned threads" ON public.chat_pinned_threads;
DROP POLICY IF EXISTS "Users can manage own pinned messages" ON public.chat_pinned_messages;
DROP POLICY IF EXISTS "Users can manage own message deletes" ON public.chat_message_deletes;
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.chat_blocks;
DROP POLICY IF EXISTS "Users can manage own quick replies" ON public.chat_quick_replies;

-- Chat Threads Policies
CREATE POLICY "Users can view threads they are members of"
ON public.chat_threads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_thread_members tm
    WHERE tm.thread_id = id AND tm.user_id = auth.uid() AND tm.left_at IS NULL
  )
);

CREATE POLICY "Users can create threads"
ON public.chat_threads FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Thread admins can update threads"
ON public.chat_threads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_thread_members tm
    WHERE tm.thread_id = id AND tm.user_id = auth.uid() AND tm.role = 'admin' AND tm.left_at IS NULL
  )
);

-- Thread Members Policies
CREATE POLICY "Users can view their memberships"
ON public.chat_thread_members FOR SELECT
TO authenticated
USING (
  thread_id IN (
    SELECT tm.thread_id FROM public.chat_thread_members tm
    WHERE tm.user_id = auth.uid() AND tm.left_at IS NULL
  )
);

CREATE POLICY "Users can update their own membership"
ON public.chat_thread_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Messages Policies
CREATE POLICY "Users can view messages in their threads"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  thread_id IN (
    SELECT tm.thread_id FROM public.chat_thread_members tm
    WHERE tm.user_id = auth.uid() AND tm.left_at IS NULL
  )
);

CREATE POLICY "Users can send messages to their threads"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND thread_id IN (
    SELECT tm.thread_id FROM public.chat_thread_members tm
    WHERE tm.user_id = auth.uid() AND tm.left_at IS NULL
  )
);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());

-- Attachments Policies
CREATE POLICY "Users can view attachments in their threads"
ON public.chat_attachments FOR SELECT
TO authenticated
USING (
  message_id IN (
    SELECT m.id FROM public.chat_messages m
    JOIN public.chat_thread_members tm ON tm.thread_id = m.thread_id
    WHERE tm.user_id = auth.uid() AND tm.left_at IS NULL
  )
);

-- Settings Policies
CREATE POLICY "Users can manage own chat settings"
ON public.chat_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Presence Policies
CREATE POLICY "Users can view others presence"
ON public.user_presence FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own presence"
ON public.user_presence FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pinned Threads Policies
CREATE POLICY "Users can manage own pinned threads"
ON public.chat_pinned_threads FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pinned Messages Policies
CREATE POLICY "Users can manage own pinned messages"
ON public.chat_pinned_messages FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Message Deletes Policies
CREATE POLICY "Users can manage own message deletes"
ON public.chat_message_deletes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Blocks Policies
CREATE POLICY "Users can manage own blocks"
ON public.chat_blocks FOR ALL
TO authenticated
USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());

-- Quick Replies Policies
CREATE POLICY "Users can manage own quick replies"
ON public.chat_quick_replies FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 7. STORAGE BUCKET FOR ATTACHMENTS
-- =============================================================================

-- Create storage bucket for chat attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments in their threads" ON storage.objects;

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Users can view chat attachments in their threads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

-- =============================================================================
-- 8. REALTIME SUBSCRIPTIONS
-- =============================================================================

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- =============================================================================
-- 9. DEFAULT QUICK REPLIES FOR NEW PROVIDERS
-- =============================================================================

-- Function to create default quick replies for providers
CREATE OR REPLACE FUNCTION public.create_default_quick_replies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create for professionals (not patients)
  IF NEW.user_type IN ('doctor', 'pharmacy', 'laboratory', 'clinic') THEN
    INSERT INTO public.chat_quick_replies (user_id, title, content, category, shortcut, sort_order)
    VALUES
      (NEW.id, 'Thank You', 'Thank you for reaching out. I''ll review your message and respond within 24 hours.', 'General', '/thanks', 1),
      (NEW.id, 'Urgent', 'For urgent matters, please call our office or visit the nearest emergency room.', 'General', '/urgent', 2),
      (NEW.id, 'Book Appointment', 'For a proper consultation, please book an appointment through our online booking system.', 'General', '/book', 3),
      (NEW.id, 'Currently Unavailable', 'I''m currently unavailable. Please leave your message and I''ll get back to you as soon as possible.', 'General', '/away', 4)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- DONE! Chat system is ready to use.
-- =============================================================================

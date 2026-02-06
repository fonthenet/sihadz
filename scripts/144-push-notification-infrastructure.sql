-- ============================================================
-- Push Notification Infrastructure
-- Adds device token storage and message notification triggers
-- Run: npm run db:run -- scripts/144-push-notification-infrastructure.sql
-- ============================================================

-- 1. Create push_device_tokens table to store FCM/APNs tokens
CREATE TABLE IF NOT EXISTS push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_device_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_device_tokens(token);

-- RLS for push tokens
ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tokens" ON push_device_tokens;
CREATE POLICY "Users can manage own tokens" ON push_device_tokens 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create push_notification_queue table for pending notifications
CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_pending ON push_notification_queue(status, created_at) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_queue_user ON push_notification_queue(user_id, created_at);

-- RLS for push queue (admin only for now)
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push queue" ON push_notification_queue;
CREATE POLICY "Users can view own push queue" ON push_notification_queue 
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Create function to queue push notification on new chat message
CREATE OR REPLACE FUNCTION queue_message_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_members UUID[];
  v_sender_name TEXT;
  v_thread_title TEXT;
  v_member_id UUID;
BEGIN
  -- Don't notify for deleted messages or system messages
  IF NEW.is_deleted = true OR NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT COALESCE(p.full_name, 'Someone') INTO v_sender_name
  FROM profiles p WHERE p.id = NEW.sender_id;

  -- Get thread title (for groups) or null for direct
  SELECT t.title INTO v_thread_title
  FROM chat_threads t WHERE t.id = NEW.thread_id;

  -- Get all thread members except sender
  SELECT ARRAY_AGG(tm.user_id) INTO v_thread_members
  FROM chat_thread_members tm
  WHERE tm.thread_id = NEW.thread_id
    AND tm.user_id != NEW.sender_id
    AND tm.left_at IS NULL;

  -- Queue notification for each member
  IF v_thread_members IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY v_thread_members
    LOOP
      -- Check if user has active push tokens
      IF EXISTS (
        SELECT 1 FROM push_device_tokens 
        WHERE user_id = v_member_id AND is_active = true
      ) THEN
        INSERT INTO push_notification_queue (user_id, title, body, data, priority)
        VALUES (
          v_member_id,
          COALESCE(v_thread_title, v_sender_name),
          CASE 
            WHEN NEW.message_type = 'audio' THEN '🎙️ Voice message'
            WHEN NEW.message_type = 'image' THEN '📷 Photo'
            WHEN NEW.message_type = 'video' THEN '🎬 Video'
            WHEN NEW.message_type = 'file' THEN '📎 File'
            ELSE COALESCE(LEFT(NEW.content, 100), 'New message')
          END,
          jsonb_build_object(
            'type', 'chat_message',
            'thread_id', NEW.thread_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id
          ),
          'high'
        );
      END IF;

      -- Also create in-app notification
      INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
      VALUES (
        v_member_id,
        'message',
        COALESCE(v_thread_title, v_sender_name),
        CASE 
          WHEN NEW.message_type = 'audio' THEN '🎙️ Sent a voice message'
          ELSE COALESCE(LEFT(NEW.content, 100), 'Sent a message')
        END,
        '/messages?thread=' || NEW.thread_id,
        jsonb_build_object(
          'thread_id', NEW.thread_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'sender_name', v_sender_name
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_message_push_notification ON chat_messages;
CREATE TRIGGER trigger_message_push_notification
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_message_push_notification();

-- 5. Helper function to register device token
CREATE OR REPLACE FUNCTION register_push_token(
  p_token TEXT,
  p_platform TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  INSERT INTO push_device_tokens (user_id, token, platform, device_name, app_version, last_used_at)
  VALUES (auth.uid(), p_token, p_platform, p_device_name, p_app_version, now())
  ON CONFLICT (user_id, token) 
  DO UPDATE SET 
    is_active = true,
    last_used_at = now(),
    device_name = COALESCE(EXCLUDED.device_name, push_device_tokens.device_name),
    app_version = COALESCE(EXCLUDED.app_version, push_device_tokens.app_version)
  RETURNING id INTO v_token_id;
  
  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function to unregister device token
CREATE OR REPLACE FUNCTION unregister_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE push_device_tokens 
  SET is_active = false 
  WHERE user_id = auth.uid() AND token = p_token;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION register_push_token TO authenticated;
GRANT EXECUTE ON FUNCTION unregister_push_token TO authenticated;

-- Done!
SELECT 'Push notification infrastructure created successfully' as status;

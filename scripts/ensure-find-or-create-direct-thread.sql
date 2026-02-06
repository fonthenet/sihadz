-- Ensure find_or_create_direct_thread exists so the chat widget reuses existing
-- direct threads instead of creating a new one each time (fixes "new chat overwrites previous").
-- Run this in Supabase SQL Editor if you only ran MASTER-SETUP and don't have 012-chat-complete-v2.

CREATE OR REPLACE FUNCTION find_or_create_direct_thread(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  existing_thread_id UUID;
  new_thread_id UUID;
BEGIN
  -- Check for existing direct thread (with left_at if column exists)
  SELECT ct.id INTO existing_thread_id
  FROM chat_threads ct
  WHERE ct.thread_type = 'direct'
  AND EXISTS (SELECT 1 FROM chat_thread_members ctm WHERE ctm.thread_id = ct.id AND ctm.user_id = user1_id AND ctm.left_at IS NULL)
  AND EXISTS (SELECT 1 FROM chat_thread_members ctm WHERE ctm.thread_id = ct.id AND ctm.user_id = user2_id AND ctm.left_at IS NULL)
  AND (SELECT COUNT(*) FROM chat_thread_members ctm WHERE ctm.thread_id = ct.id AND ctm.left_at IS NULL) = 2
  LIMIT 1;

  IF existing_thread_id IS NOT NULL THEN
    RETURN existing_thread_id;
  END IF;

  -- Create new thread (support both thread_type and type column)
  INSERT INTO chat_threads (thread_type, created_by)
  VALUES ('direct', user1_id)
  RETURNING id INTO new_thread_id;

  -- Add both users as members
  INSERT INTO chat_thread_members (thread_id, user_id, role)
  VALUES
    (new_thread_id, user1_id, 'admin'),
    (new_thread_id, user2_id, 'member');

  RETURN new_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

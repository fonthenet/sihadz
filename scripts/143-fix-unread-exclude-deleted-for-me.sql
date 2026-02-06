-- Fix: Exclude "deleted for me" messages from unread count in chat_get_threads
-- When a user deletes a message "for me", it should not count toward unread badge
-- Run: npm run db:run -- scripts/143-fix-unread-exclude-deleted-for-me.sql

DROP FUNCTION IF EXISTS public.chat_get_threads(uuid);

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
    LEFT JOIN public.chat_message_deletes d ON d.message_id = m.id AND d.user_id = p_user_id
    WHERE (mt.last_read_message_id IS NULL OR m.created_at > (
      SELECT created_at FROM public.chat_messages WHERE id = mt.last_read_message_id
    ))
    AND m.sender_id != p_user_id
    AND m.is_deleted = false
    AND d.message_id IS NULL  /* exclude messages user has "deleted for me" */
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

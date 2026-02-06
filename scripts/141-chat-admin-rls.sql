-- ============================================
-- CHAT ADMIN RLS - Allow owner/admin to manage groups
-- ============================================

-- Owner/admin can delete other members (remove from group)
CREATE POLICY "Owner admin can remove members" ON chat_thread_members FOR DELETE TO authenticated
  USING (
    user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_thread_members m
      WHERE m.thread_id = chat_thread_members.thread_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
      AND m.left_at IS NULL
    )
  );

-- Owner/admin can update other members (promote/demote role)
CREATE POLICY "Owner admin can update member roles" ON chat_thread_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_thread_members m
      WHERE m.thread_id = chat_thread_members.thread_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
      AND m.left_at IS NULL
    )
  );

-- Owner can delete thread (delete group)
CREATE POLICY "Owner can delete thread" ON chat_threads FOR DELETE TO authenticated
  USING (
    thread_type = 'group'
    AND EXISTS (
      SELECT 1 FROM chat_thread_members
      WHERE thread_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND left_at IS NULL
    )
  );

SELECT 'Chat admin RLS complete' as status;

-- Allow thread owners to delete group threads (for "Delete group" action)
-- chat_messages has ON DELETE CASCADE from chat_threads, so deleting the thread cascades to messages

DROP POLICY IF EXISTS "Thread owners can delete threads" ON chat_threads;
CREATE POLICY "Thread owners can delete threads" ON chat_threads
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_thread_members
      WHERE thread_id = chat_threads.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND left_at IS NULL
    )
  );

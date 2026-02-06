-- Allow users to delete own membership (leave group)
-- Skip if policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_thread_members' 
    AND policyname = 'Users can delete own membership'
  ) THEN
    CREATE POLICY "Users can delete own membership" ON chat_thread_members 
    FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

SELECT 'Chat leave policy complete' as status;

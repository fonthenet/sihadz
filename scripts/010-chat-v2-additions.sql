-- =============================================================================
-- CHAT V2 ADDITIONS (Delete-for-me + Reply + Edit metadata)
-- Version: 010
-- Safe to run multiple times (idempotent where possible)
-- =============================================================================

-- 1) Message reply + edit metadata (best-effort, requires chat_messages to exist)
ALTER TABLE IF EXISTS public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid NULL;

DO $$
BEGIN
  -- Add FK only if not present (Postgres doesn't support IF NOT EXISTS for constraints)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_reply_to_message_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_reply_to_message_id_fkey
      FOREIGN KEY (reply_to_message_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.chat_messages
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.chat_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL;

-- 2) Delete-for-me table
CREATE TABLE IF NOT EXISTS public.chat_message_deletes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_deletes_user_id ON public.chat_message_deletes(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_deletes_message_id ON public.chat_message_deletes(message_id);

ALTER TABLE public.chat_message_deletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own message deletes" ON public.chat_message_deletes;
CREATE POLICY "Users can manage own message deletes"
ON public.chat_message_deletes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- END
-- =============================================================================

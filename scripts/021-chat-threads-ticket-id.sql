-- =====================================================
-- Ticket-Centric: Link chat_threads to healthcare_tickets
-- Run this to enable ticket-first prescription workflow.
-- =====================================================

-- Add ticket_id to chat_threads (safe if column already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_threads' AND column_name = 'ticket_id'
  ) THEN
    ALTER TABLE public.chat_threads
    ADD COLUMN ticket_id UUID REFERENCES public.healthcare_tickets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for fast lookups by ticket
CREATE INDEX IF NOT EXISTS idx_chat_threads_ticket_id ON public.chat_threads(ticket_id);

-- Optional: ensure order_id exists for backward compatibility (some schemas use it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_threads' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN order_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_threads' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE public.chat_threads ADD COLUMN order_type TEXT;
  END IF;
END $$;

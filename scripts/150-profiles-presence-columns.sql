-- Add presence columns to profiles for chat presence/status (used by PresenceStatusSelector)
-- Other users see is_online, presence_status, last_seen_at when viewing threads

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_online') THEN
    ALTER TABLE profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'presence_status') THEN
    ALTER TABLE profiles ADD COLUMN presence_status TEXT DEFAULT 'offline' 
      CHECK (presence_status IN ('online', 'away', 'busy', 'offline', 'dnd'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen_at') THEN
    ALTER TABLE profiles ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

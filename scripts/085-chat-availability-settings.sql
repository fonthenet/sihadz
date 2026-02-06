-- ============================================
-- CHAT AVAILABILITY SETTINGS
-- Add columns for controlling who can message whom
-- ============================================

-- Add columns to chat_user_settings if they don't exist
DO $$
BEGIN
  -- accepting_new_chats - master switch
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_user_settings' AND column_name = 'accepting_new_chats') THEN
    ALTER TABLE chat_user_settings ADD COLUMN accepting_new_chats BOOLEAN DEFAULT true;
  END IF;

  -- accept_from_patients - allow patients to message
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_user_settings' AND column_name = 'accept_from_patients') THEN
    ALTER TABLE chat_user_settings ADD COLUMN accept_from_patients BOOLEAN DEFAULT true;
  END IF;

  -- accept_from_providers - allow other pros to message
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_user_settings' AND column_name = 'accept_from_providers') THEN
    ALTER TABLE chat_user_settings ADD COLUMN accept_from_providers BOOLEAN DEFAULT true;
  END IF;

  -- accept_from_anyone - public access (for discovery)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_user_settings' AND column_name = 'accept_from_anyone') THEN
    ALTER TABLE chat_user_settings ADD COLUMN accept_from_anyone BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create default settings for all existing professionals who don't have settings
-- This enables all businesses to chat with each other by default
INSERT INTO chat_user_settings (
  user_id, 
  accepting_new_chats, 
  accept_from_patients, 
  accept_from_providers,
  accept_from_anyone,
  notifications_enabled,
  sound_enabled
)
SELECT 
  p.auth_user_id,
  true,  -- accepting_new_chats
  true,  -- accept_from_patients  
  true,  -- accept_from_providers (enables pro-to-pro chat by default)
  false, -- accept_from_anyone
  true,  -- notifications_enabled
  true   -- sound_enabled
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_user_settings cus WHERE cus.user_id = p.auth_user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Also create default settings for all profiles that don't have settings
INSERT INTO chat_user_settings (
  user_id,
  accepting_new_chats,
  accept_from_patients,
  accept_from_providers,
  accept_from_anyone,
  notifications_enabled,
  sound_enabled
)
SELECT 
  pr.id,
  true,  -- accepting_new_chats
  true,  -- accept_from_patients
  true,  -- accept_from_providers
  false, -- accept_from_anyone
  true,  -- notifications_enabled
  true   -- sound_enabled
FROM profiles pr
WHERE NOT EXISTS (
  SELECT 1 FROM chat_user_settings cus WHERE cus.user_id = pr.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Update existing settings to enable pro-to-pro chat by default (only if null)
UPDATE chat_user_settings 
SET accept_from_providers = true 
WHERE accept_from_providers IS NULL;

SELECT 'Chat availability settings migration complete' as status;

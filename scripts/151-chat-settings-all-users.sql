-- ============================================
-- CHAT SETTINGS FOR ALL USERS (new + existing)
-- Ensures every user has chat_user_settings for a robust chat experience
-- ============================================

-- 1. Backfill: Create default chat_user_settings for ALL profiles that don't have one
INSERT INTO chat_user_settings (
  user_id,
  accepting_new_chats,
  accept_from_patients,
  accept_from_providers,
  accept_from_anyone,
  notifications_enabled,
  sound_enabled,
  desktop_notifications,
  theme,
  font_size,
  enter_to_send,
  compact_mode,
  message_preview_lines,
  show_read_receipts,
  show_typing_indicator,
  show_online_status
)
SELECT 
  p.id,
  true,   -- accepting_new_chats
  true,   -- accept_from_patients
  true,   -- accept_from_providers
  false,  -- accept_from_anyone
  true,   -- notifications_enabled
  true,   -- sound_enabled
  false,  -- desktop_notifications
  'system', -- theme
  'medium', -- font_size
  true,   -- enter_to_send
  false,  -- compact_mode
  2,      -- message_preview_lines
  true,   -- show_read_receipts
  true,   -- show_typing_indicator
  'contacts' -- show_online_status
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM chat_user_settings cus WHERE cus.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Trigger: Auto-create chat_user_settings when a new profile is created (new signups)
CREATE OR REPLACE FUNCTION create_chat_settings_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_user_settings (
    user_id,
    accepting_new_chats,
    accept_from_patients,
    accept_from_providers,
    accept_from_anyone,
    notifications_enabled,
    sound_enabled,
    desktop_notifications,
    theme,
    font_size,
    enter_to_send,
    compact_mode,
    message_preview_lines,
    show_read_receipts,
    show_typing_indicator,
    show_online_status
  ) VALUES (
    NEW.id,
    true, true, true, false,
    true, true, false,
    'system', 'medium', true,
    false, 2,
    true, true, 'contacts'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_profile_created_create_chat_settings ON profiles;

-- Create trigger
CREATE TRIGGER on_profile_created_create_chat_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_settings_for_new_user();

SELECT 'Chat settings migration complete: all users have defaults' AS status;

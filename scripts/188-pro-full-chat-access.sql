-- ============================================
-- PRO ACCOUNTS: FULL CHAT ACCESS & VISIBILITY
-- All professionals (new, old, future) have full chat access and are visible
-- ============================================

-- 1. Update ALL existing chat_user_settings for professionals to full access
UPDATE chat_user_settings cus
SET 
  accepting_new_chats = true,
  accept_from_patients = true,
  accept_from_providers = true,
  updated_at = NOW()
WHERE cus.user_id IN (
  SELECT auth_user_id FROM professionals WHERE auth_user_id IS NOT NULL
);

-- 2. Insert chat_user_settings for any professional who doesn't have one
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
  true,
  true,
  true,
  false,
  true,
  true
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id)
  AND NOT EXISTS (SELECT 1 FROM chat_user_settings cus WHERE cus.user_id = p.auth_user_id)
ON CONFLICT (user_id) DO UPDATE SET
  accepting_new_chats = true,
  accept_from_patients = true,
  accept_from_providers = true,
  updated_at = NOW();

-- 3. Trigger: Auto-create chat_user_settings when a new professional is inserted
CREATE OR REPLACE FUNCTION create_chat_settings_for_new_professional()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL THEN
    INSERT INTO chat_user_settings (
      user_id,
      accepting_new_chats,
      accept_from_patients,
      accept_from_providers,
      accept_from_anyone,
      notifications_enabled,
      sound_enabled
    ) VALUES (
      NEW.auth_user_id,
      true, true, true, false,
      true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      accepting_new_chats = true,
      accept_from_patients = true,
      accept_from_providers = true,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_professional_created_create_chat_settings ON professionals;
CREATE TRIGGER on_professional_created_create_chat_settings
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_settings_for_new_professional();

-- 4. Also run on UPDATE when auth_user_id is set (e.g. link existing profile to new pro)
CREATE OR REPLACE FUNCTION ensure_pro_chat_settings_on_auth_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND (OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id) THEN
    INSERT INTO chat_user_settings (
      user_id,
      accepting_new_chats,
      accept_from_patients,
      accept_from_providers,
      accept_from_anyone,
      notifications_enabled,
      sound_enabled
    ) VALUES (
      NEW.auth_user_id,
      true, true, true, false,
      true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      accepting_new_chats = true,
      accept_from_patients = true,
      accept_from_providers = true,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_professional_updated_ensure_chat_settings ON professionals;
CREATE TRIGGER on_professional_updated_ensure_chat_settings
  AFTER UPDATE OF auth_user_id ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION ensure_pro_chat_settings_on_auth_link();

SELECT 'Pro full chat access migration complete' AS status;

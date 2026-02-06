-- ==============================================
-- FIX MISSING PROFILES FOR PROFESSIONALS
-- ==============================================
-- Problem: Professional accounts have auth_user_id but no matching profile
-- This breaks chat discovery since chat looks up profiles
-- ==============================================

-- 1. Insert missing profiles for professionals who have auth_user_id but no profile
INSERT INTO profiles (id, email, full_name, user_type, created_at, updated_at)
SELECT 
  p.auth_user_id,
  p.email,
  COALESCE(p.business_name, SPLIT_PART(p.email, '@', 1)),
  'professional',
  COALESCE(p.created_at, NOW()),
  NOW()
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert chat_user_settings with full access for all professionals missing settings
INSERT INTO chat_user_settings (user_id, accepting_new_chats, accept_from_patients, accept_from_providers, created_at, updated_at)
SELECT 
  p.auth_user_id,
  TRUE,
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chat_user_settings cus WHERE cus.user_id = p.auth_user_id)
ON CONFLICT (user_id) DO UPDATE SET
  accepting_new_chats = TRUE,
  accept_from_patients = TRUE,
  accept_from_providers = TRUE,
  updated_at = NOW();

-- 3. Create or replace trigger function to auto-create profile when professional is linked to auth user
CREATE OR REPLACE FUNCTION public.ensure_profile_for_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act if auth_user_id is set/changed and non-null
  IF NEW.auth_user_id IS NOT NULL THEN
    -- Create profile if missing
    INSERT INTO profiles (id, email, full_name, user_type, created_at, updated_at)
    VALUES (
      NEW.auth_user_id,
      NEW.email,
      COALESCE(NEW.business_name, SPLIT_PART(NEW.email, '@', 1)),
      'professional',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW()
    WHERE profiles.full_name IS NULL OR TRIM(profiles.full_name) = '';
    
    -- Create chat settings with full access
    INSERT INTO chat_user_settings (user_id, accepting_new_chats, accept_from_patients, accept_from_providers)
    VALUES (NEW.auth_user_id, TRUE, TRUE, TRUE)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS ensure_profile_on_professional_insert ON professionals;
CREATE TRIGGER ensure_profile_on_professional_insert
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION ensure_profile_for_professional();

DROP TRIGGER IF EXISTS ensure_profile_on_professional_update ON professionals;
CREATE TRIGGER ensure_profile_on_professional_update
  AFTER UPDATE OF auth_user_id ON professionals
  FOR EACH ROW
  WHEN (OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id)
  EXECUTE FUNCTION ensure_profile_for_professional();

-- 5. Report how many were fixed
SELECT 
  'Profiles created/updated' as action,
  COUNT(*) as count
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id)

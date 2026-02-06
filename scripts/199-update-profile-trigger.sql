-- Update trigger to always use business_name for profile full_name
-- And ensure it always updates the name, not just when empty

CREATE OR REPLACE FUNCTION public.ensure_profile_for_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act if auth_user_id is set/changed and non-null
  IF NEW.auth_user_id IS NOT NULL THEN
    -- Create or update profile - always use business_name
    INSERT INTO profiles (id, email, full_name, user_type, created_at, updated_at)
    VALUES (
      NEW.auth_user_id,
      NEW.email,
      COALESCE(NULLIF(TRIM(NEW.business_name), ''), SPLIT_PART(NEW.email, '@', 1)),
      'professional',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW();
    
    -- Create chat settings with full access
    INSERT INTO chat_user_settings (user_id, accepting_new_chats, accept_from_patients, accept_from_providers)
    VALUES (NEW.auth_user_id, TRUE, TRUE, TRUE)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also create a trigger for when business_name is updated to sync the profile name
CREATE OR REPLACE FUNCTION public.sync_profile_name_from_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND NEW.business_name IS NOT NULL AND TRIM(NEW.business_name) != '' THEN
    UPDATE profiles
    SET full_name = NEW.business_name, updated_at = NOW()
    WHERE id = NEW.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_on_business_name_change ON professionals;
CREATE TRIGGER sync_profile_on_business_name_change
  AFTER UPDATE OF business_name ON professionals
  FOR EACH ROW
  WHEN (OLD.business_name IS DISTINCT FROM NEW.business_name)
  EXECUTE FUNCTION sync_profile_name_from_professional();

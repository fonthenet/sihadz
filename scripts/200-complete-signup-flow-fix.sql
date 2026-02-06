-- ==============================================
-- COMPLETE SIGNUP FLOW FIX
-- ==============================================
-- This script ensures that when ANY user signs up:
-- 1. A profile is created automatically (from auth.users trigger)
-- 2. When they become a professional, their profile is updated with business_name
-- 3. Chat settings are created with FULL ACCESS for professionals
-- ==============================================

-- STEP 1: Fix the auth.users trigger to create profiles for ALL signups
-- ==============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for every new auth user
  INSERT INTO public.profiles (id, email, full_name, user_type, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'patient'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- STEP 2: Trigger when professional is created - update profile with business_name + create chat settings
-- ==============================================
CREATE OR REPLACE FUNCTION public.on_professional_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act if auth_user_id is set
  IF NEW.auth_user_id IS NOT NULL THEN
    
    -- 1. Ensure profile exists and has correct name (use business_name)
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
      user_type = 'professional',
      updated_at = NOW();
    
    -- 2. Create chat settings with FULL ACCESS (green = ready to chat)
    INSERT INTO chat_user_settings (user_id, accepting_new_chats, accept_from_patients, accept_from_providers, created_at, updated_at)
    VALUES (NEW.auth_user_id, TRUE, TRUE, TRUE, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      accepting_new_chats = TRUE,
      accept_from_patients = TRUE,
      accept_from_providers = TRUE,
      updated_at = NOW();
      
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in on_professional_created for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create triggers for INSERT and UPDATE
DROP TRIGGER IF EXISTS ensure_profile_on_professional_insert ON professionals;
DROP TRIGGER IF EXISTS on_professional_insert ON professionals;
CREATE TRIGGER on_professional_insert
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION on_professional_created();

DROP TRIGGER IF EXISTS ensure_profile_on_professional_update ON professionals;
DROP TRIGGER IF EXISTS on_professional_auth_linked ON professionals;
CREATE TRIGGER on_professional_auth_linked
  AFTER UPDATE OF auth_user_id ON professionals
  FOR EACH ROW
  WHEN (OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id AND NEW.auth_user_id IS NOT NULL)
  EXECUTE FUNCTION on_professional_created();


-- STEP 3: Keep profile name in sync when business_name changes
-- ==============================================
CREATE OR REPLACE FUNCTION public.sync_profile_from_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND NEW.business_name IS NOT NULL AND TRIM(NEW.business_name) != '' THEN
    UPDATE profiles
    SET 
      full_name = NEW.business_name,
      updated_at = NOW()
    WHERE id = NEW.auth_user_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in sync_profile_from_professional: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_on_business_name_change ON professionals;
CREATE TRIGGER sync_profile_on_business_name_change
  AFTER UPDATE OF business_name ON professionals
  FOR EACH ROW
  WHEN (OLD.business_name IS DISTINCT FROM NEW.business_name)
  EXECUTE FUNCTION sync_profile_from_professional();


-- STEP 4: Trigger to auto-create chat settings for ANY new profile (patients too)
-- ==============================================
CREATE OR REPLACE FUNCTION public.on_profile_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default chat settings for new profile
  -- Patients: can receive from providers, but providers need to initiate
  -- Professionals: full access (handled by on_professional_created, but this is a fallback)
  INSERT INTO chat_user_settings (user_id, accepting_new_chats, accept_from_patients, accept_from_providers, created_at, updated_at)
  VALUES (
    NEW.id,
    TRUE,  -- accepting_new_chats
    CASE WHEN NEW.user_type = 'professional' THEN TRUE ELSE FALSE END,  -- accept_from_patients (pros: yes, patients: no by default)
    TRUE,  -- accept_from_providers (everyone can receive from providers)
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in on_profile_created: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_create_chat_settings ON profiles;
CREATE TRIGGER on_profile_created_create_chat_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION on_profile_created();


-- STEP 5: Backfill - Fix all existing professionals missing profiles or chat settings
-- ==============================================

-- 5a. Create missing profiles for professionals
INSERT INTO profiles (id, email, full_name, user_type, created_at, updated_at)
SELECT 
  p.auth_user_id,
  p.email,
  COALESCE(NULLIF(TRIM(p.business_name), ''), SPLIT_PART(p.email, '@', 1)),
  'professional',
  COALESCE(p.created_at, NOW()),
  NOW()
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id)
ON CONFLICT (id) DO NOTHING;

-- 5b. Update profile names to match business_name for all professionals
UPDATE profiles
SET 
  full_name = p.business_name,
  user_type = 'professional',
  updated_at = NOW()
FROM professionals p
WHERE profiles.id = p.auth_user_id
  AND p.auth_user_id IS NOT NULL
  AND p.business_name IS NOT NULL
  AND TRIM(p.business_name) != '';

-- 5c. Create chat settings with FULL ACCESS for ALL professionals
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

-- 5d. Ensure existing professional chat settings have full access
UPDATE chat_user_settings
SET 
  accepting_new_chats = TRUE,
  accept_from_patients = TRUE,
  accept_from_providers = TRUE,
  updated_at = NOW()
FROM professionals p
WHERE chat_user_settings.user_id = p.auth_user_id
  AND p.auth_user_id IS NOT NULL;


-- STEP 6: Report results
-- ==============================================
SELECT 
  'Professionals with profiles' as metric,
  COUNT(*) as count
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id)

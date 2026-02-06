-- Remove test and fake data for a specific account by email
-- Usage: Replace the email below, then run: npm run db:run -- scripts/remove-test-data-for-account.sql
-- Account: sgerhj87@hieu.in (clinic: jijel mehdi)

DO $$
DECLARE
  v_email TEXT := 'sgerhj87@hieu.in';
  v_auth_id UUID;
  v_prof_id UUID;
BEGIN
  -- Get auth user and professional
  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email LIMIT 1;
  IF v_auth_id IS NULL THEN
    RAISE NOTICE 'User not found: %', v_email;
    RETURN;
  END IF;

  SELECT id INTO v_prof_id FROM professionals WHERE auth_user_id = v_auth_id LIMIT 1;

  IF v_prof_id IS NULL THEN
    RAISE NOTICE 'No professional found for %', v_email;
    RETURN;
  END IF;

  -- 1. Clean professional_profiles: remove placeholder/test values
  UPDATE professional_profiles
  SET
    bio = CASE WHEN bio ~ '^(me\s+)+me\s*$' OR bio = 'test' OR LENGTH(COALESCE(bio,'')) < 5 THEN NULL ELSE bio END,
    years_of_experience = CASE WHEN years_of_experience < 0 OR years_of_experience > 70 THEN NULL ELSE years_of_experience END,
    consultation_fee = CASE WHEN consultation_fee = 0 OR consultation_fee = 1000 THEN NULL ELSE consultation_fee END
  WHERE professional_id = v_prof_id;

  -- 2. Disable storefront for non-pharmacy professionals (clinics don't use storefront)
  UPDATE storefront_settings
  SET is_enabled = false, pickup_enabled = false
  WHERE professional_id = v_prof_id
    AND EXISTS (SELECT 1 FROM professionals WHERE id = v_prof_id AND type != 'pharmacy');

  -- 3. Ensure profiles entry exists
  INSERT INTO profiles (id, email, full_name, user_type)
  SELECT v_auth_id, v_email, split_part(v_email, '@', 1),
         COALESCE((SELECT type FROM professionals WHERE auth_user_id = v_auth_id LIMIT 1), 'patient')
  FROM auth.users WHERE id = v_auth_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_type = COALESCE((SELECT type FROM professionals WHERE auth_user_id = v_auth_id LIMIT 1), profiles.user_type);

  RAISE NOTICE 'Cleaned test/fake data for % (professional_id: %)', v_email, v_prof_id;
END $$;

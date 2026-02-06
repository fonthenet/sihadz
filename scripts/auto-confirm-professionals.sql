-- Auto-confirm professional users during signup
-- This bypasses email confirmation for professional accounts

CREATE OR REPLACE FUNCTION auto_confirm_professional()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if this is a professional user (has user_type in metadata)
  IF (NEW.raw_user_meta_data->>'user_type') = 'professional' THEN
    -- Auto-confirm the email
    NEW.email_confirmed_at = NOW();
    NEW.confirmation_token = '';
    
    -- Log for debugging
    RAISE NOTICE 'Auto-confirming professional user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run BEFORE insert on auth.users
DROP TRIGGER IF EXISTS auto_confirm_professional_trigger ON auth.users;
CREATE TRIGGER auto_confirm_professional_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_professional();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

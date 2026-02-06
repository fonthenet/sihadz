-- Function to check if an email is already registered (patient or professional)
-- Used by professional signup to prevent duplicate accounts from the beginning
-- Run: npm run db:run -- scripts/153-check-email-registered.sql

CREATE OR REPLACE FUNCTION public.check_email_registered(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
  );
$$;

COMMENT ON FUNCTION public.check_email_registered(TEXT) IS
  'Returns true if the email is already registered (patient or professional). Used to block duplicate signups.';

-- Grant execute to service role and authenticated users (signup page calls via server action)
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO anon;

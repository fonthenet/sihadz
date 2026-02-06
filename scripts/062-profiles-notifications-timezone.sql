-- Add notification preferences and timezone to profiles
-- Run: npm run db:run 062-profiles-notifications-timezone.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'africa-algiers';

COMMENT ON COLUMN public.profiles.email_notifications IS 'Receive appointment confirmations via email';
COMMENT ON COLUMN public.profiles.sms_notifications IS 'Receive appointment reminders via SMS';
COMMENT ON COLUMN public.profiles.push_notifications IS 'Receive push notifications on device';
COMMENT ON COLUMN public.profiles.marketing_emails IS 'Receive offers and news';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for appointment display (e.g. africa-algiers)';

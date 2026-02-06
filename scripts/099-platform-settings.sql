-- Platform-wide settings controlled by super admin
-- These settings override individual user preferences when disabled

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for feature flags)
DROP POLICY IF EXISTS "platform_settings_select" ON public.platform_settings;
CREATE POLICY "platform_settings_select" ON public.platform_settings
  FOR SELECT USING (true);

-- Only super admins can modify settings
DROP POLICY IF EXISTS "platform_settings_modify" ON public.platform_settings;
CREATE POLICY "platform_settings_modify" ON public.platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'super_admin'
    )
  );

-- Insert default chat settings
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'chat',
  '{
    "enable_patient_to_doctor_chat": true,
    "enable_patient_to_pharmacy_chat": true,
    "enable_patient_to_lab_chat": true,
    "enable_doctor_to_doctor_chat": true,
    "enable_provider_to_provider_chat": true
  }'::jsonb,
  'Chat/messaging feature toggles'
)
ON CONFLICT (key) DO UPDATE SET
  value = platform_settings.value || EXCLUDED.value,
  updated_at = NOW();

-- Insert default features settings
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'features',
  '{
    "enable_guest_booking": true,
    "enable_e_visit": true,
    "enable_home_visit": true,
    "enable_prescriptions": true,
    "enable_lab_requests": true,
    "enable_ai_analysis": true,
    "enable_ratings": true
  }'::jsonb,
  'Platform feature toggles'
)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(key);

-- Function to get a platform setting
CREATE OR REPLACE FUNCTION get_platform_setting(setting_key TEXT, sub_key TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT value INTO result FROM public.platform_settings WHERE key = setting_key;
  IF result IS NULL THEN
    RETURN NULL;
  END IF;
  IF sub_key IS NOT NULL THEN
    RETURN result->sub_key;
  END IF;
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_platform_setting TO authenticated;

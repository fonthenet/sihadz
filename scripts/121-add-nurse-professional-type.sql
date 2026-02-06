-- =============================================================================
-- Add 'nurse' as independent professional type
-- Nurses get their own category: bookable, discoverable, with own dashboard
-- =============================================================================

-- 1. Add 'nurse' to professionals type
-- If professionals uses professional_type enum:
ALTER TYPE professional_type ADD VALUE IF NOT EXISTS 'nurse';

-- 2. Update profiles.user_type CHECK to include 'nurse'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('patient', 'doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'nurse', 'admin', 'super_admin'));

-- 3. Sync trigger: ensure profiles.user_type includes nurse when syncing from professionals
-- (025-sync-profiles-from-professionals.sql logic - if that trigger exists, it should pick up nurse)
-- No change needed if trigger uses pro.type directly.

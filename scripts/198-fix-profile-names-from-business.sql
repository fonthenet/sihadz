-- Fix profile full_name to match professional business_name
-- This ensures chat displays the correct name for all professionals

UPDATE profiles
SET 
  full_name = p.business_name,
  updated_at = NOW()
FROM professionals p
WHERE profiles.id = p.auth_user_id
  AND p.auth_user_id IS NOT NULL
  AND p.business_name IS NOT NULL
  AND TRIM(p.business_name) != ''

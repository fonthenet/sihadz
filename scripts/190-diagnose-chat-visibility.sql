-- Comprehensive diagnosis for chat visibility issues
-- Check professionals, profiles, and chat_user_settings

-- 1. All pharmacies (show status, auth_user_id presence)
SELECT 'ALL PHARMACIES' as section;
SELECT 
  id,
  auth_user_id IS NOT NULL as has_auth_user,
  business_name,
  status,
  is_active,
  is_verified
FROM professionals
WHERE type = 'pharmacy'
ORDER BY created_at DESC
LIMIT 15;

-- 2. Pharmacy Taher 18 specifically
SELECT 'PHARMACY TAHER 18' as section;
SELECT * FROM professionals WHERE business_name ILIKE '%taher%18%';

-- 3. Check if their auth_user_id has a profile
SELECT 'PROFILE FOR TAHER 18' as section;
SELECT p.id, p.full_name, p.user_type, p.email
FROM profiles p
WHERE p.id = (SELECT auth_user_id FROM professionals WHERE business_name ILIKE '%taher%18%' LIMIT 1);

-- 4. Check chat_user_settings for Taher 18
SELECT 'CHAT SETTINGS FOR TAHER 18' as section;
SELECT cus.*
FROM chat_user_settings cus
WHERE cus.user_id = (SELECT auth_user_id FROM professionals WHERE business_name ILIKE '%taher%18%' LIMIT 1);

-- 5. Check RLS policies on professionals
SELECT 'RLS POLICIES ON PROFESSIONALS' as section;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'professionals';

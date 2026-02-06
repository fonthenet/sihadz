SELECT 
  id,
  auth_user_id,
  business_name,
  type,
  status,
  email,
  is_active,
  is_verified,
  created_at
FROM professionals
WHERE business_name ILIKE '%taher%'
ORDER BY created_at DESC;

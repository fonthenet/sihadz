SELECT 
  p.id,
  p.business_name,
  p.type,
  p.status,
  p.auth_user_id IS NOT NULL as has_auth,
  EXISTS(SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id) as has_profile,
  EXISTS(SELECT 1 FROM chat_user_settings cus WHERE cus.user_id = p.auth_user_id) as has_chat_settings
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 30

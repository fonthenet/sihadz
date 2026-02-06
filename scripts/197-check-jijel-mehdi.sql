SELECT 
  p.id,
  p.auth_user_id,
  p.business_name,
  p.type,
  p.email,
  p.status,
  p.is_active,
  p.is_verified,
  pr.id as profile_id,
  pr.full_name as profile_name,
  pr.email as profile_email,
  cus.accepting_new_chats,
  cus.accept_from_patients,
  cus.accept_from_providers
FROM professionals p
LEFT JOIN profiles pr ON pr.id = p.auth_user_id
LEFT JOIN chat_user_settings cus ON cus.user_id = p.auth_user_id
WHERE p.business_name ILIKE '%jijel%' OR p.business_name ILIKE '%mehdi%'
ORDER BY p.created_at DESC

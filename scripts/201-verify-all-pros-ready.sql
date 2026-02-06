SELECT 
  p.business_name,
  p.type,
  p.status,
  pr.full_name as profile_name,
  cus.accepting_new_chats,
  cus.accept_from_patients,
  cus.accept_from_providers,
  CASE 
    WHEN pr.id IS NULL THEN 'MISSING PROFILE'
    WHEN cus.user_id IS NULL THEN 'MISSING CHAT SETTINGS'
    WHEN cus.accepting_new_chats = FALSE THEN 'CHAT DISABLED'
    ELSE 'READY'
  END as chat_status
FROM professionals p
LEFT JOIN profiles pr ON pr.id = p.auth_user_id
LEFT JOIN chat_user_settings cus ON cus.user_id = p.auth_user_id
WHERE p.auth_user_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 20

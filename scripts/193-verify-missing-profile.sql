-- Check if auth.users exists for this ID
SELECT 'Check: Does this auth_user_id exist in profiles?' as info;
SELECT COUNT(*) as count FROM profiles WHERE id = 'c6e451ef-37dc-41c2-a9fe-7ae04bfe6cb5';

-- Check all professionals with their profile existence
SELECT 'Professionals missing profiles' as info;
SELECT 
  p.id,
  p.auth_user_id,
  p.business_name,
  p.type,
  p.email,
  EXISTS(SELECT 1 FROM profiles pr WHERE pr.id = p.auth_user_id) as has_profile
FROM professionals p
WHERE p.auth_user_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 20;

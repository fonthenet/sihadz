-- Check profile for Pharmacy Taher 18
SELECT 'PROFILE' as check_type, id, full_name, user_type, email
FROM profiles
WHERE id = 'c6e451ef-37dc-41c2-a9fe-7ae04bfe6cb5';

-- Check chat_user_settings for Pharmacy Taher 18
SELECT 'CHAT_SETTINGS' as check_type, user_id, accepting_new_chats, accept_from_patients, accept_from_providers
FROM chat_user_settings
WHERE user_id = 'c6e451ef-37dc-41c2-a9fe-7ae04bfe6cb5';

-- Diagnose chat contact name issue
-- Check if profile data matches what chat is seeing

-- 1. Find Jane Doe's profile
SELECT 'Jane Doe profile:' as info;
SELECT id, email, full_name, user_type FROM profiles WHERE email LIKE '%patient1%' OR full_name ILIKE '%jane%';

-- 2. Find all thread members for threads involving Jane Doe
SELECT 'Thread members involving Jane Doe:' as info;
SELECT 
  ctm.thread_id,
  ctm.user_id,
  p.email,
  p.full_name,
  p.user_type
FROM chat_thread_members ctm
LEFT JOIN profiles p ON p.id = ctm.user_id
WHERE ctm.user_id IN (SELECT id FROM profiles WHERE email LIKE '%patient1%' OR full_name ILIKE '%jane%')
   OR ctm.thread_id IN (
     SELECT thread_id FROM chat_thread_members 
     WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%patient1%' OR full_name ILIKE '%jane%')
   );

-- 3. Check if there are any profiles with NULL or empty full_name
SELECT 'Profiles with empty names:' as info;
SELECT id, email, full_name, user_type FROM profiles WHERE full_name IS NULL OR TRIM(full_name) = '' LIMIT 20;

-- 4. Check chat_thread_members user_id matches profiles.id
SELECT 'Orphaned thread members (user_id not in profiles):' as info;
SELECT ctm.* FROM chat_thread_members ctm
LEFT JOIN profiles p ON p.id = ctm.user_id
WHERE p.id IS NULL;

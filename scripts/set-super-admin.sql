-- Set f.onthenet@gmail.com as super_admin
UPDATE profiles 
SET user_type = 'super_admin'
WHERE email = 'f.onthenet@gmail.com'
   OR id IN (
     SELECT id FROM auth.users WHERE email = 'f.onthenet@gmail.com'
   );

-- Verify the update
SELECT id, full_name, email, user_type FROM profiles 
WHERE user_type = 'super_admin';

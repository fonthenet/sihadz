-- Drop the existing constraint and add super_admin to allowed types
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('patient', 'doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'admin', 'super_admin'));

-- Now set f.onthenet@gmail.com as super_admin
UPDATE profiles 
SET user_type = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'f.onthenet@gmail.com'
);

-- =============================================
-- COMPREHENSIVE FIX - RUN THIS FIRST!
-- Copy and paste this entire file into Supabase SQL Editor
-- =============================================

-- Step 1: Ensure profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  full_name_ar TEXT,
  phone TEXT,
  user_type TEXT DEFAULT 'patient',
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  blood_type TEXT,
  wilaya TEXT,
  commune TEXT,
  address TEXT,
  is_verified BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'prescription', 'payment', 'message', 'review', 'system', 'reminder')),
  title TEXT NOT NULL,
  title_ar TEXT,
  title_fr TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  message_fr TEXT,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Step 3: Drop all restrictive RLS policies and create permissive ones
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow everything
DROP POLICY IF EXISTS "profiles_all" ON profiles;
CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Notifications: Users see their own
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Step 4: Create auto-profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'patient'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Create profiles for ALL existing auth users who don't have one
INSERT INTO profiles (id, email, full_name, user_type, is_verified, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'user_type', 'patient'),
  true,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);

-- Step 6: Update specific users to super_admin
-- Update f.onthenet@gmail.com to super_admin
UPDATE profiles 
SET user_type = 'super_admin', is_verified = true, is_active = true
WHERE email = 'f.onthenet@gmail.com';

-- Also try by matching the auth user ID directly
UPDATE profiles 
SET user_type = 'super_admin', is_verified = true, is_active = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'f.onthenet@gmail.com');

-- Step 7: Create sample notifications for testing
INSERT INTO notifications (user_id, type, title, title_ar, message, message_ar, action_url)
SELECT 
  id,
  'system',
  'Welcome to DZDoc',
  'مرحبًا بك في DZDoc',
  'Your account has been set up successfully.',
  'تم إعداد حسابك بنجاح.',
  '/dashboard'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n WHERE n.user_id = profiles.id AND n.type = 'system'
)
LIMIT 10;

-- Step 8: Ensure professionals table exists
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance')),
  business_name TEXT NOT NULL,
  business_name_ar TEXT,
  specialty TEXT,
  specialty_ar TEXT,
  phone TEXT,
  email TEXT,
  wilaya TEXT,
  commune TEXT,
  address TEXT,
  consultation_fee INTEGER DEFAULT 2000,
  is_verified BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'verified',
  rating DECIMAL(2, 1) DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professionals_all" ON professionals;
CREATE POLICY "professionals_all" ON professionals FOR ALL USING (true) WITH CHECK (true);

-- Step 9: Add sample doctors if none exist
INSERT INTO professionals (id, type, business_name, business_name_ar, specialty, specialty_ar, wilaya, phone, consultation_fee, is_verified, is_active, status, rating, review_count)
SELECT * FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'doctor', 'Dr. Ahmed Benali', 'د. أحمد بن علي', 'General Medicine', 'طب عام', 'Algiers', '0555123456', 2500, true, true, 'verified', 4.8, 124),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'doctor', 'Dr. Fatima Cherif', 'د. فاطمة شريف', 'Pediatrics', 'طب الأطفال', 'Algiers', '0555234567', 3000, true, true, 'verified', 4.9, 89),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'doctor', 'Dr. Karim Mansouri', 'د. كريم منصوري', 'Cardiology', 'أمراض القلب', 'Oran', '0555345678', 4000, true, true, 'verified', 4.7, 156),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'doctor', 'Dr. Amina Hadj', 'د. أمينة حاج', 'Dermatology', 'الأمراض الجلدية', 'Constantine', '0555456789', 3500, true, true, 'verified', 4.6, 78),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'doctor', 'Dr. Youcef Boudiaf', 'د. يوسف بوضياف', 'Dentistry', 'طب الأسنان', 'Algiers', '0555567890', 2000, true, true, 'verified', 4.5, 201)
) AS v(id, type, business_name, business_name_ar, specialty, specialty_ar, wilaya, phone, consultation_fee, is_verified, is_active, status, rating, review_count)
WHERE NOT EXISTS (SELECT 1 FROM professionals WHERE type = 'doctor' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- Step 10: Show results
SELECT '=== SETUP COMPLETE ===' as status;

SELECT 'Auth Users:' as info, COUNT(*) as count FROM auth.users;
SELECT 'Profiles:' as info, COUNT(*) as count FROM profiles;
SELECT 'Professionals:' as info, COUNT(*) as count FROM professionals;
SELECT 'Notifications:' as info, COUNT(*) as count FROM notifications;

-- Show super admin status
SELECT 'Super Admin Check:' as info, 
  email, 
  user_type,
  CASE WHEN user_type = 'super_admin' THEN '✅ IS SUPER ADMIN' ELSE '❌ NOT super admin' END as status
FROM profiles 
WHERE email = 'f.onthenet@gmail.com';

-- If no result above, show all profiles
SELECT 'All Profiles:' as info;
SELECT id, email, full_name, user_type, is_verified FROM profiles ORDER BY created_at DESC LIMIT 10;

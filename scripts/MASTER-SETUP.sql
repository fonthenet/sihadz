-- ============================================================
-- DZDOC MASTER DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor to set up everything
-- Last Updated: January 28, 2026
-- ============================================================

-- ============================================================
-- PART 1: PROFILES TABLE (Required for all users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  full_name_ar TEXT,
  phone TEXT,
  user_type TEXT DEFAULT 'patient' CHECK (user_type IN ('patient', 'doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'admin', 'super_admin')),
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  blood_type TEXT,
  allergies TEXT[],
  chronic_conditions TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  wilaya TEXT,
  commune TEXT,
  address TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PART 2: PROFESSIONALS TABLE (Doctors, Pharmacies, Labs, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance')),
  business_name TEXT NOT NULL,
  business_name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  specialty TEXT,
  specialty_ar TEXT,
  license_number TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  wilaya TEXT,
  commune TEXT,
  address TEXT,
  address_ar TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  consultation_fee INTEGER DEFAULT 2000,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_on_duty BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'suspended')),
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  working_hours JSONB DEFAULT '{}',
  services TEXT[],
  languages TEXT[] DEFAULT ARRAY['ar', 'fr'],
  accepts_insurance BOOLEAN DEFAULT false,
  insurance_providers TEXT[],
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_professionals_type ON professionals(type);
CREATE INDEX IF NOT EXISTS idx_professionals_wilaya ON professionals(wilaya);
CREATE INDEX IF NOT EXISTS idx_professionals_status ON professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_auth_user ON professionals(auth_user_id);

-- ============================================================
-- PART 3: APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  end_time TIME,
  visit_type TEXT DEFAULT 'in-person' CHECK (visit_type IN ('in-person', 'e-visit', 'home-visit')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
  reason TEXT,
  notes TEXT,
  patient_notes TEXT,
  doctor_note_for_patient TEXT,
  symptoms TEXT[],
  is_first_visit BOOLEAN DEFAULT true,
  is_follow_up BOOLEAN DEFAULT false,
  follow_up_to UUID REFERENCES appointments(id),
  cancelled_by TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived')),
  payment_amount INTEGER,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================================
-- PART 4: CHAT SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_type TEXT DEFAULT 'direct' CHECK (thread_type IN ('direct', 'group', 'support')),
  title TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_thread_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'appointment', 'prescription')),
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_members_user ON chat_thread_members(user_id);

-- ============================================================
-- PART 5: PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id),
  doctor_id UUID REFERENCES professionals(id),
  appointment_id UUID REFERENCES appointments(id),
  prescription_number TEXT UNIQUE,
  diagnosis TEXT,
  diagnosis_code TEXT,
  notes TEXT,
  medications JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dispensed', 'partially_dispensed', 'expired', 'cancelled')),
  valid_until DATE,
  dispensed_by UUID REFERENCES professionals(id),
  dispensed_at TIMESTAMPTZ,
  qr_code TEXT,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 6: LAB REQUESTS & RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id),
  doctor_id UUID REFERENCES professionals(id),
  laboratory_id UUID REFERENCES professionals(id),
  appointment_id UUID REFERENCES appointments(id),
  request_number TEXT UNIQUE,
  tests JSONB DEFAULT '[]',
  clinical_notes TEXT,
  urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES lab_requests(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_code TEXT,
  result_value TEXT,
  unit TEXT,
  reference_range TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  notes TEXT,
  performed_by TEXT,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 7: REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  response TEXT,
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update professional rating when review is added
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE professionals
  SET 
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE professional_id = NEW.professional_id AND is_visible = true),
    review_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = NEW.professional_id AND is_visible = true)
  WHERE id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rating ON reviews;
CREATE TRIGGER trigger_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- ============================================================
-- PART 7B: NOTIFICATIONS
-- ============================================================
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
  action_label TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PROFESSIONALS POLICIES
DROP POLICY IF EXISTS "Anyone can view verified professionals" ON professionals;
CREATE POLICY "Anyone can view verified professionals" ON professionals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professionals can update own record" ON professionals;
CREATE POLICY "Professionals can update own record" ON professionals FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Anyone can insert professional" ON professionals;
CREATE POLICY "Anyone can insert professional" ON professionals FOR INSERT WITH CHECK (true);

-- APPOINTMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT USING (
  auth.uid() = patient_id OR 
  auth.uid() IN (SELECT auth_user_id FROM professionals WHERE id = professional_id)
);

DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
CREATE POLICY "Users can create appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE USING (
  auth.uid() = patient_id OR 
  auth.uid() IN (SELECT auth_user_id FROM professionals WHERE id = professional_id)
);

-- CHAT POLICIES
DROP POLICY IF EXISTS "Users can view their threads" ON chat_threads;
CREATE POLICY "Users can view their threads" ON chat_threads FOR SELECT USING (
  id IN (SELECT thread_id FROM chat_thread_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create threads" ON chat_threads;
CREATE POLICY "Users can create threads" ON chat_threads FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view thread members" ON chat_thread_members;
CREATE POLICY "Users can view thread members" ON chat_thread_members FOR SELECT USING (
  thread_id IN (SELECT thread_id FROM chat_thread_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can join threads" ON chat_thread_members;
CREATE POLICY "Users can join threads" ON chat_thread_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view messages in their threads" ON chat_messages;
CREATE POLICY "Users can view messages in their threads" ON chat_messages FOR SELECT USING (
  thread_id IN (SELECT thread_id FROM chat_thread_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  thread_id IN (SELECT thread_id FROM chat_thread_members WHERE user_id = auth.uid())
);

-- PRESCRIPTIONS POLICIES
DROP POLICY IF EXISTS "Users can view own prescriptions" ON prescriptions;
CREATE POLICY "Users can view own prescriptions" ON prescriptions FOR SELECT USING (
  auth.uid() = patient_id OR
  auth.uid() IN (SELECT auth_user_id FROM professionals WHERE id = doctor_id)
);

DROP POLICY IF EXISTS "Doctors can create prescriptions" ON prescriptions;
CREATE POLICY "Doctors can create prescriptions" ON prescriptions FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT auth_user_id FROM professionals WHERE id = doctor_id)
);

-- LAB REQUESTS POLICIES
DROP POLICY IF EXISTS "Users can view own lab requests" ON lab_requests;
CREATE POLICY "Users can view own lab requests" ON lab_requests FOR SELECT USING (
  auth.uid() = patient_id OR
  auth.uid() IN (SELECT auth_user_id FROM professionals WHERE id IN (doctor_id, laboratory_id))
);

DROP POLICY IF EXISTS "Users can view lab results" ON lab_results;
CREATE POLICY "Users can view lab results" ON lab_results FOR SELECT USING (
  request_id IN (SELECT id FROM lab_requests WHERE patient_id = auth.uid())
);

-- REVIEWS POLICIES
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON reviews;
CREATE POLICY "Anyone can view visible reviews" ON reviews FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "Patients can create reviews" ON reviews;
CREATE POLICY "Patients can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- ============================================================
-- PART 9: SEED TEST DATA
-- ============================================================

-- Create test professionals (doctors) - only if none exist
INSERT INTO professionals (id, type, business_name, business_name_ar, specialty, specialty_ar, wilaya, commune, phone, email, consultation_fee, is_verified, is_active, status, rating, review_count)
SELECT * FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'doctor', 'Dr. Ahmed Benali', 'د. أحمد بن علي', 'General Medicine', 'طب عام', 'Algiers', 'Bab El Oued', '0555123456', 'dr.ahmed@test.dz', 2500, true, true, 'verified', 4.8, 124),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'doctor', 'Dr. Fatima Cherif', 'د. فاطمة شريف', 'Pediatrics', 'طب الأطفال', 'Algiers', 'Hydra', '0555234567', 'dr.fatima@test.dz', 3000, true, true, 'verified', 4.9, 89),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'doctor', 'Dr. Karim Mansouri', 'د. كريم منصوري', 'Cardiology', 'أمراض القلب', 'Oran', 'Centre', '0555345678', 'dr.karim@test.dz', 4000, true, true, 'verified', 4.7, 156),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'pharmacy', 'Pharmacie El Afia', 'صيدلية العافية', NULL, NULL, 'Algiers', 'Kouba', '0555456789', 'pharmacie.afia@test.dz', 0, true, true, 'verified', 4.5, 67),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'laboratory', 'Laboratoire Central', 'المخبر المركزي', NULL, NULL, 'Algiers', 'El Biar', '0555567890', 'lab.central@test.dz', 0, true, true, 'verified', 4.6, 45)
) AS v(id, type, business_name, business_name_ar, specialty, specialty_ar, wilaya, commune, phone, email, consultation_fee, is_verified, is_active, status, rating, review_count)
WHERE NOT EXISTS (SELECT 1 FROM professionals LIMIT 1);

-- ============================================================
-- PART 10: HELPER FUNCTIONS
-- ============================================================

-- Function to make a user super admin
CREATE OR REPLACE FUNCTION make_super_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  IF user_id IS NULL THEN
    RETURN 'User not found: ' || user_email;
  END IF;
  
  UPDATE profiles SET user_type = 'super_admin' WHERE id = user_id;
  RETURN 'Success: ' || user_email || ' is now super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link a user to a professional record
CREATE OR REPLACE FUNCTION link_user_to_professional(user_email TEXT, prof_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  IF user_id IS NULL THEN
    RETURN 'User not found: ' || user_email;
  END IF;
  
  UPDATE professionals SET auth_user_id = user_id WHERE id = prof_id;
  UPDATE profiles SET user_type = (SELECT type FROM professionals WHERE id = prof_id) WHERE id = user_id;
  RETURN 'Success: Linked ' || user_email || ' to professional ' || prof_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE! Your database is ready.
-- 
-- NEXT STEPS:
-- 1. Create accounts via the app signup
-- 2. Run: SELECT make_super_admin('your-email@example.com');
-- 3. To link a user to a doctor: SELECT link_user_to_professional('email', 'doctor-uuid');
-- ============================================================

SELECT 'MASTER SETUP COMPLETE!' as status, 
       (SELECT COUNT(*) FROM profiles) as profiles_count,
       (SELECT COUNT(*) FROM professionals) as professionals_count;

-- Create a test doctor directly in professionals table
-- Run: node scripts/run-sql.js scripts/036-create-test-doctor.sql

-- Insert a test doctor
INSERT INTO professionals (
  id,
  email,
  business_name,
  business_name_ar,
  type,
  status,
  is_active,
  is_verified,
  phone,
  wilaya,
  commune,
  license_number,
  specialty,
  consultation_fee,
  rating,
  review_count,
  onboarding_completed,
  profile_completed
) VALUES (
  gen_random_uuid(),
  'test-doctor-' || floor(random() * 10000)::text || '@test.com',
  'Dr. Test Account',
  'د. حساب تجريبي',
  'doctor',
  'verified',
  true,
  true,
  '+213555123456',
  'Alger',
  'Alger Centre',
  'TEST-' || floor(random() * 10000)::text,
  'General Medicine',
  2500,
  4.5,
  10,
  true,
  true
);

-- Show all active doctors now
SELECT 'All active doctors after insert:' as info;
SELECT id, email, business_name, type, status, is_active
FROM professionals
WHERE type = 'doctor' AND is_active = true;

-- Total count
SELECT 'Total active doctors:' as info, count(*)
FROM professionals
WHERE type = 'doctor' AND is_active = true;

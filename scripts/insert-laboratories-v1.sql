-- Insert Professional Laboratories for Jijel, Algiers, and Oran
-- Version 1: Initial laboratories data

-- First, insert professional records
INSERT INTO professionals (
  id, auth_user_id, type, business_name, license_number, 
  email, phone, address_line1, wilaya, commune,
  status, profile_completed, onboarding_completed,
  created_at, updated_at
) VALUES
-- Jijel Labs
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire d''Analyses Médicales Jijel Centre',
  'LAB-18-001',
  'lam.jijel@lab.dz',
  '034 47 12 34',
  'Avenue de la République',
  'Jijel',
  'Jijel',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire BioMed Jijel',
  'LAB-18-002',
  'biomed.jijel@lab.dz',
  '034 47 45 67',
  'Cité El Moudjahidine',
  'Jijel',
  'Jijel',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
-- Algiers Labs
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire Central d''Analyses - Alger',
  'LAB-16-001',
  'central.alger@lab.dz',
  '021 63 78 90',
  '25 Rue Didouche Mourad',
  'Alger',
  'Alger Centre',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire d''Analyses Pasteur Alger',
  'LAB-16-002',
  'pasteur.alger@lab.dz',
  '021 92 45 67',
  'Rue Pasteur, El Biar',
  'Alger',
  'El Biar',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire de Biologie Médicale Hydra',
  'LAB-16-003',
  'biomed.hydra@lab.dz',
  '021 48 89 12',
  'Chemin des Glycines, Hydra',
  'Alger',
  'Hydra',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire LABEX - Bab Ezzouar',
  'LAB-16-004',
  'labex.babez@lab.dz',
  '021 24 56 78',
  'Cité AADL, Bab Ezzouar',
  'Alger',
  'Bab Ezzouar',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
-- Oran Labs
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire d''Analyses Médicales Oran Centre',
  'LAB-31-001',
  'lam.oran@lab.dz',
  '041 33 67 89',
  'Boulevard de la Révolution',
  'Oran',
  'Oran',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire BioLab Oran',
  'LAB-31-002',
  'biolab.oran@lab.dz',
  '041 39 78 90',
  'Rue Larbi Ben M''hidi, Seddikia',
  'Oran',
  'Oran',
  'verified',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'laboratory',
  'Laboratoire d''Analyses Ibn Sina - Oran',
  'LAB-31-003',
  'ibnsina.oran@lab.dz',
  '041 41 34 56',
  'Cité Djamel, El Hamri',
  'Oran',
  'Oran',
  'verified',
  true,
  true,
  NOW(),
  NOW()
);

-- Now insert professional profiles with detailed information
INSERT INTO professional_profiles (
  id, professional_id, bio, specialization, years_of_experience,
  consultation_fee, accepts_chifa, average_turnaround_time,
  home_sample_collection, accepts_insurance, operating_hours,
  test_types, average_rating, total_reviews,
  created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  CASE 
    WHEN p.wilaya = 'Jijel' AND p.license_number = 'LAB-18-001' THEN 'Modern medical analysis laboratory in Jijel center, offering complete blood tests, biochemistry, immunology, and microbiology services with rapid results.'
    WHEN p.wilaya = 'Jijel' AND p.license_number = 'LAB-18-002' THEN 'BioMed laboratory specializing in advanced medical diagnostics with state-of-the-art equipment and experienced technicians.'
    WHEN p.wilaya = 'Alger' AND p.license_number = 'LAB-16-001' THEN 'Leading medical analysis laboratory in Algiers center, equipped with latest technology for comprehensive diagnostic services.'
    WHEN p.wilaya = 'Alger' AND p.license_number = 'LAB-16-002' THEN 'Pasteur laboratory with decades of experience in medical diagnostics, serving El Biar and surrounding areas.'
    WHEN p.wilaya = 'Alger' AND p.license_number = 'LAB-16-003' THEN 'Modern biology laboratory in Hydra offering specialized tests including hormones, genetics, and toxicology.'
    WHEN p.wilaya = 'Alger' AND p.license_number = 'LAB-16-004' THEN 'LABEX provides fast and reliable medical analysis services in Bab Ezzouar with same-day results for most tests.'
    WHEN p.wilaya = 'Oran' AND p.license_number = 'LAB-31-001' THEN 'Premier medical laboratory in Oran center offering full range of diagnostic services with certified quality standards.'
    WHEN p.wilaya = 'Oran' AND p.license_number = 'LAB-31-002' THEN 'BioLab Oran specializes in biochemistry, hematology, and serology with rapid turnaround times.'
    WHEN p.wilaya = 'Oran' AND p.license_number = 'LAB-31-003' THEN 'Ibn Sina laboratory provides comprehensive medical analysis services with home sample collection available.'
  END,
  'Medical Laboratory',
  CASE 
    WHEN p.license_number LIKE '%-001' THEN 15
    WHEN p.license_number LIKE '%-002' THEN 12
    WHEN p.license_number LIKE '%-003' THEN 10
    ELSE 8
  END,
  0, -- consultation_fee (labs don't have consultation fees)
  true, -- accepts_chifa
  CASE 
    WHEN p.wilaya = 'Alger' THEN 4 -- 4 hours in Algiers
    ELSE 6 -- 6 hours in other cities
  END,
  true, -- home_sample_collection
  true, -- accepts_insurance
  '{"saturday": {"open": "07:00", "close": "18:00"}, "sunday": {"open": "08:00", "close": "12:00"}, "monday": {"open": "07:00", "close": "18:00"}, "tuesday": {"open": "07:00", "close": "18:00"}, "wednesday": {"open": "07:00", "close": "18:00"}, "thursday": {"open": "07:00", "close": "18:00"}, "friday": {"open": "closed", "close": "closed"}}'::jsonb,
  ARRAY['Blood Tests', 'Biochemistry', 'Hematology', 'Immunology', 'Microbiology', 'Serology', 'Hormones', 'Urine Analysis'],
  CASE 
    WHEN p.license_number LIKE '%-001' THEN 4.8
    WHEN p.license_number LIKE '%-002' THEN 4.6
    WHEN p.license_number LIKE '%-003' THEN 4.5
    ELSE 4.4
  END,
  CASE 
    WHEN p.license_number LIKE '%-001' THEN 156
    WHEN p.license_number LIKE '%-002' THEN 98
    WHEN p.license_number LIKE '%-003' THEN 73
    ELSE 45
  END,
  NOW(),
  NOW()
FROM professionals p
WHERE p.type = 'laboratory';

COMMIT;

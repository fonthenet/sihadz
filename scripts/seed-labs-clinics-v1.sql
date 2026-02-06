-- Insert laboratories with proper user_id references
INSERT INTO laboratories (
  user_id, name, name_ar, email, phone, license_number,
  wilaya_code, city, address, address_ar,
  latitude, longitude, is_active, is_verified, is_24h,
  rating, review_count, test_types, working_hours
) VALUES
-- Jijel Labs
(
  (SELECT id FROM auth.users WHERE email = 'lab1@algeriamed.test' LIMIT 1),
  'Laboratoire d''Analyses Médicales Jijel Centre',
  'مخبر التحاليل الطبية جيجل المركز',
  'lab1@algeriamed.test',
  '034-47-12-34',
  'LAB-18-001',
  '18', 'Jijel',
  '15 Avenue de la République, Jijel Centre',
  'شارع الجمهورية 15، جيجل المركز',
  36.8201, 5.7667,
  true, true, false,
  4.6, 127,
  ARRAY['blood_test', 'urine_test', 'covid_test', 'x_ray'],
  '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "08:00", "close": "13:00"}, "sunday": {"open": null, "close": null}}'::jsonb
),
(
  (SELECT id FROM auth.users WHERE email = 'lab2@algeriamed.test' LIMIT 1),
  'Laboratoire Bio-Santé El Milia',
  'مخبر بيو صحة الميلية',
  'lab2@algeriamed.test',
  '034-41-56-78',
  'LAB-18-002',
  '18', 'El Milia',
  'Cité 20 Août, El Milia',
  'حي 20 أوت، الميلية',
  36.7513, 6.2667,
  true, true, false,
  4.4, 89,
  ARRAY['blood_test', 'urine_test', 'pregnancy_test'],
  '{"monday": {"open": "08:30", "close": "17:30"}, "tuesday": {"open": "08:30", "close": "17:30"}, "wednesday": {"open": "08:30", "close": "17:30"}, "thursday": {"open": "08:30", "close": "17:30"}, "friday": {"open": "08:30", "close": "17:30"}, "saturday": {"open": "09:00", "close": "12:00"}, "sunday": {"open": null, "close": null}}'::jsonb
),

-- Algiers Labs
(
  (SELECT id FROM auth.users WHERE email = 'lab3@algeriamed.test' LIMIT 1),
  'Laboratoire Pasteur Alger',
  'مخبر باستور الجزائر',
  'lab3@algeriamed.test',
  '023-50-12-34',
  'LAB-16-001',
  '16', 'Alger Centre',
  '25 Rue Didouche Mourad, Alger Centre',
  'شارع ديدوش مراد 25، الجزائر الوسط',
  36.7538, 3.0588,
  true, true, true,
  4.8, 342,
  ARRAY['blood_test', 'urine_test', 'covid_test', 'x_ray', 'mri', 'ct_scan'],
  '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}'::jsonb
),
(
  (SELECT id FROM auth.users WHERE email = 'lab4@algeriamed.test' LIMIT 1),
  'Laboratoire Bio-Santé Hydra',
  'مخبر بيو صحة حيدرة',
  'lab4@algeriamed.test',
  '023-48-90-12',
  'LAB-16-002',
  '16', 'Hydra',
  'Résidence El Yasmine, Hydra',
  'إقامة الياسمين، حيدرة',
  36.7213, 3.0347,
  true, true, false,
  4.7, 215,
  ARRAY['blood_test', 'urine_test', 'allergy_test', 'hormone_test'],
  '{"monday": {"open": "07:30", "close": "19:00"}, "tuesday": {"open": "07:30", "close": "19:00"}, "wednesday": {"open": "07:30", "close": "19:00"}, "thursday": {"open": "07:30", "close": "19:00"}, "friday": {"open": "07:30", "close": "19:00"}, "saturday": {"open": "08:00", "close": "14:00"}, "sunday": {"open": null, "close": null}}'::jsonb
),

-- Oran Lab
(
  (SELECT id FROM auth.users WHERE email = 'lab5@algeriamed.test' LIMIT 1),
  'Laboratoire Central d''Analyses Oran',
  'المخبر المركزي للتحاليل وهران',
  'lab5@algeriamed.test',
  '041-33-45-67',
  'LAB-31-001',
  '31', 'Oran',
  'Boulevard de la Soummam, Oran',
  'شارع الصومام، وهران',
  35.6969, -0.6331,
  true, true, false,
  4.5, 198,
  ARRAY['blood_test', 'urine_test', 'covid_test', 'diabetes_test'],
  '{"monday": {"open": "08:00", "close": "18:30"}, "tuesday": {"open": "08:00", "close": "18:30"}, "wednesday": {"open": "08:00", "close": "18:30"}, "thursday": {"open": "08:00", "close": "18:30"}, "friday": {"open": "08:00", "close": "18:30"}, "saturday": {"open": "08:00", "close": "13:00"}, "sunday": {"open": null, "close": null}}'::jsonb
);

-- Insert clinics with proper user_id references
INSERT INTO clinics (
  user_id, name, name_ar, email, phone, license_number,
  wilaya_code, city, address, address_ar,
  latitude, longitude, is_active, is_verified, is_24h,
  rating, review_count, specialties, working_hours
) VALUES
-- Jijel Clinic
(
  (SELECT id FROM auth.users WHERE email = 'clinic1@algeriamed.test' LIMIT 1),
  'Polyclinique de Jijel Centre',
  'العيادة المتعددة الاختصاصات جيجل المركز',
  'clinic1@algeriamed.test',
  '034-47-23-45',
  'CLI-18-001',
  '18', 'Jijel',
  '8 Rue Larbi Ben M''hidi, Jijel',
  'شارع العربي بن مهيدي 8، جيجل',
  36.8195, 5.7650,
  true, true, false,
  4.3, 156,
  ARRAY['general_medicine', 'pediatrics', 'gynecology', 'dentistry'],
  '{"monday": {"open": "08:00", "close": "19:00"}, "tuesday": {"open": "08:00", "close": "19:00"}, "wednesday": {"open": "08:00", "close": "19:00"}, "thursday": {"open": "08:00", "close": "19:00"}, "friday": {"open": "08:00", "close": "19:00"}, "saturday": {"open": "09:00", "close": "14:00"}, "sunday": {"open": null, "close": null}}'::jsonb
),

-- Algiers Clinics
(
  (SELECT id FROM auth.users WHERE email = 'clinic2@algeriamed.test' LIMIT 1),
  'Clinique Médicale El-Biar',
  'العيادة الطبية الأبيار',
  'clinic2@algeriamed.test',
  '023-92-34-56',
  'CLI-16-001',
  '16', 'El Biar',
  '12 Chemin Mackley, El Biar',
  'طريق ماكلي 12، الأبيار',
  36.7650, 3.0300,
  true, true, false,
  4.7, 289,
  ARRAY['general_medicine', 'cardiology', 'orthopedics', 'radiology'],
  '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "10:00", "close": "15:00"}}'::jsonb
),
(
  (SELECT id FROM auth.users WHERE email = 'clinic3@algeriamed.test' LIMIT 1),
  'Centre Médical Bir Mourad Raïs',
  'المركز الطبي بئر مراد رايس',
  'clinic3@algeriamed.test',
  '023-56-78-90',
  'CLI-16-002',
  '16', 'Bir Mourad Raïs',
  'Cité des Asphodèles, Bir Mourad Raïs',
  'حي الأسفوديل، بئر مراد رايس',
  36.7300, 3.0800,
  true, true, true,
  4.5, 198,
  ARRAY['general_medicine', 'pediatrics', 'dermatology', 'ophthalmology'],
  '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}'::jsonb
),

-- Oran Clinics
(
  (SELECT id FROM auth.users WHERE email = 'clinic4@algeriamed.test' LIMIT 1),
  'Clinique Pluridisciplinaire Es-Senia',
  'العيادة المتعددة الاختصاصات السانية',
  'clinic4@algeriamed.test',
  '041-55-67-89',
  'CLI-31-001',
  '31', 'Es Senia',
  'Avenue de l''ALN, Es Senia',
  'شارع جيش التحرير الوطني، السانية',
  35.6500, -0.6200,
  true, true, false,
  4.4, 167,
  ARRAY['general_medicine', 'surgery', 'emergency', 'radiology'],
  '{"monday": {"open": "08:00", "close": "19:00"}, "tuesday": {"open": "08:00", "close": "19:00"}, "wednesday": {"open": "08:00", "close": "19:00"}, "thursday": {"open": "08:00", "close": "19:00"}, "friday": {"open": "08:00", "close": "19:00"}, "saturday": {"open": "08:00", "close": "15:00"}, "sunday": {"open": null, "close": null}}'::jsonb
),
(
  (SELECT id FROM auth.users WHERE email = 'clinic5@algeriamed.test' LIMIT 1),
  'Polyclinique Hai El-Badr',
  'العيادة المتعددة الاختصاصات حي البدر',
  'clinic5@algeriamed.test',
  '041-40-23-45',
  'CLI-31-002',
  '31', 'Oran',
  'Quartier El-Badr, Oran',
  'حي البدر، وهران',
  35.7000, -0.6400,
  true, true, false,
  4.6, 234,
  ARRAY['general_medicine', 'pediatrics', 'gynecology', 'physiotherapy'],
  '{"monday": {"open": "07:30", "close": "19:30"}, "tuesday": {"open": "07:30", "close": "19:30"}, "wednesday": {"open": "07:30", "close": "19:30"}, "thursday": {"open": "07:30", "close": "19:30"}, "friday": {"open": "07:30", "close": "19:30"}, "saturday": {"open": "08:00", "close": "14:00"}, "sunday": {"open": null, "close": null}}'::jsonb
);

-- Link pharmacies, labs, and clinics to real user accounts
-- This script updates the records to use actual user_id from profiles table

-- Get user IDs for pharmacy accounts
DO $$
DECLARE
  pharmacy1_user_id UUID;
  pharmacy2_user_id UUID;
  pharmacy3_user_id UUID;
  pharmacy4_user_id UUID;
  pharmacy5_user_id UUID;
  lab1_user_id UUID;
  lab2_user_id UUID;
  lab3_user_id UUID;
  lab4_user_id UUID;
  lab5_user_id UUID;
  clinic1_user_id UUID;
  clinic2_user_id UUID;
  clinic3_user_id UUID;
  clinic4_user_id UUID;
  clinic5_user_id UUID;
BEGIN
  -- Fetch user IDs from profiles
  SELECT id INTO pharmacy1_user_id FROM profiles WHERE email = 'pharmacy1@algeriamed.test' LIMIT 1;
  SELECT id INTO pharmacy2_user_id FROM profiles WHERE email = 'pharmacy2@algeriamed.test' LIMIT 1;
  SELECT id INTO pharmacy3_user_id FROM profiles WHERE email = 'pharmacy3@algeriamed.test' LIMIT 1;
  SELECT id INTO pharmacy4_user_id FROM profiles WHERE email = 'pharmacy4@algeriamed.test' LIMIT 1;
  SELECT id INTO pharmacy5_user_id FROM profiles WHERE email = 'pharmacy5@algeriamed.test' LIMIT 1;
  
  SELECT id INTO lab1_user_id FROM profiles WHERE email = 'lab1@algeriamed.test' LIMIT 1;
  SELECT id INTO lab2_user_id FROM profiles WHERE email = 'lab2@algeriamed.test' LIMIT 1;
  SELECT id INTO lab3_user_id FROM profiles WHERE email = 'lab3@algeriamed.test' LIMIT 1;
  SELECT id INTO lab4_user_id FROM profiles WHERE email = 'lab4@algeriamed.test' LIMIT 1;
  SELECT id INTO lab5_user_id FROM profiles WHERE email = 'lab5@algeriamed.test' LIMIT 1;
  
  SELECT id INTO clinic1_user_id FROM profiles WHERE email = 'clinic1@algeriamed.test' LIMIT 1;
  SELECT id INTO clinic2_user_id FROM profiles WHERE email = 'clinic2@algeriamed.test' LIMIT 1;
  SELECT id INTO clinic3_user_id FROM profiles WHERE email = 'clinic3@algeriamed.test' LIMIT 1;
  SELECT id INTO clinic4_user_id FROM profiles WHERE email = 'clinic4@algeriamed.test' LIMIT 1;
  SELECT id INTO clinic5_user_id FROM profiles WHERE email = 'clinic5@algeriamed.test' LIMIT 1;

  -- Update pharmacies with real user IDs (by city/wilaya)
  UPDATE pharmacies 
  SET user_id = pharmacy1_user_id
  WHERE wilaya_code = '18' AND name ILIKE '%El Moustakbel%';
  
  UPDATE pharmacies 
  SET user_id = pharmacy2_user_id
  WHERE wilaya_code = '18' AND name ILIKE '%Ibn Sina%';
  
  UPDATE pharmacies 
  SET user_id = pharmacy3_user_id
  WHERE wilaya_code = '16' AND name ILIKE '%Hydra%';
  
  UPDATE pharmacies 
  SET user_id = pharmacy4_user_id
  WHERE wilaya_code = '16' AND name ILIKE '%Kouba%';
  
  UPDATE pharmacies 
  SET user_id = pharmacy5_user_id
  WHERE wilaya_code = '31' AND name ILIKE '%Es-Salam%';

  -- Update laboratories with real user IDs
  UPDATE laboratories 
  SET user_id = lab1_user_id
  WHERE wilaya_code = '18' AND name ILIKE '%Mansouri%';
  
  UPDATE laboratories 
  SET user_id = lab2_user_id
  WHERE wilaya_code = '18' AND name ILIKE '%El-Milia%';
  
  UPDATE laboratories 
  SET user_id = lab3_user_id
  WHERE wilaya_code = '16' AND name ILIKE '%Bio-Santé%';
  
  UPDATE laboratories 
  SET user_id = lab4_user_id
  WHERE wilaya_code = '16' AND name ILIKE '%Pasteur%';
  
  UPDATE laboratories 
  SET user_id = lab5_user_id
  WHERE wilaya_code = '31';

  -- Update clinics with real user IDs
  UPDATE clinics 
  SET user_id = clinic1_user_id
  WHERE wilaya_code = '18';
  
  UPDATE clinics 
  SET user_id = clinic2_user_id
  WHERE wilaya_code = '16' AND name ILIKE '%El-Biar%';
  
  UPDATE clinics 
  SET user_id = clinic3_user_id
  WHERE wilaya_code = '16' AND name ILIKE '%Bir Mourad%';
  
  UPDATE clinics 
  SET user_id = clinic4_user_id
  WHERE wilaya_code = '31' AND name ILIKE '%Es-Senia%';
  
  UPDATE clinics 
  SET user_id = clinic5_user_id
  WHERE wilaya_code = '31' AND name ILIKE '%El-Badr%';

  RAISE NOTICE 'Successfully linked % pharmacies, % labs, and % clinics to real user accounts',
    (SELECT COUNT(*) FROM pharmacies WHERE user_id IN (pharmacy1_user_id, pharmacy2_user_id, pharmacy3_user_id, pharmacy4_user_id, pharmacy5_user_id)),
    (SELECT COUNT(*) FROM laboratories WHERE user_id IN (lab1_user_id, lab2_user_id, lab3_user_id, lab4_user_id, lab5_user_id)),
    (SELECT COUNT(*) FROM clinics WHERE user_id IN (clinic1_user_id, clinic2_user_id, clinic3_user_id, clinic4_user_id, clinic5_user_id));
END $$;

COMMIT;

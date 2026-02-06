-- Link pharmacy test accounts to real Algerian pharmacies
-- Update pharmacies table with correct pharmacy names and addresses

UPDATE pharmacies 
SET name = 'Pharmacie El Moustakbel',
    address = '15 Rue Bachir El Ibrahimi',
    city = 'Ijiel',
    wilaya_code = 'Ijiel',
    phone = '+213 34 12 34 56'
WHERE email = 'pharmacy1@algeriamed.test';

UPDATE pharmacies 
SET name = 'Pharmacie Ibn Sina',
    address = '23 Rue Emir Abdelkader',
    city = 'El Milia',
    wilaya_code = 'Ijiel',
    phone = '+213 34 56 78 90'
WHERE email = 'pharmacy2@algeriamed.test';

UPDATE pharmacies 
SET name = 'Pharmacie Hydra Centrale',
    address = '42 Avenue des Frères Bouadou',
    city = 'Hydra',
    wilaya_code = 'Alger',
    phone = '+213 21 23 45 67',
    is_24h = true
WHERE email = 'pharmacy3@algeriamed.test';

UPDATE pharmacies 
SET name = 'Pharmacie Kouba Moderne',
    address = '156 Rue Hassiba Ben Bouali',
    city = 'Kouba',
    wilaya_code = 'Alger',
    phone = '+213 21 34 56 78'
WHERE email = 'pharmacy4@algeriamed.test';

UPDATE pharmacies 
SET name = 'Pharmacie Es-Salam',
    address = '78 Boulevard Maata Mohamed',
    city = 'Oran',
    wilaya_code = 'Oran',
    phone = '+213 41 23 45 67'
WHERE email = 'pharmacy5@algeriamed.test';

-- Verify updates
SELECT email, name, address, city FROM pharmacies WHERE email LIKE 'pharmacy%@algeriamed.test';

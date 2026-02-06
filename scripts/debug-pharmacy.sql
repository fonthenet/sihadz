-- Check all professionals
SELECT id, type, business_name, auth_user_id FROM professionals LIMIT 10;

-- Check products pharmacy_id
SELECT pharmacy_id, COUNT(*) as cnt FROM pharmacy_products GROUP BY pharmacy_id;

-- Check if any pharmacy exists
SELECT COUNT(*) as pharmacy_count FROM professionals WHERE type = 'pharmacy';

-- Check which pharmacies have products
SELECT 
  p.id as pharmacy_id,
  p.business_name,
  p.auth_user_id,
  (SELECT COUNT(*) FROM pharmacy_products pp WHERE pp.pharmacy_id = p.id) as product_count,
  (SELECT COUNT(*) FROM pharmacy_inventory pi WHERE pi.pharmacy_id = p.id) as inventory_count
FROM professionals p
WHERE p.type = 'pharmacy';

-- Show sample products
SELECT id, pharmacy_id, name, selling_price FROM pharmacy_products LIMIT 5;

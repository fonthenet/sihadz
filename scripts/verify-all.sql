SELECT p.business_name, 
       (SELECT COUNT(*) FROM pharmacy_products pp WHERE pp.pharmacy_id = p.id) as products,
       (SELECT COUNT(*) FROM pharmacy_inventory pi WHERE pi.pharmacy_id = p.id) as inventory
FROM professionals p
WHERE p.type = 'pharmacy'
ORDER BY products DESC;

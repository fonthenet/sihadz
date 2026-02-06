SELECT pharmacy_id, COUNT(*) as product_count 
FROM pharmacy_products 
GROUP BY pharmacy_id;

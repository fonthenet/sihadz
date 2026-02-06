SELECT p.id, p.auth_user_id, p.type, p.business_name 
FROM professionals p 
WHERE p.type IN ('pharma_supplier', 'equipment_supplier') 
LIMIT 5;

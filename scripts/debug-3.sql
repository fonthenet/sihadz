SELECT id, user_id, type, title, created_at 
FROM notifications 
WHERE type = 'supplier_order'
ORDER BY created_at DESC
LIMIT 10;

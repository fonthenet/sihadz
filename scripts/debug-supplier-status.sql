-- Check supplier professionals
SELECT 'PROFESSIONALS' as section;
SELECT p.id, p.auth_user_id, p.type, p.business_name 
FROM professionals p 
WHERE p.type IN ('pharma_supplier', 'equipment_supplier') 
LIMIT 5;

-- Check supplier_settings for those suppliers
SELECT 'SUPPLIER_SETTINGS' as section;
SELECT ss.supplier_id, ss.notify_new_orders, ss.notify_new_link_requests
FROM supplier_settings ss
JOIN professionals p ON p.id = ss.supplier_id
WHERE p.type IN ('pharma_supplier', 'equipment_supplier')
LIMIT 5;

-- Check recent notifications of type supplier_order
SELECT 'RECENT_NOTIFICATIONS' as section;
SELECT id, user_id, type, title, created_at 
FROM notifications 
WHERE type = 'supplier_order'
ORDER BY created_at DESC
LIMIT 10;

-- Check recent supplier_purchase_orders
SELECT 'RECENT_ORDERS' as section;
SELECT id, order_number, supplier_id, buyer_id, status, created_at, submitted_at
FROM supplier_purchase_orders
ORDER BY created_at DESC
LIMIT 5;

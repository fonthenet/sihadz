SELECT id, order_number, supplier_id, buyer_id, status, created_at, submitted_at
FROM supplier_purchase_orders
ORDER BY created_at DESC
LIMIT 5;

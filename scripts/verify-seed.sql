SELECT 'Products' as entity, COUNT(*) as count FROM pharmacy_products
UNION ALL
SELECT 'Inventory batches', COUNT(*) FROM pharmacy_inventory
UNION ALL
SELECT 'Customers', COUNT(*) FROM pharmacy_customers
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM pharmacy_suppliers
UNION ALL
SELECT 'Warehouses', COUNT(*) FROM pharmacy_warehouses
UNION ALL
SELECT 'Categories', COUNT(*) FROM pharmacy_product_categories;

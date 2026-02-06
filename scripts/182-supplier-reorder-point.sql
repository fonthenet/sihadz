-- Add reorder_point and expiry_date to supplier_product_catalog for inventory alerts
ALTER TABLE supplier_product_catalog ADD COLUMN IF NOT EXISTS reorder_point INTEGER;
ALTER TABLE supplier_product_catalog ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE supplier_product_catalog ADD COLUMN IF NOT EXISTS batch_number TEXT;

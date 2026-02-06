-- Add product_form to pos_sale_items for form-aware dosage on receipts
ALTER TABLE pos_sale_items
  ADD COLUMN IF NOT EXISTS product_form TEXT;

COMMENT ON COLUMN pos_sale_items.product_form IS 'Product form (tablet, gel, etc.) for dosage labeling';

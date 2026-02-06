-- Add requires_expiry to supplier_product_categories
-- Medications, OTC, vaccines, consumables, etc. require expiry date; equipment does not

ALTER TABLE supplier_product_categories ADD COLUMN IF NOT EXISTS requires_expiry BOOLEAN DEFAULT FALSE;

-- Set requires_expiry = TRUE for pharma and medical consumables
UPDATE supplier_product_categories
SET requires_expiry = TRUE
WHERE supplier_type = 'pharma_supplier'
   OR (supplier_type = 'both' AND name = 'Medical Consumables');

COMMENT ON COLUMN supplier_product_categories.requires_expiry IS 'If true, products in this category must have expiry_date when added to catalog and when received in orders';

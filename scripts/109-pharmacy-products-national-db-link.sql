-- Add columns to link pharmacy products to national medications database

-- Add national database reference columns
ALTER TABLE pharmacy_products 
ADD COLUMN IF NOT EXISTS national_db_id UUID REFERENCES algerian_medications(id),
ADD COLUMN IF NOT EXISTS pharmnet_link TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_products_national_db 
ON pharmacy_products(national_db_id) 
WHERE national_db_id IS NOT NULL;

-- Add source column if not exists
ALTER TABLE pharmacy_products
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

COMMENT ON COLUMN pharmacy_products.national_db_id IS 'Reference to algerian_medications table';
COMMENT ON COLUMN pharmacy_products.pharmnet_link IS 'Link to PharmNet product page';
COMMENT ON COLUMN pharmacy_products.source IS 'How product was added: manual, national_db, import, api';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

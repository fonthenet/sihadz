-- Scanner settings for all professionals and businesses
-- Enables hand scanner configuration for products, prescriptions, receipts

-- Add scanner_settings JSONB to professionals
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS scanner_settings JSONB;

-- Add comment
COMMENT ON COLUMN professionals.scanner_settings IS 'Hand scanner config: enabled, suffixKey (Enter/Tab), minBarcodeLength, scanContexts (products/prescriptions/receipts/inventory), soundOnScan';

SELECT 'scanner_settings column added to professionals' as result;

-- Extend professional_services for rich service listings (photos, i18n, ordering)
-- Run with: npm run db:run -- scripts/120-professional-services-extended.sql

-- Add columns if not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'professional_services' AND column_name = 'image_url') THEN
    ALTER TABLE professional_services ADD COLUMN image_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'professional_services' AND column_name = 'image_urls') THEN
    ALTER TABLE professional_services ADD COLUMN image_urls TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'professional_services' AND column_name = 'name_ar') THEN
    ALTER TABLE professional_services ADD COLUMN name_ar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'professional_services' AND column_name = 'description_ar') THEN
    ALTER TABLE professional_services ADD COLUMN description_ar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'professional_services' AND column_name = 'display_order') THEN
    ALTER TABLE professional_services ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN professional_services.image_url IS 'Primary image URL for the service (Supabase Storage or external)';
COMMENT ON COLUMN professional_services.image_urls IS 'Additional image URLs for gallery';
COMMENT ON COLUMN professional_services.name_ar IS 'Service name in Arabic';
COMMENT ON COLUMN professional_services.description_ar IS 'Service description in Arabic';
COMMENT ON COLUMN professional_services.display_order IS 'Order for display on profile (lower = first)';

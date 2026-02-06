-- Document template/branding for prescriptions and lab requests
-- Run in Supabase SQL Editor

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS document_template JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN professionals.document_template IS 'Custom branding for printed documents: {practiceName, headerText, logoUrl, footerText, tagline}';

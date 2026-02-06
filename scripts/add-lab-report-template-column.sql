-- Lab report form template for laboratories (website-wide printed results)
-- Run in Supabase SQL Editor

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS lab_report_template JSONB DEFAULT NULL;

COMMENT ON COLUMN professionals.lab_report_template IS 'Lab-only: report form template for printed results. { labName, logoUrl, slogan, address, phone, email, website, showQrCode, showInterpretation, showLabNotes, signatureTechnician, signaturePathologist, primaryColor, fontFamily }';

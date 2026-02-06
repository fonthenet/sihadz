-- ============================================
-- ADD file_url COLUMNS FOR VERCEL BLOB MIGRATION
-- Adds file_url column to all document and attachment tables
-- to support Vercel Blob direct URLs
-- ============================================

-- Chat attachments
ALTER TABLE chat_attachments 
ADD COLUMN IF NOT EXISTS file_url TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_attachments_file_url ON chat_attachments(file_url);

-- Professional documents
ALTER TABLE professional_documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;

CREATE INDEX IF NOT EXISTS idx_professional_documents_file_url ON professional_documents(file_url);

-- Visit documents
ALTER TABLE visit_documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;

CREATE INDEX IF NOT EXISTS idx_visit_documents_file_url ON visit_documents(file_url);

-- Patient documents
ALTER TABLE patient_documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;

CREATE INDEX IF NOT EXISTS idx_patient_documents_file_url ON patient_documents(file_url);

-- Lab request documents
ALTER TABLE lab_request_documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;

CREATE INDEX IF NOT EXISTS idx_lab_request_documents_file_url ON lab_request_documents(file_url);

-- Professional services (for service images)
ALTER TABLE professional_services 
ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_professional_services_image_url ON professional_services(image_url);

-- Document templates
ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS header_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_document_templates_header_url ON document_templates(header_image_url);

-- Voice messages (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_messages') THEN
    ALTER TABLE voice_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
    CREATE INDEX IF NOT EXISTS idx_voice_messages_file_url ON voice_messages(file_url);
  END IF;
END $$;

-- Update comments
COMMENT ON COLUMN chat_attachments.file_url IS 'Direct Vercel Blob URL for the attachment';
COMMENT ON COLUMN professional_documents.file_url IS 'Direct Vercel Blob URL for the document';
COMMENT ON COLUMN visit_documents.file_url IS 'Direct Vercel Blob URL for the document';
COMMENT ON COLUMN patient_documents.file_url IS 'Direct Vercel Blob URL for the document';
COMMENT ON COLUMN lab_request_documents.file_url IS 'Direct Vercel Blob URL for the document';
COMMENT ON COLUMN professional_services.image_url IS 'Direct Vercel Blob URL for the service image';
COMMENT ON COLUMN document_templates.header_image_url IS 'Direct Vercel Blob URL for the header image';

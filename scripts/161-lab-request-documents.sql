-- =====================================================
-- Lab Request Documents - Labs can attach files to lab requests
-- Visible to doctors and patients. Run: npm run db:run -- scripts/161-lab-request-documents.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_request_id UUID NOT NULL REFERENCES lab_test_requests(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'lab_result',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_request_documents_request ON lab_request_documents(lab_request_id);
CREATE INDEX IF NOT EXISTS idx_lab_request_documents_uploaded_by ON lab_request_documents(uploaded_by);

-- RLS: Lab (assigned to request) can insert; lab, doctor, patient can select
ALTER TABLE lab_request_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_request_docs_select" ON lab_request_documents;
CREATE POLICY "lab_request_docs_select" ON lab_request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lab_test_requests lr
      WHERE lr.id = lab_request_documents.lab_request_id
      AND (
        lr.patient_id = auth.uid()
        OR lr.doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
        OR lr.laboratory_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      )
    )
  );

-- Insert: lab owner only (employees use API with admin client)
DROP POLICY IF EXISTS "lab_request_docs_insert" ON lab_request_documents;
CREATE POLICY "lab_request_docs_insert" ON lab_request_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM lab_test_requests lr
      WHERE lr.id = lab_request_documents.lab_request_id
      AND lr.laboratory_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "lab_request_docs_delete" ON lab_request_documents;
CREATE POLICY "lab_request_docs_delete" ON lab_request_documents FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lab_test_requests lr
      WHERE lr.id = lab_request_documents.lab_request_id
      AND lr.laboratory_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

COMMENT ON TABLE lab_request_documents IS 'Documents attached by labs to lab requests; visible to doctor and patient';

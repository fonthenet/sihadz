-- =====================================================
-- Document Management Schema
-- Professional credentials, visit attachments, patient docs
-- Run: npm run db:run -- scripts/160-document-management-schema.sql
-- =====================================================

-- 1. PROFESSIONAL DOCUMENTS (licenses, certificates, insurance)
CREATE TABLE IF NOT EXISTS professional_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('license', 'certificate', 'insurance', 'other')),
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  storage_path TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'expired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_documents_prof ON professional_documents(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_documents_category ON professional_documents(professional_id, category);

-- 2. VISIT DOCUMENTS (attached to appointments - patient & professional uploads)
CREATE TABLE IF NOT EXISTS visit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by_type TEXT NOT NULL CHECK (uploaded_by_type IN ('patient', 'professional')),
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_documents_appointment ON visit_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_visit_documents_uploaded_by ON visit_documents(uploaded_by);

-- 3. PATIENT DOCUMENTS (general vault - ID, Chifa, insurance - visible to treating professionals)
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  storage_path TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'expired')),
  chifa_number TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id);

-- RLS for professional_documents
ALTER TABLE professional_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prof_docs_select_own" ON professional_documents;
CREATE POLICY "prof_docs_select_own" ON professional_documents FOR SELECT
  USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prof_docs_insert_own" ON professional_documents;
CREATE POLICY "prof_docs_insert_own" ON professional_documents FOR INSERT
  WITH CHECK (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prof_docs_update_own" ON professional_documents;
CREATE POLICY "prof_docs_update_own" ON professional_documents FOR UPDATE
  USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "prof_docs_delete_own" ON professional_documents;
CREATE POLICY "prof_docs_delete_own" ON professional_documents FOR DELETE
  USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- RLS for visit_documents
ALTER TABLE visit_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_docs_select_patient" ON visit_documents;
CREATE POLICY "visit_docs_select_patient" ON visit_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = visit_documents.appointment_id
      AND (a.patient_id = auth.uid() OR a.doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "visit_docs_insert_patient" ON visit_documents;
CREATE POLICY "visit_docs_insert_patient" ON visit_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid())
      OR EXISTS (SELECT 1 FROM appointments a JOIN professionals p ON p.id = a.doctor_id WHERE a.id = appointment_id AND p.auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "visit_docs_delete_own" ON visit_documents;
CREATE POLICY "visit_docs_delete_own" ON visit_documents FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM appointments a JOIN professionals p ON p.id = a.doctor_id WHERE a.id = appointment_id AND p.auth_user_id = auth.uid())
  );

-- RLS for patient_documents
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_docs_select_own" ON patient_documents;
CREATE POLICY "patient_docs_select_own" ON patient_documents FOR SELECT
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM appointments a
      JOIN professionals p ON p.id = a.doctor_id
      WHERE a.patient_id = patient_documents.patient_id
      AND p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "patient_docs_insert_own" ON patient_documents;
CREATE POLICY "patient_docs_insert_own" ON patient_documents FOR INSERT
  WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "patient_docs_update_own" ON patient_documents;
CREATE POLICY "patient_docs_update_own" ON patient_documents FOR UPDATE
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "patient_docs_delete_own" ON patient_documents;
CREATE POLICY "patient_docs_delete_own" ON patient_documents FOR DELETE
  USING (patient_id = auth.uid());

-- Storage bucket: create via node scripts/create-documents-bucket.js (public bucket for document URLs)

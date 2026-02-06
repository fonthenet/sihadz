-- Patient AI Analysis: paid feature for doctors
-- Stores AI-generated clinical analysis and treatment suggestions per appointment.

CREATE TABLE IF NOT EXISTS patient_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  -- Structured input sent to AI (chief complaint, vitals, exam, etc.)
  input_data jsonb NOT NULL DEFAULT '{}',
  -- AI output: differential, suggestions, treatment plan
  analysis_result jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_ai_analyses_appointment ON patient_ai_analyses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_ai_analyses_doctor ON patient_ai_analyses(doctor_id);

-- RLS: doctors can manage their own analyses
ALTER TABLE patient_ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctors_select_own_patient_ai" ON patient_ai_analyses;
CREATE POLICY "doctors_select_own_patient_ai" ON patient_ai_analyses
  FOR SELECT TO authenticated
  USING (
    doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "doctors_insert_own_patient_ai" ON patient_ai_analyses;
CREATE POLICY "doctors_insert_own_patient_ai" ON patient_ai_analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "doctors_update_own_patient_ai" ON patient_ai_analyses;
CREATE POLICY "doctors_update_own_patient_ai" ON patient_ai_analyses
  FOR UPDATE TO authenticated
  USING (
    doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

COMMENT ON TABLE patient_ai_analyses IS 'AI-generated clinical analysis and treatment suggestions for appointments. Paid feature for doctors.';

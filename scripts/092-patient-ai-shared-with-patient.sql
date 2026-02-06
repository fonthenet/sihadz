-- Add shared_with_patient to patient_ai_analyses
-- One AI generation per visit (already enforced by UNIQUE(appointment_id)).
-- Doctor can choose to share or not share the analysis with the patient.

ALTER TABLE patient_ai_analyses ADD COLUMN IF NOT EXISTS shared_with_patient boolean DEFAULT false;

COMMENT ON COLUMN patient_ai_analyses.shared_with_patient IS 'When true, the patient can view this AI analysis on their appointment details.';

-- Allow patients to SELECT their own shared analyses (for realtime)
DROP POLICY IF EXISTS "patients_select_shared_ai" ON patient_ai_analyses;
CREATE POLICY "patients_select_shared_ai" ON patient_ai_analyses
  FOR SELECT TO authenticated
  USING (
    shared_with_patient = true
    AND appointment_id IN (
      SELECT id FROM appointments WHERE patient_id = auth.uid()
    )
  );

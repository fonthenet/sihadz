-- Professional patients: when an appointment/visit is marked completed,
-- add/update the patient in professional_patients with last visit info
-- so the doctor has a permanent "My patients" list with everything they need.

-- Ensure appointments has guest/display columns (trigger reads them)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- ============================================================
-- 1. professional_patients table (one row per professional–patient pair)
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Display cache (for list view; supports guests who have no profile)
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  -- Last completed visit snapshot (what the doc needs for future reference)
  last_visit_date DATE,
  last_visit_time TIME,
  last_visit_type TEXT,
  last_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  last_visit_notes TEXT,
  last_visit_reason TEXT,
  last_visit_fee INTEGER,
  -- Aggregates
  visit_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per professional + registered patient; guests (patient_id NULL) can have multiple rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_patients_prof_patient
  ON professional_patients(professional_id, patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_professional_patients_professional_id ON professional_patients(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_patients_last_visit ON professional_patients(professional_id, last_visit_date DESC NULLS LAST);

COMMENT ON TABLE professional_patients IS 'Per-professional patient list with last visit snapshot; synced when appointments are marked completed.';

-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE professional_patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can manage own patient list" ON professional_patients;
CREATE POLICY "Professionals can manage own patient list" ON professional_patients
  FOR ALL
  USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- 3. Trigger: on appointment status -> completed, upsert professional_patients
-- ============================================================
CREATE OR REPLACE FUNCTION sync_professional_patient_on_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_id UUID;
  v_full_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_pat_id UUID;
  v_fee INTEGER;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_prof_id := COALESCE(NEW.professional_id, NEW.doctor_id);
  IF v_prof_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_pat_id := NEW.patient_id;
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.guest_name), ''),
    (SELECT full_name FROM profiles WHERE id = NEW.patient_id LIMIT 1),
    'Patient'
  );
  v_email := COALESCE(
    NULLIF(TRIM(NEW.guest_email), ''),
    (SELECT email FROM profiles WHERE id = NEW.patient_id LIMIT 1)
  );
  v_phone := COALESCE(
    NULLIF(TRIM(NEW.guest_phone), ''),
    (SELECT phone FROM profiles WHERE id = NEW.patient_id LIMIT 1)
  );
  v_fee := NEW.payment_amount;

  IF v_pat_id IS NOT NULL THEN
    -- Registered patient: upsert on (professional_id, patient_id)
    INSERT INTO professional_patients (
      professional_id, patient_id, full_name, email, phone,
      last_visit_date, last_visit_time, last_visit_type, last_appointment_id,
      last_visit_notes, last_visit_reason, last_visit_fee, visit_count, first_seen_at, updated_at
    )
    VALUES (
      v_prof_id, v_pat_id, v_full_name, v_email, v_phone,
      NEW.appointment_date, NEW.appointment_time, NEW.visit_type, NEW.id,
      NEW.notes, NEW.reason, v_fee, 1, now(), now()
    )
    ON CONFLICT (professional_id, patient_id) WHERE patient_id IS NOT NULL
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = COALESCE(NULLIF(TRIM(EXCLUDED.email), ''), professional_patients.email),
      phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), professional_patients.phone),
      last_visit_date = EXCLUDED.last_visit_date,
      last_visit_time = EXCLUDED.last_visit_time,
      last_visit_type = EXCLUDED.last_visit_type,
      last_appointment_id = EXCLUDED.last_appointment_id,
      last_visit_notes = EXCLUDED.last_visit_notes,
      last_visit_reason = EXCLUDED.last_visit_reason,
      last_visit_fee = EXCLUDED.last_visit_fee,
      visit_count = professional_patients.visit_count + 1,
      updated_at = now();
  ELSE
    -- Guest: insert new row (no unique key for guests)
    INSERT INTO professional_patients (
      professional_id, patient_id, full_name, email, phone,
      last_visit_date, last_visit_time, last_visit_type, last_appointment_id,
      last_visit_notes, last_visit_reason, last_visit_fee, visit_count, first_seen_at, updated_at
    )
    VALUES (
      v_prof_id, NULL, v_full_name, v_email, v_phone,
      NEW.appointment_date, NEW.appointment_time, NEW.visit_type, NEW.id,
      NEW.notes, NEW.reason, v_fee, 1, now(), now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_professional_patient_on_completed ON appointments;
CREATE TRIGGER trigger_sync_professional_patient_on_completed
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_professional_patient_on_completed();

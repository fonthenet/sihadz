-- Backfill professional_patients from existing completed appointments
-- Run this after 048-professional-patients-and-trigger.sql to sync patients
-- from appointments that were already marked completed before the trigger existed.

-- Ensure the table and trigger exist first (run 048 first)
DO $$
DECLARE
  appt RECORD;
  v_prof_id UUID;
  v_full_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_pat_id UUID;
  v_fee INTEGER;
BEGIN
  FOR appt IN 
    SELECT 
      a.id,
      COALESCE(a.professional_id, a.doctor_id) as prof_id,
      a.patient_id,
      a.appointment_date,
      a.appointment_time,
      a.visit_type,
      a.notes,
      a.reason,
      a.payment_amount,
      a.guest_name,
      a.guest_email,
      a.guest_phone
    FROM appointments a
    WHERE a.status = 'completed'
      AND COALESCE(a.professional_id, a.doctor_id) IS NOT NULL
  LOOP
    v_prof_id := appt.prof_id;
    v_pat_id := appt.patient_id;
    
    -- Get display name/email/phone
    v_full_name := COALESCE(
      NULLIF(TRIM(appt.guest_name), ''),
      (SELECT full_name FROM profiles WHERE id = appt.patient_id LIMIT 1),
      'Patient'
    );
    v_email := COALESCE(
      NULLIF(TRIM(appt.guest_email), ''),
      (SELECT email FROM profiles WHERE id = appt.patient_id LIMIT 1)
    );
    v_phone := COALESCE(
      NULLIF(TRIM(appt.guest_phone), ''),
      (SELECT phone FROM profiles WHERE id = appt.patient_id LIMIT 1)
    );
    v_fee := appt.payment_amount;

    IF v_pat_id IS NOT NULL THEN
      -- Registered patient: upsert
      INSERT INTO professional_patients (
        professional_id, patient_id, full_name, email, phone,
        last_visit_date, last_visit_time, last_visit_type, last_appointment_id,
        last_visit_notes, last_visit_reason, last_visit_fee, visit_count, first_seen_at, updated_at
      )
      VALUES (
        v_prof_id, v_pat_id, v_full_name, v_email, v_phone,
        appt.appointment_date, appt.appointment_time, appt.visit_type, appt.id,
        appt.notes, appt.reason, v_fee, 1, now(), now()
      )
      ON CONFLICT (professional_id, patient_id) WHERE patient_id IS NOT NULL
      DO UPDATE SET
        -- Only update if this appointment is newer than the current last_visit_date
        last_visit_date = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN appt.appointment_date 
          ELSE professional_patients.last_visit_date 
        END,
        last_visit_time = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN appt.appointment_time 
          ELSE professional_patients.last_visit_time 
        END,
        last_visit_type = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN appt.visit_type 
          ELSE professional_patients.last_visit_type 
        END,
        last_appointment_id = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN appt.id 
          ELSE professional_patients.last_appointment_id 
        END,
        last_visit_notes = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN appt.notes 
          ELSE professional_patients.last_visit_notes 
        END,
        last_visit_reason = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN appt.reason 
          ELSE professional_patients.last_visit_reason 
        END,
        last_visit_fee = CASE 
          WHEN appt.appointment_date > professional_patients.last_visit_date 
          THEN v_fee 
          ELSE professional_patients.last_visit_fee 
        END,
        visit_count = professional_patients.visit_count + 1,
        updated_at = now();
    ELSE
      -- Guest: insert (may create duplicates, that's ok)
      INSERT INTO professional_patients (
        professional_id, patient_id, full_name, email, phone,
        last_visit_date, last_visit_time, last_visit_type, last_appointment_id,
        last_visit_notes, last_visit_reason, last_visit_fee, visit_count, first_seen_at, updated_at
      )
      VALUES (
        v_prof_id, NULL, v_full_name, v_email, v_phone,
        appt.appointment_date, appt.appointment_time, appt.visit_type, appt.id,
        appt.notes, appt.reason, v_fee, 1, now(), now()
      );
    END IF;
  END LOOP;
END $$;

-- Update visit_count for patients with multiple completed appointments
UPDATE professional_patients pp
SET visit_count = (
  SELECT COUNT(*) 
  FROM appointments a 
  WHERE a.status = 'completed'
    AND COALESCE(a.professional_id, a.doctor_id) = pp.professional_id
    AND (a.patient_id = pp.patient_id OR (pp.patient_id IS NULL AND a.guest_name = pp.full_name))
);

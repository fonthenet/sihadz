-- Add all notification types for notification center (appointments, lab results, cancellations, prescriptions, etc.)
-- Applies to all accounts: old, new, future, pro, patients
-- Run: npm run db:run -- scripts/152-notifications-all-types.sql

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'appointment'::text,
    'appointment_cancelled'::text,
    'appointment_rescheduled'::text,
    'prescription'::text,
    'new_prescription'::text,
    'prescription_sent'::text,
    'payment'::text,
    'review'::text,
    'system'::text,
    'reminder'::text,
    'message'::text,
    'chat'::text,
    'new_lab_request'::text,
    'lab_request_created'::text,
    'lab_results_ready'::text,
    'lab_request_denied'::text,
    'alert'::text
  ]));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS
  'All notification types for notification center: appointments, cancellations, lab results, prescriptions, payments, chat, etc.';

-- Trigger: notify patient and provider when appointment is cancelled (any path: API, dashboard, etc.)
CREATE OR REPLACE FUNCTION notify_appointment_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_provider_name TEXT;
  v_provider_user_id UUID;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    SELECT full_name INTO v_patient_name FROM profiles WHERE id = NEW.patient_id LIMIT 1;
    IF v_patient_name IS NULL THEN v_patient_name := 'Patient'; END IF;

    IF NEW.doctor_id IS NOT NULL THEN
      SELECT business_name, auth_user_id INTO v_provider_name, v_provider_user_id
      FROM professionals WHERE id = NEW.doctor_id LIMIT 1;
      IF v_provider_name IS NULL THEN v_provider_name := 'Provider'; END IF;
    END IF;

    -- Notify patient
    INSERT INTO notifications (user_id, type, title, title_ar, title_fr, message, message_ar, metadata, action_url)
    VALUES (
      NEW.patient_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      'تم إلغاء الموعد',
      'Rendez-vous annulé',
      'Your appointment on ' || COALESCE(NEW.appointment_date::TEXT, '') || ' at ' || COALESCE(NEW.appointment_time::TEXT, '') || ' has been cancelled.',
      'تم إلغاء موعدك في ' || COALESCE(NEW.appointment_date::TEXT, '') || ' الساعة ' || COALESCE(NEW.appointment_time::TEXT, ''),
      jsonb_build_object('appointment_id', NEW.id),
      '/dashboard/appointments'
    );

    -- Notify provider
    IF v_provider_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, title_ar, title_fr, message, message_ar, metadata, action_url)
      VALUES (
        v_provider_user_id,
        'appointment_cancelled',
        'Appointment Cancelled',
        'تم إلغاء الموعد',
        'Rendez-vous annulé',
        'The appointment with ' || v_patient_name || ' on ' || COALESCE(NEW.appointment_date::TEXT, '') || ' at ' || COALESCE(NEW.appointment_time::TEXT, '') || ' has been cancelled.',
        'تم إلغاء الموعد مع ' || v_patient_name || ' في ' || COALESCE(NEW.appointment_date::TEXT, '') || ' الساعة ' || COALESCE(NEW.appointment_time::TEXT, ''),
        jsonb_build_object('appointment_id', NEW.id),
        '/professional/dashboard/appointments'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_appointment_cancelled_notify ON appointments;
CREATE TRIGGER trg_appointment_cancelled_notify
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_cancelled();

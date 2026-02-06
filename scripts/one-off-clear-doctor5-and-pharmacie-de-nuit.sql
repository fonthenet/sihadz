-- =====================================================
-- SAVED FOR LATER USE
-- Clear threads for doctor#5 and prescriptions for Pharmacie de Nuit
-- =====================================================
--
-- What it does:
--   1. Finds the 5th doctor (by professionals.id) and deletes all prescription
--      threads where that doctor is the creator (metadata->>doctor_id or created_by).
--      Unlinks healthcare_tickets and prescription_id from thread metadata first.
--   2. Finds pharmacy "Pharmacie de Nuit" and deletes all prescriptions for that
--      pharmacy; clears related healthcare_tickets and thread metadata.
--
-- How to run later:
--   - Supabase Dashboard → SQL Editor → paste this file → Run
--   - Or use MCP: execute_sql with this script contents
--
-- =====================================================

DO $$
DECLARE
  v_doctor_id UUID;
  v_doctor_auth_id UUID;
  v_pharmacy_id UUID;
  v_thread_ids UUID[];
  v_tid UUID;
  v_prescription_ids UUID[];
  v_pid UUID;
  v_thread RECORD;
  v_deleted_threads INT := 0;
  v_deleted_prescriptions INT := 0;
BEGIN
  -- 1. Find doctor#5: 5th doctor by id (or first doctor if fewer than 5)
  SELECT id, auth_user_id INTO v_doctor_id, v_doctor_auth_id
  FROM (
    SELECT id, auth_user_id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM public.professionals
    WHERE type = 'doctor'
  ) t
  WHERE rn = 5
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RAISE NOTICE 'No "doctor#5" (5th doctor) found. Skipping thread cleanup.';
  ELSE
    RAISE NOTICE 'Doctor#5 id: %, auth_user_id: %', v_doctor_id, v_doctor_auth_id;

    -- Collect thread ids: prescription threads where doctor is this one (metadata->>doctor_id or created_by)
    SELECT ARRAY_AGG(id) INTO v_thread_ids
    FROM public.chat_threads
    WHERE order_type = 'prescription'
      AND (
        (metadata->>'doctor_id')::text = v_doctor_id::text
        OR created_by = v_doctor_auth_id
      );

    IF v_thread_ids IS NOT NULL AND array_length(v_thread_ids, 1) > 0 THEN
      -- Unlink tickets and prescriptions from these threads, then delete threads (CASCADE removes members + messages)
      FOREACH v_tid IN ARRAY v_thread_ids
      LOOP
        UPDATE public.healthcare_tickets
        SET prescription_id = NULL, status = 'cancelled', updated_at = NOW()
        WHERE id = (SELECT ticket_id FROM public.chat_threads WHERE id = v_tid);
        UPDATE public.chat_threads SET metadata = metadata - 'prescription_id' WHERE id = v_tid;
      END LOOP;
      DELETE FROM public.chat_threads WHERE id = ANY(v_thread_ids);
      GET DIAGNOSTICS v_deleted_threads = ROW_COUNT;
      RAISE NOTICE 'Deleted % thread(s) for doctor#5.', v_deleted_threads;
    ELSE
      RAISE NOTICE 'No prescription threads found for doctor#5.';
    END IF;
  END IF;

  -- 2. Find pharmacy "Pharmacie de Nuit"
  SELECT id INTO v_pharmacy_id
  FROM public.professionals
  WHERE type = 'pharmacy'
    AND (business_name ILIKE '%Pharmacie de Nuit%' OR business_name = 'Pharmacie de Nuit')
  LIMIT 1;

  IF v_pharmacy_id IS NULL THEN
    RAISE NOTICE 'No pharmacy named "Pharmacie de Nuit" found.';
    RETURN;
  END IF;

  RAISE NOTICE 'Pharmacie de Nuit id: %', v_pharmacy_id;

  -- 3. Prescriptions for Pharmacie de Nuit: clear tickets, clear thread metadata, delete prescriptions
  SELECT ARRAY_AGG(id) INTO v_prescription_ids
  FROM public.prescriptions
  WHERE pharmacy_id = v_pharmacy_id;

  IF v_prescription_ids IS NOT NULL AND array_length(v_prescription_ids, 1) > 0 THEN
    FOREACH v_pid IN ARRAY v_prescription_ids
    LOOP
      UPDATE public.healthcare_tickets
      SET prescription_id = NULL, status = 'cancelled', updated_at = NOW()
      WHERE prescription_id = v_pid;

      FOR v_thread IN
        SELECT id, metadata FROM public.chat_threads
        WHERE metadata->>'prescription_id' = v_pid::text
      LOOP
        UPDATE public.chat_threads SET metadata = v_thread.metadata - 'prescription_id' WHERE id = v_thread.id;
      END LOOP;

      DELETE FROM public.prescriptions WHERE id = v_pid;
      v_deleted_prescriptions := v_deleted_prescriptions + 1;
    END LOOP;
    RAISE NOTICE 'Deleted % prescription(s) for Pharmacie de Nuit.', v_deleted_prescriptions;
  ELSE
    RAISE NOTICE 'No prescriptions found for Pharmacie de Nuit.';
  END IF;

  RAISE NOTICE 'Done. Doctor#5 threads: % removed. Pharmacie de Nuit prescriptions: % removed.', v_deleted_threads, v_deleted_prescriptions;
END $$;

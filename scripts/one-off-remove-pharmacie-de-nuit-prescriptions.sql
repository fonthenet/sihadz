-- =====================================================
-- One-off: Remove all prescriptions for "Pharmacie de Nuit"
-- Run in Supabase SQL Editor to start fresh.
-- =====================================================

DO $$
DECLARE
  v_pharmacy_id UUID;
  v_prescription_ids UUID[];
  v_pid UUID;
  v_thread RECORD;
BEGIN
  -- 1. Find pharmacy "Pharmacie de Nuit" (exact or contains)
  SELECT id INTO v_pharmacy_id
  FROM public.professionals
  WHERE type = 'pharmacy'
    AND (business_name ILIKE '%Pharmacie de Nuit%' OR business_name = 'Pharmacie de Nuit')
  LIMIT 1;

  IF v_pharmacy_id IS NULL THEN
    RAISE NOTICE 'No pharmacy named "Pharmacie de Nuit" found.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found pharmacy id: %', v_pharmacy_id;

  -- 2. Get all prescription ids for this pharmacy
  SELECT ARRAY_AGG(id) INTO v_prescription_ids
  FROM public.prescriptions
  WHERE pharmacy_id = v_pharmacy_id;

  IF v_prescription_ids IS NULL OR array_length(v_prescription_ids, 1) IS NULL THEN
    RAISE NOTICE 'No prescriptions found for this pharmacy.';
    RETURN;
  END IF;

  RAISE NOTICE 'Prescriptions to remove: %', array_length(v_prescription_ids, 1);

  -- 3. For each prescription: clear tickets, clear thread metadata, then delete
  FOREACH v_pid IN ARRAY v_prescription_ids
  LOOP
    -- Clear healthcare_tickets (prescription_id + status)
    UPDATE public.healthcare_tickets
    SET prescription_id = NULL,
        status = 'cancelled',
        updated_at = NOW()
    WHERE prescription_id = v_pid;

    -- Clear prescription_id from chat_threads metadata
    FOR v_thread IN
      SELECT id, metadata
      FROM public.chat_threads
      WHERE metadata->>'prescription_id' = v_pid::text
    LOOP
      UPDATE public.chat_threads
      SET metadata = v_thread.metadata - 'prescription_id'
      WHERE id = v_thread.id;
    END LOOP;

    -- Delete prescription
    DELETE FROM public.prescriptions WHERE id = v_pid;
  END LOOP;

  RAISE NOTICE 'Done. All Pharmacie de Nuit prescriptions removed.';
END $$;

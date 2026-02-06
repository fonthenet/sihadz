-- Counts + recent appointments (no PII). Single query for run-sql.
SELECT json_build_object(
  'total', (SELECT COUNT(*)::int FROM appointments),
  'recent', COALESCE(
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT id, (patient_id IS NOT NULL) AS has_patient_id, appointment_date, status
      FROM appointments
      ORDER BY created_at DESC NULLS LAST
      LIMIT 15
    ) t),
    '[]'::json
  )
) AS data;

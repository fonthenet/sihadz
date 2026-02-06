-- Full diagnostic: appointments status breakdown, patient_ids, and recent activity
SELECT json_build_object(
  'total_appointments', (SELECT COUNT(*)::int FROM appointments),
  'status_breakdown', (
    SELECT json_object_agg(status, cnt)
    FROM (SELECT status, COUNT(*)::int as cnt FROM appointments GROUP BY status) s
  ),
  'recent_10', (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT 
        id,
        LEFT(patient_id::text, 8) as patient_id_prefix,
        status,
        appointment_date,
        appointment_time,
        created_at,
        doctor_id IS NOT NULL as has_doctor_id
      FROM appointments
      ORDER BY created_at DESC NULLS LAST
      LIMIT 10
    ) t
  ),
  'distinct_patient_ids', (
    SELECT COALESCE(json_agg(LEFT(patient_id::text, 8)), '[]'::json)
    FROM (SELECT DISTINCT patient_id FROM appointments WHERE patient_id IS NOT NULL LIMIT 10) p
  )
) AS diagnostic_data;

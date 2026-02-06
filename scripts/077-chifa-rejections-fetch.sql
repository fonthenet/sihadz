-- Fetch chifa rejections with invoice data via RPC (bypasses PostgREST embed ambiguity
-- when chifa_rejections has multiple FKs to chifa_bordereaux)
CREATE OR REPLACE FUNCTION chifa_fetch_rejections(
  p_pharmacy_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total BIGINT;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM chifa_rejections r
  WHERE r.pharmacy_id = p_pharmacy_id
    AND (p_status IS NULL OR r.status = p_status);

  -- Fetch rejections with invoice as JSON, without embedding bordereau
  SELECT json_build_object(
    'rejections', COALESCE(
      (SELECT json_agg(row_to_json(t))
       FROM (
         SELECT
           r.id,
           r.pharmacy_id,
           r.invoice_id,
           r.bordereau_id,
           r.rejection_date,
           r.rejection_code,
           r.rejection_motif,
           r.rejected_amount,
           r.status,
           r.corrected_invoice_id,
           r.resolution_notes,
           r.resolved_at,
           r.resolved_by,
           r.new_bordereau_id,
           r.created_at,
           r.updated_at,
           json_build_object(
             'id', i.id,
             'invoice_number', i.invoice_number,
             'insured_name', i.insured_name,
             'insured_number', i.insured_number,
             'insurance_type', i.insurance_type,
             'total_chifa', i.total_chifa,
             'grand_total', i.grand_total
           ) AS invoice
         FROM chifa_rejections r
         JOIN chifa_invoices i ON i.id = r.invoice_id
         WHERE r.pharmacy_id = p_pharmacy_id
           AND (p_status IS NULL OR r.status = p_status)
         ORDER BY r.created_at DESC
         LIMIT p_limit
         OFFSET p_offset
       ) t),
      '[]'::json
    ),
    'total', v_total,
    'page', (p_offset / p_limit) + 1,
    'limit', p_limit,
    'total_pages', GREATEST(1, CEIL(v_total::numeric / p_limit)::int)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to service_role and authenticated
GRANT EXECUTE ON FUNCTION chifa_fetch_rejections(UUID, TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION chifa_fetch_rejections(UUID, TEXT, INT, INT) TO authenticated;

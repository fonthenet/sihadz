-- ============================================================================
-- AUDIT LOGS TABLE
-- SOP Reference: Section 15 (Security & Audit)
-- 
-- This table records ALL data access and modifications for compliance,
-- debugging, and security monitoring.
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'ERROR', 'ACCESS_DENIED')),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('ERROR', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- RLS: Only admins can read audit logs, system can write
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert (for client-side logging)
CREATE POLICY "authenticated_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only admins can read audit logs
CREATE POLICY "admin_read_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for all data access and modifications. Required for healthcare compliance.';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: READ, CREATE, UPDATE, DELETE, ERROR, ACCESS_DENIED';
COMMENT ON COLUMN audit_logs.severity IS 'Log level: INFO, WARNING, ERROR, CRITICAL';
COMMENT ON COLUMN audit_logs.details IS 'JSON details about the action (error messages, affected fields, etc.)';

-- ============================================================================
-- HELPER FUNCTION: Get table columns (for schema validation)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::TEXT,
    data_type::TEXT,
    is_nullable::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name
  ORDER BY ordinal_position;
$$;

COMMENT ON FUNCTION get_table_columns IS 'Returns column info for a table. Used for runtime schema validation.';

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

-- Function to check for data integrity issues
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  issue_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check 1: Prescriptions without doctor_id (should never happen)
  RETURN QUERY
  SELECT 
    'prescriptions_missing_doctor'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'CRITICAL' ELSE 'OK' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('prescription_ids', array_agg(id))
  FROM prescriptions
  WHERE doctor_id IS NULL;

  -- Check 2: Appointments without patient_id
  RETURN QUERY
  SELECT 
    'appointments_missing_patient'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('appointment_ids', array_agg(id))
  FROM appointments
  WHERE patient_id IS NULL;

  -- Check 3: Prescriptions with pharmacy_id but no sent_to_pharmacy_at
  RETURN QUERY
  SELECT 
    'prescriptions_pharmacy_not_sent'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('prescription_ids', array_agg(id))
  FROM prescriptions
  WHERE pharmacy_id IS NOT NULL 
    AND sent_to_pharmacy_at IS NULL;

  -- Check 4: Orphaned prescriptions (appointment deleted)
  RETURN QUERY
  SELECT 
    'orphaned_prescriptions'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('prescription_ids', array_agg(p.id))
  FROM prescriptions p
  LEFT JOIN appointments a ON p.appointment_id = a.id
  WHERE p.appointment_id IS NOT NULL 
    AND a.id IS NULL;
END;
$$;

COMMENT ON FUNCTION check_data_integrity IS 'Runs data integrity checks. Call periodically to detect issues.';

-- ============================================================================
-- Employee Management System Schema
-- ============================================================================
-- This migration creates tables for managing employees/staff under professionals
-- with PIN-based authentication and role-based access control.
-- ============================================================================

-- ============================================================================
-- 1. EMPLOYEE ROLES TABLE
-- ============================================================================
-- Stores role definitions with permissions for each professional
-- System roles are created automatically, custom roles can be added

CREATE TABLE IF NOT EXISTS employee_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each professional can only have one role with each name
  UNIQUE(professional_id, name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_employee_roles_professional ON employee_roles(professional_id);

COMMENT ON TABLE employee_roles IS 'Role definitions with permissions for professional employees';
COMMENT ON COLUMN employee_roles.permissions IS 'JSONB with dashboard, actions, and data permission flags';
COMMENT ON COLUMN employee_roles.is_system IS 'True for default roles (Admin, Manager, etc.) that cannot be deleted';

-- ============================================================================
-- 2. PROFESSIONAL EMPLOYEES TABLE
-- ============================================================================
-- Core employee records with PIN-based authentication

CREATE TABLE IF NOT EXISTS professional_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  role_id UUID REFERENCES employee_roles(id) ON DELETE SET NULL,
  
  -- Authentication
  username TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  
  -- Profile
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,
  
  -- Permission overrides (merges with role permissions)
  permissions_override JSONB,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES professionals(id),
  
  -- Username must be unique within each professional's employees
  UNIQUE(professional_id, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_professional_employees_professional ON professional_employees(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_employees_role ON professional_employees(role_id);
CREATE INDEX IF NOT EXISTS idx_professional_employees_active ON professional_employees(professional_id, is_active);

COMMENT ON TABLE professional_employees IS 'Employees/staff belonging to a professional with PIN-based access';
COMMENT ON COLUMN professional_employees.username IS 'Unique username within the practice for login';
COMMENT ON COLUMN professional_employees.pin_hash IS 'Bcrypt hash of the employee PIN (4-6 digits)';
COMMENT ON COLUMN professional_employees.permissions_override IS 'Optional JSONB to override/extend role permissions';

-- ============================================================================
-- 3. EMPLOYEE SCHEDULES TABLE
-- ============================================================================
-- Weekly schedule template for each employee

CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES professional_employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME,
  end_time TIME,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  break_start TIME,
  break_end TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One schedule entry per day per employee
  UNIQUE(employee_id, day_of_week),
  
  -- Validate times
  CHECK (is_day_off OR (start_time IS NOT NULL AND end_time IS NOT NULL)),
  CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time),
  CHECK (break_start IS NULL OR break_end IS NULL OR break_start < break_end)
);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON employee_schedules(employee_id);

COMMENT ON TABLE employee_schedules IS 'Weekly schedule template for employees (day 0 = Sunday)';
COMMENT ON COLUMN employee_schedules.day_of_week IS '0 = Sunday, 1 = Monday, ..., 6 = Saturday';

-- ============================================================================
-- 4. EMPLOYEE SESSIONS TABLE
-- ============================================================================
-- Active sessions for authenticated employees

CREATE TABLE IF NOT EXISTS employee_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES professional_employees(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee ON employee_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_token ON employee_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_expires ON employee_sessions(expires_at);

COMMENT ON TABLE employee_sessions IS 'Active employee login sessions with token-based auth';

-- ============================================================================
-- 5. EMPLOYEE LOGIN ATTEMPTS TABLE (Rate Limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_login_attempts_lookup 
  ON employee_login_attempts(professional_id, username, attempted_at);

COMMENT ON TABLE employee_login_attempts IS 'Login attempt log for rate limiting and security';

-- ============================================================================
-- 6. ADD PRACTICE CODE TO PROFESSIONALS
-- ============================================================================
-- Short code for employees to identify the practice during login

ALTER TABLE professionals 
  ADD COLUMN IF NOT EXISTS practice_code TEXT UNIQUE;

-- Generate practice codes for existing professionals
UPDATE professionals 
SET practice_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 6))
WHERE practice_code IS NULL;

COMMENT ON COLUMN professionals.practice_code IS 'Short unique code for employee login (e.g., ABC123)';

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_login_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS employee_roles_owner ON employee_roles;
DROP POLICY IF EXISTS professional_employees_owner ON professional_employees;
DROP POLICY IF EXISTS employee_schedules_owner ON employee_schedules;
DROP POLICY IF EXISTS employee_sessions_owner ON employee_sessions;

-- Owner can manage their roles
CREATE POLICY employee_roles_owner ON employee_roles
  FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Owner can manage their employees
CREATE POLICY professional_employees_owner ON professional_employees
  FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Owner can manage employee schedules
CREATE POLICY employee_schedules_owner ON employee_schedules
  FOR ALL
  USING (
    employee_id IN (
      SELECT e.id FROM professional_employees e
      JOIN professionals p ON e.professional_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT e.id FROM professional_employees e
      JOIN professionals p ON e.professional_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Owner can view sessions
CREATE POLICY employee_sessions_owner ON employee_sessions
  FOR ALL
  USING (
    employee_id IN (
      SELECT e.id FROM professional_employees e
      JOIN professionals p ON e.professional_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_roles_updated_at ON employee_roles;
CREATE TRIGGER employee_roles_updated_at
  BEFORE UPDATE ON employee_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS professional_employees_updated_at ON professional_employees;
CREATE TRIGGER professional_employees_updated_at
  BEFORE UPDATE ON professional_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS employee_schedules_updated_at ON employee_schedules;
CREATE TRIGGER employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. FUNCTION TO CREATE DEFAULT ROLES FOR A PROFESSIONAL
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_employee_roles(p_professional_id UUID)
RETURNS void AS $$
BEGIN
  -- Admin role (full access)
  INSERT INTO employee_roles (professional_id, name, description, permissions, is_system)
  VALUES (
    p_professional_id,
    'Admin',
    'Full access to all features and settings',
    '{
      "dashboard": {
        "overview": true,
        "patients": true,
        "appointments": true,
        "messages": true,
        "finances": true,
        "analytics": true,
        "settings": true,
        "requests": true,
        "samples": true,
        "results": true,
        "equipment": true,
        "prescriptions": true,
        "orders": true,
        "inventory": true,
        "delivery": true,
        "documents": true,
        "lab_requests": true
      },
      "actions": {
        "create_appointments": true,
        "cancel_appointments": true,
        "view_patient_details": true,
        "create_prescriptions": true,
        "process_orders": true,
        "manage_inventory": true,
        "view_reports": true,
        "manage_employees": true,
        "manage_settings": true
      },
      "data": {
        "view_all_patients": true,
        "view_financial_data": true,
        "export_data": true
      }
    }'::jsonb,
    true
  ) ON CONFLICT (professional_id, name) DO NOTHING;

  -- Manager role
  INSERT INTO employee_roles (professional_id, name, description, permissions, is_system)
  VALUES (
    p_professional_id,
    'Manager',
    'Can manage operations but not settings or employees',
    '{
      "dashboard": {
        "overview": true,
        "patients": true,
        "appointments": true,
        "messages": true,
        "finances": true,
        "analytics": true,
        "settings": false,
        "requests": true,
        "samples": true,
        "results": true,
        "equipment": true,
        "prescriptions": true,
        "orders": true,
        "inventory": true,
        "delivery": true,
        "documents": true,
        "lab_requests": true
      },
      "actions": {
        "create_appointments": true,
        "cancel_appointments": true,
        "view_patient_details": true,
        "create_prescriptions": true,
        "process_orders": true,
        "manage_inventory": true,
        "view_reports": true,
        "manage_employees": false,
        "manage_settings": false
      },
      "data": {
        "view_all_patients": true,
        "view_financial_data": true,
        "export_data": true
      }
    }'::jsonb,
    true
  ) ON CONFLICT (professional_id, name) DO NOTHING;

  -- Receptionist role (front desk: test requests, samples; NO settings)
  INSERT INTO employee_roles (professional_id, name, description, permissions, is_system)
  VALUES (
    p_professional_id,
    'Receptionist',
    'Front desk - appointments, test requests, sample receive; no settings',
    '{
      "dashboard": {
        "overview": true,
        "patients": true,
        "appointments": true,
        "messages": true,
        "finances": false,
        "analytics": false,
        "settings": false,
        "requests": true,
        "samples": true,
        "results": false,
        "equipment": false,
        "prescriptions": true,
        "orders": true,
        "inventory": false,
        "delivery": false,
        "documents": false,
        "lab_requests": true
      },
      "actions": {
        "create_appointments": true,
        "cancel_appointments": true,
        "view_patient_details": true,
        "create_prescriptions": false,
        "process_orders": false,
        "manage_inventory": false,
        "view_reports": false,
        "manage_employees": false,
        "manage_settings": false
      },
      "data": {
        "view_all_patients": true,
        "view_financial_data": false,
        "export_data": false
      }
    }'::jsonb,
    true
  ) ON CONFLICT (professional_id, name) DO NOTHING;

  -- Technician role (for labs/pharmacies)
  INSERT INTO employee_roles (professional_id, name, description, permissions, is_system)
  VALUES (
    p_professional_id,
    'Technician',
    'Lab technician or pharmacy assistant - process orders and tests',
    '{
      "dashboard": {
        "overview": true,
        "patients": false,
        "appointments": false,
        "messages": true,
        "finances": false,
        "analytics": false,
        "settings": false,
        "requests": true,
        "samples": true,
        "results": true,
        "equipment": true,
        "prescriptions": true,
        "orders": true,
        "inventory": true,
        "delivery": false,
        "documents": false,
        "lab_requests": true
      },
      "actions": {
        "create_appointments": false,
        "cancel_appointments": false,
        "view_patient_details": true,
        "create_prescriptions": false,
        "process_orders": true,
        "manage_inventory": true,
        "view_reports": false,
        "manage_employees": false,
        "manage_settings": false
      },
      "data": {
        "view_all_patients": false,
        "view_financial_data": false,
        "export_data": false
      }
    }'::jsonb,
    true
  ) ON CONFLICT (professional_id, name) DO NOTHING;

  -- Assistant role (minimal access)
  INSERT INTO employee_roles (professional_id, name, description, permissions, is_system)
  VALUES (
    p_professional_id,
    'Assistant',
    'Basic access - view only with minimal actions',
    '{
      "dashboard": {
        "overview": true,
        "patients": false,
        "appointments": true,
        "messages": true,
        "finances": false,
        "analytics": false,
        "settings": false,
        "requests": true,
        "samples": false,
        "results": false,
        "equipment": false,
        "prescriptions": false,
        "orders": true,
        "inventory": false,
        "delivery": false,
        "documents": false,
        "lab_requests": false
      },
      "actions": {
        "create_appointments": false,
        "cancel_appointments": false,
        "view_patient_details": false,
        "create_prescriptions": false,
        "process_orders": false,
        "manage_inventory": false,
        "view_reports": false,
        "manage_employees": false,
        "manage_settings": false
      },
      "data": {
        "view_all_patients": false,
        "view_financial_data": false,
        "export_data": false
      }
    }'::jsonb,
    true
  ) ON CONFLICT (professional_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. TRIGGER TO CREATE DEFAULT ROLES ON PROFESSIONAL INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_create_default_roles()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_employee_roles(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS professionals_create_default_roles ON professionals;
CREATE TRIGGER professionals_create_default_roles
  AFTER INSERT ON professionals
  FOR EACH ROW EXECUTE FUNCTION trigger_create_default_roles();

-- ============================================================================
-- 11. CREATE DEFAULT ROLES FOR EXISTING PROFESSIONALS
-- ============================================================================

DO $$
DECLARE
  prof RECORD;
BEGIN
  FOR prof IN SELECT id FROM professionals LOOP
    PERFORM create_default_employee_roles(prof.id);
  END LOOP;
END $$;

-- ============================================================================
-- 12. CLEANUP OLD SESSIONS (Run periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_employee_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM employee_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_employee_sessions IS 'Removes expired employee sessions. Call periodically via cron.';

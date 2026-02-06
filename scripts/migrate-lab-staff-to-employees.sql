-- ============================================================================
-- Migration: Lab Staff to Professional Employees
-- ============================================================================
-- This script migrates existing lab_staff JSONB data to the new 
-- professional_employees table with proper roles and PIN authentication.
--
-- The migration:
-- 1. Creates employees from existing technicians and pathologists
-- 2. Assigns appropriate roles (Technician for techs, Manager for pathologists)
-- 3. Generates temporary PINs (stored in a temp table for admin reference)
-- 4. Preserves original lab_staff data for backward compatibility
-- ============================================================================

-- Create temp table to store generated PINs (for admin review)
CREATE TEMP TABLE IF NOT EXISTS temp_migrated_employees (
  professional_id UUID,
  professional_name TEXT,
  employee_id UUID,
  employee_name TEXT,
  employee_type TEXT,
  username TEXT,
  temp_pin TEXT,
  migrated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to generate a random 4-digit PIN
CREATE OR REPLACE FUNCTION generate_temp_pin() RETURNS TEXT AS $$
DECLARE
  pin TEXT := '';
BEGIN
  FOR i IN 1..4 LOOP
    pin := pin || floor(random() * 10)::int::text;
  END LOOP;
  RETURN pin;
END;
$$ LANGUAGE plpgsql;

-- Migrate technicians
DO $$
DECLARE
  prof RECORD;
  tech RECORD;
  tech_role_id UUID;
  new_emp_id UUID;
  temp_pin TEXT;
  username TEXT;
  counter INT;
BEGIN
  -- Loop through all laboratories with lab_staff
  FOR prof IN 
    SELECT id, business_name, lab_staff
    FROM professionals 
    WHERE type = 'laboratory' 
      AND lab_staff IS NOT NULL 
      AND jsonb_array_length(COALESCE(lab_staff->'technicians', '[]'::jsonb)) > 0
  LOOP
    -- Get the Technician role for this professional
    SELECT id INTO tech_role_id 
    FROM employee_roles 
    WHERE professional_id = prof.id AND name = 'Technician' AND is_active = true
    LIMIT 1;

    -- If role doesn't exist, create default roles first
    IF tech_role_id IS NULL THEN
      PERFORM create_default_employee_roles(prof.id);
      SELECT id INTO tech_role_id 
      FROM employee_roles 
      WHERE professional_id = prof.id AND name = 'Technician' AND is_active = true
      LIMIT 1;
    END IF;

    counter := 1;
    
    -- Loop through technicians
    FOR tech IN SELECT * FROM jsonb_array_elements(prof.lab_staff->'technicians')
    LOOP
      -- Generate unique username
      username := lower(regexp_replace(tech->>'name', '[^a-zA-Z0-9]', '_', 'g'));
      username := left(username, 15) || '_' || counter::text;
      
      -- Check if employee already exists
      IF NOT EXISTS (
        SELECT 1 FROM professional_employees 
        WHERE professional_id = prof.id AND username = username
      ) THEN
        -- Generate temp PIN
        temp_pin := generate_temp_pin();
        
        -- Insert employee
        INSERT INTO professional_employees (
          professional_id,
          role_id,
          username,
          pin_hash,
          display_name,
          phone,
          notes,
          is_active
        ) VALUES (
          prof.id,
          tech_role_id,
          username,
          crypt(temp_pin, gen_salt('bf', 10)),
          COALESCE(tech->>'name', 'Technician ' || counter),
          tech->>'phone',
          'Migrated from lab_staff. Specialization: ' || COALESCE(tech->>'specialization', 'General'),
          true
        ) RETURNING id INTO new_emp_id;

        -- Record migration for admin reference
        INSERT INTO temp_migrated_employees (
          professional_id, professional_name, employee_id, 
          employee_name, employee_type, username, temp_pin
        ) VALUES (
          prof.id, prof.business_name, new_emp_id,
          tech->>'name', 'technician', username, temp_pin
        );

        RAISE NOTICE 'Migrated technician: % (%) -> username: %, PIN: %', 
          tech->>'name', prof.business_name, username, temp_pin;
      END IF;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Migrate pathologists
DO $$
DECLARE
  prof RECORD;
  path RECORD;
  manager_role_id UUID;
  new_emp_id UUID;
  temp_pin TEXT;
  username TEXT;
  counter INT;
BEGIN
  -- Loop through all laboratories with lab_staff
  FOR prof IN 
    SELECT id, business_name, lab_staff
    FROM professionals 
    WHERE type = 'laboratory' 
      AND lab_staff IS NOT NULL 
      AND jsonb_array_length(COALESCE(lab_staff->'pathologists', '[]'::jsonb)) > 0
  LOOP
    -- Get the Manager role for pathologists (they typically supervise)
    SELECT id INTO manager_role_id 
    FROM employee_roles 
    WHERE professional_id = prof.id AND name = 'Manager' AND is_active = true
    LIMIT 1;

    -- If role doesn't exist, create default roles first
    IF manager_role_id IS NULL THEN
      PERFORM create_default_employee_roles(prof.id);
      SELECT id INTO manager_role_id 
      FROM employee_roles 
      WHERE professional_id = prof.id AND name = 'Manager' AND is_active = true
      LIMIT 1;
    END IF;

    counter := 1;
    
    -- Loop through pathologists
    FOR path IN SELECT * FROM jsonb_array_elements(prof.lab_staff->'pathologists')
    LOOP
      -- Generate unique username
      username := 'dr_' || lower(regexp_replace(path->>'name', '[^a-zA-Z0-9]', '_', 'g'));
      username := left(username, 15) || '_' || counter::text;
      
      -- Check if employee already exists
      IF NOT EXISTS (
        SELECT 1 FROM professional_employees 
        WHERE professional_id = prof.id AND username = username
      ) THEN
        -- Generate temp PIN
        temp_pin := generate_temp_pin();
        
        -- Insert employee
        INSERT INTO professional_employees (
          professional_id,
          role_id,
          username,
          pin_hash,
          display_name,
          phone,
          notes,
          is_active
        ) VALUES (
          prof.id,
          manager_role_id,
          username,
          crypt(temp_pin, gen_salt('bf', 10)),
          COALESCE(path->>'name', 'Pathologist ' || counter),
          path->>'phone',
          'Migrated from lab_staff (pathologist). Credentials: ' || COALESCE(path->>'credentials', 'MD'),
          true
        ) RETURNING id INTO new_emp_id;

        -- Record migration for admin reference
        INSERT INTO temp_migrated_employees (
          professional_id, professional_name, employee_id, 
          employee_name, employee_type, username, temp_pin
        ) VALUES (
          prof.id, prof.business_name, new_emp_id,
          path->>'name', 'pathologist', username, temp_pin
        );

        RAISE NOTICE 'Migrated pathologist: % (%) -> username: %, PIN: %', 
          path->>'name', prof.business_name, username, temp_pin;
      END IF;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Show migration summary
SELECT 
  'Migration Summary' as info,
  COUNT(*) FILTER (WHERE employee_type = 'technician') as technicians_migrated,
  COUNT(*) FILTER (WHERE employee_type = 'pathologist') as pathologists_migrated,
  COUNT(*) as total_migrated
FROM temp_migrated_employees;

-- IMPORTANT: Show migrated employees with their temporary PINs
-- Admins should note these and share with staff, then have staff change their PINs
SELECT 
  professional_name as "Practice",
  employee_name as "Employee",
  employee_type as "Type",
  username as "Username",
  temp_pin as "Temporary PIN (share securely!)"
FROM temp_migrated_employees
ORDER BY professional_name, employee_type, employee_name;

-- Cleanup function
DROP FUNCTION IF EXISTS generate_temp_pin();

-- NOTE: The temp table will be automatically dropped when the session ends.
-- To persist the PIN list, run this before disconnecting:
-- CREATE TABLE migrated_employee_pins AS SELECT * FROM temp_migrated_employees;

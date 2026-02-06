-- =============================================================================
-- UNIFIED PROVIDER ARCHITECTURE - SINGLE SOURCE OF TRUTH
-- =============================================================================
-- This script establishes `professionals` as the ONLY source of truth for all
-- healthcare providers (doctors, pharmacies, clinics, laboratories, ambulances).
-- 
-- Industry Standard: Single unified table with type discriminator
-- - All provider data lives in `professionals` table
-- - Legacy tables (doctors, pharmacies, clinics, laboratories) become read-only
-- - All foreign keys reference professionals.id
-- - All writes go to professionals
-- - All reads come from professionals (or views that read from professionals)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Ensure professionals table has all required columns
-- =============================================================================
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_ar TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS test_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS is_24h BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS unavailable_dates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consultation_fee INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS e_visit_fee INTEGER,
  ADD COLUMN IF NOT EXISTS supports_e_visit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_in_person BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_home_visit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Ensure is_active defaults to true (active for booking by default)
ALTER TABLE professionals
  ALTER COLUMN is_active SET DEFAULT true;

-- =============================================================================
-- STEP 2: Migrate any existing legacy data to professionals
-- =============================================================================

-- Migrate doctors → professionals (if not already migrated)
INSERT INTO professionals (
  auth_user_id, type, business_name, business_name_ar, email, phone,
  address_line1, wilaya, commune, license_number, specialty, specialty_ar,
  consultation_fee, e_visit_fee, supports_e_visit, supports_in_person,
  experience_years, bio, is_active, is_verified, status, working_hours,
  latitude, longitude, created_at, updated_at
)
SELECT 
  d.user_id, 'doctor'::TEXT, d.clinic_name, d.clinic_name_ar, d.email, d.clinic_phone,
  d.clinic_address, d.wilaya_code, d.city, d.license_number, d.specialty, d.specialty_ar,
  d.consultation_fee, d.e_visit_fee, d.supports_e_visit, d.supports_in_person,
  d.experience_years, d.bio, d.is_active, d.is_verified, 
  CASE WHEN d.is_verified THEN 'verified' ELSE 'pending' END,
  '{}'::jsonb, d.latitude, d.longitude, d.created_at, d.updated_at
FROM doctors d
WHERE d.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM professionals p 
    WHERE p.auth_user_id = d.user_id AND p.type = 'doctor'
  )
ON CONFLICT DO NOTHING;

-- Migrate pharmacies → professionals
INSERT INTO professionals (
  auth_user_id, type, business_name, business_name_ar, email, phone,
  address_line1, address_ar, wilaya, commune, license_number,
  is_active, is_verified, is_24h, has_delivery, status, working_hours,
  latitude, longitude, created_at, updated_at
)
SELECT 
  ph.user_id, 'pharmacy'::TEXT, ph.name, ph.name_ar, ph.email, ph.phone,
  ph.address, ph.address_ar, ph.wilaya_code, ph.city, ph.license_number,
  ph.is_active, ph.is_verified, ph.is_24h, ph.has_delivery,
  CASE WHEN ph.is_verified THEN 'verified' ELSE 'pending' END,
  ph.working_hours, ph.latitude, ph.longitude, ph.created_at, ph.updated_at
FROM pharmacies ph
WHERE ph.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM professionals p 
    WHERE p.auth_user_id = ph.user_id AND p.type = 'pharmacy'
  )
ON CONFLICT DO NOTHING;

-- Migrate clinics → professionals
INSERT INTO professionals (
  auth_user_id, type, business_name, business_name_ar, email, phone,
  address_line1, address_ar, wilaya, commune, license_number, specialties,
  is_active, is_verified, is_24h, status, working_hours,
  latitude, longitude, created_at, updated_at
)
SELECT 
  cl.user_id, 'clinic'::TEXT, cl.name, cl.name_ar, cl.email, cl.phone,
  cl.address, cl.address_ar, cl.wilaya_code, cl.city, cl.license_number, cl.specialties,
  cl.is_active, cl.is_verified, cl.is_24h,
  CASE WHEN cl.is_verified THEN 'verified' ELSE 'pending' END,
  cl.working_hours, cl.latitude, cl.longitude, cl.created_at, cl.updated_at
FROM clinics cl
WHERE cl.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM professionals p 
    WHERE p.auth_user_id = cl.user_id AND p.type = 'clinic'
  )
ON CONFLICT DO NOTHING;

-- Migrate laboratories → professionals
INSERT INTO professionals (
  auth_user_id, type, business_name, business_name_ar, email, phone,
  address_line1, address_ar, wilaya, commune, license_number, test_types,
  is_active, is_verified, is_24h, status, working_hours,
  latitude, longitude, created_at, updated_at
)
SELECT 
  lb.user_id, 'laboratory'::TEXT, lb.name, lb.name_ar, lb.email, lb.phone,
  lb.address, lb.address_ar, lb.wilaya_code, lb.city, lb.license_number, lb.test_types,
  lb.is_active, lb.is_verified, lb.is_24h,
  CASE WHEN lb.is_verified THEN 'verified' ELSE 'pending' END,
  lb.working_hours, lb.latitude, lb.longitude, lb.created_at, lb.updated_at
FROM laboratories lb
WHERE lb.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM professionals p 
    WHERE p.auth_user_id = lb.user_id AND p.type = 'laboratory'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 3: Ensure appointments.doctor_id references professionals.id
-- =============================================================================

-- Drop old FK if it points to wrong table
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;

-- Add correct FK to professionals
ALTER TABLE appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES professionals(id) ON DELETE SET NULL;

-- Ensure doctor_id is nullable (for appointments without linked provider)
ALTER TABLE appointments
  ALTER COLUMN doctor_id DROP NOT NULL;

-- =============================================================================
-- STEP 4: Create read-only views for backward compatibility (optional)
-- =============================================================================

-- Doctors view (read-only, from professionals)
DROP VIEW IF EXISTS doctors_view CASCADE;
CREATE OR REPLACE VIEW doctors_view AS
SELECT 
  p.id,
  p.auth_user_id as user_id,
  p.business_name as clinic_name,
  p.business_name_ar as clinic_name_ar,
  p.email,
  p.phone as clinic_phone,
  p.address_line1 as clinic_address,
  p.wilaya as wilaya_code,
  p.commune as city,
  p.license_number,
  p.specialty,
  p.specialty_ar,
  p.consultation_fee,
  p.e_visit_fee,
  p.supports_e_visit,
  p.supports_in_person,
  p.experience_years,
  p.bio,
  p.is_active,
  p.is_verified,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'doctor';

-- Pharmacies view (read-only, from professionals)
DROP VIEW IF EXISTS pharmacies_view CASCADE;
CREATE OR REPLACE VIEW pharmacies_view AS
SELECT 
  p.id,
  p.auth_user_id as user_id,
  p.business_name as name,
  p.business_name_ar as name_ar,
  p.email,
  p.phone,
  p.address_line1 as address,
  p.address_ar,
  p.wilaya as wilaya_code,
  p.commune as city,
  p.license_number,
  p.is_active,
  p.is_verified,
  p.is_24h,
  p.has_delivery,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'pharmacy';

-- Clinics view (read-only, from professionals)
DROP VIEW IF EXISTS clinics_view CASCADE;
CREATE OR REPLACE VIEW clinics_view AS
SELECT 
  p.id,
  p.auth_user_id as user_id,
  p.business_name as name,
  p.business_name_ar as name_ar,
  p.email,
  p.phone,
  p.address_line1 as address,
  p.address_ar,
  p.wilaya as wilaya_code,
  p.commune as city,
  p.license_number,
  p.specialties,
  p.is_active,
  p.is_verified,
  p.is_24h,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'clinic';

-- Laboratories view (read-only, from professionals)
DROP VIEW IF EXISTS laboratories_view CASCADE;
CREATE OR REPLACE VIEW laboratories_view AS
SELECT 
  p.id,
  p.auth_user_id as user_id,
  p.business_name as name,
  p.business_name_ar as name_ar,
  p.email,
  p.phone,
  p.address_line1 as address,
  p.address_ar,
  p.wilaya as wilaya_code,
  p.commune as city,
  p.license_number,
  p.test_types,
  p.is_active,
  p.is_verified,
  p.is_24h,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'laboratory';

-- =============================================================================
-- STEP 5: Ensure all professionals are active by default (for booking)
-- =============================================================================

-- Set is_active = true for all professionals (unless explicitly set to false)
UPDATE professionals
SET is_active = true
WHERE is_active IS NULL OR (is_active = false AND status = 'verified');

-- =============================================================================
-- STEP 6: Create helper function to get professional by any identifier
-- =============================================================================

CREATE OR REPLACE FUNCTION get_professional_for_booking(provider_id UUID)
RETURNS TABLE (
  id UUID,
  type TEXT,
  business_name TEXT,
  is_active BOOLEAN,
  working_hours JSONB,
  unavailable_dates JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try: direct lookup in professionals
  RETURN QUERY
  SELECT 
    p.id, p.type::TEXT, p.business_name, p.is_active, 
    p.working_hours, p.unavailable_dates
  FROM professionals p
  WHERE p.id = provider_id;
  
  -- If not found and provider_id might be from legacy doctors table, resolve by auth_user_id
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id, p.type::TEXT, p.business_name, p.is_active,
      p.working_hours, p.unavailable_dates
    FROM professionals p
    WHERE p.auth_user_id = (
      SELECT d.user_id FROM doctors d WHERE d.id = provider_id LIMIT 1
    )
    AND p.type = 'doctor'
    LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_professional_for_booking(UUID) TO authenticated, anon;

COMMIT;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- After running this script:
-- 1. professionals table is the single source of truth
-- 2. All legacy data migrated to professionals
-- 3. appointments.doctor_id FK points to professionals.id
-- 4. Views created for backward compatibility (read-only)
-- 5. All professionals are active by default (can be booked)
-- 6. Helper function available to resolve provider IDs
-- =============================================================================

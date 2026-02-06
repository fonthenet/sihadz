-- =============================================================================
-- UNIFIED PROVIDER ARCHITECTURE - SINGLE SOURCE OF TRUTH (FIXED)
-- =============================================================================
-- This script establishes `professionals` as the ONLY source of truth for all
-- healthcare providers (doctors, pharmacies, clinics, laboratories, ambulances).
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Ensure professionals table has all required columns
-- =============================================================================
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS unavailable_dates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consultation_fee INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS e_visit_fee INTEGER,
  ADD COLUMN IF NOT EXISTS supports_e_visit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_in_person BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_home_visit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS specialty_ar TEXT;

-- Ensure is_active defaults to true (active for booking by default)
ALTER TABLE professionals
  ALTER COLUMN is_active SET DEFAULT true;

-- =============================================================================
-- STEP 2: Migrate any existing legacy data to professionals
-- =============================================================================

-- Migrate doctors → professionals (if not already migrated)
-- Map specialty (singular) to specialties array, and also store as specialty
INSERT INTO professionals (
  auth_user_id, type, business_name, business_name_ar, email, phone,
  address_line1, wilaya, commune, license_number, specialty, specialty_ar,
  consultation_fee, e_visit_fee, supports_e_visit, supports_in_person,
  experience_years, bio, is_active, is_verified, status, working_hours,
  latitude, longitude, created_at, updated_at, specialties
)
SELECT 
  d.user_id, 'doctor'::TEXT, d.clinic_name, d.clinic_name_ar, d.email, d.clinic_phone,
  d.clinic_address, d.wilaya_code, d.city, d.license_number, d.specialty, d.specialty_ar,
  d.consultation_fee, d.e_visit_fee, COALESCE(d.supports_e_visit, false), COALESCE(d.supports_in_person, true),
  d.experience_years, d.bio, COALESCE(d.is_active, true), COALESCE(d.is_verified, false), 
  CASE WHEN COALESCE(d.is_verified, false) THEN 'verified' ELSE 'pending' END,
  COALESCE(d.working_hours, '{}'::jsonb), d.latitude, d.longitude, 
  COALESCE(d.created_at, NOW()), COALESCE(d.updated_at, NOW()),
  CASE WHEN d.specialty IS NOT NULL THEN ARRAY[d.specialty] ELSE ARRAY[]::TEXT[] END
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
  COALESCE(ph.is_active, true), COALESCE(ph.is_verified, false), COALESCE(ph.is_24h, false), 
  COALESCE(ph.has_delivery, false),
  CASE WHEN COALESCE(ph.is_verified, false) THEN 'verified' ELSE 'pending' END,
  COALESCE(ph.working_hours, '{}'::jsonb), ph.latitude, ph.longitude, 
  COALESCE(ph.created_at, NOW()), COALESCE(ph.updated_at, NOW())
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
  cl.address, cl.address_ar, cl.wilaya_code, cl.city, cl.license_number, 
  COALESCE(cl.specialties, ARRAY[]::TEXT[]),
  COALESCE(cl.is_active, true), COALESCE(cl.is_verified, false), COALESCE(cl.is_24h, false),
  CASE WHEN COALESCE(cl.is_verified, false) THEN 'verified' ELSE 'pending' END,
  COALESCE(cl.working_hours, '{}'::jsonb), cl.latitude, cl.longitude, 
  COALESCE(cl.created_at, NOW()), COALESCE(cl.updated_at, NOW())
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
  lb.address, lb.address_ar, lb.wilaya_code, lb.city, lb.license_number, 
  COALESCE(lb.test_types, ARRAY[]::TEXT[]),
  COALESCE(lb.is_active, true), COALESCE(lb.is_verified, false), COALESCE(lb.is_24h, false),
  CASE WHEN COALESCE(lb.is_verified, false) THEN 'verified' ELSE 'pending' END,
  COALESCE(lb.working_hours, '{}'::jsonb), lb.latitude, lb.longitude, 
  COALESCE(lb.created_at, NOW()), COALESCE(lb.updated_at, NOW())
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

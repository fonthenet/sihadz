-- =============================================================================
-- UNIFIED PROFESSIONAL SYSTEM MIGRATION
-- Version: 005
-- Description: Consolidates the healthcare provider system to use `professionals` 
--              as the single source of truth for all service providers.
-- =============================================================================

-- NOTE: The professional_status enum has values: 'pending', 'verified', 'suspended', 'rejected', 'waiting_approval'
-- We'll use 'verified' for approved professionals

-- 1. Add missing columns to professionals table for complete provider data
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS is_24h BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_on_duty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_name_ar TEXT,
ADD COLUMN IF NOT EXISTS address_ar TEXT,
ADD COLUMN IF NOT EXISTS test_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';

-- 2. Update professionals with 'verified' status to have is_verified and is_active set
UPDATE professionals 
SET is_verified = true, is_active = true 
WHERE status = 'verified' AND (is_verified IS NULL OR is_verified = false);

-- 3. Create a view for pharmacies that pulls from professionals
-- This maintains backward compatibility with existing queries
DROP VIEW IF EXISTS pharmacies_view;
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
  p.wilaya as city,
  p.wilaya as wilaya_code,
  p.license_number,
  p.is_active,
  p.is_verified,
  p.is_24h,
  p.is_on_duty,
  p.has_delivery,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'pharmacy' AND (p.status = 'verified' OR p.is_verified = true);

-- 4. Create a view for laboratories that pulls from professionals
DROP VIEW IF EXISTS laboratories_view;
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
  p.wilaya as city,
  p.wilaya as wilaya_code,
  p.license_number,
  p.is_active,
  p.is_verified,
  p.is_24h,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.test_types,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'laboratory' AND (p.status = 'verified' OR p.is_verified = true);

-- 5. Create a view for clinics that pulls from professionals
DROP VIEW IF EXISTS clinics_view;
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
  p.wilaya as city,
  p.wilaya as wilaya_code,
  p.license_number,
  p.is_active,
  p.is_verified,
  p.is_24h,
  p.rating,
  p.review_count,
  p.working_hours,
  p.latitude,
  p.longitude,
  p.specialties,
  p.created_at,
  p.updated_at
FROM professionals p
WHERE p.type = 'clinic' AND (p.status = 'verified' OR p.is_verified = true);

-- 6. Migrate existing data from pharmacies table to professionals (if not already there)
INSERT INTO professionals (
  auth_user_id, business_name, business_name_ar, email, phone, 
  address_line1, address_ar, wilaya, license_number, type,
  status, is_verified, is_active, is_24h, is_on_duty, has_delivery,
  rating, review_count, working_hours, latitude, longitude, created_at
)
SELECT 
  ph.user_id, ph.name, ph.name_ar, ph.email, ph.phone,
  ph.address, ph.address_ar, ph.wilaya_code, ph.license_number, 'pharmacy'::professional_type,
  'verified'::professional_status, ph.is_verified, ph.is_active, ph.is_24h, ph.is_on_duty, ph.has_delivery,
  ph.rating, ph.review_count, ph.working_hours, ph.latitude, ph.longitude, ph.created_at
FROM pharmacies ph
WHERE ph.user_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM professionals p 
  WHERE p.auth_user_id = ph.user_id AND p.type = 'pharmacy'
);

-- 7. Migrate existing data from laboratories table to professionals (if not already there)
INSERT INTO professionals (
  auth_user_id, business_name, business_name_ar, email, phone, 
  address_line1, address_ar, wilaya, license_number, type,
  status, is_verified, is_active, is_24h,
  rating, review_count, working_hours, latitude, longitude, test_types, created_at
)
SELECT 
  lb.user_id, lb.name, lb.name_ar, lb.email, lb.phone,
  lb.address, lb.address_ar, lb.wilaya_code, lb.license_number, 'laboratory'::professional_type,
  'verified'::professional_status, lb.is_verified, lb.is_active, lb.is_24h,
  lb.rating, lb.review_count, lb.working_hours, lb.latitude, lb.longitude, lb.test_types, lb.created_at
FROM laboratories lb
WHERE lb.user_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM professionals p 
  WHERE p.auth_user_id = lb.user_id AND p.type = 'laboratory'
);

-- 8. Migrate existing data from clinics table to professionals (if not already there)
INSERT INTO professionals (
  auth_user_id, business_name, business_name_ar, email, phone, 
  address_line1, address_ar, wilaya, license_number, type,
  status, is_verified, is_active, is_24h,
  rating, review_count, working_hours, latitude, longitude, specialties, created_at
)
SELECT 
  cl.user_id, cl.name, cl.name_ar, cl.email, cl.phone,
  cl.address, cl.address_ar, cl.wilaya_code, cl.license_number, 'clinic'::professional_type,
  'verified'::professional_status, cl.is_verified, cl.is_active, cl.is_24h,
  cl.rating, cl.review_count, cl.working_hours, cl.latitude, cl.longitude, cl.specialties, cl.created_at
FROM clinics cl
WHERE cl.user_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM professionals p 
  WHERE p.auth_user_id = cl.user_id AND p.type = 'clinic'
);

-- 9. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_professionals_type ON professionals(type);
CREATE INDEX IF NOT EXISTS idx_professionals_status ON professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_type_status ON professionals(type, status);
CREATE INDEX IF NOT EXISTS idx_professionals_auth_user_id ON professionals(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_wilaya ON professionals(wilaya);
CREATE INDEX IF NOT EXISTS idx_professionals_is_verified ON professionals(is_verified);
CREATE INDEX IF NOT EXISTS idx_professionals_is_active ON professionals(is_active);

-- 10. Update RLS policies for professionals table
DROP POLICY IF EXISTS "professionals_select_all" ON professionals;
CREATE POLICY "professionals_select_all" ON professionals
  FOR SELECT USING (
    -- Anyone can view verified professionals
    (status = 'verified' OR is_verified = true)
    OR
    -- Users can view their own professional record
    auth_user_id = auth.uid()
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('admin', 'super_admin')
    )
  );

-- 11. Add a helper function to get professional by auth user id
CREATE OR REPLACE FUNCTION get_professional_by_auth_id(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  type professional_type,
  business_name TEXT,
  status professional_status,
  is_verified BOOLEAN,
  is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.type,
    p.business_name,
    p.status,
    p.is_verified,
    p.is_active
  FROM professionals p
  WHERE p.auth_user_id = user_uuid
  LIMIT 1;
END;
$$;

-- 12. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_professional_by_auth_id(UUID) TO authenticated;

-- 13. Add trigger to keep is_verified and is_active in sync with status
CREATE OR REPLACE FUNCTION sync_professional_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    NEW.is_verified := true;
    NEW.is_active := true;
  ELSIF NEW.status = 'rejected' OR NEW.status = 'suspended' THEN
    NEW.is_active := false;
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_professional_status ON professionals;
CREATE TRIGGER trigger_sync_professional_status
  BEFORE UPDATE ON professionals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_professional_status();

COMMIT;

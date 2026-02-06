-- =====================================================
-- FAMILY MEMBERS COMPREHENSIVE SCHEMA
-- Supports: Children, Elderly, Guardians, Vaccinations, Growth Tracking
-- =====================================================

-- =====================================================
-- 1. FAMILY MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', NULL)),
  photo_url TEXT,
  
  -- Relationship
  relationship TEXT NOT NULL CHECK (relationship IN ('child', 'spouse', 'parent', 'sibling', 'grandparent', 'grandchild', 'other')),
  relationship_details TEXT, -- e.g., "Son", "Daughter", "Mother-in-law"
  
  -- Guardianship Status
  is_minor BOOLEAN GENERATED ALWAYS AS (date_of_birth > CURRENT_DATE - INTERVAL '18 years') STORED,
  requires_guardian BOOLEAN DEFAULT false, -- For elderly or incapacitated adults
  
  -- Algeria-Specific
  chifa_number TEXT,
  national_id TEXT,
  
  -- Health Summary (quick access, detailed in separate tables)
  allergies JSONB DEFAULT '[]'::jsonb, -- Array of {name, severity, type}
  chronic_conditions JSONB DEFAULT '[]'::jsonb, -- Array of {name, diagnosed_date, notes}
  current_medications JSONB DEFAULT '[]'::jsonb, -- Array of {name, dosage, frequency}
  
  -- Child-Specific Birth Information
  birth_weight_kg DECIMAL(4,2), -- e.g., 3.45 kg
  gestational_weeks INTEGER, -- e.g., 38, 40
  delivery_type TEXT CHECK (delivery_type IN ('vaginal', 'cesarean', NULL)),
  apgar_score_1min INTEGER CHECK (apgar_score_1min BETWEEN 0 AND 10),
  apgar_score_5min INTEGER CHECK (apgar_score_5min BETWEEN 0 AND 10),
  birth_complications TEXT,
  
  -- Child-Specific Development
  feeding_type TEXT CHECK (feeding_type IN ('breastfed', 'formula', 'mixed', 'solid', NULL)),
  dietary_notes TEXT,
  school_name TEXT,
  school_grade TEXT,
  special_needs TEXT,
  developmental_notes TEXT,
  
  -- Current Measurements (latest)
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,2),
  head_circumference_cm DECIMAL(4,1), -- For infants
  last_measured_at DATE,
  
  -- Elderly-Specific
  mobility_status TEXT CHECK (mobility_status IN ('independent', 'needs_assistance', 'wheelchair', 'bedridden', NULL)),
  cognitive_notes TEXT,
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Family Doctor / Primary Care
  family_doctor_id UUID REFERENCES professionals(id),
  pediatrician_id UUID REFERENCES professionals(id),
  
  -- Notes & Settings
  notes_for_doctor TEXT, -- Parent's notes visible to doctors
  medical_history_notes TEXT,
  family_medical_history JSONB DEFAULT '[]'::jsonb, -- Hereditary conditions
  
  -- Privacy Settings
  profile_visibility TEXT DEFAULT 'full' CHECK (profile_visibility IN ('full', 'essential', 'minimal')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_dob ON family_members(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_family_members_relationship ON family_members(relationship);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_family_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS family_members_updated_at ON family_members;
CREATE TRIGGER family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION update_family_members_updated_at();

-- =====================================================
-- 2. GUARDIANS TABLE
-- Who can manage/book for family members
-- =====================================================

CREATE TABLE IF NOT EXISTS family_member_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Guardian Type
  guardian_type TEXT NOT NULL CHECK (guardian_type IN ('legal_guardian', 'parent', 'caregiver', 'authorized_adult')),
  relationship_to_member TEXT, -- e.g., "Mother", "Uncle", "Nurse"
  
  -- Permissions
  is_primary BOOLEAN DEFAULT false, -- Primary guardian
  can_book_appointments BOOLEAN DEFAULT true,
  can_view_records BOOLEAN DEFAULT true,
  can_edit_profile BOOLEAN DEFAULT false,
  can_receive_notifications BOOLEAN DEFAULT true,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_member_id, guardian_user_id)
);

CREATE INDEX IF NOT EXISTS idx_guardians_family_member ON family_member_guardians(family_member_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user ON family_member_guardians(guardian_user_id);

-- =====================================================
-- 3. DETAILED ALLERGIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS family_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  
  -- Allergy Details
  allergen_name TEXT NOT NULL,
  allergen_name_ar TEXT,
  allergen_type TEXT CHECK (allergen_type IN ('drug', 'food', 'environmental', 'insect', 'latex', 'other')),
  
  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  reaction_description TEXT,
  reaction_description_ar TEXT,
  
  -- Medical Info
  diagnosed_date DATE,
  diagnosed_by UUID REFERENCES professionals(id),
  is_verified BOOLEAN DEFAULT false, -- Verified by doctor
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergies_family_member ON family_allergies(family_member_id);
CREATE INDEX IF NOT EXISTS idx_allergies_severity ON family_allergies(severity);

-- =====================================================
-- 4. GROWTH RECORDS TABLE (for children)
-- =====================================================

CREATE TABLE IF NOT EXISTS family_growth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  
  -- Measurements
  measured_at DATE NOT NULL,
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,2),
  head_circumference_cm DECIMAL(4,1), -- For infants under 2
  
  -- Calculated Values
  bmi DECIMAL(4,1),
  height_percentile INTEGER CHECK (height_percentile BETWEEN 0 AND 100),
  weight_percentile INTEGER CHECK (weight_percentile BETWEEN 0 AND 100),
  bmi_percentile INTEGER CHECK (bmi_percentile BETWEEN 0 AND 100),
  
  -- Context
  measured_by UUID REFERENCES professionals(id),
  measured_at_facility TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_family_member ON family_growth_records(family_member_id);
CREATE INDEX IF NOT EXISTS idx_growth_date ON family_growth_records(measured_at);

-- =====================================================
-- 5. ALTER APPOINTMENTS TABLE
-- Add family_member_id for booking on behalf of family
-- =====================================================

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id);

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS booking_for_name TEXT; -- Display name when family member

COMMENT ON COLUMN appointments.family_member_id IS 'When booking for a family member instead of self';
COMMENT ON COLUMN appointments.booking_for_name IS 'Name of the person the appointment is for (family member or self)';

CREATE INDEX IF NOT EXISTS idx_appointments_family_member ON appointments(family_member_id);

-- =====================================================
-- 6. ALTER PRESCRIPTIONS TABLE
-- Add family_member_id for prescriptions to family members
-- =====================================================

ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id);

COMMENT ON COLUMN prescriptions.family_member_id IS 'When prescription is for a family member';

CREATE INDEX IF NOT EXISTS idx_prescriptions_family_member ON prescriptions(family_member_id);

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_growth_records ENABLE ROW LEVEL SECURITY;

-- Family Members: Owner or Guardian can view
DROP POLICY IF EXISTS "users_manage_own_family" ON family_members;
CREATE POLICY "users_manage_own_family" ON family_members
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() 
    OR id IN (SELECT family_member_id FROM family_member_guardians WHERE guardian_user_id = auth.uid())
  )
  WITH CHECK (user_id = auth.uid());

-- Guardians: Owner can manage, guardian can view
DROP POLICY IF EXISTS "users_manage_guardians" ON family_member_guardians;
CREATE POLICY "users_manage_guardians" ON family_member_guardians
  FOR ALL TO authenticated
  USING (
    guardian_user_id = auth.uid()
    OR family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  );

-- Allergies: Owner or Guardian can view
DROP POLICY IF EXISTS "users_manage_family_allergies" ON family_allergies;
CREATE POLICY "users_manage_family_allergies" ON family_allergies
  FOR ALL TO authenticated
  USING (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians WHERE guardian_user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  );

-- Growth Records: Owner or Guardian can view
DROP POLICY IF EXISTS "users_manage_growth_records" ON family_growth_records;
CREATE POLICY "users_manage_growth_records" ON family_growth_records
  FOR ALL TO authenticated
  USING (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians WHERE guardian_user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  );

-- Doctors can view family members for their appointments
DROP POLICY IF EXISTS "doctors_view_patient_family" ON family_members;
CREATE POLICY "doctors_view_patient_family" ON family_members
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT family_member_id FROM appointments 
      WHERE doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      AND family_member_id IS NOT NULL
    )
  );

-- Update appointments RLS to include family member bookings
DROP POLICY IF EXISTS "patients_view_family_appointments" ON appointments;
CREATE POLICY "patients_view_family_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_view_records = true
    )
  );

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Calculate age in years and months
CREATE OR REPLACE FUNCTION calculate_age_text(dob DATE, lang TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
  years INTEGER;
  months INTEGER;
  result TEXT;
BEGIN
  years := EXTRACT(YEAR FROM age(CURRENT_DATE, dob));
  months := EXTRACT(MONTH FROM age(CURRENT_DATE, dob));
  
  IF years = 0 THEN
    IF lang = 'ar' THEN
      result := months || ' شهر';
    ELSIF lang = 'fr' THEN
      result := months || ' mois';
    ELSE
      result := months || ' month' || CASE WHEN months != 1 THEN 's' ELSE '' END;
    END IF;
  ELSIF years < 3 THEN
    IF lang = 'ar' THEN
      result := years || ' سنة و ' || months || ' شهر';
    ELSIF lang = 'fr' THEN
      result := years || ' an' || CASE WHEN years > 1 THEN 's' ELSE '' END || ' et ' || months || ' mois';
    ELSE
      result := years || ' year' || CASE WHEN years != 1 THEN 's' ELSE '' END || ' ' || months || ' mo';
    END IF;
  ELSE
    IF lang = 'ar' THEN
      result := years || ' سنة';
    ELSIF lang = 'fr' THEN
      result := years || ' ans';
    ELSE
      result := years || ' years';
    END IF;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if family member is infant (under 2)
CREATE OR REPLACE FUNCTION is_infant(dob DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN dob > CURRENT_DATE - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON family_members TO authenticated;
GRANT ALL ON family_member_guardians TO authenticated;
GRANT ALL ON family_allergies TO authenticated;
GRANT ALL ON family_growth_records TO authenticated;

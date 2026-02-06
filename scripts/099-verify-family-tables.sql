-- =====================================================
-- VERIFY AND FIX FAMILY TABLES FOREIGN KEYS
-- =====================================================

-- Check if family_members table exists, if not create it
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', NULL)),
  photo_url TEXT,
  relationship TEXT NOT NULL CHECK (relationship IN ('child', 'spouse', 'parent', 'sibling', 'grandparent', 'grandchild', 'other')),
  relationship_details TEXT,
  is_minor BOOLEAN GENERATED ALWAYS AS (date_of_birth > CURRENT_DATE - INTERVAL '18 years') STORED,
  requires_guardian BOOLEAN DEFAULT false,
  chifa_number TEXT,
  national_id TEXT,
  allergies JSONB DEFAULT '[]'::jsonb,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  current_medications JSONB DEFAULT '[]'::jsonb,
  birth_weight_kg DECIMAL(4,2),
  gestational_weeks INTEGER,
  delivery_type TEXT CHECK (delivery_type IN ('vaginal', 'cesarean', NULL)),
  apgar_score_1min INTEGER CHECK (apgar_score_1min BETWEEN 0 AND 10),
  apgar_score_5min INTEGER CHECK (apgar_score_5min BETWEEN 0 AND 10),
  birth_complications TEXT,
  feeding_type TEXT CHECK (feeding_type IN ('breastfed', 'formula', 'mixed', 'solid', NULL)),
  dietary_notes TEXT,
  school_name TEXT,
  school_grade TEXT,
  special_needs TEXT,
  developmental_notes TEXT,
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,2),
  head_circumference_cm DECIMAL(4,1),
  last_measured_at DATE,
  mobility_status TEXT CHECK (mobility_status IN ('independent', 'needs_assistance', 'wheelchair', 'bedridden', NULL)),
  cognitive_notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  family_doctor_id UUID,
  pediatrician_id UUID,
  notes_for_doctor TEXT,
  medical_history_notes TEXT,
  family_medical_history JSONB DEFAULT '[]'::jsonb,
  profile_visibility TEXT DEFAULT 'full' CHECK (profile_visibility IN ('full', 'essential', 'minimal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Basic policy
DROP POLICY IF EXISTS "users_own_family_members" ON family_members;
CREATE POLICY "users_own_family_members" ON family_members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Now make sure the appointments.family_member_id foreign key is optional
-- If it references a non-existent family_member, the query still works
-- The FK should already be set up correctly as nullable

-- Let's just verify the column exists on appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'family_member_id'
  ) THEN
    ALTER TABLE appointments 
    ADD COLUMN family_member_id UUID REFERENCES family_members(id);
  END IF;
END $$;

-- Also add booking_for_name if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'booking_for_name'
  ) THEN
    ALTER TABLE appointments 
    ADD COLUMN booking_for_name TEXT;
  END IF;
END $$;

-- Create index for family_member_id
CREATE INDEX IF NOT EXISTS idx_appointments_family_member ON appointments(family_member_id);

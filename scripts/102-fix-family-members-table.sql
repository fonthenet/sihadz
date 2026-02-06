-- =====================================================
-- FIX FAMILY_MEMBERS TABLE - Add missing columns and FKs
-- =====================================================

-- Add all missing columns that may not exist
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS full_name_ar TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relationship_details TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS requires_guardian BOOLEAN DEFAULT false;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS chifa_number TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS birth_weight_kg DECIMAL(4,2);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gestational_weeks INTEGER;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS delivery_type TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS apgar_score_1min INTEGER;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS apgar_score_5min INTEGER;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS birth_complications TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS feeding_type TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS dietary_notes TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS school_grade TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS special_needs TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS developmental_notes TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS head_circumference_cm DECIMAL(4,1);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS last_measured_at DATE;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS mobility_status TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS cognitive_notes TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS notes_for_doctor TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS medical_history_notes TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS family_medical_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'full';

-- Add the FK columns without foreign key constraints (to avoid schema cache issues)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS family_doctor_id UUID;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS pediatrician_id UUID;

-- Add indexes for the doctor columns
CREATE INDEX IF NOT EXISTS idx_fm_family_doctor ON family_members(family_doctor_id);
CREATE INDEX IF NOT EXISTS idx_fm_pediatrician ON family_members(pediatrician_id);

-- Try to add FK constraints if they don't exist (may fail if already exists)
DO $$
BEGIN
  -- Try adding FK for family_doctor_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'family_members_family_doctor_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE family_members 
      ADD CONSTRAINT family_members_family_doctor_id_fkey 
      FOREIGN KEY (family_doctor_id) REFERENCES professionals(id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
  
  -- Try adding FK for pediatrician_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'family_members_pediatrician_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE family_members 
      ADD CONSTRAINT family_members_pediatrician_id_fkey 
      FOREIGN KEY (pediatrician_id) REFERENCES professionals(id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Notify PostgREST to reload schema cache (this may not work depending on setup)
NOTIFY pgrst, 'reload schema';

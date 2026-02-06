-- =====================================================
-- VACCINATION RECORDS TABLE (ensure it exists and is linked to family members)
-- =====================================================

-- Check if vaccination_records table exists and has proper structure
DO $$
BEGIN
  -- Create table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaccination_records') THEN
    CREATE TABLE vaccination_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Link to family member OR patient
      family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
      patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      
      -- Vaccine
      vaccine_id UUID REFERENCES vaccines(id),
      vaccine_name TEXT, -- For custom/manual entry
      
      -- Administration details
      administered_date DATE NOT NULL,
      dose_number INTEGER DEFAULT 1,
      lot_number TEXT,
      
      -- Provider info
      administered_by UUID REFERENCES professionals(id),
      administered_by_name TEXT,
      administered_at_facility TEXT,
      
      -- Follow-up
      next_dose_date DATE,
      side_effects TEXT,
      
      -- Verification
      is_verified BOOLEAN DEFAULT false,
      verified_by UUID REFERENCES professionals(id),
      verified_at TIMESTAMPTZ,
      
      -- Documents
      certificate_url TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created vaccination_records table';
  ELSE
    -- Ensure family_member_id column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vaccination_records' AND column_name = 'family_member_id'
    ) THEN
      ALTER TABLE vaccination_records 
      ADD COLUMN family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added family_member_id column to vaccination_records';
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vaccination_records_family_member ON vaccination_records(family_member_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_patient ON vaccination_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_vaccine ON vaccination_records(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_date ON vaccination_records(administered_date);

-- Enable RLS
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "users_manage_own_vaccination_records" ON vaccination_records;
CREATE POLICY "users_manage_own_vaccination_records" ON vaccination_records
  FOR ALL TO authenticated
  USING (
    patient_id = auth.uid()
    OR family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION
      SELECT family_member_id FROM family_member_guardians WHERE guardian_user_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id = auth.uid()
    OR family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  );

-- Doctors can view vaccination records for their patients
DROP POLICY IF EXISTS "doctors_view_patient_vaccinations" ON vaccination_records;
CREATE POLICY "doctors_view_patient_vaccinations" ON vaccination_records
  FOR SELECT TO authenticated
  USING (
    family_member_id IN (
      SELECT family_member_id FROM appointments 
      WHERE doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      AND family_member_id IS NOT NULL
    )
    OR patient_id IN (
      SELECT patient_id FROM appointments 
      WHERE doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- Grant permissions
GRANT ALL ON vaccination_records TO authenticated;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_vaccination_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vaccination_records_updated_at ON vaccination_records;
CREATE TRIGGER vaccination_records_updated_at
  BEFORE UPDATE ON vaccination_records
  FOR EACH ROW EXECUTE FUNCTION update_vaccination_records_updated_at();

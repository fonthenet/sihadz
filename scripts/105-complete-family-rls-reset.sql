-- =====================================================
-- COMPLETE RESET OF ALL FAMILY-RELATED RLS POLICIES
-- This script removes ALL policies and creates minimal working ones
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE RLS TEMPORARILY TO CLEAR EVERYTHING
-- =====================================================

ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_allergies DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_growth_records DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP ALL POLICIES ON FAMILY TABLES
-- =====================================================

-- Drop ALL policies on family_members (exhaustive list)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'family_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON family_members', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on family_member_guardians
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'family_member_guardians'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON family_member_guardians', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on family_allergies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'family_allergies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON family_allergies', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on family_growth_records
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'family_growth_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON family_growth_records', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: RE-ENABLE RLS
-- =====================================================

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_growth_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- Key: NO policy should reference another RLS-protected table
-- =====================================================

-- FAMILY_MEMBERS: Owner-only access (simplest possible)
CREATE POLICY "fm_select" ON family_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "fm_insert" ON family_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fm_update" ON family_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "fm_delete" ON family_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- FAMILY_MEMBER_GUARDIANS: 
-- Problem: We can't reference family_members because it has RLS
-- Solution: Check if user is the guardian OR use a security definer function

-- For now, just allow guardians to see their own guardian records
-- And let the API handle the owner check
CREATE POLICY "fmg_select" ON family_member_guardians FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid());

-- For INSERT/UPDATE/DELETE, we need to verify ownership differently
-- Use a function that bypasses RLS
CREATE OR REPLACE FUNCTION is_family_member_owner(fm_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members 
    WHERE id = fm_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "fmg_insert" ON family_member_guardians FOR INSERT TO authenticated
  WITH CHECK (is_family_member_owner(family_member_id));

CREATE POLICY "fmg_update" ON family_member_guardians FOR UPDATE TO authenticated
  USING (is_family_member_owner(family_member_id))
  WITH CHECK (is_family_member_owner(family_member_id));

CREATE POLICY "fmg_delete" ON family_member_guardians FOR DELETE TO authenticated
  USING (is_family_member_owner(family_member_id));

-- FAMILY_ALLERGIES: Use same pattern
CREATE POLICY "fa_select" ON family_allergies FOR SELECT TO authenticated
  USING (is_family_member_owner(family_member_id));

CREATE POLICY "fa_insert" ON family_allergies FOR INSERT TO authenticated
  WITH CHECK (is_family_member_owner(family_member_id));

CREATE POLICY "fa_update" ON family_allergies FOR UPDATE TO authenticated
  USING (is_family_member_owner(family_member_id))
  WITH CHECK (is_family_member_owner(family_member_id));

CREATE POLICY "fa_delete" ON family_allergies FOR DELETE TO authenticated
  USING (is_family_member_owner(family_member_id));

-- FAMILY_GROWTH_RECORDS: Use same pattern
CREATE POLICY "fgr_select" ON family_growth_records FOR SELECT TO authenticated
  USING (is_family_member_owner(family_member_id));

CREATE POLICY "fgr_insert" ON family_growth_records FOR INSERT TO authenticated
  WITH CHECK (is_family_member_owner(family_member_id));

CREATE POLICY "fgr_update" ON family_growth_records FOR UPDATE TO authenticated
  USING (is_family_member_owner(family_member_id))
  WITH CHECK (is_family_member_owner(family_member_id));

CREATE POLICY "fgr_delete" ON family_growth_records FOR DELETE TO authenticated
  USING (is_family_member_owner(family_member_id));

-- =====================================================
-- STEP 5: FIX OTHER TABLES THAT MIGHT REFERENCE FAMILY
-- =====================================================

-- Drop any recursive policies on prescriptions
DROP POLICY IF EXISTS "patients_view_own_and_family_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "patients_prescriptions" ON prescriptions;

-- Simple patient prescriptions policy
CREATE POLICY "rx_patients_select" ON prescriptions FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Drop any recursive policies on referrals
DROP POLICY IF EXISTS "patients_view_own_and_family_referrals" ON referrals;
DROP POLICY IF EXISTS "patients_referrals" ON referrals;

-- Simple patient referrals policy
CREATE POLICY "ref_patients_select" ON referrals FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Drop any recursive policies on lab_test_requests
DROP POLICY IF EXISTS "patients_view_own_and_family_lab_requests" ON lab_test_requests;
DROP POLICY IF EXISTS "patients_lab_requests" ON lab_test_requests;

-- Simple patient lab requests policy
CREATE POLICY "lab_patients_select" ON lab_test_requests FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- =====================================================
-- STEP 6: HANDLE VACCINATION_RECORDS IF EXISTS
-- =====================================================

DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaccination_records') THEN
    -- Disable and re-enable to clear policies
    ALTER TABLE vaccination_records DISABLE ROW LEVEL SECURITY;
    
    -- Drop all policies
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vaccination_records'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON vaccination_records', pol.policyname);
    END LOOP;
    
    ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
    
    -- Create simple policy using the security definer function
    EXECUTE 'CREATE POLICY "vr_owner" ON vaccination_records FOR ALL TO authenticated
      USING (is_family_member_owner(family_member_id))
      WITH CHECK (is_family_member_owner(family_member_id))';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vaccination_records handling skipped: %', SQLERRM;
END $$;

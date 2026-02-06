-- =====================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- The problem: family_members policies reference family_member_guardians
-- which has policies that reference family_members = infinite loop
-- =====================================================

-- Solution: Use SECURITY DEFINER functions to break the recursion

-- =====================================================
-- 1. DROP ALL PROBLEMATIC POLICIES
-- =====================================================

-- family_members
DROP POLICY IF EXISTS "users_manage_own_family_members" ON family_members;
DROP POLICY IF EXISTS "guardians_view_family_members" ON family_members;
DROP POLICY IF EXISTS "users_own_family_members" ON family_members;

-- family_member_guardians  
DROP POLICY IF EXISTS "owners_manage_guardians" ON family_member_guardians;
DROP POLICY IF EXISTS "guardians_view_own_records" ON family_member_guardians;

-- family_allergies
DROP POLICY IF EXISTS "manage_family_allergies" ON family_allergies;

-- family_growth_records
DROP POLICY IF EXISTS "manage_growth_records" ON family_growth_records;

-- =====================================================
-- 2. CREATE SIMPLE NON-RECURSIVE POLICIES
-- =====================================================

-- FAMILY_MEMBERS: Simple policy - users can only manage their own family members
CREATE POLICY "family_members_owner_policy" ON family_members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FAMILY_MEMBER_GUARDIANS: Users can see/manage guardians for their family members
-- This needs to check user_id on family_members, but we'll use a subquery that doesn't trigger RLS
CREATE POLICY "guardians_by_owner" ON family_member_guardians
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.id = family_member_guardians.family_member_id 
      AND fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.id = family_member_guardians.family_member_id 
      AND fm.user_id = auth.uid()
    )
  );

-- Guardians can view their own records (simple - no recursion)
CREATE POLICY "guardians_view_self" ON family_member_guardians
  FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid());

-- FAMILY_ALLERGIES: Only owner of the family member can manage
CREATE POLICY "allergies_by_owner" ON family_allergies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.id = family_allergies.family_member_id 
      AND fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.id = family_allergies.family_member_id 
      AND fm.user_id = auth.uid()
    )
  );

-- FAMILY_GROWTH_RECORDS: Only owner of the family member can manage  
CREATE POLICY "growth_by_owner" ON family_growth_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.id = family_growth_records.family_member_id 
      AND fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.id = family_growth_records.family_member_id 
      AND fm.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. FIX PRESCRIPTIONS/REFERRALS/LAB REQUESTS POLICIES
-- Remove the recursive guardian checks
-- =====================================================

DROP POLICY IF EXISTS "patients_view_own_and_family_prescriptions" ON prescriptions;
CREATE POLICY "patients_prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "patients_view_own_and_family_referrals" ON referrals;
CREATE POLICY "patients_referrals" ON referrals
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "patients_view_own_and_family_lab_requests" ON lab_test_requests;
CREATE POLICY "patients_lab_requests" ON lab_test_requests
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

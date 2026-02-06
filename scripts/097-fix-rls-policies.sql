-- =====================================================
-- FIX RLS POLICIES - Ensure policies don't break existing queries
-- =====================================================

-- The problem: New policies may conflict with existing ones
-- Solution: Make family member policies permissive (OR with existing)

-- =====================================================
-- 1. FIX PRESCRIPTIONS RLS - Don't break existing queries
-- =====================================================

-- Drop the potentially problematic policy
DROP POLICY IF EXISTS "patients_view_family_prescriptions" ON prescriptions;

-- Recreate as a permissive policy that adds to existing access
-- This allows patients to view prescriptions for themselves OR their family members
CREATE POLICY "patients_view_own_and_family_prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (
    -- Original access: patient can see their own prescriptions
    patient_id = auth.uid()
    -- Extended access: also see prescriptions for family members they own/guard
    OR (
      family_member_id IS NOT NULL 
      AND family_member_id IN (
        SELECT id FROM family_members WHERE user_id = auth.uid()
        UNION ALL
        SELECT family_member_id FROM family_member_guardians 
        WHERE guardian_user_id = auth.uid() AND can_view_records = true
      )
    )
  );

-- =====================================================
-- 2. FIX REFERRALS RLS
-- =====================================================

DROP POLICY IF EXISTS "patients_view_family_referrals" ON referrals;

CREATE POLICY "patients_view_own_and_family_referrals" ON referrals
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR (
      family_member_id IS NOT NULL 
      AND family_member_id IN (
        SELECT id FROM family_members WHERE user_id = auth.uid()
        UNION ALL
        SELECT family_member_id FROM family_member_guardians 
        WHERE guardian_user_id = auth.uid() AND can_view_records = true
      )
    )
  );

-- =====================================================
-- 3. FIX LAB TEST REQUESTS RLS
-- =====================================================

DROP POLICY IF EXISTS "patients_view_family_lab_requests" ON lab_test_requests;

CREATE POLICY "patients_view_own_and_family_lab_requests" ON lab_test_requests
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR (
      family_member_id IS NOT NULL 
      AND family_member_id IN (
        SELECT id FROM family_members WHERE user_id = auth.uid()
        UNION ALL
        SELECT family_member_id FROM family_member_guardians 
        WHERE guardian_user_id = auth.uid() AND can_view_records = true
      )
    )
  );

-- =====================================================
-- 4. ENSURE FAMILY_MEMBERS TABLE HAS PROPER RLS
-- =====================================================

-- Enable RLS if not already
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure it exists
DROP POLICY IF EXISTS "users_manage_own_family_members" ON family_members;
CREATE POLICY "users_manage_own_family_members" ON family_members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow guardians to view family members they guard
DROP POLICY IF EXISTS "guardians_view_family_members" ON family_members;
CREATE POLICY "guardians_view_family_members" ON family_members
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT family_member_id FROM family_member_guardians
      WHERE guardian_user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. ENSURE FAMILY_MEMBER_GUARDIANS TABLE HAS PROPER RLS
-- =====================================================

ALTER TABLE family_member_guardians ENABLE ROW LEVEL SECURITY;

-- Owners can manage guardians
DROP POLICY IF EXISTS "owners_manage_guardians" ON family_member_guardians;
CREATE POLICY "owners_manage_guardians" ON family_member_guardians
  FOR ALL TO authenticated
  USING (
    family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid())
  );

-- Guardians can view their own guardian records
DROP POLICY IF EXISTS "guardians_view_own_records" ON family_member_guardians;
CREATE POLICY "guardians_view_own_records" ON family_member_guardians
  FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid());

-- =====================================================
-- 6. ENSURE FAMILY_ALLERGIES TABLE HAS PROPER RLS
-- =====================================================

ALTER TABLE family_allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manage_family_allergies" ON family_allergies;
CREATE POLICY "manage_family_allergies" ON family_allergies
  FOR ALL TO authenticated
  USING (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION ALL
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_edit_profile = true
    )
  )
  WITH CHECK (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION ALL
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_edit_profile = true
    )
  );

-- =====================================================
-- 7. ENSURE FAMILY_GROWTH_RECORDS TABLE HAS PROPER RLS
-- =====================================================

ALTER TABLE family_growth_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manage_growth_records" ON family_growth_records;
CREATE POLICY "manage_growth_records" ON family_growth_records
  FOR ALL TO authenticated
  USING (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION ALL
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_edit_profile = true
    )
  )
  WITH CHECK (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
      UNION ALL
      SELECT family_member_id FROM family_member_guardians 
      WHERE guardian_user_id = auth.uid() AND can_edit_profile = true
    )
  );

-- =====================================================
-- 8. VERIFY APPOINTMENTS TABLE HAS WORKING RLS
-- =====================================================

-- Check if patient can view their appointments
-- This should already work, but let's ensure the policy exists
DROP POLICY IF EXISTS "patients_view_own_appointments" ON appointments;
CREATE POLICY "patients_view_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

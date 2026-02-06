-- Fix: lab_test_items RLS policies so doctors/patients can read items
-- Run in Supabase SQL Editor if lab test items are not showing

-- Allow SELECT: user can see items if they can see the parent lab_test_request
-- (doctor via professionals, or patient)
DROP POLICY IF EXISTS "lab_test_items_select_via_request" ON lab_test_items;
CREATE POLICY "lab_test_items_select_via_request" ON lab_test_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lab_test_requests r
      WHERE r.id = lab_test_items.request_id
      AND (
        r.patient_id = auth.uid()
        OR r.doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      )
    )
  );

-- Allow INSERT: doctors can add items when creating/editing requests
DROP POLICY IF EXISTS "lab_test_items_insert_doctor" ON lab_test_items;
CREATE POLICY "lab_test_items_insert_doctor" ON lab_test_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_test_requests r
      WHERE r.id = lab_test_items.request_id
      AND r.doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

-- Allow DELETE: doctors can remove items when editing requests
DROP POLICY IF EXISTS "lab_test_items_delete_doctor" ON lab_test_items;
CREATE POLICY "lab_test_items_delete_doctor" ON lab_test_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lab_test_requests r
      WHERE r.id = lab_test_items.request_id
      AND r.doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
  );

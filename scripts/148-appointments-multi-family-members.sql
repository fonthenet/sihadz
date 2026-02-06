-- =====================================================
-- APPOINTMENTS: MULTIPLE FAMILY MEMBERS PER VISIT
-- =====================================================
-- Adds family_member_ids UUID[] to support booking for multiple
-- family members in the same appointment (e.g. parent + 2 children).
-- Keeps family_member_id for backward compatibility (first member).
-- =====================================================

-- Add family_member_ids array column
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS family_member_ids UUID[] DEFAULT NULL;

COMMENT ON COLUMN public.appointments.family_member_ids IS 'Multiple family members for this visit (e.g. parent + children). family_member_id remains first/primary for backward compat.';

-- Backfill: when family_member_id exists but family_member_ids is null, populate it
UPDATE public.appointments
SET family_member_ids = ARRAY[family_member_id]
WHERE family_member_id IS NOT NULL
  AND (family_member_ids IS NULL OR family_member_ids = '{}');

-- Index for querying appointments by family member
CREATE INDEX IF NOT EXISTS idx_appointments_family_member_ids
  ON public.appointments USING GIN (family_member_ids)
  WHERE family_member_ids IS NOT NULL AND array_length(family_member_ids, 1) > 0;

-- Update RLS: allow patients to view appointments where any family_member_ids belongs to them
DROP POLICY IF EXISTS "patients_view_family_appointments" ON appointments;
CREATE POLICY "patients_view_family_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    (family_member_id IS NOT NULL AND family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid()))
    OR
    (family_member_ids IS NOT NULL AND family_member_ids && COALESCE((SELECT array_agg(id) FROM family_members WHERE user_id = auth.uid()), '{}'::uuid[]))
  );

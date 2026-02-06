-- =============================================================================
-- ADD ADMIN UPDATE POLICY FOR PROFESSIONALS
-- Version: 007
-- Description: Allows super_admin users to update any professional record
-- =============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can update any professional" ON professionals;

-- Create policy that allows super_admin to update any professional
CREATE POLICY "Super admins can update any professional"
ON professionals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('super_admin', 'admin')
  )
);

-- Also ensure super admins can select all professionals
DROP POLICY IF EXISTS "Super admins can view all professionals" ON professionals;

CREATE POLICY "Super admins can view all professionals"
ON professionals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('super_admin', 'admin')
  )
);

-- Grant super admins ability to delete professionals if needed
DROP POLICY IF EXISTS "Super admins can delete professionals" ON professionals;

CREATE POLICY "Super admins can delete professionals"
ON professionals
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('super_admin', 'admin')
  )
);

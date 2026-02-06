-- =============================================================================
-- FIX VERIFIED_BY FOREIGN KEY CONSTRAINT
-- Version: 008
-- Description: The verified_by column references profiles table but the 
--              super admin's profile might not exist yet. Make it nullable
--              and allow NULL values, or drop the constraint entirely.
-- =============================================================================

-- Option 1: Drop the foreign key constraint entirely
-- This is the simplest solution since verified_by is just for audit purposes
ALTER TABLE professionals 
DROP CONSTRAINT IF EXISTS professionals_verified_by_fkey;

-- Option 2: Make the column nullable (if it isn't already)
ALTER TABLE professionals 
ALTER COLUMN verified_by DROP NOT NULL;

-- Add a comment to explain this field is for audit only
COMMENT ON COLUMN professionals.verified_by IS 'User ID of admin who verified this professional. For audit purposes only. May be NULL if verified before this field was added.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed verified_by foreign key constraint';
END $$;

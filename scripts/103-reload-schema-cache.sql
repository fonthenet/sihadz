-- Force PostgREST to reload schema cache
-- This is necessary after adding columns/tables

-- Method 1: NOTIFY
NOTIFY pgrst, 'reload schema';

-- Method 2: If using Supabase, the schema reload should happen automatically
-- but sometimes a small DDL change helps trigger it

-- Create a dummy comment to trigger schema reload
COMMENT ON TABLE family_members IS 'Family members with full health tracking - v2';

-- Also comment on the professionals table to ensure FK detection
COMMENT ON TABLE professionals IS 'Healthcare professionals including doctors, pharmacies, labs - v2';

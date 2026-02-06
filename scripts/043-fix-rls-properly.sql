-- Check and fix RLS on professionals table
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'professionals';
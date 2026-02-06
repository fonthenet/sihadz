-- List RLS policies on appointments (SELECT). Run via: npm run db:run -- scripts/diagnose-appointments-rls.sql
SELECT policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'appointments'
ORDER BY policyname;

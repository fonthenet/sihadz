-- Simple test to check database connection
-- Run: node scripts/run-sql.js scripts/038-test-connection.sql

SELECT 'Connection works!' as test, current_database() as database, current_user as user;

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

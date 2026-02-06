-- Check the actual schema of professionals table
-- Run: node scripts/run-sql.js scripts/037-check-schema.sql

-- Show all columns in professionals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'professionals'
ORDER BY ordinal_position;

-- Count rows in professionals
SELECT 'Row count in professionals:' as info, count(*) FROM professionals;

-- Also check if there's data in other tables
SELECT 'Row count in doctors:' as info, count(*) FROM doctors;
SELECT 'Row count in pharmacies:' as info, count(*) FROM pharmacies;
SELECT 'Row count in profiles:' as info, count(*) FROM profiles;

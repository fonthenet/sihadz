-- Update all existing professionals with 'pending' status to 'waiting_approval'
UPDATE professionals 
SET status = 'waiting_approval' 
WHERE status = 'pending';

-- Also fetch professionals that might be in draft/incomplete state
SELECT id, business_name, type, email, status, created_at FROM professionals ORDER BY created_at DESC LIMIT 20;

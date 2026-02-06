-- Add 'waiting_approval' to the professional_status enum
-- This allows professionals to have a status indicating they are pending admin approval

DO $$ 
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'waiting_approval' 
        AND enumtypid = 'professional_status'::regtype
    ) THEN
        -- Add the new enum value
        ALTER TYPE professional_status ADD VALUE 'waiting_approval';
    END IF;
END $$;

COMMIT;

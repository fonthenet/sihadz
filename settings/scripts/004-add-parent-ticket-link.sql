-- Add parent_ticket_id to link child tickets to parent appointment tickets
ALTER TABLE healthcare_tickets
ADD COLUMN IF NOT EXISTS parent_ticket_id UUID REFERENCES healthcare_tickets(id) ON DELETE CASCADE;

-- Add index for faster parent-child queries
CREATE INDEX IF NOT EXISTS idx_tickets_parent ON healthcare_tickets(parent_ticket_id);

COMMIT;

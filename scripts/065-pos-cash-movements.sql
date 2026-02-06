-- POS Cash Movements Table
-- Tracks no-sale, cash-in, cash-out events for audit

-- Create table if not exists
CREATE TABLE IF NOT EXISTS pos_cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('no_sale', 'cash_in', 'cash_out')),
  amount DECIMAL(12, 2) DEFAULT 0,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_pharmacy ON pos_cash_movements(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_session ON pos_cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_type ON pos_cash_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_created ON pos_cash_movements(created_at);

-- Enable RLS
ALTER TABLE pos_cash_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "pos_cash_movements_pharmacy_select" ON pos_cash_movements;
DROP POLICY IF EXISTS "pos_cash_movements_pharmacy_insert" ON pos_cash_movements;

-- RLS Policies
CREATE POLICY "pos_cash_movements_pharmacy_select" ON pos_cash_movements
  FOR SELECT
  USING (
    pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pos_cash_movements_pharmacy_insert" ON pos_cash_movements
  FOR INSERT
  WITH CHECK (
    pharmacy_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Also add void columns to pos_sales if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sales' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE pos_sales ADD COLUMN voided_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sales' AND column_name = 'voided_by'
  ) THEN
    ALTER TABLE pos_sales ADD COLUMN voided_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sales' AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE pos_sales ADD COLUMN void_reason TEXT;
  END IF;
END $$;

-- Add created_by_name to cash movements if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_cash_movements' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE pos_cash_movements ADD COLUMN created_by_name TEXT;
  END IF;
END $$;

SELECT 'pos_cash_movements table created successfully' as result;

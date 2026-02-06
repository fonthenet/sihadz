-- ============================================================================
-- DEPOSIT SYSTEM FOR BOOKING
-- ============================================================================
-- Implements deposit-first booking per SOP:
-- - 300-500 DZD deposit required before provider sees booking
-- - Refund rules: 48h+ = 100%, 24-48h = 50%, <24h = 0%
-- - Provider cancellation = 100% refund always
-- ============================================================================

-- ============================================================================
-- DEPOSITS TABLE (Track deposits separately from wallet transactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Links
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  ticket_id UUID,  -- If using ticket system
  
  -- Deposit info
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'DZD',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'frozen' CHECK (status IN (
    'frozen',     -- Held for upcoming appointment
    'released',   -- Released to platform after completion
    'refunded',   -- Returned to patient wallet
    'forfeited'   -- Patient no-show or late cancellation
  )),
  
  -- Refund details
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_percentage INTEGER DEFAULT 0,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  
  -- Transaction references
  debit_transaction_id UUID,   -- Original wallet debit
  refund_transaction_id UUID,  -- Refund wallet credit (if any)
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_deposits_user ON booking_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_appointment ON booking_deposits(appointment_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON booking_deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON booking_deposits(created_at);

-- ============================================================================
-- DEPOSIT CONFIGURATION (Admin-adjustable deposit amounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposit_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Scope
  provider_type TEXT,  -- NULL = global, or 'doctor', 'clinic', 'laboratory'
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Amounts (SOP default: 300-500 DZD)
  min_amount DECIMAL(10,2) NOT NULL DEFAULT 300,
  max_amount DECIMAL(10,2) NOT NULL DEFAULT 500,
  default_amount DECIMAL(10,2) NOT NULL DEFAULT 400,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Insert default global config
INSERT INTO deposit_configuration (provider_type, min_amount, max_amount, default_amount)
VALUES (NULL, 300, 500, 400)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- REFUND CALCULATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_refund_percentage(
  p_appointment_time TIMESTAMPTZ,
  p_cancel_time TIMESTAMPTZ DEFAULT NOW(),
  p_cancelled_by TEXT DEFAULT 'patient'  -- 'patient', 'provider', 'system'
) RETURNS INTEGER AS $$
DECLARE
  v_hours_until NUMERIC;
BEGIN
  -- Provider cancellation = always 100%
  IF p_cancelled_by = 'provider' THEN
    RETURN 100;
  END IF;
  
  -- System cancellation (e.g., provider unavailable) = 100%
  IF p_cancelled_by = 'system' THEN
    RETURN 100;
  END IF;
  
  -- Calculate hours until appointment
  v_hours_until := EXTRACT(EPOCH FROM (p_appointment_time - p_cancel_time)) / 3600;
  
  -- Apply SOP refund rules
  IF v_hours_until >= 48 THEN
    RETURN 100;  -- 48h+ = 100%
  ELSIF v_hours_until >= 24 THEN
    RETURN 50;   -- 24-48h = 50%
  ELSE
    RETURN 0;    -- <24h = 0%
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCESS DEPOSIT REFUND FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION process_deposit_refund(
  p_deposit_id UUID,
  p_cancelled_by TEXT DEFAULT 'patient',
  p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  refund_amount DECIMAL(10,2),
  refund_percentage INTEGER,
  message TEXT
) AS $$
DECLARE
  v_deposit RECORD;
  v_appointment RECORD;
  v_refund_pct INTEGER;
  v_refund_amt DECIMAL(10,2);
  v_transaction_id UUID;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit FROM booking_deposits WHERE id = p_deposit_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL(10,2), 0, 'Deposit not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_deposit.status != 'frozen' THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL(10,2), 0, 'Deposit is not frozen'::TEXT;
    RETURN;
  END IF;
  
  -- Get appointment
  SELECT * INTO v_appointment FROM appointments WHERE id = v_deposit.appointment_id;
  
  IF NOT FOUND THEN
    -- No appointment = full refund
    v_refund_pct := 100;
  ELSE
    -- Calculate refund based on timing
    v_refund_pct := calculate_refund_percentage(
      v_appointment.appointment_date + v_appointment.appointment_time,
      NOW(),
      p_cancelled_by
    );
  END IF;
  
  v_refund_amt := v_deposit.amount * v_refund_pct / 100;
  
  -- Credit wallet if refund > 0
  IF v_refund_amt > 0 THEN
    -- Update wallet balance
    UPDATE wallets 
    SET balance = balance + v_refund_amt
    WHERE user_id = v_deposit.user_id;
    
    -- Create refund transaction
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, description, reference_type, reference_id, balance_after
    )
    SELECT 
      w.id, 'refund', v_refund_amt,
      CASE 
        WHEN v_refund_pct = 100 THEN 'Full refund - ' || COALESCE(p_reason, 'Cancellation')
        WHEN v_refund_pct = 50 THEN 'Partial refund (50%) - ' || COALESCE(p_reason, 'Late cancellation')
        ELSE 'Refund - ' || COALESCE(p_reason, 'Cancellation')
      END,
      'deposit', p_deposit_id, w.balance
    FROM wallets w
    WHERE w.user_id = v_deposit.user_id
    RETURNING id INTO v_transaction_id;
  END IF;
  
  -- Update deposit status
  UPDATE booking_deposits
  SET 
    status = CASE WHEN v_refund_pct = 0 THEN 'forfeited' ELSE 'refunded' END,
    refund_amount = v_refund_amt,
    refund_percentage = v_refund_pct,
    refund_reason = p_reason,
    refunded_at = NOW(),
    refund_transaction_id = v_transaction_id,
    updated_at = NOW()
  WHERE id = p_deposit_id;
  
  RETURN QUERY SELECT TRUE, v_refund_amt, v_refund_pct, 
    CASE 
      WHEN v_refund_pct = 100 THEN 'Full refund processed'
      WHEN v_refund_pct = 50 THEN 'Partial refund (50%) processed'
      WHEN v_refund_pct = 0 THEN 'No refund - late cancellation'
      ELSE 'Refund processed'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD deposit_id TO APPOINTMENTS (link back to deposit)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'deposit_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN deposit_id UUID REFERENCES booking_deposits(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'deposit_status'
  ) THEN
    ALTER TABLE appointments ADD COLUMN deposit_status TEXT DEFAULT 'pending' 
      CHECK (deposit_status IN ('pending', 'paid', 'refunded', 'forfeited'));
  END IF;
END $$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE booking_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_configuration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deposits_user ON booking_deposits;
CREATE POLICY deposits_user ON booking_deposits
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS deposits_insert ON booking_deposits;
CREATE POLICY deposits_insert ON booking_deposits
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin can do everything
DROP POLICY IF EXISTS deposits_admin ON booking_deposits;
CREATE POLICY deposits_admin ON booking_deposits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Config is read-only for users
DROP POLICY IF EXISTS deposit_config_read ON deposit_configuration;
CREATE POLICY deposit_config_read ON deposit_configuration
  FOR SELECT USING (TRUE);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE booking_deposits IS 'Tracks deposits for booking (SOP: 300-500 DZD)';
COMMENT ON TABLE deposit_configuration IS 'Admin-configurable deposit amounts';
COMMENT ON FUNCTION calculate_refund_percentage IS 'SOP refund rules: 48h+=100%, 24-48h=50%, <24h=0%';
COMMENT ON FUNCTION process_deposit_refund IS 'Process refund and update wallet';

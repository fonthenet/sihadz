-- Create payments table for tracking all payment transactions
-- Supports: Chargily (EDAHABIA, CIB) and Cash payments
-- Version 2: Handles existing table gracefully

-- Drop existing table if needed (comment out if you want to keep data)
DROP TABLE IF EXISTS payments CASCADE;

-- Create fresh payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Amount and currency
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'DZD',
  
  -- Payment method: edahabia, cib, cash
  payment_method VARCHAR(20) NOT NULL,
  
  -- Status: pending, paid, failed, canceled, expired, refunded
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Chargily integration fields
  chargily_checkout_id VARCHAR(100),
  chargily_checkout_url TEXT,
  
  -- Related entities
  appointment_id UUID,
  prescription_id UUID,
  user_id UUID,
  
  -- Customer info (for non-logged-in users)
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_chargily_checkout_id ON payments(chargily_checkout_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create payments
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their pending payments
CREATE POLICY "Users can update own pending payments" ON payments
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Allow anonymous access for webhook updates (using service role key)
CREATE POLICY "Service role full access" ON payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add payment columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- Grant permissions
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payments TO anon;
GRANT ALL ON payments TO service_role;

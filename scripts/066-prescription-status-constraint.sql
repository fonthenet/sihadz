-- Fix prescriptions status CHECK constraint to include pharmacy workflow statuses
-- Run in Supabase SQL Editor
-- Original: active, dispensed, partially_dispensed, expired, cancelled
-- Add: sent, received, processing, ready, picked_up, declined, delivered

ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check CHECK (
  status IN (
    'active', 'dispensed', 'partially_dispensed', 'expired', 'cancelled',
    'sent', 'received', 'processing', 'ready', 'picked_up', 'declined', 'delivered'
  )
);

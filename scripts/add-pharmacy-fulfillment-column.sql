-- Pharmacy fulfillment: per-line status and overrides WITHOUT changing doctor's original prescription.
-- One entry per medication index: status (available | partial | out_of_stock | substituted),
-- optional dispensed_quantity, substitute_name, substitute_dosage, pharmacy_notes.
-- Run in Supabase SQL Editor.

ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS pharmacy_fulfillment JSONB DEFAULT NULL;

COMMENT ON COLUMN prescriptions.pharmacy_fulfillment IS 'Pharmacy-only: per-medication fulfillment (status, qty dispensed, substitute, notes). Original medications array is never modified.';

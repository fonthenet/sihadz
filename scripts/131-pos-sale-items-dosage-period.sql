-- Add dosage and treatment period to POS sale items for medication labeling
-- Pharmacies record these during checkout for patient safety and receipt labels

ALTER TABLE pos_sale_items
  ADD COLUMN IF NOT EXISTS dosage_instructions TEXT,
  ADD COLUMN IF NOT EXISTS treatment_period TEXT;

COMMENT ON COLUMN pos_sale_items.dosage_instructions IS 'How to take: e.g. 1 comprimé 3 fois/jour, 500mg matin et soir';
COMMENT ON COLUMN pos_sale_items.treatment_period IS 'Duration: e.g. 7 jours, 2 semaines, jusqu''à fin';

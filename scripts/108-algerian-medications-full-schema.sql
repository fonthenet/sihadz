-- Full Algerian Medications Database Schema
-- Supports 4,800+ medications from DZ-Pharma-Data

-- Drop existing table to recreate with full schema
DROP TABLE IF EXISTS algerian_medications CASCADE;

-- Create comprehensive medications table
CREATE TABLE algerian_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(255) NOT NULL,
  full_name TEXT,
  dci VARCHAR(500), -- Dénomination Commune Internationale (generic name)
  therapeutic_class VARCHAR(255),
  pharmacological_class VARCHAR(255),
  category VARCHAR(100), -- simplified category for AI queries
  dosage_forms TEXT[], -- tablet, syrup, injection, etc.
  strengths TEXT[], -- 500mg, 1g, etc.
  conditioning TEXT, -- packaging info (B/30, FL/100ML, etc.)
  manufacturer VARCHAR(255),
  manufacturer_address TEXT,
  manufacturer_tel VARCHAR(255),
  manufacturer_web VARCHAR(255),
  country_origin VARCHAR(100),
  cnas_covered BOOLEAN DEFAULT false, -- CNAS/Chifa reimbursement
  requires_prescription BOOLEAN DEFAULT true,
  prescription_list VARCHAR(50), -- Liste I, Liste II, N/D
  reference_price_dzd DECIMAL(10,2), -- tarif de référence
  public_price_dzd DECIMAL(10,2), -- prix public algérien
  price_range VARCHAR(50), -- formatted price string
  registration_number VARCHAR(100), -- numéro d'enregistrement
  dci_code VARCHAR(50), -- DCI code
  pharmnet_link TEXT, -- link to PharmNet page
  notice_link TEXT, -- link to medication notice
  image_url TEXT, -- medication image
  is_marketed BOOLEAN DEFAULT true, -- currently commercialized
  indications TEXT, -- what it's used for
  typical_dosage TEXT, -- typical dosage instructions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE algerian_medications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read medications
CREATE POLICY "Anyone can read medications"
  ON algerian_medications FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for faster searches
CREATE INDEX idx_meds_brand ON algerian_medications(brand_name);
CREATE INDEX idx_meds_dci ON algerian_medications(dci);
CREATE INDEX idx_meds_category ON algerian_medications(category);
CREATE INDEX idx_meds_therapeutic ON algerian_medications(therapeutic_class);
CREATE INDEX idx_meds_pharmacological ON algerian_medications(pharmacological_class);
CREATE INDEX idx_meds_cnas ON algerian_medications(cnas_covered);
CREATE INDEX idx_meds_marketed ON algerian_medications(is_marketed);
CREATE INDEX idx_meds_country ON algerian_medications(country_origin);

-- Full text search index
CREATE INDEX idx_meds_fulltext ON algerian_medications 
  USING GIN (to_tsvector('french', coalesce(brand_name, '') || ' ' || coalesce(dci, '') || ' ' || coalesce(therapeutic_class, '')));

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE algerian_medications IS 'Complete Algerian medication database with 4,800+ medications from DZ-Pharma-Data/PharmNet';

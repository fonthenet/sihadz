-- ============================================================================
-- MULTINATIONAL PHARMA DATABASE - SCHEMA AND SEED
-- Companies, contacts, products for B2B collaboration discovery
-- ============================================================================

-- ============================================================================
-- 1. MULTINATIONAL PHARMA COMPANIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS multinational_pharma_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  website TEXT,
  country TEXT,
  logo_url TEXT,
  description TEXT,
  business_development_url TEXT,
  partnership_contact_url TEXT,
  data_source TEXT NOT NULL DEFAULT 'curated' CHECK (data_source IN ('curated', 'api', 'scraped', 'ai_enriched')),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multinational_pharma_slug ON multinational_pharma_companies(slug);
CREATE INDEX IF NOT EXISTS idx_multinational_pharma_country ON multinational_pharma_companies(country);
CREATE INDEX IF NOT EXISTS idx_multinational_pharma_name ON multinational_pharma_companies(name);

COMMENT ON TABLE multinational_pharma_companies IS 'Multinational pharma companies for B2B collaboration';

-- ============================================================================
-- 2. MULTINATIONAL PHARMA CONTACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS multinational_pharma_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES multinational_pharma_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT CHECK (department IN ('bd', 'legal', 'commercial', 'regulatory', 'other')),
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  data_source TEXT NOT NULL DEFAULT 'curated' CHECK (data_source IN ('curated', 'api', 'scraped', 'ai_enriched')),
  verified_at TIMESTAMPTZ,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multinational_contacts_company ON multinational_pharma_contacts(company_id);

COMMENT ON TABLE multinational_pharma_contacts IS 'Key contacts at multinational pharma companies';

-- ============================================================================
-- 3. MULTINATIONAL PHARMA PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS multinational_pharma_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES multinational_pharma_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_name TEXT,
  generic_name TEXT,
  indication TEXT,
  approval_date DATE,
  source TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('openfda', 'curated', 'api')),
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multinational_products_company ON multinational_pharma_products(company_id);
CREATE INDEX IF NOT EXISTS idx_multinational_products_name ON multinational_pharma_products(name);
CREATE INDEX IF NOT EXISTS idx_multinational_products_approval ON multinational_pharma_products(approval_date) WHERE approval_date IS NOT NULL;

COMMENT ON TABLE multinational_pharma_products IS 'Pharma products by company (from openFDA, curated, or API)';

-- ============================================================================
-- 4. B2B PROPOSALS (links project to company)
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES multinational_pharma_companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responded', 'declined')),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_proposals_project ON b2b_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_b2b_proposals_company ON b2b_proposals(company_id);

COMMENT ON TABLE b2b_proposals IS 'Collaboration proposals from platform projects to multinational companies';

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================
ALTER TABLE multinational_pharma_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE multinational_pharma_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE multinational_pharma_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_proposals ENABLE ROW LEVEL SECURITY;

-- Multinational data: read for professionals; admin can manage
CREATE POLICY multinational_companies_select ON multinational_pharma_companies FOR SELECT USING (true);
CREATE POLICY multinational_companies_admin ON multinational_pharma_companies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

CREATE POLICY multinational_contacts_select ON multinational_pharma_contacts FOR SELECT USING (true);
CREATE POLICY multinational_contacts_admin ON multinational_pharma_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

CREATE POLICY multinational_products_select ON multinational_pharma_products FOR SELECT USING (true);
CREATE POLICY multinational_products_admin ON multinational_pharma_products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

-- Proposals: project members only
CREATE POLICY b2b_proposals_all ON b2b_proposals FOR ALL USING (
  project_id IN (
    SELECT id FROM b2b_projects WHERE owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    UNION
    SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

-- ============================================================================
-- 6. SEED: MAJOR MULTINATIONAL PHARMA COMPANIES
-- ============================================================================
INSERT INTO multinational_pharma_companies (id, name, slug, website, country, description, business_development_url, data_source) VALUES
  ('a1000000-0000-0000-0001-000000000001', 'Johnson & Johnson', 'johnson-johnson', 'https://www.jnj.com', 'USA', 'Global healthcare company with pharmaceuticals, medical devices, and consumer health.', 'https://www.jnj.com/partner-with-us', 'curated'),
  ('a1000000-0000-0000-0001-000000000002', 'Eli Lilly and Company', 'eli-lilly', 'https://www.lilly.com', 'USA', 'Global pharmaceutical company focused on diabetes, oncology, and neuroscience.', 'https://www.lilly.com/partners', 'curated'),
  ('a1000000-0000-0000-0001-000000000003', 'Sanofi', 'sanofi', 'https://www.sanofi.com', 'France', 'Global biopharmaceutical company focused on vaccines, rare diseases, and chronic diseases.', 'https://www.sanofi.com/en/our-science/partnering', 'curated'),
  ('a1000000-0000-0000-0001-000000000004', 'Pfizer', 'pfizer', 'https://www.pfizer.com', 'USA', 'One of the world''s largest pharmaceutical companies.', 'https://www.pfizer.com/partners', 'curated'),
  ('a1000000-0000-0000-0001-000000000005', 'Novartis', 'novartis', 'https://www.novartis.com', 'Switzerland', 'Global medicines company with innovative pharmaceuticals and generics.', 'https://www.novartis.com/our-company/partnering', 'curated'),
  ('a1000000-0000-0000-0001-000000000006', 'Roche', 'roche', 'https://www.roche.com', 'Switzerland', 'Global pioneer in pharmaceuticals and diagnostics.', 'https://www.roche.com/partnering.htm', 'curated'),
  ('a1000000-0000-0000-0001-000000000007', 'Senovac', 'senovac', 'https://www.sinovac.com', 'China', 'Biopharmaceutical company known for vaccines.', 'https://www.sinovac.com', 'curated'),
  ('a1000000-0000-0000-0001-000000000008', '3SBio', '3sbio', 'https://www.3sbio.com', 'China', 'Biopharmaceutical company focused on recombinant pharmaceuticals.', 'https://www.3sbio.com', 'curated'),
  ('a1000000-0000-0000-0001-000000000009', 'AstraZeneca', 'astrazeneca', 'https://www.astrazeneca.com', 'UK', 'Global biopharmaceutical company in oncology, cardiovascular, and respiratory.', 'https://www.astrazeneca.com/our-company/partnering-with-us.html', 'curated'),
  ('a1000000-0000-0000-0001-000000000010', 'Merck', 'merck', 'https://www.merck.com', 'USA', 'Global healthcare company with pharmaceuticals and life science tools.', 'https://www.merck.com/partnering/', 'curated'),
  ('a1000000-0000-0000-0001-000000000011', 'GSK', 'gsk', 'https://www.gsk.com', 'UK', 'Global biopharma company with vaccines and specialty medicines.', 'https://www.gsk.com/en-gb/partners/', 'curated'),
  ('a1000000-0000-0000-0001-000000000012', 'AbbVie', 'abbvie', 'https://www.abbvie.com', 'USA', 'Research-driven biopharmaceutical company.', 'https://www.abbvie.com/partnering/', 'curated'),
  ('a1000000-0000-0000-0001-000000000013', 'Takeda', 'takeda', 'https://www.takeda.com', 'Japan', 'Global values-based pharmaceutical company.', 'https://www.takeda.com/partners/', 'curated'),
  ('a1000000-0000-0000-0001-000000000014', 'Moderna', 'moderna', 'https://www.modernatx.com', 'USA', 'Biotechnology company pioneering mRNA medicines.', 'https://www.modernatx.com/partners', 'curated'),
  ('a1000000-0000-0000-0001-000000000015', 'BioNTech', 'biontech', 'https://www.biontech.com', 'Germany', 'Next-generation immunotherapy company.', 'https://www.biontech.com/partnering', 'curated'),
  ('a1000000-0000-0000-0001-000000000016', 'Bayer', 'bayer', 'https://www.bayer.com', 'Germany', 'Life science company with pharmaceuticals and crops.', 'https://www.bayer.com/en/partnering', 'curated'),
  ('a1000000-0000-0000-0001-000000000017', 'Boehringer Ingelheim', 'boehringer-ingelheim', 'https://www.boehringer-ingelheim.com', 'Germany', 'Research-driven pharmaceutical company.', 'https://www.boehringer-ingelheim.com/partnering', 'curated'),
  ('a1000000-0000-0000-0001-000000000018', 'Amgen', 'amgen', 'https://www.amgen.com', 'USA', 'Biotechnology pioneer in human therapeutics.', 'https://www.amgen.com/partnering/', 'curated'),
  ('a1000000-0000-0000-0001-000000000019', 'Gilead Sciences', 'gilead', 'https://www.gilead.com', 'USA', 'Biopharmaceutical company focused on antiviral and oncology.', 'https://www.gilead.com/partnering', 'curated'),
  ('a1000000-0000-0000-0001-000000000020', 'Teva Pharmaceutical', 'teva', 'https://www.tevapharm.com', 'Israel', 'Global pharmaceutical company and generics leader.', 'https://www.tevapharm.com/partnering/', 'curated')
ON CONFLICT (slug) DO NOTHING;

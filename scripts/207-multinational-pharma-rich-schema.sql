-- ============================================================================
-- RICH PHARMA DATA - Schema extensions for PharmaConnect-style directory
-- ============================================================================

-- Companies: add HQ, ticker, revenue, employees, market cap, focus areas, collaboration opportunities
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS hq TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS ticker TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS revenue TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS employees TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS market_cap TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS founded TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS rd_spend TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS focus_areas TEXT[];
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS collaboration_opportunities TEXT[];
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE multinational_pharma_companies ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- Contacts: expand department, add year_since
ALTER TABLE multinational_pharma_contacts DROP CONSTRAINT IF EXISTS multinational_pharma_contacts_department_check;
ALTER TABLE multinational_pharma_contacts ALTER COLUMN department TYPE TEXT;
ALTER TABLE multinational_pharma_contacts ADD COLUMN IF NOT EXISTS year_since TEXT;

-- Products: add therapeutic_area, sales, growth, status_badge, is_highlighted
ALTER TABLE multinational_pharma_products ADD COLUMN IF NOT EXISTS therapeutic_area TEXT;
ALTER TABLE multinational_pharma_products ADD COLUMN IF NOT EXISTS sales TEXT;
ALTER TABLE multinational_pharma_products ADD COLUMN IF NOT EXISTS growth TEXT;
ALTER TABLE multinational_pharma_products ADD COLUMN IF NOT EXISTS status_badge TEXT;
ALTER TABLE multinational_pharma_products ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT FALSE;

-- Index for search
CREATE INDEX IF NOT EXISTS idx_multinational_pharma_focus ON multinational_pharma_companies USING GIN (focus_areas);
CREATE INDEX IF NOT EXISTS idx_multinational_contacts_name ON multinational_pharma_contacts(name);
CREATE INDEX IF NOT EXISTS idx_multinational_contacts_title ON multinational_pharma_contacts(title);
CREATE INDEX IF NOT EXISTS idx_multinational_products_area ON multinational_pharma_products(therapeutic_area);

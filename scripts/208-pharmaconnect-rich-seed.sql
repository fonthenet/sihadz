-- ============================================================================
-- PHARMACONNECT RICH DATA - J&J, Lilly, Sinovac, 3SBio + worldwide companies
-- ============================================================================

-- Johnson & Johnson
UPDATE multinational_pharma_companies SET
  hq = 'New Brunswick, NJ, USA',
  founded = '1886',
  ticker = 'NYSE: JNJ',
  revenue = '$89B (2024)',
  employees = '~138,000',
  market_cap = '$394B+',
  rd_spend = '$17B/yr',
  short_name = 'J&J',
  accent_color = '#D51920',
  focus_areas = ARRAY['Oncology','Immunology','Neuroscience','MedTech'],
  collaboration_opportunities = ARRAY['Oncology drug development','Immunology biologics','CAR-T cell therapy','Neuroscience R&D','MedTech devices','Clinical trials MENA/Africa','Real-world evidence']
WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Joaquin Duato', 'Chairman & CEO', 'Executive', 'investor-relations@jnj.com', '2022' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Jennifer Taubert', 'EVP, Worldwide Chairman Innovative Medicine', 'Pharma', 'investor-relations@jnj.com', '2018' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Joseph J. Wolk', 'EVP & Chief Financial Officer', 'Finance', 'investor-relations@jnj.com', '2018' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Mathai Mammen', 'EVP, Pharmaceuticals R&D', 'R&D', 'investor-relations@jnj.com', '2022' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Bill Hait', 'VP External Innovation & Global Health', 'BD', 'investor-relations@jnj.com', '2022' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Darzalex', 'daratumumab', 'Oncology', 'Multiple Myeloma', '$11.7B', '+20%', 'Top Seller', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Tremfya', 'guselkumab', 'Immunology', 'Psoriasis, Crohn''s, UC', '$3.7B', '+31%', 'Rising Star', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Erleada', 'apalutamide', 'Oncology', 'Prostate Cancer', '$3B', '+25%', 'Strong Growth', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Carvykti', 'ciltacabtagene', 'Oncology', 'Multiple Myeloma (CAR-T)', '$900M+', '+87%', 'High Growth', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Spravato', 'esketamine', 'Neuroscience', 'Treatment-Resistant Depression', '$1B+', '+60%', 'Fast Growing', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'johnson-johnson';

-- Eli Lilly
UPDATE multinational_pharma_companies SET
  hq = 'Indianapolis, IN, USA',
  founded = '1876',
  ticker = 'NYSE: LLY',
  revenue = '$65.2B (2025)',
  employees = '~43,000',
  market_cap = '$780B+',
  rd_spend = '$11B+/yr',
  short_name = 'Eli Lilly',
  accent_color = '#C8102E',
  focus_areas = ARRAY['Cardiometabolic (GLP-1)','Oncology','Neuroscience','Immunology'],
  collaboration_opportunities = ARRAY['GLP-1 / Incretin therapies','Obesity drug development','Alzheimer''s R&D','Oncology CDK4/6','Oral biologics','Manufacturing partnerships','Clinical trials MENA/Africa']
WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'David A. Ricks', 'Chairman & CEO', 'Executive', 'investor@lilly.com', '2017' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Daniel M. Skovronsky', 'EVP, Chief Scientific & Product Officer', 'R&D', 'investor@lilly.com', '2017' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Jacob Van Naarden', 'EVP, President Lilly Oncology & BD', 'Oncology', 'investor@lilly.com', '2023' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Mounjaro', 'tirzepatide', 'Cardiometabolic', 'Type 2 Diabetes', '$11.5B+', '+100%+', 'Mega Blockbuster', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Zepbound', 'tirzepatide', 'Obesity', 'Weight Management', '$6B+ est', 'Rapid', 'Mega Blockbuster', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Verzenio', 'abemaciclib', 'Oncology', 'HR+/HER2- Breast Cancer', '$4.5B+', '+20%', 'Blockbuster', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Kisunla', 'donanemab', 'Neuroscience', 'Early Alzheimer''s Disease', '$109M Q4', '>50% share', 'New Launch', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'eli-lilly';

-- Sinovac (Senovac)
UPDATE multinational_pharma_companies SET
  hq = 'Beijing, China',
  founded = '1999',
  ticker = 'NASDAQ: SVA',
  revenue = '$429M (TTM)',
  employees = '~3,000',
  market_cap = '$460M',
  short_name = 'Sinovac',
  accent_color = '#0066CC',
  focus_areas = ARRAY['Vaccines','Infectious Disease','Public Health'],
  collaboration_opportunities = ARRAY['Vaccine technology transfer','Manufacturing JV','WHO prequalification','Infectious disease R&D','Pandemic preparedness','Clinical trials Africa/MENA','Cold chain logistics']
WHERE slug = 'senovac';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Weidong Yin', 'President & CEO', 'Executive', 'ir@sinovac.com', '2003' FROM multinational_pharma_companies WHERE slug = 'senovac';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Andrew Y. Yan', 'Chairman of the Board', 'Board', 'ir@sinovac.com', '2025' FROM multinational_pharma_companies WHERE slug = 'senovac';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Nan Wang', 'CFO & VP', 'Finance', 'ir@sinovac.com', '2013' FROM multinational_pharma_companies WHERE slug = 'senovac';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'CoronaVac', 'Inactivated SARS-CoV-2', 'Vaccines', 'COVID-19', '60+ countries', 'Post-pandemic', 'Flagship', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'senovac';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Healive', 'Hep A Vaccine', 'Vaccines', 'Hepatitis A', 'WHO Prequalified', 'Stable', 'Established', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'senovac';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Inlive', 'EV71 Vaccine', 'Vaccines', 'HFMD', 'China market', 'Growing', 'Innovative', true, 'curated' FROM multinational_pharma_companies WHERE slug = 'senovac';

-- 3SBio
UPDATE multinational_pharma_companies SET
  hq = 'Shenyang, Liaoning, China',
  founded = '1993',
  ticker = 'HKEX: 01530',
  revenue = '$1.26B (TTM)',
  employees = '~3,000+',
  market_cap = '$7.1B HKD',
  short_name = '3SBio',
  accent_color = '#00875A',
  focus_areas = ARRAY['Oncology','Nephrology','Auto-immune','Dermatology','Hematology'],
  collaboration_opportunities = ARRAY['Bispecific antibody dev','Biosimilar manufacturing','Oncology mAbs','Nephrology biologics','Auto-immune therapies','CDMO services','Licensing']
WHERE slug = '3sbio';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Dr. Lou Jing', 'Chairman & CEO', 'Executive', 'tomfolinsbee@3sbio.com', '2014' FROM multinational_pharma_companies WHERE slug = '3sbio';

INSERT INTO multinational_pharma_contacts (company_id, name, title, department, email, year_since) SELECT id, 'Tom Folinsbee', 'Director, Corporate Development', 'BD', 'tomfolinsbee@3sbio.com', '2016' FROM multinational_pharma_companies WHERE slug = '3sbio';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'TPIAO', 'Recombinant Human TPO', 'Hematology', 'Thrombocytopenia, ITP', 'Only rhTPO worldwide', 'Stable', 'Flagship', true, 'curated' FROM multinational_pharma_companies WHERE slug = '3sbio';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'Yisaipu', 'TNF Receptor Fusion', 'Auto-immune', 'RA, AS, Psoriasis', '60%+ China share', 'Leader', 'Blockbuster', true, 'curated' FROM multinational_pharma_companies WHERE slug = '3sbio';

INSERT INTO multinational_pharma_products (company_id, name, generic_name, therapeutic_area, indication, sales, growth, status_badge, is_highlighted, source) SELECT id, 'SSGJ-707', 'Bispecific Ab', 'Oncology', 'Cancer — Pfizer Deal', '$1.25B upfront', '$4.8B milestones', 'Pfizer $6B Deal', true, 'curated' FROM multinational_pharma_companies WHERE slug = '3sbio';

-- Sanofi, Pfizer, Novartis, Roche - add rich metadata
UPDATE multinational_pharma_companies SET
  hq = 'Paris, France',
  founded = '2004',
  ticker = 'EPA: SAN',
  short_name = 'Sanofi',
  accent_color = '#0072BC',
  focus_areas = ARRAY['Vaccines','Rare Diseases','Immunology','Diabetes']
WHERE slug = 'sanofi';

UPDATE multinational_pharma_companies SET
  hq = 'New York, NY, USA',
  founded = '1849',
  ticker = 'NYSE: PFE',
  short_name = 'Pfizer',
  accent_color = '#0093D0',
  focus_areas = ARRAY['Oncology','Internal Medicine','Vaccines','Rare Disease']
WHERE slug = 'pfizer';

UPDATE multinational_pharma_companies SET
  hq = 'Basel, Switzerland',
  founded = '1996',
  ticker = 'NYSE: NVS',
  short_name = 'Novartis',
  accent_color = '#EB6909',
  focus_areas = ARRAY['Oncology','Immunology','Neuroscience','Cardiovascular']
WHERE slug = 'novartis';

UPDATE multinational_pharma_companies SET
  hq = 'Basel, Switzerland',
  founded = '1896',
  ticker = 'SWX: ROG',
  short_name = 'Roche',
  accent_color = '#D32F2F',
  focus_areas = ARRAY['Oncology','Neurology','Infectious','Ophthalmology']
WHERE slug = 'roche';

-- Add short_name and accent_color for remaining companies
UPDATE multinational_pharma_companies SET short_name = 'AstraZeneca', accent_color = '#00A8E0', focus_areas = '{"Oncology","Cardiovascular","Respiratory"}' WHERE slug = 'astrazeneca';
UPDATE multinational_pharma_companies SET short_name = 'AbbVie', accent_color = '#071D49', focus_areas = '{"Immunology","Oncology","Neuroscience"}' WHERE slug = 'abbvie';
UPDATE multinational_pharma_companies SET short_name = 'Takeda', accent_color = '#E4002B', focus_areas = '{"Gastroenterology","Oncology","Neuroscience"}' WHERE slug = 'takeda';
UPDATE multinational_pharma_companies SET short_name = 'Moderna', accent_color = '#0072CE', focus_areas = '{"mRNA","Infectious Disease","Oncology"}' WHERE slug = 'moderna';
UPDATE multinational_pharma_companies SET short_name = 'BioNTech', accent_color = '#00A8E0', focus_areas = '{"mRNA","Oncology","Infectious Disease"}' WHERE slug = 'biontech';
UPDATE multinational_pharma_companies SET short_name = 'Bayer', accent_color = '#1B9E77', focus_areas = '{"Pharma","Crop Science","Consumer Health"}' WHERE slug = 'bayer';
UPDATE multinational_pharma_companies SET short_name = 'Merck', accent_color = '#0072CE', focus_areas = '{"Oncology","Vaccines","Infectious Disease"}' WHERE slug = 'merck';
UPDATE multinational_pharma_companies SET short_name = 'GSK', accent_color = '#F36633', focus_areas = '{"Vaccines","Respiratory","HIV"}' WHERE slug = 'gsk';
UPDATE multinational_pharma_companies SET short_name = 'Boehringer', accent_color = '#0A3D62', focus_areas = '{"Respiratory","Cardiovascular","Immunology"}' WHERE slug = 'boehringer-ingelheim';
UPDATE multinational_pharma_companies SET short_name = 'Amgen', accent_color = '#0072CE', focus_areas = '{"Oncology","Bone","Cardiovascular"}' WHERE slug = 'amgen';
UPDATE multinational_pharma_companies SET short_name = 'Gilead', accent_color = '#00A651', focus_areas = '{"Oncology","Antiviral","Inflammation"}' WHERE slug = 'gilead';
UPDATE multinational_pharma_companies SET short_name = 'Teva', accent_color = '#00A8E0', focus_areas = '{"Generics","Specialty","Biosimilars"}' WHERE slug = 'teva';

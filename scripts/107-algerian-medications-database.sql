-- Algerian Medications Database
-- Comprehensive list of medications available in the Algerian market

-- Create medications table
CREATE TABLE IF NOT EXISTS algerian_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(255) NOT NULL,
  brand_name_ar VARCHAR(255),
  dci VARCHAR(255) NOT NULL, -- Dénomination Commune Internationale (generic name)
  dci_ar VARCHAR(255),
  therapeutic_class VARCHAR(255),
  therapeutic_class_ar VARCHAR(255),
  dosage_forms TEXT[], -- tablet, syrup, injection, etc.
  strengths TEXT[], -- 500mg, 1g, etc.
  manufacturer VARCHAR(255),
  country_origin VARCHAR(100),
  cnas_covered BOOLEAN DEFAULT false, -- CNAS/Chifa reimbursement
  requires_prescription BOOLEAN DEFAULT true,
  category VARCHAR(100), -- antibiotics, analgesics, etc.
  indications TEXT,
  indications_ar TEXT,
  contraindications TEXT,
  common_side_effects TEXT,
  typical_dosage TEXT,
  typical_dosage_ar TEXT,
  price_range VARCHAR(50), -- approximate price in DZD
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE algerian_medications ENABLE ROW LEVEL SECURITY;

-- Everyone can read medications
CREATE POLICY "Anyone can read medications"
  ON algerian_medications FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_medications_brand ON algerian_medications(brand_name);
CREATE INDEX IF NOT EXISTS idx_medications_dci ON algerian_medications(dci);
CREATE INDEX IF NOT EXISTS idx_medications_category ON algerian_medications(category);

-- Seed with common Algerian market medications

-- ========== ANALGESICS & ANTIPYRETICS ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Doliprane', 'Paracétamol', 'Analgésique/Antipyrétique', ARRAY['comprimé', 'sirop', 'suppositoire'], ARRAY['500mg', '1000mg', '100mg/ml'], 'Sanofi', 'France', true, false, 'analgesics', 'Douleur, fièvre', '500-1000mg toutes les 4-6h, max 4g/jour', '150-300 DZD'),
('Efferalgan', 'Paracétamol', 'Analgésique/Antipyrétique', ARRAY['comprimé effervescent', 'sirop'], ARRAY['500mg', '1000mg'], 'UPSA', 'France', true, false, 'analgesics', 'Douleur, fièvre', '500-1000mg toutes les 4-6h', '200-350 DZD'),
('Dafalgan', 'Paracétamol', 'Analgésique/Antipyrétique', ARRAY['comprimé', 'gélule'], ARRAY['500mg', '1000mg'], 'UPSA', 'France', true, false, 'analgesics', 'Douleur légère à modérée, fièvre', '500-1000mg toutes les 4-6h', '180-320 DZD'),
('Algocalmin', 'Paracétamol', 'Analgésique/Antipyrétique', ARRAY['comprimé'], ARRAY['500mg'], 'Saidal', 'Algérie', true, false, 'analgesics', 'Douleur, fièvre', '500-1000mg toutes les 4-6h', '80-150 DZD'),
('Paralgan', 'Paracétamol', 'Analgésique/Antipyrétique', ARRAY['comprimé', 'sirop'], ARRAY['500mg', '1000mg'], 'Biopharm', 'Algérie', true, false, 'analgesics', 'Douleur, fièvre', '500-1000mg toutes les 4-6h', '100-180 DZD');

-- ========== NSAIDs ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Nurofen', 'Ibuprofène', 'Anti-inflammatoire non stéroïdien', ARRAY['comprimé', 'sirop'], ARRAY['200mg', '400mg'], 'Reckitt', 'UK', true, false, 'nsaids', 'Douleur, inflammation, fièvre', '200-400mg toutes les 6-8h', '250-400 DZD'),
('Brufen', 'Ibuprofène', 'Anti-inflammatoire non stéroïdien', ARRAY['comprimé', 'sirop'], ARRAY['200mg', '400mg', '600mg'], 'Abbott', 'France', true, true, 'nsaids', 'Douleur, inflammation', '400-600mg 3x/jour', '300-500 DZD'),
('Voltarène', 'Diclofénac', 'Anti-inflammatoire non stéroïdien', ARRAY['comprimé', 'gel', 'injection'], ARRAY['25mg', '50mg', '75mg'], 'Novartis', 'Suisse', true, true, 'nsaids', 'Douleur articulaire, inflammation', '50mg 2-3x/jour', '350-600 DZD'),
('Cataflam', 'Diclofénac potassique', 'Anti-inflammatoire non stéroïdien', ARRAY['comprimé'], ARRAY['50mg'], 'Novartis', 'Suisse', true, true, 'nsaids', 'Douleur aiguë, dysménorrhée', '50mg 3x/jour', '400-550 DZD'),
('Ketoprofene', 'Kétoprofène', 'Anti-inflammatoire non stéroïdien', ARRAY['comprimé', 'gel'], ARRAY['100mg', '200mg'], 'Sanofi', 'France', true, true, 'nsaids', 'Douleur, inflammation', '100-200mg/jour', '300-450 DZD'),
('Feldene', 'Piroxicam', 'Anti-inflammatoire non stéroïdien', ARRAY['comprimé', 'gel'], ARRAY['20mg'], 'Pfizer', 'USA/France', true, true, 'nsaids', 'Arthrite, douleur', '20mg/jour', '350-500 DZD');

-- ========== ANTIBIOTICS ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Augmentin', 'Amoxicilline/Acide clavulanique', 'Antibiotique pénicilline', ARRAY['comprimé', 'sirop', 'injection'], ARRAY['500mg/125mg', '1g/125mg'], 'GSK', 'France', true, true, 'antibiotics', 'Infections bactériennes respiratoires, ORL, urinaires', '1g 2x/jour pendant 7 jours', '600-900 DZD'),
('Clamoxyl', 'Amoxicilline', 'Antibiotique pénicilline', ARRAY['gélule', 'sirop'], ARRAY['250mg', '500mg', '1g'], 'GSK', 'France', true, true, 'antibiotics', 'Infections bactériennes', '500mg-1g 3x/jour', '300-500 DZD'),
('Amoxil', 'Amoxicilline', 'Antibiotique pénicilline', ARRAY['gélule', 'sirop'], ARRAY['250mg', '500mg'], 'GSK', 'France', true, true, 'antibiotics', 'Infections bactériennes', '500mg 3x/jour', '280-450 DZD'),
('Oracilline', 'Pénicilline V', 'Antibiotique pénicilline', ARRAY['comprimé', 'sirop'], ARRAY['1MUI'], 'Sanofi', 'France', true, true, 'antibiotics', 'Angine streptococcique, prophylaxie RAA', '1MUI 2x/jour', '200-350 DZD'),
('Zithromax', 'Azithromycine', 'Antibiotique macrolide', ARRAY['comprimé', 'sirop'], ARRAY['250mg', '500mg'], 'Pfizer', 'France', true, true, 'antibiotics', 'Infections respiratoires, IST', '500mg/jour pendant 3 jours', '700-1000 DZD'),
('Rulid', 'Roxithromycine', 'Antibiotique macrolide', ARRAY['comprimé'], ARRAY['150mg'], 'Sanofi', 'France', true, true, 'antibiotics', 'Infections ORL, respiratoires', '150mg 2x/jour', '500-700 DZD'),
('Erythrocine', 'Érythromycine', 'Antibiotique macrolide', ARRAY['comprimé', 'sirop'], ARRAY['500mg'], 'Amdipharm', 'France', true, true, 'antibiotics', 'Infections, allergie pénicilline', '500mg 2-4x/jour', '400-600 DZD'),
('Ciproxine', 'Ciprofloxacine', 'Antibiotique fluoroquinolone', ARRAY['comprimé'], ARRAY['250mg', '500mg', '750mg'], 'Bayer', 'Allemagne', true, true, 'antibiotics', 'Infections urinaires, respiratoires graves', '500mg 2x/jour', '500-800 DZD'),
('Oflocet', 'Ofloxacine', 'Antibiotique fluoroquinolone', ARRAY['comprimé'], ARRAY['200mg'], 'Sanofi', 'France', true, true, 'antibiotics', 'Infections urinaires, respiratoires', '200mg 2x/jour', '450-650 DZD'),
('Flagyl', 'Métronidazole', 'Antibiotique/Antiparasitaire', ARRAY['comprimé', 'ovule'], ARRAY['250mg', '500mg'], 'Sanofi', 'France', true, true, 'antibiotics', 'Infections anaérobies, parasitaires', '500mg 3x/jour', '200-350 DZD'),
('Bactrim', 'Sulfaméthoxazole/Triméthoprime', 'Antibiotique sulfamide', ARRAY['comprimé', 'sirop'], ARRAY['400mg/80mg', '800mg/160mg'], 'Roche', 'Suisse', true, true, 'antibiotics', 'Infections urinaires, respiratoires', '800/160mg 2x/jour', '250-400 DZD'),
('Rocéphine', 'Ceftriaxone', 'Antibiotique céphalosporine', ARRAY['injection'], ARRAY['500mg', '1g', '2g'], 'Roche', 'Suisse', true, true, 'antibiotics', 'Infections sévères', '1-2g/jour IV/IM', '800-1500 DZD'),
('Oroken', 'Céfixime', 'Antibiotique céphalosporine', ARRAY['comprimé', 'sirop'], ARRAY['200mg', '400mg'], 'Sanofi', 'France', true, true, 'antibiotics', 'Infections ORL, urinaires', '200mg 2x/jour', '600-900 DZD'),
('Zinnat', 'Céfuroxime', 'Antibiotique céphalosporine', ARRAY['comprimé', 'sirop'], ARRAY['250mg', '500mg'], 'GSK', 'France', true, true, 'antibiotics', 'Infections respiratoires, cutanées', '250-500mg 2x/jour', '700-1000 DZD');

-- ========== ANTISPASMODICS & GI ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Spasfon', 'Phloroglucinol', 'Antispasmodique', ARRAY['comprimé', 'suppositoire', 'injection'], ARRAY['80mg'], 'Teva', 'France', true, false, 'antispasmodics', 'Douleurs spasmodiques, coliques', '80mg 3x/jour', '250-400 DZD'),
('Debridat', 'Trimébutine', 'Antispasmodique', ARRAY['comprimé', 'sirop'], ARRAY['100mg', '200mg'], 'Pfizer', 'France', true, true, 'antispasmodics', 'Troubles fonctionnels digestifs', '100-200mg 3x/jour', '300-450 DZD'),
('Duspatalin', 'Mébévérine', 'Antispasmodique', ARRAY['comprimé', 'gélule LP'], ARRAY['135mg', '200mg'], 'Abbott', 'France', true, true, 'antispasmodics', 'Syndrome intestin irritable', '135mg 3x/jour ou 200mg 2x/jour', '400-600 DZD'),
('Mopral', 'Oméprazole', 'Inhibiteur pompe à protons', ARRAY['gélule'], ARRAY['10mg', '20mg'], 'AstraZeneca', 'France', true, true, 'gastro', 'RGO, ulcère gastrique', '20mg/jour', '350-550 DZD'),
('Inexium', 'Ésoméprazole', 'Inhibiteur pompe à protons', ARRAY['comprimé', 'sachet'], ARRAY['20mg', '40mg'], 'AstraZeneca', 'France', true, true, 'gastro', 'RGO, ulcère', '20-40mg/jour', '500-800 DZD'),
('Ogast', 'Lansoprazole', 'Inhibiteur pompe à protons', ARRAY['gélule'], ARRAY['15mg', '30mg'], 'Takeda', 'France', true, true, 'gastro', 'RGO, ulcère', '15-30mg/jour', '400-650 DZD'),
('Gaviscon', 'Alginate de sodium', 'Anti-reflux', ARRAY['suspension', 'comprimé'], ARRAY['500mg'], 'Reckitt', 'UK', true, false, 'gastro', 'Reflux gastro-oesophagien', '10-20ml après repas', '350-500 DZD'),
('Smecta', 'Diosmectite', 'Anti-diarrhéique', ARRAY['sachet'], ARRAY['3g'], 'Ipsen', 'France', true, false, 'gastro', 'Diarrhée aiguë', '1 sachet 3x/jour', '300-450 DZD'),
('Imodium', 'Lopéramide', 'Anti-diarrhéique', ARRAY['gélule'], ARRAY['2mg'], 'Johnson & Johnson', 'France', true, false, 'gastro', 'Diarrhée aiguë', '2mg après chaque selle, max 16mg/jour', '250-400 DZD'),
('Motilium', 'Dompéridone', 'Antiémétique/Prokinétique', ARRAY['comprimé', 'sirop'], ARRAY['10mg'], 'Janssen', 'France', true, true, 'gastro', 'Nausées, vomissements', '10mg 3x/jour avant repas', '300-450 DZD'),
('Primperan', 'Métoclopramide', 'Antiémétique/Prokinétique', ARRAY['comprimé', 'sirop', 'injection'], ARRAY['10mg'], 'Sanofi', 'France', true, true, 'gastro', 'Nausées, vomissements', '10mg 3x/jour', '200-350 DZD'),
('Vogalène', 'Métopimazine', 'Antiémétique', ARRAY['gélule', 'suppositoire'], ARRAY['15mg'], 'Teva', 'France', true, true, 'gastro', 'Nausées, vomissements', '15mg 2-3x/jour', '280-420 DZD');

-- ========== RESPIRATORY ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Ventoline', 'Salbutamol', 'Bronchodilatateur', ARRAY['aérosol', 'sirop', 'comprimé'], ARRAY['100µg/dose', '2mg'], 'GSK', 'France', true, true, 'respiratory', 'Asthme, bronchospasme', '1-2 bouffées si besoin', '400-600 DZD'),
('Bricanyl', 'Terbutaline', 'Bronchodilatateur', ARRAY['aérosol', 'comprimé'], ARRAY['500µg/dose', '5mg'], 'AstraZeneca', 'France', true, true, 'respiratory', 'Asthme, bronchospasme', '1-2 bouffées si besoin', '450-650 DZD'),
('Atrovent', 'Ipratropium', 'Bronchodilatateur anticholinergique', ARRAY['aérosol', 'solution nébulisation'], ARRAY['20µg/dose'], 'Boehringer', 'Allemagne', true, true, 'respiratory', 'BPCO, asthme', '2 bouffées 3-4x/jour', '500-750 DZD'),
('Seretide', 'Fluticasone/Salmétérol', 'Corticoïde + bronchodilatateur', ARRAY['aérosol', 'diskus'], ARRAY['125/25µg', '250/25µg'], 'GSK', 'France', true, true, 'respiratory', 'Asthme, BPCO', '2 bouffées 2x/jour', '2000-3500 DZD'),
('Symbicort', 'Budésonide/Formotérol', 'Corticoïde + bronchodilatateur', ARRAY['aérosol'], ARRAY['160/4.5µg', '320/9µg'], 'AstraZeneca', 'France', true, true, 'respiratory', 'Asthme, BPCO', '1-2 bouffées 2x/jour', '2500-4000 DZD'),
('Pulmicort', 'Budésonide', 'Corticoïde inhalé', ARRAY['aérosol', 'nébulisation'], ARRAY['100µg', '200µg', '400µg'], 'AstraZeneca', 'France', true, true, 'respiratory', 'Asthme', '200-400µg 2x/jour', '1000-2000 DZD'),
('Rhinocort', 'Budésonide', 'Corticoïde nasal', ARRAY['spray nasal'], ARRAY['64µg/dose'], 'AstraZeneca', 'France', true, true, 'respiratory', 'Rhinite allergique', '1-2 pulvérisations par narine/jour', '600-900 DZD'),
('Aerius', 'Desloratadine', 'Antihistaminique', ARRAY['comprimé', 'sirop'], ARRAY['5mg'], 'MSD', 'France', true, true, 'respiratory', 'Rhinite allergique, urticaire', '5mg/jour', '400-600 DZD'),
('Zyrtec', 'Cétirizine', 'Antihistaminique', ARRAY['comprimé', 'sirop'], ARRAY['10mg'], 'UCB', 'Belgique', true, false, 'respiratory', 'Rhinite allergique, urticaire', '10mg/jour', '300-450 DZD'),
('Clarityne', 'Loratadine', 'Antihistaminique', ARRAY['comprimé', 'sirop'], ARRAY['10mg'], 'MSD', 'France', true, false, 'respiratory', 'Rhinite allergique, urticaire', '10mg/jour', '280-420 DZD'),
('Xyzall', 'Lévocétirizine', 'Antihistaminique', ARRAY['comprimé'], ARRAY['5mg'], 'UCB', 'Belgique', true, true, 'respiratory', 'Rhinite allergique, urticaire', '5mg/jour', '350-500 DZD'),
('Mucomyst', 'Acétylcystéine', 'Mucolytique', ARRAY['sachet', 'comprimé effervescent'], ARRAY['200mg', '600mg'], 'Zambon', 'Italie', true, false, 'respiratory', 'Bronchite, toux grasse', '200mg 3x/jour ou 600mg/jour', '250-400 DZD'),
('Solmucol', 'Acétylcystéine', 'Mucolytique', ARRAY['sachet'], ARRAY['200mg', '600mg'], 'IBSA', 'Suisse', true, false, 'respiratory', 'Toux productive', '200mg 3x/jour', '280-430 DZD'),
('Bronchokod', 'Carbocistéine', 'Mucolytique', ARRAY['sirop'], ARRAY['5%'], 'Sanofi', 'France', true, false, 'respiratory', 'Bronchite, toux grasse', '15ml 3x/jour', '300-450 DZD');

-- ========== CARDIOVASCULAR ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Tahor', 'Atorvastatine', 'Statine hypolipémiant', ARRAY['comprimé'], ARRAY['10mg', '20mg', '40mg', '80mg'], 'Pfizer', 'France', true, true, 'cardiovascular', 'Hypercholestérolémie', '10-80mg/jour', '600-1200 DZD'),
('Crestor', 'Rosuvastatine', 'Statine hypolipémiant', ARRAY['comprimé'], ARRAY['5mg', '10mg', '20mg'], 'AstraZeneca', 'France', true, true, 'cardiovascular', 'Hypercholestérolémie', '10-20mg/jour', '800-1500 DZD'),
('Zocor', 'Simvastatine', 'Statine hypolipémiant', ARRAY['comprimé'], ARRAY['10mg', '20mg', '40mg'], 'MSD', 'France', true, true, 'cardiovascular', 'Hypercholestérolémie', '20-40mg/jour', '500-900 DZD'),
('Kardegic', 'Acétylsalicylate de lysine', 'Antiagrégant plaquettaire', ARRAY['sachet'], ARRAY['75mg', '160mg', '300mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'Prévention cardiovasculaire', '75-160mg/jour', '200-350 DZD'),
('Aspégic', 'Acétylsalicylate de lysine', 'Antiagrégant plaquettaire', ARRAY['sachet'], ARRAY['100mg', '250mg', '500mg'], 'Sanofi', 'France', true, false, 'cardiovascular', 'Douleur, prévention CV', '100-500mg/jour', '180-300 DZD'),
('Plavix', 'Clopidogrel', 'Antiagrégant plaquettaire', ARRAY['comprimé'], ARRAY['75mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'Prévention cardiovasculaire', '75mg/jour', '800-1200 DZD'),
('Coversyl', 'Périndopril', 'IEC antihypertenseur', ARRAY['comprimé'], ARRAY['2.5mg', '5mg', '10mg'], 'Servier', 'France', true, true, 'cardiovascular', 'HTA, insuffisance cardiaque', '5-10mg/jour', '500-800 DZD'),
('Triatec', 'Ramipril', 'IEC antihypertenseur', ARRAY['comprimé'], ARRAY['2.5mg', '5mg', '10mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'HTA, post-infarctus', '2.5-10mg/jour', '450-700 DZD'),
('Renitec', 'Énalapril', 'IEC antihypertenseur', ARRAY['comprimé'], ARRAY['5mg', '20mg'], 'MSD', 'France', true, true, 'cardiovascular', 'HTA, insuffisance cardiaque', '5-20mg/jour', '400-650 DZD'),
('Cozaar', 'Losartan', 'ARA II antihypertenseur', ARRAY['comprimé'], ARRAY['50mg', '100mg'], 'MSD', 'France', true, true, 'cardiovascular', 'HTA', '50-100mg/jour', '550-850 DZD'),
('Aprovel', 'Irbésartan', 'ARA II antihypertenseur', ARRAY['comprimé'], ARRAY['75mg', '150mg', '300mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'HTA, néphropathie diabétique', '150-300mg/jour', '600-950 DZD'),
('Amlor', 'Amlodipine', 'Inhibiteur calcique', ARRAY['comprimé'], ARRAY['5mg', '10mg'], 'Pfizer', 'France', true, true, 'cardiovascular', 'HTA, angor', '5-10mg/jour', '350-550 DZD'),
('Adalate', 'Nifédipine', 'Inhibiteur calcique', ARRAY['comprimé LP'], ARRAY['10mg', '20mg'], 'Bayer', 'Allemagne', true, true, 'cardiovascular', 'HTA, angor', '20-60mg/jour', '400-650 DZD'),
('Sectral', 'Acébutolol', 'Bêta-bloquant', ARRAY['comprimé'], ARRAY['200mg', '400mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'HTA, troubles du rythme', '400-800mg/jour', '350-550 DZD'),
('Lopressor', 'Métoprolol', 'Bêta-bloquant', ARRAY['comprimé'], ARRAY['100mg'], 'Novartis', 'Suisse', true, true, 'cardiovascular', 'HTA, angor, arythmie', '100-200mg/jour', '400-600 DZD'),
('Témérit', 'Nébivolol', 'Bêta-bloquant', ARRAY['comprimé'], ARRAY['5mg'], 'Menarini', 'Italie', true, true, 'cardiovascular', 'HTA, insuffisance cardiaque', '5mg/jour', '500-800 DZD'),
('Lasilix', 'Furosémide', 'Diurétique de l''anse', ARRAY['comprimé', 'injection'], ARRAY['20mg', '40mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'Oedèmes, HTA', '20-80mg/jour', '200-350 DZD'),
('Aldactone', 'Spironolactone', 'Diurétique épargneur K+', ARRAY['comprimé'], ARRAY['25mg', '50mg', '75mg'], 'Pfizer', 'France', true, true, 'cardiovascular', 'Insuffisance cardiaque, HTA', '25-100mg/jour', '350-550 DZD'),
('Digoxine', 'Digoxine', 'Digitalique', ARRAY['comprimé'], ARRAY['0.25mg'], 'Sanofi', 'France', true, true, 'cardiovascular', 'Insuffisance cardiaque, FA', '0.25mg/jour', '150-280 DZD');

-- ========== DIABETES ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Glucophage', 'Metformine', 'Antidiabétique biguanide', ARRAY['comprimé'], ARRAY['500mg', '850mg', '1000mg'], 'Merck', 'France', true, true, 'diabetes', 'Diabète type 2', '500-2000mg/jour en 2-3 prises', '200-400 DZD'),
('Stagid', 'Metformine', 'Antidiabétique biguanide', ARRAY['comprimé'], ARRAY['700mg'], 'Merck', 'France', true, true, 'diabetes', 'Diabète type 2', '700mg 2-3x/jour', '250-400 DZD'),
('Daonil', 'Glibenclamide', 'Sulfamide hypoglycémiant', ARRAY['comprimé'], ARRAY['5mg'], 'Sanofi', 'France', true, true, 'diabetes', 'Diabète type 2', '2.5-15mg/jour', '150-280 DZD'),
('Diamicron', 'Gliclazide', 'Sulfamide hypoglycémiant', ARRAY['comprimé', 'comprimé LM'], ARRAY['30mg', '60mg', '80mg'], 'Servier', 'France', true, true, 'diabetes', 'Diabète type 2', '30-120mg/jour', '400-700 DZD'),
('Amarel', 'Glimépiride', 'Sulfamide hypoglycémiant', ARRAY['comprimé'], ARRAY['1mg', '2mg', '3mg', '4mg'], 'Sanofi', 'France', true, true, 'diabetes', 'Diabète type 2', '1-4mg/jour', '350-600 DZD'),
('Novonorm', 'Répaglinide', 'Glinide', ARRAY['comprimé'], ARRAY['0.5mg', '1mg', '2mg'], 'Novo Nordisk', 'Danemark', true, true, 'diabetes', 'Diabète type 2', '0.5-4mg avant repas', '500-800 DZD'),
('Januvia', 'Sitagliptine', 'Inhibiteur DPP-4', ARRAY['comprimé'], ARRAY['100mg'], 'MSD', 'France', true, true, 'diabetes', 'Diabète type 2', '100mg/jour', '1500-2500 DZD'),
('Galvus', 'Vildagliptine', 'Inhibiteur DPP-4', ARRAY['comprimé'], ARRAY['50mg'], 'Novartis', 'Suisse', true, true, 'diabetes', 'Diabète type 2', '50mg 2x/jour', '1400-2200 DZD'),
('Lantus', 'Insuline glargine', 'Insuline basale', ARRAY['stylo injectable'], ARRAY['100UI/ml'], 'Sanofi', 'France', true, true, 'diabetes', 'Diabète type 1 et 2', 'Selon glycémie', '2500-4000 DZD'),
('Novorapid', 'Insuline asparte', 'Insuline rapide', ARRAY['stylo injectable'], ARRAY['100UI/ml'], 'Novo Nordisk', 'Danemark', true, true, 'diabetes', 'Diabète type 1 et 2', 'Selon glycémie', '2000-3500 DZD'),
('Humalog', 'Insuline lispro', 'Insuline rapide', ARRAY['stylo injectable'], ARRAY['100UI/ml'], 'Lilly', 'France', true, true, 'diabetes', 'Diabète type 1 et 2', 'Selon glycémie', '2000-3500 DZD');

-- ========== THYROID ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Levothyrox', 'Lévothyroxine', 'Hormone thyroïdienne', ARRAY['comprimé'], ARRAY['25µg', '50µg', '75µg', '100µg', '125µg', '150µg'], 'Merck', 'France', true, true, 'thyroid', 'Hypothyroïdie', '50-200µg/jour', '300-500 DZD'),
('L-Thyroxine', 'Lévothyroxine', 'Hormone thyroïdienne', ARRAY['comprimé'], ARRAY['100µg'], 'Sanofi', 'France', true, true, 'thyroid', 'Hypothyroïdie', '100-150µg/jour', '280-450 DZD'),
('Néo-Mercazole', 'Carbimazole', 'Antithyroïdien', ARRAY['comprimé'], ARRAY['5mg', '20mg'], 'Amdipharm', 'France', true, true, 'thyroid', 'Hyperthyroïdie', '15-40mg/jour', '400-650 DZD'),
('Thyrozol', 'Thiamazole', 'Antithyroïdien', ARRAY['comprimé'], ARRAY['5mg', '10mg', '20mg'], 'Merck', 'Allemagne', true, true, 'thyroid', 'Hyperthyroïdie', '10-40mg/jour', '450-700 DZD');

-- ========== PSYCHOTROPICS ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Lexomil', 'Bromazépam', 'Benzodiazépine anxiolytique', ARRAY['comprimé'], ARRAY['6mg'], 'Roche', 'France', true, true, 'psychotropics', 'Anxiété', '3-6mg/jour', '250-400 DZD'),
('Xanax', 'Alprazolam', 'Benzodiazépine anxiolytique', ARRAY['comprimé'], ARRAY['0.25mg', '0.5mg'], 'Pfizer', 'France', true, true, 'psychotropics', 'Anxiété, trouble panique', '0.25-0.5mg 3x/jour', '350-550 DZD'),
('Temesta', 'Lorazépam', 'Benzodiazépine anxiolytique', ARRAY['comprimé'], ARRAY['1mg', '2.5mg'], 'Pfizer', 'France', true, true, 'psychotropics', 'Anxiété', '1-2.5mg 2-3x/jour', '300-480 DZD'),
('Valium', 'Diazépam', 'Benzodiazépine anxiolytique', ARRAY['comprimé', 'injection'], ARRAY['5mg', '10mg'], 'Roche', 'France', true, true, 'psychotropics', 'Anxiété, spasmes musculaires', '5-10mg 2-3x/jour', '200-350 DZD'),
('Stilnox', 'Zolpidem', 'Hypnotique', ARRAY['comprimé'], ARRAY['10mg'], 'Sanofi', 'France', true, true, 'psychotropics', 'Insomnie', '10mg au coucher', '300-480 DZD'),
('Imovane', 'Zopiclone', 'Hypnotique', ARRAY['comprimé'], ARRAY['7.5mg'], 'Sanofi', 'France', true, true, 'psychotropics', 'Insomnie', '7.5mg au coucher', '320-500 DZD'),
('Prozac', 'Fluoxétine', 'Antidépresseur ISRS', ARRAY['gélule'], ARRAY['20mg'], 'Lilly', 'France', true, true, 'psychotropics', 'Dépression, TOC', '20-60mg/jour', '400-650 DZD'),
('Deroxat', 'Paroxétine', 'Antidépresseur ISRS', ARRAY['comprimé'], ARRAY['20mg'], 'GSK', 'France', true, true, 'psychotropics', 'Dépression, anxiété', '20-40mg/jour', '450-700 DZD'),
('Seroplex', 'Escitalopram', 'Antidépresseur ISRS', ARRAY['comprimé'], ARRAY['5mg', '10mg', '20mg'], 'Lundbeck', 'Danemark', true, true, 'psychotropics', 'Dépression, anxiété', '10-20mg/jour', '500-800 DZD'),
('Effexor', 'Venlafaxine', 'Antidépresseur IRSNa', ARRAY['gélule LP'], ARRAY['37.5mg', '75mg', '150mg'], 'Pfizer', 'France', true, true, 'psychotropics', 'Dépression, anxiété', '75-225mg/jour', '550-900 DZD'),
('Laroxyl', 'Amitriptyline', 'Antidépresseur tricyclique', ARRAY['comprimé', 'gouttes'], ARRAY['25mg', '50mg'], 'Teva', 'France', true, true, 'psychotropics', 'Dépression, douleur neuropathique', '25-150mg/jour', '250-420 DZD'),
('Risperdal', 'Rispéridone', 'Antipsychotique', ARRAY['comprimé', 'solution'], ARRAY['1mg', '2mg', '4mg'], 'Janssen', 'France', true, true, 'psychotropics', 'Schizophrénie, bipolarité', '2-6mg/jour', '600-1000 DZD'),
('Zyprexa', 'Olanzapine', 'Antipsychotique', ARRAY['comprimé'], ARRAY['5mg', '10mg'], 'Lilly', 'France', true, true, 'psychotropics', 'Schizophrénie, bipolarité', '5-20mg/jour', '800-1500 DZD'),
('Haldol', 'Halopéridol', 'Antipsychotique classique', ARRAY['comprimé', 'gouttes', 'injection'], ARRAY['1mg', '5mg'], 'Janssen', 'France', true, true, 'psychotropics', 'Psychose, agitation', '2-20mg/jour', '200-400 DZD');

-- ========== VITAMINS & SUPPLEMENTS ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Tardyferon', 'Sulfate ferreux', 'Fer', ARRAY['comprimé'], ARRAY['80mg'], 'Pierre Fabre', 'France', true, false, 'vitamins', 'Anémie ferriprive', '80-160mg/jour', '250-400 DZD'),
('Fercefol', 'Fer + Acide folique', 'Fer + vitamine B9', ARRAY['comprimé'], ARRAY['50mg/0.5mg'], 'Saidal', 'Algérie', true, false, 'vitamins', 'Anémie, grossesse', '1 comprimé/jour', '150-280 DZD'),
('Spéciafoldine', 'Acide folique', 'Vitamine B9', ARRAY['comprimé'], ARRAY['5mg'], 'Sanofi', 'France', true, false, 'vitamins', 'Carence folate, grossesse', '5mg/jour', '180-300 DZD'),
('Uvedose', 'Cholécalciférol', 'Vitamine D3', ARRAY['ampoule'], ARRAY['100000UI'], 'Crinex', 'France', true, false, 'vitamins', 'Carence vitamine D', '1 ampoule/mois', '400-600 DZD'),
('Zyma D', 'Cholécalciférol', 'Vitamine D3', ARRAY['gouttes'], ARRAY['10000UI/ml'], 'Sanofi', 'France', true, false, 'vitamins', 'Carence vitamine D', '3-5 gouttes/jour', '350-500 DZD'),
('Cacit', 'Calcium', 'Calcium', ARRAY['comprimé effervescent'], ARRAY['500mg', '1000mg'], 'Warner', 'France', true, false, 'vitamins', 'Carence calcique, ostéoporose', '500-1000mg/jour', '300-480 DZD'),
('Orocal', 'Calcium + Vitamine D', 'Calcium + D3', ARRAY['comprimé'], ARRAY['500mg/400UI'], 'Théramex', 'France', true, false, 'vitamins', 'Ostéoporose, carence', '1-2 comprimés/jour', '400-650 DZD'),
('Magne B6', 'Magnésium + Vitamine B6', 'Magnésium', ARRAY['comprimé', 'ampoule buvable'], ARRAY['48mg/5mg'], 'Sanofi', 'France', true, false, 'vitamins', 'Carence magnésium, fatigue', '2 comprimés 2x/jour', '350-550 DZD'),
('Supradyn', 'Multivitamines', 'Polyvitamines', ARRAY['comprimé effervescent'], ARRAY['multivitamines'], 'Bayer', 'Allemagne', false, false, 'vitamins', 'Fatigue, carence', '1 comprimé/jour', '500-800 DZD');

-- ========== DERMATOLOGY ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Fucidine', 'Acide fusidique', 'Antibiotique topique', ARRAY['crème', 'pommade'], ARRAY['2%'], 'Leo Pharma', 'Danemark', true, true, 'dermatology', 'Infections cutanées', 'Application 2-3x/jour', '400-600 DZD'),
('Bactroban', 'Mupirocine', 'Antibiotique topique', ARRAY['pommade'], ARRAY['2%'], 'GSK', 'France', true, true, 'dermatology', 'Impétigo, infections cutanées', 'Application 3x/jour', '500-750 DZD'),
('Diprosone', 'Bétaméthasone', 'Corticoïde fort', ARRAY['crème', 'pommade'], ARRAY['0.05%'], 'MSD', 'France', true, true, 'dermatology', 'Dermatoses inflammatoires', 'Application 1-2x/jour', '350-550 DZD'),
('Dermoval', 'Clobétasol', 'Corticoïde très fort', ARRAY['crème'], ARRAY['0.05%'], 'GSK', 'France', true, true, 'dermatology', 'Psoriasis, eczéma sévère', 'Application 1x/jour', '450-700 DZD'),
('Locoid', 'Hydrocortisone butyrate', 'Corticoïde moyen', ARRAY['crème', 'pommade'], ARRAY['0.1%'], 'Astellas', 'France', true, true, 'dermatology', 'Eczéma, dermatite', 'Application 1-2x/jour', '300-480 DZD'),
('Kétoderm', 'Kétoconazole', 'Antifongique topique', ARRAY['crème', 'gel moussant'], ARRAY['2%'], 'Janssen', 'France', true, true, 'dermatology', 'Mycoses cutanées, pityriasis', 'Application 1x/jour', '350-550 DZD'),
('Pevaryl', 'Éconazole', 'Antifongique topique', ARRAY['crème', 'poudre', 'ovule'], ARRAY['1%'], 'Janssen', 'France', true, true, 'dermatology', 'Mycoses cutanées, candidoses', 'Application 2x/jour', '300-480 DZD'),
('Triderm', 'Bétaméthasone/Clotrimazole/Gentamicine', 'Dermocorticoïde combiné', ARRAY['crème'], ARRAY['0.05%/1%/0.1%'], 'MSD', 'France', true, true, 'dermatology', 'Dermatoses infectées', 'Application 2x/jour', '450-700 DZD');

-- ========== OPHTHALMOLOGY ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Tobrex', 'Tobramycine', 'Antibiotique ophtalmique', ARRAY['collyre'], ARRAY['0.3%'], 'Novartis', 'Suisse', true, true, 'ophthalmology', 'Conjonctivite bactérienne', '1-2 gouttes 4x/jour', '400-600 DZD'),
('Ciloxan', 'Ciprofloxacine', 'Antibiotique ophtalmique', ARRAY['collyre'], ARRAY['0.3%'], 'Novartis', 'Suisse', true, true, 'ophthalmology', 'Infections oculaires', '1-2 gouttes 4-6x/jour', '450-700 DZD'),
('Tobradex', 'Tobramycine/Dexaméthasone', 'Antibiotique + corticoïde', ARRAY['collyre'], ARRAY['0.3%/0.1%'], 'Novartis', 'Suisse', true, true, 'ophthalmology', 'Inflammation + infection', '1-2 gouttes 4x/jour', '550-850 DZD'),
('Maxidex', 'Dexaméthasone', 'Corticoïde ophtalmique', ARRAY['collyre'], ARRAY['0.1%'], 'Novartis', 'Suisse', true, true, 'ophthalmology', 'Inflammation oculaire', '1-2 gouttes 4-6x/jour', '400-650 DZD'),
('Systane', 'Polyéthylène glycol', 'Larmes artificielles', ARRAY['collyre'], ARRAY['0.4%'], 'Novartis', 'Suisse', false, false, 'ophthalmology', 'Sécheresse oculaire', '1-2 gouttes si besoin', '500-800 DZD'),
('Xalatan', 'Latanoprost', 'Antiglaucomateux', ARRAY['collyre'], ARRAY['0.005%'], 'Pfizer', 'France', true, true, 'ophthalmology', 'Glaucome', '1 goutte/soir', '1200-2000 DZD'),
('Timoptol', 'Timolol', 'Bêta-bloquant ophtalmique', ARRAY['collyre'], ARRAY['0.25%', '0.5%'], 'MSD', 'France', true, true, 'ophthalmology', 'Glaucome', '1 goutte 2x/jour', '500-800 DZD');

-- ========== PAIN MANAGEMENT ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Tramadol', 'Tramadol', 'Antalgique opioïde faible', ARRAY['gélule', 'comprimé LP'], ARRAY['50mg', '100mg', '200mg'], 'Grünenthal', 'Allemagne', true, true, 'pain', 'Douleur modérée à sévère', '50-100mg toutes les 4-6h', '300-550 DZD'),
('Contramal', 'Tramadol', 'Antalgique opioïde faible', ARRAY['gélule'], ARRAY['50mg'], 'Grünenthal', 'Allemagne', true, true, 'pain', 'Douleur modérée à sévère', '50-100mg toutes les 4-6h', '280-480 DZD'),
('Ixprim', 'Tramadol/Paracétamol', 'Antalgique combiné', ARRAY['comprimé'], ARRAY['37.5mg/325mg'], 'Grünenthal', 'Allemagne', true, true, 'pain', 'Douleur modérée', '1-2 comprimés toutes les 6h', '350-600 DZD'),
('Codoliprane', 'Codéine/Paracétamol', 'Antalgique combiné', ARRAY['comprimé'], ARRAY['20mg/400mg'], 'Sanofi', 'France', true, true, 'pain', 'Douleur modérée', '1-2 comprimés toutes les 4-6h', '250-420 DZD'),
('Dafalgan Codéine', 'Paracétamol/Codéine', 'Antalgique combiné', ARRAY['comprimé effervescent'], ARRAY['500mg/30mg'], 'UPSA', 'France', true, true, 'pain', 'Douleur modérée', '1-2 comprimés toutes les 4h', '300-480 DZD'),
('Lamaline', 'Paracétamol/Opium/Caféine', 'Antalgique combiné', ARRAY['gélule', 'suppositoire'], ARRAY['300mg/10mg/30mg'], 'Sanofi', 'France', true, true, 'pain', 'Douleur modérée à intense', '1-2 gélules toutes les 4h', '350-550 DZD'),
('Acupan', 'Néfopam', 'Antalgique non opioïde', ARRAY['injection'], ARRAY['20mg'], 'Biocodex', 'France', true, true, 'pain', 'Douleur aiguë', '20mg IM/IV toutes les 6h', '400-650 DZD'),
('Lyrica', 'Prégabaline', 'Antiépileptique/Douleur neuropathique', ARRAY['gélule'], ARRAY['75mg', '150mg', '300mg'], 'Pfizer', 'France', true, true, 'pain', 'Douleur neuropathique, épilepsie', '150-600mg/jour en 2-3 prises', '800-1500 DZD'),
('Neurontin', 'Gabapentine', 'Antiépileptique/Douleur neuropathique', ARRAY['gélule'], ARRAY['100mg', '300mg', '400mg'], 'Pfizer', 'France', true, true, 'pain', 'Douleur neuropathique, épilepsie', '900-3600mg/jour', '600-1200 DZD');

-- ========== ENT ==========
INSERT INTO algerian_medications (brand_name, dci, therapeutic_class, dosage_forms, strengths, manufacturer, country_origin, cnas_covered, requires_prescription, category, indications, typical_dosage, price_range) VALUES
('Otipax', 'Phénazone/Lidocaïne', 'Antalgique otique', ARRAY['gouttes auriculaires'], ARRAY['4%/1%'], 'Biocodex', 'France', true, false, 'ent', 'Otite moyenne aiguë', '4 gouttes 2-3x/jour', '350-550 DZD'),
('Polydexa', 'Néomycine/Polymyxine B/Dexaméthasone', 'Antibiotique + corticoïde auriculaire', ARRAY['gouttes auriculaires'], ARRAY['1%/1M/0.1%'], 'Bouchara', 'France', true, true, 'ent', 'Otite externe', '1-5 gouttes 2x/jour', '400-650 DZD'),
('Pivalone', 'Tixocortol/Néomycine', 'Corticoïde nasal', ARRAY['spray nasal'], ARRAY['1%'], 'Sanofi', 'France', true, true, 'ent', 'Rhinite, sinusite', '1-2 pulvérisations 2-3x/jour', '350-550 DZD'),
('Derinox', 'Prednisolone/Néomycine', 'Décongestionnant nasal', ARRAY['gouttes nasales'], ARRAY['0.25%/0.5%'], 'Sanofi', 'France', true, true, 'ent', 'Rhinite, congestion', '2-3 gouttes 3x/jour', '300-480 DZD'),
('Rhinofluimucil', 'Acétylcystéine/Tuaminoheptane', 'Mucolytique nasal', ARRAY['spray nasal'], ARRAY['1%/0.5%'], 'Zambon', 'Italie', true, false, 'ent', 'Rhinite, sinusite', '1-2 pulvérisations 3-4x/jour', '400-600 DZD'),
('Hexaspray', 'Biclotymol', 'Antiseptique gorge', ARRAY['spray buccal'], ARRAY['0.25%'], 'Bouchara', 'France', true, false, 'ent', 'Maux de gorge', '2 pulvérisations 3x/jour', '350-550 DZD'),
('Strepsils', 'Alcool dichlorobenzylique/Amylmétacrésol', 'Antiseptique gorge', ARRAY['pastille'], ARRAY['1.2mg/0.6mg'], 'Reckitt', 'UK', false, false, 'ent', 'Maux de gorge', '1 pastille toutes les 2-3h', '280-450 DZD');

COMMIT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

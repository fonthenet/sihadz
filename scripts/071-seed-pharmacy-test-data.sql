-- ============================================================================
-- PHARMACY TEST DATA - 100+ ALGERIAN MEDICATIONS
-- Run this script to seed test data. Delete with: DELETE FROM pharmacy_products WHERE pharmacy_id = 'YOUR_PHARMACY_ID';
-- ============================================================================

-- Note: Replace 'YOUR_PHARMACY_ID' with actual pharmacy professional ID
-- To find your pharmacy ID: SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1;

DO $$
DECLARE
  v_pharmacy_id UUID;
  v_warehouse_id UUID;
  v_supplier_saidal UUID;
  v_supplier_biopharm UUID;
  v_supplier_lpa UUID;
  v_supplier_hikma UUID;
  v_cat_analgesic UUID;
  v_cat_antibiotic UUID;
  v_cat_cardiovascular UUID;
  v_cat_diabetes UUID;
  v_cat_respiratory UUID;
  v_cat_gastro UUID;
  v_cat_derma UUID;
  v_cat_vitamins UUID;
  v_cat_anti_inflammatory UUID;
  v_cat_neuro UUID;
  v_product_id UUID;
BEGIN
  -- Get first pharmacy for testing (or specify your ID)
  SELECT id INTO v_pharmacy_id FROM professionals WHERE type = 'pharmacy' LIMIT 1;
  
  IF v_pharmacy_id IS NULL THEN
    RAISE NOTICE 'No pharmacy found. Please create a pharmacy professional first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding test data for pharmacy: %', v_pharmacy_id;

  -- ============================================================================
  -- CREATE DEFAULT WAREHOUSE
  -- ============================================================================
  INSERT INTO pharmacy_warehouses (pharmacy_id, code, name, warehouse_type, is_default, is_sales_enabled)
  VALUES (v_pharmacy_id, 'MAIN', 'Main Storage', 'storage', true, true)
  ON CONFLICT (pharmacy_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_warehouse_id;

  INSERT INTO pharmacy_warehouses (pharmacy_id, code, name, warehouse_type, is_default, is_sales_enabled, temperature_controlled)
  VALUES (v_pharmacy_id, 'FRIDGE', 'Cold Storage', 'refrigerated', false, true, true)
  ON CONFLICT (pharmacy_id, code) DO NOTHING;

  -- ============================================================================
  -- CREATE DEFAULT CASH DRAWER
  -- ============================================================================
  INSERT INTO pharmacy_cash_drawers (pharmacy_id, code, name, warehouse_id)
  VALUES (v_pharmacy_id, 'MAIN', 'Main Register', v_warehouse_id)
  ON CONFLICT (pharmacy_id, code) DO NOTHING;

  -- ============================================================================
  -- CREATE SUPPLIERS (Real Algerian Pharma Companies)
  -- ============================================================================
  INSERT INTO pharmacy_suppliers (pharmacy_id, name, contact_person, phone, email, address, wilaya, payment_terms, is_active)
  VALUES 
    (v_pharmacy_id, 'SAIDAL Group', 'Ahmed Benali', '021 54 93 00', 'contact@saidalgroup.dz', 'Route de Dar El Beida', 'Alger', '30_days', true),
    (v_pharmacy_id, 'Biopharm', 'Karim Hadj', '021 81 63 63', 'info@biopharm.dz', 'Zone Industrielle Oued Smar', 'Alger', '30_days', true),
    (v_pharmacy_id, 'LPA (Laboratoire Pharmaceutique Algérien)', 'Fatima Zerrouki', '021 77 55 00', 'contact@lpa.dz', 'Cheraga', 'Alger', '15_days', true),
    (v_pharmacy_id, 'Hikma Pharma', 'Mohamed Saifi', '021 89 00 00', 'algeria@hikma.com', 'Zone Industrielle Rouiba', 'Alger', '30_days', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_supplier_saidal FROM pharmacy_suppliers WHERE pharmacy_id = v_pharmacy_id AND name LIKE 'SAIDAL%' LIMIT 1;
  SELECT id INTO v_supplier_biopharm FROM pharmacy_suppliers WHERE pharmacy_id = v_pharmacy_id AND name LIKE 'Biopharm%' LIMIT 1;
  SELECT id INTO v_supplier_lpa FROM pharmacy_suppliers WHERE pharmacy_id = v_pharmacy_id AND name LIKE 'LPA%' LIMIT 1;
  SELECT id INTO v_supplier_hikma FROM pharmacy_suppliers WHERE pharmacy_id = v_pharmacy_id AND name LIKE 'Hikma%' LIMIT 1;

  -- ============================================================================
  -- GET/CREATE CATEGORIES
  -- ============================================================================
  SELECT id INTO v_cat_analgesic FROM pharmacy_product_categories WHERE name = 'Analgesics';
  SELECT id INTO v_cat_antibiotic FROM pharmacy_product_categories WHERE name = 'Antibiotics';
  SELECT id INTO v_cat_cardiovascular FROM pharmacy_product_categories WHERE name = 'Cardiovascular';
  SELECT id INTO v_cat_diabetes FROM pharmacy_product_categories WHERE name = 'Antidiabetics';
  SELECT id INTO v_cat_respiratory FROM pharmacy_product_categories WHERE name = 'Respiratory';
  SELECT id INTO v_cat_gastro FROM pharmacy_product_categories WHERE name = 'Gastrointestinal';
  SELECT id INTO v_cat_derma FROM pharmacy_product_categories WHERE name = 'Dermatology';
  SELECT id INTO v_cat_vitamins FROM pharmacy_product_categories WHERE name = 'Vitamins & Supplements';
  SELECT id INTO v_cat_anti_inflammatory FROM pharmacy_product_categories WHERE name = 'Anti-inflammatory';
  SELECT id INTO v_cat_neuro FROM pharmacy_product_categories WHERE name = 'Neurological';

  -- Create missing categories (use Médicaments as parent)
  IF v_cat_analgesic IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Analgesics', 'مسكنات الألم', 'Pain relief medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_analgesic;
  END IF;
  IF v_cat_antibiotic IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Antibiotics', 'المضادات الحيوية', 'Antibacterial medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_antibiotic;
  END IF;
  IF v_cat_cardiovascular IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Cardiovascular', 'أدوية القلب', 'Heart and blood pressure medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_cardiovascular;
  END IF;
  IF v_cat_diabetes IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Antidiabetics', 'أدوية السكري', 'Diabetes medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_diabetes;
  END IF;
  IF v_cat_respiratory IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Respiratory', 'أدوية الجهاز التنفسي', 'Respiratory system medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_respiratory;
  END IF;
  IF v_cat_gastro IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Gastrointestinal', 'أدوية الجهاز الهضمي', 'Digestive system medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_gastro;
  END IF;
  IF v_cat_derma IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Dermatology', 'أدوية الجلد', 'Skin medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_derma;
  END IF;
  IF v_cat_vitamins IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Vitamins & Supplements', 'الفيتامينات', 'Vitamins and dietary supplements', '00000000-0000-0000-0001-000000000004') 
    RETURNING id INTO v_cat_vitamins;
  END IF;
  IF v_cat_anti_inflammatory IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Anti-inflammatory', 'مضادات الالتهاب', 'Anti-inflammatory medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_anti_inflammatory;
  END IF;
  IF v_cat_neuro IS NULL THEN
    INSERT INTO pharmacy_product_categories (name, name_ar, description, parent_id) 
    VALUES ('Neurological', 'أدوية الجهاز العصبي', 'Nervous system medications', '00000000-0000-0000-0001-000000000001') 
    RETURNING id INTO v_cat_neuro;
  END IF;

  -- ============================================================================
  -- INSERT 100+ PRODUCTS (Real Algerian Medications)
  -- ============================================================================
  
  -- ANALGESICS (15 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Doliprane 500mg', 'Paracétamol', '6111199001001', 'DOL500', v_cat_analgesic, 85, 120, 0, true, 80, false, 'tablet', '500mg', 'SAIDAL', 50, 100),
    (v_pharmacy_id, 'Doliprane 1000mg', 'Paracétamol', '6111199001002', 'DOL1000', v_cat_analgesic, 110, 150, 0, true, 80, false, 'tablet', '1000mg', 'SAIDAL', 50, 100),
    (v_pharmacy_id, 'Efferalgan 500mg', 'Paracétamol', '6111199001003', 'EFF500', v_cat_analgesic, 95, 130, 0, true, 80, false, 'effervescent', '500mg', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Algidal', 'Paracétamol', '6111199001004', 'ALG500', v_cat_analgesic, 75, 100, 0, true, 80, false, 'tablet', '500mg', 'SAIDAL', 40, 80),
    (v_pharmacy_id, 'Aspirine 500mg', 'Acide acétylsalicylique', '6111199001005', 'ASP500', v_cat_analgesic, 65, 90, 0, true, 80, false, 'tablet', '500mg', 'Biopharm', 30, 60),
    (v_pharmacy_id, 'Aspégic 1000mg', 'Acide acétylsalicylique', '6111199001006', 'ASPG1000', v_cat_analgesic, 120, 165, 0, true, 80, false, 'sachet', '1000mg', 'Biopharm', 20, 40),
    (v_pharmacy_id, 'Tramadol 50mg', 'Tramadol', '6111199001007', 'TRAM50', v_cat_analgesic, 180, 250, 0, true, 100, true, 'capsule', '50mg', 'Hikma', 20, 40),
    (v_pharmacy_id, 'Tramadol 100mg', 'Tramadol', '6111199001008', 'TRAM100', v_cat_analgesic, 280, 380, 0, true, 100, true, 'capsule', '100mg', 'Hikma', 15, 30),
    (v_pharmacy_id, 'Codoliprane', 'Paracétamol + Codéine', '6111199001009', 'CODOL', v_cat_analgesic, 220, 300, 0, true, 80, true, 'tablet', '400mg/20mg', 'SAIDAL', 20, 40),
    (v_pharmacy_id, 'Panadol Extra', 'Paracétamol + Caféine', '6111199001010', 'PANEX', v_cat_analgesic, 130, 180, 0, false, 0, false, 'tablet', '500mg/65mg', 'GSK', 25, 50),
    (v_pharmacy_id, 'Spasfon', 'Phloroglucinol', '6111199001011', 'SPAS', v_cat_analgesic, 160, 220, 0, true, 80, false, 'tablet', '80mg', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Viscéralgine', 'Tiémonium', '6111199001012', 'VISC', v_cat_analgesic, 145, 200, 0, true, 80, true, 'tablet', '50mg', 'Biopharm', 25, 50),
    (v_pharmacy_id, 'Doliprane Sirop Enfant', 'Paracétamol', '6111199001013', 'DOLSIR', v_cat_analgesic, 150, 210, 0, true, 80, false, 'syrup', '2.4%', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Nurofen 400mg', 'Ibuprofène', '6111199001014', 'NUR400', v_cat_analgesic, 140, 195, 0, true, 80, false, 'tablet', '400mg', 'Reckitt', 35, 70),
    (v_pharmacy_id, 'Advil 200mg', 'Ibuprofène', '6111199001015', 'ADV200', v_cat_analgesic, 110, 155, 0, true, 80, false, 'capsule', '200mg', 'Pfizer', 40, 80);

  -- ANTIBIOTICS (20 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Amoxicilline 500mg', 'Amoxicilline', '6111199002001', 'AMOX500', v_cat_antibiotic, 180, 250, 0, true, 80, true, 'capsule', '500mg', 'SAIDAL', 40, 80),
    (v_pharmacy_id, 'Amoxicilline 1g', 'Amoxicilline', '6111199002002', 'AMOX1G', v_cat_antibiotic, 280, 380, 0, true, 80, true, 'tablet', '1g', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Augmentin 1g', 'Amoxicilline + Ac. clavulanique', '6111199002003', 'AUG1G', v_cat_antibiotic, 450, 600, 0, true, 80, true, 'tablet', '1g/125mg', 'GSK', 25, 50),
    (v_pharmacy_id, 'Augmentin 500mg', 'Amoxicilline + Ac. clavulanique', '6111199002004', 'AUG500', v_cat_antibiotic, 320, 430, 0, true, 80, true, 'tablet', '500mg/62.5mg', 'GSK', 25, 50),
    (v_pharmacy_id, 'Clamoxyl 500mg', 'Amoxicilline', '6111199002005', 'CLAM500', v_cat_antibiotic, 190, 260, 0, true, 80, true, 'capsule', '500mg', 'Biopharm', 35, 70),
    (v_pharmacy_id, 'Azithromycine 500mg', 'Azithromycine', '6111199002006', 'AZIT500', v_cat_antibiotic, 380, 520, 0, true, 80, true, 'tablet', '500mg', 'Hikma', 20, 40),
    (v_pharmacy_id, 'Zithromax 250mg', 'Azithromycine', '6111199002007', 'ZITH250', v_cat_antibiotic, 420, 580, 0, true, 80, true, 'capsule', '250mg', 'Pfizer', 15, 30),
    (v_pharmacy_id, 'Ciprofloxacine 500mg', 'Ciprofloxacine', '6111199002008', 'CIPRO500', v_cat_antibiotic, 250, 340, 0, true, 80, true, 'tablet', '500mg', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Ofloxacine 200mg', 'Ofloxacine', '6111199002009', 'OFLO200', v_cat_antibiotic, 280, 380, 0, true, 80, true, 'tablet', '200mg', 'Biopharm', 25, 50),
    (v_pharmacy_id, 'Metronidazole 500mg', 'Métronidazole', '6111199002010', 'METRO500', v_cat_antibiotic, 120, 170, 0, true, 80, true, 'tablet', '500mg', 'SAIDAL', 35, 70),
    (v_pharmacy_id, 'Flagyl 500mg', 'Métronidazole', '6111199002011', 'FLAG500', v_cat_antibiotic, 140, 195, 0, true, 80, true, 'tablet', '500mg', 'Sanofi', 30, 60),
    (v_pharmacy_id, 'Ceftriaxone 1g', 'Ceftriaxone', '6111199002012', 'CEFT1G', v_cat_antibiotic, 380, 520, 0, true, 100, true, 'injection', '1g', 'Hikma', 20, 40),
    (v_pharmacy_id, 'Gentamicine 80mg', 'Gentamicine', '6111199002013', 'GENT80', v_cat_antibiotic, 180, 250, 0, true, 100, true, 'injection', '80mg/2ml', 'SAIDAL', 20, 40),
    (v_pharmacy_id, 'Doxycycline 100mg', 'Doxycycline', '6111199002014', 'DOXY100', v_cat_antibiotic, 150, 210, 0, true, 80, true, 'capsule', '100mg', 'Biopharm', 30, 60),
    (v_pharmacy_id, 'Erythromycine 500mg', 'Erythromycine', '6111199002015', 'ERYTH500', v_cat_antibiotic, 220, 300, 0, true, 80, true, 'tablet', '500mg', 'SAIDAL', 25, 50),
    (v_pharmacy_id, 'Cotrimoxazole Fort', 'Sulfaméthoxazole + Triméthoprime', '6111199002016', 'COTRI', v_cat_antibiotic, 95, 135, 0, true, 80, true, 'tablet', '800mg/160mg', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Pénicilline V 1MUI', 'Phénoxyméthylpénicilline', '6111199002017', 'PENV1M', v_cat_antibiotic, 85, 120, 0, true, 80, true, 'tablet', '1MUI', 'SAIDAL', 25, 50),
    (v_pharmacy_id, 'Céfixime 200mg', 'Céfixime', '6111199002018', 'CEFIX200', v_cat_antibiotic, 340, 460, 0, true, 80, true, 'tablet', '200mg', 'Hikma', 20, 40),
    (v_pharmacy_id, 'Clarithromycine 500mg', 'Clarithromycine', '6111199002019', 'CLARI500', v_cat_antibiotic, 380, 520, 0, true, 80, true, 'tablet', '500mg', 'Biopharm', 20, 40),
    (v_pharmacy_id, 'Amoxicilline Susp Péd', 'Amoxicilline', '6111199002020', 'AMOXPED', v_cat_antibiotic, 160, 220, 0, true, 80, true, 'suspension', '250mg/5ml', 'SAIDAL', 30, 60);

  -- CARDIOVASCULAR (15 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Amlor 5mg', 'Amlodipine', '6111199003001', 'AMLO5', v_cat_cardiovascular, 280, 380, 0, true, 80, true, 'capsule', '5mg', 'Pfizer', 30, 60),
    (v_pharmacy_id, 'Amlor 10mg', 'Amlodipine', '6111199003002', 'AMLO10', v_cat_cardiovascular, 350, 480, 0, true, 80, true, 'capsule', '10mg', 'Pfizer', 25, 50),
    (v_pharmacy_id, 'Atenolol 100mg', 'Aténolol', '6111199003003', 'ATEN100', v_cat_cardiovascular, 120, 170, 0, true, 80, true, 'tablet', '100mg', 'SAIDAL', 35, 70),
    (v_pharmacy_id, 'Cardensiel 2.5mg', 'Bisoprolol', '6111199003004', 'CARD25', v_cat_cardiovascular, 380, 520, 0, true, 80, true, 'tablet', '2.5mg', 'Biopharm', 25, 50),
    (v_pharmacy_id, 'Cardensiel 5mg', 'Bisoprolol', '6111199003005', 'CARD5', v_cat_cardiovascular, 420, 580, 0, true, 80, true, 'tablet', '5mg', 'Biopharm', 25, 50),
    (v_pharmacy_id, 'Coversyl 5mg', 'Périndopril', '6111199003006', 'COV5', v_cat_cardiovascular, 480, 650, 0, true, 80, true, 'tablet', '5mg', 'Servier', 20, 40),
    (v_pharmacy_id, 'Triatec 5mg', 'Ramipril', '6111199003007', 'TRIA5', v_cat_cardiovascular, 350, 480, 0, true, 80, true, 'tablet', '5mg', 'Sanofi', 25, 50),
    (v_pharmacy_id, 'Coaprovel 150/12.5', 'Irbésartan + HCTZ', '6111199003008', 'COAP150', v_cat_cardiovascular, 520, 710, 0, true, 80, true, 'tablet', '150mg/12.5mg', 'Sanofi', 20, 40),
    (v_pharmacy_id, 'Lasilix 40mg', 'Furosémide', '6111199003009', 'LASI40', v_cat_cardiovascular, 95, 135, 0, true, 80, true, 'tablet', '40mg', 'Sanofi', 40, 80),
    (v_pharmacy_id, 'Aldactone 25mg', 'Spironolactone', '6111199003010', 'ALDA25', v_cat_cardiovascular, 180, 250, 0, true, 80, true, 'tablet', '25mg', 'Pfizer', 30, 60),
    (v_pharmacy_id, 'Digoxine 0.25mg', 'Digoxine', '6111199003011', 'DIGO025', v_cat_cardiovascular, 85, 120, 0, true, 100, true, 'tablet', '0.25mg', 'SAIDAL', 25, 50),
    (v_pharmacy_id, 'Kardegic 75mg', 'Acide acétylsalicylique', '6111199003012', 'KARD75', v_cat_cardiovascular, 180, 250, 0, true, 80, true, 'sachet', '75mg', 'Sanofi', 35, 70),
    (v_pharmacy_id, 'Plavix 75mg', 'Clopidogrel', '6111199003013', 'PLAV75', v_cat_cardiovascular, 850, 1150, 0, true, 80, true, 'tablet', '75mg', 'Sanofi', 15, 30),
    (v_pharmacy_id, 'Tahor 20mg', 'Atorvastatine', '6111199003014', 'TAHO20', v_cat_cardiovascular, 480, 650, 0, true, 80, true, 'tablet', '20mg', 'Pfizer', 25, 50),
    (v_pharmacy_id, 'Crestor 10mg', 'Rosuvastatine', '6111199003015', 'CRES10', v_cat_cardiovascular, 620, 850, 0, true, 80, true, 'tablet', '10mg', 'AstraZeneca', 20, 40);

  -- DIABETES (12 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Glucophage 850mg', 'Metformine', '6111199004001', 'GLUC850', v_cat_diabetes, 180, 250, 0, true, 100, true, 'tablet', '850mg', 'Merck', 40, 80),
    (v_pharmacy_id, 'Glucophage 1000mg', 'Metformine', '6111199004002', 'GLUC1000', v_cat_diabetes, 220, 300, 0, true, 100, true, 'tablet', '1000mg', 'Merck', 35, 70),
    (v_pharmacy_id, 'Stagid 700mg', 'Metformine', '6111199004003', 'STAG700', v_cat_diabetes, 160, 220, 0, true, 100, true, 'tablet', '700mg', 'Biopharm', 35, 70),
    (v_pharmacy_id, 'Daonil 5mg', 'Glibenclamide', '6111199004004', 'DAON5', v_cat_diabetes, 95, 135, 0, true, 100, true, 'tablet', '5mg', 'Sanofi', 30, 60),
    (v_pharmacy_id, 'Diamicron 60mg MR', 'Gliclazide', '6111199004005', 'DIAM60', v_cat_diabetes, 380, 520, 0, true, 100, true, 'tablet', '60mg', 'Servier', 25, 50),
    (v_pharmacy_id, 'Diamicron 30mg MR', 'Gliclazide', '6111199004006', 'DIAM30', v_cat_diabetes, 280, 380, 0, true, 100, true, 'tablet', '30mg', 'Servier', 25, 50),
    (v_pharmacy_id, 'Lantus SoloStar', 'Insuline glargine', '6111199004007', 'LANT', v_cat_diabetes, 2800, 3500, 0, true, 100, true, 'injection', '100UI/ml', 'Sanofi', 10, 20),
    (v_pharmacy_id, 'Novorapid FlexPen', 'Insuline aspart', '6111199004008', 'NOVOR', v_cat_diabetes, 2600, 3200, 0, true, 100, true, 'injection', '100UI/ml', 'Novo Nordisk', 10, 20),
    (v_pharmacy_id, 'Humalog KwikPen', 'Insuline lispro', '6111199004009', 'HUMA', v_cat_diabetes, 2700, 3350, 0, true, 100, true, 'injection', '100UI/ml', 'Eli Lilly', 10, 20),
    (v_pharmacy_id, 'Januvia 100mg', 'Sitagliptine', '6111199004010', 'JANU100', v_cat_diabetes, 1200, 1600, 0, true, 80, true, 'tablet', '100mg', 'MSD', 15, 30),
    (v_pharmacy_id, 'Galvus 50mg', 'Vildagliptine', '6111199004011', 'GALV50', v_cat_diabetes, 980, 1300, 0, true, 80, true, 'tablet', '50mg', 'Novartis', 15, 30),
    (v_pharmacy_id, 'Glucomètre Accu-Chek', 'N/A', '6111199004012', 'ACCUCH', v_cat_diabetes, 3500, 4500, 19, false, 0, false, 'device', 'N/A', 'Roche', 5, 10);

  -- RESPIRATORY (12 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Ventoline Inhaleur', 'Salbutamol', '6111199005001', 'VENT', v_cat_respiratory, 320, 440, 0, true, 80, true, 'inhaler', '100µg', 'GSK', 25, 50),
    (v_pharmacy_id, 'Seretide 250', 'Fluticasone + Salmétérol', '6111199005002', 'SERE250', v_cat_respiratory, 1800, 2400, 0, true, 80, true, 'inhaler', '250/50µg', 'GSK', 15, 30),
    (v_pharmacy_id, 'Symbicort 200', 'Budésonide + Formotérol', '6111199005003', 'SYMB200', v_cat_respiratory, 1900, 2550, 0, true, 80, true, 'inhaler', '200/6µg', 'AstraZeneca', 15, 30),
    (v_pharmacy_id, 'Singular 10mg', 'Montélukast', '6111199005004', 'SING10', v_cat_respiratory, 480, 650, 0, true, 80, true, 'tablet', '10mg', 'MSD', 20, 40),
    (v_pharmacy_id, 'Aerius 5mg', 'Desloratadine', '6111199005005', 'AERI5', v_cat_respiratory, 380, 520, 0, true, 80, false, 'tablet', '5mg', 'MSD', 25, 50),
    (v_pharmacy_id, 'Zyrtec 10mg', 'Cétirizine', '6111199005006', 'ZYRT10', v_cat_respiratory, 280, 380, 0, true, 80, false, 'tablet', '10mg', 'UCB', 30, 60),
    (v_pharmacy_id, 'Claritine 10mg', 'Loratadine', '6111199005007', 'CLAR10', v_cat_respiratory, 250, 340, 0, true, 80, false, 'tablet', '10mg', 'Bayer', 30, 60),
    (v_pharmacy_id, 'Rhinofluimucil', 'Acétylcystéine + Tuaminoheptane', '6111199005008', 'RHINO', v_cat_respiratory, 380, 520, 0, true, 80, false, 'nasal spray', 'N/A', 'Zambon', 25, 50),
    (v_pharmacy_id, 'Mucomyst 200mg', 'Acétylcystéine', '6111199005009', 'MUCO200', v_cat_respiratory, 180, 250, 0, true, 80, false, 'sachet', '200mg', 'Zambon', 30, 60),
    (v_pharmacy_id, 'Bronchokod Sirop', 'Carbocistéine', '6111199005010', 'BRONK', v_cat_respiratory, 220, 300, 0, true, 80, false, 'syrup', '5%', 'SAIDAL', 35, 70),
    (v_pharmacy_id, 'Toplexil Sirop', 'Oxomémazine', '6111199005011', 'TOPL', v_cat_respiratory, 280, 380, 0, true, 80, false, 'syrup', '0.033%', 'Sanofi', 30, 60),
    (v_pharmacy_id, 'Physiomer Nasal', 'Eau de mer', '6111199005012', 'PHYSIO', v_cat_respiratory, 450, 600, 0, false, 0, false, 'nasal spray', 'N/A', 'Sanofi', 25, 50);

  -- GASTROINTESTINAL (12 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Inexium 20mg', 'Esoméprazole', '6111199006001', 'INEX20', v_cat_gastro, 480, 650, 0, true, 80, true, 'tablet', '20mg', 'AstraZeneca', 25, 50),
    (v_pharmacy_id, 'Inexium 40mg', 'Esoméprazole', '6111199006002', 'INEX40', v_cat_gastro, 580, 790, 0, true, 80, true, 'tablet', '40mg', 'AstraZeneca', 20, 40),
    (v_pharmacy_id, 'Oméprazole 20mg', 'Oméprazole', '6111199006003', 'OMEP20', v_cat_gastro, 180, 250, 0, true, 80, true, 'capsule', '20mg', 'SAIDAL', 40, 80),
    (v_pharmacy_id, 'Mopral 20mg', 'Oméprazole', '6111199006004', 'MOPR20', v_cat_gastro, 380, 520, 0, true, 80, true, 'capsule', '20mg', 'AstraZeneca', 25, 50),
    (v_pharmacy_id, 'Gaviscon', 'Alginate de sodium', '6111199006005', 'GAVIS', v_cat_gastro, 420, 580, 0, true, 80, false, 'suspension', 'N/A', 'Reckitt', 30, 60),
    (v_pharmacy_id, 'Maalox', 'Hydroxyde Al + Mg', '6111199006006', 'MAAL', v_cat_gastro, 180, 250, 0, true, 80, false, 'suspension', 'N/A', 'Sanofi', 35, 70),
    (v_pharmacy_id, 'Smecta', 'Diosmectite', '6111199006007', 'SMEC', v_cat_gastro, 280, 380, 0, true, 80, false, 'sachet', '3g', 'Ipsen', 40, 80),
    (v_pharmacy_id, 'Imodium 2mg', 'Lopéramide', '6111199006008', 'IMOD2', v_cat_gastro, 220, 300, 0, true, 80, false, 'capsule', '2mg', 'J&J', 30, 60),
    (v_pharmacy_id, 'Duphalac', 'Lactulose', '6111199006009', 'DUPH', v_cat_gastro, 350, 480, 0, true, 80, false, 'syrup', '66.7%', 'Abbott', 25, 50),
    (v_pharmacy_id, 'Débridat 100mg', 'Trimébutine', '6111199006010', 'DEBR100', v_cat_gastro, 280, 380, 0, true, 80, true, 'tablet', '100mg', 'Pfizer', 30, 60),
    (v_pharmacy_id, 'Motilium 10mg', 'Dompéridone', '6111199006011', 'MOTI10', v_cat_gastro, 180, 250, 0, true, 80, true, 'tablet', '10mg', 'J&J', 30, 60),
    (v_pharmacy_id, 'Primpéran 10mg', 'Métoclopramide', '6111199006012', 'PRIM10', v_cat_gastro, 95, 135, 0, true, 80, true, 'tablet', '10mg', 'Sanofi', 35, 70);

  -- ANTI-INFLAMMATORY (10 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Voltarène 50mg', 'Diclofénac', '6111199007001', 'VOLT50', v_cat_anti_inflammatory, 180, 250, 0, true, 80, true, 'tablet', '50mg', 'Novartis', 35, 70),
    (v_pharmacy_id, 'Voltarène 75mg LP', 'Diclofénac', '6111199007002', 'VOLT75', v_cat_anti_inflammatory, 280, 380, 0, true, 80, true, 'tablet', '75mg', 'Novartis', 30, 60),
    (v_pharmacy_id, 'Voltarène Émulgel', 'Diclofénac', '6111199007003', 'VOLTEM', v_cat_anti_inflammatory, 380, 520, 0, true, 80, false, 'gel', '1%', 'Novartis', 25, 50),
    (v_pharmacy_id, 'Profénid 100mg', 'Kétoprofène', '6111199007004', 'PROF100', v_cat_anti_inflammatory, 220, 300, 0, true, 80, true, 'capsule', '100mg', 'Sanofi', 30, 60),
    (v_pharmacy_id, 'Bi-Profénid 150mg', 'Kétoprofène', '6111199007005', 'BIPR150', v_cat_anti_inflammatory, 380, 520, 0, true, 80, true, 'tablet', '150mg', 'Sanofi', 25, 50),
    (v_pharmacy_id, 'Celebrex 200mg', 'Célécoxib', '6111199007006', 'CELE200', v_cat_anti_inflammatory, 580, 790, 0, true, 80, true, 'capsule', '200mg', 'Pfizer', 20, 40),
    (v_pharmacy_id, 'Feldène 20mg', 'Piroxicam', '6111199007007', 'FELD20', v_cat_anti_inflammatory, 180, 250, 0, true, 80, true, 'capsule', '20mg', 'Pfizer', 30, 60),
    (v_pharmacy_id, 'Cortancyl 5mg', 'Prednisone', '6111199007008', 'CORT5', v_cat_anti_inflammatory, 95, 135, 0, true, 80, true, 'tablet', '5mg', 'Sanofi', 35, 70),
    (v_pharmacy_id, 'Solupred 20mg', 'Prednisolone', '6111199007009', 'SOLU20', v_cat_anti_inflammatory, 180, 250, 0, true, 80, true, 'tablet', '20mg', 'Sanofi', 30, 60),
    (v_pharmacy_id, 'Médrol 16mg', 'Méthylprednisolone', '6111199007010', 'MEDR16', v_cat_anti_inflammatory, 380, 520, 0, true, 80, true, 'tablet', '16mg', 'Pfizer', 25, 50);

  -- VITAMINS & SUPPLEMENTS (8 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Supradyn', 'Multivitamines', '6111199008001', 'SUPR', v_cat_vitamins, 580, 790, 0, false, 0, false, 'tablet', 'N/A', 'Bayer', 30, 60),
    (v_pharmacy_id, 'Berocca', 'Vitamines B + C', '6111199008002', 'BERO', v_cat_vitamins, 480, 650, 0, false, 0, false, 'effervescent', 'N/A', 'Bayer', 25, 50),
    (v_pharmacy_id, 'Vitamine C 1000mg', 'Acide ascorbique', '6111199008003', 'VITC1000', v_cat_vitamins, 180, 250, 0, true, 80, false, 'effervescent', '1000mg', 'SAIDAL', 40, 80),
    (v_pharmacy_id, 'Vitamine D3 Bon', 'Cholécalciférol', '6111199008004', 'VITD3', v_cat_vitamins, 280, 380, 0, true, 80, false, 'ampoule', '200000UI', 'SAIDAL', 30, 60),
    (v_pharmacy_id, 'Fer + Acide Folique', 'Fer + Ac. folique', '6111199008005', 'FERAF', v_cat_vitamins, 180, 250, 0, true, 80, false, 'tablet', '47mg/0.35mg', 'SAIDAL', 35, 70),
    (v_pharmacy_id, 'Tardyferon 80mg', 'Sulfate ferreux', '6111199008006', 'TARD80', v_cat_vitamins, 320, 440, 0, true, 80, false, 'tablet', '80mg', 'Pierre Fabre', 30, 60),
    (v_pharmacy_id, 'Calcium D3', 'Calcium + Vit D3', '6111199008007', 'CALCD3', v_cat_vitamins, 280, 380, 0, true, 80, false, 'tablet', '500mg/400UI', 'SAIDAL', 35, 70),
    (v_pharmacy_id, 'Magnésium B6', 'Magnésium + Vit B6', '6111199008008', 'MAGB6', v_cat_vitamins, 250, 340, 0, true, 80, false, 'tablet', '48mg/5mg', 'Sanofi', 35, 70);

  -- DERMATOLOGY (8 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Fucidine Crème', 'Acide fusidique', '6111199009001', 'FUCI', v_cat_derma, 380, 520, 0, true, 80, true, 'cream', '2%', 'Leo Pharma', 25, 50),
    (v_pharmacy_id, 'Diprosone Crème', 'Bétaméthasone', '6111199009002', 'DIPR', v_cat_derma, 280, 380, 0, true, 80, true, 'cream', '0.05%', 'MSD', 25, 50),
    (v_pharmacy_id, 'Locoid Crème', 'Hydrocortisone', '6111199009003', 'LOCO', v_cat_derma, 220, 300, 0, true, 80, true, 'cream', '0.1%', 'Astellas', 25, 50),
    (v_pharmacy_id, 'Bétadine Dermique', 'Povidone iodée', '6111199009004', 'BETA', v_cat_derma, 280, 380, 0, true, 80, false, 'solution', '10%', 'MEDA', 30, 60),
    (v_pharmacy_id, 'Daktarin Crème', 'Miconazole', '6111199009005', 'DAKT', v_cat_derma, 280, 380, 0, true, 80, false, 'cream', '2%', 'J&J', 25, 50),
    (v_pharmacy_id, 'Lamisil Crème', 'Terbinafine', '6111199009006', 'LAMI', v_cat_derma, 420, 580, 0, true, 80, false, 'cream', '1%', 'Novartis', 20, 40),
    (v_pharmacy_id, 'Zovirax Crème', 'Aciclovir', '6111199009007', 'ZOVI', v_cat_derma, 380, 520, 0, true, 80, false, 'cream', '5%', 'GSK', 20, 40),
    (v_pharmacy_id, 'Biafine', 'Trolamine', '6111199009008', 'BIAF', v_cat_derma, 380, 520, 0, true, 80, false, 'cream', 'N/A', 'J&J', 30, 60);

  -- NEUROLOGICAL (8 products)
  INSERT INTO pharmacy_products (pharmacy_id, name, generic_name, barcode, sku, category_id, purchase_price, selling_price, tva_rate, is_chifa_listed, reimbursement_rate, requires_prescription, form, dosage, manufacturer, min_stock_level, reorder_quantity)
  VALUES
    (v_pharmacy_id, 'Lexomil 6mg', 'Bromazépam', '6111199010001', 'LEXO6', v_cat_neuro, 180, 250, 0, true, 80, true, 'tablet', '6mg', 'Roche', 25, 50),
    (v_pharmacy_id, 'Xanax 0.25mg', 'Alprazolam', '6111199010002', 'XANA025', v_cat_neuro, 220, 300, 0, true, 80, true, 'tablet', '0.25mg', 'Pfizer', 25, 50),
    (v_pharmacy_id, 'Valium 10mg', 'Diazépam', '6111199010003', 'VALI10', v_cat_neuro, 120, 170, 0, true, 80, true, 'tablet', '10mg', 'Roche', 25, 50),
    (v_pharmacy_id, 'Deroxat 20mg', 'Paroxétine', '6111199010004', 'DERO20', v_cat_neuro, 480, 650, 0, true, 80, true, 'tablet', '20mg', 'GSK', 20, 40),
    (v_pharmacy_id, 'Prozac 20mg', 'Fluoxétine', '6111199010005', 'PROZ20', v_cat_neuro, 380, 520, 0, true, 80, true, 'capsule', '20mg', 'Eli Lilly', 20, 40),
    (v_pharmacy_id, 'Laroxyl 25mg', 'Amitriptyline', '6111199010006', 'LARO25', v_cat_neuro, 120, 170, 0, true, 80, true, 'tablet', '25mg', 'Sanofi', 25, 50),
    (v_pharmacy_id, 'Risperdal 2mg', 'Rispéridone', '6111199010007', 'RISP2', v_cat_neuro, 580, 790, 0, true, 100, true, 'tablet', '2mg', 'J&J', 15, 30),
    (v_pharmacy_id, 'Dépakine 500mg', 'Valproate de sodium', '6111199010008', 'DEPA500', v_cat_neuro, 380, 520, 0, true, 100, true, 'tablet', '500mg', 'Sanofi', 20, 40);

  RAISE NOTICE 'Successfully inserted 120 test products';

  -- ============================================================================
  -- ADD INVENTORY (Stock for each product)
  -- ============================================================================
  
  -- Add stock entries with various quantities, batches, and expiry dates
  INSERT INTO pharmacy_inventory (pharmacy_id, product_id, warehouse_id, quantity, reserved_quantity, purchase_price_unit, batch_number, expiry_date, received_date, supplier_id, is_active)
  SELECT 
    p.pharmacy_id,
    p.id,
    v_warehouse_id,
    -- Varied quantities: some low (to trigger alerts), some normal, some high
    CASE 
      WHEN random() < 0.15 THEN 0  -- 15% out of stock
      WHEN random() < 0.30 THEN floor(random() * 5 + 1)::int  -- 15% low stock (1-5)
      WHEN random() < 0.70 THEN floor(random() * 50 + 20)::int  -- 40% normal (20-70)
      ELSE floor(random() * 100 + 50)::int  -- 30% high stock (50-150)
    END,
    0, -- reserved
    p.purchase_price,
    'LOT-' || to_char(now(), 'YYYYMM') || '-' || floor(random() * 9999 + 1000)::text,
    -- Varied expiry: some expired, some expiring soon, most future
    CASE 
      WHEN random() < 0.05 THEN current_date - interval '30 days'  -- 5% expired
      WHEN random() < 0.15 THEN current_date + interval '60 days'  -- 10% expiring soon
      WHEN random() < 0.30 THEN current_date + interval '6 months'
      ELSE current_date + interval '18 months'
    END,
    current_date - interval '30 days',
    v_supplier_saidal,
    true
  FROM pharmacy_products p
  WHERE p.pharmacy_id = v_pharmacy_id;

  -- Add second batch for some products (variety)
  INSERT INTO pharmacy_inventory (pharmacy_id, product_id, warehouse_id, quantity, purchase_price_unit, batch_number, expiry_date, received_date, supplier_id, is_active)
  SELECT 
    p.pharmacy_id,
    p.id,
    v_warehouse_id,
    floor(random() * 30 + 10)::int,
    p.purchase_price * 0.95, -- slightly different price
    'LOT-' || to_char(now() - interval '1 month', 'YYYYMM') || '-' || floor(random() * 9999 + 1000)::text,
    current_date + interval '12 months',
    current_date - interval '60 days',
    v_supplier_biopharm,
    true
  FROM pharmacy_products p
  WHERE p.pharmacy_id = v_pharmacy_id
  AND random() < 0.3; -- 30% of products get a second batch

  RAISE NOTICE 'Successfully added inventory batches';

  -- ============================================================================
  -- ADD SOME TEST CUSTOMERS
  -- ============================================================================
  INSERT INTO pharmacy_customers (pharmacy_id, customer_code, full_name, first_name, last_name, phone, chifa_number, nss, wilaya, loyalty_tier, loyalty_points, is_active)
  VALUES
    (v_pharmacy_id, 'CUST-00001', 'Mohamed Benali', 'Mohamed', 'Benali', '0555123456', '12345678901234', '12345678901', 'Alger', 'gold', 1500, true),
    (v_pharmacy_id, 'CUST-00002', 'Fatima Hadj', 'Fatima', 'Hadj', '0661234567', '23456789012345', '23456789012', 'Alger', 'silver', 800, true),
    (v_pharmacy_id, 'CUST-00003', 'Ahmed Saidi', 'Ahmed', 'Saidi', '0771234567', '34567890123456', '34567890123', 'Blida', 'bronze', 250, true),
    (v_pharmacy_id, 'CUST-00004', 'Amina Zerrouki', 'Amina', 'Zerrouki', '0551234567', '45678901234567', '45678901234', 'Oran', 'platinum', 3200, true),
    (v_pharmacy_id, 'CUST-00005', 'Karim Boudiaf', 'Karim', 'Boudiaf', '0662345678', '56789012345678', '56789012345', 'Constantine', 'bronze', 100, true),
    (v_pharmacy_id, 'CUST-00006', 'Leila Messaoudi', 'Leila', 'Messaoudi', '0773456789', NULL, NULL, 'Tizi Ouzou', 'bronze', 50, true),
    (v_pharmacy_id, 'CUST-00007', 'Youcef Hamdi', 'Youcef', 'Hamdi', '0554567890', '67890123456789', '67890123456', 'Sétif', 'silver', 600, true),
    (v_pharmacy_id, 'CUST-00008', 'Samira Belkacem', 'Samira', 'Belkacem', '0665678901', '78901234567890', '78901234567', 'Annaba', 'gold', 1800, true),
    (v_pharmacy_id, 'CUST-00009', 'Omar Khaled', 'Omar', 'Khaled', '0776789012', NULL, NULL, 'Béjaïa', 'bronze', 0, true),
    (v_pharmacy_id, 'CUST-00010', 'Nadia Bensaid', 'Nadia', 'Bensaid', '0557890123', '89012345678901', '89012345678', 'Batna', 'silver', 450, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully added test customers';
  RAISE NOTICE 'Test data seeding complete for pharmacy %', v_pharmacy_id;

END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run these to check the data)
-- ============================================================================
-- SELECT COUNT(*) as product_count FROM pharmacy_products;
-- SELECT COUNT(*) as inventory_count FROM pharmacy_inventory;
-- SELECT COUNT(*) as supplier_count FROM pharmacy_suppliers;
-- SELECT COUNT(*) as customer_count FROM pharmacy_customers;
-- SELECT COUNT(*) as warehouse_count FROM pharmacy_warehouses;
-- SELECT * FROM pharmacy_products LIMIT 10;

-- ============================================================================
-- CLEANUP (run this to remove all test data)
-- ============================================================================
-- DELETE FROM pharmacy_inventory WHERE pharmacy_id IN (SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1);
-- DELETE FROM pharmacy_products WHERE pharmacy_id IN (SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1);
-- DELETE FROM pharmacy_customers WHERE pharmacy_id IN (SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1);
-- DELETE FROM pharmacy_suppliers WHERE pharmacy_id IN (SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1);
-- DELETE FROM pharmacy_warehouses WHERE pharmacy_id IN (SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1);
-- DELETE FROM pharmacy_cash_drawers WHERE pharmacy_id IN (SELECT id FROM professionals WHERE type = 'pharmacy' LIMIT 1);

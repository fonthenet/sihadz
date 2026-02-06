-- Seed Medical Data for DZDoc Healthcare Ecosystem
-- Includes: Medications, Lab Tests, Vaccines, Prescription Templates

-- =====================================================
-- MEDICATIONS (Chifa/CNAS Database)
-- =====================================================
INSERT INTO medications (
  commercial_name, dci_name, dosage, form, manufacturer,
  tarif_reference, reimbursement_rate, is_generic, is_controlled,
  therapeutic_class, atc_code, is_available, is_chifa_listed, reimbursement_category
) VALUES
-- 100% Reimbursed (Life-saving medications)
('Insulatard', 'Insulin NPH', '100 UI/ml', 'injectable', 'Novo Nordisk', 1850.00, 100, false, true, 'Antidiabétique', 'A10AC01', true, true, 'vital'),
('Novorapid', 'Insulin Aspart', '100 UI/ml', 'injectable', 'Novo Nordisk', 2100.00, 100, false, true, 'Antidiabétique', 'A10AB05', true, true, 'vital'),
('Glucophage', 'Metformine', '850mg', 'comprimé', 'Merck', 450.00, 100, false, false, 'Antidiabétique', 'A10BA02', true, true, 'vital'),
('Amlor', 'Amlodipine', '5mg', 'gélule', 'Pfizer', 680.00, 100, false, false, 'Antihypertenseur', 'C08CA01', true, true, 'vital'),
('Coversyl', 'Périndopril', '5mg', 'comprimé', 'Servier', 890.00, 100, false, false, 'Antihypertenseur', 'C09AA04', true, true, 'vital'),
('Tahor', 'Atorvastatine', '20mg', 'comprimé', 'Pfizer', 1200.00, 100, false, false, 'Hypolipémiant', 'C10AA05', true, true, 'vital'),
('Plavix', 'Clopidogrel', '75mg', 'comprimé', 'Sanofi', 1450.00, 100, false, false, 'Antithrombotique', 'B01AC04', true, true, 'vital'),
('Ventoline', 'Salbutamol', '100µg', 'aérosol', 'GSK', 380.00, 100, false, false, 'Bronchodilatateur', 'R03AC02', true, true, 'vital'),
('Seretide', 'Salmétérol/Fluticasone', '25/250µg', 'aérosol', 'GSK', 2800.00, 100, false, false, 'Antiasthmatique', 'R03AK06', true, true, 'vital'),
('Lévothyrox', 'Lévothyroxine', '100µg', 'comprimé', 'Merck', 320.00, 100, false, false, 'Hormone thyroïdienne', 'H03AA01', true, true, 'vital'),

-- 80% Reimbursed (Essential medications)
('Augmentin', 'Amoxicilline/Ac. clavulanique', '1g/125mg', 'comprimé', 'GSK', 890.00, 80, false, false, 'Antibiotique', 'J01CR02', true, true, 'essential'),
('Clamoxyl', 'Amoxicilline', '1g', 'comprimé', 'GSK', 420.00, 80, false, false, 'Antibiotique', 'J01CA04', true, true, 'essential'),
('Ciprolon', 'Ciprofloxacine', '500mg', 'comprimé', 'Saidal', 380.00, 80, true, false, 'Antibiotique', 'J01MA02', true, true, 'essential'),
('Flagyl', 'Métronidazole', '500mg', 'comprimé', 'Sanofi', 180.00, 80, false, false, 'Antiparasitaire', 'P01AB01', true, true, 'essential'),
('Doliprane', 'Paracétamol', '1g', 'comprimé', 'Sanofi', 120.00, 80, false, false, 'Antalgique', 'N02BE01', true, true, 'essential'),
('Voltarène', 'Diclofénac', '50mg', 'comprimé', 'Novartis', 280.00, 80, false, false, 'Anti-inflammatoire', 'M01AB05', true, true, 'essential'),
('Mopral', 'Oméprazole', '20mg', 'gélule', 'AstraZeneca', 650.00, 80, false, false, 'Antiulcéreux', 'A02BC01', true, true, 'essential'),
('Inexium', 'Ésoméprazole', '40mg', 'comprimé', 'AstraZeneca', 1100.00, 80, false, false, 'Antiulcéreux', 'A02BC05', true, true, 'essential'),
('Spasfon', 'Phloroglucinol', '80mg', 'comprimé', 'Teva', 180.00, 80, false, false, 'Antispasmodique', 'A03AX12', true, true, 'essential'),
('Smecta', 'Diosmectite', '3g', 'sachet', 'Ipsen', 220.00, 80, false, false, 'Antidiarrhéique', 'A07BC05', true, true, 'essential'),

-- 60% Reimbursed (Common medications)
('Xanax', 'Alprazolam', '0.5mg', 'comprimé', 'Pfizer', 380.00, 60, false, true, 'Anxiolytique', 'N05BA12', true, true, 'comfort'),
('Lexomil', 'Bromazépam', '6mg', 'comprimé', 'Roche', 320.00, 60, false, true, 'Anxiolytique', 'N05BA08', true, true, 'comfort'),
('Stilnox', 'Zolpidem', '10mg', 'comprimé', 'Sanofi', 420.00, 60, false, true, 'Hypnotique', 'N05CF02', true, true, 'comfort'),
('Aerius', 'Desloratadine', '5mg', 'comprimé', 'MSD', 580.00, 60, false, false, 'Antihistaminique', 'R06AX27', true, true, 'comfort'),
('Zyrtec', 'Cétirizine', '10mg', 'comprimé', 'UCB', 320.00, 60, false, false, 'Antihistaminique', 'R06AE07', true, true, 'comfort'),

-- 0% Reimbursed (Comfort medications)
('Viagra', 'Sildénafil', '50mg', 'comprimé', 'Pfizer', 2500.00, 0, false, false, 'Dysfonction érectile', 'G04BE03', true, false, 'non_reimbursable'),
('Cialis', 'Tadalafil', '20mg', 'comprimé', 'Lilly', 2800.00, 0, false, false, 'Dysfonction érectile', 'G04BE08', true, false, 'non_reimbursable'),
('Botox', 'Toxine botulinique', '100U', 'injectable', 'Allergan', 45000.00, 0, false, true, 'Cosmétique', 'M03AX01', true, false, 'non_reimbursable')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- LAB TEST TYPES
-- =====================================================
INSERT INTO lab_test_types (
  code, name, name_ar, name_fr, category, sample_type,
  normal_range_male, normal_range_female, unit, description,
  base_price, is_chifa_covered, chifa_reimbursement_rate
) VALUES
-- Hematology
('FBC', 'Complete Blood Count', 'تعداد الدم الكامل', 'Numération Formule Sanguine', 'hematology', 'blood', '4.5-5.5', '4.0-5.0', 'M/µL', 'Full blood count including RBC, WBC, platelets', 800.00, true, 80),
('HGB', 'Hemoglobin', 'الهيموغلوبين', 'Hémoglobine', 'hematology', 'blood', '13.5-17.5', '12.0-16.0', 'g/dL', 'Oxygen-carrying protein in red blood cells', 300.00, true, 80),
('HCT', 'Hematocrit', 'الهيماتوكريت', 'Hématocrite', 'hematology', 'blood', '38.8-50.0', '34.9-44.5', '%', 'Percentage of blood volume occupied by RBCs', 300.00, true, 80),
('PLT', 'Platelet Count', 'عدد الصفائح الدموية', 'Numération Plaquettaire', 'hematology', 'blood', '150-400', '150-400', 'K/µL', 'Blood clotting cells count', 400.00, true, 80),
('ESR', 'Erythrocyte Sedimentation Rate', 'سرعة الترسيب', 'Vitesse de Sédimentation', 'hematology', 'blood', '0-15', '0-20', 'mm/hr', 'Inflammation marker', 350.00, true, 80),
('PT', 'Prothrombin Time', 'وقت البروثرومبين', 'Temps de Prothrombine', 'hematology', 'blood', '11-13.5', '11-13.5', 'seconds', 'Blood clotting time', 600.00, true, 80),
('INR', 'International Normalized Ratio', 'النسبة الدولية المعيارية', 'Rapport International Normalisé', 'hematology', 'blood', '0.8-1.2', '0.8-1.2', 'ratio', 'Standardized clotting measure', 600.00, true, 80),

-- Biochemistry
('GLU', 'Fasting Glucose', 'سكر الدم الصائم', 'Glycémie à Jeun', 'biochemistry', 'blood', '70-100', '70-100', 'mg/dL', 'Blood sugar level after fasting', 250.00, true, 100),
('HBA1C', 'Glycated Hemoglobin', 'الهيموغلوبين السكري', 'Hémoglobine Glyquée', 'biochemistry', 'blood', '<5.7', '<5.7', '%', 'Average blood sugar over 3 months', 1200.00, true, 100),
('CHOL', 'Total Cholesterol', 'الكوليسترول الكلي', 'Cholestérol Total', 'biochemistry', 'blood', '<200', '<200', 'mg/dL', 'Total blood cholesterol', 350.00, true, 80),
('HDL', 'HDL Cholesterol', 'الكوليسترول الجيد', 'Cholestérol HDL', 'biochemistry', 'blood', '>40', '>50', 'mg/dL', 'Good cholesterol', 400.00, true, 80),
('LDL', 'LDL Cholesterol', 'الكوليسترول الضار', 'Cholestérol LDL', 'biochemistry', 'blood', '<100', '<100', 'mg/dL', 'Bad cholesterol', 400.00, true, 80),
('TG', 'Triglycerides', 'الدهون الثلاثية', 'Triglycérides', 'biochemistry', 'blood', '<150', '<150', 'mg/dL', 'Blood fat levels', 350.00, true, 80),
('CREA', 'Creatinine', 'الكرياتينين', 'Créatinine', 'biochemistry', 'blood', '0.7-1.3', '0.6-1.1', 'mg/dL', 'Kidney function marker', 300.00, true, 80),
('UREA', 'Blood Urea Nitrogen', 'اليوريا في الدم', 'Urée Sanguine', 'biochemistry', 'blood', '7-20', '7-20', 'mg/dL', 'Kidney function marker', 300.00, true, 80),
('UA', 'Uric Acid', 'حمض اليوريك', 'Acide Urique', 'biochemistry', 'blood', '3.5-7.2', '2.5-6.2', 'mg/dL', 'Gout and kidney marker', 350.00, true, 80),
('AST', 'AST (SGOT)', 'ناقلة أمين الأسبارتات', 'ASAT (TGO)', 'biochemistry', 'blood', '10-40', '10-40', 'U/L', 'Liver enzyme', 350.00, true, 80),
('ALT', 'ALT (SGPT)', 'ناقلة أمين الألانين', 'ALAT (TGP)', 'biochemistry', 'blood', '7-56', '7-56', 'U/L', 'Liver enzyme', 350.00, true, 80),
('ALP', 'Alkaline Phosphatase', 'الفوسفاتاز القلوي', 'Phosphatase Alcaline', 'biochemistry', 'blood', '44-147', '44-147', 'U/L', 'Liver and bone marker', 400.00, true, 80),
('GGT', 'Gamma GT', 'غاما جي تي', 'Gamma GT', 'biochemistry', 'blood', '9-48', '9-48', 'U/L', 'Liver enzyme', 400.00, true, 80),
('BIL', 'Total Bilirubin', 'البيليروبين الكلي', 'Bilirubine Totale', 'biochemistry', 'blood', '0.1-1.2', '0.1-1.2', 'mg/dL', 'Liver function marker', 350.00, true, 80),
('TP', 'Total Protein', 'البروتين الكلي', 'Protéines Totales', 'biochemistry', 'blood', '6.0-8.3', '6.0-8.3', 'g/dL', 'Nutritional status marker', 300.00, true, 80),
('ALB', 'Albumin', 'الألبومين', 'Albumine', 'biochemistry', 'blood', '3.5-5.0', '3.5-5.0', 'g/dL', 'Liver and nutritional marker', 350.00, true, 80),

-- Thyroid Panel
('TSH', 'Thyroid Stimulating Hormone', 'هرمون الغدة الدرقية', 'TSH', 'endocrinology', 'blood', '0.4-4.0', '0.4-4.0', 'mIU/L', 'Thyroid function marker', 800.00, true, 80),
('T3', 'Triiodothyronine', 'هرمون T3', 'T3 Libre', 'endocrinology', 'blood', '2.3-4.2', '2.3-4.2', 'pg/mL', 'Active thyroid hormone', 700.00, true, 80),
('T4', 'Thyroxine', 'هرمون T4', 'T4 Libre', 'endocrinology', 'blood', '0.8-1.8', '0.8-1.8', 'ng/dL', 'Thyroid hormone', 700.00, true, 80),

-- Vitamins & Minerals
('VITD', 'Vitamin D', 'فيتامين د', 'Vitamine D', 'vitamins', 'blood', '30-100', '30-100', 'ng/mL', 'Bone health vitamin', 1500.00, true, 60),
('VITB12', 'Vitamin B12', 'فيتامين ب12', 'Vitamine B12', 'vitamins', 'blood', '200-900', '200-900', 'pg/mL', 'Nerve and blood cell vitamin', 1200.00, true, 60),
('FER', 'Ferritin', 'الفيريتين', 'Ferritine', 'vitamins', 'blood', '30-400', '15-150', 'ng/mL', 'Iron storage protein', 800.00, true, 80),
('FE', 'Serum Iron', 'الحديد في الدم', 'Fer Sérique', 'vitamins', 'blood', '60-170', '60-170', 'µg/dL', 'Blood iron level', 500.00, true, 80),

-- Urine Tests
('URINE', 'Urinalysis', 'تحليل البول', 'Analyse d''Urine', 'urinalysis', 'urine', 'negative', 'negative', 'qualitative', 'Complete urine analysis', 400.00, true, 80),
('UCULT', 'Urine Culture', 'زراعة البول', 'ECBU', 'microbiology', 'urine', 'negative', 'negative', 'CFU/mL', 'Bacterial infection test', 1000.00, true, 80),

-- Cardiac Markers
('TROP', 'Troponin', 'التروبونين', 'Troponine', 'cardiology', 'blood', '<0.04', '<0.04', 'ng/mL', 'Heart attack marker', 1500.00, true, 100),
('CK', 'Creatine Kinase', 'كيناز الكرياتين', 'Créatine Kinase', 'cardiology', 'blood', '22-198', '22-198', 'U/L', 'Muscle enzyme', 600.00, true, 80),
('BNP', 'B-type Natriuretic Peptide', 'الببتيد الناتريوتيك', 'BNP', 'cardiology', 'blood', '<100', '<100', 'pg/mL', 'Heart failure marker', 2000.00, true, 100),

-- Infectious Disease
('CRP', 'C-Reactive Protein', 'البروتين التفاعلي', 'CRP', 'immunology', 'blood', '<10', '<10', 'mg/L', 'Inflammation marker', 500.00, true, 80),
('RF', 'Rheumatoid Factor', 'عامل الروماتويد', 'Facteur Rhumatoïde', 'immunology', 'blood', '<14', '<14', 'IU/mL', 'Autoimmune marker', 700.00, true, 80),
('HBSAG', 'Hepatitis B Surface Antigen', 'مستضد التهاب الكبد ب', 'Antigène HBs', 'serology', 'blood', 'negative', 'negative', 'qualitative', 'Hepatitis B screening', 800.00, true, 80),
('HCVAB', 'Hepatitis C Antibody', 'أجسام مضادة التهاب الكبد ج', 'Anti-VHC', 'serology', 'blood', 'negative', 'negative', 'qualitative', 'Hepatitis C screening', 1000.00, true, 80),
('HIV', 'HIV Antibody', 'فحص الإيدز', 'Sérologie VIH', 'serology', 'blood', 'negative', 'negative', 'qualitative', 'HIV screening', 1200.00, true, 100)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VACCINES (Algeria National Program)
-- =====================================================
INSERT INTO vaccines (
  code, name, name_ar, name_fr, manufacturer, type,
  disease_prevention, disease_prevention_ar, recommended_age,
  dose_count, dose_interval_days, booster_interval_years,
  is_mandatory, is_free, is_available
) VALUES
-- Mandatory childhood vaccines (Programme National de Vaccination)
('BCG', 'BCG Vaccine', 'لقاح السل', 'Vaccin BCG', 'Pasteur Algérie', 'live', 'Tuberculosis', 'السل', 'Birth', 1, NULL, NULL, true, true, true),
('HEP-B', 'Hepatitis B', 'لقاح التهاب الكبد ب', 'Vaccin Hépatite B', 'Pasteur Algérie', 'inactivated', 'Hepatitis B', 'التهاب الكبد الفيروسي ب', 'Birth, 1mo, 6mo', 3, 30, NULL, true, true, true),
('DTP', 'DTP Vaccine', 'لقاح الثلاثي', 'Vaccin DTC', 'Pasteur Algérie', 'inactivated', 'Diphtheria, Tetanus, Pertussis', 'الدفتيريا والتيتانوس والسعال الديكي', '2mo, 4mo, 6mo, 18mo', 4, 60, 10, true, true, true),
('POLIO', 'Polio Vaccine (OPV)', 'لقاح شلل الأطفال', 'Vaccin Polio', 'Pasteur Algérie', 'live', 'Poliomyelitis', 'شلل الأطفال', '2mo, 4mo, 6mo, 18mo', 4, 60, NULL, true, true, true),
('HIB', 'Hib Vaccine', 'لقاح المستدمية النزلية', 'Vaccin Hib', 'Pasteur Algérie', 'inactivated', 'Haemophilus influenzae type b', 'المستدمية النزلية نوع ب', '2mo, 4mo, 6mo, 18mo', 4, 60, NULL, true, true, true),
('MMR', 'MMR Vaccine', 'لقاح الحصبة والنكاف والحصبة الألمانية', 'Vaccin ROR', 'Pasteur Algérie', 'live', 'Measles, Mumps, Rubella', 'الحصبة والنكاف والحصبة الألمانية', '9mo, 18mo', 2, 270, NULL, true, true, true),
('PCV', 'Pneumococcal Vaccine', 'لقاح المكورات الرئوية', 'Vaccin Pneumococcique', 'Pfizer', 'inactivated', 'Pneumococcal disease', 'أمراض المكورات الرئوية', '2mo, 4mo, 12mo', 3, 60, NULL, true, true, true),
('ROTA', 'Rotavirus Vaccine', 'لقاح الروتا', 'Vaccin Rotavirus', 'GSK', 'live', 'Rotavirus gastroenteritis', 'التهاب المعدة والأمعاء بالروتا', '2mo, 4mo', 2, 60, NULL, true, true, true),

-- Recommended vaccines
('VAR', 'Varicella Vaccine', 'لقاح الجدري المائي', 'Vaccin Varicelle', 'Merck', 'live', 'Chickenpox', 'الجدري المائي', '12mo, 4-6yr', 2, 1095, NULL, false, false, true),
('HAV', 'Hepatitis A', 'لقاح التهاب الكبد أ', 'Vaccin Hépatite A', 'GSK', 'inactivated', 'Hepatitis A', 'التهاب الكبد الفيروسي أ', '12mo, 18mo', 2, 180, NULL, false, false, true),
('MEN', 'Meningococcal Vaccine', 'لقاح السحايا', 'Vaccin Méningocoque', 'Sanofi', 'inactivated', 'Meningitis', 'التهاب السحايا', '11-12yr', 1, NULL, 5, false, false, true),
('HPV', 'HPV Vaccine', 'لقاح فيروس الورم الحليمي', 'Vaccin HPV', 'Merck', 'inactivated', 'Human Papillomavirus', 'فيروس الورم الحليمي البشري', '11-12yr', 2, 180, NULL, false, false, true),

-- Adult vaccines
('FLU', 'Influenza Vaccine', 'لقاح الأنفلونزا', 'Vaccin Grippe', 'Sanofi', 'inactivated', 'Seasonal Influenza', 'الأنفلونزا الموسمية', 'Annual (6mo+)', 1, NULL, 1, false, false, true),
('COVID', 'COVID-19 Vaccine', 'لقاح كوفيد-19', 'Vaccin COVID-19', 'Sinovac/AstraZeneca', 'inactivated', 'COVID-19', 'كوفيد-19', '18+', 2, 21, 1, false, true, true),
('TT', 'Tetanus Toxoid', 'لقاح التيتانوس', 'Vaccin Tétanos', 'Pasteur Algérie', 'inactivated', 'Tetanus', 'التيتانوس', 'Every 10yr', 1, NULL, 10, false, true, true),
('TYPHOID', 'Typhoid Vaccine', 'لقاح التيفوئيد', 'Vaccin Typhoïde', 'Sanofi', 'inactivated', 'Typhoid fever', 'حمى التيفوئيد', 'Travelers, 2yr+', 1, NULL, 3, false, false, true),
('RABIES', 'Rabies Vaccine', 'لقاح داء الكلب', 'Vaccin Rage', 'Pasteur Algérie', 'inactivated', 'Rabies', 'داء الكلب', 'Post-exposure', 4, 7, NULL, false, true, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PRESCRIPTION TEMPLATES (Public templates without doctor_id)
-- =====================================================
INSERT INTO prescription_templates (
  name, name_ar, description, default_medications, footer_text, is_default
) VALUES
('Common Cold Treatment', 'علاج نزلة البرد', 'Template for treating common cold and flu symptoms',
 '[{"medication": "Doliprane 1g", "dosage": "1 tablet", "frequency": "3 times daily", "duration": "5 days"}, {"medication": "Aerius 5mg", "dosage": "1 tablet", "frequency": "once daily", "duration": "5 days"}]'::jsonb,
 'Rest and hydration recommended', true),

('Hypertension Management', 'علاج ارتفاع ضغط الدم', 'Standard hypertension treatment protocol',
 '[{"medication": "Amlor 5mg", "dosage": "1 tablet", "frequency": "once daily", "duration": "continuous"}, {"medication": "Coversyl 5mg", "dosage": "1 tablet", "frequency": "once daily", "duration": "continuous"}]'::jsonb,
 'Monitor blood pressure regularly, low sodium diet', true),

('Type 2 Diabetes Management', 'علاج السكري من النوع 2', 'First-line diabetes management',
 '[{"medication": "Glucophage 850mg", "dosage": "1 tablet", "frequency": "twice daily with meals", "duration": "continuous"}]'::jsonb,
 'Regular glucose monitoring, balanced diet, exercise', true),

('Gastric Ulcer Treatment', 'علاج قرحة المعدة', 'PPI-based ulcer treatment',
 '[{"medication": "Mopral 20mg", "dosage": "1 capsule", "frequency": "once daily before breakfast", "duration": "4 weeks"}, {"medication": "Spasfon 80mg", "dosage": "2 tablets", "frequency": "3 times daily", "duration": "10 days"}]'::jsonb,
 'Avoid spicy foods, alcohol, and NSAIDs', true),

('Bacterial Infection (General)', 'عدوى بكتيرية عامة', 'Broad-spectrum antibiotic for common infections',
 '[{"medication": "Augmentin 1g", "dosage": "1 tablet", "frequency": "twice daily", "duration": "7 days"}]'::jsonb,
 'Complete the full course of antibiotics', true),

('Anxiety Treatment', 'علاج القلق', 'Short-term anxiety management',
 '[{"medication": "Xanax 0.5mg", "dosage": "1 tablet", "frequency": "as needed, max 3 daily", "duration": "2 weeks"}]'::jsonb,
 'Avoid driving. Taper gradually. Consider therapy.', true),

('Allergic Rhinitis', 'التهاب الأنف التحسسي', 'Antihistamine for seasonal allergies',
 '[{"medication": "Zyrtec 10mg", "dosage": "1 tablet", "frequency": "once daily", "duration": "as needed"}]'::jsonb,
 'Avoid allergens when possible', true),

('Asthma Management', 'علاج الربو', 'Standard asthma controller and reliever',
 '[{"medication": "Ventoline 100µg", "dosage": "2 puffs", "frequency": "as needed", "duration": "continuous"}, {"medication": "Seretide 25/250µg", "dosage": "2 puffs", "frequency": "twice daily", "duration": "continuous"}]'::jsonb,
 'Avoid triggers. Use spacer for inhalers.', true),

('Iron Deficiency Anemia', 'فقر الدم بنقص الحديد', 'Iron supplementation protocol',
 '[{"medication": "Tardyferon 80mg", "dosage": "1 tablet", "frequency": "twice daily", "duration": "3 months"}]'::jsonb,
 'Take with vitamin C for better absorption. Avoid with tea/coffee.', true),

('Thyroid Disorder (Hypothyroidism)', 'قصور الغدة الدرقية', 'Levothyroxine replacement therapy',
 '[{"medication": "Lévothyrox 100µg", "dosage": "1 tablet", "frequency": "once daily on empty stomach", "duration": "continuous"}]'::jsonb,
 'Take 30min before breakfast. Regular TSH monitoring.', true)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Medical data seeded successfully' as status;

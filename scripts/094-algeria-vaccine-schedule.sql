-- =====================================================
-- ALGERIA NATIONAL VACCINATION SCHEDULE
-- Programme Élargi de Vaccination (PEV)
-- Based on WHO recommendations adapted for Algeria
-- =====================================================

-- Ensure vaccines table exists (from create-medical-records-schema.sql)
-- If not, create it
CREATE TABLE IF NOT EXISTS vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  name_fr VARCHAR(255),
  
  manufacturer VARCHAR(255),
  type VARCHAR(100),
  disease_prevention VARCHAR(255),
  disease_prevention_ar VARCHAR(255),
  
  recommended_age VARCHAR(100),
  dose_count INTEGER DEFAULT 1,
  dose_interval_days INTEGER,
  booster_interval_years INTEGER,
  
  is_mandatory BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear existing vaccine data to avoid duplicates
DELETE FROM vaccines WHERE code LIKE 'DZ-%';

-- =====================================================
-- BIRTH VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-BCG', 'BCG (Bacillus Calmette-Guérin)', 'لقاح السل', 'BCG', 'live_attenuated', 'Tuberculosis', 'السل', 'Birth', 1, true, true),
('DZ-HEPB-BIRTH', 'Hepatitis B (Birth Dose)', 'التهاب الكبد ب (جرعة الولادة)', 'Hépatite B (dose de naissance)', 'inactivated', 'Hepatitis B', 'التهاب الكبد ب', 'Birth (within 24h)', 1, true, true);

-- =====================================================
-- 2 MONTHS VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, dose_interval_days, is_mandatory, is_free) VALUES
('DZ-PENTA-1', 'Pentavalent (DTP-Hib-HepB) - Dose 1', 'اللقاح الخماسي - الجرعة 1', 'Pentavalent - Dose 1', 'combination', 'Diphtheria, Tetanus, Pertussis, Haemophilus influenzae b, Hepatitis B', 'الدفتيريا، التيتانوس، السعال الديكي، المستدمية النزلية، التهاب الكبد ب', '2 months', 3, 30, true, true),
('DZ-OPV-1', 'Oral Polio Vaccine - Dose 1', 'لقاح شلل الأطفال الفموي - الجرعة 1', 'VPO - Dose 1', 'live_attenuated', 'Poliomyelitis', 'شلل الأطفال', '2 months', 4, 30, true, true),
('DZ-PCV-1', 'Pneumococcal Conjugate - Dose 1', 'لقاح المكورات الرئوية - الجرعة 1', 'Pneumocoque - Dose 1', 'conjugate', 'Pneumococcal disease', 'أمراض المكورات الرئوية', '2 months', 3, 60, true, true),
('DZ-ROTA-1', 'Rotavirus - Dose 1', 'لقاح الروتا - الجرعة 1', 'Rotavirus - Dose 1', 'live_attenuated', 'Rotavirus gastroenteritis', 'التهاب المعدة والأمعاء', '2 months', 2, 30, false, true);

-- =====================================================
-- 3 MONTHS VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, dose_interval_days, is_mandatory, is_free) VALUES
('DZ-PENTA-2', 'Pentavalent (DTP-Hib-HepB) - Dose 2', 'اللقاح الخماسي - الجرعة 2', 'Pentavalent - Dose 2', 'combination', 'Diphtheria, Tetanus, Pertussis, Haemophilus influenzae b, Hepatitis B', 'الدفتيريا، التيتانوس، السعال الديكي، المستدمية النزلية، التهاب الكبد ب', '3 months', 3, 30, true, true),
('DZ-OPV-2', 'Oral Polio Vaccine - Dose 2', 'لقاح شلل الأطفال الفموي - الجرعة 2', 'VPO - Dose 2', 'live_attenuated', 'Poliomyelitis', 'شلل الأطفال', '3 months', 4, 30, true, true),
('DZ-ROTA-2', 'Rotavirus - Dose 2', 'لقاح الروتا - الجرعة 2', 'Rotavirus - Dose 2', 'live_attenuated', 'Rotavirus gastroenteritis', 'التهاب المعدة والأمعاء', '3 months', 2, 30, false, true);

-- =====================================================
-- 4 MONTHS VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, dose_interval_days, is_mandatory, is_free) VALUES
('DZ-PENTA-3', 'Pentavalent (DTP-Hib-HepB) - Dose 3', 'اللقاح الخماسي - الجرعة 3', 'Pentavalent - Dose 3', 'combination', 'Diphtheria, Tetanus, Pertussis, Haemophilus influenzae b, Hepatitis B', 'الدفتيريا، التيتانوس، السعال الديكي، المستدمية النزلية، التهاب الكبد ب', '4 months', 3, 30, true, true),
('DZ-OPV-3', 'Oral Polio Vaccine - Dose 3', 'لقاح شلل الأطفال الفموي - الجرعة 3', 'VPO - Dose 3', 'live_attenuated', 'Poliomyelitis', 'شلل الأطفال', '4 months', 4, 30, true, true),
('DZ-PCV-2', 'Pneumococcal Conjugate - Dose 2', 'لقاح المكورات الرئوية - الجرعة 2', 'Pneumocoque - Dose 2', 'conjugate', 'Pneumococcal disease', 'أمراض المكورات الرئوية', '4 months', 3, 60, true, true),
('DZ-IPV', 'Inactivated Polio Vaccine', 'لقاح شلل الأطفال المعطل', 'VPI', 'inactivated', 'Poliomyelitis', 'شلل الأطفال', '4 months', 1, NULL, true, true);

-- =====================================================
-- 9-11 MONTHS VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-MMR-1', 'MMR (Measles, Mumps, Rubella) - Dose 1', 'لقاح الحصبة والنكاف والحصبة الألمانية - الجرعة 1', 'ROR - Dose 1', 'live_attenuated', 'Measles, Mumps, Rubella', 'الحصبة، النكاف، الحصبة الألمانية', '11 months', 2, true, true);

-- =====================================================
-- 12 MONTHS VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-PCV-3', 'Pneumococcal Conjugate - Dose 3 (Booster)', 'لقاح المكورات الرئوية - الجرعة 3 (معززة)', 'Pneumocoque - Dose 3', 'conjugate', 'Pneumococcal disease', 'أمراض المكورات الرئوية', '12 months', 3, true, true);

-- =====================================================
-- 18 MONTHS VACCINES (BOOSTERS)
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-DTP-BOOST-1', 'DTP Booster - 18 months', 'جرعة معززة للثلاثي - 18 شهر', 'DTC Rappel - 18 mois', 'inactivated', 'Diphtheria, Tetanus, Pertussis', 'الدفتيريا، التيتانوس، السعال الديكي', '18 months', 1, true, true),
('DZ-OPV-4', 'Oral Polio Vaccine - Dose 4 (Booster)', 'لقاح شلل الأطفال الفموي - الجرعة 4 (معززة)', 'VPO - Dose 4', 'live_attenuated', 'Poliomyelitis', 'شلل الأطفال', '18 months', 4, true, true);

-- =====================================================
-- 6 YEARS VACCINES (SCHOOL ENTRY)
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-DTP-BOOST-2', 'DTP Booster - 6 years', 'جرعة معززة للثلاثي - 6 سنوات', 'DTC Rappel - 6 ans', 'inactivated', 'Diphtheria, Tetanus, Pertussis', 'الدفتيريا، التيتانوس، السعال الديكي', '6 years', 1, true, true),
('DZ-OPV-5', 'Oral Polio Vaccine - Dose 5 (Booster)', 'لقاح شلل الأطفال الفموي - الجرعة 5 (معززة)', 'VPO - Dose 5', 'live_attenuated', 'Poliomyelitis', 'شلل الأطفال', '6 years', 4, true, true),
('DZ-MMR-2', 'MMR (Measles, Mumps, Rubella) - Dose 2', 'لقاح الحصبة والنكاف والحصبة الألمانية - الجرعة 2', 'ROR - Dose 2', 'live_attenuated', 'Measles, Mumps, Rubella', 'الحصبة، النكاف، الحصبة الألمانية', '6 years', 2, true, true);

-- =====================================================
-- 11-13 YEARS VACCINES (ADOLESCENT)
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-DT-BOOST', 'DT Booster - 11 years', 'جرعة معززة ضد الدفتيريا والتيتانوس - 11 سنة', 'DT Rappel - 11 ans', 'inactivated', 'Diphtheria, Tetanus', 'الدفتيريا، التيتانوس', '11 years', 1, true, true);

-- =====================================================
-- 16-18 YEARS VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-DT-BOOST-2', 'DT Booster - 16-18 years', 'جرعة معززة ضد الدفتيريا والتيتانوس - 16-18 سنة', 'DT Rappel - 16-18 ans', 'inactivated', 'Diphtheria, Tetanus', 'الدفتيريا، التيتانوس', '16-18 years', 1, true, true);

-- =====================================================
-- OPTIONAL/RECOMMENDED VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, is_mandatory, is_free) VALUES
('DZ-VARICELLA', 'Varicella (Chickenpox)', 'لقاح الجدري المائي', 'Varicelle', 'live_attenuated', 'Chickenpox', 'الجدري المائي', '12-15 months', 2, false, false),
('DZ-HEPA', 'Hepatitis A', 'لقاح التهاب الكبد أ', 'Hépatite A', 'inactivated', 'Hepatitis A', 'التهاب الكبد أ', '12-23 months', 2, false, false),
('DZ-MENINGO', 'Meningococcal', 'لقاح المكورات السحائية', 'Méningocoque', 'conjugate', 'Meningococcal disease', 'أمراض المكورات السحائية', '9-23 months', 2, false, false),
('DZ-FLU', 'Influenza (Annual)', 'لقاح الإنفلونزا السنوي', 'Grippe', 'inactivated', 'Influenza', 'الإنفلونزا', '6 months+', 1, false, false),
('DZ-HPV', 'HPV (Human Papillomavirus)', 'لقاح فيروس الورم الحليمي البشري', 'HPV', 'inactivated', 'HPV-related cancers', 'السرطانات المرتبطة بفيروس HPV', '9-14 years', 2, false, false);

-- =====================================================
-- ADULT VACCINES
-- =====================================================

INSERT INTO vaccines (code, name, name_ar, name_fr, type, disease_prevention, disease_prevention_ar, recommended_age, dose_count, booster_interval_years, is_mandatory, is_free) VALUES
('DZ-TT-ADULT', 'Tetanus Toxoid (Adult Booster)', 'لقاح التيتانوس للبالغين', 'Tétanos (Rappel adulte)', 'toxoid', 'Tetanus', 'التيتانوس', 'Every 10 years', 1, 10, false, true),
('DZ-COVID', 'COVID-19 Vaccine', 'لقاح كوفيد-19', 'COVID-19', 'mRNA', 'COVID-19', 'كوفيد-19', '5 years+', 2, NULL, false, true);

-- =====================================================
-- VACCINATION SCHEDULE VIEW
-- For easy querying of age-appropriate vaccines
-- =====================================================

CREATE OR REPLACE VIEW vaccine_schedule AS
SELECT 
  id,
  code,
  name,
  name_ar,
  name_fr,
  disease_prevention,
  disease_prevention_ar,
  recommended_age,
  dose_count,
  is_mandatory,
  is_free,
  CASE 
    WHEN recommended_age = 'Birth' OR recommended_age LIKE 'Birth%' THEN 0
    WHEN recommended_age LIKE '2 months' THEN 60
    WHEN recommended_age LIKE '3 months' THEN 90
    WHEN recommended_age LIKE '4 months' THEN 120
    WHEN recommended_age LIKE '11 months' THEN 330
    WHEN recommended_age LIKE '12 months' THEN 365
    WHEN recommended_age LIKE '18 months' THEN 548
    WHEN recommended_age LIKE '6 years' THEN 2190
    WHEN recommended_age LIKE '11 years' THEN 4015
    WHEN recommended_age LIKE '16%' THEN 5840
    ELSE 9999
  END AS recommended_age_days
FROM vaccines
WHERE code LIKE 'DZ-%'
ORDER BY recommended_age_days, code;

-- Grant access to the view
GRANT SELECT ON vaccine_schedule TO authenticated;

-- Drug Interactions Database
-- Priority: Algerian market medications, then French/European

-- Table to store drug-drug interactions
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug1_dci VARCHAR(255) NOT NULL,
  drug1_name VARCHAR(255),
  drug2_dci VARCHAR(255) NOT NULL,
  drug2_name VARCHAR(255),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  interaction_type VARCHAR(100),
  description TEXT NOT NULL,
  description_ar TEXT,
  description_fr TEXT,
  mechanism TEXT,
  clinical_effect TEXT,
  management TEXT,
  management_ar TEXT,
  source VARCHAR(255) DEFAULT 'Algerian Pharmacovigilance',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(LOWER(drug1_dci));
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(LOWER(drug2_dci));
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(severity);

-- Common drug interactions (Algerian market focus)
INSERT INTO drug_interactions (drug1_dci, drug1_name, drug2_dci, drug2_name, severity, interaction_type, description, description_fr, management) VALUES
-- Anticoagulants
('warfarine', 'Coumadine', 'aspirine', 'Aspégic', 'major', 'Increased bleeding risk', 
 'Combining warfarin with aspirin significantly increases the risk of bleeding, including gastrointestinal and intracranial hemorrhage.',
 'L''association warfarine-aspirine augmente significativement le risque hémorragique.',
 'Avoid combination unless specifically indicated. Monitor INR closely. Consider gastroprotection.'),

('warfarine', 'Coumadine', 'ibuprofene', 'Brufen', 'major', 'Increased bleeding risk',
 'NSAIDs increase anticoagulant effect of warfarin and risk of GI bleeding.',
 'Les AINS augmentent l''effet anticoagulant de la warfarine et le risque d''hémorragie digestive.',
 'Avoid if possible. Use paracetamol instead. If necessary, use lowest dose for shortest time.'),

-- ACE Inhibitors
('enalapril', 'Renitec', 'spironolactone', 'Aldactone', 'moderate', 'Hyperkalemia risk',
 'Both drugs can increase potassium levels. Combined use increases risk of dangerous hyperkalemia.',
 'Les deux médicaments augmentent le potassium. L''association augmente le risque d''hyperkaliémie.',
 'Monitor potassium levels regularly. Consider lower doses. Avoid in renal impairment.'),

('ramipril', 'Triatec', 'potassium', 'Potassium supplements', 'moderate', 'Hyperkalemia risk',
 'ACE inhibitors reduce potassium excretion. Adding potassium supplements increases hyperkalemia risk.',
 'Les IEC réduisent l''excrétion du potassium. Les suppléments augmentent le risque d''hyperkaliémie.',
 'Avoid potassium supplements unless hypokalemia documented. Monitor K+ levels.'),

-- Metformin
('metformine', 'Glucophage', 'iode contraste', 'Contrast media', 'major', 'Lactic acidosis risk',
 'Iodinated contrast can cause acute kidney injury, leading to metformin accumulation and lactic acidosis.',
 'Le produit de contraste peut causer une insuffisance rénale aiguë et une acidose lactique.',
 'Stop metformin 48h before contrast. Resume 48h after if renal function normal.'),

-- Statins
('simvastatine', 'Zocor', 'amiodarone', 'Cordarone', 'major', 'Myopathy/Rhabdomyolysis',
 'Amiodarone inhibits simvastatin metabolism, increasing risk of muscle toxicity.',
 'L''amiodarone inhibe le métabolisme de la simvastatine, augmentant le risque de myopathie.',
 'Limit simvastatin to 20mg daily. Consider pravastatin as alternative.'),

('atorvastatine', 'Tahor', 'clarithromycine', 'Zeclar', 'major', 'Myopathy risk',
 'Clarithromycin inhibits statin metabolism, increasing muscle toxicity risk.',
 'La clarithromycine inhibe le métabolisme des statines.',
 'Suspend statin during antibiotic course or use azithromycin instead.'),

-- Antibiotics
('ciprofloxacine', 'Ciflox', 'theophylline', 'Théostat', 'major', 'Theophylline toxicity',
 'Ciprofloxacin inhibits theophylline metabolism, causing toxicity (seizures, arrhythmias).',
 'La ciprofloxacine inhibe le métabolisme de la théophylline causant une toxicité.',
 'Reduce theophylline dose by 30-50%. Monitor levels. Consider alternative antibiotic.'),

('metronidazole', 'Flagyl', 'alcool', 'Alcohol', 'major', 'Disulfiram-like reaction',
 'Severe nausea, vomiting, flushing, headache when alcohol consumed with metronidazole.',
 'Réaction antabuse sévère avec nausées, vomissements, flush en cas de prise d''alcool.',
 'Avoid alcohol during treatment and 48h after. Warn patient explicitly.'),

-- Cardiac
('digoxine', 'Digoxine', 'amiodarone', 'Cordarone', 'major', 'Digoxin toxicity',
 'Amiodarone increases digoxin levels by 70-100%, risking toxicity.',
 'L''amiodarone augmente les taux de digoxine de 70-100%.',
 'Reduce digoxin dose by 50%. Monitor levels and for toxicity signs.'),

('digoxine', 'Digoxine', 'verapamil', 'Isoptine', 'major', 'Bradycardia/AV block',
 'Both drugs slow conduction. Risk of severe bradycardia and heart block.',
 'Les deux médicaments ralentissent la conduction cardiaque.',
 'Avoid combination. If necessary, monitor HR and ECG closely.'),

-- Antidepressants
('tramadol', 'Topalgic', 'paroxetine', 'Deroxat', 'major', 'Serotonin syndrome',
 'Risk of serotonin syndrome: agitation, hyperthermia, tremor, seizures.',
 'Risque de syndrome sérotoninergique: agitation, hyperthermie, tremblements.',
 'Avoid combination. Use alternative analgesic. Monitor for SS symptoms.'),

('fluoxetine', 'Prozac', 'tramadol', 'Topalgic', 'major', 'Serotonin syndrome/Seizures',
 'Increased risk of serotonin syndrome and lowered seizure threshold.',
 'Risque augmenté de syndrome sérotoninergique et de convulsions.',
 'Avoid if possible. If used, start with low tramadol dose and monitor.'),

-- Diabetes
('glibenclamide', 'Daonil', 'fluconazole', 'Triflucan', 'major', 'Severe hypoglycemia',
 'Fluconazole inhibits sulfonylurea metabolism, causing severe hypoglycemia.',
 'Le fluconazole inhibe le métabolisme des sulfamides hypoglycémiants.',
 'Reduce sulfonylurea dose. Increase glucose monitoring. Warn patient of symptoms.'),

-- Blood Pressure
('amlodipine', 'Amlor', 'simvastatine', 'Zocor', 'moderate', 'Increased statin levels',
 'Amlodipine increases simvastatin levels, raising myopathy risk.',
 'L''amlodipine augmente les taux de simvastatine.',
 'Limit simvastatin to 20mg daily with amlodipine.'),

-- Psychiatric
('lithium', 'Teralithe', 'ibuprofene', 'Brufen', 'major', 'Lithium toxicity',
 'NSAIDs reduce lithium excretion, causing accumulation and toxicity.',
 'Les AINS réduisent l''excrétion du lithium causant une accumulation.',
 'Avoid NSAIDs. Use paracetamol. If NSAID needed, monitor lithium levels closely.'),

-- Antiplatelet
('clopidogrel', 'Plavix', 'omeprazole', 'Mopral', 'moderate', 'Reduced antiplatelet effect',
 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation.',
 'L''oméprazole inhibe le CYP2C19, réduisant l''activation du clopidogrel.',
 'Use pantoprazole instead. If omeprazole needed, take 12h apart.'),

-- Thyroid
('levothyroxine', 'Levothyrox', 'calcium', 'Calcium carbonate', 'moderate', 'Reduced absorption',
 'Calcium reduces levothyroxine absorption by 20-25%.',
 'Le calcium réduit l''absorption de la lévothyroxine de 20-25%.',
 'Take levothyroxine 4 hours before or after calcium.'),

('levothyroxine', 'Levothyrox', 'fer', 'Iron supplements', 'moderate', 'Reduced absorption',
 'Iron reduces levothyroxine absorption significantly.',
 'Le fer réduit significativement l''absorption de la lévothyroxine.',
 'Separate doses by at least 4 hours. Take levothyroxine on empty stomach.'),

-- Corticosteroids
('prednisolone', 'Solupred', 'ibuprofene', 'Brufen', 'moderate', 'GI bleeding risk',
 'Both drugs increase risk of GI ulceration and bleeding.',
 'Les deux médicaments augmentent le risque d''ulcération et d''hémorragie digestive.',
 'Use gastroprotection (PPI). Monitor for GI symptoms. Use lowest effective doses.')

ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (doctors, pharmacists, labs)
CREATE POLICY "Authenticated users can read drug interactions"
  ON drug_interactions FOR SELECT
  TO authenticated
  USING (true);

-- Function to check interactions for a list of medications
CREATE OR REPLACE FUNCTION check_drug_interactions(medication_dcis TEXT[])
RETURNS TABLE (
  drug1 TEXT,
  drug2 TEXT,
  severity VARCHAR(20),
  description TEXT,
  management TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    di.drug1_dci,
    di.drug2_dci,
    di.severity,
    di.description,
    di.management
  FROM drug_interactions di
  WHERE 
    LOWER(di.drug1_dci) = ANY(SELECT LOWER(unnest(medication_dcis)))
    AND LOWER(di.drug2_dci) = ANY(SELECT LOWER(unnest(medication_dcis)))
    AND di.drug1_dci != di.drug2_dci
  ORDER BY 
    CASE di.severity 
      WHEN 'contraindicated' THEN 1 
      WHEN 'major' THEN 2 
      WHEN 'moderate' THEN 3 
      WHEN 'minor' THEN 4 
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE drug_interactions IS 'Drug-drug interaction database for prescription safety checking';

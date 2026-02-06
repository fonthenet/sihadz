-- Medical Records Schema for DZDoc Healthcare Platform
-- Includes: Lab Tests, Vaccines, Medications (Chifa), Digital Signatures, Templates

-- =====================================================
-- 1. CHIFA/CNAS MEDICATION DATABASE
-- =====================================================

-- Medications master database with reimbursement info
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_dci VARCHAR(50) UNIQUE, -- DCI code (Denomination Commune Internationale)
  commercial_name VARCHAR(255) NOT NULL,
  commercial_name_ar VARCHAR(255),
  dci_name VARCHAR(255), -- Generic name
  dci_name_ar VARCHAR(255),
  form VARCHAR(100), -- tablet, syrup, injection, etc.
  form_ar VARCHAR(100),
  dosage VARCHAR(100),
  manufacturer VARCHAR(255),
  country_of_origin VARCHAR(100),
  
  -- Chifa/CNAS Reimbursement
  is_chifa_listed BOOLEAN DEFAULT false,
  reimbursement_rate INTEGER DEFAULT 0, -- 0, 80, or 100 percent
  reimbursement_category VARCHAR(50), -- 'full', 'partial', 'none'
  tarif_reference DECIMAL(10,2), -- Reference price for reimbursement
  prix_public DECIMAL(10,2), -- Public price
  
  -- Classification
  therapeutic_class VARCHAR(255),
  therapeutic_class_ar VARCHAR(255),
  atc_code VARCHAR(20), -- Anatomical Therapeutic Chemical code
  is_generic BOOLEAN DEFAULT false,
  is_controlled BOOLEAN DEFAULT false, -- Requires special prescription
  requires_prescription BOOLEAN DEFAULT true,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  shortage_status VARCHAR(50), -- 'available', 'limited', 'shortage', 'discontinued'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster medication search
CREATE INDEX IF NOT EXISTS idx_medications_search ON medications USING gin(
  to_tsvector('french', COALESCE(commercial_name, '') || ' ' || COALESCE(dci_name, ''))
);
CREATE INDEX IF NOT EXISTS idx_medications_chifa ON medications(is_chifa_listed, reimbursement_category);

-- =====================================================
-- 2. LAB TESTS DATABASE
-- =====================================================

-- Lab test types catalog
CREATE TABLE IF NOT EXISTS lab_test_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  name_fr VARCHAR(255),
  category VARCHAR(100), -- hematology, biochemistry, microbiology, etc.
  category_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  
  -- Test details
  sample_type VARCHAR(100), -- blood, urine, stool, etc.
  sample_type_ar VARCHAR(100),
  fasting_required BOOLEAN DEFAULT false,
  fasting_hours INTEGER,
  preparation_instructions TEXT,
  preparation_instructions_ar TEXT,
  
  -- Results
  normal_range_male VARCHAR(100),
  normal_range_female VARCHAR(100),
  unit VARCHAR(50),
  
  -- Pricing & reimbursement
  base_price DECIMAL(10,2),
  is_chifa_covered BOOLEAN DEFAULT false,
  chifa_reimbursement_rate INTEGER DEFAULT 0,
  
  -- Popularity for suggestions
  order_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab test requests from doctors
CREATE TABLE IF NOT EXISTS lab_test_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE,
  
  -- Parties involved
  patient_id UUID REFERENCES profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  doctor_id UUID REFERENCES professionals(id), -- Unified provider architecture: doctors are in professionals table
  laboratory_id UUID REFERENCES professionals(id),
  appointment_id UUID REFERENCES appointments(id),
  
  -- Request details
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, received, in_progress, completed, cancelled
  priority VARCHAR(20) DEFAULT 'normal', -- urgent, normal, routine
  clinical_notes TEXT,
  clinical_notes_ar TEXT,
  diagnosis TEXT,
  diagnosis_ar TEXT,
  
  -- Timing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Chifa
  is_chifa_eligible BOOLEAN DEFAULT false,
  chifa_number VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual tests within a request
CREATE TABLE IF NOT EXISTS lab_test_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES lab_test_requests(id) ON DELETE CASCADE,
  test_type_id UUID REFERENCES lab_test_types(id),
  
  -- Results
  result_value VARCHAR(255),
  result_unit VARCHAR(50),
  result_status VARCHAR(50), -- normal, high, low, critical
  reference_range VARCHAR(100),
  
  -- Interpretation
  lab_notes TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  
  -- AI Analysis
  ai_interpretation TEXT,
  ai_interpretation_ar TEXT,
  ai_recommendations TEXT,
  ai_recommendations_ar TEXT,
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab results documents
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES lab_test_requests(id),
  patient_id UUID REFERENCES profiles(id),
  laboratory_id UUID REFERENCES professionals(id),
  
  -- Result document
  result_pdf_url TEXT,
  result_data JSONB, -- Structured result data
  
  -- Verification
  verified_by UUID, -- Lab technician
  verified_at TIMESTAMPTZ,
  
  -- Patient access
  viewed_by_patient BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  shared_with_doctor BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. VACCINES & IMMUNIZATION RECORDS
-- =====================================================

-- Vaccine catalog
CREATE TABLE IF NOT EXISTS vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  name_fr VARCHAR(255),
  
  -- Details
  manufacturer VARCHAR(255),
  type VARCHAR(100), -- live, inactivated, mRNA, etc.
  disease_prevention VARCHAR(255),
  disease_prevention_ar VARCHAR(255),
  
  -- Schedule
  recommended_age VARCHAR(100),
  dose_count INTEGER DEFAULT 1,
  dose_interval_days INTEGER,
  booster_interval_years INTEGER,
  
  -- Availability
  is_mandatory BOOLEAN DEFAULT false, -- Required by Algerian law
  is_free BOOLEAN DEFAULT false, -- Free in public health centers
  is_available BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient vaccination records
CREATE TABLE IF NOT EXISTS vaccination_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  vaccine_id UUID REFERENCES vaccines(id),
  
  -- Administration
  administered_by UUID, -- Doctor or nurse
  administered_at_facility VARCHAR(255),
  administered_date DATE NOT NULL,
  dose_number INTEGER DEFAULT 1,
  lot_number VARCHAR(100),
  
  -- Next dose
  next_dose_date DATE,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  certificate_url TEXT,
  
  -- Side effects
  side_effects TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. DOCTOR TEMPLATES & DIGITAL SIGNATURES
-- =====================================================

-- Doctor digital signatures
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  
  -- Signature data
  signature_image_url TEXT,
  signature_svg TEXT, -- SVG path data
  stamp_image_url TEXT, -- Doctor's stamp
  
  -- Verification
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription templates
CREATE TABLE IF NOT EXISTS prescription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  
  -- Template content
  header_text TEXT, -- Custom header
  header_text_ar TEXT,
  footer_text TEXT, -- Custom footer/instructions
  footer_text_ar TEXT,
  
  -- Styling
  template_style VARCHAR(50) DEFAULT 'classic', -- classic, modern, minimal
  include_logo BOOLEAN DEFAULT true,
  include_signature BOOLEAN DEFAULT true,
  include_stamp BOOLEAN DEFAULT true,
  include_qr_code BOOLEAN DEFAULT true,
  
  -- Default medications for this template
  default_medications JSONB,
  
  -- Common diagnosis/condition this template is for
  condition_category VARCHAR(100),
  
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical certificates/notices
CREATE TABLE IF NOT EXISTS medical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(50) UNIQUE,
  
  -- Parties
  patient_id UUID REFERENCES profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  doctor_id UUID REFERENCES doctors(id),
  appointment_id UUID REFERENCES appointments(id),
  
  -- Certificate type
  certificate_type VARCHAR(100), -- sick_leave, fitness, medical_report, etc.
  
  -- Content
  diagnosis TEXT,
  diagnosis_ar TEXT,
  recommendations TEXT,
  recommendations_ar TEXT,
  
  -- Sick leave specific
  start_date DATE,
  end_date DATE,
  days_count INTEGER,
  
  -- Document
  pdf_url TEXT,
  is_signed BOOLEAN DEFAULT false,
  signature_id UUID REFERENCES digital_signatures(id),
  
  -- QR verification
  qr_code TEXT,
  verification_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. PROFESSIONAL MESSAGING (Extended)
-- =====================================================

-- Professional conversations (doctor-lab, doctor-pharmacy, etc.)
CREATE TABLE IF NOT EXISTS professional_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants (can be any professional type)
  participant_1_id UUID NOT NULL,
  participant_1_type VARCHAR(50), -- doctor, pharmacy, laboratory, clinic
  participant_2_id UUID NOT NULL,
  participant_2_type VARCHAR(50),
  
  -- Context
  related_patient_id UUID REFERENCES profiles(id),
  related_prescription_id UUID REFERENCES prescriptions(id),
  related_lab_request_id UUID REFERENCES lab_test_requests(id),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_1 INTEGER DEFAULT 0,
  unread_count_2 INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Professional messages
CREATE TABLE IF NOT EXISTS professional_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES professional_conversations(id) ON DELETE CASCADE,
  
  sender_id UUID NOT NULL,
  sender_type VARCHAR(50),
  
  -- Content
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, document, lab_result, prescription
  
  -- Attachments
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  attachment_name VARCHAR(255),
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. HEALTH SHARING & PERMISSIONS
-- =====================================================

-- Data sharing permissions
CREATE TABLE IF NOT EXISTS health_data_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner of the data
  patient_id UUID REFERENCES profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  
  -- Who has access
  shared_with_id UUID NOT NULL,
  shared_with_type VARCHAR(50), -- doctor, pharmacy, laboratory, family_member
  
  -- What is shared
  share_type VARCHAR(50), -- full_access, prescriptions_only, lab_results_only, vaccines_only
  
  -- Duration
  is_permanent BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, revoked, expired
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. AI ANALYSIS HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_health_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  
  -- What was analyzed
  analysis_type VARCHAR(50), -- lab_result, symptoms, medication_interaction
  source_id UUID, -- ID of lab_result, etc.
  
  -- AI Response
  analysis_result TEXT,
  analysis_result_ar TEXT,
  recommendations TEXT,
  recommendations_ar TEXT,
  risk_level VARCHAR(20), -- low, medium, high, critical
  
  -- Disclaimer shown
  disclaimer_accepted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_health_analyses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Medications: Public read
CREATE POLICY "medications_select_all" ON medications FOR SELECT USING (true);

-- Lab test types: Public read
CREATE POLICY "lab_test_types_select_all" ON lab_test_types FOR SELECT USING (true);

-- Lab test requests: Own access
CREATE POLICY "lab_requests_select_own" ON lab_test_requests FOR SELECT 
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "lab_requests_insert_doctor" ON lab_test_requests FOR INSERT 
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Lab results: Own access
CREATE POLICY "lab_results_select_own" ON lab_results FOR SELECT 
  USING (patient_id = auth.uid());

-- Vaccines: Public read
CREATE POLICY "vaccines_select_all" ON vaccines FOR SELECT USING (true);

-- Vaccination records: Own access
CREATE POLICY "vaccination_records_select_own" ON vaccination_records FOR SELECT 
  USING (patient_id = auth.uid() OR family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "vaccination_records_insert_own" ON vaccination_records FOR INSERT 
  WITH CHECK (patient_id = auth.uid() OR family_member_id IN (SELECT id FROM family_members WHERE user_id = auth.uid()));

-- Digital signatures: Doctor's own
CREATE POLICY "digital_signatures_own" ON digital_signatures FOR ALL 
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Prescription templates: Doctor's own
CREATE POLICY "prescription_templates_own" ON prescription_templates FOR ALL 
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Medical certificates: Own access
CREATE POLICY "medical_certificates_select" ON medical_certificates FOR SELECT 
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Professional conversations: Participants only
CREATE POLICY "prof_conversations_select" ON professional_conversations FOR SELECT 
  USING (
    participant_1_id = auth.uid() OR 
    participant_2_id = auth.uid() OR
    participant_1_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
    participant_2_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- Professional messages: Conversation participants
CREATE POLICY "prof_messages_select" ON professional_messages FOR SELECT 
  USING (conversation_id IN (SELECT id FROM professional_conversations WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()));

-- Health data shares: Own data
CREATE POLICY "health_shares_own" ON health_data_shares FOR ALL 
  USING (patient_id = auth.uid());

-- AI analyses: Own access
CREATE POLICY "ai_analyses_own" ON ai_health_analyses FOR ALL 
  USING (patient_id = auth.uid());

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_test_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_doctor ON lab_test_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_test_requests(status);
CREATE INDEX IF NOT EXISTS idx_vaccination_patient ON vaccination_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_family ON vaccination_records(family_member_id);
CREATE INDEX IF NOT EXISTS idx_prof_conv_participants ON professional_conversations(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_prof_messages_conv ON professional_messages(conversation_id);

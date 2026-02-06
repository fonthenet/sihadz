-- =====================================================
-- HEALTHCARE ECOSYSTEM EXTENSIONS
-- Add ecosystem features without conflicting with existing tables
-- =====================================================

-- =====================================================
-- 1. REFERRAL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_number VARCHAR(50) UNIQUE DEFAULT ('REF-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  
  -- Who is referring
  referring_doctor_id UUID NOT NULL REFERENCES professionals(id),
  
  -- Who is being referred to
  referred_to_doctor_id UUID REFERENCES professionals(id),
  referred_to_specialty VARCHAR(100),
  
  -- Patient
  patient_id UUID NOT NULL REFERENCES profiles(id),
  patient_name VARCHAR(255),
  patient_phone VARCHAR(50),
  
  -- Referral details
  reason TEXT NOT NULL,
  reason_ar TEXT,
  clinical_history TEXT,
  diagnosis TEXT,
  urgency VARCHAR(20) DEFAULT 'routine', -- emergency, urgent, routine
  
  -- Attachments (medical records, previous results)
  attachments JSONB DEFAULT '[]',
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, completed, expired
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  completed_at TIMESTAMPTZ,
  
  -- Resulting appointment
  appointment_id UUID REFERENCES appointments(id),
  
  -- Notes from receiving doctor
  receiving_notes TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. MEDICAL RECORDS SHARING
-- =====================================================

CREATE TABLE IF NOT EXISTS medical_record_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Owner
  patient_id UUID NOT NULL REFERENCES profiles(id),
  
  -- What is shared
  share_scope VARCHAR(50) NOT NULL, -- full, prescriptions, lab_results, appointments, specific
  specific_record_ids JSONB DEFAULT '[]',
  
  -- Who can access
  shared_with_id UUID,
  shared_with_type VARCHAR(50),
  shared_with_email VARCHAR(255),
  
  -- Access control
  access_type VARCHAR(50) DEFAULT 'view',
  pin_code VARCHAR(10),
  
  -- Validity
  is_active BOOLEAN DEFAULT true,
  max_access_count INTEGER,
  access_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  
  -- Audit
  last_accessed_at TIMESTAMPTZ,
  accessed_by JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- =====================================================
-- 3. PRESCRIPTION TRANSFER SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS prescription_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  prescription_id UUID REFERENCES prescriptions(id),
  
  -- From pharmacy
  from_pharmacy_id UUID NOT NULL REFERENCES professionals(id),
  from_pharmacy_name VARCHAR(255),
  
  -- To pharmacy
  to_pharmacy_id UUID NOT NULL REFERENCES professionals(id),
  to_pharmacy_name VARCHAR(255),
  
  -- Reason
  transfer_reason VARCHAR(100),
  notes TEXT,
  
  -- Which medications are being transferred
  transferred_medications JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. LAB RESULT SHARING WITH DOCTORS
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_result_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lab_request_id UUID REFERENCES lab_test_requests(id),
  
  -- From (patient or laboratory)
  shared_by_id UUID NOT NULL,
  shared_by_type VARCHAR(50),
  
  -- To doctor
  shared_with_doctor_id UUID NOT NULL REFERENCES professionals(id),
  
  -- Access
  can_download BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  
  -- Doctor's feedback
  doctor_notes TEXT,
  doctor_reviewed_at TIMESTAMPTZ,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. APPOINTMENT NOTES & FOLLOW-UPS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Author
  created_by_id UUID NOT NULL,
  created_by_type VARCHAR(50),
  
  -- Content
  note_type VARCHAR(50) DEFAULT 'general',
  content TEXT NOT NULL,
  content_ar TEXT,
  
  -- Visibility
  is_visible_to_patient BOOLEAN DEFAULT true,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original appointment
  original_appointment_id UUID REFERENCES appointments(id),
  
  -- Patient and doctor
  patient_id UUID NOT NULL REFERENCES profiles(id),
  doctor_id UUID NOT NULL REFERENCES professionals(id),
  
  -- Schedule
  recommended_date DATE,
  recommended_within_days INTEGER,
  reason TEXT,
  
  -- Reminders
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_appointment_id UUID REFERENCES appointments(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. EMERGENCY ALERTS
-- =====================================================

CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who triggered
  triggered_by_id UUID NOT NULL,
  triggered_by_type VARCHAR(50),
  
  -- Patient
  patient_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  
  -- Alert details
  alert_type VARCHAR(50),
  description TEXT,
  
  -- Who was notified
  notified_contacts JSONB DEFAULT '[]',
  notified_ambulance BOOLEAN DEFAULT false,
  ambulance_id UUID,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Channels
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  
  -- Types
  appointment_reminders BOOLEAN DEFAULT true,
  prescription_updates BOOLEAN DEFAULT true,
  lab_results BOOLEAN DEFAULT true,
  messages BOOLEAN DEFAULT true,
  promotional BOOLEAN DEFAULT false,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  -- Language preference
  preferred_language VARCHAR(10) DEFAULT 'ar',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. AUDIT LOG FOR MEDICAL RECORDS
-- =====================================================

CREATE TABLE IF NOT EXISTS medical_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was accessed
  record_type VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  
  -- Who accessed
  accessed_by_id UUID NOT NULL,
  accessed_by_type VARCHAR(50),
  accessed_by_name VARCHAR(255),
  
  -- Action
  action VARCHAR(50) NOT NULL,
  
  -- Details
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. PROVIDER NETWORK / CONNECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who is connecting
  provider_id UUID NOT NULL REFERENCES professionals(id),
  provider_type VARCHAR(50) NOT NULL,
  
  -- Who they're connecting with
  connected_to_id UUID NOT NULL REFERENCES professionals(id),
  connected_to_type VARCHAR(50) NOT NULL,
  
  -- Connection details
  connection_type VARCHAR(50) DEFAULT 'preferred',
  notes TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_id, connected_to_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_referrals_referring ON referrals(referring_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_to_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_shares_patient ON medical_record_shares(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_shares_token ON medical_record_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON follow_ups(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON medical_audit_log(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_provider_connections ON provider_connections(provider_id, provider_type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_result_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;

-- Referrals: Involved parties can view
DROP POLICY IF EXISTS "referrals_view" ON referrals;
CREATE POLICY "referrals_view" ON referrals FOR SELECT
  USING (
    referring_doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()) OR
    referred_to_doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()) OR
    patient_id = auth.uid()
  );

-- Medical shares: Owner can manage
DROP POLICY IF EXISTS "medical_shares_owner" ON medical_record_shares;
CREATE POLICY "medical_shares_owner" ON medical_record_shares FOR ALL
  USING (patient_id = auth.uid());

-- Notification preferences: Own preferences
DROP POLICY IF EXISTS "notification_prefs_own" ON notification_preferences;
CREATE POLICY "notification_prefs_own" ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Provider connections: Own connections
DROP POLICY IF EXISTS "provider_connections_own" ON provider_connections;
CREATE POLICY "provider_connections_own" ON provider_connections FOR ALL
  USING (
    provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()) OR
    connected_to_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

COMMIT;

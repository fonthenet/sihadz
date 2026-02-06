-- =====================================================
-- DZDoc Healthcare Ecosystem - Government Grade Schema
-- Complete Ticketing & Workflow System
-- Version 2.0
-- =====================================================

-- =====================================================
-- 1. HEALTHCARE TICKETS (Central Hub)
-- Every interaction creates a ticket that all parties can access
-- =====================================================

CREATE TABLE IF NOT EXISTS healthcare_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL, -- Format: TKT-YYYYMMDD-XXXXX
  
  -- Ticket Type
  ticket_type VARCHAR(50) NOT NULL, -- appointment, prescription, lab_request, referral, emergency
  
  -- Core Parties (always present)
  patient_id UUID NOT NULL,
  patient_name VARCHAR(255),
  patient_phone VARCHAR(50),
  patient_chifa_number VARCHAR(50),
  
  -- Primary Provider (doctor/clinic who initiated)
  primary_provider_id UUID,
  primary_provider_type VARCHAR(50), -- doctor, clinic
  primary_provider_name VARCHAR(255),
  
  -- Secondary Provider (pharmacy/lab who fulfills)
  secondary_provider_id UUID,
  secondary_provider_type VARCHAR(50), -- pharmacy, laboratory
  secondary_provider_name VARCHAR(255),
  
  -- Linked Records
  appointment_id UUID,
  prescription_id UUID,
  lab_request_id UUID,
  referral_id UUID,
  
  -- Status Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'created',
  -- Statuses: created, pending, confirmed, in_progress, ready, completed, cancelled, expired
  status_history JSONB DEFAULT '[]',
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- emergency, urgent, normal, routine
  
  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending', 
  -- pending, awaiting_payment, paid_online, paid_cash, paid_chifa, refunded
  payment_method VARCHAR(50), -- cash, card, mobile, chifa
  payment_amount DECIMAL(10,2),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMPTZ,
  
  -- Timeline
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Cancellation
  cancelled_by UUID,
  cancellation_reason TEXT,
  
  -- Notes
  patient_notes TEXT,
  provider_notes TEXT,
  internal_notes TEXT,
  
  -- QR Code
  qr_code_data TEXT,
  verification_code VARCHAR(10),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_patient ON healthcare_tickets(patient_id);
CREATE INDEX IF NOT EXISTS idx_tickets_primary_provider ON healthcare_tickets(primary_provider_id);
CREATE INDEX IF NOT EXISTS idx_tickets_secondary_provider ON healthcare_tickets(secondary_provider_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON healthcare_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON healthcare_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON healthcare_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON healthcare_tickets(created_at DESC);

-- =====================================================
-- 2. TICKET TIMELINE (Audit Trail)
-- Every action is logged
-- =====================================================

CREATE TABLE IF NOT EXISTS ticket_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES healthcare_tickets(id) ON DELETE CASCADE,
  
  -- Action
  action VARCHAR(100) NOT NULL, -- status_change, note_added, payment_received, etc.
  action_description TEXT,
  action_description_ar TEXT,
  
  -- Who did it
  actor_id UUID,
  actor_type VARCHAR(50), -- patient, doctor, pharmacy, laboratory, system
  actor_name VARCHAR(255),
  
  -- What changed
  previous_value TEXT,
  new_value TEXT,
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_ticket ON ticket_timeline(ticket_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON ticket_timeline(created_at DESC);

-- =====================================================
-- 3. TICKET MESSAGES (Communication Hub)
-- All parties can communicate on a ticket
-- =====================================================

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES healthcare_tickets(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id UUID NOT NULL,
  sender_type VARCHAR(50) NOT NULL, -- patient, doctor, pharmacy, laboratory
  sender_name VARCHAR(255),
  
  -- Message
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, document, prescription_update, lab_result
  content TEXT NOT NULL,
  
  -- Attachments
  attachments JSONB DEFAULT '[]', -- [{name, url, type, size}]
  
  -- Visibility
  visibility VARCHAR(50) DEFAULT 'all', -- all, providers_only, patient_provider
  
  -- Status
  is_read_by_patient BOOLEAN DEFAULT FALSE,
  is_read_by_primary BOOLEAN DEFAULT FALSE,
  is_read_by_secondary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON ticket_messages(created_at DESC);

-- =====================================================
-- 4. PROVIDER NETWORK (Preferred Providers)
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The provider who has the network
  provider_id UUID NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  
  -- The connected provider
  connected_provider_id UUID NOT NULL,
  connected_provider_type VARCHAR(50) NOT NULL,
  
  -- Relationship
  relationship_type VARCHAR(50) DEFAULT 'preferred', -- preferred, affiliated, contracted, nearby
  
  -- Notes
  notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_id, connected_provider_id)
);

CREATE INDEX IF NOT EXISTS idx_network_provider ON provider_network(provider_id);
CREATE INDEX IF NOT EXISTS idx_network_connected ON provider_network(connected_provider_id);

-- =====================================================
-- 5. PATIENT PREFERRED PROVIDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_preferred_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  
  provider_id UUID NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- doctor, pharmacy, laboratory
  
  -- Preference level
  is_primary BOOLEAN DEFAULT FALSE,
  preference_order INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(patient_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_prefs_patient ON patient_preferred_providers(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_prefs_provider ON patient_preferred_providers(provider_id);

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  date_part VARCHAR(8);
  seq_part VARCHAR(5);
  new_number VARCHAR(20);
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get next sequence for today
  SELECT LPAD((COALESCE(MAX(SUBSTRING(ticket_number FROM 13 FOR 5)::INTEGER), 0) + 1)::TEXT, 5, '0')
  INTO seq_part
  FROM healthcare_tickets
  WHERE ticket_number LIKE 'TKT-' || date_part || '-%';
  
  new_number := 'TKT-' || date_part || '-' || seq_part;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate pickup code
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS VARCHAR(6) AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Function to add timeline entry
CREATE OR REPLACE FUNCTION add_ticket_timeline(
  p_ticket_id UUID,
  p_action VARCHAR(100),
  p_description TEXT,
  p_description_ar TEXT,
  p_actor_id UUID,
  p_actor_type VARCHAR(50),
  p_actor_name VARCHAR(255),
  p_previous_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  entry_id UUID;
BEGIN
  INSERT INTO ticket_timeline (
    ticket_id, action, action_description, action_description_ar,
    actor_id, actor_type, actor_name,
    previous_value, new_value, metadata
  ) VALUES (
    p_ticket_id, p_action, p_description, p_description_ar,
    p_actor_id, p_actor_type, p_actor_name,
    p_previous_value, p_new_value, p_metadata
  ) RETURNING id INTO entry_id;
  
  RETURN entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE healthcare_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_preferred_providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tickets_patient_select" ON healthcare_tickets;
DROP POLICY IF EXISTS "tickets_provider_select" ON healthcare_tickets;
DROP POLICY IF EXISTS "tickets_insert" ON healthcare_tickets;
DROP POLICY IF EXISTS "tickets_update" ON healthcare_tickets;
DROP POLICY IF EXISTS "timeline_select" ON ticket_timeline;
DROP POLICY IF EXISTS "timeline_insert" ON ticket_timeline;
DROP POLICY IF EXISTS "messages_select" ON ticket_messages;
DROP POLICY IF EXISTS "messages_insert" ON ticket_messages;
DROP POLICY IF EXISTS "network_own" ON provider_network;
DROP POLICY IF EXISTS "patient_prefs_own" ON patient_preferred_providers;

-- Patients can see their own tickets
CREATE POLICY "tickets_patient_select" ON healthcare_tickets 
FOR SELECT USING (patient_id = auth.uid());

-- Providers can see tickets they're involved in
CREATE POLICY "tickets_provider_select" ON healthcare_tickets 
FOR SELECT USING (
  primary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR secondary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

-- Anyone can insert tickets (will be validated by app logic)
CREATE POLICY "tickets_insert" ON healthcare_tickets 
FOR INSERT WITH CHECK (true);

-- Anyone involved can update tickets
CREATE POLICY "tickets_update" ON healthcare_tickets 
FOR UPDATE USING (
  patient_id = auth.uid()
  OR primary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR secondary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

-- Timeline visible to ticket parties
CREATE POLICY "timeline_select" ON ticket_timeline 
FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM healthcare_tickets 
    WHERE patient_id = auth.uid()
    OR primary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR secondary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
);

-- Timeline can be inserted by anyone (system use)
CREATE POLICY "timeline_insert" ON ticket_timeline 
FOR INSERT WITH CHECK (true);

-- Messages visible to ticket parties
CREATE POLICY "messages_select" ON ticket_messages 
FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM healthcare_tickets 
    WHERE patient_id = auth.uid()
    OR primary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR secondary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
);

-- Messages can be inserted by ticket parties
CREATE POLICY "messages_insert" ON ticket_messages 
FOR INSERT WITH CHECK (
  ticket_id IN (
    SELECT id FROM healthcare_tickets 
    WHERE patient_id = auth.uid()
    OR primary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR secondary_provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
);

-- Provider network - own access
CREATE POLICY "network_own" ON provider_network 
FOR ALL USING (
  provider_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
);

-- Patient preferences - own access
CREATE POLICY "patient_prefs_own" ON patient_preferred_providers 
FOR ALL USING (patient_id = auth.uid());

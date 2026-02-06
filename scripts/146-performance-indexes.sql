-- Performance optimization indexes
-- Created to address slow queries identified in performance audit

-- ============================================
-- CHAT SYSTEM INDEXES
-- ============================================

-- Composite index for thread member lookups (very frequent)
CREATE INDEX IF NOT EXISTS idx_chat_thread_members_thread_user_active 
  ON chat_thread_members(thread_id, user_id) 
  WHERE left_at IS NULL;

-- Index for last read message joins
CREATE INDEX IF NOT EXISTS idx_chat_thread_members_last_read 
  ON chat_thread_members(last_read_message_id) 
  WHERE last_read_message_id IS NOT NULL;

-- Composite index for message queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_active_created 
  ON chat_messages(thread_id, created_at DESC) 
  WHERE is_deleted = false;

-- Index for reply chains
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to 
  ON chat_messages(reply_to_message_id) 
  WHERE reply_to_message_id IS NOT NULL;

-- Index for message delete lookups
CREATE INDEX IF NOT EXISTS idx_chat_message_deletes_user_message 
  ON chat_message_deletes(user_id, message_id);

-- ============================================
-- HEALTHCARE TICKETS INDEXES
-- ============================================

-- Patient ticket lookups (dashboard view)
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_patient_status_created 
  ON healthcare_tickets(patient_id, status, created_at DESC);

-- Primary provider ticket lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_primary_provider 
  ON healthcare_tickets(primary_provider_id, status, created_at DESC) 
  WHERE primary_provider_id IS NOT NULL;

-- Secondary provider ticket lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_secondary_provider 
  ON healthcare_tickets(secondary_provider_id, status, created_at DESC) 
  WHERE secondary_provider_id IS NOT NULL;

-- Ticket number lookups (unique identifier searches)
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_ticket_number 
  ON healthcare_tickets(ticket_number);

-- Appointment-based ticket lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_appointment 
  ON healthcare_tickets(appointment_id) 
  WHERE appointment_id IS NOT NULL;

-- Prescription-based ticket lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_prescription 
  ON healthcare_tickets(prescription_id) 
  WHERE prescription_id IS NOT NULL;

-- Lab request-based ticket lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_tickets_lab_request 
  ON healthcare_tickets(lab_request_id) 
  WHERE lab_request_id IS NOT NULL;

-- Ticket messages ordering
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
  ON ticket_messages(ticket_id, created_at);

-- Ticket entries ordering (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_entries') THEN
    CREATE INDEX IF NOT EXISTS idx_ticket_entries_ticket_created 
      ON ticket_entries(ticket_id, created_at);
  END IF;
END $$;

-- ============================================
-- APPOINTMENTS INDEXES
-- ============================================

-- Patient appointment list (dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
  ON appointments(patient_id, appointment_date DESC);

-- Doctor schedule lookups
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_time 
  ON appointments(doctor_id, appointment_date, appointment_time) 
  WHERE doctor_id IS NOT NULL;

-- Doctor appointments by status
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status_date 
  ON appointments(doctor_id, status, appointment_date DESC) 
  WHERE doctor_id IS NOT NULL;

-- Family member appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointments_family_member 
  ON appointments(family_member_id) 
  WHERE family_member_id IS NOT NULL;

-- Professional appointments (clinic, pharmacy, lab) - if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'professional_id') THEN
    CREATE INDEX IF NOT EXISTS idx_appointments_professional_date 
      ON appointments(professional_id, appointment_date DESC) 
      WHERE professional_id IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- PRESCRIPTIONS INDEXES
-- ============================================

-- Patient prescription list
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created 
  ON prescriptions(patient_id, created_at DESC);

-- Doctor prescription list
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_created 
  ON prescriptions(doctor_id, created_at DESC);

-- Appointment-linked prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment 
  ON prescriptions(appointment_id) 
  WHERE appointment_id IS NOT NULL;

-- Pharmacy prescription queue
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_status_created 
  ON prescriptions(pharmacy_id, status, created_at DESC) 
  WHERE pharmacy_id IS NOT NULL;

-- ============================================
-- LAB REQUESTS INDEXES
-- ============================================

-- Patient lab request list
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient_created 
  ON lab_test_requests(patient_id, created_at DESC);

-- Doctor lab request list
CREATE INDEX IF NOT EXISTS idx_lab_requests_doctor_created 
  ON lab_test_requests(doctor_id, created_at DESC);

-- Appointment-linked lab requests
CREATE INDEX IF NOT EXISTS idx_lab_requests_appointment 
  ON lab_test_requests(appointment_id) 
  WHERE appointment_id IS NOT NULL;

-- Laboratory queue
CREATE INDEX IF NOT EXISTS idx_lab_requests_laboratory_status 
  ON lab_test_requests(laboratory_id, status, created_at DESC) 
  WHERE laboratory_id IS NOT NULL;

-- ============================================
-- PROFESSIONALS INDEXES
-- ============================================

-- Auth user to professional lookup
CREATE INDEX IF NOT EXISTS idx_professionals_auth_user_type 
  ON professionals(auth_user_id, type) 
  WHERE auth_user_id IS NOT NULL;

-- Active verified professionals by type (home page listings)
CREATE INDEX IF NOT EXISTS idx_professionals_type_active_verified 
  ON professionals(type, is_active, is_verified) 
  WHERE is_active = true AND is_verified = true;

-- Wilaya-based professional search
CREATE INDEX IF NOT EXISTS idx_professionals_wilaya_type 
  ON professionals(wilaya, type) 
  WHERE is_active = true;

-- ============================================
-- NOTIFICATIONS INDEXES
-- ============================================

-- User notification list (unread first)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- PROFILES INDEXES
-- ============================================

-- Wilaya-based profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wilaya 
  ON profiles(default_wilaya_code) 
  WHERE default_wilaya_code IS NOT NULL;

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE chat_thread_members;
ANALYZE chat_messages;
ANALYZE chat_message_deletes;
ANALYZE healthcare_tickets;
ANALYZE ticket_messages;
-- ANALYZE ticket_entries; -- Skipped: table may not exist
ANALYZE appointments;
ANALYZE prescriptions;
ANALYZE lab_test_requests;
ANALYZE professionals;
ANALYZE notifications;
ANALYZE profiles;

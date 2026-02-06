-- ============================================================================
-- LINK PROFESSIONAL SERVICES TO POS + APPOINTMENT/TICKET INTEGRATION
-- Run with: npm run db:run -- scripts/081-pos-services-link.sql
-- ============================================================================

-- ============================================================================
-- 1. Add service_id to sale items (links to professional_services catalog)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_pos_sale_items' AND column_name = 'service_id') THEN
    ALTER TABLE professional_pos_sale_items 
      ADD COLUMN service_id UUID REFERENCES professional_services(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pro_pos_sale_items_service ON professional_pos_sale_items(service_id);

COMMENT ON COLUMN professional_pos_sale_items.service_id IS 'Links to professional_services catalog (optional - NULL for manual entries)';

-- ============================================================================
-- 2. Add appointment_id + patient_id to POS sales (ticket integration)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_pos_sales' AND column_name = 'appointment_id') THEN
    ALTER TABLE professional_pos_sales 
      ADD COLUMN appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_pos_sales' AND column_name = 'patient_id') THEN
    ALTER TABLE professional_pos_sales 
      ADD COLUMN patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pro_pos_sales_appointment ON professional_pos_sales(appointment_id);
CREATE INDEX IF NOT EXISTS idx_pro_pos_sales_patient ON professional_pos_sales(patient_id);

COMMENT ON COLUMN professional_pos_sales.appointment_id IS 'Links to appointment/ticket for billing (doctor, clinic, etc.)';
COMMENT ON COLUMN professional_pos_sales.patient_id IS 'Patient being billed (from appointment or standalone walk-in)';

-- ============================================================================
-- 3. Add payment_status to appointments (to track if paid via POS)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'payment_status') THEN
    ALTER TABLE appointments 
      ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'pos_sale_id') THEN
    ALTER TABLE appointments 
      ADD COLUMN pos_sale_id UUID;
  END IF;
END $$;

COMMENT ON COLUMN appointments.payment_status IS 'Payment status: pending, paid, partial, waived';
COMMENT ON COLUMN appointments.pos_sale_id IS 'Links to professional_pos_sales when paid via POS';

-- ============================================================================
-- 4. Add is_chifa_eligible to professional_services for Chifa integration
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_services' AND column_name = 'is_chifa_eligible') THEN
    ALTER TABLE professional_services 
      ADD COLUMN is_chifa_eligible BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_services' AND column_name = 'chifa_reimbursement_rate') THEN
    ALTER TABLE professional_services 
      ADD COLUMN chifa_reimbursement_rate INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_services' AND column_name = 'category') THEN
    ALTER TABLE professional_services 
      ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
END $$;

COMMENT ON COLUMN professional_services.is_chifa_eligible IS 'Service is eligible for CNAS/Chifa reimbursement';
COMMENT ON COLUMN professional_services.chifa_reimbursement_rate IS 'Reimbursement rate (0, 80, 100)';
COMMENT ON COLUMN professional_services.category IS 'Service category: consultation, procedure, lab_test, imaging, therapy, etc.';

-- ============================================================================
-- 5. Function to get appointment billing info for POS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_appointment_for_pos(p_appointment_id UUID)
RETURNS TABLE (
  appointment_id UUID,
  patient_id UUID,
  patient_name TEXT,
  patient_phone TEXT,
  appointment_date DATE,
  visit_type TEXT,
  service_id UUID,
  service_name TEXT,
  service_price DECIMAL,
  professional_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id AS appointment_id,
    a.patient_id,
    COALESCE(p.full_name, 'Walk-in Patient') AS patient_name,
    p.phone AS patient_phone,
    a.appointment_date,
    a.visit_type,
    s.id AS service_id,
    COALESCE(s.service_name, a.visit_type) AS service_name,
    COALESCE(s.price, 0) AS service_price,
    a.doctor_id AS professional_id
  FROM appointments a
  LEFT JOIN profiles p ON p.id = a.patient_id
  LEFT JOIN professional_services s ON s.service_name = a.visit_type 
    AND s.professional_id = a.doctor_id
    AND s.is_active = TRUE
  WHERE a.id = p_appointment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_appointment_for_pos IS 'Get appointment details pre-filled for POS checkout';

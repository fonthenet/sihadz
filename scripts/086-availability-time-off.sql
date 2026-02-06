-- ============================================================================
-- PROVIDER AVAILABILITY & TIME-OFF MANAGEMENT
-- ============================================================================
-- Comprehensive availability system with:
-- - Time-off requests with approval workflow
-- - Enhanced professional availability (normalize working_hours)
-- - Blocked slots for specific times
-- - Support for recurring schedules and exceptions
-- ============================================================================

-- ============================================================================
-- TIME-OFF REQUESTS (Leave/Holiday management with approval)
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Request info
  request_type TEXT NOT NULL CHECK (request_type IN (
    'vacation', 'sick_leave', 'personal', 'training', 
    'conference', 'emergency', 'maternity', 'other'
  )),
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  all_day BOOLEAN DEFAULT TRUE,
  start_time TIME,  -- If not all_day
  end_time TIME,    -- If not all_day
  
  -- Reason
  reason TEXT,
  
  -- Status workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'cancelled'
  )),
  
  -- Approval
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Requestor (can be owner or employee)
  requested_by UUID NOT NULL,
  requested_by_name TEXT NOT NULL,
  is_employee_request BOOLEAN DEFAULT FALSE,
  employee_id UUID REFERENCES professional_employees(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_time_range CHECK (
    all_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_professional 
  ON time_off_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates 
  ON time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status 
  ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee 
  ON time_off_requests(employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- BLOCKED SLOTS (Single-slot blocks, e.g., breaks, meetings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- When
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Reason
  reason TEXT,
  block_type TEXT DEFAULT 'manual' CHECK (block_type IN (
    'manual', 'break', 'meeting', 'lunch', 'prayer', 'other'
  )),
  
  -- Recurring (optional)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,  -- e.g., 'weekly:monday,wednesday'
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_professional 
  ON blocked_slots(professional_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date 
  ON blocked_slots(slot_date);

-- ============================================================================
-- SERVICE DURATIONS (Different slot durations per service type)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_durations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Service info
  service_name TEXT NOT NULL,
  service_name_ar TEXT,
  service_type TEXT,  -- consultation, followup, procedure, etc.
  
  -- Duration in minutes
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes INTEGER DEFAULT 0,  -- Gap between appointments
  
  -- Pricing (optional)
  price DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_durations_professional 
  ON service_durations(professional_id);

-- ============================================================================
-- HELPER: Get available slots for a professional on a date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id UUID,
  p_date DATE,
  p_slot_duration INTEGER DEFAULT 30  -- minutes
) RETURNS TABLE (
  slot_start TIME,
  slot_end TIME,
  is_available BOOLEAN
) AS $$
DECLARE
  v_day_of_week TEXT;
  v_working_hours JSONB;
  v_day_schedule JSONB;
  v_open_time TIME;
  v_close_time TIME;
  v_current_slot TIME;
  v_slot_end TIME;
  v_is_blocked BOOLEAN;
  v_is_booked BOOLEAN;
  v_is_time_off BOOLEAN;
BEGIN
  -- Get day of week (lowercase)
  v_day_of_week := LOWER(TO_CHAR(p_date, 'day'));
  v_day_of_week := TRIM(v_day_of_week);
  
  -- Get professional's working hours
  SELECT working_hours INTO v_working_hours
  FROM professionals
  WHERE id = p_professional_id;
  
  IF v_working_hours IS NULL THEN
    RETURN;
  END IF;
  
  -- Get schedule for this day
  v_day_schedule := v_working_hours -> v_day_of_week;
  
  -- Check if open this day
  IF v_day_schedule IS NULL OR (v_day_schedule ->> 'isOpen')::BOOLEAN = FALSE THEN
    RETURN;
  END IF;
  
  -- Check if date is in unavailable_dates
  IF EXISTS (
    SELECT 1 FROM professionals 
    WHERE id = p_professional_id 
    AND unavailable_dates ? p_date::TEXT
  ) THEN
    RETURN;
  END IF;
  
  -- Check for approved time-off covering this date
  SELECT EXISTS (
    SELECT 1 FROM time_off_requests
    WHERE professional_id = p_professional_id
    AND status = 'approved'
    AND p_date BETWEEN start_date AND end_date
    AND (all_day = TRUE OR (start_time IS NULL AND end_time IS NULL))
  ) INTO v_is_time_off;
  
  IF v_is_time_off THEN
    RETURN;
  END IF;
  
  -- Get open/close times
  v_open_time := (v_day_schedule ->> 'open')::TIME;
  v_close_time := (v_day_schedule ->> 'close')::TIME;
  
  -- Generate slots
  v_current_slot := v_open_time;
  
  WHILE v_current_slot + (p_slot_duration || ' minutes')::INTERVAL <= v_close_time LOOP
    v_slot_end := v_current_slot + (p_slot_duration || ' minutes')::INTERVAL;
    
    -- Check if slot is blocked
    SELECT EXISTS (
      SELECT 1 FROM blocked_slots
      WHERE professional_id = p_professional_id
      AND slot_date = p_date
      AND NOT (v_slot_end <= start_time OR v_current_slot >= end_time)
    ) INTO v_is_blocked;
    
    -- Check if slot is booked
    SELECT EXISTS (
      SELECT 1 FROM appointments
      WHERE professional_id = p_professional_id
      AND appointment_date = p_date
      AND status NOT IN ('cancelled', 'rejected')
      AND NOT (v_slot_end <= appointment_time OR v_current_slot >= appointment_time + (COALESCE(duration, 30) || ' minutes')::INTERVAL)
    ) INTO v_is_booked;
    
    -- Check for partial time-off
    SELECT EXISTS (
      SELECT 1 FROM time_off_requests
      WHERE professional_id = p_professional_id
      AND status = 'approved'
      AND p_date BETWEEN start_date AND end_date
      AND all_day = FALSE
      AND NOT (v_slot_end <= start_time OR v_current_slot >= end_time)
    ) INTO v_is_time_off;
    
    slot_start := v_current_slot;
    slot_end := v_slot_end;
    is_available := NOT (v_is_blocked OR v_is_booked OR v_is_time_off);
    
    RETURN NEXT;
    
    v_current_slot := v_slot_end;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER: Check if a specific slot is available
-- ============================================================================
CREATE OR REPLACE FUNCTION is_slot_available(
  p_professional_id UUID,
  p_date DATE,
  p_time TIME,
  p_duration INTEGER DEFAULT 30
) RETURNS BOOLEAN AS $$
DECLARE
  v_end_time TIME;
  v_day_of_week TEXT;
  v_working_hours JSONB;
  v_day_schedule JSONB;
  v_open_time TIME;
  v_close_time TIME;
BEGIN
  v_end_time := p_time + (p_duration || ' minutes')::INTERVAL;
  v_day_of_week := LOWER(TRIM(TO_CHAR(p_date, 'day')));
  
  -- Get working hours
  SELECT working_hours INTO v_working_hours
  FROM professionals
  WHERE id = p_professional_id;
  
  IF v_working_hours IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_day_schedule := v_working_hours -> v_day_of_week;
  
  -- Check if open
  IF v_day_schedule IS NULL OR (v_day_schedule ->> 'isOpen')::BOOLEAN = FALSE THEN
    RETURN FALSE;
  END IF;
  
  v_open_time := (v_day_schedule ->> 'open')::TIME;
  v_close_time := (v_day_schedule ->> 'close')::TIME;
  
  -- Check within working hours
  IF p_time < v_open_time OR v_end_time > v_close_time THEN
    RETURN FALSE;
  END IF;
  
  -- Check unavailable dates
  IF EXISTS (
    SELECT 1 FROM professionals 
    WHERE id = p_professional_id 
    AND unavailable_dates ? p_date::TEXT
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check time-off
  IF EXISTS (
    SELECT 1 FROM time_off_requests
    WHERE professional_id = p_professional_id
    AND status = 'approved'
    AND p_date BETWEEN start_date AND end_date
    AND (all_day = TRUE OR NOT (v_end_time <= start_time OR p_time >= end_time))
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check blocked slots
  IF EXISTS (
    SELECT 1 FROM blocked_slots
    WHERE professional_id = p_professional_id
    AND slot_date = p_date
    AND NOT (v_end_time <= start_time OR p_time >= end_time)
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check existing appointments
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE professional_id = p_professional_id
    AND appointment_date = p_date
    AND status NOT IN ('cancelled', 'rejected')
    AND NOT (v_end_time <= appointment_time OR p_time >= appointment_time + (COALESCE(duration, 30) || ' minutes')::INTERVAL)
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Add duration column to appointments if not exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'duration'
  ) THEN
    ALTER TABLE appointments ADD COLUMN duration INTEGER DEFAULT 30;
  END IF;
END $$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_durations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS time_off_requests_owner ON time_off_requests;
DROP POLICY IF EXISTS blocked_slots_owner ON blocked_slots;
DROP POLICY IF EXISTS service_durations_owner ON service_durations;

-- Owner policies
CREATE POLICY time_off_requests_owner ON time_off_requests
  FOR ALL USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY blocked_slots_owner ON blocked_slots
  FOR ALL USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY service_durations_owner ON service_durations
  FOR ALL USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE time_off_requests IS 'Time-off/leave requests with approval workflow';
COMMENT ON TABLE blocked_slots IS 'Blocked time slots (breaks, meetings, etc.)';
COMMENT ON TABLE service_durations IS 'Service-specific appointment durations';
COMMENT ON FUNCTION get_available_slots IS 'Generate available appointment slots for a provider on a date';
COMMENT ON FUNCTION is_slot_available IS 'Check if a specific time slot is available for booking';

-- Lab test request numbers: LT-DDMMYY-{visitRef}-{random}
-- visitRef = last 6 chars of appointment_id (links to main visit)
-- e.g. LT-290129-a1b2c3-384729
-- Run in Supabase SQL Editor

CREATE SEQUENCE IF NOT EXISTS lab_test_number_fallback_seq START 1;

-- p_appointment_id: the visit (appointment) this lab request belongs to
CREATE OR REPLACE FUNCTION get_next_lt_number(p_appointment_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  ddmmyy TEXT;
  visit_ref TEXT;
  rnd INT;
  candidate TEXT;
  i INT := 0;
BEGIN
  ddmmyy := to_char(now(), 'DDMMYY');
  IF p_appointment_id IS NOT NULL THEN
    visit_ref := lower(substr(replace(p_appointment_id::text, '-', ''), 27, 6));
  ELSE
    visit_ref := '000000';
  END IF;
  LOOP
    rnd := floor(random() * 900000 + 100000)::int;
    candidate := 'LT-' || ddmmyy || '-' || visit_ref || '-' || rnd;
    IF NOT EXISTS (SELECT 1 FROM lab_test_requests WHERE request_number = candidate) THEN
      RETURN candidate;
    END IF;
    i := i + 1;
    IF i >= 25 THEN
      RETURN 'LT-' || ddmmyy || '-' || visit_ref || '-' || lpad(nextval('lab_test_number_fallback_seq')::text, 6, '0');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

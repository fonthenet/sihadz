-- Add originating_appointment_id to referrals
-- Links the referral to the visit where it was created (for patient ticket display)

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS originating_appointment_id UUID REFERENCES appointments(id);

CREATE INDEX IF NOT EXISTS idx_referrals_originating_appointment
  ON referrals(originating_appointment_id);

COMMENT ON COLUMN referrals.originating_appointment_id IS 'The appointment/visit where this referral was created';

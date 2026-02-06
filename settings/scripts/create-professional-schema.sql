-- Professional Schema for DZDoc
-- Supports: Doctors, Clinics, Pharmacies, Labs, Radiology, Ambulances, etc.

-- Create ENUM for professional types
CREATE TYPE professional_type AS ENUM (
  'doctor',
  'clinic',
  'pharmacy',
  'laboratory',
  'radiology',
  'ambulance',
  'blood_bank',
  'dental_clinic',
  'physiotherapy',
  'nutrition',
  'psychology'
);

-- Create ENUM for professional status
CREATE TYPE professional_status AS ENUM (
  'pending',      -- Waiting for verification
  'verified',     -- License verified, active
  'suspended',    -- Temporarily suspended
  'rejected'      -- Application rejected
);

-- Create ENUM for subscription tier
CREATE TYPE subscription_tier AS ENUM (
  'free',
  'premium',
  'enterprise'
);

-- Professionals table (core auth and business info)
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Authentication (using Supabase Auth)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  
  -- Business Information
  type professional_type NOT NULL,
  business_name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  wilaya TEXT NOT NULL,
  commune TEXT,
  postal_code TEXT,
  
  -- Status & Verification
  status professional_status DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES professionals(id),
  rejection_reason TEXT,
  
  -- Subscription
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  monthly_appointment_limit INTEGER DEFAULT 20, -- Free tier limit
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE
);

-- Professional profiles (type-specific information)
CREATE TABLE IF NOT EXISTS professional_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Common fields
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  website TEXT,
  social_media JSONB, -- {facebook, instagram, linkedin}
  
  -- Operating hours
  operating_hours JSONB, -- {monday: {open: "08:00", close: "18:00"}, ...}
  accepts_emergency BOOLEAN DEFAULT FALSE,
  
  -- For Doctors
  specialization TEXT,
  sub_specialization TEXT,
  years_of_experience INTEGER,
  consultation_fee INTEGER, -- in DZD
  accepts_chifa BOOLEAN DEFAULT FALSE,
  languages TEXT[], -- ['Arabic', 'French', 'English']
  
  -- For Clinics
  staff_count INTEGER,
  bed_capacity INTEGER,
  available_specialties TEXT[],
  has_emergency_room BOOLEAN DEFAULT FALSE,
  has_pharmacy BOOLEAN DEFAULT FALSE,
  has_laboratory BOOLEAN DEFAULT FALSE,
  
  -- For Pharmacies
  delivery_available BOOLEAN DEFAULT FALSE,
  delivery_fee INTEGER,
  delivery_radius INTEGER, -- in km
  has_night_shift BOOLEAN DEFAULT FALSE,
  inventory_system TEXT,
  
  -- For Labs/Radiology
  test_types TEXT[], -- ['Blood Test', 'X-Ray', 'MRI', 'CT Scan']
  average_turnaround_time INTEGER, -- in hours
  home_sample_collection BOOLEAN DEFAULT FALSE,
  accepts_insurance BOOLEAN DEFAULT FALSE,
  
  -- For Ambulances
  vehicle_count INTEGER,
  ambulance_types TEXT[], -- ['Basic', 'Advanced', 'Neonatal']
  coverage_area TEXT[],
  
  -- Ratings & Reviews
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(professional_id)
);

-- Professional credentials (licenses, certificates, diplomas)
CREATE TABLE IF NOT EXISTS professional_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  credential_type TEXT NOT NULL, -- 'license', 'diploma', 'certificate'
  credential_name TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT, -- Stored in Supabase Storage
  verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professional availability (for scheduling)
CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER DEFAULT 30, -- minutes
  is_available BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(professional_id, day_of_week, start_time)
);

-- Professional services (what they offer)
CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  service_name TEXT NOT NULL,
  service_description TEXT,
  price INTEGER, -- in DZD
  duration INTEGER, -- in minutes
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professional team members (for clinics)
CREATE TABLE IF NOT EXISTS professional_team (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  
  role TEXT, -- 'head_doctor', 'consultant', 'resident'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(clinic_id, doctor_id)
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_team ENABLE ROW LEVEL SECURITY;

-- Professionals: Can read their own data
CREATE POLICY "Professionals can view own data" ON professionals
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Professionals can update own data" ON professionals
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Public can view verified professionals
CREATE POLICY "Public can view verified professionals" ON professionals
  FOR SELECT USING (status = 'verified');

-- Professional profiles: Professionals can manage their own profile
CREATE POLICY "Professionals can manage own profile" ON professional_profiles
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Public can view verified professional profiles
CREATE POLICY "Public can view verified profiles" ON professional_profiles
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professionals WHERE status = 'verified'
    )
  );

-- Credentials: Only owner can view/manage
CREATE POLICY "Professionals can manage own credentials" ON professional_credentials
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Availability: Professionals manage, public can view
CREATE POLICY "Professionals can manage own availability" ON professional_availability
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view availability" ON professional_availability
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professionals WHERE status = 'verified'
    )
  );

-- Services: Professionals manage, public can view active ones
CREATE POLICY "Professionals can manage own services" ON professional_services
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active services" ON professional_services
  FOR SELECT USING (
    is_active = TRUE AND professional_id IN (
      SELECT id FROM professionals WHERE status = 'verified'
    )
  );

-- Team: Clinic and members can view
CREATE POLICY "Team members can view" ON professional_team
  FOR SELECT USING (
    clinic_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_professionals_type ON professionals(type);
CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_wilaya ON professionals(wilaya);
CREATE INDEX idx_professionals_auth_user ON professionals(auth_user_id);
CREATE INDEX idx_professional_profiles_professional_id ON professional_profiles(professional_id);
CREATE INDEX idx_professional_availability_professional_id ON professional_availability(professional_id);
CREATE INDEX idx_professional_services_professional_id ON professional_services(professional_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_profiles_updated_at BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

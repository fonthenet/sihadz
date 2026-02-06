-- Create laboratories table (similar to pharmacies)
CREATE TABLE IF NOT EXISTS laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  wilaya_code TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  address_ar TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  working_hours JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_24h BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  test_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clinics table (similar to pharmacies)
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  wilaya_code TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  address_ar TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  working_hours JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_24h BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laboratories_wilaya ON laboratories(wilaya_code);
CREATE INDEX IF NOT EXISTS idx_laboratories_active ON laboratories(is_active);
CREATE INDEX IF NOT EXISTS idx_laboratories_verified ON laboratories(is_verified);

CREATE INDEX IF NOT EXISTS idx_clinics_wilaya ON clinics(wilaya_code);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active);
CREATE INDEX IF NOT EXISTS idx_clinics_verified ON clinics(is_verified);

-- Enable RLS
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- RLS policies for laboratories (public read)
CREATE POLICY "Laboratories are viewable by everyone"
  ON laboratories FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own laboratory"
  ON laboratories FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for clinics (public read)
CREATE POLICY "Clinics are viewable by everyone"
  ON clinics FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own clinic"
  ON clinics FOR UPDATE
  USING (auth.uid() = user_id);

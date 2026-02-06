-- ============================================================================
-- FAVORITES SYSTEM
-- ============================================================================
-- Allows patients to save/favorite providers (doctors, clinics, labs, pharmacies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User who favorited
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider favorited
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates
  CONSTRAINT unique_user_favorite UNIQUE (user_id, professional_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user ON provider_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_professional ON provider_favorites(professional_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON provider_favorites(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE provider_favorites ENABLE ROW LEVEL SECURITY;

-- Users can see their own favorites
DROP POLICY IF EXISTS favorites_select ON provider_favorites;
CREATE POLICY favorites_select ON provider_favorites
  FOR SELECT USING (user_id = auth.uid());

-- Users can add their own favorites
DROP POLICY IF EXISTS favorites_insert ON provider_favorites;
CREATE POLICY favorites_insert ON provider_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can remove their own favorites
DROP POLICY IF EXISTS favorites_delete ON provider_favorites;
CREATE POLICY favorites_delete ON provider_favorites
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if a provider is favorited by user
CREATE OR REPLACE FUNCTION is_favorite(p_professional_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM provider_favorites 
    WHERE user_id = auth.uid() 
    AND professional_id = p_professional_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get favorite count for a provider (for popularity display)
CREATE OR REPLACE FUNCTION get_favorite_count(p_professional_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM provider_favorites 
    WHERE professional_id = p_professional_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE provider_favorites IS 'Patient favorites for providers';
COMMENT ON FUNCTION is_favorite IS 'Check if current user has favorited a provider';
COMMENT ON FUNCTION get_favorite_count IS 'Get total favorites for a provider';

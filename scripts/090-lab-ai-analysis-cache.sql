-- Add AI analysis cache to lab_test_requests
-- One AI explanation per lab test, ever. Cached for future "View results".
ALTER TABLE lab_test_requests ADD COLUMN IF NOT EXISTS ai_analysis_cache JSONB DEFAULT NULL;
ALTER TABLE lab_test_requests ADD COLUMN IF NOT EXISTS ai_analysis_cached_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN lab_test_requests.ai_analysis_cache IS 'Cached AI explanation of lab results. One request per lab test ever.';
COMMENT ON COLUMN lab_test_requests.ai_analysis_cached_at IS 'When the AI analysis was generated and cached.';

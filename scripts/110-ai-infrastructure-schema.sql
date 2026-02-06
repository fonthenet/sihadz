-- AI Infrastructure Schema
-- Comprehensive tables for AI audit, usage tracking, feedback, and knowledge base

-- ============================================
-- 1. AI AUDIT LOGS - Track all AI operations
-- ============================================
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Who
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT NOT NULL, -- patient, doctor, lab, pharmacy, admin
  
  -- What
  skill TEXT NOT NULL, -- summarize_lab, extract_symptoms, draft_note, triage_message, etc.
  input_hash TEXT, -- Hash of input (no PII stored)
  output_summary TEXT, -- Brief description of output structure
  
  -- How
  provider TEXT NOT NULL, -- ollama, openai, claude
  model TEXT NOT NULL, -- llama3, gpt-4o-mini, etc.
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT false,
  
  -- Context
  ticket_id UUID,
  appointment_id UUID,
  lab_result_id UUID,
  prescription_id UUID,
  
  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Compliance
  disclaimer_shown BOOLEAN DEFAULT true,
  user_acknowledged BOOLEAN DEFAULT false,
  
  -- Request metadata
  language TEXT DEFAULT 'fr',
  request_ip TEXT,
  user_agent TEXT
);

-- Indexes for analytics and querying
CREATE INDEX IF NOT EXISTS idx_ai_audit_user ON ai_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_skill ON ai_audit_logs(skill);
CREATE INDEX IF NOT EXISTS idx_ai_audit_date ON ai_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_audit_provider ON ai_audit_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_audit_success ON ai_audit_logs(success);

-- ============================================
-- 2. AI USAGE TRACKING - For billing/limits
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Usage counts by skill
  skill TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  
  -- Limits (NULL = unlimited for testing)
  limit_count INTEGER DEFAULT NULL,
  limit_tokens INTEGER DEFAULT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_start, skill)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_period ON ai_usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ai_usage_skill ON ai_usage_tracking(skill);

-- ============================================
-- 3. AI FEEDBACK - User feedback for improvement
-- ============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  audit_id UUID REFERENCES ai_audit_logs(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Rating
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT, -- helpful, inaccurate, inappropriate, incomplete, other
  comment TEXT,
  
  -- For provider improvements
  was_edited BOOLEAN DEFAULT false,
  edit_reason TEXT,
  original_output JSONB,
  edited_output JSONB
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_audit ON ai_feedback(audit_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);

-- ============================================
-- 4. AI KNOWLEDGE BASE - RAG embeddings
-- ============================================
-- First ensure pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Scope
  scope TEXT NOT NULL DEFAULT 'platform', -- platform, provider, patient
  scope_id UUID, -- provider_id or patient_id if scoped
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL, -- policy, protocol, faq, medical_reference, sop
  language TEXT DEFAULT 'fr',
  
  -- Embeddings (1536 = OpenAI dimension, 4096 = some local models)
  embedding vector(1536),
  
  -- Metadata
  source TEXT,
  source_url TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Search optimization
  search_tokens TSVECTOR
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON ai_knowledge_base 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_knowledge_scope ON ai_knowledge_base(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON ai_knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON ai_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_search ON ai_knowledge_base USING GIN(search_tokens);

-- Auto-update search tokens
CREATE OR REPLACE FUNCTION update_knowledge_search_tokens()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tokens := to_tsvector('french', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_search ON ai_knowledge_base;
CREATE TRIGGER trg_knowledge_search
  BEFORE INSERT OR UPDATE ON ai_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_search_tokens();

-- ============================================
-- 5. AI CRITICAL VALUES - Lab thresholds
-- ============================================
CREATE TABLE IF NOT EXISTS ai_critical_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  test_code TEXT,
  
  -- Thresholds
  critical_low DECIMAL,
  critical_high DECIMAL,
  normal_low DECIMAL,
  normal_high DECIMAL,
  unit TEXT,
  
  -- Alert settings
  alert_message_ar TEXT,
  alert_message_fr TEXT,
  alert_message_en TEXT,
  severity TEXT DEFAULT 'critical', -- warning, critical, panic
  
  -- Metadata
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(test_name)
);

-- Seed common critical values
INSERT INTO ai_critical_values (test_name, test_code, critical_low, critical_high, normal_low, normal_high, unit, alert_message_fr, severity)
VALUES
  ('Glucose', 'GLU', 50, 500, 70, 100, 'mg/dL', 'Valeur de glucose critique - contacter le médecin immédiatement', 'critical'),
  ('Potassium', 'K', 2.5, 6.5, 3.5, 5.0, 'mEq/L', 'Potassium critique - risque cardiaque', 'panic'),
  ('Sodium', 'NA', 120, 160, 136, 145, 'mEq/L', 'Sodium critique - déséquilibre électrolytique', 'critical'),
  ('Hemoglobin', 'HGB', 7, 20, 12, 17, 'g/dL', 'Hémoglobine critique', 'critical'),
  ('Platelets', 'PLT', 50000, 1000000, 150000, 400000, '/μL', 'Plaquettes critiques - risque hémorragique', 'critical'),
  ('WBC', 'WBC', 2000, 30000, 4000, 11000, '/μL', 'Globules blancs critiques', 'critical'),
  ('Creatinine', 'CREA', NULL, 10, 0.7, 1.3, 'mg/dL', 'Créatinine critique - insuffisance rénale', 'critical'),
  ('Troponin', 'TROP', NULL, 0.4, 0, 0.04, 'ng/mL', 'Troponine élevée - possible infarctus', 'panic'),
  ('INR', 'INR', NULL, 5, 0.9, 1.1, '', 'INR critique - risque hémorragique', 'critical'),
  ('pH', 'PH', 7.2, 7.6, 7.35, 7.45, '', 'pH sanguin critique', 'panic')
ON CONFLICT (test_name) DO NOTHING;

-- ============================================
-- 6. AI SYSTEM PROMPTS - Versioned prompts
-- ============================================
CREATE TABLE IF NOT EXISTS ai_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  version INTEGER NOT NULL DEFAULT 1,
  
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  
  -- Settings
  temperature DECIMAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  preferred_model TEXT DEFAULT 'llama3',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  notes TEXT,
  
  UNIQUE(skill, language, version)
);

CREATE INDEX IF NOT EXISTS idx_prompts_skill ON ai_system_prompts(skill, is_active);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_critical_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_system_prompts ENABLE ROW LEVEL SECURITY;

-- Users can see their own audit logs
CREATE POLICY "Users view own AI audit" ON ai_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert audit logs
CREATE POLICY "Service can insert audit" ON ai_audit_logs
  FOR INSERT WITH CHECK (true);

-- Users can see their own usage
CREATE POLICY "Users view own usage" ON ai_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage usage
CREATE POLICY "Service can manage usage" ON ai_usage_tracking
  FOR ALL USING (true);

-- Users can submit feedback
CREATE POLICY "Users submit feedback" ON ai_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback" ON ai_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Everyone can read active knowledge base
CREATE POLICY "Read active knowledge" ON ai_knowledge_base
  FOR SELECT USING (is_active = true);

-- Everyone can read critical values
CREATE POLICY "Read critical values" ON ai_critical_values
  FOR SELECT USING (is_active = true);

-- Everyone can read active prompts
CREATE POLICY "Read active prompts" ON ai_system_prompts
  FOR SELECT USING (is_active = true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to log AI usage (called from API)
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_skill TEXT,
  p_tokens INTEGER DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate current billing period (monthly)
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Upsert usage record
  INSERT INTO ai_usage_tracking (user_id, period_start, period_end, skill, usage_count, tokens_used)
  VALUES (p_user_id, v_period_start, v_period_end, p_skill, 1, p_tokens)
  ON CONFLICT (user_id, period_start, skill)
  DO UPDATE SET 
    usage_count = ai_usage_tracking.usage_count + 1,
    tokens_used = ai_usage_tracking.tokens_used + p_tokens,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use AI skill (for future rate limiting)
CREATE OR REPLACE FUNCTION can_use_ai_skill(
  p_user_id UUID,
  p_skill TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_usage RECORD;
BEGIN
  -- For now, always return true (unlimited testing)
  -- Later: check against subscription limits
  RETURN true;
  
  /*
  -- Future implementation:
  SELECT * INTO v_usage
  FROM ai_usage_tracking
  WHERE user_id = p_user_id
    AND skill = p_skill
    AND period_start <= CURRENT_DATE
    AND period_end >= CURRENT_DATE;
  
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  IF v_usage.limit_count IS NULL THEN
    RETURN true; -- Unlimited
  END IF;
  
  RETURN v_usage.usage_count < v_usage.limit_count;
  */
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE ai_audit_logs IS 'Comprehensive audit trail for all AI operations';
COMMENT ON TABLE ai_usage_tracking IS 'Track AI usage per user/skill for billing and rate limiting';
COMMENT ON TABLE ai_feedback IS 'User feedback on AI outputs for continuous improvement';
COMMENT ON TABLE ai_knowledge_base IS 'RAG knowledge base with vector embeddings';
COMMENT ON TABLE ai_critical_values IS 'Critical lab value thresholds for safety alerts';
COMMENT ON TABLE ai_system_prompts IS 'Versioned system prompts for AI skills';

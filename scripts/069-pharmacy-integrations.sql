-- ============================================================================
-- PHARMACY INTEGRATIONS & API KEYS
-- Enables external software integration, webhooks, Google Sheets sync
-- ============================================================================

-- ============================================================================
-- PHARMACY INTEGRATIONS - Config for each integration type
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Integration type
  integration_type TEXT NOT NULL,  -- 'google_sheets', 'zapier', 'webhook', 'external_db'
  name TEXT,                       -- User-friendly name: "Main Google Sheet", "POS Webhook"
  
  -- Configuration (varies by type)
  config JSONB NOT NULL DEFAULT '{}',
  -- google_sheets: { "spreadsheet_id": "...", "sheet_name": "Products" }
  -- webhook: { "url": "https://...", "secret": "...", "events": ["stock.received"] }
  -- external_db: { "type": "mysql", "connection_string": "..." }
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,           -- 'success', 'failed'
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT valid_integration_type CHECK (
    integration_type IN ('google_sheets', 'zapier', 'webhook', 'external_db', 'csv_sync', 'make', 'n8n')
  )
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_integrations_pharmacy ON pharmacy_integrations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_integrations_type ON pharmacy_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_integrations_active ON pharmacy_integrations(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PHARMACY API KEYS - For external software authentication
-- ============================================================================
CREATE TABLE IF NOT EXISTS pharmacy_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Key identification
  key_prefix TEXT NOT NULL,        -- First 8 chars of key for display: "pk_abc123"
  key_hash TEXT NOT NULL,          -- SHA-256 hash of full key
  name TEXT NOT NULL,              -- "Google Sheets sync", "POS System"
  
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['products:read', 'stock:read'],
  -- Available scopes:
  -- products:read, products:write
  -- stock:read, stock:write
  -- transactions:read
  -- suppliers:read, suppliers:write
  -- all (full access)
  
  -- Limits
  rate_limit_per_minute INTEGER DEFAULT 60,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_used_ip TEXT,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  
  -- Constraints
  UNIQUE(key_hash)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_api_keys_pharmacy ON pharmacy_api_keys(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_api_keys_hash ON pharmacy_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_pharmacy_api_keys_prefix ON pharmacy_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_pharmacy_api_keys_active ON pharmacy_api_keys(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- WEBHOOK DELIVERIES - Log of webhook attempts
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES pharmacy_integrations(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,        -- 'product.created', 'stock.received', etc.
  payload JSONB NOT NULL,
  
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Response info
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_integration ON webhook_deliveries(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pharmacy ON webhook_deliveries(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at) 
  WHERE status = 'pending';

-- ============================================================================
-- IMPORT JOBS - Track bulk import operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  
  -- Source
  source_type TEXT NOT NULL,       -- 'csv', 'excel', 'google_sheets', 'api'
  source_name TEXT,                -- Filename or sheet name
  
  -- Processing
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Errors
  errors JSONB DEFAULT '[]',       -- Array of { row, field, message }
  
  -- Column mapping (for CSV/Excel)
  column_mapping JSONB,            -- { "source_col": "target_field" }
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_pharmacy ON inventory_import_jobs(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON inventory_import_jobs(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pharmacy_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_import_jobs ENABLE ROW LEVEL SECURITY;

-- Integrations: pharmacy can only see/manage their own
CREATE POLICY "integrations_select_own" ON pharmacy_integrations
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "integrations_insert_own" ON pharmacy_integrations
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "integrations_update_own" ON pharmacy_integrations
  FOR UPDATE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "integrations_delete_own" ON pharmacy_integrations
  FOR DELETE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- API Keys: pharmacy can only see/manage their own
CREATE POLICY "api_keys_select_own" ON pharmacy_api_keys
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "api_keys_insert_own" ON pharmacy_api_keys
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "api_keys_update_own" ON pharmacy_api_keys
  FOR UPDATE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "api_keys_delete_own" ON pharmacy_api_keys
  FOR DELETE USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Webhook deliveries: pharmacy can only see their own
CREATE POLICY "webhook_deliveries_select_own" ON webhook_deliveries
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Import jobs: pharmacy can only see their own
CREATE POLICY "import_jobs_select_own" ON inventory_import_jobs
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "import_jobs_insert_own" ON inventory_import_jobs
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pharmacy_integrations IS 'Configuration for external integrations (Google Sheets, webhooks, etc.)';
COMMENT ON TABLE pharmacy_api_keys IS 'API keys for external software to access pharmacy inventory';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts and results';
COMMENT ON TABLE inventory_import_jobs IS 'Track bulk import operations from CSV, Excel, etc.';

-- =====================================================
-- BACKUP SYSTEM TABLES
-- Server-first encrypted backups with optional cloud sync
-- =====================================================

-- Backup file records (PRIMARY - always on server)
CREATE TABLE IF NOT EXISTS backup_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  professional_id UUID REFERENCES professionals,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage: backups/{user_id}/xxx.dzdbackup
  file_size_bytes BIGINT,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'pharmacy', 'professional', 'patient')),
  checksum TEXT NOT NULL, -- SHA-256 of plaintext for integrity verification
  backup_version TEXT DEFAULT '1.0',
  is_pinned BOOLEAN DEFAULT FALSE, -- Pinned = never auto-delete
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'expired')),
  -- Mobile device info (if created from mobile)
  device_id TEXT, -- Which device created this backup
  is_local_only BOOLEAN DEFAULT FALSE, -- Not yet synced to server (mobile only)
  -- Optional Google Drive sync
  google_file_id TEXT, -- NULL if not synced to Google
  google_synced_at TIMESTAMPTZ,
  -- Optional iCloud sync (iOS)
  icloud_file_id TEXT,
  icloud_synced_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backup scheduling configuration
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  professional_id UUID REFERENCES professionals,
  backup_type TEXT NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'pharmacy', 'professional', 'patient')),
  is_enabled BOOLEAN DEFAULT TRUE,
  schedule TEXT NOT NULL DEFAULT '0 2 * * *', -- Cron: daily 2 AM
  retention_days INT DEFAULT 30 CHECK (retention_days >= 1 AND retention_days <= 365),
  min_backups_to_keep INT DEFAULT 3 CHECK (min_backups_to_keep >= 1),
  auto_sync_google BOOLEAN DEFAULT FALSE, -- Auto-copy to Google after backup
  auto_sync_icloud BOOLEAN DEFAULT FALSE, -- Auto-copy to iCloud after backup (iOS)
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, professional_id, backup_type)
);

-- Google Drive connections (OPTIONAL)
CREATE TABLE IF NOT EXISTS backup_google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  -- Tokens are encrypted with platform key before storage
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  folder_id TEXT, -- Dedicated backup folder in Drive
  folder_name TEXT DEFAULT 'DZD-Healthcare-Backups',
  email TEXT, -- Google account email for display
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backup job queue (for async processing)
CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  professional_id UUID REFERENCES professionals,
  backup_type TEXT NOT NULL DEFAULT 'full',
  job_type TEXT NOT NULL CHECK (job_type IN ('create', 'sync_google', 'sync_icloud', 'restore', 'delete')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest
  -- Job data
  input_data JSONB, -- Parameters for the job
  output_data JSONB, -- Result of the job
  error_message TEXT,
  -- Retry logic
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backup_files_user_id ON backup_files(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_files_professional_id ON backup_files(professional_id);
CREATE INDEX IF NOT EXISTS idx_backup_files_status ON backup_files(status);
CREATE INDEX IF NOT EXISTS idx_backup_files_created_at ON backup_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_files_expires_at ON backup_files(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_backup_schedules_user_id ON backup_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(next_run_at) WHERE is_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_backup_jobs_user_id ON backup_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_next_retry ON backup_jobs(next_retry_at) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE backup_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own backups
CREATE POLICY backup_files_select ON backup_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY backup_files_insert ON backup_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY backup_files_update ON backup_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY backup_files_delete ON backup_files
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only manage their own schedules
CREATE POLICY backup_schedules_select ON backup_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY backup_schedules_insert ON backup_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY backup_schedules_update ON backup_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY backup_schedules_delete ON backup_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only manage their own Google connections
CREATE POLICY backup_google_select ON backup_google_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY backup_google_insert ON backup_google_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY backup_google_update ON backup_google_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY backup_google_delete ON backup_google_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own jobs
CREATE POLICY backup_jobs_select ON backup_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY backup_jobs_insert ON backup_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_backup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS backup_files_updated_at ON backup_files;
CREATE TRIGGER backup_files_updated_at
  BEFORE UPDATE ON backup_files
  FOR EACH ROW EXECUTE FUNCTION update_backup_updated_at();

DROP TRIGGER IF EXISTS backup_schedules_updated_at ON backup_schedules;
CREATE TRIGGER backup_schedules_updated_at
  BEFORE UPDATE ON backup_schedules
  FOR EACH ROW EXECUTE FUNCTION update_backup_updated_at();

DROP TRIGGER IF EXISTS backup_google_updated_at ON backup_google_connections;
CREATE TRIGGER backup_google_updated_at
  BEFORE UPDATE ON backup_google_connections
  FOR EACH ROW EXECUTE FUNCTION update_backup_updated_at();

-- Function to calculate next backup run time from cron expression
-- Simplified: just adds 24 hours for daily, 7 days for weekly, etc.
CREATE OR REPLACE FUNCTION calculate_next_backup_run(
  p_schedule TEXT,
  p_last_run TIMESTAMPTZ DEFAULT now()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next TIMESTAMPTZ;
BEGIN
  -- Parse common cron patterns
  IF p_schedule LIKE '0 % * * *' THEN
    -- Daily at specific hour
    v_next := date_trunc('day', p_last_run) + INTERVAL '1 day' + 
              (split_part(p_schedule, ' ', 2)::INT * INTERVAL '1 hour');
  ELSIF p_schedule LIKE '0 % * * 0' OR p_schedule LIKE '0 % * * 7' THEN
    -- Weekly on Sunday
    v_next := date_trunc('week', p_last_run) + INTERVAL '1 week' + 
              (split_part(p_schedule, ' ', 2)::INT * INTERVAL '1 hour');
  ELSIF p_schedule LIKE '0 % 1 * *' THEN
    -- Monthly on 1st
    v_next := date_trunc('month', p_last_run) + INTERVAL '1 month' + 
              (split_part(p_schedule, ' ', 2)::INT * INTERVAL '1 hour');
  ELSE
    -- Default: 24 hours from now
    v_next := p_last_run + INTERVAL '24 hours';
  END IF;
  
  -- Ensure next run is in the future
  IF v_next <= now() THEN
    v_next := now() + INTERVAL '24 hours';
  END IF;
  
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INT := 0;
  v_backup RECORD;
BEGIN
  -- Find expired, non-pinned backups
  FOR v_backup IN 
    SELECT id, user_id, storage_path
    FROM backup_files
    WHERE status = 'active'
      AND is_pinned = FALSE
      AND expires_at IS NOT NULL
      AND expires_at < now()
  LOOP
    -- Check if user has minimum backups
    IF (SELECT COUNT(*) FROM backup_files 
        WHERE user_id = v_backup.user_id 
        AND status = 'active') > 3 THEN
      -- Mark as expired (actual file deletion done by application)
      UPDATE backup_files SET status = 'expired' WHERE id = v_backup.id;
      v_deleted := v_deleted + 1;
    END IF;
  END LOOP;
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_next_backup_run TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_backups TO service_role;

COMMENT ON TABLE backup_files IS 'Encrypted backup files stored on server with optional cloud sync';
COMMENT ON TABLE backup_schedules IS 'User backup schedule configuration';
COMMENT ON TABLE backup_google_connections IS 'OAuth tokens for Google Drive integration';
COMMENT ON TABLE backup_jobs IS 'Async backup job queue for background processing';

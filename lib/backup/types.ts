/**
 * Backup System Types
 * Server-first encrypted backups with optional cloud sync
 */

// =====================================================
// BACKUP FILE TYPES
// =====================================================

export type BackupType = 'full' | 'pharmacy' | 'professional' | 'patient'
export type BackupStatus = 'active' | 'deleted' | 'expired'
export type BackupJobType = 'create' | 'sync_google' | 'sync_icloud' | 'restore' | 'delete'
export type BackupJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface BackupFile {
  id: string
  user_id: string
  professional_id?: string
  filename: string
  storage_path: string
  file_size_bytes?: number
  backup_type: BackupType
  checksum: string
  backup_version: string
  is_pinned: boolean
  status: BackupStatus
  // Mobile
  device_id?: string
  is_local_only: boolean
  // Cloud sync
  google_file_id?: string
  google_synced_at?: string
  icloud_file_id?: string
  icloud_synced_at?: string
  // Timestamps
  created_at: string
  expires_at?: string
  updated_at: string
}

export interface BackupSchedule {
  id: string
  user_id: string
  professional_id?: string
  backup_type: BackupType
  is_enabled: boolean
  schedule: string // Cron expression
  retention_days: number
  min_backups_to_keep: number
  auto_sync_google: boolean
  auto_sync_icloud: boolean
  last_run_at?: string
  next_run_at?: string
  last_error?: string
  created_at: string
  updated_at: string
}

export interface BackupGoogleConnection {
  id: string
  user_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string
  folder_id?: string
  folder_name: string
  email?: string
  is_active: boolean
  last_sync_at?: string
  last_error?: string
  created_at: string
  updated_at: string
}

export interface BackupJob {
  id: string
  user_id: string
  professional_id?: string
  backup_type: BackupType
  job_type: BackupJobType
  status: BackupJobStatus
  priority: number
  input_data?: Record<string, unknown>
  output_data?: Record<string, unknown>
  error_message?: string
  attempts: number
  max_attempts: number
  next_retry_at?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

// =====================================================
// ENCRYPTED BACKUP FORMAT
// =====================================================

export interface EncryptedBackup {
  version: string
  platform: 'dzd-healthcare'
  created_at: string
  backup_type: BackupType
  entity_id?: string
  entity_type?: 'user' | 'professional' | 'pharmacy'
  // Encryption metadata
  iv: string // Base64 encoded 16 bytes
  auth_tag: string // Base64 encoded 16 bytes (GCM auth tag)
  checksum: string // SHA-256 of plaintext
  // Encrypted content
  encrypted_data: string // Base64 encoded ciphertext
}

export interface BackupData {
  metadata: {
    backup_type: BackupType
    created_at: string
    user_id: string
    professional_id?: string
    version: string
  }
  // Data sections (included based on backup_type)
  pharmacy?: PharmacyBackupData
  professional?: ProfessionalBackupData
  patient?: PatientBackupData
  settings?: SettingsBackupData
}

export interface PharmacyBackupData {
  products: unknown[]
  stock: unknown[]
  sales: unknown[]
  pos_sessions: unknown[]
  cash_movements: unknown[]
  suppliers: unknown[]
  purchase_orders: unknown[]
  chifa_invoices: unknown[]
  chifa_bordereaux: unknown[]
  chifa_rejections: unknown[]
  accounting_accounts: unknown[]
  accounting_journals: unknown[]
  accounting_entries: unknown[]
}

export interface ProfessionalBackupData {
  profile: unknown
  employees: unknown[]
  appointments: unknown[]
  availability: unknown[]
  services: unknown[]
  prescriptions: unknown[]
  lab_requests: unknown[]
  medical_records: unknown[]
}

export interface PatientBackupData {
  profile: unknown
  appointments: unknown[]
  prescriptions: unknown[]
  lab_results: unknown[]
  medical_records: unknown[]
  payments: unknown[]
}

export interface SettingsBackupData {
  user_settings: unknown
  notification_preferences: unknown
  scanner_settings: unknown
  pos_settings: unknown
}

// =====================================================
// API TYPES
// =====================================================

export interface CreateBackupRequest {
  backup_type: BackupType
  professional_id?: string
  is_pinned?: boolean
  sync_to_google?: boolean
  sync_to_icloud?: boolean
}

export interface CreateBackupResponse {
  success: boolean
  backup?: BackupFile
  error?: string
}

export interface ListBackupsRequest {
  backup_type?: BackupType
  professional_id?: string
  status?: BackupStatus
  include_expired?: boolean
  limit?: number
  offset?: number
}

export interface ListBackupsResponse {
  backups: BackupFile[]
  total: number
  has_more: boolean
}

export interface BackupSettingsRequest {
  schedule?: string
  retention_days?: number
  min_backups_to_keep?: number
  auto_sync_google?: boolean
  auto_sync_icloud?: boolean
  is_enabled?: boolean
}

export interface BackupSettingsResponse {
  schedule: BackupSchedule | null
  google_connected: boolean
  google_email?: string
  storage_used_bytes: number
  backup_count: number
}

export interface RestoreBackupRequest {
  backup_id: string
  restore_type: 'full' | 'selective'
  selected_sections?: string[] // e.g., ['products', 'stock', 'sales']
  dry_run?: boolean // Preview what would be restored
}

export interface RestoreBackupResponse {
  success: boolean
  restored_counts?: Record<string, number>
  errors?: string[]
  warnings?: string[]
}

// =====================================================
// MOBILE TYPES
// =====================================================

export interface MobileBackupInfo {
  id: string
  filename: string
  file_size_bytes: number
  backup_type: BackupType
  created_at: string
  // Sync status
  is_synced_server: boolean
  is_synced_google: boolean
  is_synced_icloud: boolean
  // Local path on device
  local_path: string
}

export interface MobileSyncQueueItem {
  id: string
  backup_id: string
  target: 'server' | 'google' | 'icloud'
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  attempts: number
  last_error?: string
  created_at: string
}

export interface MobileBackupSettings {
  auto_backup_enabled: boolean
  auto_backup_frequency: 'daily' | 'weekly' | 'monthly'
  wifi_only_sync: boolean
  max_local_backups: number
  max_local_storage_mb: number
}

// =====================================================
// ENCRYPTION TYPES
// =====================================================

export interface EncryptionResult {
  encrypted_data: string
  iv: string
  auth_tag: string
  checksum: string
}

export interface DecryptionResult {
  data: unknown
  verified: boolean
}

// =====================================================
// GOOGLE DRIVE TYPES
// =====================================================

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdTime: string
  modifiedTime: string
  webViewLink?: string
}

export interface GoogleOAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  scope: string
}

// =====================================================
// SCHEDULE TYPES
// =====================================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'

export interface ScheduleOption {
  label: string
  value: string // Cron expression
  frequency: ScheduleFrequency
  description: string
}

export const SCHEDULE_OPTIONS: ScheduleOption[] = [
  {
    label: 'Daily at 2:00 AM',
    value: '0 2 * * *',
    frequency: 'daily',
    description: 'Backup every day at 2:00 AM'
  },
  {
    label: 'Daily at 3:00 AM',
    value: '0 3 * * *',
    frequency: 'daily',
    description: 'Backup every day at 3:00 AM'
  },
  {
    label: 'Weekly on Sunday',
    value: '0 2 * * 0',
    frequency: 'weekly',
    description: 'Backup every Sunday at 2:00 AM'
  },
  {
    label: 'Weekly on Monday',
    value: '0 2 * * 1',
    frequency: 'weekly',
    description: 'Backup every Monday at 2:00 AM'
  },
  {
    label: 'Monthly on 1st',
    value: '0 2 1 * *',
    frequency: 'monthly',
    description: 'Backup on the 1st of every month at 2:00 AM'
  }
]

export const RETENTION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
  { label: '1 year', value: 365 }
]

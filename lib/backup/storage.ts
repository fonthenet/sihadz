/**
 * Server Storage Service
 * PRIMARY backup storage using Supabase Storage
 */

import { createAdminClient } from '@/lib/supabase/server'
import { EncryptedBackup, BackupFile } from './types'

const BUCKET_NAME = 'backup-files'

// =====================================================
// STORAGE OPERATIONS
// =====================================================

/**
 * Save encrypted backup to Supabase Storage
 */
export async function saveBackupToStorage(
  userId: string,
  backup: EncryptedBackup,
  filename: string
): Promise<{ storage_path: string; file_size_bytes: number }> {
  const supabase = createAdminClient()
  
  // Create storage path: backups/{user_id}/{filename}
  const storagePath = `backups/${userId}/${filename}`
  
  // Convert backup to JSON string
  const backupJson = JSON.stringify(backup)
  const backupBlob = new Blob([backupJson], { type: 'application/json' })
  
  // Upload to storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, backupBlob, {
      contentType: 'application/json',
      upsert: false // Don't overwrite existing
    })
  
  if (error) {
    throw new Error(`Failed to upload backup: ${error.message}`)
  }
  
  return {
    storage_path: data.path,
    file_size_bytes: backupBlob.size
  }
}

/**
 * Download backup from Supabase Storage
 */
export async function downloadBackupFromStorage(
  storagePath: string
): Promise<EncryptedBackup> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath)
  
  if (error) {
    throw new Error(`Failed to download backup: ${error.message}`)
  }
  
  const text = await data.text()
  return JSON.parse(text) as EncryptedBackup
}

/**
 * Delete backup from Supabase Storage
 */
export async function deleteBackupFromStorage(storagePath: string): Promise<void> {
  const supabase = createAdminClient()
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath])
  
  if (error) {
    throw new Error(`Failed to delete backup: ${error.message}`)
  }
}

/**
 * Get signed URL for backup download (time-limited)
 */
export async function getBackupDownloadUrl(
  storagePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn)
  
  if (error) {
    throw new Error(`Failed to create download URL: ${error.message}`)
  }
  
  return data.signedUrl
}

/**
 * List all backup files for a user
 */
export async function listStorageBackups(userId: string): Promise<string[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`backups/${userId}`, {
      sortBy: { column: 'created_at', order: 'desc' }
    })
  
  if (error) {
    throw new Error(`Failed to list backups: ${error.message}`)
  }
  
  return data.map(file => `backups/${userId}/${file.name}`)
}

/**
 * Get storage usage for a user
 */
export async function getStorageUsage(userId: string): Promise<number> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`backups/${userId}`)
  
  if (error) {
    throw new Error(`Failed to get storage usage: ${error.message}`)
  }
  
  return data.reduce((total, file) => total + (file.metadata?.size || 0), 0)
}

// =====================================================
// DATABASE OPERATIONS
// =====================================================

/**
 * Create backup file record in database
 */
export async function createBackupRecord(
  data: Omit<BackupFile, 'id' | 'created_at' | 'updated_at'>
): Promise<BackupFile> {
  const supabase = createAdminClient()
  
  const { data: backup, error } = await supabase
    .from('backup_files')
    .insert(data)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create backup record: ${error.message}`)
  }
  
  return backup
}

/**
 * Update backup file record
 */
export async function updateBackupRecord(
  backupId: string,
  updates: Partial<BackupFile>
): Promise<BackupFile> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_files')
    .update(updates)
    .eq('id', backupId)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update backup record: ${error.message}`)
  }
  
  return data
}

/**
 * Get backup file by ID
 */
export async function getBackupById(backupId: string): Promise<BackupFile | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_files')
    .select('*')
    .eq('id', backupId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get backup: ${error.message}`)
  }
  
  return data
}

/**
 * List backups for user
 */
export async function listBackups(
  userId: string,
  options: {
    professional_id?: string
    backup_type?: string
    status?: string
    include_expired?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ backups: BackupFile[]; total: number }> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from('backup_files')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (options.professional_id) {
    query = query.eq('professional_id', options.professional_id)
  }
  
  if (options.backup_type) {
    query = query.eq('backup_type', options.backup_type)
  }
  
  if (options.status) {
    query = query.eq('status', options.status)
  } else if (!options.include_expired) {
    query = query.eq('status', 'active')
  }
  
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Failed to list backups: ${error.message}`)
  }
  
  return {
    backups: data || [],
    total: count || 0
  }
}

/**
 * Delete backup (soft delete - marks as deleted)
 */
export async function deleteBackup(backupId: string): Promise<void> {
  const supabase = createAdminClient()
  
  // Get backup to find storage path
  const backup = await getBackupById(backupId)
  if (!backup) {
    throw new Error('Backup not found')
  }
  
  // Delete from storage
  try {
    await deleteBackupFromStorage(backup.storage_path)
  } catch (e) {
    console.warn('Failed to delete from storage:', e)
  }
  
  // Mark as deleted in database
  const { error } = await supabase
    .from('backup_files')
    .update({ status: 'deleted' })
    .eq('id', backupId)
  
  if (error) {
    throw new Error(`Failed to delete backup: ${error.message}`)
  }
}

/**
 * Get backup count for user
 */
export async function getBackupCount(userId: string): Promise<number> {
  const supabase = createAdminClient()
  
  const { count, error } = await supabase
    .from('backup_files')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')
  
  if (error) {
    throw new Error(`Failed to count backups: ${error.message}`)
  }
  
  return count || 0
}

// =====================================================
// SCHEDULE OPERATIONS
// =====================================================

/**
 * Get backup schedule for user
 */
export async function getBackupSchedule(
  userId: string,
  professionalId?: string
): Promise<import('./types').BackupSchedule | null> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from('backup_schedules')
    .select('*')
    .eq('user_id', userId)
  
  if (professionalId) {
    query = query.eq('professional_id', professionalId)
  } else {
    query = query.is('professional_id', null)
  }
  
  const { data, error } = await query.single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get schedule: ${error.message}`)
  }
  
  return data
}

/**
 * Create or update backup schedule
 */
export async function upsertBackupSchedule(
  userId: string,
  schedule: Partial<import('./types').BackupSchedule>
): Promise<import('./types').BackupSchedule> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_schedules')
    .upsert({
      user_id: userId,
      ...schedule
    }, {
      onConflict: 'user_id,professional_id,backup_type'
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to save schedule: ${error.message}`)
  }
  
  return data
}

// =====================================================
// GOOGLE CONNECTION OPERATIONS
// =====================================================

/**
 * Get Google Drive connection for user
 */
export async function getGoogleConnection(
  userId: string
): Promise<import('./types').BackupGoogleConnection | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_google_connections')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get Google connection: ${error.message}`)
  }
  
  return data
}

/**
 * Save Google Drive connection
 */
export async function saveGoogleConnection(
  userId: string,
  connection: Partial<import('./types').BackupGoogleConnection>
): Promise<import('./types').BackupGoogleConnection> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_google_connections')
    .upsert({
      user_id: userId,
      ...connection
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to save Google connection: ${error.message}`)
  }
  
  return data
}

/**
 * Delete Google Drive connection
 */
export async function deleteGoogleConnection(userId: string): Promise<void> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('backup_google_connections')
    .delete()
    .eq('user_id', userId)
  
  if (error) {
    throw new Error(`Failed to delete Google connection: ${error.message}`)
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate backup filename
 */
export function generateBackupFilename(
  backupType: string,
  professionalId?: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const suffix = professionalId ? `-${professionalId.substring(0, 8)}` : ''
  return `${timestamp}-${backupType}${suffix}.dzdbackup`
}

/**
 * Calculate expiry date based on retention days
 */
export function calculateExpiryDate(retentionDays: number): string {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + retentionDays)
  return expiry.toISOString()
}

/**
 * Ensure storage bucket exists
 */
export async function ensureStorageBucket(): Promise<void> {
  const supabase = createAdminClient()
  
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.warn('Could not list buckets, attempting to use bucket directly:', listError.message)
      // Try to use the bucket anyway - it might exist but we can't list
      return
    }
    
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)
    
    if (!bucketExists) {
      console.log(`Creating backup storage bucket: ${BUCKET_NAME}`)
      
      // Create bucket with minimal options (size limits can be set in Supabase dashboard)
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false
      })
      
      if (error) {
        // Check for various "already exists" error formats
        const alreadyExists = 
          error.message.includes('already exists') ||
          error.message.includes('Bucket already exists') ||
          error.message.includes('duplicate') ||
          (error as any).code === '23505'
        
        if (!alreadyExists) {
          console.error('Failed to create backup bucket:', error)
          throw new Error(`Failed to create storage bucket: ${error.message}`)
        }
        
        console.log('Bucket already exists, continuing...')
      } else {
        console.log('Backup storage bucket created successfully')
      }
    }
  } catch (error: any) {
    console.error('ensureStorageBucket error:', error)
    // Don't throw - try to continue anyway, the actual upload will fail with a better error if bucket truly doesn't exist
  }
}

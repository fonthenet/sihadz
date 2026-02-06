/**
 * POST /api/backup/create
 * Create a new encrypted backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  exportBackupData,
  createEncryptedBackup,
  saveBackupToStorage,
  createBackupRecord,
  generateBackupFilename,
  calculateExpiryDate,
  getBackupSchedule,
  ensureStorageBucket,
  syncBackupToGoogleDrive,
  getGoogleConnection,
  CreateBackupRequest
} from '@/lib/backup'

export async function POST(request: NextRequest) {
  let step = 'init'
  
  try {
    step = 'auth'
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    step = 'parse'
    // Parse request body
    const body: CreateBackupRequest & { return_backup_data?: boolean } = await request.json()
    const { 
      backup_type = 'full', 
      professional_id, 
      is_pinned = false,
      sync_to_google = false,
      return_backup_data = false // Return encrypted backup for local PC saving
    } = body
    
    // Validate backup type
    if (!['full', 'pharmacy', 'professional', 'patient'].includes(backup_type)) {
      return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 })
    }
    
    step = 'bucket'
    // Ensure storage bucket exists
    await ensureStorageBucket()
    
    step = 'schedule'
    // Get retention settings
    const schedule = await getBackupSchedule(user.id, professional_id)
    const retentionDays = schedule?.retention_days || 30
    
    step = 'export'
    // Export data
    const backupData = await exportBackupData(user.id, backup_type, professional_id)
    
    step = 'encrypt'
    // Encrypt backup
    const encryptedBackup = await createEncryptedBackup(
      backupData,
      backup_type,
      professional_id || user.id,
      professional_id ? 'professional' : 'user'
    )
    
    step = 'filename'
    // Generate filename
    const filename = generateBackupFilename(backup_type, professional_id)
    
    step = 'storage'
    // Save to server storage
    const { storage_path, file_size_bytes } = await saveBackupToStorage(
      user.id,
      encryptedBackup,
      filename
    )
    
    step = 'record'
    // Create database record
    const backupRecord = await createBackupRecord({
      user_id: user.id,
      professional_id: professional_id || undefined,
      filename,
      storage_path,
      file_size_bytes,
      backup_type,
      checksum: encryptedBackup.checksum,
      backup_version: encryptedBackup.version,
      is_pinned,
      status: 'active',
      is_local_only: false,
      expires_at: is_pinned ? undefined : calculateExpiryDate(retentionDays)
    })
    
    // Optionally sync to Google Drive
    let googleFileId: string | undefined
    if (sync_to_google) {
      const googleConnection = await getGoogleConnection(user.id)
      if (googleConnection?.is_active) {
        try {
          googleFileId = await syncBackupToGoogleDrive(user.id, backupRecord.id)
        } catch (e) {
          console.warn('Failed to sync to Google Drive:', e)
        }
      }
    }
    
    const response: Record<string, any> = {
      success: true,
      backup: {
        ...backupRecord,
        google_file_id: googleFileId
      }
    }
    
    // Include encrypted backup data for local PC saving (if requested)
    if (return_backup_data) {
      response.encrypted_backup = encryptedBackup
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error(`Backup creation error at step "${step}":`, error)
    
    // Provide helpful error messages based on step
    let userMessage = error.message || 'Failed to create backup'
    
    if (step === 'bucket') {
      userMessage = 'Storage not available. Please contact support.'
    } else if (step === 'encrypt') {
      userMessage = 'Encryption failed. Please check server configuration.'
    } else if (step === 'storage') {
      userMessage = `Failed to save backup: ${error.message}`
    } else if (step === 'record') {
      userMessage = 'Failed to save backup record. Backup file was created but not recorded.'
    } else if (step === 'export') {
      userMessage = `Failed to export data: ${error.message}`
    }
    
    return NextResponse.json(
      { error: userMessage, step, details: error.message },
      { status: 500 }
    )
  }
}

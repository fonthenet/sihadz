/**
 * POST /api/backup/restore
 * Restore from a backup (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { 
  getBackupById,
  downloadBackupFromStorage,
  downloadFromGoogleDrive,
  decryptBackup,
  validateBackupFormat,
  importBackupData,
  RestoreBackupRequest
} from '@/lib/backup'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin (you may want to adjust this check)
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // For now, allow users to restore their own backups
    // In production, you might want to restrict to admins only
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    
    // Parse request body
    const body: RestoreBackupRequest = await request.json()
    const { backup_id, restore_type = 'full', selected_sections, dry_run = true } = body
    
    // Get backup record
    const backup = await getBackupById(backup_id)
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    
    // Verify ownership (admins can restore any backup)
    if (!isAdmin && backup.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Download backup file
    let encryptedBackup
    try {
      encryptedBackup = await downloadBackupFromStorage(backup.storage_path)
    } catch (e) {
      // Try Google Drive as fallback
      if (backup.google_file_id) {
        const content = await downloadFromGoogleDrive(user.id, backup.google_file_id)
        encryptedBackup = JSON.parse(content)
      } else {
        throw new Error('Backup file not found on server or Google Drive')
      }
    }
    
    // Validate format
    if (!validateBackupFormat(encryptedBackup)) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      )
    }
    
    // Decrypt backup
    const { data: backupData, verified } = await decryptBackup(encryptedBackup)
    
    if (!verified) {
      return NextResponse.json({
        warning: 'Backup checksum verification failed. Data may be corrupted.',
        verified: false
      }, { status: 400 })
    }
    
    // Import data
    const result = await importBackupData(backupData as any, {
      dry_run,
      selected_sections
    })
    
    return NextResponse.json({
      success: true,
      dry_run,
      ...result
    })
    
  } catch (error: any) {
    console.error('Restore backup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to restore backup' },
      { status: 500 }
    )
  }
}

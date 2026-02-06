/**
 * GET /api/backup/settings - Get backup configuration
 * PATCH /api/backup/settings - Update backup configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  getBackupSchedule, 
  upsertBackupSchedule,
  getGoogleConnection,
  getBackupCount,
  getStorageUsage,
  isGoogleDriveConfigured,
  BackupSettingsRequest
} from '@/lib/backup'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get professional_id from query
    const searchParams = request.nextUrl.searchParams
    const professionalId = searchParams.get('professional_id') || undefined
    
    // Get schedule
    const schedule = await getBackupSchedule(user.id, professionalId)
    
    // Get Google connection status
    const googleConnection = await getGoogleConnection(user.id)
    
    // Get backup stats
    const backupCount = await getBackupCount(user.id)
    let storageUsed = 0
    try {
      storageUsed = await getStorageUsage(user.id)
    } catch (e) {
      // Storage might not be set up yet
    }
    
    return NextResponse.json({
      schedule,
      google_connected: !!googleConnection?.is_active,
      google_email: googleConnection?.email,
      google_drive_available: isGoogleDriveConfigured(),
      storage_used_bytes: storageUsed,
      backup_count: backupCount
    })
    
  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse request body
    const body: BackupSettingsRequest & { professional_id?: string } = await request.json()
    const { 
      professional_id,
      schedule,
      retention_days,
      min_backups_to_keep,
      auto_sync_google,
      auto_sync_icloud,
      is_enabled
    } = body
    
    // Build update object
    const updates: Record<string, any> = {}
    if (schedule !== undefined) updates.schedule = schedule
    if (retention_days !== undefined) updates.retention_days = retention_days
    if (min_backups_to_keep !== undefined) updates.min_backups_to_keep = min_backups_to_keep
    if (auto_sync_google !== undefined) updates.auto_sync_google = auto_sync_google
    if (auto_sync_icloud !== undefined) updates.auto_sync_icloud = auto_sync_icloud
    if (is_enabled !== undefined) updates.is_enabled = is_enabled
    
    // Upsert schedule
    const updatedSchedule = await upsertBackupSchedule(user.id, {
      professional_id,
      backup_type: 'full',
      ...updates
    })
    
    return NextResponse.json({
      success: true,
      schedule: updatedSchedule
    })
    
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}

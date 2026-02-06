/**
 * GET /api/backup/[id] - Get backup details
 * DELETE /api/backup/[id] - Delete backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  getBackupById, 
  deleteBackup, 
  getBackupDownloadUrl,
  deleteFromGoogleDrive,
  getGoogleConnection
} from '@/lib/backup'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get backup
    const backup = await getBackupById(params.id)
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    
    // Verify ownership
    if (backup.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get download URL
    const downloadUrl = await getBackupDownloadUrl(backup.storage_path)
    
    return NextResponse.json({
      backup,
      download_url: downloadUrl
    })
    
  } catch (error: any) {
    console.error('Get backup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get backup' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get backup
    const backup = await getBackupById(params.id)
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    
    // Verify ownership
    if (backup.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Delete from Google Drive if synced
    if (backup.google_file_id) {
      const googleConnection = await getGoogleConnection(user.id)
      if (googleConnection?.is_active) {
        try {
          await deleteFromGoogleDrive(user.id, backup.google_file_id)
        } catch (e) {
          console.warn('Failed to delete from Google Drive:', e)
        }
      }
    }
    
    // Delete backup
    await deleteBackup(params.id)
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Delete backup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete backup' },
      { status: 500 }
    )
  }
}

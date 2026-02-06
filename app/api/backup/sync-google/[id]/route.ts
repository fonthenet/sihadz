/**
 * POST /api/backup/sync-google/[id]
 * Sync a specific backup to Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  getBackupById, 
  getGoogleConnection,
  syncBackupToGoogleDrive
} from '@/lib/backup'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
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
    
    // Check if already synced
    if (backup.google_file_id) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already synced to Google Drive',
        google_file_id: backup.google_file_id
      })
    }
    
    // Check Google connection
    const googleConnection = await getGoogleConnection(user.id)
    if (!googleConnection?.is_active) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 400 }
      )
    }
    
    // Sync to Google Drive
    const googleFileId = await syncBackupToGoogleDrive(user.id, params.id)
    
    return NextResponse.json({
      success: true,
      google_file_id: googleFileId
    })
    
  } catch (error: any) {
    console.error('Sync to Google error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync to Google Drive' },
      { status: 500 }
    )
  }
}

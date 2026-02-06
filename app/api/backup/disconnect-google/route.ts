/**
 * DELETE /api/backup/disconnect-google
 * Disconnect Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { disconnectGoogleDrive } from '@/lib/backup'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Disconnect
    await disconnectGoogleDrive(user.id)
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Disconnect Google error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Google Drive' },
      { status: 500 }
    )
  }
}

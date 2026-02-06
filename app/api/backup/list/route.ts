/**
 * GET /api/backup/list
 * List user's backups
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listBackups, ListBackupsRequest } from '@/lib/backup'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const options: ListBackupsRequest = {
      backup_type: searchParams.get('backup_type') as any,
      professional_id: searchParams.get('professional_id') || undefined,
      status: searchParams.get('status') as any,
      include_expired: searchParams.get('include_expired') === 'true',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    }
    
    // Get backups
    const { backups, total } = await listBackups(user.id, options)
    
    return NextResponse.json({
      backups,
      total,
      has_more: (options.offset || 0) + backups.length < total
    })
    
  } catch (error: any) {
    console.error('List backups error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list backups' },
      { status: 500 }
    )
  }
}

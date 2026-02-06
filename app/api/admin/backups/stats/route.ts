/**
 * GET /api/admin/backups/stats
 * Get backup system statistics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check admin role (using user_type field)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()
    
    // Super admin emails bypass database check
    const SUPER_ADMIN_EMAILS = ['f.onthenet@gmail.com', 'info@sihadz.com']
    const isEmailAdmin = SUPER_ADMIN_EMAILS.includes(profile?.email || user.email || '')
    const isDbAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin'
    
    if (!isEmailAdmin && !isDbAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    
    // Get total backups count
    const { count: totalBackups } = await adminClient
      .from('backup_files')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    // Get total storage used
    const { data: sizeData } = await adminClient
      .from('backup_files')
      .select('file_size_bytes')
      .eq('status', 'active')
    
    const totalSize = sizeData?.reduce((sum, b) => sum + (b.file_size_bytes || 0), 0) || 0
    
    // Get active schedules count
    const { count: activeSchedules } = await adminClient
      .from('backup_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('is_enabled', true)
    
    // Get Google connections count
    const { count: googleConnections } = await adminClient
      .from('backup_google_connections')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    return NextResponse.json({
      totalBackups: totalBackups || 0,
      totalSize: totalSize,
      activeSchedules: activeSchedules || 0,
      googleConnections: googleConnections || 0
    })
    
  } catch (error: any) {
    console.error('Admin backup stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

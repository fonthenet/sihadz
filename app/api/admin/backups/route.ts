/**
 * GET /api/admin/backups
 * List all backups across the platform (admin only)
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
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    
    let query = adminClient
      .from('backup_files')
      .select(`
        *,
        profiles:user_id (email, full_name),
        professionals:professional_id (business_name, type)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: backups, error } = await query
    
    if (error) {
      console.error('Failed to fetch backups:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Transform data for frontend
    const transformedBackups = backups?.map(b => ({
      ...b,
      user_email: b.profiles?.email,
      user_name: b.profiles?.full_name,
      professional_name: b.professionals?.business_name,
      professional_type: b.professionals?.type
    })) || []
    
    return NextResponse.json({ backups: transformedBackups })
    
  } catch (error: any) {
    console.error('Admin backups error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch backups' },
      { status: 500 }
    )
  }
}

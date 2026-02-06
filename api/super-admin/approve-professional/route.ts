// @ts-nocheck
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { professionalId, action, rejectionReason } = await request.json()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status - allow both 'admin' and 'super_admin'
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.user_type || !['admin', 'super_admin'].includes(profile.user_type)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Get the professional data first
    const { data: professional, error: fetchError } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', professionalId)
      .single()

    if (fetchError || !professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Update professional status in the unified professionals table
    // Status 'verified' is the enum value for approved professionals
    const updateData: any = {
      status: action === 'approve' ? 'verified' : 'rejected',
      verified_at: action === 'approve' ? new Date().toISOString() : null,
      verified_by: user.id,
      is_verified: action === 'approve',
      is_active: action === 'approve',
    }

    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    const { data: updateResult, error: updateError } = await supabase
      .from('professionals')
      .update(updateData)
      .eq('id', professionalId)
      .select()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: action === 'approve' ? 'Professional verified successfully' : 'Professional rejected',
      professional: {
        id: professionalId,
        type: professional.type,
        status: action === 'approve' ? 'verified' : 'rejected'
      }
    })
  } catch (error: any) {
    console.error('[v0] Admin approval error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

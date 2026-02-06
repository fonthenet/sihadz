import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireSuperAdmin()
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authError === 'Admin access required' ? 403 : 401 })
    }

    const { professionalId, action, rejectionReason } = await request.json()

    const admin = createAdminClient()

    // Get the professional data first (admin client bypasses RLS)
    const { data: professional, error: fetchError } = await admin
      .from('professionals')
      .select('*')
      .eq('id', professionalId)
      .single()

    if (fetchError || !professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    // Update professional status - admin client ensures full authority
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

    const { error: updateError } = await admin
      .from('professionals')
      .update(updateData)
      .eq('id', professionalId)

    if (updateError) {
      console.error('[super-admin] approve-professional error:', updateError)
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

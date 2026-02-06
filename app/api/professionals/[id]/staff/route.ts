import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/professionals/[id]/staff
 * Updates the lab_staff JSONB column for a laboratory professional.
 * Only the authenticated professional owner can update their own staff.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify caller owns this professional record
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id, type')
      .eq('id', professionalId)
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    if (professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to update this professional' }, { status: 403 })
    }

    if (professional.type !== 'laboratory') {
      return NextResponse.json({ error: 'Staff management is only for laboratories' }, { status: 400 })
    }

    const body = await request.json()
    const { lab_staff } = body

    if (!lab_staff || typeof lab_staff !== 'object') {
      return NextResponse.json({ error: 'Invalid lab_staff payload' }, { status: 400 })
    }

    // Use admin client to bypass any RLS issues
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('professionals')
      .update({
        lab_staff,
        updated_at: new Date().toISOString(),
      })
      .eq('id', professionalId)

    if (updateError) {
      console.error('[professionals/staff PATCH] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lab_staff })
  } catch (e) {
    console.error('[professionals/staff PATCH] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/professionals/[id]/staff
 * Returns the lab_staff for a laboratory professional.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: professional, error } = await admin
      .from('professionals')
      .select('id, lab_staff')
      .eq('id', professionalId)
      .single()

    if (error || !professional) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
    }

    return NextResponse.json({
      lab_staff: professional.lab_staff || { technicians: [], pathologists: [] },
    })
  } catch (e) {
    console.error('[professionals/staff GET] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

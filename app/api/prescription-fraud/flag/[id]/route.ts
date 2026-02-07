import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/prescription-fraud/flag/[id]
 * Resolve or dismiss a flag. The flagger (doctor/pharmacy who created it) can update their own flags.
 * Super admin can update any flag.
 *
 * Body: {
 *   status: 'under_review' | 'resolved' | 'dismissed',
 *   resolutionNotes?: string,
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flagId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, resolutionNotes } = body

    if (!status || !['under_review', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'status must be under_review, resolved, or dismissed' }, { status: 400 })
    }

    const { data: flag } = await supabase
      .from('prescription_fraud_flags')
      .select('id, flagged_by')
      .eq('id', flagId)
      .single()

    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.user_type === 'super_admin' || profile?.user_type === 'admin'
    const isFlagger = professional && professional.id === flag.flagged_by

    if (!isAdmin && !isFlagger) {
      return NextResponse.json({ error: 'Only the flagger or admin can update this flag' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = user.id
      updateData.resolution_notes = resolutionNotes ?? null
    }

    const { data: updated, error } = await supabase
      .from('prescription_fraud_flags')
      .update(updateData)
      .eq('id', flagId)
      .select('id, status, resolved_at, resolution_notes')
      .single()

    if (error) {
      console.error('[prescription-fraud/flag/[id]] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, flag: updated })
  } catch (e) {
    console.error('[prescription-fraud/flag/[id]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

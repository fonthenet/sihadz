import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH: Update current professional's practice settings (e.g. auto_confirm_appointments).
 * Uses service role so the update is not blocked by RLS. Only the owner can update.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { auto_confirm_appointments } = body

    const admin = createAdminClient()

    // Resolve professional by auth_user_id so only owner can update
    const { data: pro, error: fetchError } = await admin
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (fetchError || !pro?.id) {
      return NextResponse.json({ error: 'Professional record not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof auto_confirm_appointments === 'boolean') {
      updates.auto_confirm_appointments = auto_confirm_appointments
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid settings to update' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('professionals')
      .update(updates)
      .eq('id', pro.id)

    if (updateError) {
      console.error('[professional/settings] Update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update settings' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, updated: updates })
  } catch (err) {
    console.error('[professional/settings] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalIdFromRequest, POS_PROFESSIONAL_TYPES } from '@/lib/professional/auth'

/**
 * GET /api/professional/pos/drawers
 * List cash drawers for the professional
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: drawers, error } = await admin
      .from('professional_cash_drawers')
      .select('*')
      .eq('professional_id', auth.professionalId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const drawerIds = drawers?.map((d) => d.id) || []
    const { data: sessions } = await admin
      .from('professional_cash_drawer_sessions')
      .select('drawer_id, id, session_number, opened_at, opened_by_name')
      .in('drawer_id', drawerIds)
      .eq('status', 'open')

    const sessionByDrawer = new Map(sessions?.map((s) => [s.drawer_id, s]))
    const enrichedDrawers = drawers?.map((d) => ({
      ...d,
      current_session: sessionByDrawer.get(d.id) || null,
    }))

    return NextResponse.json({ drawers: enrichedDrawers || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/professional/pos/drawers
 * Create a new cash drawer
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const body = await request.json()
    const { name, code } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const { data: drawer, error } = await admin
      .from('professional_cash_drawers')
      .insert({
        professional_id: auth.professionalId,
        name,
        code: code.toUpperCase(),
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A drawer with this code already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      drawer,
      message: `Drawer "${name}" created`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

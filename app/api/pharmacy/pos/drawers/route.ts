import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/pos/drawers
 * List cash drawers for the pharmacy (owner or employee)
 * Uses admin client to bypass RLS - employees use cookie auth, not Supabase auth.
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const { data: drawers, error } = await admin
      .from('pharmacy_cash_drawers')
      .select(`
        *,
        warehouse:pharmacy_warehouses(id, name, code)
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get open session for each drawer
    const drawerIds = drawers?.map(d => d.id) || []
    const { data: sessions } = await admin
      .from('cash_drawer_sessions')
      .select('drawer_id, id, session_number, opened_at, opened_by_name')
      .in('drawer_id', drawerIds)
      .eq('status', 'open')

    const sessionByDrawer = new Map(sessions?.map(s => [s.drawer_id, s]))

    const enrichedDrawers = drawers?.map(d => ({
      ...d,
      current_session: sessionByDrawer.get(d.id) || null
    }))

    return NextResponse.json({ drawers: enrichedDrawers || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/pos/drawers
 * Create a new cash drawer (owner or employee with manage_settings permission)
 */
export async function POST(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const body = await request.json()
    const { name, code, warehouse_id } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const { data: drawer, error } = await admin
      .from('pharmacy_cash_drawers')
      .insert({
        pharmacy_id: pharmacyId,
        name,
        code: code.toUpperCase(),
        warehouse_id,
        is_active: true
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
      message: `Drawer "${name}" created`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OpenSessionData, CloseSessionData } from '@/lib/pos/types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/pos/sessions
 * List cash drawer sessions (owner or employee)
 * Uses admin client to bypass RLS - employees use cookie auth.
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const drawerId = searchParams.get('drawer_id')
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = admin
      .from('cash_drawer_sessions')
      .select(`
        *,
        drawer:pharmacy_cash_drawers(id, name, code)
      `)
      .eq('pharmacy_id', pharmacyId)
      .order('opened_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (drawerId) query = query.eq('drawer_id', drawerId)
    if (activeOnly) query = query.eq('status', 'open')

    const { data: sessions, error } = await query.limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get current open session
    const openSession = sessions?.find(s => s.status === 'open')

    return NextResponse.json({
      sessions: sessions || [],
      current_session: openSession || null
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/pos/sessions
 * Open a new cash drawer session (owner or employee)
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

    // Get actor name for audit
    let actorName = 'Staff'
    if (auth.isEmployee) {
      const { data: emp } = await admin
        .from('professional_employees')
        .select('display_name')
        .eq('id', auth.actorId)
        .single()
      actorName = emp?.display_name || 'Staff'
    } else {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', auth.actorId)
        .single()
      actorName = profile?.full_name || 'Owner'
    }

    const body: OpenSessionData = await request.json()

    if (!body.drawer_id) {
      return NextResponse.json({ error: 'Drawer ID is required' }, { status: 400 })
    }

    // Check no open session exists for this drawer
    const { data: existingOpen } = await admin
      .from('cash_drawer_sessions')
      .select('id, session_number')
      .eq('drawer_id', body.drawer_id)
      .eq('status', 'open')
      .single()

    if (existingOpen) {
      return NextResponse.json({ 
        error: `Drawer already has open session: ${existingOpen.session_number}` 
      }, { status: 400 })
    }

    // Get next session number
    const today = new Date().toISOString().split('T')[0]
    const { data: sessionNumber } = await admin.rpc('get_next_sequence', {
      p_pharmacy_id: pharmacyId,
      p_sequence_type: 'session',
      p_prefix: `SESSION-${today}`
    })

    const { data: session, error } = await admin
      .from('cash_drawer_sessions')
      .insert({
        pharmacy_id: pharmacyId,
        drawer_id: body.drawer_id,
        session_number: sessionNumber || `SESSION-${Date.now()}`,
        opened_at: new Date().toISOString(),
        opened_by: auth.actorId,
        opened_by_name: actorName,
        opening_balance: body.opening_balance || 0,
        opening_notes: body.opening_notes,
        status: 'open'
      })
      .select(`
        *,
        drawer:pharmacy_cash_drawers(id, name, code)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session,
      message: `Session ${session.session_number} opened`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/pos/sessions
 * Close a session (with reconciliation) - owner or employee
 * Uses admin client to bypass RLS.
 */
export async function PATCH(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    // Get actor name for audit
    let actorName = 'Staff'
    if (auth.isEmployee) {
      const { data: emp } = await admin
        .from('professional_employees')
        .select('display_name')
        .eq('id', auth.actorId)
        .single()
      actorName = emp?.display_name || 'Staff'
    } else {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', auth.actorId)
        .single()
      actorName = profile?.full_name || 'Owner'
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const body: CloseSessionData = await request.json()

    // Get session
    const { data: session } = await admin
      .from('cash_drawer_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'open') {
      return NextResponse.json({ error: 'Session is not open' }, { status: 400 })
    }

    // Calculate system totals from sales in this session
    const { data: sales } = await admin
      .from('pos_sales')
      .select('paid_cash, paid_card, paid_cheque, chifa_total, change_given')
      .eq('session_id', sessionId)
      .eq('status', 'completed')

    const systemCash = (sales || []).reduce((sum, s) => 
      sum + (s.paid_cash || 0) - (s.change_given || 0), session.opening_balance)
    const systemCards = (sales || []).reduce((sum, s) => sum + (s.paid_card || 0), 0)
    const systemCheques = (sales || []).reduce((sum, s) => sum + (s.paid_cheque || 0), 0)
    const systemChifa = (sales || []).reduce((sum, s) => sum + (s.chifa_total || 0), 0)

    // Calculate variance
    const varianceCash = (body.counted_cash || 0) - systemCash

    const { data: closedSession, error } = await admin
      .from('cash_drawer_sessions')
      .update({
        closed_at: new Date().toISOString(),
        closed_by: auth.actorId,
        closed_by_name: actorName,
        counted_cash: body.counted_cash,
        counted_cheques: body.counted_cheques,
        counted_cards: body.counted_cards,
        system_cash: systemCash,
        system_cheques: systemCheques,
        system_cards: systemCards,
        system_chifa: systemChifa,
        variance_cash: varianceCash,
        variance_notes: body.variance_notes,
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: closedSession,
      summary: {
        system_cash: systemCash,
        counted_cash: body.counted_cash,
        variance: varianceCash,
        system_chifa: systemChifa
      },
      message: `Session closed. Variance: ${varianceCash >= 0 ? '+' : ''}${varianceCash.toFixed(2)} DZD`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

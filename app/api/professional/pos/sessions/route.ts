import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalIdFromRequest, POS_PROFESSIONAL_TYPES } from '@/lib/professional/auth'

interface OpenSessionData {
  drawer_id: string
  opening_balance: number
  opening_notes?: string
}

interface CloseSessionData {
  counted_cash: number
  counted_cheques?: number
  counted_cards?: number
  variance_notes?: string
}

async function getActorName(admin: ReturnType<typeof createAdminClient>, auth: { isEmployee: boolean; actorId: string }) {
  if (auth.isEmployee) {
    const { data: emp } = await admin
      .from('professional_employees')
      .select('display_name')
      .eq('id', auth.actorId)
      .single()
    return emp?.display_name || 'Staff'
  }
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', auth.actorId)
    .single()
  return profile?.full_name || 'Owner'
}

/**
 * GET /api/professional/pos/sessions
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = admin
      .from('professional_cash_drawer_sessions')
      .select('*, drawer:professional_cash_drawers(id, name, code)')
      .eq('professional_id', auth.professionalId)
      .order('opened_at', { ascending: false })
      .limit(limit)

    if (activeOnly) {
      query = query.eq('status', 'open')
    }

    const { data: sessions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const openSession = sessions?.find((s) => s.status === 'open')

    return NextResponse.json({
      sessions: sessions || [],
      current_session: openSession || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/professional/pos/sessions
 * Open a new cash drawer session
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const actorName = await getActorName(admin, auth)
    const body: OpenSessionData = await request.json()

    if (!body.drawer_id) {
      return NextResponse.json({ error: 'Drawer ID is required' }, { status: 400 })
    }

    const { data: existingOpen } = await admin
      .from('professional_cash_drawer_sessions')
      .select('id, session_number')
      .eq('drawer_id', body.drawer_id)
      .eq('status', 'open')
      .single()

    if (existingOpen) {
      return NextResponse.json({
        error: `Drawer already has open session: ${existingOpen.session_number}`,
      }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: sessionNumber } = await admin.rpc('get_next_professional_sequence', {
      p_professional_id: auth.professionalId,
      p_sequence_type: 'session',
      p_prefix: `SESSION-${today}`,
    })

    const { data: session, error } = await admin
      .from('professional_cash_drawer_sessions')
      .insert({
        professional_id: auth.professionalId,
        drawer_id: body.drawer_id,
        session_number: sessionNumber || `SESSION-${Date.now()}`,
        opened_at: new Date().toISOString(),
        opened_by: auth.actorId,
        opened_by_name: actorName,
        opening_balance: body.opening_balance || 0,
        opening_notes: body.opening_notes,
        status: 'open',
      })
      .select('*, drawer:professional_cash_drawers(id, name, code)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session,
      message: `Session ${session.session_number} opened`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/professional/pos/sessions?id=...
 * Close a session
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const actorName = await getActorName(admin, auth)
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const body: CloseSessionData = await request.json()

    const { data: session } = await admin
      .from('professional_cash_drawer_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('professional_id', auth.professionalId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'open') {
      return NextResponse.json({ error: 'Session is not open' }, { status: 400 })
    }

    const { data: sales } = await admin
      .from('professional_pos_sales')
      .select('paid_cash, paid_card, paid_cheque, chifa_total, change_given')
      .eq('session_id', sessionId)
      .eq('status', 'completed')

    const systemCash =
      (sales || []).reduce((sum, s) => sum + (s.paid_cash || 0) - (s.change_given || 0), session.opening_balance)
    const systemCards = (sales || []).reduce((sum, s) => sum + (s.paid_card || 0), 0)
    const systemCheques = (sales || []).reduce((sum, s) => sum + (s.paid_cheque || 0), 0)
    const systemChifa = (sales || []).reduce((sum, s) => sum + (s.chifa_total || 0), 0)
    const varianceCash = (body.counted_cash || 0) - systemCash

    const { data: closedSession, error } = await admin
      .from('professional_cash_drawer_sessions')
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
        updated_at: new Date().toISOString(),
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
        system_chifa: systemChifa,
      },
      message: `Session closed. Variance: ${varianceCash >= 0 ? '+' : ''}${varianceCash.toFixed(2)} DZD`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

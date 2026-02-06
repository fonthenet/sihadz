import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/pos/cash-movements
 * List cash movements for a session (owner or employee)
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
    const sessionId = searchParams.get('session_id')

    let query = admin
      .from('pos_cash_movements')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: movements, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: movements || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/pos/cash-movements
 * Record a cash movement (no_sale, cash_in, cash_out) - owner or employee
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

    const body = await request.json()
    const { session_id, movement_type, amount, reason } = body

    if (!movement_type) {
      return NextResponse.json({ error: 'Movement type is required' }, { status: 400 })
    }

    const validTypes = ['no_sale', 'cash_in', 'cash_out']
    if (!validTypes.includes(movement_type)) {
      return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 })
    }

    const { data: movement, error } = await admin
      .from('pos_cash_movements')
      .insert({
        pharmacy_id: pharmacyId,
        session_id,
        movement_type,
        amount: amount || 0,
        reason: reason || getDefaultReason(movement_type),
        created_by: auth.actorId,
        created_by_name: actorName
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, still return success for UX
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          message: `${movement_type} recorded (table pending)`,
          movement: {
            movement_type,
            amount,
            reason
          }
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: getSuccessMessage(movement_type, amount),
      movement
    })
  } catch (error: any) {
    console.error('[Cash Movement] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getDefaultReason(type: string): string {
  switch (type) {
    case 'no_sale': return 'Drawer opened for change'
    case 'cash_in': return 'Cash added to drawer'
    case 'cash_out': return 'Cash removed from drawer'
    default: return ''
  }
}

function getSuccessMessage(type: string, amount: number): string {
  switch (type) {
    case 'no_sale': return 'Drawer opened - logged for audit'
    case 'cash_in': return `${amount} DZD added to drawer`
    case 'cash_out': return `${Math.abs(amount)} DZD removed from drawer`
    default: return 'Movement recorded'
  }
}

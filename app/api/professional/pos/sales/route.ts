import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalIdFromRequest, POS_PROFESSIONAL_TYPES } from '@/lib/professional/auth'
import { calculateChifaSplit } from '@/lib/inventory/calculations'
import type { CreateProfessionalSaleData } from '@/lib/pos/professional-types'

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
 * GET /api/professional/pos/sales
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')
    const sessionId = searchParams.get('session_id')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')

    let query = admin
      .from('professional_pos_sales')
      .select('*, items:professional_pos_sale_items(*)', { count: 'exact' })
      .eq('professional_id', auth.professionalId)
      .order('created_at', { ascending: false })

    if (sessionId) query = query.eq('session_id', sessionId)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    if (search) {
      query = query.or(
        `sale_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      )
    }

    const from = (page - 1) * perPage
    query = query.range(from, from + perPage - 1)

    const { data: sales, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: sales || [],
      total: count || 0,
      page,
      per_page: perPage,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/professional/pos/sales
 * Create a new sale (manual line items, cash-focused)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const actorName = await getActorName(admin, auth)

    // Check if Chifa is enabled for this professional
    const { data: posSettings } = await admin
      .from('professional_pos_settings')
      .select('chifa_enabled')
      .eq('professional_id', auth.professionalId)
      .single()

    const chifaEnabled = posSettings?.chifa_enabled ?? false

    const body: CreateProfessionalSaleData = await request.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const { data: saleNumber } = await admin.rpc('get_next_professional_sequence', {
      p_professional_id: auth.professionalId,
      p_sequence_type: 'sale',
      p_prefix: 'TICKET',
    })

    let subtotal = 0
    let totalTax = 0
    let chifaTotal = 0
    let patientTotal = 0

    const processedItems: Array<{
      description: string
      quantity: number
      unit_price: number
      discount_amount: number
      discount_percent: number
      line_total: number
      is_chifa_item: boolean
      reimbursement_rate: number
      chifa_amount: number
      patient_amount: number
      service_id?: string | null
    }> = []

    for (const item of body.items) {
      const lineSubtotal = item.unit_price * item.quantity
      const lineDiscount = item.discount_amount ?? lineSubtotal * ((item.discount_percent || 0) / 100)
      const lineAfterDiscount = lineSubtotal - lineDiscount
      const lineTotal = lineAfterDiscount

      let itemChifa = 0
      let itemPatient = lineTotal
      const useChifa = chifaEnabled && (item.is_chifa_item ?? false) && (item.reimbursement_rate ?? 0) > 0
      if (useChifa) {
        const split = calculateChifaSplit(item.unit_price, undefined, item.reimbursement_rate! as 0 | 80 | 100, item.quantity)
        itemChifa = split.chifa_covered
        itemPatient = split.patient_portion
      }

      subtotal += lineSubtotal
      totalTax += 0
      chifaTotal += itemChifa
      patientTotal += itemPatient

      processedItems.push({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: lineDiscount,
        discount_percent: item.discount_percent || 0,
        line_total: lineTotal,
        is_chifa_item: useChifa,
        reimbursement_rate: item.reimbursement_rate || 0,
        chifa_amount: itemChifa,
        patient_amount: itemPatient,
        service_id: item.service_id || null,
      })
    }

    const overallDiscountPercent = body.discount_percent || 0
    const overallDiscount = subtotal * (overallDiscountPercent / 100)
    const totalAmount = subtotal - overallDiscount + totalTax

    const payments = body.payments || {}
    const totalPaid =
      (payments.cash || 0) +
      (payments.card || 0) +
      (payments.cheque || 0) +
      (payments.mobile || 0) +
      (payments.credit || 0)

    if (totalPaid < patientTotal - 0.01) {
      return NextResponse.json({
        error: `Insufficient payment. Patient owes ${patientTotal.toFixed(2)} DZD`,
      }, { status: 400 })
    }

    const changeGiven = Math.max(0, totalPaid - patientTotal)

    let drawerId: string | null = null
    if (body.session_id) {
      const { data: sess } = await admin
        .from('professional_cash_drawer_sessions')
        .select('drawer_id')
        .eq('id', body.session_id)
        .single()
      drawerId = sess?.drawer_id ?? null
    }

    const { data: sale, error: saleError } = await admin
      .from('professional_pos_sales')
      .insert({
        professional_id: auth.professionalId,
        sale_number: saleNumber || `TICKET-${Date.now()}`,
        session_id: body.session_id || null,
        drawer_id: drawerId,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        appointment_id: body.appointment_id || null,
        patient_id: body.patient_id || null,
        subtotal,
        discount_amount: overallDiscount,
        discount_percent: overallDiscountPercent,
        tax_amount: totalTax,
        total_amount: totalAmount,
        chifa_total: chifaTotal,
        patient_total: patientTotal,
        paid_cash: payments.cash || 0,
        paid_card: payments.card || 0,
        paid_cheque: payments.cheque || 0,
        paid_mobile: payments.mobile || 0,
        paid_credit: payments.credit || 0,
        change_given: changeGiven,
        status: 'completed',
        created_by: auth.actorId,
        created_by_name: actorName,
      })
      .select()
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    const saleItems = processedItems.map((item) => ({
      ...item,
      sale_id: sale.id,
    }))

    const { error: itemsError } = await admin.from('professional_pos_sale_items').insert(saleItems)

    if (itemsError) {
      console.error('Error inserting sale items:', itemsError)
    }

    // If this sale is linked to an appointment, update the appointment's payment status
    if (body.appointment_id) {
      const { error: appointmentError } = await admin
        .from('appointments')
        .update({
          payment_status: 'paid',
          pos_sale_id: sale.id,
        })
        .eq('id', body.appointment_id)

      if (appointmentError) {
        console.error('Error updating appointment payment status:', appointmentError)
      }
    }

    return NextResponse.json({
      success: true,
      sale: {
        ...sale,
        items: saleItems,
      },
      change_given: changeGiven,
      message: `Sale ${sale.sale_number} completed`,
    })
  } catch (error: any) {
    console.error('[Professional POS Sale] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

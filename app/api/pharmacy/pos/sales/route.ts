import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CreateSaleData, CartItem } from '@/lib/pos/types'
import { calculateChifaSplit } from '@/lib/inventory/calculations'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/pos/sales
 * List sales for the pharmacy (owner or employee)
 * Uses admin client to bypass RLS for employees.
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
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')
    const sessionId = searchParams.get('session_id')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')

    let query = admin
      .from('pos_sales')
      .select(`
        *,
        items:pos_sale_items(*)
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    if (sessionId) query = query.eq('session_id', sessionId)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    
    // Search by sale number, customer name, or customer phone
    if (search) {
      query = query.or(`sale_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
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
      per_page: perPage
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/pos/sales
 * Create a new sale (complete checkout) - owner or employee
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

    const body: CreateSaleData = await request.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Get next sale number
    const { data: saleNumber } = await admin.rpc('get_next_sequence', {
      p_pharmacy_id: pharmacyId,
      p_sequence_type: 'sale',
      p_prefix: 'TICKET'
    })

    // Calculate totals
    let subtotal = 0
    let totalTax = 0
    let chifaTotal = 0
    let patientTotal = 0

    const processedItems: Array<any> = []

    for (const item of body.items) {
      const lineSubtotal = item.unit_price * item.quantity
      const lineDiscount = item.discount_amount || (lineSubtotal * (item.discount_percent || 0) / 100)
      const lineAfterDiscount = lineSubtotal - lineDiscount
      const lineTax = lineAfterDiscount * (item.tva_rate || 0) / 100
      const lineTotal = lineAfterDiscount + lineTax

      // Chifa split
      let itemChifa = 0
      let itemPatient = lineTotal
      if (item.is_chifa_item && item.reimbursement_rate > 0) {
        const split = calculateChifaSplit(lineTotal, item.reimbursement_rate)
        itemChifa = split.cnasAmount
        itemPatient = split.patientAmount
      }

      subtotal += lineSubtotal
      totalTax += lineTax
      chifaTotal += itemChifa
      patientTotal += itemPatient

      processedItems.push({
        product_id: item.product_id,
        inventory_id: item.inventory_id,
        product_name: item.product_name,
        product_barcode: item.product_barcode,
        product_form: item.product_form || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        discount_amount: lineDiscount,
        discount_percent: item.discount_percent || 0,
        tva_rate: item.tva_rate || 0,
        tva_amount: lineTax,
        is_chifa_item: item.is_chifa_item || false,
        reimbursement_rate: item.reimbursement_rate || 0,
        chifa_amount: itemChifa,
        patient_amount: itemPatient,
        line_total: lineTotal,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        dosage_instructions: item.dosage_instructions || null,
        treatment_period: item.treatment_period || null
      })
    }

    // Apply overall discount
    const overallDiscountPercent = body.discount_percent || 0
    const overallDiscount = subtotal * overallDiscountPercent / 100
    const totalAmount = subtotal - overallDiscount + totalTax

    // Validate payments
    const payments = body.payments || {}
    const totalPaid = (payments.cash || 0) + (payments.card || 0) + 
                      (payments.cheque || 0) + (payments.mobile || 0) + 
                      (payments.credit || 0)
    
    // Patient must cover their portion
    if (totalPaid < patientTotal - 0.01) { // Small tolerance for rounding
      return NextResponse.json({ 
        error: `Insufficient payment. Patient owes ${patientTotal.toFixed(2)} DZD` 
      }, { status: 400 })
    }

    const changeGiven = Math.max(0, totalPaid - patientTotal)

    // Create sale
    const { data: sale, error: saleError } = await admin
      .from('pos_sales')
      .insert({
        pharmacy_id: pharmacyId,
        sale_number: saleNumber || `TICKET-${Date.now()}`,
        session_id: body.session_id,
        warehouse_id: body.warehouse_id,
        customer_id: body.customer_id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        prescription_id: body.prescription_id,
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
        loyalty_points_used: body.loyalty_points_used || 0,
        created_by: auth.actorId,
        created_by_name: actorName
      })
      .select()
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    // Insert sale items
    const saleItems = processedItems.map(item => ({
      ...item,
      sale_id: sale.id
    }))

    const { error: itemsError } = await admin
      .from('pos_sale_items')
      .insert(saleItems)

    if (itemsError) {
      console.error('Error inserting sale items:', itemsError)
    }

    // Deduct stock from inventory (FEFO)
    for (const item of processedItems) {
      let remainingQty = item.quantity

      // Get inventory batches for this product (FEFO order)
      const { data: batches } = await admin
        .from('pharmacy_inventory')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      for (const batch of batches || []) {
        if (remainingQty <= 0) break

        const deduct = Math.min(remainingQty, batch.quantity)
        const newQty = batch.quantity - deduct

        await admin
          .from('pharmacy_inventory')
          .update({ 
            quantity: newQty,
            is_active: newQty > 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', batch.id)

        remainingQty -= deduct
      }

      // Create transaction record
      const { data: currentStock } = await admin
        .from('pharmacy_inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)

      const totalAfter = currentStock?.reduce((s, i) => s + i.quantity, 0) || 0

      await admin
        .from('inventory_transactions')
        .insert({
          pharmacy_id: pharmacyId,
          product_id: item.product_id,
          transaction_type: 'sale',
          quantity_change: -item.quantity,
          quantity_before: totalAfter + item.quantity,
          quantity_after: totalAfter,
          unit_price: item.unit_price,
          total_value: item.line_total,
          reference_type: 'sale',
          reference_id: sale.id,
          notes: `Sale ${sale.sale_number}`,
          created_by: auth.actorId
        })
    }

    // Create Chifa claims for reimbursable items
    if (chifaTotal > 0) {
      const chifaItems = processedItems.filter(i => i.chifa_amount > 0)
      const batchNum = `CHIFA-${new Date().toISOString().substring(0, 7)}`

      for (const item of chifaItems) {
        await admin
          .from('chifa_claims')
          .insert({
            pharmacy_id: pharmacyId,
            batch_number: batchNum,
            sale_id: sale.id,
            patient_name: body.customer_name,
            patient_chifa_number: body.patient_chifa_number || null,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            reimbursement_rate: item.reimbursement_rate,
            amount_claimed: item.chifa_amount,
            status: 'pending',
            sale_date: new Date().toISOString()
          })
      }
    }

    // Award loyalty points (1 point per 100 DZD on non-Chifa items)
    if (body.customer_id && patientTotal > 0) {
      const pointsEarned = Math.floor(patientTotal / 100)
      if (pointsEarned > 0) {
        await admin
          .from('pos_sales')
          .update({ loyalty_points_earned: pointsEarned })
          .eq('id', sale.id)

        // Update customer
        await admin.rpc('increment_customer_points', {
          p_customer_id: body.customer_id,
          p_points: pointsEarned
        }).catch(() => {
          // RPC might not exist yet
        })
      }
    }

    return NextResponse.json({
      success: true,
      sale: {
        ...sale,
        items: saleItems
      },
      change_given: changeGiven,
      message: `Sale ${sale.sale_number} completed`
    })
  } catch (error: any) {
    console.error('[POS Sale] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

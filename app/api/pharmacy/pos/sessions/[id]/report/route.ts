import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * GET /api/pharmacy/pos/sessions/[id]/report
 * Get X-Report (mid-day) or Z-Report (end of day) for a session
 * Supports both owner and employee auth.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    // Get pharmacy name
    const { data: pharmacy } = await admin
      .from('professionals')
      .select('business_name')
      .eq('id', pharmacyId)
      .single()

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'x' // 'x' for mid-day, 'z' for end of day

    // Get session details
    const { data: session, error: sessionError } = await admin
      .from('cash_drawer_sessions')
      .select(`
        *,
        drawer:pharmacy_cash_drawers(name, code)
      `)
      .eq('id', sessionId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all completed sales for this session
    const { data: sales } = await admin
      .from('pos_sales')
      .select(`
        id,
        sale_number,
        status,
        total_amount,
        patient_total,
        chifa_total,
        paid_cash,
        paid_card,
        paid_cheque,
        paid_mobile,
        paid_credit,
        change_given,
        discount_amount,
        items:pos_sale_items(quantity, line_total, product_name)
      `)
      .eq('session_id', sessionId)
      .eq('pharmacy_id', pharmacyId)

    // Calculate totals
    const completedSales = sales?.filter(s => s.status === 'completed') || []
    const voidedSales = sales?.filter(s => s.status === 'voided') || []
    const returnSales = sales?.filter(s => s.status === 'returned') || []

    let totalSales = 0
    let totalReturns = 0
    let cashCollected = 0
    let cardCollected = 0
    let chequeCollected = 0
    let mobileCollected = 0
    let creditCollected = 0
    let changeGiven = 0
    let totalDiscounts = 0
    let chifaPending = 0
    let itemsSold = 0

    for (const sale of completedSales) {
      totalSales += sale.total_amount || 0
      cashCollected += sale.paid_cash || 0
      cardCollected += sale.paid_card || 0
      chequeCollected += sale.paid_cheque || 0
      mobileCollected += sale.paid_mobile || 0
      creditCollected += sale.paid_credit || 0
      changeGiven += sale.change_given || 0
      totalDiscounts += sale.discount_amount || 0
      chifaPending += sale.chifa_total || 0
      itemsSold += sale.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0
    }

    for (const sale of returnSales) {
      totalReturns += Math.abs(sale.total_amount || 0)
    }

    // Get cash movements
    const { data: movements } = await admin
      .from('pos_cash_movements')
      .select('*')
      .eq('session_id', sessionId)
      .eq('pharmacy_id', pharmacyId)

    let cashIn = 0
    let cashOut = 0
    let noSaleCount = 0

    for (const m of movements || []) {
      if (m.movement_type === 'cash_in') cashIn += Math.abs(m.amount || 0)
      if (m.movement_type === 'cash_out') cashOut += Math.abs(m.amount || 0)
      if (m.movement_type === 'no_sale') noSaleCount++
    }

    // Calculate expected cash
    const expectedCash = 
      session.opening_balance + 
      cashCollected - 
      changeGiven + 
      cashIn - 
      cashOut

    // Build product summary
    const productSummary: Record<string, { name: string; qty: number; total: number }> = {}
    for (const sale of completedSales) {
      for (const item of sale.items || []) {
        const key = item.product_name
        if (!productSummary[key]) {
          productSummary[key] = { name: item.product_name, qty: 0, total: 0 }
        }
        productSummary[key].qty += item.quantity || 0
        productSummary[key].total += item.line_total || 0
      }
    }

    const topProducts = Object.values(productSummary)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    return NextResponse.json({
      report_type: reportType,
      generated_at: new Date().toISOString(),
      pharmacy_name: pharmacy?.business_name || 'Pharmacy',
      
      // Session info
      session_id: session.id,
      session_number: session.session_number,
      drawer_name: session.drawer?.name || 'Unknown',
      opened_at: session.opened_at,
      opened_by: session.opened_by_name,
      opening_balance: session.opening_balance,
      
      // Transaction counts
      transactions_count: completedSales.length,
      voided_count: voidedSales.length,
      returns_count: returnSales.length,
      items_sold: itemsSold,
      
      // Totals
      total_sales: totalSales,
      total_returns: totalReturns,
      total_discounts: totalDiscounts,
      net_sales: totalSales - totalReturns,
      
      // Payment breakdown
      cash_collected: cashCollected,
      card_collected: cardCollected,
      cheque_collected: chequeCollected,
      mobile_collected: mobileCollected,
      credit_collected: creditCollected,
      change_given: changeGiven,
      chifa_pending: chifaPending,
      
      // Cash movements
      cash_in: cashIn,
      cash_out: cashOut,
      no_sale_count: noSaleCount,
      
      // Expected vs actual
      expected_cash: expectedCash,
      counted_cash: session.counted_cash,
      variance: session.counted_cash ? session.counted_cash - expectedCash : null,
      
      // Top products
      top_products: topProducts,
      
      // For Z-report (if session is closed)
      closed_at: session.closed_at,
      closed_by: session.closed_by_name
    })
  } catch (error: any) {
    console.error('[Session Report] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

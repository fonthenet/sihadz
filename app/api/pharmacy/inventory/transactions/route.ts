import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'
import type { TransactionType } from '@/lib/inventory/types'

/**
 * GET /api/pharmacy/inventory/transactions
 * Get transaction history (owner or employee)
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
    const productId = searchParams.get('product_id')
    const transactionType = searchParams.get('type') as TransactionType | null
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const referenceType = searchParams.get('reference_type')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')

    let query = admin
      .from('inventory_transactions')
      .select(`
        *,
        product:pharmacy_products(id, name, barcode)
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59')
    }

    if (referenceType) {
      query = query.eq('reference_type', referenceType)
    }

    // Pagination
    const from = (page - 1) * perPage
    query = query.range(from, from + perPage - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[Transactions API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary
    const summary = {
      total_in: (data || [])
        .filter(t => t.quantity_change > 0)
        .reduce((sum, t) => sum + t.quantity_change, 0),
      total_out: (data || [])
        .filter(t => t.quantity_change < 0)
        .reduce((sum, t) => sum + Math.abs(t.quantity_change), 0),
      net_change: (data || [])
        .reduce((sum, t) => sum + t.quantity_change, 0)
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      summary
    })
  } catch (error: any) {
    console.error('[Transactions API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

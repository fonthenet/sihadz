import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List buyer's invoices from suppliers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buyer } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplier_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('supplier_invoices')
      .select(`
        *,
        supplier:professionals!supplier_invoices_supplier_id_fkey(id, business_name, email, phone, type),
        order:supplier_purchase_orders(id, order_number),
        items:supplier_invoice_items(*),
        payments:supplier_invoice_payments(*)
      `, { count: 'exact' })
      .eq('buyer_id', buyer.id)
      .order('created_at', { ascending: false })

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    const { data: invoices, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Calculate stats
    const stats = {
      total_outstanding: 0,
      total_overdue: 0,
      overdue_count: 0,
    }

    invoices?.forEach(inv => {
      if (['sent', 'partial', 'overdue'].includes(inv.status)) {
        stats.total_outstanding += inv.balance || 0
        if (inv.status === 'overdue') {
          stats.total_overdue += inv.balance || 0
          stats.overdue_count++
        }
      }
    })

    return NextResponse.json({
      data: invoices || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
      stats,
    })
  } catch (error) {
    console.error('Error in buyer invoices GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

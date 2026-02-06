import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/storefront/orders/my
 * Get orders for the authenticated customer
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Optional filters
    const status = searchParams.get('status')
    const professionalId = searchParams.get('professional_id')

    // Build query
    let query = admin
      .from('storefront_orders')
      .select(`
        *,
        professional:professionals(
          id,
          business_name,
          phone,
          address_line1,
          wilaya,
          commune
        )
      `, { count: 'exact' })
      .eq('customer_id', user.id)

    if (status) query = query.eq('status', status)
    if (professionalId) query = query.eq('professional_id', professionalId)

    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('[My Orders] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get order items
    const orderIds = orders?.map(o => o.id) || []
    let orderItems: any[] = []
    if (orderIds.length > 0) {
      const { data: items } = await admin
        .from('storefront_order_items')
        .select('*')
        .in('order_id', orderIds)

      orderItems = items || []
    }

    // Attach items to orders
    const ordersWithItems = orders?.map(order => ({
      ...order,
      items: orderItems.filter(item => item.order_id === order.id),
    }))

    return NextResponse.json({
      orders: ordersWithItems,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    })
  } catch (error: any) {
    console.error('[My Orders] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

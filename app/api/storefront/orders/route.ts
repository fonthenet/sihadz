import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { StorefrontOrderFilters } from '@/lib/storefront/types'

/**
 * GET /api/storefront/orders
 * List orders for the authenticated professional (business view)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Filters
    const status = searchParams.get('status')
    const fulfillmentType = searchParams.get('fulfillment_type')
    const paymentStatus = searchParams.get('payment_status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query
    let query = admin
      .from('storefront_orders')
      .select('*', { count: 'exact' })
      .eq('professional_id', auth.professionalId)

    // Apply filters
    if (status) {
      if (status.includes(',')) {
        query = query.in('status', status.split(','))
      } else {
        query = query.eq('status', status)
      }
    }
    if (fulfillmentType) query = query.eq('fulfillment_type', fulfillmentType)
    if (paymentStatus) query = query.eq('payment_status', paymentStatus)
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('[Storefront Orders] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get order items for each order
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

    // Get stats
    const { data: stats } = await admin
      .from('storefront_orders')
      .select('status')
      .eq('professional_id', auth.professionalId)

    const statusCounts: Record<string, number> = {}
    stats?.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })

    return NextResponse.json({
      orders: ordersWithItems,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      stats: statusCounts,
    })
  } catch (error: any) {
    console.error('[Storefront Orders] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

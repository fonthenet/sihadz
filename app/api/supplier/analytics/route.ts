import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/supplier/analytics
 * Get comprehensive analytics and reports for suppliers
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month' // day, week, month, year
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // Calculate date range
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date = now

    if (start_date && end_date) {
      periodStart = new Date(start_date)
      periodEnd = new Date(end_date)
    } else {
      switch (period) {
        case 'day':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          periodStart = new Date(now)
          periodStart.setDate(now.getDate() - 7)
          break
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1)
          break
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }

    // Sales Analytics
    const { data: orders } = await supabase
      .from('supplier_purchase_orders')
      .select('id, total, status, created_at, buyer_id, items:supplier_purchase_order_items(quantity, unit_price)')
      .eq('supplier_id', professional.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    // Revenue calculations
    const completedOrders = orders?.filter(o => ['completed', 'delivered'].includes(o.status)) || []
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalOrders = orders?.length || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Top buyers
    const buyerRevenue = new Map<string, { buyer_id: string; revenue: number; orders: number }>()
    completedOrders.forEach(order => {
      if (order.buyer_id) {
        const current = buyerRevenue.get(order.buyer_id) || { buyer_id: order.buyer_id, revenue: 0, orders: 0 }
        current.revenue += order.total || 0
        current.orders += 1
        buyerRevenue.set(order.buyer_id, current)
      }
    })

    const topBuyers = Array.from(buyerRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Get buyer names
    const buyerIds = topBuyers.map(b => b.buyer_id)
    const { data: buyers } = await supabase
      .from('professionals')
      .select('id, business_name')
      .in('id', buyerIds)

    const buyerMap = new Map(buyers?.map(b => [b.id, b.business_name]) || [])
    const topBuyersWithNames = topBuyers.map(b => ({
      ...b,
      business_name: buyerMap.get(b.buyer_id) || 'Unknown',
    }))

    // Top products
    const productSales = new Map<string, { product_id: string; quantity: number; revenue: number }>()
    completedOrders.forEach(order => {
      const items = order.items as any[] || []
      items.forEach(item => {
        if (item.product_id) {
          const current = productSales.get(item.product_id) || {
            product_id: item.product_id,
            quantity: 0,
            revenue: 0,
          }
          current.quantity += item.quantity || 0
          current.revenue += (item.unit_price || 0) * (item.quantity || 0)
          productSales.set(item.product_id, current)
        }
      })
    })

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Get product names
    const productIds = topProducts.map(p => p.product_id)
    const { data: products } = await supabase
      .from('supplier_product_catalog')
      .select('id, name, sku')
      .in('id', productIds)

    const productMap = new Map(products?.map(p => [p.id, { name: p.name, sku: p.sku }]) || [])
    const topProductsWithNames = topProducts.map(p => ({
      ...p,
      name: productMap.get(p.product_id)?.name || 'Unknown',
      sku: productMap.get(p.product_id)?.sku || null,
    }))

    // Order status breakdown
    const statusBreakdown = {
      draft: orders?.filter(o => o.status === 'draft').length || 0,
      submitted: orders?.filter(o => o.status === 'submitted').length || 0,
      confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
      processing: orders?.filter(o => o.status === 'processing').length || 0,
      shipped: orders?.filter(o => o.status === 'shipped').length || 0,
      delivered: orders?.filter(o => o.status === 'delivered').length || 0,
      completed: orders?.filter(o => o.status === 'completed').length || 0,
      cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
    }

    // Invoice analytics
    const { data: invoices } = await supabase
      .from('supplier_invoices')
      .select('id, total, balance, status, created_at')
      .eq('supplier_id', professional.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    const paidInvoices = invoices?.filter(i => i.status === 'paid') || []
    const outstandingInvoices = invoices?.filter(i => ['sent', 'partial', 'overdue'].includes(i.status)) || []
    const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)
    const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + (i.balance || 0), 0)

    // Buyer count
    const uniqueBuyers = new Set(orders?.map(o => o.buyer_id).filter(Boolean) || [])

    return NextResponse.json({
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        type: period,
      },
      sales: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        average_order_value: averageOrderValue,
        unique_buyers: uniqueBuyers.size,
        status_breakdown: statusBreakdown,
      },
      invoices: {
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        paid_count: paidInvoices.length,
        outstanding_count: outstandingInvoices.length,
      },
      top_buyers: topBuyersWithNames,
      top_products: topProductsWithNames,
    })
  } catch (error: any) {
    console.error('Error in supplier analytics GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

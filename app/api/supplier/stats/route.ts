import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get supplier dashboard stats
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

    // Get stats using the helper function
    const { data: stats, error } = await supabase
      .rpc('get_supplier_stats', { p_supplier_id: professional.id })

    if (error) {
      console.error('Error fetching stats:', error)
      
      // Fallback to manual calculation if RPC fails
      const [products, buyers, orders, invoices, unpaidOrders] = await Promise.all([
        supabase
          .from('supplier_product_catalog')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', professional.id)
          .eq('is_active', true),
        supabase
          .from('supplier_buyer_links')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', professional.id)
          .eq('status', 'active'),
        supabase
          .from('supplier_purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', professional.id)
          .in('status', ['submitted', 'confirmed', 'processing']),
        supabase
          .from('supplier_invoices')
          .select('id, balance', { count: 'exact' })
          .eq('supplier_id', professional.id)
          .in('status', ['sent', 'partial', 'overdue']),
        supabase
          .from('supplier_purchase_orders')
          .select('id, total, buyer_id')
          .eq('supplier_id', professional.id)
          .in('status', ['delivered', 'completed', 'shipped'])
          .is('paid_at', null),
      ])

      const outstandingBalance = invoices.data?.reduce((sum: number, inv: { balance: number }) => sum + (inv.balance || 0), 0) || 0
      const unpaidAmount = unpaidOrders.data?.reduce((sum: number, o: { total: number }) => sum + (o.total || 0), 0) || 0
      const unpaidOrderCount = unpaidOrders.data?.length || 0
      const buyersWithUnpaid = new Set(unpaidOrders.data?.map((o: { buyer_id: string }) => o.buyer_id) || []).size

      return NextResponse.json({
        total_products: products.count || 0,
        active_buyers: buyers.count || 0,
        pending_orders: orders.count || 0,
        pending_invoices: invoices.count || 0,
        monthly_revenue: 0,
        outstanding_balance: outstandingBalance,
        unpaid_orders_count: unpaidOrderCount,
        unpaid_amount: unpaidAmount,
        buyers_with_unpaid: buyersWithUnpaid,
      })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error in supplier stats GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

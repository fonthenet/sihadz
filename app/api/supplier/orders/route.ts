import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List supplier's incoming orders
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
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    // Sorting parameters
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortDir = searchParams.get('sort_dir') || 'desc'
    
    // Date range filter
    const dateRange = searchParams.get('date_range') // today, week, month
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    
    // Buyer filter
    const buyerId = searchParams.get('buyer_id')

    let query = supabase
      .from('supplier_purchase_orders')
      .select(`
        *,
        buyer:professionals!supplier_purchase_orders_buyer_id_fkey(id, business_name, email, phone, wilaya, commune),
        items:supplier_purchase_order_items(*, product:supplier_product_catalog!supplier_purchase_order_items_product_id_fkey(id, name, name_fr, sku, barcode))
      `, { count: 'exact' })
      .eq('supplier_id', professional.id)

    // Status filter
    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    // Search filter
    if (search) {
      query = query.or(`order_number.ilike.%${search}%`)
    }
    
    // Buyer filter
    if (buyerId) {
      query = query.eq('buyer_id', buyerId)
    }
    
    // Date range filter
    if (dateRange) {
      const now = new Date()
      let fromDate: Date
      
      if (dateRange === 'today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (dateRange === 'week') {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (dateRange === 'month') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else {
        fromDate = new Date(0)
      }
      
      query = query.gte('created_at', fromDate.toISOString())
    } else if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
    
    // Sorting - map sort_by to actual column
    const sortColumn = sortBy === 'total' ? 'total' : 
                       sortBy === 'status' ? 'status' : 
                       'created_at'
    query = query.order(sortColumn, { ascending: sortDir === 'asc' })

    const { data: orders, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    return NextResponse.json({
      data: orders || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in supplier orders GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update order status (for supplier actions)
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { order_id, action, ...updateData } = body

    if (!order_id || !action) {
      return NextResponse.json({ error: 'order_id and action are required' }, { status: 400 })
    }

    // Get current order
    const { data: order } = await supabase
      .from('supplier_purchase_orders')
      .select('*')
      .eq('id', order_id)
      .eq('supplier_id', professional.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let newStatus: string
    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'confirm':
        if (order.status !== 'submitted') {
          return NextResponse.json({ error: 'Can only confirm submitted orders' }, { status: 400 })
        }
        newStatus = 'confirmed'
        updates.confirmed_at = new Date().toISOString()
        if (updateData.expected_delivery_date) {
          updates.expected_delivery_date = updateData.expected_delivery_date
        }
        if (updateData.supplier_notes) {
          updates.supplier_notes = updateData.supplier_notes
        }
        // Update pending items to accepted when supplier confirms the order
        await supabase
          .from('supplier_purchase_order_items')
          .update({ item_status: 'accepted' })
          .eq('order_id', order_id)
          .eq('item_status', 'pending')
        break

      case 'reject':
        if (order.status !== 'submitted') {
          return NextResponse.json({ error: 'Can only reject submitted orders' }, { status: 400 })
        }
        newStatus = 'rejected'
        updates.rejection_reason = updateData.rejection_reason || 'Order rejected'
        break

      case 'process':
        if (order.status !== 'confirmed') {
          return NextResponse.json({ error: 'Can only process confirmed orders' }, { status: 400 })
        }
        newStatus = 'processing'
        break

      case 'ship':
        if (!['confirmed', 'processing'].includes(order.status)) {
          return NextResponse.json({ error: 'Can only ship confirmed or processing orders' }, { status: 400 })
        }
        newStatus = 'shipped'
        updates.shipped_at = new Date().toISOString()
        if (updateData.tracking_number) {
          updates.tracking_number = updateData.tracking_number
        }
        if (updateData.carrier) {
          updates.carrier = updateData.carrier
        }
        break

      case 'cancel':
        if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
          return NextResponse.json({ error: 'Cannot cancel this order' }, { status: 400 })
        }
        newStatus = 'cancelled'
        updates.supplier_notes = updateData.supplier_notes || 'Cancelled by supplier'
        break

      case 'mark_paid':
        if (!['delivered', 'completed', 'shipped'].includes(order.status)) {
          return NextResponse.json({ error: 'Can only mark delivered/shipped orders as paid' }, { status: 400 })
        }
        updates.paid_at = new Date().toISOString()
        newStatus = order.status
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: updatedOrder, error } = await supabase
      .from('supplier_purchase_orders')
      .update({ status: newStatus, ...updates })
      .eq('id', order_id)
      .select(`
        *,
        buyer:professionals!supplier_purchase_orders_buyer_id_fkey(id, business_name, email, phone, auth_user_id),
        items:supplier_purchase_order_items(*)
      `)
      .single()

    if (error) {
      console.error('Error updating order:', error)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Notify buyer of order status change
    if (updatedOrder?.buyer?.auth_user_id) {
      const statusMessages: Record<string, { en: string; ar: string; fr: string }> = {
        confirmed: { en: 'Order Confirmed', ar: 'تم تأكيد الطلب', fr: 'Commande confirmée' },
        rejected: { en: 'Order Rejected', ar: 'تم رفض الطلب', fr: 'Commande rejetée' },
        processing: { en: 'Order Processing', ar: 'جاري معالجة الطلب', fr: 'Commande en cours' },
        shipped: { en: 'Order Shipped', ar: 'تم شحن الطلب', fr: 'Commande expédiée' },
        cancelled: { en: 'Order Cancelled', ar: 'تم إلغاء الطلب', fr: 'Commande annulée' },
      }
      
      const msg = statusMessages[newStatus]
      if (msg) {
        const { data: supplierInfo } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', professional.id)
          .single()
        
        await supabase.from('notifications').insert({
          user_id: updatedOrder.buyer.auth_user_id,
          type: 'supplier_order',
          title: msg.en,
          title_ar: msg.ar,
          title_fr: msg.fr,
          message: `Order ${updatedOrder.order_number} from ${supplierInfo?.business_name || 'supplier'} has been ${newStatus}`,
          message_ar: `الطلب ${updatedOrder.order_number} من ${supplierInfo?.business_name || 'المورد'} ${newStatus === 'confirmed' ? 'تم تأكيده' : newStatus === 'shipped' ? 'تم شحنه' : 'تم تحديثه'}`,
          message_fr: `Commande ${updatedOrder.order_number} de ${supplierInfo?.business_name || 'fournisseur'} a été ${newStatus === 'confirmed' ? 'confirmée' : newStatus === 'shipped' ? 'expédiée' : 'mise à jour'}`,
          metadata: { order_id: updatedOrder.id, order_number: updatedOrder.order_number, status: newStatus },
          action_url: '/professional/dashboard?section=suppliers',
          is_read: false,
        })
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error in supplier orders PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { OrderStatus } from '@/lib/storefront/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/storefront/orders/[id]
 * Get a single order (accessible by business owner or customer)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    // Try professional auth first
    const proAuth = await getProfessionalFromRequest(request)
    
    // Or customer auth
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get order
    const { data: order, error } = await admin
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
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      console.error('[Order] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check access
    const isOwner = proAuth && order.professional_id === proAuth.professionalId
    const isCustomer = user && order.customer_id === user.id

    if (!isOwner && !isCustomer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get order items
    const { data: items } = await admin
      .from('storefront_order_items')
      .select('*')
      .eq('order_id', id)

    return NextResponse.json({
      order: {
        ...order,
        items: items || [],
      },
    })
  } catch (error: any) {
    console.error('[Order] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/storefront/orders/[id]
 * Update order status (business only) or cancel (customer or business)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const admin = createAdminClient()

    // Get order first
    const { data: order, error: fetchError } = await admin
      .from('storefront_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Try professional auth
    const proAuth = await getProfessionalFromRequest(request)
    const isOwner = proAuth && order.professional_id === proAuth.professionalId

    // Or customer auth
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const isCustomer = user && order.customer_id === user.id

    // Determine what updates are allowed
    const updates: Record<string, any> = {}

    // Business can update status
    if (isOwner && body.status) {
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      }

      const currentStatus = order.status as OrderStatus
      const newStatus = body.status as OrderStatus

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        )
      }

      updates.status = newStatus

      // Set timestamps
      if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
      if (newStatus === 'ready') updates.ready_at = new Date().toISOString()
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
      if (newStatus === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
        updates.cancelled_by = 'business'
        updates.cancellation_reason = body.cancellation_reason || null
      }
    }

    // Customer can cancel pending orders
    if (isCustomer && body.status === 'cancelled') {
      if (order.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending orders can be cancelled' },
          { status: 400 }
        )
      }
      updates.status = 'cancelled'
      updates.cancelled_at = new Date().toISOString()
      updates.cancelled_by = 'customer'
      updates.cancellation_reason = body.cancellation_reason || null
    }

    // Business can update internal notes
    if (isOwner && body.internal_notes !== undefined) {
      updates.internal_notes = body.internal_notes
    }

    // Business can update payment status (for cash payments marked as paid)
    if (isOwner && body.payment_status) {
      updates.payment_status = body.payment_status
    }

    // Business can update estimated pickup time
    if (isOwner && body.estimated_pickup_time !== undefined) {
      updates.estimated_pickup_time = body.estimated_pickup_time
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    // Apply updates
    const { data: updatedOrder, error: updateError } = await admin
      .from('storefront_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Order Update] Error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If cancelled, restore stock
    if (updates.status === 'cancelled') {
      const { data: items } = await admin
        .from('storefront_order_items')
        .select('product_id, quantity')
        .eq('order_id', id)

      for (const item of items || []) {
        const { data: product } = await admin
          .from('storefront_products')
          .select('track_inventory, stock_quantity')
          .eq('id', item.product_id)
          .single()

        if (product?.track_inventory && product.stock_quantity !== null) {
          await admin
            .from('storefront_products')
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq('id', item.product_id)
        }
      }
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error: any) {
    console.error('[Order Update] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

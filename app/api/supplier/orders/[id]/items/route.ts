import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * PATCH - Supplier actions on order items: reject, substitute, adjust
 * Then optionally send entire order for buyer review
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
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

    const { data: order } = await supabase
      .from('supplier_purchase_orders')
      .select('*')
      .eq('id', orderId)
      .eq('supplier_id', professional.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'submitted' && order.status !== 'pending_buyer_review') {
      return NextResponse.json({ error: 'Can only edit submitted or pending review orders' }, { status: 400 })
    }

    const body = await request.json()
    const { action, item_id, ...data } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Single item action
    if (item_id) {
      const { data: item } = await supabase
        .from('supplier_purchase_order_items')
        .select('*')
        .eq('id', item_id)
        .eq('order_id', orderId)
        .single()

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const itemUpdates: Record<string, unknown> = {}

      switch (action) {
        case 'reject':
          itemUpdates.item_status = 'rejected'
          itemUpdates.rejection_reason = data.rejection_reason || 'Item rejected by supplier'
          itemUpdates.substitute_product_id = null
          itemUpdates.substitute_quantity = null
          itemUpdates.substitute_unit_price = null
          itemUpdates.substitute_line_total = null
          itemUpdates.substitute_notes = null
          itemUpdates.adjusted_quantity = null
          itemUpdates.adjusted_unit_price = null
          itemUpdates.adjustment_reason = null
          break

        case 'substitute':
          if (!data.substitute_product_id || !data.substitute_quantity || data.substitute_unit_price == null) {
            return NextResponse.json({ error: 'substitute_product_id, substitute_quantity, substitute_unit_price required' }, { status: 400 })
          }
          const { data: subProduct } = await supabase
            .from('supplier_product_catalog')
            .select('id, name, sku')
            .eq('id', data.substitute_product_id)
            .eq('supplier_id', professional.id)
            .single()
          if (!subProduct) {
            return NextResponse.json({ error: 'Substitute product not found' }, { status: 404 })
          }
          const subQty = parseInt(data.substitute_quantity, 10)
          const subPrice = parseFloat(data.substitute_unit_price)
          itemUpdates.item_status = 'substitution_offered'
          itemUpdates.substitute_product_id = data.substitute_product_id
          itemUpdates.substitute_quantity = subQty
          itemUpdates.substitute_unit_price = subPrice
          itemUpdates.substitute_line_total = subQty * subPrice
          itemUpdates.substitute_notes = data.substitute_notes || null
          itemUpdates.substitute_product_name = subProduct.name
          itemUpdates.substitute_product_sku = subProduct.sku
          itemUpdates.rejection_reason = null
          break

        case 'adjust':
          if (data.adjusted_quantity != null || data.adjusted_unit_price != null) {
            if (data.adjusted_quantity != null) {
              itemUpdates.adjusted_quantity = parseInt(data.adjusted_quantity, 10)
              itemUpdates.item_status = 'quantity_adjusted'
            }
            if (data.adjusted_unit_price != null) {
              itemUpdates.adjusted_unit_price = parseFloat(data.adjusted_unit_price)
              itemUpdates.item_status = itemUpdates.item_status || 'price_adjusted'
            }
            itemUpdates.adjustment_reason = data.adjustment_reason || null
          }
          break

        case 'accept':
          itemUpdates.item_status = 'accepted'
          itemUpdates.rejection_reason = null
          itemUpdates.substitute_product_id = null
          itemUpdates.substitute_quantity = null
          itemUpdates.substitute_unit_price = null
          itemUpdates.substitute_line_total = null
          itemUpdates.substitute_notes = null
          itemUpdates.adjusted_quantity = null
          itemUpdates.adjusted_unit_price = null
          itemUpdates.adjustment_reason = null
          break

        case 'add_note':
          itemUpdates.supplier_item_notes = data.notes || null
          break

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }

      const { error: itemError } = await supabase
        .from('supplier_purchase_order_items')
        .update(itemUpdates)
        .eq('id', item_id)

      if (itemError) {
        console.error('Error updating item:', itemError)
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
      }
    }

    // Send for review action (recalculate totals, set status)
    if (action === 'send_for_review' || (item_id && body.also_send_for_review)) {
      const { data: items } = await supabase
        .from('supplier_purchase_order_items')
        .select('*')
        .eq('order_id', orderId)

      const acceptedItems = (items || []).filter(
        (i: any) => ['accepted', 'pending', 'substitution_offered', 'quantity_adjusted', 'price_adjusted'].includes(i.item_status)
      )

      if (acceptedItems.length === 0) {
        return NextResponse.json(
          { error: 'Cannot send for review: all items are rejected. Accept, substitute, or adjust at least one item.' },
          { status: 400 }
        )
      }

      let subtotal = 0
      for (const it of acceptedItems) {
        if (it.item_status === 'substitution_offered' && it.substitute_line_total != null) {
          subtotal += it.substitute_line_total
        } else if (it.item_status === 'quantity_adjusted' && it.adjusted_quantity != null) {
          subtotal += it.adjusted_quantity * (it.adjusted_unit_price ?? it.unit_price)
        } else if (it.item_status === 'price_adjusted' && it.adjusted_unit_price != null) {
          subtotal += it.quantity * it.adjusted_unit_price
        } else {
          subtotal += it.line_total
        }
      }

      const { error: orderError } = await supabase
        .from('supplier_purchase_orders')
        .update({
          status: 'pending_buyer_review',
          subtotal,
          total: subtotal + (order.shipping_cost || 0),
          review_requested_at: new Date().toISOString(),
          supplier_changes_summary: body.changes_summary || null,
        })
        .eq('id', orderId)

      if (orderError) {
        console.error('Error updating order:', orderError)
        return NextResponse.json({ error: 'Failed to send for review' }, { status: 500 })
      }

      // Notify buyer
      const { data: buyer } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', order.buyer_id)
        .single()
      if (buyer?.auth_user_id) {
        const { data: supplierInfo } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', professional.id)
          .single()
        await supabase.from('notifications').insert({
          user_id: buyer.auth_user_id,
          type: 'supplier_order',
          title: 'Order Changes Pending Review',
          title_ar: 'تغييرات الطلب بانتظار المراجعة',
          title_fr: 'Modifications de commande à réviser',
          message: `Supplier ${supplierInfo?.business_name || 'supplier'} has modified order ${order.order_number}. Please review and approve.`,
          metadata: { order_id: orderId, order_number: order.order_number, status: 'pending_buyer_review' },
          action_url: '/professional/dashboard?section=suppliers',
          is_read: false,
        })
      }
    }

    const { data: updatedOrder } = await supabase
      .from('supplier_purchase_orders')
      .select(`
        *,
        buyer:professionals!supplier_purchase_orders_buyer_id_fkey(id, business_name, email, phone),
        items:supplier_purchase_order_items(*, product:supplier_product_catalog!supplier_purchase_order_items_product_id_fkey(id, name, sku, barcode))
      `)
      .eq('id', orderId)
      .single()

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error in supplier order items PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

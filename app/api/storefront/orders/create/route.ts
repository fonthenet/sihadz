import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import type { CreateOrderData } from '@/lib/storefront/types'

/**
 * POST /api/storefront/orders/create
 * Create a new order (customer-facing, requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in to place an order' }, { status: 401 })
    }

    const body: CreateOrderData = await request.json()
    const admin = createAdminClient()

    // Validate required fields
    if (!body.professional_id || !body.customer_name || !body.customer_phone || !body.items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: professional_id, customer_name, customer_phone, items' },
        { status: 400 }
      )
    }

    // 1. Verify storefront is enabled
    const { data: settings } = await admin
      .from('storefront_settings')
      .select('*')
      .eq('professional_id', body.professional_id)
      .eq('is_enabled', true)
      .single()

    if (!settings) {
      return NextResponse.json({ error: 'Storefront is not available' }, { status: 400 })
    }

    // 2. Validate fulfillment type
    if (body.fulfillment_type === 'pickup' && !settings.pickup_enabled) {
      return NextResponse.json({ error: 'Pickup is not available' }, { status: 400 })
    }
    if (body.fulfillment_type === 'delivery' && !settings.delivery_enabled) {
      return NextResponse.json({ error: 'Delivery is not available' }, { status: 400 })
    }

    // 3. Validate payment method
    if (body.payment_method === 'cash' && !settings.accept_cash_on_pickup) {
      return NextResponse.json({ error: 'Cash payment is not available' }, { status: 400 })
    }
    if ((body.payment_method === 'wallet' || body.payment_method === 'chargily') && !settings.accept_online_payment) {
      return NextResponse.json({ error: 'Online payment is not available' }, { status: 400 })
    }

    // 4. Get products and calculate totals
    const productIds = body.items.map(i => i.product_id)
    const { data: products, error: productsError } = await admin
      .from('storefront_products')
      .select('*')
      .in('id', productIds)
      .eq('professional_id', body.professional_id)
      .eq('is_available', true)

    if (productsError || !products?.length) {
      return NextResponse.json({ error: 'Some products are not available' }, { status: 400 })
    }

    // Create product map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]))

    // Validate all products exist and calculate totals
    let subtotal = 0
    const orderItems: {
      product_id: string
      product_name: string
      product_name_ar: string | null
      product_image_url: string | null
      unit_price: number
      quantity: number
      total: number
      notes: string | null
    }[] = []

    for (const item of body.items) {
      const product = productMap.get(item.product_id)
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product_id}` },
          { status: 400 }
        )
      }

      // Check stock if tracking inventory
      if (product.track_inventory && product.stock_quantity !== null) {
        if (product.stock_quantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}` },
            { status: 400 }
          )
        }
      }

      const itemTotal = product.price * item.quantity
      subtotal += itemTotal

      orderItems.push({
        product_id: item.product_id,
        product_name: product.name,
        product_name_ar: product.name_ar,
        product_image_url: product.image_url,
        unit_price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        notes: item.notes || null,
      })
    }

    // Calculate delivery fee
    const deliveryFee = body.fulfillment_type === 'delivery' ? settings.delivery_fee : 0

    // Calculate total
    const total = subtotal + deliveryFee

    // Check minimum order amount
    if (settings.min_order_amount && subtotal < settings.min_order_amount) {
      return NextResponse.json(
        { error: `Minimum order amount is ${settings.min_order_amount} DZD` },
        { status: 400 }
      )
    }

    // 5. Generate order number
    const { data: orderNumber } = await admin.rpc('generate_storefront_order_number')

    // 6. Create order
    const { data: order, error: orderError } = await admin
      .from('storefront_orders')
      .insert({
        order_number: orderNumber,
        professional_id: body.professional_id,
        customer_id: user.id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email || user.email,
        status: 'pending',
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: 0,
        total,
        fulfillment_type: body.fulfillment_type || 'pickup',
        estimated_pickup_time: body.estimated_pickup_time || null,
        delivery_address: body.delivery_address || null,
        delivery_notes: body.delivery_notes || null,
        payment_method: body.payment_method || 'cash',
        payment_status: body.payment_method === 'cash' ? 'pending' : 'pending',
        customer_notes: body.customer_notes || null,
      })
      .select()
      .single()

    if (orderError) {
      console.error('[Create Order] Order error:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // 7. Create order items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }))

    const { error: itemsError } = await admin
      .from('storefront_order_items')
      .insert(itemsWithOrderId)

    if (itemsError) {
      console.error('[Create Order] Items error:', itemsError)
      // Rollback order
      await admin.from('storefront_orders').delete().eq('id', order.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // 8. Update stock if tracking inventory
    for (const item of body.items) {
      const product = productMap.get(item.product_id)
      if (product?.track_inventory && product.stock_quantity !== null) {
        await admin
          .from('storefront_products')
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq('id', item.product_id)
      }
    }

    // Return order with items
    return NextResponse.json({
      order: {
        ...order,
        items: orderItems,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Create Order] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

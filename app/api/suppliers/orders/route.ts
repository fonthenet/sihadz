import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { OrderInput, ReceiveOrderItemInput } from '@/lib/supplier/types'
import { resolvePharmacyProduct } from '@/lib/pharmacy/resolve-pharmacy-product'
import { categoryRequiresExpiry } from '@/lib/supplier/expiry-validation'
import { validateOrderItems } from '@/lib/supplier/stock-validation'

// GET - List buyer's orders to suppliers
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    // Sorting parameters
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortDir = searchParams.get('sort_dir') || 'desc'
    
    // Date range filter
    const dateRange = searchParams.get('date_range') // today, week, month
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    
    // Search
    const search = searchParams.get('search')

    let query = supabase
      .from('supplier_purchase_orders')
      .select(`
        *,
        supplier:professionals!supplier_purchase_orders_supplier_id_fkey(id, business_name, email, phone, type),
        items:supplier_purchase_order_items(*, product:supplier_product_catalog!supplier_purchase_order_items_product_id_fkey(id, name, name_fr, sku, barcode))
      `, { count: 'exact' })
      .eq('buyer_id', buyer.id)

    // Status filter
    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    // Supplier filter
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    
    // Search filter
    if (search) {
      query = query.or(`order_number.ilike.%${search}%`)
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

    // Unpaid orders summary (delivered/shipped/completed without paid_at)
    const { data: unpaidRows } = await supabase
      .from('supplier_purchase_orders')
      .select('id, total')
      .eq('buyer_id', buyer.id)
      .in('status', ['delivered', 'completed', 'shipped'])
      .is('paid_at', null)

    const unpaid_count = unpaidRows?.length || 0
    const unpaid_amount = unpaidRows?.reduce((s, o) => s + (o.total || 0), 0) || 0

    return NextResponse.json({
      data: orders || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
      unpaid_orders_count: unpaid_count,
      unpaid_amount,
    })
  } catch (error) {
    console.error('Error in buyer orders GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create purchase order
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: buyer } = await supabase
      .from('professionals')
      .select('id, type, business_name, address_line1, wilaya, commune')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    const body: OrderInput = await request.json()

    if (!body.supplier_id || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'supplier_id and items are required' }, { status: 400 })
    }

    // Verify supplier exists
    const { data: supplier } = await supabase
      .from('professionals')
      .select('id, business_name')
      .eq('id', body.supplier_id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .single()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check link status
    const { data: link } = await supabase
      .from('supplier_buyer_links')
      .select('id, status, discount_percent')
      .eq('supplier_id', body.supplier_id)
      .eq('buyer_id', buyer.id)
      .single()

    const { data: settings } = await supabase
      .from('supplier_settings')
      .select('accept_orders_from_anyone, default_shipping_cost')
      .eq('supplier_id', body.supplier_id)
      .single()

    if (!link?.status || link.status !== 'active') {
      if (!settings?.accept_orders_from_anyone) {
        return NextResponse.json({ error: 'Not authorized to order from this supplier' }, { status: 403 })
      }
    }

    // Get product details and calculate totals
    const productIds = body.items.map(i => i.product_id)
    const { data: products } = await supabase
      .from('supplier_product_catalog')
      .select('id, name, sku, barcode, unit_price, min_order_qty, in_stock')
      .in('id', productIds)

    if (!products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'Some products not found' }, { status: 400 })
    }

    const productMap = new Map(products.map(p => [p.id, p]))
    const discount = link?.discount_percent || 0

    // Validate stock and quantities before creating order
    const validation = await validateOrderItems(
      supabase,
      body.supplier_id,
      body.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      new Map(products.map(p => [p.id, { name: p.name, min_order_qty: p.min_order_qty ?? 1, in_stock: p.in_stock }]))
    )
    if (!validation.valid) {
      const firstError = validation.errors[0]
      const message = validation.errors.length === 1
        ? `${firstError.productName}: ${firstError.error}`
        : `Order validation failed: ${validation.errors.map(e => `${e.productName}: ${e.error}`).join('; ')}`
      return NextResponse.json(
        { error: message, validationErrors: validation.errors },
        { status: 400 }
      )
    }

    // Calculate items and totals
    const orderItems = body.items.map(item => {
      const product = productMap.get(item.product_id)!
      const unitPrice = item.unit_price ?? product.unit_price
      const lineTotal = item.quantity * unitPrice * (1 - discount / 100)
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount_percent: discount,
        line_total: lineTotal,
        product_name: product.name,
        product_sku: product.sku,
        product_barcode: product.barcode,
        notes: item.notes,
        item_status: 'pending',
      }
    })

    const subtotal = orderItems.reduce((sum, item) => sum + item.line_total, 0)
    const shippingCost = settings?.default_shipping_cost || 0
    const total = subtotal + shippingCost

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('supplier_purchase_orders')
      .insert({
        buyer_id: buyer.id,
        supplier_id: body.supplier_id,
        link_id: link?.id,
        status: 'draft',
        subtotal,
        discount_amount: 0,
        tax_amount: 0,
        shipping_cost: shippingCost,
        total,
        expected_delivery_date: body.expected_delivery_date,
        delivery_address: body.delivery_address || buyer.address_line1,
        delivery_wilaya: body.delivery_wilaya || buyer.wilaya,
        delivery_commune: body.delivery_commune || buyer.commune,
        buyer_notes: body.buyer_notes,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    const items = orderItems.map(item => ({
      order_id: order.id,
      ...item,
    }))

    const { error: itemsError } = await supabase
      .from('supplier_purchase_order_items')
      .insert(items)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Cleanup order
      await supabase.from('supplier_purchase_orders').delete().eq('id', order.id)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // Fetch complete order
    const { data: completeOrder } = await supabase
      .from('supplier_purchase_orders')
      .select(`
        *,
        supplier:professionals!supplier_purchase_orders_supplier_id_fkey(id, business_name, email, phone),
        items:supplier_purchase_order_items(*)
      `)
      .eq('id', order.id)
      .single()

    return NextResponse.json(completeOrder, { status: 201 })
  } catch (error) {
    console.error('Error in buyer orders POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update order (submit, cancel, receive)
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { order_id, action, ...updateData } = body

    if (!order_id || !action) {
      return NextResponse.json({ error: 'order_id and action are required' }, { status: 400 })
    }

    // Get current order (items include product snapshot: barcode, sku for pharmacy matching)
    const { data: order } = await supabase
      .from('supplier_purchase_orders')
      .select(`
        *,
        items:supplier_purchase_order_items(*, product:supplier_product_catalog!supplier_purchase_order_items_product_id_fkey(id, name, barcode, sku, min_order_qty, in_stock))
      `)
      .eq('id', order_id)
      .eq('buyer_id', buyer.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'submit':
        if (order.status !== 'draft') {
          return NextResponse.json({ error: 'Can only submit draft orders' }, { status: 400 })
        }

        // Validate stock and quantities before submitting
        const items = (order.items || []) as Array<{ product_id: string; quantity: number; product?: { id: string; name?: string; min_order_qty?: number | null; in_stock?: boolean } }>
        const productMap = new Map<string, { name: string; min_order_qty?: number | null; in_stock?: boolean }>()
        for (const it of items) {
          if (it.product) {
            productMap.set(it.product_id, {
              name: it.product.name ?? 'Unknown',
              min_order_qty: it.product.min_order_qty ?? 1,
              in_stock: it.product.in_stock ?? true,
            })
          }
        }
        const submitValidation = await validateOrderItems(
          supabase,
          order.supplier_id,
          items.map(it => ({ product_id: it.product_id, quantity: it.quantity, product_name: it.product?.name })),
          productMap
        )
        if (!submitValidation.valid) {
          const firstErr = submitValidation.errors[0]
          const message = submitValidation.errors.length === 1
            ? `${firstErr.productName}: ${firstErr.error}`
            : `Order validation failed: ${submitValidation.errors.map(e => `${e.productName}: ${e.error}`).join('; ')}`
          return NextResponse.json(
            { error: message, validationErrors: submitValidation.errors },
            { status: 400 }
          )
        }
        updates.submitted_at = new Date().toISOString()

        // Check auto-accept and send notification
        // Use admin client to bypass RLS - buyer cannot read supplier_settings
        console.log('=========== [SupplierOrders] ORDER SUBMIT START ===========')
        console.log('[SupplierOrders] order.supplier_id:', order.supplier_id)
        
        let admin
        try {
          admin = createAdminClient()
          console.log('[SupplierOrders] Admin client created successfully')
        } catch (adminErr) {
          console.error('[SupplierOrders] FAILED to create admin client:', adminErr)
          // Continue without notification - order still gets submitted
          updates.status = 'submitted'
          break
        }
        
        const { data: supplierSettings, error: settingsErr } = await admin
          .from('supplier_settings')
          .select('auto_accept_orders, notify_new_orders')
          .eq('supplier_id', order.supplier_id)
          .single()
        
        console.log('[SupplierOrders] supplierSettings:', supplierSettings, 'error:', settingsErr)

        const { data: buyerLink } = await supabase
          .from('supplier_buyer_links')
          .select('id, status')
          .eq('supplier_id', order.supplier_id)
          .eq('buyer_id', buyer.id)
          .single()

        const shouldAutoAccept = supplierSettings?.auto_accept_orders === true &&
          buyerLink?.status === 'active'

        if (shouldAutoAccept) {
          updates.status = 'confirmed'
          updates.confirmed_at = new Date().toISOString()
        } else {
          updates.status = 'submitted'
        }

        // Notify supplier of new order (respect notify_new_orders setting, default true)
        const shouldNotifyOrder = supplierSettings?.notify_new_orders !== false
        console.log('[SupplierOrders] shouldNotifyOrder:', shouldNotifyOrder)
        
        const { data: supplierPro, error: supplierProErr } = await admin
          .from('professionals')
          .select('auth_user_id, business_name')
          .eq('id', order.supplier_id)
          .single()
        
        console.log('[SupplierOrders] supplierPro:', supplierPro, 'error:', supplierProErr)
        
        if (supplierPro?.auth_user_id && shouldNotifyOrder) {
          const { data: buyerPro } = await admin
            .from('professionals')
            .select('business_name')
            .eq('id', buyer.id)
            .single()
          
          console.log('[SupplierOrders] Inserting notification for user:', supplierPro.auth_user_id)
          
          const { data: notifData, error: notifError } = await admin.from('notifications').insert({
            user_id: supplierPro.auth_user_id,
            type: 'supplier_order',
            title: 'New Purchase Order',
            title_ar: 'طلب شراء جديد',
            title_fr: 'Nouveau bon de commande',
            message: `New order from ${buyerPro?.business_name || 'a buyer'}`,
            message_ar: `طلب جديد من ${buyerPro?.business_name || 'مشتري'}`,
            message_fr: `Nouvelle commande de ${buyerPro?.business_name || 'un acheteur'}`,
            metadata: { order_id: order.id, order_number: order.order_number },
            action_url: '/professional/dashboard?section=orders',
            is_read: false,
          }).select()
          
          if (notifError) {
            console.error('[SupplierOrders] NOTIFICATION INSERT ERROR:', notifError)
          } else {
            console.log('[SupplierOrders] NOTIFICATION INSERTED:', notifData)
          }
        } else {
          console.log('[SupplierOrders] Skipped notification:', { 
            hasAuthUserId: !!supplierPro?.auth_user_id,
            shouldNotifyOrder
          })
        }
        console.log('=========== [SupplierOrders] ORDER SUBMIT END ===========')
        // When order is submitted or confirmed, update pending items to accepted
        if (updates.status === 'submitted' || updates.status === 'confirmed') {
          await supabase
            .from('supplier_purchase_order_items')
            .update({ item_status: 'accepted' })
            .eq('order_id', order_id)
            .eq('item_status', 'pending')
        }
        break

      case 'cancel':
        if (!['draft', 'submitted'].includes(order.status)) {
          return NextResponse.json({ error: 'Cannot cancel this order' }, { status: 400 })
        }
        updates.status = 'cancelled'
        updates.buyer_notes = updateData.buyer_notes || 'Cancelled by buyer'
        break

      case 'confirm_delivery':
        if (order.status !== 'shipped') {
          return NextResponse.json({ error: 'Can only confirm delivery for shipped orders' }, { status: 400 })
        }
        updates.status = 'delivered'
        updates.delivered_at = new Date().toISOString()
        updates.actual_delivery_date = new Date().toISOString().split('T')[0]
        break

      case 'mark_paid':
        if (!['delivered', 'completed', 'shipped'].includes(order.status)) {
          return NextResponse.json({ error: 'Can only mark delivered/shipped orders as paid' }, { status: 400 })
        }
        updates.paid_at = new Date().toISOString()
        break

      case 'approve_changes':
        // Buyer approves supplier modifications (substitutions, adjustments)
        if (order.status !== 'pending_buyer_review') {
          return NextResponse.json({ error: 'Order is not pending your review' }, { status: 400 })
        }

        const itemDecisions = (updateData.item_decisions || {}) as Record<string, 'accept' | 'reject'>

        const { data: orderItems } = await supabase
          .from('supplier_purchase_order_items')
          .select('*')
          .eq('order_id', order_id)

        let newSubtotal = 0
        for (const it of orderItems || []) {
          if (it.item_status === 'rejected' || it.item_status === 'substitution_rejected') continue

          if (it.item_status === 'substitution_offered') {
            const decision = itemDecisions[it.id] ?? 'accept'
            if (decision === 'reject') {
              await supabase
                .from('supplier_purchase_order_items')
                .update({ item_status: 'substitution_rejected' })
                .eq('id', it.id)
              continue
            }
            await supabase
              .from('supplier_purchase_order_items')
              .update({
                product_id: it.substitute_product_id,
                quantity: it.substitute_quantity,
                unit_price: it.substitute_unit_price,
                line_total: it.substitute_line_total,
                product_name: it.substitute_product_name,
                product_sku: it.substitute_product_sku,
                item_status: 'accepted',
                substitute_product_id: null,
                substitute_quantity: null,
                substitute_unit_price: null,
                substitute_line_total: null,
                substitute_notes: null,
                substitute_product_name: null,
                substitute_product_sku: null,
              })
              .eq('id', it.id)
            newSubtotal += it.substitute_line_total || 0
          } else if (it.item_status === 'quantity_adjusted' && it.adjusted_quantity != null) {
            const newUnitPrice = it.adjusted_unit_price ?? it.unit_price
            const lineTotal = it.adjusted_quantity * newUnitPrice
            await supabase
              .from('supplier_purchase_order_items')
              .update({
                quantity: it.adjusted_quantity,
                unit_price: newUnitPrice,
                line_total: lineTotal,
                item_status: 'accepted',
                adjusted_quantity: null,
                adjusted_unit_price: null,
                adjustment_reason: null,
              })
              .eq('id', it.id)
            newSubtotal += lineTotal
          } else if (it.item_status === 'price_adjusted' && it.adjusted_unit_price != null) {
            const lineTotal = it.quantity * it.adjusted_unit_price
            await supabase
              .from('supplier_purchase_order_items')
              .update({
                unit_price: it.adjusted_unit_price,
                line_total: lineTotal,
                item_status: 'accepted',
                adjusted_quantity: null,
                adjusted_unit_price: null,
                adjustment_reason: null,
              })
              .eq('id', it.id)
            newSubtotal += lineTotal
          } else if (['accepted', 'pending'].includes(it.item_status)) {
            newSubtotal += it.line_total || 0
          }
        }

        updates.status = 'confirmed'
        updates.confirmed_at = new Date().toISOString()
        updates.subtotal = newSubtotal
        updates.total = newSubtotal + (order.shipping_cost || 0)
        updates.review_requested_at = null
        updates.supplier_changes_summary = null
        break

      case 'reject_changes':
        if (order.status !== 'pending_buyer_review') {
          return NextResponse.json({ error: 'Order is not pending your review' }, { status: 400 })
        }
        updates.status = 'submitted'
        updates.review_requested_at = null
        updates.supplier_changes_summary = null
        updates.buyer_notes = (updates.buyer_notes || order.buyer_notes || '') + (updateData.rejection_reason ? ` [Rejected changes: ${updateData.rejection_reason}]` : '')
        // Notify supplier
        const { data: supplierForNotify } = await supabase
          .from('professionals')
          .select('auth_user_id')
          .eq('id', order.supplier_id)
          .single()
        if (supplierForNotify?.auth_user_id) {
          await supabase.from('notifications').insert({
            user_id: supplierForNotify.auth_user_id,
            type: 'supplier_order',
            title: 'Order Changes Rejected',
            title_ar: 'تم رفض التعديلات',
            title_fr: 'Modifications rejetées',
            message: `Buyer rejected your changes to order ${order.order_number}. You can modify and resubmit.`,
            metadata: { order_id: order.id, order_number: order.order_number, status: 'submitted' },
            action_url: '/professional/dashboard?section=orders',
            is_read: false,
          })
        }
        break

      case 'receive':
        // Full receive with item details
        if (!['shipped', 'delivered'].includes(order.status)) {
          return NextResponse.json({ error: 'Can only receive shipped or delivered orders' }, { status: 400 })
        }

        const receivedItems: ReceiveOrderItemInput[] = updateData.items || []

        // Validate expiry required for medication/expiry-type items
        const itemIds = receivedItems.filter(r => r.quantity_received > 0).map(r => r.item_id)
        if (itemIds.length > 0) {
          const { data: itemsWithProduct } = await supabase
            .from('supplier_purchase_order_items')
            .select('id, product_id')
            .eq('order_id', order_id)
            .in('id', itemIds)

          const productIds = [...new Set((itemsWithProduct || []).map((i: { product_id: string }) => i.product_id))]
          const { data: products } = await supabase
            .from('supplier_product_catalog')
            .select('id, category_id')
            .in('id', productIds)

          const categoryIds = [...new Set((products || []).map((p: { category_id: string | null }) => p.category_id).filter(Boolean))]
          const { data: categories } = categoryIds.length > 0
            ? await supabase
                .from('supplier_product_categories')
                .select('id, requires_expiry')
                .in('id', categoryIds)
            : { data: [] }

          const expiryRequiredCategoryIds = new Set(
            (categories || []).filter((c: { requires_expiry?: boolean }) => c.requires_expiry).map((c: { id: string }) => c.id)
          )
          const productToCategory = new Map((products || []).map((p: { id: string; category_id: string | null }) => [p.id, p.category_id]))
          const itemToProduct = new Map((itemsWithProduct || []).map((i: { id: string; product_id: string }) => [i.id, i.product_id]))

          for (const rec of receivedItems) {
            if (rec.quantity_received <= 0) continue
            const productId = itemToProduct.get(rec.item_id)
            const categoryId = productId ? productToCategory.get(productId) : null
            if (categoryId && expiryRequiredCategoryIds.has(categoryId) && !rec.expiry_date?.trim()) {
              return NextResponse.json({
                error: 'Expiry date is required when receiving medications and other products with expiry',
              }, { status: 400 })
            }
          }
        }

        // Update each item
        for (const item of receivedItems) {
          await supabase
            .from('supplier_purchase_order_items')
            .update({
              quantity_received: item.quantity_received,
              batch_number: item.batch_number,
              lot_number: item.lot_number,
              expiry_date: item.expiry_date,
              received_at: new Date().toISOString(),
            })
            .eq('id', item.item_id)
            .eq('order_id', order_id)

          // Create inventory entry if buyer is pharmacy (match by barcode, fallback SKU)
          if (buyer.type === 'pharmacy' && item.quantity_received > 0) {
            const orderItem = order.items?.find((i: { id: string }) => i.id === item.item_id) as {
              product_barcode?: string | null
              product_sku?: string | null
              unit_price?: number
              product?: { barcode?: string | null; sku?: string | null }
            } | undefined
            if (orderItem) {
              const barcode = orderItem.product_barcode ?? orderItem.product?.barcode
              const sku = orderItem.product_sku ?? orderItem.product?.sku
              const pharmacyProduct = await resolvePharmacyProduct(supabase, {
                pharmacyId: buyer.id,
                barcode,
                sku,
              })
              if (pharmacyProduct) {
                const { data: invRow, error: invError } = await supabase
                  .from('pharmacy_inventory')
                  .insert({
                    pharmacy_id: buyer.id,
                    product_id: pharmacyProduct.pharmacyProductId,
                    quantity: item.quantity_received,
                    batch_number: item.batch_number || null,
                    lot_number: item.lot_number || null,
                    expiry_date: item.expiry_date || null,
                    purchase_price_unit: orderItem.unit_price,
                    received_date: new Date().toISOString().split('T')[0],
                    purchase_order_id: order_id,
                    supplier_order_id: order_id,
                    supplier_order_item_id: item.item_id,
                    is_active: true,
                  })
                  .select('id, quantity')
                  .single()
                if (invError) {
                  console.error('Error creating pharmacy inventory entry:', invError)
                } else if (invRow) {
                  await supabase.from('inventory_transactions').insert({
                    pharmacy_id: buyer.id,
                    product_id: pharmacyProduct.pharmacyProductId,
                    inventory_id: invRow.id,
                    transaction_type: 'purchase',
                    quantity_change: item.quantity_received,
                    quantity_before: 0,
                    quantity_after: item.quantity_received,
                    unit_price: orderItem.unit_price,
                    total_value: (orderItem.unit_price || 0) * item.quantity_received,
                    reference_type: 'supplier_order',
                    reference_id: order_id,
                    batch_number: item.batch_number,
                    expiry_date: item.expiry_date,
                  })
                }
              } else {
                console.warn(`No pharmacy product match for barcode=${barcode ?? 'null'}, sku=${sku ?? 'null'}`)
              }
            }
          }
        }

        updates.status = 'completed'
        updates.delivered_at = updates.delivered_at || new Date().toISOString()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: updatedOrder, error } = await supabase
      .from('supplier_purchase_orders')
      .update(updates)
      .eq('id', order_id)
      .select(`
        *,
        supplier:professionals!supplier_purchase_orders_supplier_id_fkey(id, business_name, email, phone),
        items:supplier_purchase_order_items(*)
      `)
      .single()

    if (error) {
      console.error('Error updating order:', error)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Notify supplier on delivery confirmation or payment
    const { data: supplierPro } = await supabase
      .from('professionals')
      .select('auth_user_id, business_name')
      .eq('id', order.supplier_id)
      .single()
    if (supplierPro?.auth_user_id) {
      if (action === 'confirm_delivery') {
        const { data: buyerPro } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', buyer.id)
          .single()
        await supabase.from('notifications').insert({
          user_id: supplierPro.auth_user_id,
          type: 'supplier_order',
          title: 'Order Delivered',
          title_ar: 'تم تسليم الطلب',
          title_fr: 'Commande livrée',
          message: `Order ${updatedOrder?.order_number || order.order_number} has been confirmed delivered by ${buyerPro?.business_name || 'buyer'}`,
          message_ar: `تم تأكيد استلام الطلب ${updatedOrder?.order_number || order.order_number} من قبل ${buyerPro?.business_name || 'المشتري'}`,
          message_fr: `Commande ${updatedOrder?.order_number || order.order_number} confirmée livrée par ${buyerPro?.business_name || 'acheteur'}`,
          metadata: { order_id: order_id, order_number: updatedOrder?.order_number || order.order_number, status: 'delivered' },
          action_url: '/professional/dashboard?section=orders',
          is_read: false,
        })
      } else if (action === 'mark_paid') {
        const { data: buyerPro } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', buyer.id)
          .single()
        await supabase.from('notifications').insert({
          user_id: supplierPro.auth_user_id,
          type: 'supplier_order',
          title: 'Order Paid',
          title_ar: 'تم الدفع',
          title_fr: 'Commande payée',
          message: `Order ${updatedOrder?.order_number || order.order_number} has been marked paid by ${buyerPro?.business_name || 'buyer'}`,
          message_ar: `تم تسجيل دفع الطلب ${updatedOrder?.order_number || order.order_number} من قبل ${buyerPro?.business_name || 'المشتري'}`,
          message_fr: `Commande ${updatedOrder?.order_number || order.order_number} marquée payée par ${buyerPro?.business_name || 'acheteur'}`,
          metadata: { order_id: order_id, order_number: updatedOrder?.order_number || order.order_number, status: 'paid' },
          action_url: '/professional/dashboard?section=orders',
          is_read: false,
        })
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error in buyer orders PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

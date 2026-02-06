import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CreatePOData } from '@/lib/pos/types'

/**
 * GET /api/pharmacy/purchase-orders
 * List purchase orders
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplier_id')

    let query = supabase
      .from('pharmacy_purchase_orders')
      .select(`
        *,
        supplier:pharmacy_suppliers(id, name, phone, email),
        warehouse:pharmacy_warehouses(id, name, code),
        items:pharmacy_purchase_order_items(
          *,
          product:pharmacy_products(id, name, barcode, purchase_price)
        )
      `)
      .eq('pharmacy_id', professional.id)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (supplierId) query = query.eq('supplier_id', supplierId)

    const { data: orders, error } = await query.limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/purchase-orders
 * Create a new purchase order
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminClient = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const body: CreatePOData = await request.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Items required' }, { status: 400 })
    }

    // Get PO number
    const { data: poNumber } = await adminClient.rpc('get_next_sequence', {
      p_pharmacy_id: professional.id,
      p_sequence_type: 'po',
      p_prefix: 'PO'
    })

    // Calculate totals
    let subtotal = 0
    for (const item of body.items) {
      const lineTotal = (item.unit_price || 0) * item.quantity_ordered * (1 - (item.discount_percent || 0) / 100)
      subtotal += lineTotal
    }

    const { data: po, error: poError } = await supabase
      .from('pharmacy_purchase_orders')
      .insert({
        pharmacy_id: professional.id,
        po_number: poNumber || `PO-${Date.now()}`,
        supplier_id: body.supplier_id,
        supplier_name: body.supplier_name,
        warehouse_id: body.warehouse_id,
        status: 'draft',
        order_date: new Date().toISOString(),
        expected_date: body.expected_date,
        payment_terms: body.payment_terms,
        subtotal,
        total_amount: subtotal, // Can add tax later
        notes: body.notes,
        created_by: user.id,
        created_by_name: profile?.full_name
      })
      .select()
      .single()

    if (poError) {
      return NextResponse.json({ error: poError.message }, { status: 500 })
    }

    // Insert items
    const poItems = body.items.map(item => ({
      purchase_order_id: po.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_barcode: item.product_barcode,
      quantity_ordered: item.quantity_ordered,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      line_total: (item.unit_price || 0) * item.quantity_ordered * (1 - (item.discount_percent || 0) / 100)
    }))

    await supabase
      .from('pharmacy_purchase_order_items')
      .insert(poItems)

    return NextResponse.json({
      success: true,
      purchase_order: po,
      message: `Purchase Order ${po.po_number} created`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/purchase-orders
 * Update PO status
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action') // send, confirm, receive, cancel

    if (!id) {
      return NextResponse.json({ error: 'PO ID required' }, { status: 400 })
    }

    const { data: po } = await supabase
      .from('pharmacy_purchase_orders')
      .select('*, items:pharmacy_purchase_order_items(*)')
      .eq('id', id)
      .eq('pharmacy_id', professional.id)
      .single()

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    const body = await request.json()

    if (action === 'send') {
      await supabase
        .from('pharmacy_purchase_orders')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ success: true, message: 'PO sent to supplier' })

    } else if (action === 'confirm') {
      await supabase
        .from('pharmacy_purchase_orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ success: true, message: 'PO confirmed' })

    } else if (action === 'receive') {
      // Receive items into inventory
      const receivedItems = body.items || []

      for (const item of po.items || []) {
        const received = receivedItems.find((r: any) => r.id === item.id)
        const qtyReceived = received?.quantity_received || item.quantity_ordered

        if (qtyReceived > 0) {
          // Create inventory entry
          await supabase
            .from('pharmacy_inventory')
            .insert({
              pharmacy_id: professional.id,
              product_id: item.product_id,
              warehouse_id: po.warehouse_id,
              quantity: qtyReceived,
              purchase_price_unit: item.unit_price,
              batch_number: received?.batch_number,
              expiry_date: received?.expiry_date,
              received_date: new Date().toISOString().split('T')[0],
              is_active: true
            })

          // Create transaction
          await supabase
            .from('inventory_transactions')
            .insert({
              pharmacy_id: professional.id,
              product_id: item.product_id,
              transaction_type: 'purchase',
              quantity_change: qtyReceived,
              quantity_before: 0,
              quantity_after: qtyReceived,
              unit_price: item.unit_price,
              total_value: qtyReceived * (item.unit_price || 0),
              reference_type: 'purchase_order',
              reference_id: po.id,
              notes: `PO ${po.po_number}`,
              created_by: user.id
            })

          // Update item received qty
          await supabase
            .from('pharmacy_purchase_order_items')
            .update({ quantity_received: qtyReceived })
            .eq('id', item.id)
        }
      }

      await supabase
        .from('pharmacy_purchase_orders')
        .update({ 
          status: 'received',
          received_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      return NextResponse.json({ success: true, message: 'Stock received from PO' })

    } else if (action === 'cancel') {
      if (!['draft', 'sent'].includes(po.status)) {
        return NextResponse.json({ error: 'Cannot cancel this PO' }, { status: 400 })
      }
      await supabase
        .from('pharmacy_purchase_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ success: true, message: 'PO cancelled' })
    }

    // General update
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.expected_date) updateData.expected_date = body.expected_date
    if (body.notes) updateData.notes = body.notes

    await supabase
      .from('pharmacy_purchase_orders')
      .update(updateData)
      .eq('id', id)

    return NextResponse.json({ success: true, message: 'PO updated' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

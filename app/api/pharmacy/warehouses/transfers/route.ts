import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/pharmacy/warehouses/transfers
 * List warehouse transfers
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

    let query = supabase
      .from('warehouse_transfers')
      .select(`
        *,
        from_warehouse:pharmacy_warehouses!warehouse_transfers_from_warehouse_id_fkey(id, name, code),
        to_warehouse:pharmacy_warehouses!warehouse_transfers_to_warehouse_id_fkey(id, name, code),
        items:warehouse_transfer_items(
          *,
          product:pharmacy_products(id, name, barcode)
        )
      `)
      .eq('pharmacy_id', professional.id)
      .order('requested_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: transfers, error } = await query.limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transfers: transfers || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/warehouses/transfers
 * Create a new transfer request
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

    const body = await request.json()
    const { from_warehouse_id, to_warehouse_id, items, notes } = body

    if (!from_warehouse_id || !to_warehouse_id) {
      return NextResponse.json({ error: 'Source and destination warehouses required' }, { status: 400 })
    }

    if (from_warehouse_id === to_warehouse_id) {
      return NextResponse.json({ error: 'Cannot transfer to same warehouse' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Items required' }, { status: 400 })
    }

    // Get transfer number
    const { data: transferNumber } = await adminClient.rpc('get_next_sequence', {
      p_pharmacy_id: professional.id,
      p_sequence_type: 'transfer',
      p_prefix: 'TR'
    })

    const { data: transfer, error: transferError } = await supabase
      .from('warehouse_transfers')
      .insert({
        pharmacy_id: professional.id,
        transfer_number: transferNumber || `TR-${Date.now()}`,
        from_warehouse_id,
        to_warehouse_id,
        status: 'pending',
        notes,
        requested_by: user.id
      })
      .select()
      .single()

    if (transferError) {
      return NextResponse.json({ error: transferError.message }, { status: 500 })
    }

    // Insert items
    const transferItems = items.map((item: any) => ({
      transfer_id: transfer.id,
      product_id: item.product_id,
      inventory_id: item.inventory_id,
      quantity_requested: item.quantity,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      notes: item.notes
    }))

    await supabase
      .from('warehouse_transfer_items')
      .insert(transferItems)

    return NextResponse.json({
      success: true,
      transfer,
      message: `Transfer ${transfer.transfer_number} created`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/warehouses/transfers
 * Update transfer status (ship, receive, cancel)
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
    const action = searchParams.get('action') // ship, receive, cancel

    if (!id || !action) {
      return NextResponse.json({ error: 'Transfer ID and action required' }, { status: 400 })
    }

    const { data: transfer } = await supabase
      .from('warehouse_transfers')
      .select('*, items:warehouse_transfer_items(*)')
      .eq('id', id)
      .eq('pharmacy_id', professional.id)
      .single()

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }

    const body = await request.json()

    if (action === 'ship') {
      if (transfer.status !== 'pending') {
        return NextResponse.json({ error: 'Transfer not in pending status' }, { status: 400 })
      }

      // Deduct from source warehouse
      for (const item of transfer.items || []) {
        if (item.inventory_id) {
          const { data: inv } = await supabase
            .from('pharmacy_inventory')
            .select('quantity')
            .eq('id', item.inventory_id)
            .single()

          if (inv) {
            await supabase
              .from('pharmacy_inventory')
              .update({ 
                quantity: inv.quantity - item.quantity_requested,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.inventory_id)
          }
        }

        // Update shipped quantity
        await supabase
          .from('warehouse_transfer_items')
          .update({ quantity_shipped: item.quantity_requested })
          .eq('id', item.id)
      }

      await supabase
        .from('warehouse_transfers')
        .update({
          status: 'in_transit',
          shipped_at: new Date().toISOString(),
          shipped_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      return NextResponse.json({ success: true, message: 'Transfer shipped' })

    } else if (action === 'receive') {
      if (transfer.status !== 'in_transit') {
        return NextResponse.json({ error: 'Transfer not in transit' }, { status: 400 })
      }

      // Add to destination warehouse
      for (const item of transfer.items || []) {
        const received = body.items?.find((i: any) => i.id === item.id)?.quantity_received || item.quantity_shipped || item.quantity_requested

        // Create new inventory entry in destination warehouse
        await supabase
          .from('pharmacy_inventory')
          .insert({
            pharmacy_id: professional.id,
            product_id: item.product_id,
            warehouse_id: transfer.to_warehouse_id,
            quantity: received,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            received_date: new Date().toISOString().split('T')[0],
            is_active: true
          })

        // Create transfer_in transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            pharmacy_id: professional.id,
            product_id: item.product_id,
            transaction_type: 'transfer_in',
            quantity_change: received,
            quantity_before: 0,
            quantity_after: received,
            reference_type: 'transfer',
            reference_id: transfer.id,
            notes: `Transfer ${transfer.transfer_number}`,
            created_by: user.id
          })

        await supabase
          .from('warehouse_transfer_items')
          .update({ quantity_received: received })
          .eq('id', item.id)
      }

      await supabase
        .from('warehouse_transfers')
        .update({
          status: 'completed',
          received_at: new Date().toISOString(),
          received_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      return NextResponse.json({ success: true, message: 'Transfer received' })

    } else if (action === 'cancel') {
      if (!['pending', 'in_transit'].includes(transfer.status)) {
        return NextResponse.json({ error: 'Cannot cancel this transfer' }, { status: 400 })
      }

      // If in_transit, return stock to source
      if (transfer.status === 'in_transit') {
        for (const item of transfer.items || []) {
          if (item.inventory_id) {
            const { data: inv } = await supabase
              .from('pharmacy_inventory')
              .select('quantity')
              .eq('id', item.inventory_id)
              .single()

            if (inv) {
              await supabase
                .from('pharmacy_inventory')
                .update({ 
                  quantity: inv.quantity + (item.quantity_shipped || item.quantity_requested),
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.inventory_id)
            }
          }
        }
      }

      await supabase
        .from('warehouse_transfers')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      return NextResponse.json({ success: true, message: 'Transfer cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

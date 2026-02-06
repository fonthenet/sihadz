import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InventoryFormData } from '@/lib/inventory/types'
import { emitStockReceived } from '@/lib/inventory/webhooks'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/stock
 * Get inventory/stock levels for the pharmacy (owner or employee).
 * Uses admin client so employees can read after auth check.
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const productId = searchParams.get('product_id')
    const supplierId = searchParams.get('supplier_id')
    const expiringWithinDays = searchParams.get('expiring_within_days')
    const expiredOnly = searchParams.get('expired_only') === 'true'
    const activeOnly = searchParams.get('active_only') !== 'false'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')

    // Build query
    let query = admin
      .from('pharmacy_inventory')
      .select(`
        *,
        product:pharmacy_products(id, name, name_ar, barcode, form, dosage, selling_price, purchase_price, min_stock_level),
        supplier:pharmacy_suppliers(id, name)
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    if (expiredOnly) {
      query = query.lt('expiry_date', new Date().toISOString().split('T')[0])
    } else if (expiringWithinDays) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + parseInt(expiringWithinDays))
      query = query
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
    }

    // Order by expiry date (FEFO)
    query = query.order('expiry_date', { ascending: true, nullsFirst: false })

    // Apply pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data: inventory, error, count } = await query

    if (error) {
      console.error('[Stock API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate total value
    const totalValue = inventory?.reduce((sum, inv) => {
      const unitCost = inv.purchase_price_unit || inv.product?.purchase_price || 0
      return sum + (inv.quantity * unitCost)
    }, 0) || 0

    return NextResponse.json({
      data: inventory || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      total_value: totalValue
    })
  } catch (error: any) {
    console.error('[Stock API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/inventory/stock
 * Add new stock (receive inventory) - owner or employee.
 * Uses admin client so employees can write after auth check.
 */
export async function POST(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const body: InventoryFormData = await request.json()

    // Validate required fields
    if (!body.product_id || !body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: 'Product ID and positive quantity are required' },
        { status: 400 }
      )
    }

    // Verify product belongs to this pharmacy
    const { data: product } = await admin
      .from('pharmacy_products')
      .select('id, name, purchase_price')
      .eq('id', body.product_id)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get current stock level for this product
    const { data: existingStock } = await admin
      .from('pharmacy_inventory')
      .select('quantity')
      .eq('product_id', body.product_id)
      .eq('is_active', true)

    const currentTotal = existingStock?.reduce((sum, s) => sum + s.quantity, 0) || 0

    // Insert inventory record
    const { data: inventory, error: invError } = await admin
      .from('pharmacy_inventory')
      .insert({
        pharmacy_id: pharmacyId,
        product_id: body.product_id,
        batch_number: body.batch_number || null,
        lot_number: body.lot_number || null,
        quantity: body.quantity,
        reserved_quantity: 0,
        purchase_price_unit: body.purchase_price_unit || product.purchase_price || null,
        expiry_date: body.expiry_date || null,
        received_date: new Date().toISOString().split('T')[0],
        supplier_id: body.supplier_id || null,
        location: body.location || null,
        is_active: true
      })
      .select()
      .single()

    if (invError) {
      console.error('[Stock API] Insert error:', invError)
      return NextResponse.json({ error: invError.message }, { status: 500 })
    }

    // Create transaction record
    const { error: txError } = await admin
      .from('inventory_transactions')
      .insert({
        pharmacy_id: pharmacyId,
        product_id: body.product_id,
        inventory_id: inventory.id,
        transaction_type: 'purchase',
        quantity_change: body.quantity,
        quantity_before: currentTotal,
        quantity_after: currentTotal + body.quantity,
        unit_price: body.purchase_price_unit || product.purchase_price,
        total_value: body.quantity * (body.purchase_price_unit || product.purchase_price || 0),
        batch_number: body.batch_number,
        expiry_date: body.expiry_date,
        notes: `Stock received for ${product.name}`,
        created_by: auth.actorId
      })

    if (txError) {
      console.error('[Stock API] Transaction error:', txError)
    }

    // Emit webhook for stock received
    await emitStockReceived(pharmacyId, {
      product_id: body.product_id,
      product_name: product.name,
      quantity: body.quantity,
      batch_number: body.batch_number,
      expiry_date: body.expiry_date
    })

    return NextResponse.json({ 
      success: true, 
      inventory,
      message: `Added ${body.quantity} units to stock` 
    })
  } catch (error: any) {
    console.error('[Stock API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'
import type { StockAdjustmentData, AdjustmentReasonCode } from '@/lib/inventory/types'
import { emitStockAdjusted, emitStockAlert } from '@/lib/inventory/webhooks'

const REASON_LABELS: Record<AdjustmentReasonCode, string> = {
  count_correction: 'Inventory Count Correction',
  damage: 'Damaged Product',
  theft: 'Theft',
  expiry: 'Expired Product',
  quality_issue: 'Quality Issue',
  data_entry_error: 'Data Entry Error',
  initial_stock: 'Initial Stock',
  other: 'Other'
}

/**
 * POST /api/pharmacy/inventory/adjustments
 * Create a stock adjustment (owner or employee)
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

    // Get actor name for audit
    let actorName = 'Staff'
    if (auth.isEmployee) {
      const { data: emp } = await admin
        .from('professional_employees')
        .select('display_name')
        .eq('id', auth.actorId)
        .single()
      actorName = emp?.display_name || 'Staff'
    } else {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', auth.actorId)
        .single()
      actorName = profile?.full_name || 'Owner'
    }

    const body: StockAdjustmentData = await request.json()

    // Validate required fields
    if (!body.product_id || !body.quantity || body.quantity <= 0 || !body.reason_code) {
      return NextResponse.json(
        { error: 'Product ID, positive quantity, and reason are required' },
        { status: 400 }
      )
    }

    if (!['add', 'remove'].includes(body.adjustment_type)) {
      return NextResponse.json(
        { error: 'Adjustment type must be "add" or "remove"' },
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

    // Get current stock level
    const { data: existingStock } = await admin
      .from('pharmacy_inventory')
      .select('id, quantity, batch_number, expiry_date, purchase_price_unit')
      .eq('product_id', body.product_id)
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .order('expiry_date', { ascending: true })

    const currentTotal = existingStock?.reduce((sum, s) => sum + s.quantity, 0) || 0

    // Calculate new total
    const quantityChange = body.adjustment_type === 'add' ? body.quantity : -body.quantity
    const newTotal = currentTotal + quantityChange

    // Validate we're not going negative
    if (newTotal < 0) {
      return NextResponse.json(
        { error: `Cannot remove ${body.quantity} units. Current stock is only ${currentTotal}` },
        { status: 400 }
      )
    }

    // For removals, we need to update specific inventory records (FEFO)
    if (body.adjustment_type === 'remove') {
      let remainingToRemove = body.quantity
      
      for (const inv of existingStock || []) {
        if (remainingToRemove <= 0) break
        
        const toRemove = Math.min(remainingToRemove, inv.quantity)
        const newQty = inv.quantity - toRemove
        
        // Update inventory record
        await admin
          .from('pharmacy_inventory')
          .update({
            quantity: newQty,
            is_active: newQty > 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', inv.id)
        
        remainingToRemove -= toRemove
      }
    } else {
      // For additions, create a new inventory record or update existing
      if (body.inventory_id) {
        // Update specific inventory record
        const inv = existingStock?.find(i => i.id === body.inventory_id)
        if (inv) {
          await admin
            .from('pharmacy_inventory')
            .update({
              quantity: inv.quantity + body.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', body.inventory_id)
        }
      } else {
        // Create new inventory entry for adjustment
        await admin
          .from('pharmacy_inventory')
          .insert({
            pharmacy_id: pharmacyId,
            product_id: body.product_id,
            quantity: body.quantity,
            reserved_quantity: 0,
            purchase_price_unit: product.purchase_price,
            received_date: new Date().toISOString().split('T')[0],
            is_active: true
          })
      }
    }

    // Create transaction record
    const transactionType = body.adjustment_type === 'add' ? 'adjustment_add' : 'adjustment_remove'
    
    const { data: transaction, error: txError } = await admin
      .from('inventory_transactions')
      .insert({
        pharmacy_id: pharmacyId,
        product_id: body.product_id,
        inventory_id: body.inventory_id || null,
        transaction_type: transactionType,
        quantity_change: quantityChange,
        quantity_before: currentTotal,
        quantity_after: newTotal,
        unit_price: product.purchase_price,
        total_value: Math.abs(quantityChange) * (product.purchase_price || 0),
        reason_code: body.reason_code,
        notes: body.notes || `${REASON_LABELS[body.reason_code]} - ${product.name}`,
        created_by: auth.actorId,
        created_by_name: actorName,
        approval_status: 'approved'
      })
      .select()
      .single()

    if (txError) {
      console.error('[Adjustments API] Transaction error:', txError)
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    // Emit webhook for stock adjustment
    await emitStockAdjusted(pharmacyId, {
      product_id: body.product_id,
      product_name: product.name,
      quantity_change: quantityChange,
      reason: REASON_LABELS[body.reason_code],
      new_quantity: newTotal
    })

    // Check for stock alerts
    const { data: productDetail } = await admin
      .from('pharmacy_products')
      .select('min_stock_level')
      .eq('id', body.product_id)
      .single()

    if (newTotal === 0) {
      await emitStockAlert(pharmacyId, 'out', {
        product_id: body.product_id,
        product_name: product.name,
        current_quantity: 0
      })
    } else if (productDetail?.min_stock_level && newTotal < productDetail.min_stock_level) {
      await emitStockAlert(pharmacyId, 'low', {
        product_id: body.product_id,
        product_name: product.name,
        current_quantity: newTotal,
        min_level: productDetail.min_stock_level
      })
    }

    return NextResponse.json({
      success: true,
      transaction,
      new_stock_level: newTotal,
      message: `Stock adjusted by ${quantityChange > 0 ? '+' : ''}${quantityChange} units. New level: ${newTotal}`
    })
  } catch (error: any) {
    console.error('[Adjustments API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/pharmacy/inventory/adjustments
 * Get adjustment history (owner or employee)
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
    const productId = searchParams.get('product_id')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')

    let query = admin
      .from('inventory_transactions')
      .select(`
        *,
        product:pharmacy_products(id, name, barcode)
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .in('transaction_type', ['adjustment_add', 'adjustment_remove'])
      .order('created_at', { ascending: false })

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const from = (page - 1) * perPage
    query = query.range(from, from + perPage - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[Adjustments API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    })
  } catch (error: any) {
    console.error('[Adjustments API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

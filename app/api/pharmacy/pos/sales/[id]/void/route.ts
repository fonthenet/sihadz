import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * POST /api/pharmacy/pos/sales/[id]/void
 * Void a completed sale - reverses inventory and marks as voided
 * Supports both owner and employee auth.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: saleId } = await params
    
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

    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Void reason is required' }, { status: 400 })
    }

    // Get the sale
    const { data: sale, error: saleError } = await admin
      .from('pos_sales')
      .select(`
        *,
        items:pos_sale_items(*)
      `)
      .eq('id', saleId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    if (sale.status === 'voided') {
      return NextResponse.json({ error: 'Sale is already voided' }, { status: 400 })
    }

    if (sale.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed sales can be voided' }, { status: 400 })
    }

    // Restore inventory for each item
    for (const item of sale.items || []) {
      // Skip items with zero or negative quantity (returns)
      if (item.quantity <= 0) continue

      // Get first active inventory batch for this product
      const { data: batch } = await admin
        .from('pharmacy_inventory')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true })
        .limit(1)
        .single()

      if (batch) {
        // Add quantity back to existing batch
        const newQty = batch.quantity + item.quantity
        await admin
          .from('pharmacy_inventory')
          .update({ 
            quantity: newQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', batch.id)
      } else {
        // No active batch, create a new one (or find inactive and reactivate)
        const { data: inactiveBatch } = await admin
          .from('pharmacy_inventory')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .eq('pharmacy_id', pharmacyId)
          .eq('is_active', false)
          .limit(1)
          .single()

        if (inactiveBatch) {
          await admin
            .from('pharmacy_inventory')
            .update({ 
              quantity: inactiveBatch.quantity + item.quantity,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', inactiveBatch.id)
        }
      }

      // Record inventory transaction for the reversal
      const { data: currentStock } = await admin
        .from('pharmacy_inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)

      const totalAfter = currentStock?.reduce((s, i) => s + i.quantity, 0) || 0

      await admin
        .from('inventory_transactions')
        .insert({
          pharmacy_id: pharmacyId,
          product_id: item.product_id,
          transaction_type: 'void',
          quantity_change: item.quantity, // Positive because we're restoring
          quantity_before: totalAfter - item.quantity,
          quantity_after: totalAfter,
          unit_price: item.unit_price,
          total_value: item.line_total,
          reference_type: 'void',
          reference_id: sale.id,
          notes: `Void of sale ${sale.sale_number}: ${reason}`,
          created_by: auth.actorId
        })
    }

    // Mark sale as voided
    const { error: updateError } = await admin
      .from('pos_sales')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: auth.actorId,
        void_reason: reason
      })
      .eq('id', saleId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Cancel any pending Chifa claims for this sale
    await admin
      .from('chifa_claims')
      .update({ 
        status: 'rejected',
        rejection_reason: `Sale voided: ${reason}`
      })
      .eq('sale_id', saleId)
      .eq('status', 'pending')

    return NextResponse.json({
      success: true,
      message: `Sale ${sale.sale_number} has been voided`,
      voided_by: actorName,
      items_restored: sale.items?.length || 0
    })
  } catch (error: any) {
    console.error('[Void Sale] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

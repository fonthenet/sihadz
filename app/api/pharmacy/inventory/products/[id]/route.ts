import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'
import type { ProductFormData } from '@/lib/inventory/types'
import { emitProductUpdated, emitWebhookEvent } from '@/lib/inventory/webhooks'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * GET /api/pharmacy/inventory/products/[id]
 * Get a single product by ID (owner or employee)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    // Get product
    const { data: product, error } = await admin
      .from('pharmacy_products')
      .select(`
        *,
        category:pharmacy_product_categories(id, name, name_ar)
      `)
      .eq('id', productId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get stock levels
    const { data: inventory } = await admin
      .from('pharmacy_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('expiry_date', { ascending: true })

    const totalStock = inventory?.reduce((sum, i) => sum + i.quantity, 0) || 0
    const reservedStock = inventory?.reduce((sum, i) => sum + i.reserved_quantity, 0) || 0
    const totalValue = inventory?.reduce((sum, i) => 
      sum + (i.quantity * (i.purchase_price_unit || product.purchase_price || 0)), 0
    ) || 0

    // Get recent transactions
    const { data: recentTransactions } = await admin
      .from('inventory_transactions')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      product: {
        ...product,
        current_stock: totalStock,
        reserved_stock: reservedStock,
        available_stock: totalStock - reservedStock,
        total_value: totalValue
      },
      inventory: inventory || [],
      recent_transactions: recentTransactions || []
    })
  } catch (error: any) {
    console.error('[Product API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/inventory/products/[id]
 * Update a product (owner or employee with inventory permission)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    // Verify product belongs to this pharmacy
    const { data: existingProduct } = await admin
      .from('pharmacy_products')
      .select('id, barcode')
      .eq('id', productId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body: Partial<ProductFormData> = await request.json()

    // Calculate margin if prices are being updated
    let marginPercent: number | null = null
    if (body.purchase_price !== undefined && body.selling_price !== undefined) {
      if (body.purchase_price > 0) {
        marginPercent = ((body.selling_price - body.purchase_price) / body.purchase_price) * 100
      }
    }

    // Check for duplicate barcode if changing
    if (body.barcode && body.barcode !== existingProduct.barcode) {
      const { data: duplicate } = await admin
        .from('pharmacy_products')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('barcode', body.barcode)
        .neq('id', productId)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'A product with this barcode already exists' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    // Only include fields that are provided
    if (body.barcode !== undefined) updateData.barcode = body.barcode || null
    if (body.sku !== undefined) updateData.sku = body.sku || null
    if (body.name !== undefined) updateData.name = body.name
    if (body.name_ar !== undefined) updateData.name_ar = body.name_ar || null
    if (body.generic_name !== undefined) updateData.generic_name = body.generic_name || null
    if (body.dci_code !== undefined) updateData.dci_code = body.dci_code || null
    if (body.category_id !== undefined) updateData.category_id = body.category_id || null
    if (body.form !== undefined) updateData.form = body.form || null
    if (body.dosage !== undefined) updateData.dosage = body.dosage || null
    if (body.packaging !== undefined) updateData.packaging = body.packaging || null
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer || null
    if (body.country_of_origin !== undefined) updateData.country_of_origin = body.country_of_origin || null
    if (body.purchase_price !== undefined) updateData.purchase_price = body.purchase_price || null
    if (body.selling_price !== undefined) updateData.selling_price = body.selling_price
    if (marginPercent !== null) updateData.margin_percent = marginPercent
    if (body.is_chifa_listed !== undefined) updateData.is_chifa_listed = body.is_chifa_listed
    if (body.reimbursement_rate !== undefined) updateData.reimbursement_rate = body.reimbursement_rate
    if (body.tarif_reference !== undefined) updateData.tarif_reference = body.tarif_reference || null
    if (body.requires_prescription !== undefined) updateData.requires_prescription = body.requires_prescription
    if (body.is_controlled !== undefined) updateData.is_controlled = body.is_controlled
    if (body.controlled_tableau !== undefined) updateData.controlled_tableau = body.controlled_tableau || null
    if (body.storage_conditions !== undefined) updateData.storage_conditions = body.storage_conditions || null
    if (body.min_stock_level !== undefined) updateData.min_stock_level = body.min_stock_level
    if (body.reorder_quantity !== undefined) updateData.reorder_quantity = body.reorder_quantity
    if (body.tva_rate !== undefined) updateData.tva_rate = body.tva_rate

    // Update product
    const { data: product, error } = await admin
      .from('pharmacy_products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('[Product API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Emit webhook for product update
    await emitProductUpdated(pharmacyId, product, body)

    return NextResponse.json({ 
      success: true, 
      product,
      message: 'Product updated successfully' 
    })
  } catch (error: any) {
    console.error('[Product API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/pharmacy/inventory/products/[id]
 * Soft delete a product (set is_active = false) - owner or employee
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    // Verify product belongs to this pharmacy
    const { data: existingProduct } = await admin
      .from('pharmacy_products')
      .select('id, name')
      .eq('id', productId)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if product has active stock
    const { data: inventory } = await admin
      .from('pharmacy_inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('is_active', true)

    const totalStock = inventory?.reduce((sum, i) => sum + i.quantity, 0) || 0

    if (totalStock > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with active stock. Adjust stock to 0 first.' },
        { status: 400 }
      )
    }

    // Soft delete
    const { error } = await admin
      .from('pharmacy_products')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', productId)

    if (error) {
      console.error('[Product API] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Emit webhook for product deletion
    await emitWebhookEvent(pharmacyId, 'product.deleted', { 
      product: { id: productId, name: existingProduct.name } 
    })

    return NextResponse.json({ 
      success: true, 
      message: `Product "${existingProduct.name}" has been deactivated` 
    })
  } catch (error: any) {
    console.error('[Product API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

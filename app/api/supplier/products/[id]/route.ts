import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupplierProductInput } from '@/lib/supplier/types'
import { categoryRequiresExpiry } from '@/lib/supplier/expiry-validation'

// GET - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: product, error } = await supabase
      .from('supplier_product_catalog')
      .select('*, category:supplier_product_categories(*)')
      .eq('id', id)
      .eq('supplier_id', professional.id)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error in supplier product GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body: Partial<SupplierProductInput> = await request.json()

    // Require expiry_date for medication/expiry-type categories
    const { data: current } = await supabase
      .from('supplier_product_catalog')
      .select('category_id, expiry_date')
      .eq('id', id)
      .eq('supplier_id', professional.id)
      .single()

    const effectiveCategoryId = body.category_id ?? current?.category_id
    const effectiveExpiry = body.expiry_date !== undefined ? body.expiry_date : current?.expiry_date

    if (effectiveCategoryId) {
      const { data: category } = await supabase
        .from('supplier_product_categories')
        .select('requires_expiry')
        .eq('id', effectiveCategoryId)
        .single()
      if (categoryRequiresExpiry(category) && !(effectiveExpiry?.trim())) {
        return NextResponse.json({
          error: 'Expiry date is required for medications and other products with expiry',
        }, { status: 400 })
      }
    }

    const { data: product, error } = await supabase
      .from('supplier_product_catalog')
      .update(body)
      .eq('id', id)
      .eq('supplier_id', professional.id)
      .select('*, category:supplier_product_categories(*)')
      .single()

    if (error) {
      console.error('Error updating product:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Product with this SKU already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error in supplier product PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check if product is used in any orders
    const { data: orderItems } = await supabase
      .from('supplier_purchase_order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1)

    if (orderItems && orderItems.length > 0) {
      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from('supplier_product_catalog')
        .update({ is_active: false })
        .eq('id', id)
        .eq('supplier_id', professional.id)

      if (error) {
        return NextResponse.json({ error: 'Failed to deactivate product' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Product deactivated (has order history)' })
    }

    // Hard delete if no orders
    const { error } = await supabase
      .from('supplier_product_catalog')
      .delete()
      .eq('id', id)
      .eq('supplier_id', professional.id)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Product deleted' })
  } catch (error) {
    console.error('Error in supplier product DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

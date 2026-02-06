import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupplierProductInput } from '@/lib/supplier/types'
import { categoryRequiresExpiry } from '@/lib/supplier/expiry-validation'

// GET - List supplier's products
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier's professional profile
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const inStock = searchParams.get('in_stock')
    const isActive = searchParams.get('is_active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('supplier_product_catalog')
      .select('*, category:supplier_product_categories(*)', { count: 'exact' })
      .eq('supplier_id', professional.id)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,name_fr.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%,dci_code.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('category_id', category)
    }

    if (inStock !== null) {
      query = query.eq('in_stock', inStock === 'true')
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: products, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json({
      data: products || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in supplier products GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
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

    const body: SupplierProductInput = await request.json()

    if (!body.name || body.unit_price === undefined) {
      return NextResponse.json({ error: 'Name and unit_price are required' }, { status: 400 })
    }

    // Require expiry_date for medication/expiry-type categories
    if (body.category_id) {
      const { data: category } = await supabase
        .from('supplier_product_categories')
        .select('requires_expiry')
        .eq('id', body.category_id)
        .single()
      if (categoryRequiresExpiry(category) && !body.expiry_date?.trim()) {
        return NextResponse.json({
          error: 'Expiry date is required for medications and other products with expiry',
        }, { status: 400 })
      }
    }

    const insertData: Record<string, unknown> = {
      supplier_id: professional.id,
      ...body,
      min_order_qty: body.min_order_qty || 1,
      pack_size: body.pack_size || 1,
      lead_time_days: body.lead_time_days || 1,
      is_active: body.is_active ?? true,
      in_stock: body.in_stock ?? true,
    }
    if (body.reorder_point !== undefined) insertData.reorder_point = body.reorder_point
    if (body.expiry_date?.trim()) insertData.expiry_date = body.expiry_date.trim()
    const { data: product, error } = await supabase
      .from('supplier_product_catalog')
      .insert(insertData)
      .select('*, category:supplier_product_categories(*)')
      .single()

    if (error) {
      console.error('Error creating product:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Product with this SKU already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error in supplier products POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List supplier's products (for buyers)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get buyer's professional profile
    const { data: buyer } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
    }

    // Check if buyer is linked to this supplier
    const { data: link } = await supabase
      .from('supplier_buyer_links')
      .select('id, status, discount_percent')
      .eq('supplier_id', supplierId)
      .eq('buyer_id', buyer.id)
      .eq('status', 'active')
      .single()

    // Check if supplier accepts orders from anyone
    const { data: settings } = await supabase
      .from('supplier_settings')
      .select('accept_orders_from_anyone')
      .eq('supplier_id', supplierId)
      .single()

    if (!link && !settings?.accept_orders_from_anyone) {
      return NextResponse.json({ error: 'Not authorized to view this supplier\'s products' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const inStock = searchParams.get('in_stock')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('supplier_product_catalog')
      .select('*, category:supplier_product_categories(*)', { count: 'exact' })
      .eq('supplier_id', supplierId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (search) {
      query = query.or(`name.ilike.%${search}%,name_fr.ilike.%${search}%,barcode.ilike.%${search}%,dci_code.ilike.%${search}%,generic_name.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('category_id', category)
    }

    if (inStock === 'true') {
      query = query.eq('in_stock', true)
    }

    const { data: products, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Apply buyer's discount if linked
    const discount = link?.discount_percent || 0
    const productsWithDiscount = products?.map(product => ({
      ...product,
      buyer_discount_percent: discount,
      buyer_price: discount > 0 
        ? product.unit_price * (1 - discount / 100)
        : product.unit_price,
    })) || []

    return NextResponse.json({
      data: productsWithDiscount,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
      discount_percent: discount,
    })
  } catch (error) {
    console.error('Error in supplier products GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

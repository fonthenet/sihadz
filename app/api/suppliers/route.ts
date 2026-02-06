import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List suppliers (directory for buyers)
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const supplierType = searchParams.get('type')
    const wilaya = searchParams.get('wilaya')
    const linkedOnly = searchParams.get('linked_only') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get existing links for this buyer
    const { data: links } = await supabase
      .from('supplier_buyer_links')
      .select('supplier_id, status')
      .eq('buyer_id', buyer.id)

    const linkMap = new Map(links?.map(l => [l.supplier_id, l.status]) || [])
    const linkedSupplierIds = links?.filter(l => l.status === 'active').map(l => l.supplier_id) || []

    // Build supplier query
    let query = supabase
      .from('professionals')
      .select('id, business_name, type, email, phone, wilaya, commune, address_line1, status', { count: 'exact' })
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .eq('status', 'verified')
      .order('business_name', { ascending: true })

    if (search) {
      query = query.ilike('business_name', `%${search}%`)
    }

    if (supplierType) {
      query = query.eq('type', supplierType)
    }

    if (wilaya) {
      query = query.eq('wilaya', wilaya)
    }

    if (linkedOnly) {
      if (linkedSupplierIds.length === 0) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          limit,
          hasMore: false,
        })
      }
      query = query.in('id', linkedSupplierIds)
    }

    const { data: suppliers, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }

    // Get product counts for each supplier
    const supplierIds = suppliers?.map(s => s.id) || []
    const { data: productCounts } = await supabase
      .from('supplier_product_catalog')
      .select('supplier_id')
      .in('supplier_id', supplierIds)
      .eq('is_active', true)

    const countMap = new Map<string, number>()
    productCounts?.forEach(p => {
      countMap.set(p.supplier_id, (countMap.get(p.supplier_id) || 0) + 1)
    })

    // Enrich suppliers with link status and product count
    const enrichedSuppliers = suppliers?.map(supplier => ({
      ...supplier,
      product_count: countMap.get(supplier.id) || 0,
      is_linked: linkMap.has(supplier.id),
      link_status: linkMap.get(supplier.id) || null,
    })) || []

    return NextResponse.json({
      data: enrichedSuppliers,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in suppliers GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

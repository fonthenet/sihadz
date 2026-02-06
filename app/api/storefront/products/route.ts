import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'
import type { StorefrontProductFormData, StorefrontProductFilters } from '@/lib/storefront/types'

/**
 * GET /api/storefront/products
 * List products for the authenticated professional
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Filters
    const categoryId = searchParams.get('category_id')
    const productType = searchParams.get('product_type')
    const isAvailable = searchParams.get('is_available')
    const isFeatured = searchParams.get('is_featured')
    const search = searchParams.get('search')

    // Build query
    let query = admin
      .from('storefront_products')
      .select('*, category:storefront_categories(*)', { count: 'exact' })
      .eq('professional_id', auth.professionalId)

    // Apply filters
    if (categoryId) query = query.eq('category_id', categoryId)
    if (productType) query = query.eq('product_type', productType)
    if (isAvailable === 'true') query = query.eq('is_available', true)
    if (isAvailable === 'false') query = query.eq('is_available', false)
    if (isFeatured === 'true') query = query.eq('is_featured', true)
    if (search) {
      query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Order and paginate
    query = query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: products, error, count } = await query

    if (error) {
      console.error('[Storefront Products] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const has_pharmacy_inventory = auth.professionalType === 'pharmacy'

    return NextResponse.json({
      products,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      has_pharmacy_inventory,
    })
  } catch (error: any) {
    console.error('[Storefront Products] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/storefront/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StorefrontProductFormData = await request.json()
    const admin = createAdminClient()

    // Validate required fields
    if (!body.name || body.price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      )
    }

    const { data: product, error } = await admin
      .from('storefront_products')
      .insert({
        professional_id: auth.professionalId,
        category_id: body.category_id || null,
        name: body.name,
        name_ar: body.name_ar || null,
        description: body.description || null,
        description_ar: body.description_ar || null,
        product_type: body.product_type || 'product',
        tags: body.tags || [],
        price: body.price,
        compare_at_price: body.compare_at_price || null,
        is_available: body.is_available !== false,
        stock_quantity: body.stock_quantity ?? null,
        track_inventory: body.track_inventory || false,
        low_stock_threshold: body.low_stock_threshold || 5,
        image_url: body.image_url || null,
        images: body.images || [],
        pharmacy_product_id: body.pharmacy_product_id || null,
        requires_prescription: body.requires_prescription || false,
        duration_minutes: body.duration_minutes || null,
        display_order: body.display_order || 0,
        is_featured: body.is_featured || false,
        search_keywords: body.search_keywords || [],
      })
      .select('*, category:storefront_categories(*)')
      .single()

    if (error) {
      console.error('[Storefront Products] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('[Storefront Products] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

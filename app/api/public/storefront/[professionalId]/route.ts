import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface RouteParams {
  params: Promise<{ professionalId: string }>
}

/**
 * GET /api/public/storefront/[professionalId]
 * Get public storefront info, categories, and products for a business
 * No authentication required
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { professionalId } = await params
    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Optional filters
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const featuredOnly = searchParams.get('featured') === 'true'

    // 1. Get storefront settings (must be enabled)
    const { data: settings, error: settingsError } = await admin
      .from('storefront_settings')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_enabled', true)
      .maybeSingle()

    if (settingsError) {
      console.error('[Public Storefront] Settings error:', settingsError)
      return NextResponse.json({ error: settingsError.message }, { status: 500 })
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'Storefront not found or not enabled' },
        { status: 404 }
      )
    }

    // 2. Get professional info
    const { data: professional, error: proError } = await admin
      .from('professionals')
      .select(`
        id,
        business_name,
        business_name_ar,
        type,
        phone,
        address_line1,
        wilaya,
        commune,
        rating,
        review_count,
        working_hours
      `)
      .eq('id', professionalId)
      .single()

    if (proError || !professional) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // 3. Get categories
    const { data: categories } = await admin
      .from('storefront_categories')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    // 4. Get products (available only)
    let productsQuery = admin
      .from('storefront_products')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_available', true)

    if (categoryId) {
      productsQuery = productsQuery.eq('category_id', categoryId)
    }
    if (featuredOnly) {
      productsQuery = productsQuery.eq('is_featured', true)
    }
    if (search) {
      productsQuery = productsQuery.or(
        `name.ilike.%${search}%,name_ar.ilike.%${search}%,description.ilike.%${search}%`
      )
    }

    productsQuery = productsQuery
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    const { data: products } = await productsQuery

    // 5. Get featured products separately if not filtering
    let featuredProducts = products?.filter(p => p.is_featured) || []
    if (!categoryId && !search && !featuredOnly) {
      featuredProducts = products?.filter(p => p.is_featured).slice(0, 6) || []
    }

    return NextResponse.json({
      settings,
      professional,
      categories: categories || [],
      products: products || [],
      featured_products: featuredProducts,
    })
  } catch (error: any) {
    console.error('[Public Storefront] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

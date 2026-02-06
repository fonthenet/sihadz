import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ professionalId: string; productId: string }>
}

/**
 * GET /api/public/storefront/[professionalId]/products/[productId]
 * Get a single product from a public storefront (no auth required)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { professionalId, productId } = await params

    const admin = createAdminClient()

    const { data: settings } = await admin
      .from('storefront_settings')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('is_enabled', true)
      .maybeSingle()

    if (!settings) {
      return NextResponse.json({ error: 'Storefront not found or not enabled' }, { status: 404 })
    }

    const { data: product, error } = await admin
      .from('storefront_products')
      .select('*, category:storefront_categories(*)')
      .eq('id', productId)
      .eq('professional_id', professionalId)
      .eq('is_available', true)
      .maybeSingle()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // If product has no image, find a similar product (same category first, then any) with image for fallback
    let productWithFallback = { ...product }
    if (!product.image_url) {
      let fallbackUrl: string | null = null
      if (product.category_id) {
        const { data: sameCat } = await admin
          .from('storefront_products')
          .select('image_url')
          .eq('professional_id', professionalId)
          .eq('category_id', product.category_id)
          .eq('is_available', true)
          .not('image_url', 'is', null)
          .neq('id', productId)
          .limit(1)
          .maybeSingle()
        fallbackUrl = sameCat?.image_url ?? null
      }
      if (!fallbackUrl) {
        const { data: anyWithImg } = await admin
          .from('storefront_products')
          .select('image_url')
          .eq('professional_id', professionalId)
          .eq('is_available', true)
          .not('image_url', 'is', null)
          .neq('id', productId)
          .limit(1)
          .maybeSingle()
        fallbackUrl = anyWithImg?.image_url ?? null
      }
      if (fallbackUrl) {
        productWithFallback = { ...product, image_url: fallbackUrl }
      }
    }

    return NextResponse.json({ product: productWithFallback })
  } catch (error: any) {
    console.error('[Public Storefront Product] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

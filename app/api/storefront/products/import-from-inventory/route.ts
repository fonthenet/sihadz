import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'

/**
 * POST /api/storefront/products/import-from-inventory
 * Import pharmacy products to storefront.
 * Only available for pharmacy professionals.
 * Creates storefront products linked to pharmacy_product_id for sync.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (auth.professionalType !== 'pharmacy') {
      return NextResponse.json(
        { error: 'Import from inventory is only available for pharmacies' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const pharmacyProductIds = Array.isArray(body.pharmacy_product_ids)
      ? body.pharmacy_product_ids
      : body.pharmacy_product_id
        ? [body.pharmacy_product_id]
        : []

    if (pharmacyProductIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one pharmacy_product_id is required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const professionalId = auth.professionalId

    // Fetch pharmacy products (verify ownership)
    const { data: pharmacyProducts, error: fetchError } = await admin
      .from('pharmacy_products')
      .select('id, name, name_ar, selling_price, requires_prescription')
      .eq('pharmacy_id', professionalId)
      .in('id', pharmacyProductIds)
      .eq('is_active', true)

    if (fetchError) {
      console.error('[Import from inventory] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pharmacyProducts || pharmacyProducts.length === 0) {
      return NextResponse.json(
        { error: 'No valid pharmacy products found' },
        { status: 404 }
      )
    }

    // Get stock levels for each product
    const productIds = pharmacyProducts.map((p) => p.id)
    const { data: inventory } = await admin
      .from('pharmacy_inventory')
      .select('product_id, quantity, reserved_quantity')
      .in('product_id', productIds)
      .eq('is_active', true)

    const stockByProduct: Record<string, number> = {}
    if (inventory) {
      for (const inv of inventory) {
        const available = inv.quantity - (inv.reserved_quantity || 0)
        stockByProduct[inv.product_id] =
          (stockByProduct[inv.product_id] || 0) + Math.max(0, available)
      }
    }

    // Check which are already imported
    const { data: existing } = await admin
      .from('storefront_products')
      .select('pharmacy_product_id')
      .eq('professional_id', professionalId)
      .in('pharmacy_product_id', productIds)
      .not('pharmacy_product_id', 'is', null)

    const alreadyImported = new Set(
      (existing || []).map((r) => r.pharmacy_product_id).filter(Boolean)
    )

    const toImport = pharmacyProducts.filter((p) => !alreadyImported.has(p.id))
    if (toImport.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: pharmacyProducts.length,
        message: 'All selected products are already in your storefront',
      })
    }

    const storefrontProducts = toImport.map((pp) => ({
      professional_id: professionalId,
      pharmacy_product_id: pp.id,
      name: pp.name,
      name_ar: pp.name_ar || null,
      description: null,
      description_ar: null,
      product_type: 'product',
      tags: [],
      price: pp.selling_price,
      compare_at_price: null,
      is_available: true,
      stock_quantity: stockByProduct[pp.id] ?? 0,
      track_inventory: true,
      low_stock_threshold: 5,
      image_url: null,
      images: [],
      requires_prescription: pp.requires_prescription || false,
      duration_minutes: null,
      display_order: 0,
      is_featured: false,
      search_keywords: [],
    }))

    const { data: inserted, error: insertError } = await admin
      .from('storefront_products')
      .insert(storefrontProducts)
      .select('id, name, price, pharmacy_product_id')

    if (insertError) {
      console.error('[Import from inventory] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      skipped: pharmacyProducts.length - toImport.length,
      products: inserted,
    })
  } catch (error: any) {
    console.error('[Import from inventory] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

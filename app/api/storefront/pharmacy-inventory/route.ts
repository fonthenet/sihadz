import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'

/**
 * GET /api/storefront/pharmacy-inventory
 * List pharmacy products for import to storefront.
 * Only available for pharmacy professionals.
 * Excludes products already linked to storefront.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (auth.professionalType !== 'pharmacy') {
      return NextResponse.json({
        products: [],
        has_pharmacy_inventory: false,
        message: 'Pharmacy inventory is only available for pharmacies',
      })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.professionalId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const exclude_imported = searchParams.get('exclude_imported') !== 'false'

    // Get pharmacy products with stock
    let query = admin
      .from('pharmacy_products')
      .select(`
        id,
        name,
        name_ar,
        generic_name,
        form,
        dosage,
        packaging,
        selling_price,
        requires_prescription,
        is_active
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,generic_name.ilike.%${search}%,name_ar.ilike.%${search}%`
      )
    }

    const { data: pharmacyProducts, error } = await query.order('name')

    if (error) {
      console.error('[Storefront Pharmacy Inventory] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get stock levels
    const productIds = pharmacyProducts?.map((p) => p.id) || []
    let stockLevels: Record<string, number> = {}

    if (productIds.length > 0) {
      const { data: inventory } = await admin
        .from('pharmacy_inventory')
        .select('product_id, quantity, reserved_quantity')
        .in('product_id', productIds)
        .eq('is_active', true)

      if (inventory) {
        for (const inv of inventory) {
          const available = inv.quantity - (inv.reserved_quantity || 0)
          stockLevels[inv.product_id] =
            (stockLevels[inv.product_id] || 0) + Math.max(0, available)
        }
      }
    }

    // Get already-imported pharmacy_product_ids
    let importedIds: string[] = []
    if (exclude_imported && productIds.length > 0) {
      const { data: existing } = await admin
        .from('storefront_products')
        .select('pharmacy_product_id')
        .eq('professional_id', pharmacyId)
        .in('pharmacy_product_id', productIds)
        .not('pharmacy_product_id', 'is', null)
      importedIds = (existing || [])
        .map((r) => r.pharmacy_product_id)
        .filter(Boolean) as string[]
    }

    const enriched = (pharmacyProducts || []).map((p) => ({
      ...p,
      available_stock: stockLevels[p.id] || 0,
      already_imported: importedIds.includes(p.id),
    }))

    const filtered = exclude_imported
      ? enriched.filter((p) => !p.already_imported)
      : enriched

    return NextResponse.json({
      products: filtered,
      has_pharmacy_inventory: true,
    })
  } catch (error: any) {
    console.error('[Storefront Pharmacy Inventory] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

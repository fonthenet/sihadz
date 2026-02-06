import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalFromRequest } from '@/lib/storefront/auth'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/storefront/products/[id]/sync-inventory
 * Sync price and stock from linked pharmacy product.
 * Only works for storefront products that have pharmacy_product_id.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getProfessionalFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get storefront product and verify ownership
    const { data: storefrontProduct, error: productError } = await admin
      .from('storefront_products')
      .select('id, pharmacy_product_id, professional_id')
      .eq('id', id)
      .eq('professional_id', auth.professionalId)
      .single()

    if (productError || !storefrontProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!storefrontProduct.pharmacy_product_id) {
      return NextResponse.json(
        {
          error:
            'This product is not linked to pharmacy inventory. Link it first or use "Import from inventory".',
        },
        { status: 400 }
      )
    }

    // Fetch pharmacy product (verify same pharmacy)
    const { data: pharmacyProduct, error: ppError } = await admin
      .from('pharmacy_products')
      .select('id, name, name_ar, selling_price, requires_prescription')
      .eq('id', storefrontProduct.pharmacy_product_id)
      .eq('pharmacy_id', auth.professionalId)
      .single()

    if (ppError || !pharmacyProduct) {
      return NextResponse.json(
        { error: 'Linked pharmacy product not found or inaccessible' },
        { status: 404 }
      )
    }

    // Get current stock
    const { data: inventory } = await admin
      .from('pharmacy_inventory')
      .select('quantity, reserved_quantity')
      .eq('product_id', pharmacyProduct.id)
      .eq('is_active', true)

    let availableStock = 0
    if (inventory) {
      for (const inv of inventory) {
        availableStock += Math.max(
          0,
          inv.quantity - (inv.reserved_quantity || 0)
        )
      }
    }

    // Update storefront product (sync price, stock, details; keep is_available as-is for manual control)
    const { data: updated, error: updateError } = await admin
      .from('storefront_products')
      .update({
        name: pharmacyProduct.name,
        name_ar: pharmacyProduct.name_ar || null,
        price: pharmacyProduct.selling_price,
        stock_quantity: availableStock,
        requires_prescription: pharmacyProduct.requires_prescription || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, category:storefront_categories(*)')
      .single()

    if (updateError) {
      console.error('[Sync inventory] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product: updated,
      synced: {
        price: pharmacyProduct.selling_price,
        stock: availableStock,
      },
    })
  } catch (error: any) {
    console.error('[Sync inventory] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

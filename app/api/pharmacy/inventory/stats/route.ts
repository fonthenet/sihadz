import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/stats
 * Get inventory dashboard statistics (owner or employee).
 * Uses admin client so employees can read after auth check.
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId
    const today = new Date().toISOString().split('T')[0]
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const in30DaysStr = in30Days.toISOString().split('T')[0]

    // Get product counts
    const { count: totalProducts } = await admin
      .from('pharmacy_products')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)

    const { count: activeProducts } = await admin
      .from('pharmacy_products')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)

    // Get supplier count
    const { count: totalSuppliers } = await admin
      .from('pharmacy_suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)

    // Get category count
    const { count: totalCategories } = await admin
      .from('pharmacy_product_categories')
      .select('id', { count: 'exact', head: true })

    // Get inventory data for stock calculations
    const { data: inventory } = await admin
      .from('pharmacy_inventory')
      .select('quantity, product_id, expiry_date')
      .eq('pharmacy_id', pharmacyId)

    // Get products with min_stock_level for low stock calculation
    const { data: products } = await admin
      .from('pharmacy_products')
      .select('id, min_stock_level')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)

    // Calculate stock levels per product
    const stockByProduct: Record<string, number> = {}
    let expiringCount = 0
    let expiredCount = 0

    for (const inv of inventory || []) {
      if (!stockByProduct[inv.product_id]) {
        stockByProduct[inv.product_id] = 0
      }
      stockByProduct[inv.product_id] += inv.quantity

      if (inv.expiry_date) {
        if (inv.expiry_date < today) {
          expiredCount++
        } else if (inv.expiry_date <= in30DaysStr) {
          expiringCount++
        }
      }
    }

    // Calculate low stock and out of stock
    let lowStockCount = 0
    let outOfStockCount = 0

    for (const product of products || []) {
      const stock = stockByProduct[product.id] || 0
      if (stock <= 0) {
        outOfStockCount++
      } else if (stock < product.min_stock_level) {
        lowStockCount++
      }
    }

    // Calculate total inventory value (simplified)
    const { data: inventoryWithCost } = await admin
      .from('pharmacy_inventory')
      .select('quantity, purchase_price_unit')
      .eq('pharmacy_id', pharmacyId)

    let totalValue = 0
    for (const inv of inventoryWithCost || []) {
      totalValue += inv.quantity * (inv.purchase_price_unit || 0)
    }

    return NextResponse.json({
      stats: {
        total_products: totalProducts || 0,
        active_products: activeProducts || 0,
        total_suppliers: totalSuppliers || 0,
        total_categories: totalCategories || 0,
        low_stock: lowStockCount,
        out_of_stock: outOfStockCount,
        expiring_soon: expiringCount,
        expired: expiredCount,
        total_inventory_value: totalValue
      }
    })
  } catch (error: any) {
    console.error('[Stats API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

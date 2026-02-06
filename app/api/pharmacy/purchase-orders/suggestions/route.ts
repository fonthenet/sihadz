import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { OrderSuggestion } from '@/lib/pos/types'

/**
 * GET /api/pharmacy/purchase-orders/suggestions
 * Get order suggestions based on stock levels and sales rotation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    const includeOutOfStock = searchParams.get('include_out_of_stock') !== 'false'
    const includeLowStock = searchParams.get('include_low_stock') !== 'false'

    // Get all products with their stock levels
    const { data: products } = await supabase
      .from('pharmacy_products')
      .select('id, name, barcode, min_stock_level, reorder_quantity, purchase_price')
      .eq('pharmacy_id', professional.id)
      .eq('is_active', true)

    if (!products || products.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    // Get current stock for each product
    const productIds = products.map(p => p.id)
    const { data: inventory } = await supabase
      .from('pharmacy_inventory')
      .select('product_id, quantity')
      .in('product_id', productIds)
      .eq('is_active', true)

    const stockByProduct = new Map<string, number>()
    for (const inv of inventory || []) {
      stockByProduct.set(inv.product_id, (stockByProduct.get(inv.product_id) || 0) + inv.quantity)
    }

    // Get sales in last 30 days for rotation
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: salesItems } = await supabase
      .from('pos_sale_items')
      .select('product_id, quantity')
      .in('product_id', productIds)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const salesByProduct = new Map<string, number>()
    for (const item of salesItems || []) {
      salesByProduct.set(item.product_id, (salesByProduct.get(item.product_id) || 0) + item.quantity)
    }

    // Also count from inventory transactions (sale type)
    const { data: txItems } = await supabase
      .from('inventory_transactions')
      .select('product_id, quantity_change')
      .in('product_id', productIds)
      .eq('transaction_type', 'sale')
      .gte('created_at', thirtyDaysAgo.toISOString())

    for (const tx of txItems || []) {
      const qty = Math.abs(tx.quantity_change)
      salesByProduct.set(tx.product_id, (salesByProduct.get(tx.product_id) || 0) + qty)
    }

    // Generate suggestions
    const suggestions: OrderSuggestion[] = []

    for (const product of products) {
      const currentStock = stockByProduct.get(product.id) || 0
      const minLevel = product.min_stock_level || 0
      const salesLast30 = salesByProduct.get(product.id) || 0
      const avgDaily = salesLast30 / 30

      // Determine if needs ordering
      let reason: OrderSuggestion['reason'] | null = null
      let suggestedQty = 0

      if (currentStock <= 0 && includeOutOfStock) {
        reason = 'out_of_stock'
        // Order enough for 30 days + buffer
        suggestedQty = Math.max(product.reorder_quantity || 10, Math.ceil(avgDaily * 30))
      } else if (currentStock > 0 && currentStock < minLevel && includeLowStock) {
        reason = 'low_stock'
        // Order to reach min level + 15 days buffer
        suggestedQty = Math.max(
          product.reorder_quantity || (minLevel - currentStock),
          minLevel - currentStock + Math.ceil(avgDaily * 15)
        )
      } else if (avgDaily > 0 && currentStock < avgDaily * 7) {
        // Less than 7 days of stock based on rotation
        reason = 'rotation'
        suggestedQty = Math.ceil(avgDaily * 21) - currentStock // Order for 21 days
      }

      if (reason && suggestedQty > 0) {
        suggestions.push({
          product_id: product.id,
          product_name: product.name,
          product_barcode: product.barcode || undefined,
          current_stock: currentStock,
          min_stock_level: minLevel,
          avg_daily_sales: Math.round(avgDaily * 100) / 100,
          suggested_quantity: Math.ceil(suggestedQty),
          reason,
          last_purchase_price: product.purchase_price || undefined
        })
      }
    }

    // Sort: out_of_stock first, then low_stock, then rotation
    const priority = { out_of_stock: 0, low_stock: 1, rotation: 2, seasonal: 3 }
    suggestions.sort((a, b) => priority[a.reason] - priority[b.reason])

    return NextResponse.json({
      suggestions,
      summary: {
        out_of_stock: suggestions.filter(s => s.reason === 'out_of_stock').length,
        low_stock: suggestions.filter(s => s.reason === 'low_stock').length,
        rotation: suggestions.filter(s => s.reason === 'rotation').length,
        total_items: suggestions.length
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Supplier stock validation - prevents pharmacies from ordering more than available.
 * Uses: warehouse stock (sum across warehouses) OR product catalog stock_quantity.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type StockValidationResult = {
  valid: boolean
  productId: string
  productName: string
  requestedQty: number
  availableQty: number | null
  inStock: boolean
  minOrderQty: number
  error?: string
}

/**
 * Get available quantity for a product from a supplier.
 * - If supplier uses warehouses: sum of supplier_warehouse_stock.quantity
 * - Else: supplier_product_catalog.stock_quantity
 * - Returns null if stock is not tracked (allow order)
 */
export async function getAvailableQuantity(
  supabase: SupabaseClient,
  supplierId: string,
  productId: string
): Promise<{ available: number | null; inStock: boolean }> {
  const { data: warehouses } = await supabase
    .from('supplier_warehouses')
    .select('id')
    .eq('supplier_id', supplierId)
  const warehouseIds: string[] = (warehouses || []).map((w: { id: string }) => w.id)

  const { data: product } = await supabase
    .from('supplier_product_catalog')
    .select('stock_quantity, in_stock')
    .eq('id', productId)
    .eq('supplier_id', supplierId)
    .single()

  if (!product) return { available: null, inStock: false }
  if (product.in_stock === false) return { available: 0, inStock: false }

  if (warehouseIds.length > 0) {
    const { data: stockRows } = await supabase
      .from('supplier_warehouse_stock')
      .select('quantity')
      .eq('product_id', productId)
      .in('warehouse_id', warehouseIds)
    const total = (stockRows || []).reduce((sum, r) => sum + (r.quantity || 0), 0)
    return { available: total, inStock: total > 0 }
  }

  const qty = product.stock_quantity != null ? product.stock_quantity : null
  return { available: qty, inStock: qty === null || qty > 0 }
}

/**
 * Get available quantities for multiple products in one batch (for UI display).
 * Returns a map of product_id -> { available, inStock }.
 */
export async function getAvailableQuantities(
  supabase: SupabaseClient,
  supplierId: string,
  productIds: string[]
): Promise<Record<string, { available: number | null; inStock: boolean }>> {
  if (productIds.length === 0) return {}

  const { data: warehouses } = await supabase
    .from('supplier_warehouses')
    .select('id')
    .eq('supplier_id', supplierId)
  const warehouseIds: string[] = (warehouses || []).map((w: { id: string }) => w.id)

  const { data: products } = await supabase
    .from('supplier_product_catalog')
    .select('id, stock_quantity, in_stock')
    .eq('supplier_id', supplierId)
    .in('id', productIds)

  const result: Record<string, { available: number | null; inStock: boolean }> = {}
  let warehouseStockMap: Record<string, number> = {}
  if (warehouseIds.length > 0) {
    const { data: stockRows } = await supabase
      .from('supplier_warehouse_stock')
      .select('product_id, quantity')
      .in('product_id', productIds)
      .in('warehouse_id', warehouseIds)
    for (const r of stockRows || []) {
      const pid = r.product_id as string
      warehouseStockMap[pid] = (warehouseStockMap[pid] || 0) + (r.quantity || 0)
    }
  }
  for (const pid of productIds) {
    const product = products?.find((p: { id: string }) => p.id === pid)
    if (!product) {
      result[pid] = { available: null, inStock: false }
      continue
    }
    if (product.in_stock === false) {
      result[pid] = { available: 0, inStock: false }
      continue
    }
    if (warehouseIds.length > 0) {
      const total = warehouseStockMap[pid] ?? 0
      result[pid] = { available: total, inStock: total > 0 }
    } else {
      const qty = product.stock_quantity != null ? product.stock_quantity : null
      result[pid] = { available: qty, inStock: qty === null || qty > 0 }
    }
  }
  return result
}

/**
 * Validate order items against supplier stock.
 * Returns validation results - if any invalid, order should be rejected.
 */
export async function validateOrderItems(
  supabase: SupabaseClient,
  supplierId: string,
  items: Array<{ product_id: string; quantity: number; product_name?: string }>,
  productMap: Map<string, { name: string; min_order_qty?: number | null; in_stock?: boolean }>
): Promise<{ valid: boolean; errors: StockValidationResult[] }> {
  const errors: StockValidationResult[] = []

  for (const item of items) {
    const product = productMap.get(item.product_id)
    const productName = product?.name || item.product_name || 'Unknown'
    const minOrderQty = product?.min_order_qty ?? 1

    if (item.quantity <= 0) {
      errors.push({
        valid: false,
        productId: item.product_id,
        productName,
        requestedQty: item.quantity,
        availableQty: null,
        inStock: false,
        minOrderQty,
        error: 'Quantity must be at least 1',
      })
      continue
    }

    if (item.quantity < minOrderQty) {
      errors.push({
        valid: false,
        productId: item.product_id,
        productName,
        requestedQty: item.quantity,
        availableQty: null,
        inStock: true,
        minOrderQty,
        error: `Minimum order quantity is ${minOrderQty}`,
      })
      continue
    }

    const { available, inStock } = await getAvailableQuantity(supabase, supplierId, item.product_id)

    if (!inStock && available === 0) {
      errors.push({
        valid: false,
        productId: item.product_id,
        productName,
        requestedQty: item.quantity,
        availableQty: 0,
        inStock: false,
        minOrderQty,
        error: 'Product is out of stock',
      })
      continue
    }

    if (available != null && item.quantity > available) {
      errors.push({
        valid: false,
        productId: item.product_id,
        productName,
        requestedQty: item.quantity,
        availableQty: available,
        inStock: true,
        minOrderQty,
        error: `Only ${available} available (requested ${item.quantity})`,
      })
    }
  }

  return (
    errors.length === 0
      ? { valid: true, errors: [] }
      : { valid: false, errors }
  )
}

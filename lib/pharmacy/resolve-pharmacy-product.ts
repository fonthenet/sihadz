/**
 * Resolve pharmacy product from supplier product identifiers.
 * Match by barcode first, fallback to SKU.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvePharmacyProductParams {
  pharmacyId: string
  barcode?: string | null
  sku?: string | null
}

export interface ResolvePharmacyProductResult {
  pharmacyProductId: string
  name: string
}

/**
 * Find pharmacy_products.id by barcode (first) or SKU (fallback).
 * Returns null if no match.
 */
export async function resolvePharmacyProduct(
  supabase: SupabaseClient,
  params: ResolvePharmacyProductParams
): Promise<ResolvePharmacyProductResult | null> {
  const { pharmacyId, barcode, sku } = params

  // 1. Try barcode first (if present and non-empty)
  const barcodeTrimmed = barcode?.trim()
  if (barcodeTrimmed) {
    const { data: byBarcode } = await supabase
      .from('pharmacy_products')
      .select('id, name')
      .eq('pharmacy_id', pharmacyId)
      .eq('barcode', barcodeTrimmed)
      .eq('is_active', true)
      .maybeSingle()

    if (byBarcode) {
      return { pharmacyProductId: byBarcode.id, name: byBarcode.name }
    }
  }

  // 2. Fallback to SKU
  const skuTrimmed = sku?.trim()
  if (skuTrimmed) {
    const { data: bySku } = await supabase
      .from('pharmacy_products')
      .select('id, name')
      .eq('pharmacy_id', pharmacyId)
      .eq('sku', skuTrimmed)
      .eq('is_active', true)
      .maybeSingle()

    if (bySku) {
      return { pharmacyProductId: bySku.id, name: bySku.name }
    }
  }

  return null
}

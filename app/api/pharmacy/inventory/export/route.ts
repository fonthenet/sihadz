import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { extractApiKey, validateApiKeyFromRequest, hasScope } from '@/lib/inventory/api-keys'

/**
 * GET /api/pharmacy/inventory/export
 * Export products and stock as CSV or JSON
 * Supports both session auth and API key auth
 */
export async function GET(request: NextRequest) {
  try {
    let pharmacyId: string | null = null
    
    // Check for API key first
    const apiKey = extractApiKey(request)
    if (apiKey) {
      const validation = await validateApiKeyFromRequest(apiKey)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 401 })
      }
      if (!hasScope(validation.scopes || [], 'products:read')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      pharmacyId = validation.pharmacy_id!
    } else {
      // Fall back to session auth
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
      pharmacyId = professional.id
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const type = searchParams.get('type') || 'products' // products, stock, all
    const includeStock = type === 'all' || type === 'stock'

    // Fetch products
    const { data: products, error: prodError } = await supabase
      .from('pharmacy_products')
      .select(`
        id, barcode, sku, name, name_ar, generic_name, dci_code,
        category_id, form, dosage, packaging, manufacturer,
        purchase_price, selling_price, margin_percent,
        is_chifa_listed, reimbursement_rate, tarif_reference,
        requires_prescription, is_controlled, controlled_tableau,
        storage_conditions, min_stock_level, reorder_quantity, tva_rate,
        is_active, created_at
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .order('name')

    if (prodError) {
      return NextResponse.json({ error: prodError.message }, { status: 500 })
    }

    // Optionally fetch stock data
    let stockByProduct: Record<string, { total: number; batches: any[] }> = {}
    if (includeStock) {
      const { data: inventory } = await supabase
        .from('pharmacy_inventory')
        .select('product_id, batch_number, quantity, expiry_date, location')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)

      for (const inv of inventory || []) {
        if (!stockByProduct[inv.product_id]) {
          stockByProduct[inv.product_id] = { total: 0, batches: [] }
        }
        stockByProduct[inv.product_id].total += inv.quantity
        stockByProduct[inv.product_id].batches.push({
          batch: inv.batch_number,
          qty: inv.quantity,
          expiry: inv.expiry_date,
          location: inv.location
        })
      }
    }

    // Enrich products with stock if requested
    const enrichedProducts = (products || []).map(p => ({
      ...p,
      ...(includeStock ? {
        current_stock: stockByProduct[p.id]?.total || 0,
        batches: stockByProduct[p.id]?.batches || []
      } : {})
    }))

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'barcode', 'sku', 'name', 'generic_name', 'dci_code',
        'form', 'dosage', 'packaging', 'manufacturer',
        'purchase_price', 'selling_price',
        'is_chifa_listed', 'reimbursement_rate',
        'requires_prescription', 'is_controlled',
        'min_stock_level', 'tva_rate'
      ]
      if (includeStock) headers.push('current_stock')

      const csvRows = [headers.join(',')]
      for (const p of enrichedProducts) {
        const row = [
          escapeCSV(p.barcode),
          escapeCSV(p.sku),
          escapeCSV(p.name),
          escapeCSV(p.generic_name),
          escapeCSV(p.dci_code),
          escapeCSV(p.form),
          escapeCSV(p.dosage),
          escapeCSV(p.packaging),
          escapeCSV(p.manufacturer),
          p.purchase_price || '',
          p.selling_price || '',
          p.is_chifa_listed ? 'true' : 'false',
          p.reimbursement_rate || 0,
          p.requires_prescription ? 'true' : 'false',
          p.is_controlled ? 'true' : 'false',
          p.min_stock_level || 0,
          p.tva_rate || 0
        ]
        if (includeStock) row.push(p.current_stock || 0)
        csvRows.push(row.join(','))
      }

      const csv = csvRows.join('\n')
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Default: JSON
    return NextResponse.json({
      exported_at: new Date().toISOString(),
      count: enrichedProducts.length,
      products: enrichedProducts
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function escapeCSV(value: any): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

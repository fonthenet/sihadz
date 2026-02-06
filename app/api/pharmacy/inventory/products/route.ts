import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProductFormData, ProductFilters, ProductSort } from '@/lib/inventory/types'
import { emitProductCreated } from '@/lib/inventory/webhooks'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/products
 * List products for the authenticated pharmacy (owner or employee).
 * Uses admin client so employees (cookie auth) can read data after auth check.
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
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('category_id') || ''
    const isChifaListed = searchParams.get('is_chifa_listed')
    const requiresPrescription = searchParams.get('requires_prescription')
    const isControlled = searchParams.get('is_controlled')
    const isActive = searchParams.get('is_active') !== 'false'
    const lowStockOnly = searchParams.get('low_stock_only') === 'true'
    const outOfStockOnly = searchParams.get('out_of_stock_only') === 'true'
    const sortField = searchParams.get('sort_field') || 'name'
    const sortDir = searchParams.get('sort_dir') || 'asc'

    // Build query
    let query = admin
      .from('pharmacy_products')
      .select(`
        *,
        category:pharmacy_product_categories(id, name, name_ar)
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,barcode.ilike.%${search}%,dci_code.ilike.%${search}%`)
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    
    if (isChifaListed !== null && isChifaListed !== '') {
      query = query.eq('is_chifa_listed', isChifaListed === 'true')
    }
    
    if (requiresPrescription !== null && requiresPrescription !== '') {
      query = query.eq('requires_prescription', requiresPrescription === 'true')
    }
    
    if (isControlled !== null && isControlled !== '') {
      query = query.eq('is_controlled', isControlled === 'true')
    }

    // Apply sorting
    const ascending = sortDir === 'asc'
    query = query.order(sortField, { ascending })

    // Apply pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data: products, error, count } = await query

    if (error) {
      console.error('[Products API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get stock levels for each product
    const productIds = products?.map(p => p.id) || []
    
    let stockLevels: Record<string, { total: number; available: number }> = {}
    
    if (productIds.length > 0) {
      const { data: inventory } = await admin
        .from('pharmacy_inventory')
        .select('product_id, quantity, reserved_quantity')
        .in('product_id', productIds)
        .eq('is_active', true)

      if (inventory) {
        for (const inv of inventory) {
          if (!stockLevels[inv.product_id]) {
            stockLevels[inv.product_id] = { total: 0, available: 0 }
          }
          stockLevels[inv.product_id].total += inv.quantity
          stockLevels[inv.product_id].available += (inv.quantity - inv.reserved_quantity)
        }
      }
    }

    // Enrich products with stock data
    const enrichedProducts = products?.map(p => ({
      ...p,
      current_stock: stockLevels[p.id]?.total || 0,
      available_stock: stockLevels[p.id]?.available || 0
    })) || []

    // Filter by stock if requested (after enrichment)
    let filteredProducts = enrichedProducts
    if (lowStockOnly) {
      filteredProducts = enrichedProducts.filter(p => 
        p.current_stock > 0 && p.current_stock < p.min_stock_level
      )
    }
    if (outOfStockOnly) {
      filteredProducts = enrichedProducts.filter(p => p.current_stock <= 0)
    }

    // Calculate stats
    const stats = {
      total_active: enrichedProducts.filter(p => p.is_active).length,
      low_stock: enrichedProducts.filter(p => 
        p.current_stock > 0 && p.current_stock < p.min_stock_level
      ).length,
      out_of_stock: enrichedProducts.filter(p => p.current_stock <= 0).length
    }

    return NextResponse.json({
      data: lowStockOnly || outOfStockOnly ? filteredProducts : enrichedProducts,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      stats
    })
  } catch (error: any) {
    console.error('[Products API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/inventory/products
 * Create a new product (owner or employee with inventory permission).
 * Uses admin client so employees can write after auth check.
 */
export async function POST(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const body: ProductFormData = await request.json()

    // Validate required fields
    if (!body.name || !body.selling_price) {
      return NextResponse.json(
        { error: 'Name and selling price are required' },
        { status: 400 }
      )
    }

    // Calculate margin if purchase price provided
    let marginPercent = body.purchase_price && body.purchase_price > 0
      ? ((body.selling_price - body.purchase_price) / body.purchase_price) * 100
      : null

    // Check for duplicate barcode
    if (body.barcode) {
      const { data: existing } = await admin
        .from('pharmacy_products')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('barcode', body.barcode)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'A product with this barcode already exists' },
          { status: 400 }
        )
      }
    }

    // Insert product (actorId = owner user id or employee id)
    const { data: product, error } = await admin
      .from('pharmacy_products')
      .insert({
        pharmacy_id: pharmacyId,
        barcode: body.barcode || null,
        sku: body.sku || null,
        name: body.name,
        name_ar: body.name_ar || null,
        generic_name: body.generic_name || null,
        dci_code: body.dci_code || null,
        category_id: body.category_id || null,
        form: body.form || null,
        dosage: body.dosage || null,
        packaging: body.packaging || null,
        manufacturer: body.manufacturer || null,
        country_of_origin: body.country_of_origin || null,
        purchase_price: body.purchase_price || null,
        selling_price: body.selling_price,
        margin_percent: marginPercent,
        is_chifa_listed: body.is_chifa_listed || false,
        reimbursement_rate: body.reimbursement_rate || 0,
        tarif_reference: body.tarif_reference || null,
        requires_prescription: body.requires_prescription || false,
        is_controlled: body.is_controlled || false,
        controlled_tableau: body.controlled_tableau || null,
        storage_conditions: body.storage_conditions || null,
        min_stock_level: body.min_stock_level || 0,
        reorder_quantity: body.reorder_quantity || 0,
        tva_rate: body.tva_rate || 0,
        source: 'manual',
        created_by: auth.actorId
      })
      .select()
      .single()

    if (error) {
      console.error('[Products API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Emit webhook for product creation
    await emitProductCreated(pharmacyId, product)

    return NextResponse.json({ 
      success: true, 
      product,
      message: 'Product created successfully' 
    })
  } catch (error: any) {
    console.error('[Products API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

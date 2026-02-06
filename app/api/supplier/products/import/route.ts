import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupplierProductInput } from '@/lib/supplier/types'
import { categoryRequiresExpiry } from '@/lib/supplier/expiry-validation'

/**
 * POST /api/supplier/products/import
 * Bulk import products from CSV/JSON
 * Supports large-scale product catalog imports
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .in('type', ['pharma_supplier', 'equipment_supplier'])
      .maybeSingle()

    if (!professional) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { products, format = 'json' } = body

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Products array is required' }, { status: 400 })
    }

    if (products.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 products per import' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      created: [] as string[],
      updated: [] as string[],
    }

    // Process products in batches of 50
    const batchSize = 50
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      
      for (const productData of batch) {
        try {
          // Validate required fields
          if (!productData.name || !productData.unit_price) {
            results.failed++
            results.errors.push(`Product ${i + 1}: name and unit_price are required`)
            continue
          }

          // Require expiry for medication/expiry-type categories
          if (productData.category_id) {
            const { data: category } = await supabase
              .from('supplier_product_categories')
              .select('requires_expiry')
              .eq('id', productData.category_id)
              .single()
            if (categoryRequiresExpiry(category) && !(productData.expiry_date?.trim?.() || productData.expiry_date)) {
              results.failed++
              results.errors.push(`Product ${i + 1}: expiry_date is required for medications and other products with expiry`)
              continue
            }
          }

          // Prepare product data
          const product: SupplierProductInput = {
            sku: productData.sku || null,
            barcode: productData.barcode || null,
            name: productData.name,
            name_ar: productData.name_ar || null,
            name_fr: productData.name_fr || null,
            description: productData.description || null,
            dci_code: productData.dci_code || null,
            generic_name: productData.generic_name || null,
            form: productData.form || null,
            dosage: productData.dosage || null,
            packaging: productData.packaging || null,
            category_id: productData.category_id || null,
            manufacturer: productData.manufacturer || null,
            country_of_origin: productData.country_of_origin || null,
            unit_price: parseFloat(productData.unit_price),
            min_order_qty: parseInt(productData.min_order_qty) || 1,
            pack_size: parseInt(productData.pack_size) || 1,
            bulk_discount_qty: productData.bulk_discount_qty ? parseInt(productData.bulk_discount_qty) : null,
            bulk_discount_percent: productData.bulk_discount_percent ? parseFloat(productData.bulk_discount_percent) : null,
            is_chifa_listed: productData.is_chifa_listed === true || productData.is_chifa_listed === 'true',
            reimbursement_rate: productData.reimbursement_rate ? parseInt(productData.reimbursement_rate) : 0,
            tarif_reference: productData.tarif_reference ? parseFloat(productData.tarif_reference) : null,
            requires_prescription: productData.requires_prescription === true || productData.requires_prescription === 'true',
            is_controlled: productData.is_controlled === true || productData.is_controlled === 'true',
            controlled_tableau: productData.controlled_tableau || null,
            storage_conditions: productData.storage_conditions || null,
            in_stock: productData.in_stock !== false && productData.in_stock !== 'false',
            stock_quantity: productData.stock_quantity ? parseInt(productData.stock_quantity) : null,
            batch_number: productData.batch_number?.trim?.() || productData.batch_number || undefined,
            expiry_date: productData.expiry_date?.trim?.() || productData.expiry_date || undefined,
            lead_time_days: productData.lead_time_days ? parseInt(productData.lead_time_days) : 1,
            warranty_months: productData.warranty_months ? parseInt(productData.warranty_months) : null,
            installation_included: productData.installation_included === true || productData.installation_included === 'true',
            maintenance_available: productData.maintenance_available === true || productData.maintenance_available === 'true',
            is_active: productData.is_active !== false && productData.is_active !== 'false',
            is_featured: productData.is_featured === true || productData.is_featured === 'true',
          }

          // Check if product exists (by SKU or barcode)
          let existingProduct = null
          if (product.sku) {
            const { data } = await supabase
              .from('supplier_product_catalog')
              .select('id')
              .eq('supplier_id', professional.id)
              .eq('sku', product.sku)
              .single()
            existingProduct = data
          } else if (product.barcode) {
            const { data } = await supabase
              .from('supplier_product_catalog')
              .select('id')
              .eq('supplier_id', professional.id)
              .eq('barcode', product.barcode)
              .single()
            existingProduct = data
          }

          if (existingProduct) {
            // Update existing product
            const { error } = await supabase
              .from('supplier_product_catalog')
              .update(product)
              .eq('id', existingProduct.id)

            if (error) throw error
            results.updated.push(existingProduct.id)
          } else {
            // Create new product
            const { data: newProduct, error } = await supabase
              .from('supplier_product_catalog')
              .insert({
                supplier_id: professional.id,
                ...product,
              })
              .select('id')
              .single()

            if (error) throw error
            results.created.push(newProduct.id)
          }

          results.success++
        } catch (error: any) {
          results.failed++
          results.errors.push(`Product ${i + 1}: ${error.message || 'Unknown error'}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: products.length,
        success: results.success,
        failed: results.failed,
        created: results.created.length,
        updated: results.updated.length,
      },
      errors: results.errors.slice(0, 50), // Limit error messages
    })
  } catch (error: any) {
    console.error('Error importing products:', error)
    return NextResponse.json({ error: error.message || 'Failed to import products' }, { status: 500 })
  }
}

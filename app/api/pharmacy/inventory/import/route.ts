import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { extractApiKey, validateApiKeyFromRequest, hasScope } from '@/lib/inventory/api-keys'
import { emitProductCreated, emitProductUpdated } from '@/lib/inventory/webhooks'

interface ImportProduct {
  barcode?: string
  sku?: string
  name: string
  generic_name?: string
  dci_code?: string
  form?: string
  dosage?: string
  packaging?: string
  manufacturer?: string
  purchase_price?: number
  selling_price: number
  is_chifa_listed?: boolean
  reimbursement_rate?: number
  requires_prescription?: boolean
  is_controlled?: boolean
  min_stock_level?: number
  tva_rate?: number
  // Optional stock data
  initial_stock?: number
  batch_number?: string
  expiry_date?: string
}

/**
 * POST /api/pharmacy/inventory/import
 * Bulk import products (JSON array)
 * Supports both session auth and API key auth
 */
export async function POST(request: NextRequest) {
  try {
    let pharmacyId: string | null = null
    let userId: string | null = null
    
    // Check for API key first
    const apiKey = extractApiKey(request)
    if (apiKey) {
      const validation = await validateApiKeyFromRequest(apiKey)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 401 })
      }
      if (!hasScope(validation.scopes || [], 'products:write')) {
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
      userId = user.id

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
    const body = await request.json()
    
    const products: ImportProduct[] = body.products || body
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Products array is required' }, { status: 400 })
    }

    // Create import job
    const { data: job, error: jobError } = await supabase
      .from('inventory_import_jobs')
      .insert({
        pharmacy_id: pharmacyId,
        source_type: 'api',
        source_name: body.source_name || 'API Import',
        status: 'processing',
        total_rows: products.length,
        started_at: new Date().toISOString(),
        created_by: userId
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 })
    }

    // Process products
    let imported = 0
    let updated = 0
    let skipped = 0
    let errorCount = 0
    const errors: Array<{ row: number; message: string }> = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      
      try {
        // Validate required fields
        if (!p.name || !p.selling_price) {
          errors.push({ row: i + 1, message: 'Name and selling_price are required' })
          skipped++
          continue
        }

        // Check for existing product by barcode or sku
        let existingId: string | null = null
        if (p.barcode) {
          const { data: existing } = await supabase
            .from('pharmacy_products')
            .select('id')
            .eq('pharmacy_id', pharmacyId)
            .eq('barcode', p.barcode)
            .single()
          existingId = existing?.id || null
        } else if (p.sku) {
          const { data: existing } = await supabase
            .from('pharmacy_products')
            .select('id')
            .eq('pharmacy_id', pharmacyId)
            .eq('sku', p.sku)
            .single()
          existingId = existing?.id || null
        }

        // Calculate margin
        const margin = p.purchase_price && p.purchase_price > 0
          ? ((p.selling_price - p.purchase_price) / p.purchase_price) * 100
          : null

        const productData = {
          pharmacy_id: pharmacyId,
          barcode: p.barcode || null,
          sku: p.sku || null,
          name: p.name,
          generic_name: p.generic_name || null,
          dci_code: p.dci_code || null,
          form: p.form || null,
          dosage: p.dosage || null,
          packaging: p.packaging || null,
          manufacturer: p.manufacturer || null,
          purchase_price: p.purchase_price || null,
          selling_price: p.selling_price,
          margin_percent: margin,
          is_chifa_listed: p.is_chifa_listed || false,
          reimbursement_rate: p.reimbursement_rate || 0,
          requires_prescription: p.requires_prescription || false,
          is_controlled: p.is_controlled || false,
          min_stock_level: p.min_stock_level || 0,
          tva_rate: p.tva_rate || 0,
          source: 'import',
          is_active: true,
          updated_at: new Date().toISOString()
        }

        let productId: string

        if (existingId) {
          // Update existing
          const { error: updateError } = await supabase
            .from('pharmacy_products')
            .update(productData)
            .eq('id', existingId)
          
          if (updateError) throw updateError
          productId = existingId
          updated++
          
          // Emit webhook
          await emitProductUpdated(pharmacyId!, productData, { source: 'import' })
        } else {
          // Insert new
          const { data: newProduct, error: insertError } = await supabase
            .from('pharmacy_products')
            .insert({ ...productData, created_by: userId })
            .select('id')
            .single()
          
          if (insertError) throw insertError
          productId = newProduct.id
          imported++
          
          // Emit webhook
          await emitProductCreated(pharmacyId!, { ...productData, id: productId })
        }

        // Add initial stock if provided
        if (p.initial_stock && p.initial_stock > 0) {
          await supabase
            .from('pharmacy_inventory')
            .insert({
              pharmacy_id: pharmacyId,
              product_id: productId,
              quantity: p.initial_stock,
              batch_number: p.batch_number || null,
              expiry_date: p.expiry_date || null,
              received_date: new Date().toISOString().split('T')[0],
              is_active: true
            })
          
          // Create transaction record
          await supabase
            .from('inventory_transactions')
            .insert({
              pharmacy_id: pharmacyId,
              product_id: productId,
              transaction_type: 'purchase',
              quantity_change: p.initial_stock,
              quantity_before: 0,
              quantity_after: p.initial_stock,
              notes: 'Initial stock from import',
              created_by: userId
            })
        }
      } catch (err: any) {
        errors.push({ row: i + 1, message: err.message })
        errorCount++
      }
    }

    // Update job status
    await supabase
      .from('inventory_import_jobs')
      .update({
        status: 'completed',
        processed_rows: products.length,
        imported_count: imported,
        updated_count: updated,
        skipped_count: skipped,
        error_count: errorCount,
        errors,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return NextResponse.json({
      success: true,
      job_id: job.id,
      summary: {
        total: products.length,
        imported,
        updated,
        skipped,
        errors: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

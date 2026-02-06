import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

/**
 * GET /api/supplier/products/export
 * Export products to CSV/JSON
 * Supports filtering and large catalogs
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json' // json, csv, or xlsx
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')
    const inStock = searchParams.get('in_stock')

    let query = supabase
      .from('supplier_product_catalog')
      .select(`
        *,
        category:supplier_product_categories(name, name_fr, name_ar)
      `)
      .eq('supplier_id', professional.id)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category_id', category)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (inStock !== null) {
      query = query.eq('in_stock', inStock === 'true')
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'SKU', 'Barcode', 'Name', 'Name (FR)', 'Name (AR)', 'Description',
        'DCI Code', 'Generic Name', 'Form', 'Dosage', 'Packaging',
        'Category', 'Manufacturer', 'Country of Origin',
        'Unit Price', 'Min Order Qty', 'Pack Size',
        'Bulk Discount Qty', 'Bulk Discount %',
        'Chifa Listed', 'Reimbursement Rate', 'Tarif Reference',
        'Requires Prescription', 'Controlled', 'Controlled Tableau',
        'Storage Conditions', 'In Stock', 'Stock Quantity',
        'Batch Number', 'Lot Number', 'Expiry Date',
        'Lead Time (Days)',
        'Warranty (Months)', 'Installation Included', 'Maintenance Available',
        'Active', 'Featured'
      ]

      const rows = products?.map(p => [
        p.sku || '',
        p.barcode || '',
        p.name || '',
        p.name_fr || '',
        p.name_ar || '',
        p.description || '',
        p.dci_code || '',
        p.generic_name || '',
        p.form || '',
        p.dosage || '',
        p.packaging || '',
        (p.category as any)?.name || '',
        p.manufacturer || '',
        p.country_of_origin || '',
        p.unit_price || 0,
        p.min_order_qty || 1,
        p.pack_size || 1,
        p.bulk_discount_qty || '',
        p.bulk_discount_percent || '',
        p.is_chifa_listed ? 'Yes' : 'No',
        p.reimbursement_rate || 0,
        p.tarif_reference || '',
        p.requires_prescription ? 'Yes' : 'No',
        p.is_controlled ? 'Yes' : 'No',
        p.controlled_tableau || '',
        p.storage_conditions || '',
        p.in_stock ? 'Yes' : 'No',
        p.stock_quantity || '',
        p.batch_number || '',
        p.lot_number || '',
        p.expiry_date || '',
        p.lead_time_days || 1,
        p.warranty_months || '',
        p.installation_included ? 'Yes' : 'No',
        p.maintenance_available ? 'Yes' : 'No',
        p.is_active ? 'Yes' : 'No',
        p.is_featured ? 'Yes' : 'No',
      ]) || []

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          const str = String(cell)
          // Escape commas and quotes
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }).join(','))
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="supplier-products-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    if (format === 'xlsx') {
      const headers = [
        'SKU', 'Barcode', 'Name', 'Name (FR)', 'Name (AR)', 'Description',
        'DCI Code', 'Generic Name', 'Form', 'Dosage', 'Packaging',
        'Category', 'Manufacturer', 'Country of Origin',
        'Unit Price', 'Min Order Qty', 'Pack Size',
        'Bulk Discount Qty', 'Bulk Discount %',
        'Chifa Listed', 'Reimbursement Rate', 'Tarif Reference',
        'Requires Prescription', 'Controlled', 'Controlled Tableau',
        'Storage Conditions', 'In Stock', 'Stock Quantity',
        'Batch Number', 'Lot Number', 'Expiry Date',
        'Lead Time (Days)',
        'Warranty (Months)', 'Installation Included', 'Maintenance Available',
        'Active', 'Featured',
      ]
      const rows = products?.map(p => [
        p.sku || '', p.barcode || '', p.name || '', p.name_fr || '', p.name_ar || '',
        p.description || '', p.dci_code || '', p.generic_name || '', p.form || '', p.dosage || '', p.packaging || '',
        (p.category as any)?.name || '', p.manufacturer || '', p.country_of_origin || '',
        p.unit_price || 0, p.min_order_qty || 1, p.pack_size || 1,
        p.bulk_discount_qty || '', p.bulk_discount_percent || '',
        p.is_chifa_listed ? 'Yes' : 'No', p.reimbursement_rate || 0, p.tarif_reference || '',
        p.requires_prescription ? 'Yes' : 'No', p.is_controlled ? 'Yes' : 'No', p.controlled_tableau || '',
        p.storage_conditions || '', p.in_stock ? 'Yes' : 'No', p.stock_quantity || '',
        p.batch_number || '', p.lot_number || '', p.expiry_date || '',
        p.lead_time_days || 1, p.warranty_months || '',
        p.installation_included ? 'Yes' : 'No', p.maintenance_available ? 'Yes' : 'No',
        p.is_active ? 'Yes' : 'No', p.is_featured ? 'Yes' : 'No',
      ]) || []
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Products')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="supplier-products-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      format: 'json',
      exported_at: new Date().toISOString(),
      total: products?.length || 0,
      products: products || [],
    })
  } catch (error: any) {
    console.error('Error exporting products:', error)
    return NextResponse.json({ error: error.message || 'Failed to export products' }, { status: 500 })
  }
}

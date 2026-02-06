import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/import-from-national
 * Search the national Algerian medications database (5,100+ medications)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const search = (searchParams.get('search') || '').trim()
    const category = searchParams.get('category') || ''
    const therapeuticClass = searchParams.get('therapeutic_class') || ''
    const cnasOnly = searchParams.get('cnas_only') === 'true'
    const marketedOnly = searchParams.get('marketed_only') !== 'false' // default true for import UI
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')

    const SEARCH_FIELDS = ['brand_name', 'dci', 'full_name', 'therapeutic_class', 'pharmacological_class', 'manufacturer', 'conditioning', 'indications']
    const buildOr = (term: string) => SEARCH_FIELDS.map((f) => `${f}.ilike.%${term.replace(/'/g, "''")}%`).join(',')

    // Build query on algerian_medications table - full national DB access
    let query = admin
      .from('algerian_medications')
      .select('*', { count: 'exact' })

    if (marketedOnly) {
      query = query.eq('is_marketed', true)
    }

    // Smart multi-word search: each word must match in any searchable field
    if (search) {
      const words = search.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 2 || (w.length === 1 && /[A-Za-z0-9]/.test(w)))
      for (const word of words) {
        query = query.or(buildOr(word))
      }
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category)
    }

    // Filter by therapeutic class
    if (therapeuticClass) {
      query = query.ilike('therapeutic_class', `%${therapeuticClass}%`)
    }

    // CNAS covered only
    if (cnasOnly) {
      query = query.eq('cnas_covered', true)
    }

    // Order: CNAS first, then alphabetically by brand_name
    query = query.order('cnas_covered', { ascending: false })
    query = query.order('brand_name', { ascending: true })

    // Pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data: medications, error, count } = await query

    if (error) {
      console.error('[Import National] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get distinct categories for filter dropdown
    const { data: categories } = await admin
      .from('algerian_medications')
      .select('category')
      .not('category', 'is', null)

    const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))]

    // Get distinct therapeutic classes
    const { data: classes } = await admin
      .from('algerian_medications')
      .select('therapeutic_class')
      .not('therapeutic_class', 'is', null)
      .limit(100)

    const uniqueClasses = [...new Set(classes?.map(c => c.therapeutic_class).filter(Boolean))]

    return NextResponse.json({
      data: medications,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      filters: {
        categories: uniqueCategories,
        therapeutic_classes: uniqueClasses.slice(0, 50)
      }
    })
  } catch (error: any) {
    console.error('[Import National] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/inventory/import-from-national
 * Import selected medications from national database into pharmacy inventory
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId
    const body = await request.json()
    
    const { medication_ids, default_margin = 20 } = body

    if (!medication_ids || !Array.isArray(medication_ids) || medication_ids.length === 0) {
      return NextResponse.json({ error: 'medication_ids array is required' }, { status: 400 })
    }

    // Fetch the selected medications from national database
    const { data: medications, error: fetchError } = await admin
      .from('algerian_medications')
      .select('*')
      .in('id', medication_ids)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!medications || medications.length === 0) {
      return NextResponse.json({ error: 'No medications found' }, { status: 404 })
    }

    // Map form names
    const formMapping: Record<string, string> = {
      'COMP': 'tablet',
      'COMP.': 'tablet',
      'COMP. PELLI': 'tablet',
      'COMP. SEC': 'tablet',
      'COMP. PELLI. LP': 'tablet',
      'COMP. EFFERV': 'tablet',
      'COMP. ORODISPERS': 'tablet',
      'GLES': 'capsule',
      'GLES.': 'capsule',
      'GÉLULE': 'capsule',
      'CAPS': 'capsule',
      'CAPS. MOLLE': 'capsule',
      'SIROP': 'syrup',
      'SOL. BUV': 'solution',
      'SOL. INJ': 'injection',
      'PDRE. SOL. INJ': 'injection',
      'SOL. PERF': 'injection',
      'CRÈME': 'cream',
      'CR\u00c3\u0088ME': 'cream',
      'PDE. DERM': 'ointment',
      'GEL': 'gel',
      'GEL. OPHT': 'gel',
      'COLLYRE': 'drops',
      'GOUTTES': 'drops',
      'AERO': 'inhaler',
      'SPRAY': 'spray',
      'SUPPO': 'suppository',
      'PDRE': 'powder',
      'AMP. BUV': 'solution',
    }

    // Check for existing products to avoid duplicates
    const brandNames = medications.map(m => m.brand_name)
    const { data: existingProducts } = await admin
      .from('pharmacy_products')
      .select('name, generic_name')
      .eq('pharmacy_id', pharmacyId)
      .in('name', brandNames)

    const existingNames = new Set(existingProducts?.map(p => p.name) || [])

    // Prepare products for insertion
    const productsToInsert = medications
      .filter(med => !existingNames.has(med.brand_name))
      .map(med => {
        const purchasePrice = med.public_price_dzd || med.reference_price_dzd || 0
        const sellingPrice = purchasePrice * (1 + default_margin / 100)
        
        // Map form
        let form = 'other'
        if (med.dosage_forms && med.dosage_forms.length > 0) {
          const medForm = med.dosage_forms[0].toUpperCase()
          form = formMapping[medForm] || 'other'
        }

        return {
          pharmacy_id: pharmacyId,
          name: med.brand_name,
          name_ar: null,
          generic_name: med.dci || null,
          dci_code: med.dci_code || null,
          category_id: null, // Will need to be set manually
          form: form,
          dosage: med.strengths?.join(', ') || null,
          packaging: med.conditioning || null,
          manufacturer: med.manufacturer || null,
          country_of_origin: med.country_origin || null,
          purchase_price: purchasePrice,
          selling_price: Math.round(sellingPrice * 100) / 100,
          margin_percent: default_margin,
          is_chifa_listed: med.cnas_covered || false,
          reimbursement_rate: med.cnas_covered ? 80 : 0, // Default 80% for CNAS
          tarif_reference: med.reference_price_dzd || null,
          requires_prescription: med.requires_prescription || false,
          is_controlled: med.prescription_list === 'Liste I',
          controlled_tableau: med.prescription_list === 'Liste I' ? 'A' : null,
          storage_conditions: 'room_temp',
          min_stock_level: 10,
          reorder_quantity: 20,
          tva_rate: 0, // Medications are typically exempt in Algeria
          source: 'national_db',
          national_db_id: med.id,
          pharmnet_link: med.pharmnet_link || null,
          created_by: auth.actorId,
          is_active: true
        }
      })

    if (productsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: medications.length,
        message: 'All selected medications already exist in your inventory'
      })
    }

    // Insert products
    const { data: insertedProducts, error: insertError } = await admin
      .from('pharmacy_products')
      .insert(productsToInsert)
      .select('id, name')

    if (insertError) {
      console.error('[Import National] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: insertedProducts?.length || 0,
      skipped: medications.length - (insertedProducts?.length || 0),
      products: insertedProducts,
      message: `Successfully imported ${insertedProducts?.length || 0} medications`
    })
  } catch (error: any) {
    console.error('[Import National] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

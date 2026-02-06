import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ChifaInvoice, ChifaInvoiceFormData, InsuranceType } from '@/lib/pharmacy/chifa-types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/chifa/invoices - List Chifa invoices
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    // Filters
    const status = searchParams.get('status')
    const insurance_type = searchParams.get('insurance_type')
    const bordereau_id = searchParams.get('bordereau_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('chifa_invoices')
      .select(`
        *,
        items:chifa_invoice_items(*)
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .order('invoice_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (insurance_type) {
      query = query.eq('insurance_type', insurance_type)
    }
    if (bordereau_id === 'null') {
      query = query.is('bordereau_id', null)
    } else if (bordereau_id) {
      query = query.eq('bordereau_id', bordereau_id)
    }
    if (start_date) {
      query = query.gte('invoice_date', start_date)
    }
    if (end_date) {
      query = query.lte('invoice_date', end_date)
    }
    if (search) {
      query = query.or(`insured_name.ilike.%${search}%,insured_number.ilike.%${search}%,invoice_number.ilike.%${search}%`)
    }

    const { data: invoices, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      invoices,
      total: count,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    })

  } catch (error: any) {
    console.error('Error fetching Chifa invoices:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pharmacy/chifa/invoices - Create Chifa invoice
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body: ChifaInvoiceFormData = await request.json()

    // Generate invoice number
    const { data: invoiceNumber } = await supabase
      .rpc('generate_chifa_invoice_number', { p_pharmacy_id: pharmacyId })

    // Calculate totals from items
    let total_tarif_reference = 0
    let total_chifa = 0
    let total_patient = 0
    let total_majoration = 0
    let grand_total = 0

    for (const item of body.items) {
      // Calculate Chifa split
      const { data: split } = await supabase.rpc('calculate_chifa_split', {
        p_unit_price: item.unit_price,
        p_tarif_reference: item.tarif_reference || item.unit_price,
        p_reimbursement_rate: item.reimbursement_rate,
        p_is_chronic: body.is_chronic,
        p_quantity: item.quantity,
        p_is_local_product: item.is_local_product
      })

      if (split && split.length > 0) {
        const calc = split[0]
        total_chifa += calc.chifa_amount
        total_patient += calc.patient_amount
        total_majoration += calc.majoration_amount
        grand_total += calc.line_total
      }
      
      if (item.tarif_reference) {
        total_tarif_reference += item.tarif_reference * item.quantity
      }
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('chifa_invoices')
      .insert({
        pharmacy_id: pharmacyId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        sale_id: body.sale_id,
        insured_number: body.insured_number,
        insured_name: body.insured_name,
        insured_rank: body.insured_rank,
        beneficiary_name: body.beneficiary_name,
        beneficiary_relationship: body.beneficiary_relationship,
        insurance_type: body.insurance_type,
        is_chronic: body.is_chronic,
        chronic_code: body.chronic_code,
        prescriber_name: body.prescriber_name,
        prescriber_specialty: body.prescriber_specialty,
        prescription_date: body.prescription_date,
        prescription_number: body.prescription_number,
        treatment_duration: body.treatment_duration,
        total_tarif_reference,
        total_chifa,
        total_patient,
        total_majoration,
        grand_total,
        status: 'pending',
        created_by: auth.actorId
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Create invoice items
    const itemsToInsert = []
    for (const item of body.items) {
      // Recalculate for each item
      const { data: split } = await supabase.rpc('calculate_chifa_split', {
        p_unit_price: item.unit_price,
        p_tarif_reference: item.tarif_reference || item.unit_price,
        p_reimbursement_rate: item.reimbursement_rate,
        p_is_chronic: body.is_chronic,
        p_quantity: item.quantity,
        p_is_local_product: item.is_local_product
      })

      const calc = split && split.length > 0 ? split[0] : {
        chifa_amount: 0,
        patient_amount: item.unit_price * item.quantity,
        majoration_amount: 0,
        line_total: item.unit_price * item.quantity
      }

      itemsToInsert.push({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_barcode: item.product_barcode,
        cnas_code: item.cnas_code,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tarif_reference: item.tarif_reference,
        purchase_price: item.purchase_price,
        reimbursement_rate: item.reimbursement_rate,
        chifa_amount: calc.chifa_amount,
        patient_amount: calc.patient_amount,
        is_local_product: item.is_local_product,
        majoration_amount: calc.majoration_amount,
        line_total: calc.line_total
      })
    }

    const { error: itemsError } = await supabase
      .from('chifa_invoice_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // Fetch complete invoice with items
    const { data: completeInvoice, error: fetchError } = await supabase
      .from('chifa_invoices')
      .select(`
        *,
        items:chifa_invoice_items(*)
      `)
      .eq('id', invoice.id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json(completeInvoice, { status: 201 })

  } catch (error: any) {
    console.error('Error creating Chifa invoice:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

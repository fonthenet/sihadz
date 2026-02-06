import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BordereauFormData, InsuranceType } from '@/lib/pharmacy/chifa-types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/chifa/bordereaux - List bordereaux
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const insurance_type = searchParams.get('insurance_type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('chifa_bordereaux')
      .select('*', { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (insurance_type) {
      query = query.eq('insurance_type', insurance_type)
    }

    const { data: bordereaux, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      bordereaux,
      total: count,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    })

  } catch (error: any) {
    console.error('Error fetching bordereaux:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pharmacy/chifa/bordereaux - Create new bordereau
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body: BordereauFormData = await request.json()

    // Validate: max 20 invoices per bordereau
    if (body.invoice_ids.length > 20) {
      return NextResponse.json({ 
        error: 'Maximum 20 invoices per bordereau allowed' 
      }, { status: 400 })
    }

    // Generate bordereau number
    const { data: bordereauNumber } = await supabase
      .rpc('generate_bordereau_number', { 
        p_pharmacy_id: pharmacyId,
        p_insurance_type: body.insurance_type
      })

    // Calculate totals from invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('chifa_invoices')
      .select('*')
      .in('id', body.invoice_ids)
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'pending')
      .is('bordereau_id', null)

    if (invoicesError) throw invoicesError

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ 
        error: 'No valid pending invoices found' 
      }, { status: 400 })
    }

    // Calculate totals
    const totals = invoices.reduce((acc, inv) => ({
      total_tarif_reference: acc.total_tarif_reference + (inv.total_tarif_reference || 0),
      total_chifa_amount: acc.total_chifa_amount + (inv.total_chifa || 0),
      total_patient_amount: acc.total_patient_amount + (inv.total_patient || 0),
      total_majoration: acc.total_majoration + (inv.total_majoration || 0)
    }), {
      total_tarif_reference: 0,
      total_chifa_amount: 0,
      total_patient_amount: 0,
      total_majoration: 0
    })

    // Create bordereau
    const { data: bordereau, error: createError } = await supabase
      .from('chifa_bordereaux')
      .insert({
        pharmacy_id: pharmacyId,
        bordereau_number: bordereauNumber,
        insurance_type: body.insurance_type,
        period_start: body.period_start,
        period_end: body.period_end,
        invoice_count: invoices.length,
        ...totals,
        status: 'draft',
        notes: body.notes,
        created_by: auth.actorId
      })
      .select()
      .single()

    if (createError) throw createError

    // Update invoices to link to bordereau
    const { error: updateError } = await supabase
      .from('chifa_invoices')
      .update({
        bordereau_id: bordereau.id,
        status: 'in_bordereau',
        updated_at: new Date().toISOString()
      })
      .in('id', body.invoice_ids)

    if (updateError) throw updateError

    return NextResponse.json(bordereau, { status: 201 })

  } catch (error: any) {
    console.error('Error creating bordereau:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/pharmacy/chifa/bordereaux - Update bordereau (finalize, submit, record payment)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body = await request.json()
    const { id, action, ...data } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    // Get current bordereau
    const { data: bordereau, error: fetchError } = await supabase
      .from('chifa_bordereaux')
      .select('*')
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (fetchError) throw fetchError
    if (!bordereau) {
      return NextResponse.json({ error: 'Bordereau not found' }, { status: 404 })
    }

    let updateData: any = { updated_at: new Date().toISOString() }

    switch (action) {
      case 'finalize':
        if (bordereau.status !== 'draft') {
          return NextResponse.json({ error: 'Can only finalize draft bordereaux' }, { status: 400 })
        }
        updateData.status = 'finalized'
        updateData.finalized_at = new Date().toISOString()
        break

      case 'submit':
        if (bordereau.status !== 'finalized') {
          return NextResponse.json({ error: 'Can only submit finalized bordereaux' }, { status: 400 })
        }
        updateData.status = 'submitted'
        updateData.submitted_at = new Date().toISOString()
        updateData.submitted_by = auth.actorId
        updateData.submitted_by_name = data.submitted_by_name
        updateData.submission_notes = data.submission_notes
        updateData.cnas_submission_date = data.submission_date || new Date().toISOString().split('T')[0]
        
        // Add to status history
        const currentHistory = bordereau.status_history || []
        updateData.status_history = [
          ...currentHistory,
          {
            status: 'submitted',
            changed_at: new Date().toISOString(),
            changed_by: auth.actorId,
            changed_by_name: data.submitted_by_name,
            notes: data.submission_notes
          }
        ]

        // Update all invoices to submitted
        await supabase
          .from('chifa_invoices')
          .update({ status: 'submitted', updated_at: new Date().toISOString() })
          .eq('bordereau_id', id)
        break
      
      case 'mark_processing':
        // Mark as being processed by CNAS
        if (bordereau.status !== 'submitted') {
          return NextResponse.json({ error: 'Can only mark submitted bordereaux as processing' }, { status: 400 })
        }
        updateData.status = 'processing'
        updateData.cnas_reference = data.cnas_reference
        updateData.cnas_processing_date = data.processing_date || new Date().toISOString().split('T')[0]
        updateData.expected_payment_date = data.expected_payment_date
        
        // Add to status history
        const processingHistory = bordereau.status_history || []
        updateData.status_history = [
          ...processingHistory,
          {
            status: 'processing',
            changed_at: new Date().toISOString(),
            changed_by: auth.actorId,
            notes: `CNAS Reference: ${data.cnas_reference || 'N/A'}`
          }
        ]
        break

      case 'record_payment':
        if (!['submitted', 'processing'].includes(bordereau.status)) {
          return NextResponse.json({ error: 'Invalid status for payment' }, { status: 400 })
        }
        
        const amountPaid = parseFloat(data.amount_paid)
        const expectedAmount = bordereau.total_chifa_amount + bordereau.total_majoration

        updateData.amount_paid = amountPaid
        updateData.payment_date = data.payment_date
        updateData.payment_reference = data.payment_reference
        updateData.response_date = data.payment_date
        
        // Add to status history
        const paymentHistory = bordereau.status_history || []

        // Determine status based on payment
        if (amountPaid >= expectedAmount * 0.99) { // Allow 1% tolerance
          updateData.status = 'paid'
          updateData.status_history = [
            ...paymentHistory,
            {
              status: 'paid',
              changed_at: new Date().toISOString(),
              changed_by: auth.actorId,
              notes: `Paid ${amountPaid.toFixed(2)} DZD - Ref: ${data.payment_reference || 'N/A'}`
            }
          ]
          // Update all invoices to paid
          await supabase
            .from('chifa_invoices')
            .update({ 
              status: 'paid', 
              paid_amount: null, // Will be distributed proportionally
              paid_date: data.payment_date,
              updated_at: new Date().toISOString() 
            })
            .eq('bordereau_id', id)
        } else {
          updateData.status = 'partial'
          updateData.rejection_total = expectedAmount - amountPaid
          updateData.status_history = [
            ...paymentHistory,
            {
              status: 'partial',
              changed_at: new Date().toISOString(),
              changed_by: auth.actorId,
              notes: `Partial payment ${amountPaid.toFixed(2)} DZD of ${expectedAmount.toFixed(2)} DZD expected`
            }
          ]
        }
        break

      case 'add_invoices':
        if (bordereau.status !== 'draft') {
          return NextResponse.json({ error: 'Can only add to draft bordereaux' }, { status: 400 })
        }
        
        // Add more invoices
        const newInvoiceIds = data.invoice_ids || []
        const currentCount = bordereau.invoice_count || 0
        
        if (currentCount + newInvoiceIds.length > 20) {
          return NextResponse.json({ error: 'Would exceed 20 invoice limit' }, { status: 400 })
        }

        // Link new invoices
        await supabase
          .from('chifa_invoices')
          .update({
            bordereau_id: id,
            status: 'in_bordereau',
            updated_at: new Date().toISOString()
          })
          .in('id', newInvoiceIds)
          .eq('pharmacy_id', pharmacyId)

        // Recalculate totals
        await supabase.rpc('update_bordereau_totals', { p_bordereau_id: id })
        break

      case 'remove_invoice':
        if (bordereau.status !== 'draft') {
          return NextResponse.json({ error: 'Can only remove from draft bordereaux' }, { status: 400 })
        }
        
        // Unlink invoice
        await supabase
          .from('chifa_invoices')
          .update({
            bordereau_id: null,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', data.invoice_id)
          .eq('pharmacy_id', pharmacyId)

        // Recalculate totals
        await supabase.rpc('update_bordereau_totals', { p_bordereau_id: id })
        break

      case 'cancel':
        if (!['draft', 'finalized'].includes(bordereau.status)) {
          return NextResponse.json({ error: 'Cannot cancel this bordereau' }, { status: 400 })
        }
        
        // Unlink all invoices
        await supabase
          .from('chifa_invoices')
          .update({
            bordereau_id: null,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('bordereau_id', id)

        // Delete bordereau
        await supabase
          .from('chifa_bordereaux')
          .delete()
          .eq('id', id)

        return NextResponse.json({ success: true, deleted: true })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Update bordereau
    const { data: updated, error: updateError } = await supabase
      .from('chifa_bordereaux')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)

  } catch (error: any) {
    console.error('Error updating bordereau:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { RejectionResolutionData, RejectionStatus } from '@/lib/pharmacy/chifa-types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/chifa/rejections - List rejections
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Use RPC to bypass PostgREST embed ambiguity (chifa_rejections has 2 FKs to chifa_bordereaux).
    // Run scripts/077-chifa-rejections-fetch.sql if RPC is missing.
    const { data: rpcData, error: rpcError } = await supabase.rpc('chifa_fetch_rejections', {
      p_pharmacy_id: pharmacyId,
      p_status: status || null,
      p_limit: limit,
      p_offset: offset
    })

    if (!rpcError) {
      return NextResponse.json(rpcData)
    }

    // Fallback: two queries (no embeds) when RPC not yet deployed
    if (rpcError.code !== '42883') { // 42883 = function does not exist
      throw rpcError
    }

    let rejectionsQuery = supabase
      .from('chifa_rejections')
      .select('id, pharmacy_id, invoice_id, bordereau_id, rejection_date, rejection_code, rejection_motif, rejected_amount, status, corrected_invoice_id, resolution_notes, resolved_at, resolved_by, new_bordereau_id, created_at, updated_at', { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      rejectionsQuery = rejectionsQuery.eq('status', status)
    }

    const { data: rejections, error: rejError, count } = await rejectionsQuery
    if (rejError) throw rejError

    const invoiceIds = [...new Set((rejections || []).map((r: { invoice_id: string }) => r.invoice_id).filter(Boolean))]
    let invoicesMap: Record<string, { id: string; invoice_number: string; insured_name: string; insured_number?: string; insurance_type?: string; total_chifa?: number; grand_total?: number }> = {}

    if (invoiceIds.length > 0) {
      const { data: invoices } = await supabase
        .from('chifa_invoices')
        .select('id, invoice_number, insured_name, insured_number, insurance_type, total_chifa, grand_total')
        .in('id', invoiceIds)
      invoicesMap = (invoices || []).reduce((acc, inv) => ({ ...acc, [inv.id]: inv }), {})
    }

    const rejectionsWithInvoice = (rejections || []).map((r: { invoice_id: string; [k: string]: unknown }) => ({
      ...r,
      invoice: invoicesMap[r.invoice_id] ?? null
    }))

    return NextResponse.json({
      rejections: rejectionsWithInvoice,
      total: count,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    })

  } catch (error: any) {
    console.error('Error fetching rejections:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pharmacy/chifa/rejections - Create rejection (usually from bordereau payment)
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body = await request.json()

    const { data: rejection, error } = await supabase
      .from('chifa_rejections')
      .insert({
        pharmacy_id: pharmacyId,
        invoice_id: body.invoice_id,
        bordereau_id: body.bordereau_id,
        rejection_date: body.rejection_date || new Date().toISOString().split('T')[0],
        rejection_code: body.rejection_code,
        rejection_motif: body.rejection_motif,
        rejected_amount: body.rejected_amount,
        status: 'pending'
      })
      .select(`
        *,
        invoice:chifa_invoices!invoice_id(id, invoice_number, insured_name)
      `)
      .single()

    if (error) throw error

    // Update invoice status to rejected
    await supabase
      .from('chifa_invoices')
      .update({
        status: 'rejected',
        rejection_code: body.rejection_code,
        rejection_reason: body.rejection_motif,
        rejection_date: body.rejection_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', body.invoice_id)

    return NextResponse.json(rejection, { status: 201 })

  } catch (error: any) {
    console.error('Error creating rejection:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/pharmacy/chifa/rejections - Resolve rejection
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body = await request.json()
    const { id, ...resolution }: { id: string } & RejectionResolutionData = body

    if (!id) {
      return NextResponse.json({ error: 'Missing rejection id' }, { status: 400 })
    }

    // Get current rejection
    const { data: currentRejection, error: fetchError } = await supabase
      .from('chifa_rejections')
      .select('*, invoice:chifa_invoices!invoice_id(*)')
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (fetchError) throw fetchError
    if (!currentRejection) {
      return NextResponse.json({ error: 'Rejection not found' }, { status: 404 })
    }

    const updateData: any = {
      status: resolution.status,
      resolution_notes: resolution.resolution_notes,
      updated_at: new Date().toISOString()
    }

    if (resolution.status === 'corrected' || resolution.status === 'resubmitted') {
      updateData.corrected_invoice_id = resolution.corrected_invoice_id
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = auth.actorId
    } else if (resolution.status === 'written_off') {
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = auth.actorId
      
      // TODO: Create accounting entry for write-off
      // This would create a journal entry debiting 654 (Créances irrécouvrables)
      // and crediting 4113/4114 (Clients CNAS/CASNOS)
    }

    const { data: updated, error: updateError } = await supabase
      .from('chifa_rejections')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        invoice:chifa_invoices!invoice_id(id, invoice_number, insured_name)
      `)
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)

  } catch (error: any) {
    console.error('Error resolving rejection:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

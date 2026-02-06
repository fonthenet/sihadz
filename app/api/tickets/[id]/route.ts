import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()

  try {
    const { id: ticketId } = await params
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ticket, error } = await supabase
      .from('healthcare_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Auth: patient, or primary/secondary provider (via professionals)
    const isPatient = ticket.patient_id === user.id
    let isProvider = false
    if (!isPatient) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (prof) {
        isProvider =
          ticket.primary_provider_id === prof.id || ticket.secondary_provider_id === prof.id
      }
    }
    if (!isPatient && !isProvider) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Timeline
    const { data: timeline } = await supabase
      .from('ticket_timeline')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    // Legacy ticket_messages (only for non-thread tickets; patient does not join thread)
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    // Prescription for this ticket (patient sees under Prescription tab; no thread access)
    let prescription: any = null
    let pharmacyName: string | null = null
    if (ticket.prescription_id) {
      const { data: rx } = await supabase
        .from('prescriptions')
        .select('id, diagnosis, notes, medications, status, created_at')
        .eq('id', ticket.prescription_id)
        .maybeSingle()
      prescription = rx || null
      if (ticket.secondary_provider_id) {
        const { data: ph } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', ticket.secondary_provider_id)
          .maybeSingle()
        pharmacyName = ph?.business_name || ticket.metadata?.pharmacy_name || null
      } else {
        pharmacyName = ticket.metadata?.pharmacy_name || null
      }
    }

    // Lab request for this ticket (patient sees under Lab Request tab)
    let labRequest: any = null
    let laboratoryName: string | null = null
    if (ticket.lab_request_id) {
      const { data: lr } = await supabase
        .from('lab_test_requests')
        .select(`
          id, diagnosis, clinical_notes, priority, status, created_at, lab_fulfillment,
          items:lab_test_items(
            id, result_value, result_unit, reference_range, result_status, lab_notes,
            test_type:lab_test_types(name, name_ar, category)
          )
        `)
        .eq('id', ticket.lab_request_id)
        .maybeSingle()
      labRequest = lr || null
      if (ticket.secondary_provider_id && ticket.ticket_type === 'lab_request') {
        const { data: lab } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', ticket.secondary_provider_id)
          .maybeSingle()
        laboratoryName = lab?.business_name || ticket.metadata?.laboratory_name || null
      } else {
        laboratoryName = ticket.metadata?.laboratory_name || null
      }
    }

    return NextResponse.json({
      ticket,
      timeline: timeline || [],
      messages: messages || [],
      prescription,
      pharmacyName,
      labRequest,
      laboratoryName,
    })
  } catch (error: any) {
    console.error('[v0] Error fetching ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient()
  const { id: ticketId } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, metadata, payment_status, payment_method, payment_amount } = body

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status) updateData.status = status
    if (metadata) updateData.metadata = metadata
    if (payment_status) updateData.payment_status = payment_status
    if (payment_method) updateData.payment_method = payment_method
    if (payment_amount) updateData.payment_amount = payment_amount

    const { data: ticket, error } = await supabase
      .from('healthcare_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (error) throw error

    // Create timeline entry for status change
    if (status) {
      await supabase
        .from('ticket_timeline')
        .insert({
          ticket_id: ticketId,
          event_type: 'status_changed',
          actor_id: user.id,
          description: `Status updated to: ${status}`,
          metadata: { old_status: ticket.status, new_status: status }
        })
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('[v0] Error updating ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

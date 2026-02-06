import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Create or get a lab request ticket (ticket-centric workflow).
 * Called when doctor selects a laboratory: creates healthcare_ticket first, then thread is linked via ticket_id.
 * Body: { appointmentId, doctorId, laboratoryId, patientId }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, doctorId, laboratoryId, patientId } = body as {
      appointmentId: string
      doctorId: string
      laboratoryId: string
      patientId?: string
    }

    if (!appointmentId || !doctorId || !laboratoryId) {
      return NextResponse.json(
        { error: 'appointmentId, doctorId, and laboratoryId are required' },
        { status: 400 }
      )
    }

    // Resolve patient_id from appointment if not provided (required for healthcare_tickets)
    let resolvedPatientId = patientId
    if (!resolvedPatientId) {
      const { data: apt } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('id', appointmentId)
        .maybeSingle()
      resolvedPatientId = apt?.patient_id ?? undefined
    }
    if (!resolvedPatientId) {
      return NextResponse.json(
        { error: 'Could not resolve patient for this appointment' },
        { status: 400 }
      )
    }

    // Dedupe: find existing lab request ticket for this appointment + laboratory
    const { data: existing } = await supabase
      .from('healthcare_tickets')
      .select('id, ticket_number, status')
      .eq('ticket_type', 'lab_request')
      .eq('appointment_id', appointmentId)
      .eq('secondary_provider_id', laboratoryId)
      .not('status', 'in', '("cancelled","completed","expired")')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ticket: existing, created: false })
    }

    // Generate ticket number
    const ticketNumber =
      'TKT-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 7).toUpperCase()

    // Insert using 003 schema (ticket_type, primary_provider_id, secondary_provider_id)
    const { data: ticket, error: insertError } = await supabase
      .from('healthcare_tickets')
      .insert({
        ticket_number: ticketNumber,
        ticket_type: 'lab_request',
        status: 'created',
        patient_id: resolvedPatientId,
        primary_provider_id: doctorId,
        secondary_provider_id: laboratoryId,
        appointment_id: appointmentId,
        priority: 'normal',
        metadata: { created_via: 'lab_request_workflow' },
      })
      .select('id, ticket_number, status, appointment_id')
      .single()

    if (insertError || !ticket) {
      console.error('[tickets/lab-request] Insert error:', insertError)
      return NextResponse.json({ error: insertError?.message || 'Failed to create ticket' }, { status: 500 })
    }

    return NextResponse.json({ ticket, created: true })
  } catch (e: any) {
    console.error('[tickets/lab-request] Error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

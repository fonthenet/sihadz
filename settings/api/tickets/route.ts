import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const role = searchParams.get('role')

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('healthcare_tickets')
      .select(`
        *,
        patient:profiles!healthcare_tickets_patient_id_fkey(id, full_name, email),
        doctor:profiles!healthcare_tickets_doctor_id_fkey(id, full_name, email),
        pharmacy:profiles!healthcare_tickets_pharmacy_id_fkey(id, full_name, email),
        lab:profiles!healthcare_tickets_lab_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by type
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    // Filter by user role
    if (role === 'patient') {
      query = query.eq('patient_id', user.id)
    } else if (role === 'doctor') {
      query = query.eq('doctor_id', user.id)
    } else if (role === 'pharmacy') {
      query = query.eq('pharmacy_id', user.id)
    } else if (role === 'lab') {
      query = query.eq('lab_id', user.id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ tickets: data })
  } catch (error: any) {
    console.error('[v0] Error fetching tickets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type,
      patient_id,
      doctor_id,
      pharmacy_id,
      lab_id,
      metadata,
      priority,
      appointment_id,
      prescription_id,
      lab_request_id
    } = body

    // DEDUPLICATION CHECK: Prevent duplicate tickets
    // Check for existing active ticket with same type and related entity
    let dedupeQuery = supabase
      .from('healthcare_tickets')
      .select('id, ticket_number, status')
      .eq('ticket_type', type)
      .not('status', 'in', '(cancelled,completed,expired)')

    if (appointment_id) {
      dedupeQuery = dedupeQuery.eq('appointment_id', appointment_id)
    } else if (prescription_id) {
      dedupeQuery = dedupeQuery.eq('prescription_id', prescription_id)
    } else if (lab_request_id) {
      dedupeQuery = dedupeQuery.eq('lab_request_id', lab_request_id)
    } else if (patient_id && doctor_id) {
      // For generic tickets, check patient + doctor + type within last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      dedupeQuery = dedupeQuery
        .eq('patient_id', patient_id)
        .eq('primary_provider_id', doctor_id)
        .gte('created_at', fiveMinutesAgo)
    }

    const { data: existingTicket } = await dedupeQuery.maybeSingle()

    if (existingTicket) {
      console.log('[v0] Duplicate ticket detected:', existingTicket.ticket_number)
      return NextResponse.json({ 
        success: false, 
        error: 'A ticket already exists for this request',
        existing_ticket: existingTicket
      }, { status: 409 })
    }

    // Generate ticket number
    const ticketNumber = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Generate verification code
    const verificationCode = Math.random().toString(36).substr(2, 8).toUpperCase()

    // Determine initial status based on type
    let initialStatus = 'pending'
    if (type === 'appointment') initialStatus = 'scheduled'
    if (type === 'prescription') initialStatus = 'pending'
    if (type === 'lab_request') initialStatus = 'pending'

    const { data: ticket, error } = await supabase
      .from('healthcare_tickets')
      .insert({
        ticket_number: ticketNumber,
        type,
        status: initialStatus,
        patient_id,
        doctor_id,
        pharmacy_id,
        lab_id,
        metadata,
        priority: priority || 'normal',
        verification_code: verificationCode
      })
      .select()
      .single()

    if (error) throw error

    // Create initial timeline entry
    await supabase
      .from('ticket_timeline')
      .insert({
        ticket_id: ticket.id,
        event_type: 'created',
        actor_id: user.id,
        description: `Ticket created: ${type.replace('_', ' ')}`,
        metadata: { initial_status: initialStatus }
      })

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('[v0] Error creating ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

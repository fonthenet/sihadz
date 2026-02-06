import { createBrowserClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      patient_name,
      patient_email,
      patient_phone,
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      notes,
      payment_method,
      payment_amount,
      visit_type,
      create_ticket
    } = body

    const supabase = createBrowserClient()

    // DEDUPLICATION CHECK: Prevent duplicate appointments
    // Check for existing appointment with same doctor, date, time, and patient
    const { data: existingAppt } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .or(patient_id 
        ? `patient_id.eq.${patient_id}` 
        : `guest_email.eq.${patient_email},guest_phone.eq.${patient_phone}`)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existingAppt) {
      console.log('[v0] Duplicate appointment detected:', existingAppt.id)
      return NextResponse.json({ 
        success: false, 
        error: 'An appointment already exists for this time slot',
        existing_appointment_id: existingAppt.id
      }, { status: 409 })
    }

    // 1. Create the appointment record
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient_id || null,
        doctor_id: doctor_id || null,
        appointment_date,
        appointment_time,
        notes,
        payment_method,
        payment_amount: parseFloat(payment_amount),
        payment_status: payment_method === 'cash' ? 'pending' : 'unpaid',
        status: 'pending',
        visit_type: visit_type || 'in-person',
        // For guest bookings
        guest_name: !patient_id ? patient_name : null,
        guest_email: !patient_id ? patient_email : null,
        guest_phone: !patient_id ? patient_phone : null,
        is_guest_booking: !patient_id
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('[v0] Error creating appointment:', appointmentError)
      return NextResponse.json({ success: false, error: appointmentError.message }, { status: 400 })
    }

    let ticketNumber = null

    // 2. Create a ticket if requested
    if (create_ticket) {
      const ticketDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      ticketNumber = `TKT-${ticketDate}-${randomNum}`

      const { data: ticket, error: ticketError } = await supabase
        .from('healthcare_tickets')
        .insert({
          ticket_number: ticketNumber,
          ticket_type: 'appointment',
          status: 'confirmed',
          patient_id: patient_id || null,
          patient_name,
          patient_phone,
          primary_provider_id: doctor_id || null,
          primary_provider_type: 'doctor',
          appointment_id: appointment.id,
          payment_method,
          payment_amount: parseFloat(payment_amount),
          payment_status: payment_method === 'cash' ? 'pending' : 'unpaid',
          metadata: {
            patient_email,
            appointment_date,
            appointment_time,
            notes,
            visit_type
          }
        })
        .select()
        .single()

      if (ticketError) {
        console.error('[v0] Error creating ticket:', ticketError)
      } else {
        console.log('[v0] Created ticket:', ticket.ticket_number)
        
        // Create timeline entry
        await supabase.from('ticket_timeline').insert({
          ticket_id: ticket.id,
          action: 'created',
          action_description: 'Appointment ticket created',
          action_description_ar: 'تم إنشاء تذكرة الموعد',
          actor_id: patient_id,
          actor_type: 'patient',
          actor_name: patient_name
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      appointment, 
      ticket_number: ticketNumber 
    })

  } catch (error: any) {
    console.error('[v0] Appointment creation error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

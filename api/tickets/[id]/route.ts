import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ticket, error } = await supabase
      .from('healthcare_tickets')
      .select(`
        *,
        patient:profiles!healthcare_tickets_patient_id_fkey(id, full_name, email, phone),
        doctor:profiles!healthcare_tickets_doctor_id_fkey(id, full_name, email, phone),
        pharmacy:profiles!healthcare_tickets_pharmacy_id_fkey(id, full_name, email, phone),
        lab:profiles!healthcare_tickets_lab_id_fkey(id, full_name, email, phone)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error

    // Fetch timeline
    const { data: timeline } = await supabase
      .from('ticket_timeline')
      .select(`
        *,
        actor:profiles(id, full_name)
      `)
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: false })

    // Fetch messages
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles(id, full_name, user_type)
      `)
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ 
      ticket, 
      timeline: timeline || [],
      messages: messages || []
    })
  } catch (error: any) {
    console.error('[v0] Error fetching ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerClient()

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
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Create timeline entry for status change
    if (status) {
      await supabase
        .from('ticket_timeline')
        .insert({
          ticket_id: params.id,
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

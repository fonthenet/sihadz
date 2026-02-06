import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Send a draft prescription to a pharmacy.
 * Body: { pharmacyId }
 * Updates prescription status to 'sent', creates/updates ticket and thread, sends notifications.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: prescriptionId } = await params
    if (!prescriptionId) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { pharmacyId, ticketId, threadId } = body

    if (!pharmacyId) {
      return NextResponse.json({ error: 'pharmacyId is required' }, { status: 400 })
    }

    // Get prescription
    const { data: prescription, error: prescError } = await supabase
      .from('prescriptions')
      .select('*, doctor:professionals!doctor_id(id, business_name, auth_user_id), patient:profiles!patient_id(id)')
      .eq('id', prescriptionId)
      .single()

    if (prescError || !prescription) {
      console.error('[prescriptions/send] Prescription fetch failed:', prescError?.message ?? prescError?.code ?? prescError, 'id:', prescriptionId)
      return NextResponse.json(
        { error: prescError?.message || 'Prescription not found' },
        { status: 404 }
      )
    }

    // Verify user is the doctor or the patient
    const isDoctor = prescription.doctor?.auth_user_id === user.id
    const isPatient = prescription.patient?.id === user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get pharmacy info
    const { data: pharmacy } = await supabase
      .from('professionals')
      .select('id, business_name, auth_user_id')
      .eq('id', pharmacyId)
      .eq('type', 'pharmacy')
      .single()

    if (!pharmacy) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    // Update prescription: set pharmacy_id and status to 'sent'
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({
        pharmacy_id: pharmacyId,
        status: 'sent',
        sent_to_pharmacy_at: new Date().toISOString(),
      })
      .eq('id', prescriptionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update or create ticket
    let finalTicketId = ticketId
    if (ticketId) {
      const { data: existingTicket } = await supabase
        .from('healthcare_tickets')
        .select('metadata')
        .eq('id', ticketId)
        .single()
      const mergedMeta = { ...(existingTicket?.metadata || {}), pharmacy_name: pharmacy.business_name }
      await supabase
        .from('healthcare_tickets')
        .update({
          prescription_id: prescriptionId,
          status: 'prescription_sent',
          secondary_provider_id: pharmacyId,
          updated_at: new Date().toISOString(),
          metadata: mergedMeta,
        })
        .eq('id', ticketId)
    } else {
      // Create ticket if not exists
      const ticketNumber = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      const { data: newTicket } = await supabase
        .from('healthcare_tickets')
        .insert({
          ticket_number: ticketNumber,
          ticket_type: 'prescription',
          status: 'prescription_sent',
          patient_id: prescription.patient_id,
          primary_provider_id: prescription.doctor_id,
          secondary_provider_id: pharmacyId,
          appointment_id: prescription.appointment_id,
          prescription_id: prescriptionId,
          metadata: { pharmacy_name: pharmacy.business_name },
        })
        .select('id')
        .single()
      if (newTicket) finalTicketId = newTicket.id
    }

    // Update thread if provided, or find/create one
    let finalThreadId = threadId
    if (threadId) {
      await supabase
        .from('chat_threads')
        .update({
          metadata: { prescription_id: prescriptionId, target_id: pharmacyId, target_type: 'pharmacy' },
          order_type: 'prescription',
        })
        .eq('id', threadId)
    } else if (prescription.appointment_id && prescription.doctor_id) {
      // Try to find existing thread or create one (with pharmacy as member so they receive it)
      const { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('order_id', prescription.appointment_id)
        .eq('order_type', 'prescription')
        .eq('metadata->>target_id', pharmacyId)
        .maybeSingle()
      if (existingThread) {
        finalThreadId = existingThread.id
        await supabase
          .from('chat_threads')
          .update({ metadata: { prescription_id: prescriptionId, target_id: pharmacyId } })
          .eq('id', finalThreadId)
      } else if (prescription.doctor?.auth_user_id && pharmacy.auth_user_id) {
        // Create thread and add doctor + pharmacy as members so pharmacy can see and chat
        const admin = createAdminClient()
        const threadTitle = `Prescription - ${pharmacy.business_name || 'Pharmacy'}`
        const { data: newThread, error: threadErr } = await admin
          .from('chat_threads')
          .insert({
            thread_type: 'group',
            title: threadTitle,
            order_type: 'prescription',
            order_id: prescription.appointment_id,
            created_by: prescription.doctor.auth_user_id,
            metadata: {
              appointment_id: prescription.appointment_id,
              doctor_id: prescription.doctor_id,
              target_id: pharmacyId,
              target_type: 'pharmacy',
              prescription_id: prescriptionId,
            },
          })
          .select('id')
          .single()
        if (!threadErr && newThread) {
          finalThreadId = newThread.id
          await admin.from('chat_thread_members').insert([
            { thread_id: newThread.id, user_id: prescription.doctor.auth_user_id, role: 'admin' },
            { thread_id: newThread.id, user_id: pharmacy.auth_user_id, role: 'member' },
          ])
        }
      }
    }

    // Send notifications
    if (pharmacy.auth_user_id) {
      await supabase.from('notifications').insert({
        user_id: pharmacy.auth_user_id,
        type: 'prescription',
        title: 'New Prescription Received',
        title_ar: 'تم استلام وصفة طبية جديدة',
        message: `Dr. ${prescription.doctor?.business_name} has sent a prescription`,
        message_ar: `أرسل الدكتور ${prescription.doctor?.business_name} وصفة طبية`,
        metadata: { prescription_id: prescriptionId, doctor_name: prescription.doctor?.business_name },
        action_url: '/professional/dashboard',
      })
    }

    await supabase.from('notifications').insert({
      user_id: prescription.patient_id,
      type: 'prescription',
      title: 'Prescription Sent to Pharmacy',
      title_ar: 'تم إرسال الوصفة إلى الصيدلية',
      message: `Your prescription has been sent to ${pharmacy.business_name}`,
      message_ar: `تم إرسال وصفتك إلى ${pharmacy.business_name}`,
      metadata: { prescription_id: prescriptionId, pharmacy_name: pharmacy.business_name },
    })

    // Send system message to thread if exists
    if (finalThreadId) {
      await supabase.from('chat_messages').insert({
        thread_id: finalThreadId,
        sender_id: user.id,
        message_type: 'system',
        content: `Prescription sent to ${pharmacy.business_name}`,
      })
    }

    return NextResponse.json({
      success: true,
      prescription: { ...prescription, pharmacy_id: pharmacyId, status: 'sent' },
      ticketId: finalTicketId,
      threadId: finalThreadId,
      message: 'Prescription sent to pharmacy successfully',
    })
  } catch (error: any) {
    console.error('[prescriptions/[id]/send] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * Send a draft lab request to a laboratory.
 * Body: { laboratoryId }
 * Updates lab request status to 'sent_to_lab', creates/updates ticket and thread, sends notifications.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labRequestId } = await params
    if (!labRequestId) {
      return NextResponse.json({ error: 'Lab request ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { laboratoryId, ticketId, threadId } = body

    if (!laboratoryId) {
      return NextResponse.json({ error: 'laboratoryId is required' }, { status: 400 })
    }

    // Get lab request
    const { data: labRequest, error: reqError } = await supabase
      .from('lab_test_requests')
      .select('*, doctor:professionals!doctor_id(id, business_name, auth_user_id), patient:profiles!patient_id(id)')
      .eq('id', labRequestId)
      .single()

    if (reqError || !labRequest) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    // Verify user is the doctor or the patient
    const isDoctor = labRequest.doctor?.auth_user_id === user.id
    const isPatient = labRequest.patient?.id === user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get laboratory info
    const { data: laboratory } = await supabase
      .from('professionals')
      .select('id, business_name, auth_user_id')
      .eq('id', laboratoryId)
      .eq('type', 'laboratory')
      .single()

    if (!laboratory) {
      return NextResponse.json({ error: 'Laboratory not found' }, { status: 404 })
    }

    // Update lab request: set laboratory_id and status to 'sent_to_lab'
    const { error: updateError } = await supabase
      .from('lab_test_requests')
      .update({
        laboratory_id: laboratoryId,
        status: 'sent_to_lab',
        sent_to_lab_at: new Date().toISOString(),
      })
      .eq('id', labRequestId)

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
      const mergedMeta = { ...(existingTicket?.metadata || {}), laboratory_name: laboratory.business_name }
      await supabase
        .from('healthcare_tickets')
        .update({
          lab_request_id: labRequestId,
          status: 'sent',
          secondary_provider_id: laboratoryId,
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
          ticket_type: 'lab_request',
          status: 'sent',
          patient_id: labRequest.patient_id,
          primary_provider_id: labRequest.doctor_id,
          secondary_provider_id: laboratoryId,
          appointment_id: labRequest.appointment_id,
          lab_request_id: labRequestId,
          metadata: { laboratory_name: laboratory.business_name },
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
          metadata: { lab_request_id: labRequestId, target_id: laboratoryId, target_type: 'laboratory' },
          order_type: 'lab',
        })
        .eq('id', threadId)
    } else if (labRequest.appointment_id && labRequest.doctor_id) {
      // Try to find existing thread or create one (with laboratory as member so they receive it)
      const { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('order_id', labRequest.appointment_id)
        .eq('order_type', 'lab')
        .eq('metadata->>target_id', laboratoryId)
        .maybeSingle()
      if (existingThread) {
        finalThreadId = existingThread.id
        await supabase
          .from('chat_threads')
          .update({ metadata: { lab_request_id: labRequestId, target_id: laboratoryId } })
          .eq('id', finalThreadId)
      } else if (labRequest.doctor?.auth_user_id && laboratory.auth_user_id) {
        // Create thread and add doctor + laboratory as members so lab can see and chat
        const admin = createAdminClient()
        const threadTitle = `Lab Request - ${laboratory.business_name || 'Laboratory'}`
        const { data: newThread, error: threadErr } = await admin
          .from('chat_threads')
          .insert({
            thread_type: 'group',
            title: threadTitle,
            order_type: 'lab',
            order_id: labRequest.appointment_id,
            created_by: labRequest.doctor.auth_user_id,
            metadata: {
              appointment_id: labRequest.appointment_id,
              doctor_id: labRequest.doctor_id,
              target_id: laboratoryId,
              target_type: 'laboratory',
              lab_request_id: labRequestId,
            },
          })
          .select('id')
          .single()
        if (!threadErr && newThread) {
          finalThreadId = newThread.id
          await admin.from('chat_thread_members').insert([
            { thread_id: newThread.id, user_id: labRequest.doctor.auth_user_id, role: 'admin' },
            { thread_id: newThread.id, user_id: laboratory.auth_user_id, role: 'member' },
          ])
        }
      }
    }

    // Send notifications
    if (laboratory.auth_user_id) {
      await supabase.from('notifications').insert({
        user_id: laboratory.auth_user_id,
        type: 'new_lab_request',
        title: 'New Lab Request',
        title_ar: 'طلب تحليل جديد',
        message: `Dr. ${labRequest.doctor?.business_name} has sent a lab test request`,
        message_ar: `أرسل الدكتور ${labRequest.doctor?.business_name} طلب تحليل`,
        metadata: {
          request_id: labRequestId,
          doctor_name: labRequest.doctor?.business_name,
          priority: labRequest.priority,
        },
        action_url: '/professional/dashboard',
      })
    }

    await supabase.from('notifications').insert({
      user_id: labRequest.patient_id,
      type: 'lab_request_created',
      title: 'Lab Tests Sent to Laboratory',
      title_ar: 'تم إرسال التحاليل إلى المختبر',
      message: `Your lab request has been sent to ${laboratory.business_name}`,
      message_ar: `تم إرسال طلب التحاليل إلى ${laboratory.business_name}`,
      metadata: { request_id: labRequestId, laboratory_name: laboratory.business_name },
    })

    // Send system message to thread if exists
    if (finalThreadId) {
      await supabase.from('chat_messages').insert({
        thread_id: finalThreadId,
        sender_id: user.id,
        message_type: 'system',
        content: `Lab request sent to ${laboratory.business_name}`,
      })
    }

    return NextResponse.json({
      success: true,
      labRequest: { ...labRequest, laboratory_id: laboratoryId, status: 'sent_to_lab' },
      ticketId: finalTicketId,
      threadId: finalThreadId,
      message: 'Lab request sent to laboratory successfully',
    })
  } catch (error: any) {
    console.error('[lab-requests/[id]/send] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

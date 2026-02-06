import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Prepare a denied lab request for resending to a different laboratory.
 * Clears laboratory_id, resets status to 'pending', and posts a system message.
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

    // Get lab request with doctor and lab info
    const { data: labRequest, error: reqError } = await supabase
      .from('lab_test_requests')
      .select(`
        *,
        doctor:professionals!doctor_id(id, business_name, auth_user_id),
        patient:profiles!patient_id(id),
        laboratory:professionals!laboratory_id(id, business_name)
      `)
      .eq('id', labRequestId)
      .single()

    if (reqError || !labRequest) {
      console.error('[lab-requests/resend] Lab request fetch failed:', reqError?.message)
      return NextResponse.json(
        { error: reqError?.message || 'Lab request not found' },
        { status: 404 }
      )
    }

    // Only denied lab requests can be resent
    if (labRequest.status !== 'denied') {
      return NextResponse.json(
        { error: 'Only denied lab requests can be resent to another laboratory' },
        { status: 400 }
      )
    }

    // Verify user is the doctor or the patient
    const isDoctor = labRequest.doctor?.auth_user_id === user.id
    const isPatient = labRequest.patient?.id === user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const previousLabName = labRequest.laboratory?.business_name || 'the laboratory'

    // Reset lab request: clear laboratory_id, set status back to 'pending'
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('lab_test_requests')
      .update({
        laboratory_id: null,
        status: 'pending',
        sent_to_lab_at: null,
        denied_at: null,
      })
      .eq('id', labRequestId)

    if (updateError) {
      console.error('[lab-requests/resend] Update failed:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Find the thread to post a system message
    const { data: thread } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('metadata->>lab_request_id', labRequestId)
      .maybeSingle()

    if (thread) {
      await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        message_type: 'system',
        content: `Lab request was denied by ${previousLabName}. Ready to send to a different laboratory.`,
      })
    }

    // Send notification to patient if doctor is resending
    if (isDoctor && labRequest.patient_id) {
      await supabase.from('notifications').insert({
        user_id: labRequest.patient_id,
        type: 'lab_request',
        title: 'Lab Request Being Resent',
        title_ar: 'يتم إعادة إرسال طلب التحاليل',
        message: `Your lab request was denied by ${previousLabName}. Your doctor is sending it to a different laboratory.`,
        message_ar: `تم رفض طلب التحاليل من ${previousLabName}. سيرسله طبيبك إلى مختبر مختلف.`,
        metadata: { request_id: labRequestId, previous_laboratory: previousLabName },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Lab request ready to be sent to another laboratory',
      labRequestId,
    })
  } catch (error: any) {
    console.error('[lab-requests/[id]/resend] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

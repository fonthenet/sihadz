import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Prepare a declined prescription for resending to a different pharmacy.
 * Clears pharmacy_id, resets status to 'active', and posts a system message.
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

    // Get prescription with doctor info
    const { data: prescription, error: prescError } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:professionals!doctor_id(id, business_name, auth_user_id),
        patient:profiles!patient_id(id),
        pharmacy:professionals!pharmacy_id(id, business_name)
      `)
      .eq('id', prescriptionId)
      .single()

    if (prescError || !prescription) {
      console.error('[prescriptions/resend] Prescription fetch failed:', prescError?.message)
      return NextResponse.json(
        { error: prescError?.message || 'Prescription not found' },
        { status: 404 }
      )
    }

    // Only declined prescriptions can be resent
    if (prescription.status !== 'declined') {
      return NextResponse.json(
        { error: 'Only declined prescriptions can be resent to another pharmacy' },
        { status: 400 }
      )
    }

    // Verify user is the doctor or the patient
    const isDoctor = prescription.doctor?.auth_user_id === user.id
    const isPatient = prescription.patient?.id === user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const previousPharmacyName = prescription.pharmacy?.business_name || 'the pharmacy'

    // Reset prescription: clear pharmacy_id, set status back to 'active'
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('prescriptions')
      .update({
        pharmacy_id: null,
        status: 'active',
        sent_to_pharmacy_at: null,
        declined_at: null,
      })
      .eq('id', prescriptionId)

    if (updateError) {
      console.error('[prescriptions/resend] Update failed:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Find the thread to post a system message
    const { data: thread } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('metadata->>prescription_id', prescriptionId)
      .maybeSingle()

    if (thread) {
      await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        message_type: 'system',
        content: `Prescription was declined by ${previousPharmacyName}. Ready to send to a different pharmacy.`,
      })
    }

    // Send notification to patient if doctor is resending
    if (isDoctor && prescription.patient_id) {
      await supabase.from('notifications').insert({
        user_id: prescription.patient_id,
        type: 'prescription',
        title: 'Prescription Being Resent',
        title_ar: 'يتم إعادة إرسال الوصفة',
        message: `Your prescription was declined by ${previousPharmacyName}. Your doctor is sending it to a different pharmacy.`,
        message_ar: `تم رفض وصفتك من ${previousPharmacyName}. سيرسلها طبيبك إلى صيدلية مختلفة.`,
        metadata: { prescription_id: prescriptionId, previous_pharmacy: previousPharmacyName },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Prescription ready to be sent to another pharmacy',
      prescriptionId,
    })
  } catch (error: any) {
    console.error('[prescriptions/[id]/resend] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

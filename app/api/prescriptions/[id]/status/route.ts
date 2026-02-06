import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: prescriptionId } = await params
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, decline_reason } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Get the prescription with related data
    const { data: prescription } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:professionals!doctor_id(business_name),
        pharmacy:professionals!pharmacy_id(auth_user_id, business_name, phone, commune, wilaya)
      `)
      .eq('id', prescriptionId)
      .single()

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    // Verify the user is the pharmacy assigned to this prescription
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, business_name, phone, commune, wilaya')
      .eq('auth_user_id', user.id)
      .single()

    if (!professional || professional.id !== prescription.pharmacy_id) {
      return NextResponse.json({ error: 'Not authorized to update this prescription' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
    }
    if (status === 'received') updateData.received_at = now
    if (status === 'ready') updateData.ready_at = now
    if (status === 'picked_up') updateData.picked_up_at = now
    if (status === 'delivered') updateData.delivered_at = now
    if (status === 'declined') {
      updateData.declined_at = now
      if (decline_reason) updateData.decline_reason = decline_reason
    }

    // Update prescription status
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update(updateData)
      .eq('id', prescriptionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Post status update to prescription thread (e.g. for scan-page pickup)
    const statusMessages: Record<string, string> = {
      received: 'Prescription received and being processed.',
      processing: 'Pharmacy accepted. Prescription is being prepared.',
      ready: 'Prescription is ready for pickup.',
      picked_up: 'Prescription has been picked up by the patient.',
      declined: decline_reason 
        ? `Pharmacy declined this prescription. Reason: ${decline_reason}` 
        : 'Pharmacy declined this prescription.',
      delivered: 'Prescription has been delivered.',
    }
    const systemMessage = statusMessages[status]
    if (systemMessage && prescription.appointment_id) {
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('order_id', prescription.appointment_id)
        .eq('order_type', 'prescription')
        .maybeSingle()
      if (thread) {
        await supabase.from('chat_messages').insert({
          thread_id: thread.id,
          sender_id: user.id,
          message_type: 'system',
          content: systemMessage,
        })
      }
    }

    // Send notifications based on status
    if (status === 'ready') {
      // Notify patient that medications are ready for pickup
      await supabase.from('notifications').insert({
        user_id: prescription.patient_id,
        type: 'prescription_ready',
        title: 'Your Medications Are Ready!',
        title_ar: 'أدويتك جاهزة!',
        message: `Your medications are ready for pickup at ${professional.business_name}. Location: ${professional.commune}, ${professional.wilaya}. Phone: ${professional.phone}`,
        message_ar: `أدويتك جاهزة للاستلام من ${professional.business_name}. الموقع: ${professional.commune}، ${professional.wilaya}. الهاتف: ${professional.phone}`,
        metadata: { 
          prescription_id: prescriptionId,
          pharmacy_name: professional.business_name,
          pharmacy_phone: professional.phone,
          pharmacy_location: `${professional.commune}, ${professional.wilaya}`,
        },
        action_url: '/prescriptions',
      })
    } else if (status === 'dispensed') {
      // Notify patient that prescription has been completed
      await supabase.from('notifications').insert({
        user_id: prescription.patient_id,
        type: 'prescription_dispensed',
        title: 'Prescription Completed',
        title_ar: 'تم صرف الوصفة',
        message: `Your medications from ${professional.business_name} have been dispensed successfully.`,
        message_ar: `تم صرف أدويتك من ${professional.business_name} بنجاح.`,
        metadata: { prescription_id: prescriptionId },
      })

      // Notify doctor that prescription was fulfilled
      const { data: doctor } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', prescription.doctor_id)
        .single()

      if (doctor) {
        await supabase.from('notifications').insert({
          user_id: doctor.auth_user_id,
          type: 'prescription_fulfilled',
          title: 'Prescription Fulfilled',
          title_ar: 'تم صرف الوصفة',
          message: `Prescription for patient has been dispensed by ${professional.business_name}`,
          message_ar: `تم صرف الوصفة للمريض من قبل ${professional.business_name}`,
          metadata: { prescription_id: prescriptionId },
        })
      }
    } else if (status === 'partial') {
      // Notify patient about partial availability
      await supabase.from('notifications').insert({
        user_id: prescription.patient_id,
        type: 'prescription_partial',
        title: 'Partial Medications Available',
        title_ar: 'بعض الأدوية متوفرة',
        message: `Some medications from your prescription are available at ${professional.business_name}. Please contact the pharmacy for details.`,
        message_ar: `بعض الأدوية من وصفتك متوفرة في ${professional.business_name}. يرجى الاتصال بالصيدلية للتفاصيل.`,
        metadata: { 
          prescription_id: prescriptionId,
          pharmacy_phone: professional.phone,
        },
      })
    } else if (status === 'unavailable') {
      // Notify patient about unavailability
      await supabase.from('notifications').insert({
        user_id: prescription.patient_id,
        type: 'prescription_unavailable',
        title: 'Medications Unavailable',
        title_ar: 'الأدوية غير متوفرة',
        message: `Unfortunately, the medications from your prescription are not available at ${professional.business_name}. Please try another pharmacy.`,
        message_ar: `للأسف، الأدوية من وصفتك غير متوفرة في ${professional.business_name}. يرجى محاولة صيدلية أخرى.`,
        metadata: { prescription_id: prescriptionId },
      })
    } else if (status === 'declined') {
      // Notify patient that prescription was declined
      const reasonText = decline_reason ? ` Reason: ${decline_reason}` : ''
      await supabase.from('notifications').insert({
        user_id: prescription.patient_id,
        type: 'prescription_declined',
        title: 'Prescription Declined',
        title_ar: 'تم رفض الوصفة',
        message: `Your prescription was declined by ${professional.business_name}.${reasonText} Your doctor can send it to a different pharmacy.`,
        message_ar: `تم رفض وصفتك من ${professional.business_name}.${reasonText} يمكن لطبيبك إرسالها إلى صيدلية مختلفة.`,
        metadata: { 
          prescription_id: prescriptionId,
          pharmacy_name: professional.business_name,
          decline_reason: decline_reason || null,
        },
      })

      // Notify doctor that prescription was declined
      const { data: doctor } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', prescription.doctor_id)
        .single()

      if (doctor) {
        await supabase.from('notifications').insert({
          user_id: doctor.auth_user_id,
          type: 'prescription_declined',
          title: 'Prescription Declined by Pharmacy',
          title_ar: 'تم رفض الوصفة من الصيدلية',
          message: `${professional.business_name} declined a prescription.${reasonText} You can send it to a different pharmacy.`,
          message_ar: `رفض ${professional.business_name} وصفة طبية.${reasonText} يمكنك إرسالها إلى صيدلية مختلفة.`,
          metadata: { 
            prescription_id: prescriptionId,
            pharmacy_name: professional.business_name,
            decline_reason: decline_reason || null,
          },
          action_url: '/professional/dashboard',
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Prescription marked as ${status}`,
      status 
    })

  } catch (error) {
    console.error('Update prescription status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

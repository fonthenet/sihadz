import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get doctor's professional record
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .eq('type', 'doctor')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Not authorized as a doctor' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      patientId,
      familyMemberId,
      appointmentId,
      testTypeIds,
      clinicalNotes,
      clinicalNotesAr,
      diagnosis,
      diagnosisAr,
      priority = 'normal',
      laboratoryId,
      chifaNumber,
      isChifaEligible = false
    } = body

    // Validate required fields
    if (!patientId || !testTypeIds || testTypeIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate LT-DDMMYY-{visitRef}-{random} (requires scripts/057-lab-test-lt-numbering.sql)
    const admin = createAdminClient()
    const { data: ltNum, error: rpcErr } = await admin.rpc('get_next_lt_number', {
      p_appointment_id: appointmentId || null
    })
    const d = new Date()
    const ddmmyy = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`
    const visitRef = appointmentId ? appointmentId.replace(/-/g,'').slice(-6).toLowerCase() : '000000'
    const requestNumber = rpcErr ? `LT-${ddmmyy}-${visitRef}-${Math.floor(100000 + Math.random() * 900000)}` : (ltNum as string)

    // Create lab request
    const { data: labRequest, error: requestError } = await supabase
      .from('lab_test_requests')
      .insert({
        doctor_id: professional.id,
        patient_id: patientId,
        family_member_id: familyMemberId || null,
        appointment_id: appointmentId || null,
        laboratory_id: laboratoryId || null,
        clinical_notes: clinicalNotes,
        clinical_notes_ar: clinicalNotesAr,
        diagnosis,
        diagnosis_ar: diagnosisAr,
        priority,
        status: laboratoryId ? 'sent_to_lab' : 'pending', // Pending when no lab selected - can be sent later
        request_number: requestNumber,
        chifa_number: chifaNumber,
        is_chifa_eligible: isChifaEligible,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (requestError) {
      console.error('Lab request creation error:', requestError)
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    // Insert test items (use admin to bypass RLS - auth already verified above)
    const testItems = testTypeIds.map((testTypeId: string) => ({
      request_id: labRequest.id,
      test_type_id: testTypeId,
    }))

    const { error: itemsError } = await admin.from('lab_test_items').insert(testItems)
    if (itemsError) {
      console.error('Lab test items insert error:', itemsError)
      return NextResponse.json({ error: `Failed to save test items: ${itemsError.message}` }, { status: 500 })
    }

    // Only create notifications and link to ticket/thread when laboratory is selected (sent workflow)
    // If no laboratory, prescription is draft - doctor/patient can send later
    if (laboratoryId) {
      // Get laboratory's auth_user_id for notification
      const { data: laboratory } = await supabase
        .from('professionals')
        .select('auth_user_id, business_name')
        .eq('id', laboratoryId)
        .single()

      if (laboratory?.auth_user_id) {
        // Notify laboratory only when they have an account to receive it
        await supabase.from('notifications').insert({
          user_id: laboratory.auth_user_id,
          type: 'new_lab_request',
          title: 'New Lab Request',
          title_ar: 'طلب تحليل جديد',
          message: `Dr. ${professional.business_name} has sent a lab test request`,
          message_ar: `أرسل الدكتور ${professional.business_name} طلب تحليل`,
          metadata: { 
            request_id: labRequest.id,
            doctor_name: professional.business_name,
            priority,
          },
          action_url: '/professional/dashboard',
        })
      }

      // Notify patient
      await supabase.from('notifications').insert({
        user_id: patientId,
        type: 'lab_request_created',
        title: 'Lab Tests Requested',
        title_ar: 'تم طلب تحاليل',
        message: `Dr. ${professional.business_name} has requested lab tests for you`,
        message_ar: `طلب الدكتور ${professional.business_name} تحاليل لك`,
        metadata: { 
          request_id: labRequest.id,
          laboratory_name: laboratory?.business_name,
        },
      })
    }

    return NextResponse.json({ 
      success: true, 
      labRequest,
      message: laboratoryId ? 'Lab request sent to laboratory' : 'Lab request created as draft. You can print it or send it to a laboratory.'
    })

  } catch (error) {
    console.error('Lab request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'doctor', 'laboratory', or 'patient'
    const status = searchParams.get('status')

    let professionalId: string | null = null
    let userId: string | null = null

    // 1. Check employee session first (for laboratory role - employees use PIN auth)
    if (role === 'laboratory') {
      const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
      if (token) {
        const session = await validateEmployeeSession(token)
        if (session?.professional) {
          professionalId = session.professional.id
        }
      }
    }

    // 2. Fall back to Supabase auth (for doctor, patient, or laboratory owner)
    if (!professionalId && role !== 'laboratory') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id

      if (role === 'doctor') {
        const { data: professional } = await supabase
          .from('professionals')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()
        professionalId = professional?.id ?? null
      }
    } else if (!professionalId && role === 'laboratory') {
      // Laboratory: no employee session, try Supabase (owner)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      professionalId = professional?.id ?? null
    }

    const admin = createAdminClient()

    const selectFields = `
      *,
      doctor:professionals!doctor_id(business_name, phone),
      patient:profiles!patient_id(full_name, phone, date_of_birth, gender),
      family_member:family_members!family_member_id(id, full_name, date_of_birth, gender, relationship, allergies, blood_type),
      laboratory:professionals!laboratory_id(business_name, phone, commune, wilaya),
      items:lab_test_items(
        *,
        test_type:lab_test_types(name, name_ar, category)
      )
    `

    let query = admin
      .from('lab_test_requests')
      .select(selectFields)
      .order('created_at', { ascending: false })

    if (role === 'doctor') {
      if (professionalId) {
        query = query.eq('doctor_id', professionalId)
      } else {
        return NextResponse.json({ labRequests: [] })
      }
    } else if (role === 'laboratory') {
      if (professionalId) {
        query = query.eq('laboratory_id', professionalId)
      } else {
        return NextResponse.json({ labRequests: [] })
      }
    } else if (role === 'patient' && userId) {
      query = query.eq('patient_id', userId)
    } else if (role === 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: labRequests, error } = await query.limit(50)

    if (error) {
      console.error('[GET /api/lab-requests] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ labRequests: labRequests || [] })

  } catch (error) {
    console.error('Get lab requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update lab request status (accept/deny from lab, or mark completed)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    let labProId: string | null = null

    // 1. Check employee session first (for laboratory actions)
    const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    if (token) {
      const session = await validateEmployeeSession(token)
      if (session?.professional) {
        labProId = session.professional.id
      }
    }

    // 2. Fall back to Supabase auth
    let user: { id: string } | null = null
    if (!labProId) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const body = await request.json()
    const { requestId, status, action, results, lab_fulfillment, assigned_technician_id, assigned_technician_name, deny_reason } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    // Resolve effective status from action or direct status
    let effectiveStatus = status
    if (action === 'accept') effectiveStatus = 'processing'
    if (action === 'deny') effectiveStatus = 'denied'
    if (action === 'send_results') effectiveStatus = 'fulfilled'
    if (!effectiveStatus && action !== 'send_results') {
      return NextResponse.json({ error: 'Missing status or action' }, { status: 400 })
    }

    // Get the lab request to verify authorization and get patient/doctor info
    const { data: labRequest } = await supabase
      .from('lab_test_requests')
      .select(`
        *,
        doctor:professionals!doctor_id(auth_user_id, business_name),
        laboratory:professionals!laboratory_id(auth_user_id, business_name)
      `)
      .eq('id', requestId)
      .single()

    if (!labRequest) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    // For accept/deny/send_results: verify caller is the laboratory
    if (action === 'accept' || action === 'deny' || action === 'send_results') {
      if (!labProId && user) {
        const { data: labPro } = await supabase
          .from('professionals')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('type', 'laboratory')
          .single()
        labProId = labPro?.id ?? null
      }
      if (!labProId || labRequest.laboratory_id !== labProId) {
        return NextResponse.json({ error: 'Not authorized to perform this action' }, { status: 403 })
      }
    }

    // For send_results: require at least one completed test with result_value, or all failed
    if (action === 'send_results') {
      const fulfillment = lab_fulfillment ?? labRequest.lab_fulfillment ?? []
      const { data: items } = await supabase.from('lab_test_items').select('id').eq('request_id', requestId)
      const total = (items ?? []).length
      const completed = fulfillment.filter((f: any) => f.status === 'completed')
      const failed = fulfillment.filter((f: any) => f.status === 'failed')
      const completedWithResults = completed.filter((f: any) => f.result_value && String(f.result_value).trim())
      if (total > 0 && completed.length === 0 && (failed.length + completed.length) < total) {
        return NextResponse.json({ error: 'Mark each test as completed or failed before sending results' }, { status: 400 })
      }
      if (completed.length > 0 && completedWithResults.length < completed.length) {
        return NextResponse.json({ error: 'Enter result value for each completed test before sending' }, { status: 400 })
      }
    }

    // Update the request
    const updateData: any = { status: effectiveStatus, updated_at: new Date().toISOString() }
    if (effectiveStatus === 'processing' || effectiveStatus === 'in_progress') {
      updateData.received_at = labRequest.received_at || new Date().toISOString()
    }
    if (effectiveStatus === 'completed' || effectiveStatus === 'fulfilled') {
      updateData.completed_at = new Date().toISOString()
      const fulfillment = lab_fulfillment ?? labRequest.lab_fulfillment
      if (fulfillment) updateData.lab_fulfillment = fulfillment
    }
    if (effectiveStatus === 'denied') {
      updateData.denied_at = new Date().toISOString()
      if (deny_reason) updateData.deny_reason = deny_reason
    }
    // Include assigned technician if provided
    if (assigned_technician_id !== undefined) {
      updateData.assigned_technician_id = assigned_technician_id
      updateData.assigned_technician_name = assigned_technician_name || null
    }

    const { error: updateError } = await supabase
      .from('lab_test_requests')
      .update(updateData)
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // On accept (processing): notify doctor and patient
    if (effectiveStatus === 'processing') {
      const labName = labRequest.laboratory?.business_name || 'Laboratory'
      if (labRequest.doctor?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: labRequest.doctor.auth_user_id,
          type: 'new_lab_request',
          title: 'Lab Request Accepted',
          title_ar: 'تم قبول طلب التحليل',
          message: `${labName} has accepted your lab request #${labRequest.request_number}. Processing has started.`,
          message_ar: `قبل ${labName} طلب التحليل #${labRequest.request_number}. جاري المعالجة.`,
          metadata: { request_id: requestId, status: 'processing' },
          action_url: '/professional/dashboard',
        })
      }
      await supabase.from('notifications').insert({
        user_id: labRequest.patient_id,
        type: 'lab_request_created',
        title: 'Lab Request Accepted',
        title_ar: 'تم قبول طلب التحليل',
        message: `${labName} has accepted your lab tests. Processing has started.`,
        message_ar: `قبل ${labName} تحاليلك. جاري المعالجة.`,
        metadata: { request_id: requestId, status: 'processing' },
      })
    }

    // On deny: notify doctor and patient
    if (effectiveStatus === 'denied') {
      const labName = labRequest.laboratory?.business_name || 'Laboratory'
      const reasonText = deny_reason ? ` Reason: ${deny_reason}` : ''
      if (labRequest.doctor?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: labRequest.doctor.auth_user_id,
          type: 'lab_request_denied',
          title: 'Lab Request Denied',
          title_ar: 'تم رفض طلب التحليل',
          message: `${labName} has denied your lab request #${labRequest.request_number}.${reasonText} You can send it to a different laboratory.`,
          message_ar: `رفض ${labName} طلب التحليل #${labRequest.request_number}.${reasonText} يمكنك إرسالها إلى مختبر مختلف.`,
          metadata: { request_id: requestId, status: 'denied', deny_reason: deny_reason || null },
          action_url: '/professional/dashboard',
        })
      }
      await supabase.from('notifications').insert({
        user_id: labRequest.patient_id,
        type: 'lab_request_denied',
        title: 'Lab Request Denied',
        title_ar: 'تم رفض طلب التحليل',
        message: `${labName} has denied your lab test request.${reasonText} Your doctor can send it to a different laboratory.`,
        message_ar: `رفض ${labName} طلب التحاليل.${reasonText} يمكن لطبيبك إرسالها إلى مختبر مختلف.`,
        metadata: { request_id: requestId, status: 'denied', deny_reason: deny_reason || null },
      })
      
      // Post system message to thread if exists
      if (labRequest.appointment_id) {
        const { data: thread } = await supabase
          .from('chat_threads')
          .select('id')
          .eq('order_id', labRequest.appointment_id)
          .eq('order_type', 'lab')
          .maybeSingle()
        if (thread) {
          const systemMessage = deny_reason 
            ? `Laboratory denied this request. Reason: ${deny_reason}`
            : 'Laboratory denied this request.'
          await supabase.from('chat_messages').insert({
            thread_id: thread.id,
            sender_id: user?.id || labRequest.laboratory?.auth_user_id,
            message_type: 'system',
            content: systemMessage,
          })
        }
      }
    }

    // If completed/fulfilled, persist results to lab_test_items, create lab_results, notify
    if (effectiveStatus === 'completed' || effectiveStatus === 'fulfilled') {
      const fulfillment = (lab_fulfillment ?? labRequest.lab_fulfillment) ?? []
      const admin = createAdminClient()

      // Persist result values to lab_test_items (standard format: value, unit, reference range)
      for (const f of fulfillment) {
        if (f.status === 'completed' && f.item_id) {
          await admin.from('lab_test_items').update({
            result_value: f.result_value ?? null,
            result_unit: f.result_unit ?? null,
            reference_range: f.reference_range ?? null,
            result_status: f.result_status ?? null,
            lab_notes: f.lab_notes ?? null,
            is_abnormal: f.result_status ? ['high', 'low', 'critical'].includes(f.result_status) : false,
            completed_at: f.completed_at ?? new Date().toISOString(),
          }).eq('id', f.item_id).eq('request_id', requestId)
        }
      }

      const resultPayload = results || { lab_fulfillment: fulfillment, sent_at: new Date().toISOString() }
      await supabase.from('lab_results').insert({
        request_id: requestId,
        patient_id: labRequest.patient_id,
        laboratory_id: labRequest.laboratory_id,
        result_data: resultPayload,
      })

      const apptId = labRequest.appointment_id
      const actionUrl = apptId
        ? `/professional/dashboard/appointments/${apptId}?labRequest=${requestId}`
        : '/professional/dashboard'

      // Notify doctor
      if (labRequest.doctor?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: labRequest.doctor.auth_user_id,
          type: 'lab_results_ready',
          title: 'Results Received',
          title_ar: 'تم استلام النتائج',
          message: `Lab results for request #${labRequest.request_number} have been received`,
          message_ar: `تم استلام نتائج طلب التحليل #${labRequest.request_number}`,
          metadata: { request_id: requestId, appointment_id: apptId },
          action_url: actionUrl,
        })
      }

      // Notify patient
      await supabase.from('notifications').insert({
        user_id: labRequest.patient_id,
        type: 'lab_results_ready',
        title: 'Results Received',
        title_ar: 'تم استلام النتائج',
        message: `Your lab results from ${labRequest.laboratory?.business_name || 'the laboratory'} have been received`,
        message_ar: `تم استلام نتائج تحاليلك من ${labRequest.laboratory?.business_name || 'المختبر'}`,
        metadata: { request_id: requestId, appointment_id: apptId },
        action_url: apptId ? `/dashboard/appointments/${apptId}?labRequest=${requestId}` : '/dashboard',
      })
    }

    return NextResponse.json({ success: true, message: `Lab request ${status}` })

  } catch (error) {
    console.error('Update lab request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

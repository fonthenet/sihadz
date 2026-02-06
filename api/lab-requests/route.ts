// @ts-nocheck
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // Generate request number
    const requestNumber = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

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
        status: laboratoryId ? 'sent' : 'pending',
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

    // Insert test items
    const testItems = testTypeIds.map((testTypeId: string) => ({
      request_id: labRequest.id,
      test_type_id: testTypeId,
    }))

    await supabase.from('lab_test_items').insert(testItems)

    // If laboratory is selected, create notifications
    if (laboratoryId) {
      // Get laboratory's auth_user_id for notification
      const { data: laboratory } = await supabase
        .from('professionals')
        .select('auth_user_id, business_name')
        .eq('id', laboratoryId)
        .single()

      if (laboratory) {
        // Notify laboratory
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
      message: laboratoryId ? 'Lab request sent to laboratory' : 'Lab request created'
    })

  } catch (error) {
    console.error('Lab request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'doctor', 'laboratory', or 'patient'
    const status = searchParams.get('status')

    let query = supabase
      .from('lab_test_requests')
      .select(`
        *,
        doctor:professionals!doctor_id(business_name, phone),
        patient:profiles!patient_id(full_name, phone, date_of_birth, gender),
        laboratory:professionals!laboratory_id(business_name, phone, commune, wilaya),
        items:lab_test_items(
          *,
          test_type:lab_test_types(name, name_ar, category)
        )
      `)
      .order('created_at', { ascending: false })

    if (role === 'doctor') {
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (professional) {
        query = query.eq('doctor_id', professional.id)
      }
    } else if (role === 'laboratory') {
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (professional) {
        query = query.eq('laboratory_id', professional.id)
      }
    } else {
      // Patient view
      query = query.eq('patient_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: labRequests, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ labRequests })

  } catch (error) {
    console.error('Get lab requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update lab request status (for laboratory to mark as completed)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, status, results } = body

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Update the request
    const updateData: any = { status }
    if (status === 'in_progress') {
      updateData.received_at = new Date().toISOString()
    }
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    await supabase
      .from('lab_test_requests')
      .update(updateData)
      .eq('id', requestId)

    // If completed, create lab result and notify
    if (status === 'completed') {
      // Create lab result record
      if (results) {
        await supabase.from('lab_results').insert({
          request_id: requestId,
          patient_id: labRequest.patient_id,
          laboratory_id: labRequest.laboratory_id,
          result_data: results,
        })
      }

      // Notify doctor
      if (labRequest.doctor?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: labRequest.doctor.auth_user_id,
          type: 'lab_results_ready',
          title: 'Lab Results Ready',
          title_ar: 'نتائج التحاليل جاهزة',
          message: `Lab results for request #${labRequest.request_number} are ready`,
          message_ar: `نتائج طلب التحليل #${labRequest.request_number} جاهزة`,
          metadata: { request_id: requestId },
        })
      }

      // Notify patient
      await supabase.from('notifications').insert({
        user_id: labRequest.patient_id,
        type: 'lab_results_ready',
        title: 'Your Lab Results Are Ready',
        title_ar: 'نتائج تحاليلك جاهزة',
        message: `Your lab results from ${labRequest.laboratory?.business_name || 'the laboratory'} are ready`,
        message_ar: `نتائج تحاليلك من ${labRequest.laboratory?.business_name || 'المختبر'} جاهزة`,
        metadata: { request_id: requestId },
      })
    }

    return NextResponse.json({ success: true, message: `Lab request ${status}` })

  } catch (error) {
    console.error('Update lab request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

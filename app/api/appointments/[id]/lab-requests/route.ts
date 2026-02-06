import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * GET /api/appointments/[id]/lab-requests
 * Returns lab requests for this appointment with items (test types).
 * Uses admin client to bypass RLS so items always load.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params
    const { searchParams } = new URL(request.url)
    const laboratoryId = searchParams.get('laboratory_id') // null = draft only, uuid = for that lab
    const doctorIdParam = searchParams.get('doctor_id')

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: appointment, error: apptErr } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('id', appointmentId)
      .maybeSingle()

    if (apptErr || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Verify access: patient or professional (doctor/clinic) with access to this appointment
    const isPatient = appointment.patient_id === user.id
    let isProfessional = false
    if (appointment.doctor_id) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', appointment.doctor_id)
        .maybeSingle()
      isProfessional = prof?.auth_user_id === user.id
    }
    const { data: myProf } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    const canAccess = isPatient || isProfessional || !!myProf

    if (!canAccess) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch lab requests with items via admin (bypasses RLS so items always load)
    const admin = createAdminClient()
    let query = admin
      .from('lab_test_requests')
      .select(`
        id, doctor_id, patient_id, family_member_id, diagnosis, clinical_notes, priority, status, created_at, updated_at, request_number, laboratory_id, lab_fulfillment,
        laboratory:professionals!laboratory_id(id, business_name),
        doctor:professionals!doctor_id(id, business_name),
        patient:profiles!patient_id(full_name),
        family_member:family_members!family_member_id(id, full_name, date_of_birth, allergies),
        items:lab_test_items(id, result_value, result_unit, reference_range, result_status, lab_notes, completed_at, test_type:lab_test_types(id, name, name_ar, category))
      `)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })

    if (doctorIdParam) {
      query = query.eq('doctor_id', doctorIdParam)
    }
    if (laboratoryId === 'null' || laboratoryId === 'draft') {
      query = query.is('laboratory_id', null)
    } else if (laboratoryId) {
      query = query.eq('laboratory_id', laboratoryId)
    }

    const { data: labRequests, error } = await query

    if (error) {
      console.error('[appointments/lab-requests] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ labRequests: labRequests ?? [] })
  } catch (e) {
    console.error('[appointments/lab-requests] Unhandled error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

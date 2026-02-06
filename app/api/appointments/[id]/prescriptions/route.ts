import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { escalateCriticalError } from '@/lib/security/data-integrity'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * GET /api/appointments/[id]/prescriptions
 * Returns prescriptions for this appointment.
 * Verifies user has access (doctor or patient) then fetches via admin to bypass RLS.
 * 
 * SECURITY: Implements audit logging and error escalation per SOP Section 15.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params
    console.log('[appointments/prescriptions] Request for appointment:', appointmentId)
    
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[appointments/prescriptions] No user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[appointments/prescriptions] User:', user.id)

    // Load appointment (professional_id doesn't exist in this DB)
    const { data: appointment, error: apptErr } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('id', appointmentId)
      .maybeSingle()

    console.log('[appointments/prescriptions] Appointment query result:', { appointment, apptErr })

    if (apptErr || !appointment) {
      console.error('[appointments/prescriptions] Appointment fetch error:', apptErr)
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Fetch prescriptions by appointment_id (admin bypasses RLS)
    const adminClient = createAdminClient()
    const baseSelect = `id, diagnosis, notes, medications, status, created_at, valid_until, pharmacy_fulfillment,
        pharmacy_id, doctor_id, appointment_id, total_amount, sent_to_pharmacy_at,
        pharmacy:professionals!pharmacy_id(id, business_name)`
    // Include prescription_number if column exists (added by scripts/059-prescription-rx-numbering.sql)
    let selectWithRx = `id, prescription_number, family_member_id, diagnosis, notes, medications, status, created_at, valid_until, pharmacy_fulfillment,
        pharmacy_id, doctor_id, appointment_id, total_amount, sent_to_pharmacy_at,
        pharmacy:professionals!pharmacy_id(id, business_name),
        family_member:family_members!family_member_id(id, full_name, date_of_birth, allergies)`
    let { data: prescriptions, error } = await adminClient
      .from('prescriptions')
      .select(selectWithRx)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })

    if (error) {
      // prescription_number column may not exist (run scripts/059 to add it)
      const fallback = await adminClient
        .from('prescriptions')
        .select(baseSelect)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
      if (!fallback.error) {
        prescriptions = fallback.data
        error = null
      }
    }

    // CRITICAL: Never silently fail on query errors - healthcare data must be visible
    // SOP Section 15: All errors must be logged and escalated
    if (error) {
      escalateCriticalError(
        'Prescription Visibility Failure',
        error.message || 'Unknown database error',
        {
          appointmentId,
          userId: user.id,
          errorCode: error.code,
          errorHint: error.hint,
          errorDetails: error.details,
        }
      )
      return NextResponse.json({ 
        error: error.message, 
        debug: { code: error.code, hint: error.hint }
      }, { status: 500 })
    }

    let list = prescriptions ?? []
    console.log('[appointments/prescriptions] Found', list.length, 'prescriptions for appointment', appointmentId)

    // Fallback: if none found by appointment_id, try patient+doctor (catches unlinked prescriptions)
    if (list.length === 0 && appointment.patient_id && appointment.doctor_id) {
      const doctorIdForQuery = appointment.doctor_id
      if (doctorIdForQuery) {
        const { data: fallback } = await adminClient
          .from('prescriptions')
          .select(`
            id, diagnosis, notes, medications, status, created_at, valid_until, pharmacy_fulfillment,
            pharmacy_id, doctor_id, appointment_id, total_amount,
            pharmacy:professionals!pharmacy_id(id, business_name)
          `)
          .eq('patient_id', appointment.patient_id)
          .eq('doctor_id', doctorIdForQuery)
          .or(`appointment_id.is.null,appointment_id.eq.${appointmentId}`)
          .order('created_at', { ascending: false })
          .limit(20)
        if (fallback && fallback.length > 0) list = fallback
      }
    }

    // Verify access: patient, appointment doctor, OR prescribing doctor of any prescription
    const doctorId = appointment.doctor_id
    const isPatient = appointment.patient_id === user.id
    let isDoctor = false
    if (doctorId) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', doctorId)
        .maybeSingle()
      isDoctor = prof?.auth_user_id === user.id
      console.log('[appointments/prescriptions] Doctor check:', { doctorId, profAuthId: prof?.auth_user_id, userId: user.id, isDoctor })
    }
    let isPrescribingDoctor = false
    if (!isPatient && !isDoctor && list.length > 0) {
      const { data: myProf } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (myProf) {
        isPrescribingDoctor = list.some((p: any) => p.doctor_id === myProf.id)
      }
    }
    console.log('[appointments/prescriptions] Access check:', { isPatient, isDoctor, isPrescribingDoctor })
    if (!isPatient && !isDoctor && !isPrescribingDoctor) {
      console.log('[appointments/prescriptions] Access denied')
      return NextResponse.json({ error: 'Not authorized to view this appointment' }, { status: 403 })
    }

    console.log('[appointments/prescriptions] Returning', list.length, 'prescriptions')
    return NextResponse.json({ prescriptions: list })
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    try {
      escalateCriticalError('Prescription API Unhandled Exception', errMsg, { endpoint: '/api/appointments/[id]/prescriptions' })
    } catch (_) { /* ensure we still return */ }
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 })
  }
}

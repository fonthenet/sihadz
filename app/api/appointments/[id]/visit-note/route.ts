import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/appointments/[id]/visit-note
 * Save doctor_note_for_patient for an appointment.
 * Works for all professionals (doctors, clinics, nurses) and employees.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: appointmentId } = await params
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    const empSession = empToken ? await validateEmployeeSession(empToken) : null

    if (!user && !empSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { doctor_note_for_patient } = body
    const value = typeof doctor_note_for_patient === 'string' ? doctor_note_for_patient.trim() || null : null

    // Get appointment
    const { data: appointment, error: aptError } = await admin
      .from('appointments')
      .select('id, patient_id, doctor_id, professional_id')
      .eq('id', appointmentId)
      .maybeSingle()

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const apt = appointment as { doctor_id?: string; professional_id?: string }
    const providerId = apt.doctor_id ?? apt.professional_id

    // Check permission: user must be the provider or an employee of the provider
    let canUpdate = false

    if (providerId) {
      // Supabase auth: professional owner
      if (user) {
        const { data: prof } = await admin
          .from('professionals')
          .select('id, auth_user_id')
          .eq('id', providerId)
          .maybeSingle()

        if (prof && (prof as { auth_user_id?: string }).auth_user_id === user.id) {
          canUpdate = true
        }
      }

      // Employee session: employee of this professional
      if (!canUpdate && empSession?.professional?.id === providerId) {
        canUpdate = true
      }
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Not authorized to update this appointment' }, { status: 403 })
    }

    const { error: updateError } = await admin
      .from('appointments')
      .update({ doctor_note_for_patient: value, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('[visit-note] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[visit-note] Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

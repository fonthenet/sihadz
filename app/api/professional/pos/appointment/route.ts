import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfessionalIdFromRequest, POS_PROFESSIONAL_TYPES } from '@/lib/professional/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/professional/pos/appointment?id=<appointment_id>
 * Get appointment details pre-filled for POS checkout
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getProfessionalIdFromRequest(request, POS_PROFESSIONAL_TYPES)

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointmentId = request.nextUrl.searchParams.get('id')
    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch appointment with patient details
    const { data: appointment, error: appError } = await admin
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        visit_type,
        status,
        payment_status,
        pos_sale_id,
        patient:profiles!appointments_patient_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        professional:professionals!appointments_doctor_id_fkey (
          id,
          consultation_fee
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Verify this appointment belongs to this professional
    if (appointment.doctor_id !== auth.professionalId) {
      return NextResponse.json({ error: 'Not authorized for this appointment' }, { status: 403 })
    }

    // Try to find a matching service by visit_type
    const { data: matchingService } = await admin
      .from('professional_services')
      .select('id, service_name, price, is_chifa_eligible, chifa_reimbursement_rate')
      .eq('professional_id', auth.professionalId)
      .eq('is_active', true)
      .ilike('service_name', `%${appointment.visit_type || 'consultation'}%`)
      .limit(1)
      .maybeSingle()

    // Build the POS pre-fill data
    // The patient/professional are returned as arrays from the join, but we use single()
    // so they should be objects, but TypeScript sees them as potentially arrays
    const patientData = appointment.patient as unknown as { id: string; full_name: string; phone: string; email: string } | null
    const professionalData = appointment.professional as unknown as { id: string; consultation_fee: number } | null

    const preFillData = {
      appointment_id: appointment.id,
      patient_id: patientData?.id || null,
      patient_name: patientData?.full_name || 'Walk-in Patient',
      patient_phone: patientData?.phone || '',
      patient_email: patientData?.email || '',
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      visit_type: appointment.visit_type || 'Consultation',
      status: appointment.status,
      payment_status: appointment.payment_status || 'pending',
      already_paid: !!appointment.pos_sale_id,
      // Service details
      service: matchingService ? {
        id: matchingService.id,
        name: matchingService.service_name,
        price: matchingService.price || professionalData?.consultation_fee || 0,
        is_chifa_eligible: matchingService.is_chifa_eligible,
        chifa_reimbursement_rate: matchingService.chifa_reimbursement_rate || 0
      } : {
        id: null,
        name: appointment.visit_type || 'Consultation',
        price: professionalData?.consultation_fee || 0,
        is_chifa_eligible: false,
        chifa_reimbursement_rate: 0
      }
    }

    return NextResponse.json({ appointment: preFillData })
  } catch (err) {
    console.error('Appointment POS API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

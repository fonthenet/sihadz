import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET - List referrals
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const professionalId = searchParams.get('professionalId')
    const userRole = searchParams.get('userRole') // doctor, clinic, patient
    const status = searchParams.get('status')

    let query = supabase
      .from('referrals')
      .select(`
        *,
        referring_doctor:referring_doctor_id(id, business_name, specialty, wilaya, phone),
        referred_to_doctor:referred_to_doctor_id(id, business_name, specialty, wilaya, phone),
        referred_to_clinic:referred_to_clinic_id(id, business_name, wilaya, phone),
        patient:patient_id(id, full_name, phone, avatar_url, chifa_number)
      `)

    // Filter based on user role
    if (userRole === 'patient' && userId) {
      query = query.eq('patient_id', userId)
    } else if ((userRole === 'doctor' || userRole === 'clinic') && professionalId) {
      query = query.or(`referring_doctor_id.eq.${professionalId},referred_to_doctor_id.eq.${professionalId},referred_to_clinic_id.eq.${professionalId}`)
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ referrals: data })
  } catch (error: any) {
    console.error('Error in GET /api/referrals:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create referral
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const {
      referringDoctorId,
      referringClinicId,
      patientId,
      patientName,
      patientPhone,
      familyMemberId,
      appointmentId,
      referredToDoctorId,
      referredToClinicId,
      referredToSpecialty,
      referredToType, // doctor or clinic
      reason,
      reasonAr,
      clinicalHistory,
      diagnosis,
      urgency = 'routine',
      attachments = []
    } = body

    // Validate required fields
    if (!referringDoctorId || !patientId || !reason || !referredToSpecialty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate referral number
    const referralNumber = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // If appointmentId provided and no familyMemberId, try to inherit from appointment
    let resolvedFamilyMemberId = familyMemberId || null
    if (appointmentId && !resolvedFamilyMemberId) {
      const { data: apt } = await supabase
        .from('appointments')
        .select('family_member_id')
        .eq('id', appointmentId)
        .maybeSingle()
      if (apt?.family_member_id) {
        resolvedFamilyMemberId = apt.family_member_id
      }
    }

    const referralData = {
      referral_number: referralNumber,
      referring_doctor_id: referringDoctorId,
      referring_clinic_id: referringClinicId || null,
      patient_id: patientId,
      patient_name: patientName,
      patient_phone: patientPhone,
      family_member_id: resolvedFamilyMemberId,
      referred_to_doctor_id: referredToDoctorId || null,
      referred_to_clinic_id: referredToClinicId || null,
      referred_to_specialty: referredToSpecialty,
      referred_to_type: referredToType || 'doctor',
      reason,
      reason_ar: reasonAr,
      clinical_history: clinicalHistory,
      diagnosis,
      urgency,
      attachments,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    }

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert(referralData)
      .select(`
        *,
        referring_doctor:referring_doctor_id(id, business_name, auth_user_id),
        referred_to_doctor:referred_to_doctor_id(id, business_name, auth_user_id),
        referred_to_clinic:referred_to_clinic_id(id, business_name, auth_user_id)
      `)
      .single()

    if (error) throw error

    // Send notifications
    const notifications = []

    // Notify referred doctor/clinic
    if (referredToDoctorId) {
      const { data: doctor } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', referredToDoctorId)
        .single()

      if (doctor?.auth_user_id) {
        notifications.push({
          user_id: doctor.auth_user_id,
          type: 'new_referral',
          title: urgency === 'emergency' ? '🚨 URGENT: New Patient Referral' : 'New Patient Referral',
          message: `You have received a new referral for ${patientName} from Dr. ${referral.referring_doctor?.business_name}`,
          data: { 
            referral_id: referral.id,
            referral_number: referralNumber,
            urgency
          }
        })
      }
    }

    if (referredToClinicId) {
      const { data: clinic } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', referredToClinicId)
        .single()

      if (clinic?.auth_user_id) {
        notifications.push({
          user_id: clinic.auth_user_id,
          type: 'new_referral',
          title: urgency === 'emergency' ? '🚨 URGENT: New Patient Referral' : 'New Patient Referral',
          message: `New referral received for ${patientName}`,
          data: { 
            referral_id: referral.id,
            referral_number: referralNumber,
            urgency
          }
        })
      }
    }

    // Notify patient
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('auth_user_id')
      .eq('id', patientId)
      .single()

    if (patientProfile?.auth_user_id) {
      notifications.push({
        user_id: patientProfile.auth_user_id,
        type: 'referral_created',
        title: 'Medical Referral Created',
        message: `Your doctor has referred you to a ${referredToSpecialty} specialist`,
        data: { 
          referral_id: referral.id,
          referral_number: referralNumber
        }
      })
    }

    // Insert all notifications
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    // Log audit
    await supabase.from('medical_audit_log').insert({
      record_type: 'referral',
      record_id: referral.id,
      accessed_by_id: referringDoctorId,
      accessed_by_type: 'doctor',
      action: 'create',
      details: { referral_number: referralNumber, patient_name: patientName }
    })

    return NextResponse.json({ referral })
  } catch (error: any) {
    console.error('Error in POST /api/referrals:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update referral (accept, decline, complete)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { 
      referralId, 
      action, 
      userId, 
      userType,
      declineReason,
      receivingNotes,
      appointmentId
    } = body

    if (!referralId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current referral
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select(`
        *,
        referring_doctor:referring_doctor_id(id, business_name, auth_user_id),
        patient:patient_id(id, full_name, auth_user_id)
      `)
      .eq('id', referralId)
      .single()

    if (fetchError) throw fetchError

    let updateData: any = {}
    const notifications = []

    switch (action) {
      case 'accept':
        updateData = {
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          receiving_notes: receivingNotes
        }
        
        // Notify referring doctor
        if (referral.referring_doctor?.auth_user_id) {
          notifications.push({
            user_id: referral.referring_doctor.auth_user_id,
            type: 'referral_accepted',
            title: 'Referral Accepted',
            message: `Your referral for ${referral.patient_name} has been accepted`,
            data: { referral_id: referralId }
          })
        }

        // Notify patient
        if (referral.patient?.auth_user_id) {
          notifications.push({
            user_id: referral.patient.auth_user_id,
            type: 'referral_accepted',
            title: 'Your Referral Was Accepted',
            message: `Your medical referral has been accepted. You can now schedule an appointment.`,
            data: { referral_id: referralId }
          })
        }
        break

      case 'decline':
        updateData = {
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: declineReason
        }

        // Notify referring doctor
        if (referral.referring_doctor?.auth_user_id) {
          notifications.push({
            user_id: referral.referring_doctor.auth_user_id,
            type: 'referral_declined',
            title: 'Referral Declined',
            message: `Your referral for ${referral.patient_name} has been declined${declineReason ? `: ${declineReason}` : ''}`,
            data: { referral_id: referralId, decline_reason: declineReason }
          })
        }

        // Notify patient
        if (referral.patient?.auth_user_id) {
          notifications.push({
            user_id: referral.patient.auth_user_id,
            type: 'referral_declined',
            title: 'Your Referral Status Update',
            message: `Your referral could not be processed. Please contact your doctor.`,
            data: { referral_id: referralId }
          })
        }
        break

      case 'complete':
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
          appointment_id: appointmentId,
          receiving_notes: receivingNotes
        }

        // Notify referring doctor
        if (referral.referring_doctor?.auth_user_id) {
          notifications.push({
            user_id: referral.referring_doctor.auth_user_id,
            type: 'referral_completed',
            title: 'Referral Completed',
            message: `The referral for ${referral.patient_name} has been completed`,
            data: { referral_id: referralId, appointment_id: appointmentId }
          })
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update referral
    const { data: updatedReferral, error: updateError } = await supabase
      .from('referrals')
      .update(updateData)
      .eq('id', referralId)
      .select()
      .single()

    if (updateError) throw updateError

    // Send notifications
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    // Log audit
    await supabase.from('medical_audit_log').insert({
      record_type: 'referral',
      record_id: referralId,
      accessed_by_id: userId,
      accessed_by_type: userType,
      action: action,
      details: { previous_status: referral.status, new_status: updateData.status }
    })

    return NextResponse.json({ referral: updatedReferral })
  } catch (error: any) {
    console.error('Error in PATCH /api/referrals:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

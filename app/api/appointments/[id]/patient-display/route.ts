import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/** Returns patient display info for an appointment (bypasses RLS so provider can see patient vitals, age, gender). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: appointment, error: apptError } = await admin
      .from('appointments')
      .select('id, patient_id, doctor_id, professional_id, guest_name, guest_phone, guest_email, family_member_id, family_member_ids, booking_for_name')
      .eq('id', id)
      .maybeSingle()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const toText = (v: unknown): string | null => {
      if (v == null) return null
      if (typeof v === 'string') return v.trim() || null
      if (Array.isArray(v)) {
        const parts = v.map((x) => (typeof x === 'object' && x && 'name' in x ? (x as { name: string }).name : String(x)))
        return parts.filter(Boolean).join(', ') || null
      }
      return String(v)
    }

    // When booking for multiple family members, return family_members array with each member's vitals
    const familyMemberIds = (appointment as { family_member_ids?: string[] }).family_member_ids
    if (Array.isArray(familyMemberIds) && familyMemberIds.length > 0) {
      const { data: fms } = await admin
        .from('family_members')
        .select('id, full_name, date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications, notes_for_doctor')
        .in('id', familyMemberIds)

      const { data: parent } = await admin
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', appointment.patient_id)
        .maybeSingle()

      const familyMembers = (fms || []).map((fm) => ({
        id: fm.id,
        full_name: fm.full_name || null,
        date_of_birth: fm.date_of_birth ?? null,
        gender: fm.gender ?? null,
        blood_type: fm.blood_type ?? null,
        height_cm: fm.height_cm ?? null,
        weight_kg: fm.weight_kg ?? null,
        allergies: toText(fm.allergies) ?? null,
        chronic_conditions: toText(fm.chronic_conditions) ?? null,
        current_medications: toText(fm.current_medications) ?? null,
        notes_for_doctor: fm.notes_for_doctor ?? null,
      }))

      const namesStr = familyMembers.map((m) => m.full_name).filter(Boolean).join(', ')
      const fallbackName = (appointment as { booking_for_name?: string }).booking_for_name
      return NextResponse.json({
        full_name: namesStr || fallbackName || null,
        email: parent?.email ?? null,
        phone: parent?.phone ?? null,
        date_of_birth: familyMembers[0]?.date_of_birth ?? null,
        gender: familyMembers[0]?.gender ?? null,
        blood_type: familyMembers[0]?.blood_type ?? null,
        height_cm: familyMembers[0]?.height_cm ?? null,
        weight_kg: familyMembers[0]?.weight_kg ?? null,
        allergies: familyMembers[0]?.allergies ?? null,
        chronic_conditions: familyMembers[0]?.chronic_conditions ?? null,
        current_medications: familyMembers[0]?.current_medications ?? null,
        family_members: familyMembers,
      })
    }

    // When booking for a single family member (child), return the family member's health info as the "patient"
    if (appointment.family_member_id) {
      const { data: fm } = await admin
        .from('family_members')
        .select('full_name, date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications, notes_for_doctor')
        .eq('id', appointment.family_member_id)
        .maybeSingle()

      if (fm) {
        const { data: parent } = await admin
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', appointment.patient_id)
          .maybeSingle()

        const displayName = fm.full_name
          ? fm.full_name
          : (appointment as { booking_for_name?: string }).booking_for_name ?? null
        return NextResponse.json({
          full_name: displayName,
          email: parent?.email ?? null,
          phone: parent?.phone ?? null,
          date_of_birth: fm.date_of_birth ?? null,
          gender: fm.gender ?? null,
          blood_type: fm.blood_type ?? null,
          height_cm: fm.height_cm ?? null,
          weight_kg: fm.weight_kg ?? null,
          allergies: toText(fm.allergies) ?? null,
          chronic_conditions: toText(fm.chronic_conditions) ?? null,
          current_medications: toText(fm.current_medications) ?? null,
        })
      }
    }

    // Provider (doctor or clinic/pharmacy/lab professional) or patient or admin can request patient display
    const providerId = appointment.doctor_id ?? (appointment as { professional_id?: string }).professional_id
    const { data: prof } = providerId
      ? await admin.from('professionals').select('auth_user_id').eq('id', providerId).maybeSingle()
      : { data: null }
    const isProvider = prof?.auth_user_id === user.id
    const isPatient = appointment.patient_id === user.id
    const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
    const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin'

    if (!isProvider && !isPatient && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Guest-only (no patient_id): use guest display from row, no vitals available
    if (!appointment.patient_id) {
      return NextResponse.json({
        full_name: appointment.guest_name ?? null,
        email: appointment.guest_email ?? null,
        phone: appointment.guest_phone ?? null,
        date_of_birth: null,
        gender: null,
        blood_type: null,
        height_cm: null,
        weight_kg: null,
        allergies: null,
        chronic_conditions: null,
        current_medications: null,
      })
    }

    // Registered patient: always fetch profile for vitals (guest_* may be backfilled but we need full profile)
    const { data: patient } = await admin
      .from('profiles')
      .select('full_name, email, phone, date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
      .eq('id', appointment.patient_id)
      .maybeSingle()

    // Fallback: if profile has no vitals, use ticket metadata (vitals copied at booking time)
    let ticketVitals: Record<string, unknown> | null = null
    const hasProfileVitals = patient?.date_of_birth || patient?.gender || patient?.blood_type || patient?.allergies
    if (!hasProfileVitals) {
      const { data: ticket } = await admin
        .from('healthcare_tickets')
        .select('metadata')
        .eq('appointment_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const meta = ticket?.metadata as Record<string, unknown> | null
      if (meta && (meta.date_of_birth || meta.gender || meta.blood_type || meta.allergies)) {
        ticketVitals = meta
      }
    }

    const fromProfile = {
      full_name: patient?.full_name ?? null,
      email: patient?.email ?? null,
      phone: patient?.phone ?? null,
      date_of_birth: patient?.date_of_birth ?? null,
      gender: patient?.gender ?? null,
      blood_type: patient?.blood_type ?? null,
      height_cm: patient?.height_cm ?? null,
      weight_kg: patient?.weight_kg ?? null,
      allergies: patient?.allergies ?? null,
      chronic_conditions: patient?.chronic_conditions ?? null,
      current_medications: patient?.current_medications ?? null,
    }

    // Merge ticket vitals when profile vitals are empty
    const result = ticketVitals
      ? {
          ...fromProfile,
          date_of_birth: fromProfile.date_of_birth ?? ticketVitals.date_of_birth ?? null,
          gender: fromProfile.gender ?? ticketVitals.gender ?? null,
          blood_type: fromProfile.blood_type ?? ticketVitals.blood_type ?? null,
          height_cm: fromProfile.height_cm ?? ticketVitals.height_cm ?? null,
          weight_kg: fromProfile.weight_kg ?? ticketVitals.weight_kg ?? null,
          allergies: fromProfile.allergies ?? ticketVitals.allergies ?? null,
          chronic_conditions: fromProfile.chronic_conditions ?? ticketVitals.chronic_conditions ?? null,
          current_medications: fromProfile.current_medications ?? ticketVitals.current_medications ?? null,
        }
      : fromProfile

    return NextResponse.json(result)
  } catch (e) {
    console.error('[patient-display]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

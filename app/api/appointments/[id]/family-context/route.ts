import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/**
 * GET: Fetch family member context for an appointment
 * Returns the family member(s) profile data when the appointment is booked for family members
 * Used by doctors to see patient context (allergies, conditions, notes, etc.)
 * Supports single (family_member_id) and multiple (family_member_ids) family members
 *
 * Uses admin client for family data because RLS restricts family_members to owner only;
 * doctors need to view patient's family members when they have an appointment.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get appointment with family member(s)
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        family_member_id,
        family_member_ids,
        booking_for_name
      `)
      .eq('id', id)
      .single()

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Verify access: user is either the patient or the doctor
    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const isPatient = appointment.patient_id === user.id
    const isDoctor = professional?.id === appointment.doctor_id

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Resolve which family member IDs to fetch (appointment first, then ticket metadata fallback)
    const familyMemberIds = (appointment as { family_member_ids?: string[] }).family_member_ids
    let idsToFetch = Array.isArray(familyMemberIds) && familyMemberIds.length > 0
      ? familyMemberIds
      : appointment.family_member_id
        ? [appointment.family_member_id]
        : []

    // Fallback: when appointment has no family IDs, check ticket metadata (e.g. from older bookings)
    const admin = createAdminClient()
    if (idsToFetch.length === 0) {
      const { data: ticket } = await admin
        .from('healthcare_tickets')
        .select('metadata')
        .eq('appointment_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const meta = ticket?.metadata as { family_member_ids?: string[]; family_members_vitals?: Array<{ id: string }> } | null
      const ticketIds = Array.isArray(meta?.family_member_ids) && meta.family_member_ids.length > 0
        ? meta.family_member_ids
        : (meta?.family_members_vitals || [])
            .map((v) => v?.id)
            .filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))
      if (ticketIds.length > 0) idsToFetch = ticketIds
    }

    if (idsToFetch.length === 0) {
      return NextResponse.json({
        hasFamilyMember: false,
        familyMember: null,
        familyMembers: [],
        allergies: [],
      })
    }

    // Use admin client for family data - RLS blocks doctors from reading family_members
    // (only owner can see). Access already verified above.
    // Fetch all family members
    const { data: familyMembersData, error: fmError } = await admin
      .from('family_members')
      .select(`
        id,
        full_name,
        full_name_ar,
        date_of_birth,
        gender,
        blood_type,
        relationship,
        relationship_details,
        is_minor,
        requires_guardian,
        chifa_number,
        allergies,
        chronic_conditions,
        height_cm,
        weight_kg,
        head_circumference_cm,
        last_measured_at,
        birth_weight_kg,
        gestational_weeks,
        delivery_type,
        feeding_type,
        school_name,
        school_grade,
        special_needs,
        developmental_notes,
        notes_for_doctor,
        medical_history_notes,
        family_medical_history,
        mobility_status,
        cognitive_notes,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        family_doctor:family_doctor_id(id, business_name, specialty),
        pediatrician:pediatrician_id(id, business_name, specialty)
      `)
      .in('id', idsToFetch)

    // When family_members fetch fails, fall back to ticket metadata (vitals saved at booking)
    if (fmError || !familyMembersData?.length) {
      const { data: ticket } = await admin
        .from('healthcare_tickets')
        .select('metadata')
        .eq('appointment_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const meta = ticket?.metadata as { family_members_vitals?: Array<Record<string, unknown>> } | null
      const vitals = meta?.family_members_vitals
      if (Array.isArray(vitals) && vitals.length > 0) {
        const fromVitals = vitals.map((v) => {
          const ageYrs = (v.age_years as number) ?? (v.date_of_birth ? Math.floor((Date.now() - new Date(String(v.date_of_birth)).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null)
          const allergies = v.allergies
          const allergyArr = Array.isArray(allergies)
            ? allergies.map((a) => (typeof a === 'object' && a && 'name' in a ? (a as { name: string }).name : String(a)))
            : typeof allergies === 'string' && allergies
              ? allergies.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
              : []
          return {
            familyMember: {
              id: v.id,
              full_name: v.full_name ?? 'Family member',
              date_of_birth: v.date_of_birth ?? null,
              age: { years: ageYrs ?? 0, months: 0, days: 0, isInfant: (ageYrs ?? 0) < 2, isMinor: (ageYrs ?? 0) < 18 },
              gender: v.gender ?? null,
              blood_type: v.blood_type ?? null,
              relationship: v.relationship ?? 'Family',
              height_cm: v.height_cm ?? null,
              weight_kg: v.weight_kg ?? null,
              allergies,
              chronic_conditions: v.chronic_conditions ?? null,
              current_medications: v.current_medications ?? null,
            },
            allergies: [],
            allergiesFromProfile: allergyArr,
            recentVaccinations: [],
            recentGrowth: null,
          }
        })
        const first = fromVitals[0]
        return NextResponse.json({
          hasFamilyMember: true,
          familyMember: first?.familyMember ?? null,
          familyMembers: fromVitals,
          allergies: first?.allergies ?? [],
          allergiesFromProfile: first?.allergiesFromProfile ?? [],
          recentVaccinations: first?.recentVaccinations ?? [],
          recentGrowth: first?.recentGrowth ?? [],
        })
      }
      return NextResponse.json({
        hasFamilyMember: true,
        familyMember: null,
        familyMembers: [],
        allergies: [],
        error: 'Family member(s) not found',
      })
    }

    // Build context for each family member
    const familyMembersContext: Array<{
      familyMember: any
      allergies: any[]
      allergiesFromProfile: any[]
      recentVaccinations: any[]
      recentGrowth: any[] | null
    }> = []

    for (const fm of familyMembersData) {
      const dob = fm.date_of_birth ? new Date(fm.date_of_birth) : new Date(0)
      const now = new Date()
      const ageInDays = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24))
      const ageInMonths = Math.floor(ageInDays / 30)
      const ageInYears = Math.floor(ageInDays / 365)
      const isInfant = ageInYears < 2

      const { data: detailedAllergies } = await admin
        .from('family_allergies')
        .select('*')
        .eq('family_member_id', fm.id)
        .eq('is_active', true)
        .order('severity', { ascending: false })

      const { data: recentVaccinations } = await admin
        .from('vaccination_records')
        .select(`
          id,
          administered_date,
          vaccine:vaccine_id(code, name, name_ar, name_fr)
        `)
        .eq('family_member_id', fm.id)
        .order('administered_date', { ascending: false })
        .limit(5)

      let recentGrowth: any[] | null = null
      if (isInfant || ageInYears < 18) {
        const { data: growth } = await admin
          .from('family_growth_records')
          .select('*')
          .eq('family_member_id', fm.id)
          .order('measured_at', { ascending: false })
          .limit(3)
        recentGrowth = growth
      }

      familyMembersContext.push({
        familyMember: {
          ...fm,
          age: {
            years: ageInYears,
            months: ageInMonths,
            days: ageInDays,
            isInfant,
            isMinor: ageInYears < 18,
          },
        },
        allergies: detailedAllergies || [],
        allergiesFromProfile: fm.allergies || [],
        recentVaccinations: recentVaccinations || [],
        recentGrowth,
      })
    }

    // First member for backward compatibility (single-family UI)
    const first = familyMembersContext[0]

    return NextResponse.json({
      hasFamilyMember: true,
      familyMember: first?.familyMember ?? null,
      familyMembers: familyMembersContext,
      allergies: first?.allergies ?? [],
      allergiesFromProfile: first?.allergiesFromProfile ?? [],
      recentVaccinations: first?.recentVaccinations ?? [],
      recentGrowth: first?.recentGrowth ?? [],
    })
  } catch (e: any) {
    console.error('Family context error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

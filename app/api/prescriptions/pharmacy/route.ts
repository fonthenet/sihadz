import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/prescriptions/pharmacy
 * Returns prescriptions for the current pharmacy with patient and doctor names.
 * Uses admin client so profiles can be read (RLS would block pharmacy from reading patient profiles).
 * Supports both pharmacy owner (Supabase auth) and employees (session cookie).
 */
export async function GET(request: NextRequest) {
  try {
    // Check both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const pharmacyId = auth.pharmacyId

    const admin = createAdminClient()

    let query = admin
      .from('prescriptions')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: prescriptionsData, error } = await query.limit(100)

    if (error) {
      console.error('Pharmacy prescriptions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!prescriptionsData || prescriptionsData.length === 0) {
      return NextResponse.json({ prescriptions: [] })
    }

    const patientIds = [...new Set(prescriptionsData.map((p: any) => p.patient_id).filter(Boolean))]
    const doctorIds = [...new Set(prescriptionsData.map((p: any) => p.doctor_id).filter(Boolean))]
    const familyMemberIds = [...new Set(prescriptionsData.map((p: any) => p.family_member_id).filter(Boolean))]

    const [patientsRes, doctorsRes, familyMembersRes] = await Promise.all([
      patientIds.length > 0
        ? admin.from('profiles').select('id, full_name, phone').in('id', patientIds)
        : Promise.resolve({ data: [] }),
      doctorIds.length > 0
        ? admin.from('professionals').select('id, auth_user_id, business_name, phone').in('id', doctorIds)
        : Promise.resolve({ data: [] }),
      familyMemberIds.length > 0
        ? admin.from('family_members').select('id, full_name, date_of_birth, gender, relationship, allergies, blood_type').in('id', familyMemberIds)
        : Promise.resolve({ data: [] }),
    ])

    const patientsMap = new Map((patientsRes.data || []).map((p: any) => [p.id, p]))
    const doctorsList = doctorsRes.data || []
    const doctorAuthIds = doctorsList.map((d: any) => d.auth_user_id).filter(Boolean)
    const { data: doctorProfiles } = doctorAuthIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', doctorAuthIds)
      : { data: [] }
    const doctorProfilesMap = new Map((doctorProfiles || []).map((p: any) => [p.id, p]))

    const doctorsMap = new Map(
      doctorsList.map((d: any) => {
        const profileName = doctorProfilesMap.get(d.auth_user_id)?.full_name
        const displayName = d.business_name || profileName || null
        return [d.id, { id: d.id, business_name: displayName, phone: d.phone }]
      })
    )

    // Family members map with allergy info for drug interaction warnings
    const familyMembersMap = new Map(
      (familyMembersRes.data || []).map((fm: any) => [fm.id, {
        id: fm.id,
        full_name: fm.full_name,
        date_of_birth: fm.date_of_birth,
        gender: fm.gender,
        relationship: fm.relationship,
        allergies: fm.allergies || [],
        blood_type: fm.blood_type,
      }])
    )

    const prescriptions = prescriptionsData.map((p: any) => ({
      ...p,
      patient: patientsMap.get(p.patient_id) || null,
      doctor: doctorsMap.get(p.doctor_id) || null,
      family_member: p.family_member_id ? familyMembersMap.get(p.family_member_id) || null : null,
    }))

    return NextResponse.json({ prescriptions })
  } catch (error) {
    console.error('Pharmacy prescriptions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

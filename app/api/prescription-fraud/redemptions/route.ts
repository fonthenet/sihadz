import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/prescription-fraud/redemptions
 * List redemptions for a patient or prescription. Pharmacies and doctors can see all.
 *
 * Query params:
 *   patientId - UUID (platform patient)
 *   patientCin - CIN (walk-in)
 *   patientPhone - phone (walk-in)
 *   prescriptionId - UUID (platform prescription)
 *   prescriptionNumber - text
 *   limit - max rows (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const patientCin = searchParams.get('patientCin')
    const patientPhone = searchParams.get('patientPhone')
    const prescriptionId = searchParams.get('prescriptionId')
    const prescriptionNumber = searchParams.get('prescriptionNumber')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)

    const hasPatient = patientId || patientCin || patientPhone
    const hasPrescription = prescriptionId || prescriptionNumber
    if (!hasPatient && !hasPrescription) {
      return NextResponse.json({ error: 'Provide patient or prescription identifiers' }, { status: 400 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    const isPro = !!professional
    const isAdmin = profile?.user_type === 'super_admin' || profile?.user_type === 'admin'
    if (!isPro && !isAdmin) {
      return NextResponse.json({ error: 'Only professionals can view redemptions' }, { status: 403 })
    }

    let query = supabase
      .from('prescription_redemptions')
      .select(`
        id,
        prescription_number,
        medication_name,
        medication_index,
        quantity_dispensed,
        dispensed_at,
        source,
        patient_name,
        professionals:pharmacy_id(business_name)
      `)
      .order('dispensed_at', { ascending: false })
      .limit(limit)

    if (patientId) query = query.eq('patient_id', patientId)
    else if (patientCin) query = query.eq('patient_cin', patientCin)
    else if (patientPhone) query = query.eq('patient_phone', patientPhone)
    else if (prescriptionId) query = query.eq('prescription_id', prescriptionId)
    else if (prescriptionNumber) query = query.eq('prescription_number', prescriptionNumber)

    const { data: redemptions, error } = await query

    if (error) {
      console.error('[prescription-fraud/redemptions] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ redemptions: redemptions ?? [] })
  } catch (e) {
    console.error('[prescription-fraud/redemptions] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

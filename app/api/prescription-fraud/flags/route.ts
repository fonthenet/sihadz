import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/prescription-fraud/flags
 * List fraud flags for a patient. Doctors and pharmacies can see all flags.
 *
 * Query params:
 *   patientId - UUID (platform patient)
 *   patientCin - CIN (walk-in)
 *   patientPhone - phone (walk-in)
 *   status - filter: open, under_review, resolved, dismissed
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
    const status = searchParams.get('status')

    if (!patientId && !patientCin && !patientPhone) {
      return NextResponse.json({ error: 'At least one of patientId, patientCin, or patientPhone is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Only professionals can view fraud flags' }, { status: 403 })
    }

    let query = supabase
      .from('prescription_fraud_flags')
      .select(`
        id,
        flag_type,
        severity,
        status,
        description,
        patient_name,
        created_at,
        resolved_at,
        resolution_notes,
        flagged_by_type,
        professionals:flagged_by(business_name, type)
      `)
      .order('created_at', { ascending: false })

    if (patientId) query = query.eq('patient_id', patientId)
    else if (patientCin) query = query.eq('patient_cin', patientCin)
    else if (patientPhone) query = query.eq('patient_phone', patientPhone)

    if (status) query = query.eq('status', status)

    const { data: flags, error } = await query

    if (error) {
      console.error('[prescription-fraud/flags] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ flags: flags ?? [] })
  } catch (e) {
    console.error('[prescription-fraud/flags] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

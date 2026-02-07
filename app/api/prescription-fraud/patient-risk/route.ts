import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/prescription-fraud/patient-risk
 * Check risk level for a patient (platform or walk-in).
 * Used by pharmacies before dispensing to walk-ins.
 *
 * Query params:
 *   patientId - UUID (platform patient)
 *   patientCin - CIN (walk-in)
 *   patientPhone - phone (walk-in)
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

    if (!patientId && !patientCin && !patientPhone) {
      return NextResponse.json({ error: 'At least one of patientId, patientCin, or patientPhone is required' }, { status: 400 })
    }

    // Verify caller is professional (doctor or pharmacy)
    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Only professionals can check patient risk' }, { status: 403 })
    }

    let riskRow: { risk_level: string; risk_factors: unknown[]; blocked_reason: string | null } | null = null
    if (patientId) {
      const { data } = await supabase
        .from('patient_prescription_risk')
        .select('risk_level, risk_factors, blocked_reason')
        .eq('patient_id', patientId)
        .maybeSingle()
      riskRow = data
    } else if (patientCin) {
      const { data } = await supabase
        .from('patient_prescription_risk')
        .select('risk_level, risk_factors, blocked_reason')
        .eq('patient_cin', patientCin)
        .maybeSingle()
      riskRow = data
    } else if (patientPhone) {
      const { data } = await supabase
        .from('patient_prescription_risk')
        .select('risk_level, risk_factors, blocked_reason')
        .eq('patient_phone', patientPhone)
        .maybeSingle()
      riskRow = data
    }

    return NextResponse.json({
      riskLevel: riskRow?.risk_level ?? 'none',
      riskFactors: riskRow?.risk_factors ?? [],
      blockedReason: riskRow?.blocked_reason ?? null,
    })
  } catch (e) {
    console.error('[prescription-fraud/patient-risk] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

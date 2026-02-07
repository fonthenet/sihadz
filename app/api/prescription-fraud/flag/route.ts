import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/prescription-fraud/flag
 * Flag a patient or prescription for suspected abuse.
 * Doctors and pharmacies can create flags.
 *
 * Body: {
 *   patientId?: UUID,
 *   patientCin?: string,
 *   patientPhone?: string,
 *   patientName?: string,
 *   prescriptionId?: UUID,
 *   redemptionId?: UUID,
 *   flagType: 'double_redemption' | 'doctor_shopping' | 'suspicious_quantity' | 'forged_prescription' | 'abusive_behavior' | 'other',
 *   severity?: 'low' | 'medium' | 'high' | 'critical',
 *   description?: string,
 *   evidence?: object,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      patientId,
      patientCin,
      patientPhone,
      patientName,
      prescriptionId,
      redemptionId,
      flagType,
      severity = 'medium',
      description,
      evidence = {},
    } = body

    if (!flagType) {
      return NextResponse.json({ error: 'flagType is required' }, { status: 400 })
    }

    const validTypes = ['double_redemption', 'doctor_shopping', 'suspicious_quantity', 'forged_prescription', 'abusive_behavior', 'other']
    if (!validTypes.includes(flagType)) {
      return NextResponse.json({ error: 'Invalid flagType' }, { status: 400 })
    }

    // At least one patient identifier required
    if (!patientId && !patientCin && !patientPhone) {
      return NextResponse.json({ error: 'At least one of patientId, patientCin, or patientPhone is required' }, { status: 400 })
    }

    // Get professional (doctor or pharmacy)
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Only doctors and pharmacies can flag' }, { status: 403 })
    }

    const flaggedByType = professional.type === 'pharmacy' ? 'pharmacy' : 'doctor'

    const { data: flag, error } = await supabase
      .from('prescription_fraud_flags')
      .insert({
        flagged_by: professional.id,
        flagged_by_type: flaggedByType,
        patient_id: patientId || null,
        patient_cin: patientCin || null,
        patient_phone: patientPhone || null,
        patient_name: patientName || null,
        prescription_id: prescriptionId || null,
        redemption_id: redemptionId || null,
        flag_type: flagType,
        severity,
        description: description || null,
        evidence,
      })
      .select('id, status, created_at')
      .single()

    if (error) {
      console.error('[prescription-fraud/flag] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger update_patient_risk_on_flag updates patient_prescription_risk automatically

    return NextResponse.json({ success: true, flag: { id: flag.id, status: flag.status, created_at: flag.created_at } })
  } catch (e) {
    console.error('[prescription-fraud/flag] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

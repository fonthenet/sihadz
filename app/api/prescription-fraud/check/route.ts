import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/prescription-fraud/check
 * Check if a prescription (or medication line) can be dispensed.
 * Prevents double redemption across pharmacies.
 *
 * Query params:
 *   prescriptionId - UUID (platform prescription)
 *   prescriptionNumber - text (for walk-in or lookup)
 *   externalRef - text (for external paper RX)
 *   pharmacyId - UUID (required)
 *   medicationIndex - number (default 0)
 *   patientId - optional, for risk check
 *   patientCin - optional, for walk-in risk check
 *   patientPhone - optional, for walk-in risk check
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const prescriptionId = searchParams.get('prescriptionId')
    const prescriptionNumber = searchParams.get('prescriptionNumber')
    const externalRef = searchParams.get('externalRef')
    const pharmacyId = searchParams.get('pharmacyId')
    const medicationIndex = parseInt(searchParams.get('medicationIndex') ?? '0', 10)
    const patientId = searchParams.get('patientId')
    const patientCin = searchParams.get('patientCin')
    const patientPhone = searchParams.get('patientPhone')

    if (!pharmacyId) {
      return NextResponse.json({ error: 'pharmacyId is required' }, { status: 400 })
    }

    // Verify caller is pharmacy
    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!professional || professional.id !== pharmacyId) {
      return NextResponse.json({ error: 'Only the pharmacy can check eligibility' }, { status: 403 })
    }

    // 1. Check if prescription/line already redeemed
    if (prescriptionId) {
      const { data: existing } = await supabase
        .from('prescription_redemptions')
        .select('pharmacy_id, dispensed_at')
        .eq('prescription_id', prescriptionId)
        .eq('medication_index', medicationIndex)
        .limit(1)
        .maybeSingle()

      if (existing) {
        const { data: ph } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', existing.pharmacy_id)
          .single()
        return NextResponse.json({
          allowed: false,
          reason: 'already_dispensed',
          redeemedAt: existing.dispensed_at,
          redeemedAtPharmacy: ph?.business_name ?? 'Unknown',
        })
      }
    }

    if (prescriptionNumber || externalRef) {
      let query = supabase
        .from('prescription_redemptions')
        .select('pharmacy_id, dispensed_at')
        .eq('medication_index', medicationIndex)
        .limit(1)

      if (prescriptionNumber && externalRef) {
        query = query.or(`prescription_number.eq.${prescriptionNumber},external_prescription_ref.eq.${externalRef}`)
      } else if (prescriptionNumber) {
        query = query.eq('prescription_number', prescriptionNumber)
      } else {
        query = query.eq('external_prescription_ref', externalRef!)
      }

      const { data: existing } = await query.maybeSingle()

      if (existing) {
        const { data: ph } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('id', existing.pharmacy_id)
          .single()
        return NextResponse.json({
          allowed: false,
          reason: 'already_dispensed',
          redeemedAt: existing.dispensed_at,
          redeemedAtPharmacy: ph?.business_name ?? 'Unknown',
        })
      }
    }

    // 2. Check patient risk (if identifiers provided)
    const pid = patientId || undefined
    const cin = patientCin || undefined
    const phone = patientPhone || undefined

    if (pid || cin || phone) {
      let riskRow: { risk_level: string; blocked_reason: string | null } | null = null
      if (pid) {
        const { data } = await supabase
          .from('patient_prescription_risk')
          .select('risk_level, blocked_reason')
          .eq('patient_id', pid)
          .maybeSingle()
        riskRow = data
      } else if (cin) {
        const { data } = await supabase
          .from('patient_prescription_risk')
          .select('risk_level, blocked_reason')
          .eq('patient_cin', cin)
          .maybeSingle()
        riskRow = data
      } else if (phone) {
        const { data } = await supabase
          .from('patient_prescription_risk')
          .select('risk_level, blocked_reason')
          .eq('patient_phone', phone)
          .maybeSingle()
        riskRow = data
      }

      if (riskRow?.risk_level === 'blocked') {
        return NextResponse.json({
          allowed: false,
          reason: 'patient_flagged',
          riskLevel: riskRow.risk_level,
          blockedReason: riskRow.blocked_reason,
        })
      }

      if (riskRow?.risk_level === 'high') {
        return NextResponse.json({
          allowed: true,
          warning: 'patient_high_risk',
          riskLevel: riskRow.risk_level,
          message: 'Patient has been flagged. Proceed with caution and verify identity.',
        })
      }
    }

    return NextResponse.json({ allowed: true })
  } catch (e) {
    console.error('[prescription-fraud/check] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

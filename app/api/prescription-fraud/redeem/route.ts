import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/prescription-fraud/redeem
 * Record a prescription redemption (dispensing). Prevents double redemption.
 *
 * Body: {
 *   prescriptionId?: UUID,
 *   pharmacyId: UUID,
 *   prescriptionNumber: string,
 *   medicationIndex?: number,
 *   medicationName?: string,
 *   medicationDci?: string,
 *   quantityDispensed: number,
 *   medicationName?: string,
 *   // Patient (for walk-in)
 *   patientId?: UUID,
 *   patientCin?: string,
 *   patientPhone?: string,
 *   patientName?: string,
 *   patientDob?: string,
 *   verifiedPatientId?: boolean,
 *   // External paper RX
 *   externalPrescriptionRef?: string,
 *   source: 'platform' | 'walk_in_paper' | 'walk_in_digital',
 *   notes?: string,
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
      prescriptionId,
      pharmacyId,
      prescriptionNumber,
      medicationIndex = 0,
      medicationName,
      medicationDci,
      quantityDispensed,
      patientId,
      patientCin,
      patientPhone,
      patientName,
      patientDob,
      verifiedPatientId = false,
      externalPrescriptionRef,
      source,
      notes,
    } = body

    if (!pharmacyId || !prescriptionNumber || !source) {
      return NextResponse.json({ error: 'pharmacyId, prescriptionNumber, and source are required' }, { status: 400 })
    }

    if (!['platform', 'walk_in_paper', 'walk_in_digital'].includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    // Verify caller is pharmacy
    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!professional || professional.id !== pharmacyId) {
      return NextResponse.json({ error: 'Only the pharmacy can record redemptions' }, { status: 403 })
    }

    // For platform: verify prescription exists and belongs to this pharmacy
    if (source === 'platform' && prescriptionId) {
      const { data: prescription } = await supabase
        .from('prescriptions')
        .select('id, pharmacy_id')
        .eq('id', prescriptionId)
        .single()

      if (!prescription) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
      }
      if (prescription.pharmacy_id !== pharmacyId) {
        return NextResponse.json({ error: 'Prescription not assigned to this pharmacy' }, { status: 403 })
      }
    }

    // Insert redemption (one row per medication line)
    const { data: redemption, error } = await supabase
      .from('prescription_redemptions')
      .insert({
        prescription_id: prescriptionId || null,
        pharmacy_id: pharmacyId,
        patient_id: patientId || null,
        patient_cin: patientCin || null,
        patient_phone: patientPhone || null,
        patient_name: patientName || null,
        patient_dob: patientDob || null,
        prescription_number: prescriptionNumber,
        external_prescription_ref: externalPrescriptionRef || null,
        medication_index: medicationIndex,
        medication_name: medicationName || null,
        medication_dci: medicationDci || null,
        quantity_dispensed: quantityDispensed ?? 1,
        dispensed_by: user.id,
        verified_patient_id: verifiedPatientId,
        source,
        notes: notes || null,
      })
      .select('id, dispensed_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'already_redeemed',
          message: 'This prescription line has already been dispensed.',
        }, { status: 409 })
      }
      console.error('[prescription-fraud/redeem] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, redemption: { id: redemption.id, dispensed_at: redemption.dispensed_at } })
  } catch (e) {
    console.error('[prescription-fraud/redeem] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

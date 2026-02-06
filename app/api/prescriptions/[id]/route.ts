import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/prescriptions/[id]
 * Returns a prescription for the pharmacy assigned to it (for scan/pickup page).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: prescriptionId } = await params
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: prescription, error: presError } = await admin
      .from('prescriptions')
      .select('id, diagnosis, notes, status, medications, patient_id, doctor_id, pharmacy_id')
      .eq('id', prescriptionId)
      .single()

    if (presError || !prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    if (prescription.pharmacy_id !== professional.id) {
      return NextResponse.json({ error: 'Not authorized to view this prescription' }, { status: 403 })
    }

    const patientId = prescription.patient_id
    const doctorId = prescription.doctor_id
    const [patientRes, doctorRes] = await Promise.all([
      patientId ? admin.from('profiles').select('id, full_name, phone').eq('id', patientId).single() : { data: null },
      doctorId ? admin.from('professionals').select('id, business_name, phone').eq('id', doctorId).single() : { data: null },
    ])

    return NextResponse.json({
      prescription: {
        id: prescription.id,
        diagnosis: prescription.diagnosis,
        notes: prescription.notes,
        status: prescription.status,
        medications: prescription.medications || [],
        patient: patientRes.data || null,
        doctor: doctorRes.data || null,
      },
    })
  } catch (e: unknown) {
    console.error('GET prescription error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/prescriptions/[id]
 * Removes a prescription completely from everywhere for all parties:
 * - prescriptions row
 * - healthcare_tickets.prescription_id + status cancelled
 * - chat_threads.metadata.prescription_id
 * Allowed: only the doctor who created the prescription (no pharmacy delete).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: prescriptionId } = await params
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prescription } = await admin
      .from('prescriptions')
      .select('id, doctor_id, pharmacy_id')
      .eq('id', prescriptionId)
      .single()

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    const isDoctor = professional && professional.id === prescription.doctor_id
    if (!isDoctor) {
      return NextResponse.json({ error: 'Only the prescribing doctor can remove this prescription' }, { status: 403 })
    }

    // 1. Clear healthcare_tickets that reference this prescription
    const ticketRes = await admin
      .from('healthcare_tickets')
      .update({
        prescription_id: null,
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('prescription_id', prescriptionId)
    if (ticketRes.error) {
      console.warn('healthcare_tickets cleanup (optional):', ticketRes.error.message)
    }

    // 2. Remove prescription_id from chat_threads metadata so it doesn’t reappear
    const { data: allThreads } = await admin.from('chat_threads').select('id, metadata')
    const toUpdate = (allThreads || []).filter(
      (t: { metadata?: { prescription_id?: string } }) => t.metadata?.prescription_id === prescriptionId
    )
    for (const t of toUpdate) {
      const meta = { ...(t.metadata as Record<string, unknown> || {}) }
      delete meta.prescription_id
      await admin.from('chat_threads').update({ metadata: meta }).eq('id', t.id)
    }

    // 3. Delete the prescription row
    const { error: deleteError } = await admin
      .from('prescriptions')
      .delete()
      .eq('id', prescriptionId)

    if (deleteError) {
      console.error('Prescription delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Prescription removed everywhere' })
  } catch (e: any) {
    console.error('DELETE prescription error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

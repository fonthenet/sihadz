import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/** Per-medication fulfillment from pharmacy (does not modify original medications). */
export type PharmacyFulfillmentItem = {
  medication_index: number
  status: 'available' | 'partial' | 'out_of_stock' | 'substituted' | 'pending_approval'
  dispensed_quantity?: number
  unit_price?: number // Price in DZD
  substitute_name?: string
  substitute_dosage?: string
  substitute_manufacturer?: string
  pharmacy_notes?: string
  requires_doctor_approval?: boolean // True if substitution needs doctor approval
  doctor_approved?: boolean // Doctor approved the substitution
  doctor_approval_notes?: string // Notes from doctor when approving/rejecting
  batch_number?: string // For traceability
  expiry_date?: string // ISO date string
  back_order_date?: string // Expected availability date if out of stock
}

/**
 * PATCH /api/prescriptions/[id]/pharmacy-fulfillment
 * Body: { pharmacy_fulfillment: PharmacyFulfillmentItem[] }
 * Only the pharmacy assigned to this prescription can update. Original medications are never changed.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: prescriptionId } = await params
    const supabase = await createServerClient()
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

    const { data: prescription, error: fetchErr } = await supabase
      .from('prescriptions')
      .select('id, pharmacy_id')
      .eq('id', prescriptionId)
      .single()

    if (fetchErr || !prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    if (prescription.pharmacy_id !== professional.id) {
      return NextResponse.json({ error: 'Only the assigned pharmacy can update fulfillment' }, { status: 403 })
    }

    const body = await request.json()
    const { pharmacy_fulfillment, estimated_ready_at, total_price } = body as { 
      pharmacy_fulfillment?: PharmacyFulfillmentItem[]
      estimated_ready_at?: string | null
      total_price?: number | null
    }

    if (!Array.isArray(pharmacy_fulfillment)) {
      return NextResponse.json({ error: 'pharmacy_fulfillment must be an array' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      pharmacy_fulfillment,
      updated_at: new Date().toISOString(),
    }
    
    // Optional fields
    if (estimated_ready_at !== undefined) {
      updateData.estimated_ready_at = estimated_ready_at
    }
    if (total_price !== undefined) {
      updateData.total_price = total_price
    }

    const { error: updateErr } = await supabase
      .from('prescriptions')
      .update(updateData)
      .eq('id', prescriptionId)

    if (updateErr) {
      console.error('[pharmacy-fulfillment] Update error:', updateErr)
      return NextResponse.json({ error: updateErr.message || 'Failed to save fulfillment' }, { status: 500 })
    }

    // Send automated system message to thread
    try {
      // Get prescription details for message
      const { data: fullPrescription } = await supabase
        .from('prescriptions')
        .select('appointment_id, medications')
        .eq('id', prescriptionId)
        .single()

      if (fullPrescription?.appointment_id) {
        // Find thread for this prescription
        const { data: threads } = await supabase
          .from('chat_threads')
          .select('id')
          .eq('order_type', 'prescription')
          .or(`metadata->>prescription_id.eq.${prescriptionId},order_id.eq.${fullPrescription.appointment_id}`)
          .limit(1)

        if (threads && threads.length > 0) {
          // Build summary message
          const available = pharmacy_fulfillment.filter(f => f.status === 'available').length
          const partial = pharmacy_fulfillment.filter(f => f.status === 'partial').length
          const outOfStock = pharmacy_fulfillment.filter(f => f.status === 'out_of_stock').length
          const substituted = pharmacy_fulfillment.filter(f => f.status === 'substituted' || f.status === 'pending_approval').length
          const total = pharmacy_fulfillment.length

          let summary = `Pharmacy updated fulfillment: ${available}/${total} available`
          if (partial > 0) summary += `, ${partial} partial`
          if (outOfStock > 0) summary += `, ${outOfStock} unavailable`
          if (substituted > 0) summary += `, ${substituted} substituted`
          if (total_price) summary += `. Total: ${total_price.toLocaleString()} DZD`
          if (estimated_ready_at) summary += `. Ready: ${new Date(estimated_ready_at).toLocaleString()}`

          await supabase.from('chat_messages').insert({
            thread_id: threads[0].id,
            sender_id: user.id,
            message_type: 'system',
            content: summary,
          })
        }
      }
    } catch (msgError) {
      // Don't fail the request if message sending fails
      console.error('[pharmacy-fulfillment] Error sending system message:', msgError)
    }

    return NextResponse.json({ success: true, pharmacy_fulfillment })
  } catch (e) {
    console.error('[pharmacy-fulfillment] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/prescriptions/[id]/approve-substitution
 * Body: { medication_index: number, approved: boolean, notes?: string }
 * Only the prescribing doctor can approve/reject substitutions.
 */
export async function POST(
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

    // Get the prescription
    const { data: prescription, error: fetchErr } = await supabase
      .from('prescriptions')
      .select('id, doctor_id, pharmacy_fulfillment, medications')
      .eq('id', prescriptionId)
      .single()

    if (fetchErr || !prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    // Check if user is the prescribing doctor
    // doctor_id can be either auth_user_id or professional.id - check both
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    const isDoctor = prescription.doctor_id === user.id || 
                     (professional && prescription.doctor_id === professional.id)

    if (!isDoctor) {
      return NextResponse.json({ error: 'Only the prescribing doctor can approve substitutions' }, { status: 403 })
    }

    const body = await request.json()
    const { medication_index, approved, notes } = body as {
      medication_index: number
      approved: boolean
      notes?: string
    }

    if (typeof medication_index !== 'number' || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'medication_index and approved are required' }, { status: 400 })
    }

    // Update the pharmacy_fulfillment array
    const fulfillment = prescription.pharmacy_fulfillment || []
    const itemIndex = fulfillment.findIndex((f: any) => f.medication_index === medication_index)
    
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Medication not found in fulfillment' }, { status: 404 })
    }

    // Update the specific fulfillment item
    fulfillment[itemIndex] = {
      ...fulfillment[itemIndex],
      doctor_approved: approved,
      doctor_approval_notes: notes || undefined,
      // If approved, change status from pending_approval to substituted
      status: approved ? 'substituted' : fulfillment[itemIndex].status,
    }

    const { error: updateErr } = await supabase
      .from('prescriptions')
      .update({
        pharmacy_fulfillment: fulfillment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prescriptionId)

    if (updateErr) {
      console.error('[approve-substitution] Update error:', updateErr)
      return NextResponse.json({ error: updateErr.message || 'Failed to update' }, { status: 500 })
    }

    // Send notification message to thread if exists
    try {
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('order_type', 'prescription')
        .or(`metadata->>prescription_id.eq.${prescriptionId}`)
        .limit(1)

      if (threads && threads.length > 0) {
        const med = prescription.medications?.[medication_index]
        const medName = med?.medication_name || `Medication #${medication_index + 1}`
        const substitute = fulfillment[itemIndex].substitute_name || 'substitute'
        
        await supabase.from('chat_messages').insert({
          thread_id: threads[0].id,
          sender_id: user.id,
          message_type: 'system',
          content: approved 
            ? `Doctor approved substitution: ${substitute} for ${medName}.${notes ? ` Note: ${notes}` : ''}`
            : `Doctor rejected substitution: ${substitute} for ${medName}.${notes ? ` Reason: ${notes}` : ''}`,
        })
      }
    } catch (msgError) {
      console.error('Error sending approval message:', msgError)
    }

    return NextResponse.json({ 
      success: true, 
      approved,
      pharmacy_fulfillment: fulfillment 
    })
  } catch (e) {
    console.error('[approve-substitution] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

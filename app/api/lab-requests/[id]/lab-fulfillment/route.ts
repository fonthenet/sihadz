import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


/** Per-test fulfillment from laboratory. Standard lab result format: value, unit, reference range. */
export type LabFulfillmentItem = {
  item_id: string
  status: 'pending' | 'sample_collected' | 'processing' | 'completed' | 'failed'
  lab_notes?: string
  failed_reason?: string
  completed_at?: string
  result_value?: string
  result_unit?: string
  reference_range?: string
  result_status?: 'normal' | 'high' | 'low' | 'critical'
}

/**
 * PATCH /api/lab-requests/[id]/lab-fulfillment
 * Body: { lab_fulfillment: LabFulfillmentItem[] }
 * Only the laboratory assigned to this request can update.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labRequestId } = await params
    const supabase = await createServerClient()
    let labPro: { id: string } | null = null

    // 1. Check employee session first
    const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    if (token) {
      const session = await validateEmployeeSession(token)
      if (session?.professional) {
        labPro = { id: session.professional.id }
      }
    }

    // 2. Fall back to Supabase auth (owner)
    if (!labPro) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('type', 'laboratory')
        .single()
      labPro = data
    }

    if (!labPro) {
      return NextResponse.json({ error: 'Not authorized as laboratory' }, { status: 403 })
    }

    const { data: labRequest } = await supabase
      .from('lab_test_requests')
      .select('id, laboratory_id, status')
      .eq('id', labRequestId)
      .single()

    if (!labRequest) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    if (labRequest.laboratory_id !== labPro.id) {
      return NextResponse.json({ error: 'Only the assigned laboratory can update fulfillment' }, { status: 403 })
    }

    const body = await request.json()
    const { lab_fulfillment, assigned_technician_id, assigned_technician_name, status } = body as {
      lab_fulfillment?: LabFulfillmentItem[]
      assigned_technician_id?: string | null
      assigned_technician_name?: string | null
      status?: string
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle main request status update (for sample collection workflow)
    if (status) {
      const validRequestStatuses = ['pending', 'sent_to_lab', 'sample_collected', 'processing', 'results_ready', 'fulfilled', 'completed', 'denied', 'cancelled']
      if (!validRequestStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid request status: ${status}` }, { status: 400 })
      }
      updatePayload.status = status
    }

    // Handle per-test fulfillment updates
    if (lab_fulfillment !== undefined) {
      if (!Array.isArray(lab_fulfillment)) {
        return NextResponse.json({ error: 'lab_fulfillment must be an array' }, { status: 400 })
      }

      const validStatuses = ['pending', 'sample_collected', 'processing', 'completed', 'failed'] as const
      const validResultStatuses = ['normal', 'high', 'low', 'critical'] as const
      for (const item of lab_fulfillment) {
        if (!item.item_id || typeof item.item_id !== 'string') {
          return NextResponse.json({ error: 'Each item must have a valid item_id' }, { status: 400 })
        }
        if (!validStatuses.includes(item.status)) {
          return NextResponse.json({ error: `Invalid status: ${item.status}` }, { status: 400 })
        }
        if (item.status === 'completed' && (!item.result_value || String(item.result_value).trim() === '')) {
          return NextResponse.json({ error: 'Completed tests must have a result value' }, { status: 400 })
        }
        if (item.result_status && !validResultStatuses.includes(item.result_status)) {
          return NextResponse.json({ error: `Invalid result_status: ${item.result_status}` }, { status: 400 })
        }
      }
      updatePayload.lab_fulfillment = lab_fulfillment
    }

    // Include assigned technician if provided
    if (assigned_technician_id !== undefined) {
      updatePayload.assigned_technician_id = assigned_technician_id
      updatePayload.assigned_technician_name = assigned_technician_name || null
    }

    const { error: updateError } = await supabase
      .from('lab_test_requests')
      .update(updatePayload)
      .eq('id', labRequestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lab_fulfillment })
  } catch (e) {
    console.error('[lab-fulfillment PATCH] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

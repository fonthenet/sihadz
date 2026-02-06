import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/lab-requests/[id]
 * Returns a single lab request with items (test types). Uses admin to bypass RLS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labRequestId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: labRequest, error } = await admin
      .from('lab_test_requests')
      .select(`
        id, diagnosis, clinical_notes, priority, status, created_at, request_number, appointment_id, doctor_id, patient_id, family_member_id, lab_fulfillment,
        laboratory:professionals!laboratory_id(id, business_name, lab_report_template),
        items:lab_test_items(id, result_value, result_unit, reference_range, result_status, lab_notes, test_type:lab_test_types(id, name, name_ar, category))
      `)
      .eq('id', labRequestId)
      .maybeSingle()

    if (error || !labRequest) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    // Verify patient access (owner or guardian of family member)
    const patientId = (labRequest as { patient_id?: string }).patient_id
    if (patientId !== user.id) {
      const fmId = (labRequest as { family_member_id?: string }).family_member_id
      if (fmId) {
        const { data: fm } = await admin.from('family_members').select('guardian_user_id').eq('id', fmId).maybeSingle()
        if (!fm || (fm as { guardian_user_id?: string }).guardian_user_id !== user.id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json(labRequest)
  } catch (e) {
    console.error('[lab-requests GET] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/lab-requests/[id]
 * Update lab request (diagnosis, clinical_notes, priority, test items).
 * Uses admin for lab_test_items so edits always persist. Doctor-only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labRequestId } = await params
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: labRequest } = await admin
      .from('lab_test_requests')
      .select('id, doctor_id')
      .eq('id', labRequestId)
      .maybeSingle()

    if (!labRequest) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!professional || professional.id !== labRequest.doctor_id) {
      return NextResponse.json({ error: 'Only the requesting doctor can edit this lab request' }, { status: 403 })
    }

    const body = await request.json()
    const { diagnosis, clinicalNotes, clinical_notes, priority, testTypeIds, familyMemberId } = body

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (diagnosis !== undefined) updatePayload.diagnosis = diagnosis
    if (clinicalNotes !== undefined) updatePayload.clinical_notes = clinicalNotes
    if (clinical_notes !== undefined) updatePayload.clinical_notes = clinical_notes
    if (priority !== undefined) updatePayload.priority = priority
    if (familyMemberId !== undefined) updatePayload.family_member_id = familyMemberId || null

    const { error: updateError } = await admin
      .from('lab_test_requests')
      .update(updatePayload)
      .eq('id', labRequestId)

    if (updateError) {
      console.error('[lab-requests PATCH] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (Array.isArray(testTypeIds) && testTypeIds.length > 0) {
      await admin
        .from('lab_test_items')
        .delete()
        .eq('request_id', labRequestId)

      const itemsToInsert = testTypeIds.map((testTypeId: string) => ({
        request_id: labRequestId,
        test_type_id: testTypeId,
      }))
      const { error: itemsError } = await admin.from('lab_test_items').insert(itemsToInsert)
      if (itemsError) {
        console.error('[lab-requests PATCH] Items insert error:', itemsError)
        return NextResponse.json({ error: `Failed to save test items: ${itemsError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Lab request updated' })
  } catch (e) {
    console.error('[lab-requests PATCH] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/lab-requests/[id]
 * Removes a lab request completely from everywhere for all parties:
 * - lab_test_requests row
 * - lab_test_items (CASCADE)
 * - healthcare_tickets.lab_request_id + status cancelled
 * - chat_threads.metadata.lab_request_id
 * - notifications related to this lab request
 * Allowed: only the doctor who created the lab request.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labRequestId } = await params
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: labRequest } = await admin
      .from('lab_test_requests')
      .select('id, doctor_id, laboratory_id')
      .eq('id', labRequestId)
      .single()

    if (!labRequest) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    const isDoctor = professional && professional.id === labRequest.doctor_id
    if (!isDoctor) {
      return NextResponse.json({ error: 'Only the requesting doctor can remove this lab request' }, { status: 403 })
    }

    // 1. Delete lab_test_items (CASCADE should handle this, but explicit for clarity)
    await admin
      .from('lab_test_items')
      .delete()
      .eq('request_id', labRequestId)

    // 2. Clear healthcare_tickets that reference this lab request
    await admin
      .from('healthcare_tickets')
      .update({
        lab_request_id: null,
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('lab_request_id', labRequestId)

    // 3. Remove lab_request_id from chat_threads metadata
    const { data: allThreads } = await admin.from('chat_threads').select('id, metadata')
    const toUpdate = (allThreads || []).filter(
      (t: { metadata?: { lab_request_id?: string } }) => t.metadata?.lab_request_id === labRequestId
    )
    for (const t of toUpdate) {
      const meta = { ...(t.metadata as Record<string, unknown> || {}) }
      delete meta.lab_request_id
      await admin.from('chat_threads').update({ metadata: meta }).eq('id', t.id)
    }

    // 4. Delete notifications related to this lab request
    const { data: allNotifications } = await admin
      .from('notifications')
      .select('id, metadata')
      .or(`metadata->>'request_id'.eq.${labRequestId},metadata->>'lab_request_id'.eq.${labRequestId}`)
    if (allNotifications && allNotifications.length > 0) {
      const notificationIds = allNotifications.map((n: any) => n.id)
      await admin
        .from('notifications')
        .delete()
        .in('id', notificationIds)
    }

    // 5. Delete the lab request row
    const { error: deleteError } = await admin
      .from('lab_test_requests')
      .delete()
      .eq('id', labRequestId)

    if (deleteError) {
      console.error('Lab request delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Lab request removed everywhere' })
  } catch (e: any) {
    console.error('DELETE lab request error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

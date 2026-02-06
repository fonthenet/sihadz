/**
 * GET /api/documents/lab-request/[labRequestId] - List lab request documents
 * DELETE /api/documents/lab-request/[labRequestId] - Delete a document (query: id)
 * Access: lab, doctor, patient (RLS enforces)
 */

import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ labRequestId: string }> }
) {
  try {
    const { labRequestId } = await params
    if (!labRequestId) return NextResponse.json({ error: 'labRequestId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    const empSession = empToken ? await validateEmployeeSession(empToken) : null

    if (!user && !empSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: labReq } = await admin.from('lab_test_requests').select('id, patient_id, doctor_id, laboratory_id').eq('id', labRequestId).maybeSingle()
    if (!labReq) return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })

    const labProf = labReq.laboratory_id ? (await admin.from('professionals').select('auth_user_id').eq('id', labReq.laboratory_id).maybeSingle()).data : null
    const doctorProf = labReq.doctor_id ? (await admin.from('professionals').select('auth_user_id').eq('id', labReq.doctor_id).maybeSingle()).data : null
    const isPatient = user && labReq.patient_id === user.id
    const isDoctor = user && doctorProf && (doctorProf as { auth_user_id?: string }).auth_user_id === user.id
    const isLab = user && labProf && (labProf as { auth_user_id?: string }).auth_user_id === user.id
    const isLabEmployee = empSession?.professional?.id === labReq.laboratory_id

    if (!isPatient && !isDoctor && !isLab && !isLabEmployee) {
      return NextResponse.json({ error: 'Not authorized to view this lab request' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('lab_request_documents')
      .select('*')
      .eq('lab_request_id', labRequestId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[documents/lab-request]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ documents: data ?? [] })
  } catch (e) {
    console.error('[documents/lab-request]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ labRequestId: string }> }
) {
  try {
    const { labRequestId } = await params
    const docId = request.nextUrl.searchParams.get('id')
    if (!docId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    const empSession = empToken ? await validateEmployeeSession(empToken) : null

    if (!user && !empSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: doc } = await admin.from('lab_request_documents').select('id, lab_request_id, uploaded_by').eq('id', docId).eq('lab_request_id', labRequestId).maybeSingle()
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const { data: labReq } = await admin.from('lab_test_requests').select('laboratory_id').eq('id', labRequestId).maybeSingle()
    const labProf = labReq?.laboratory_id ? (await admin.from('professionals').select('auth_user_id').eq('id', labReq.laboratory_id).maybeSingle()).data : null
    const isUploader = user && doc.uploaded_by === user.id
    const isLabOwner = user && labProf && (labProf as { auth_user_id?: string }).auth_user_id === user.id
    const isLabEmployee = empSession?.professional?.id === labReq?.laboratory_id

    if (!isUploader && !isLabOwner && !isLabEmployee) {
      return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 })
    }

    const { error: delErr } = await admin
      .from('lab_request_documents')
      .delete()
      .eq('id', docId)
      .eq('lab_request_id', labRequestId)

    if (delErr) {
      console.error('[documents/lab-request] delete', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[documents/lab-request]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

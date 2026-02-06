/**
 * GET /api/documents/proxy?type=professional|visit|patient&id=xxx
 * Streams document file for inline viewing. Verifies user has access.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'documents'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'professional' | 'visit' | 'patient' | 'lab_request' | null
    const id = searchParams.get('id')
    const forceDownload = searchParams.get('download') === '1'

    if (!type || !id || !['professional', 'visit', 'patient', 'lab_request'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type or id' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    const empSession = empToken ? await validateEmployeeSession(empToken) : null

    if (!user && !empSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    if (type === 'professional') {
      const { data: doc, error } = await admin
        .from('professional_documents')
        .select('storage_path, file_name, file_type, professional_id')
        .eq('id', id)
        .single()

      if (error || !doc?.storage_path) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const { data: prof } = await admin.from('professionals').select('auth_user_id').eq('id', doc.professional_id).maybeSingle()
      const isOwner = user && prof?.auth_user_id === user.id
      const isEmployee = empSession?.professional?.id === doc.professional_id
      if (!isOwner && !isEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: fileData, error: downloadErr } = await admin.storage.from(BUCKET).download(doc.storage_path)
      if (downloadErr || !fileData) {
        return NextResponse.json({ error: 'Failed to load file' }, { status: 500 })
      }
      const ext = (doc.file_name || '').split('.').pop()?.toLowerCase()
      const contentType = doc.file_type === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/jpeg'
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      }
      if (forceDownload && doc.file_name) {
        headers['Content-Disposition'] = `attachment; filename="${doc.file_name.replace(/"/g, '\\"')}"`
      }
      return new NextResponse(fileData, { headers })
    }

    if (type === 'visit') {
      const { data: doc, error } = await admin
        .from('visit_documents')
        .select('storage_path, appointment_id')
        .eq('id', id)
        .single()

      if (error || !doc?.storage_path) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const { data: apt } = await admin.from('appointments').select('patient_id, doctor_id, professional_id').eq('id', doc.appointment_id).single()
      if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

      const aptData = apt as { patient_id?: string; doctor_id?: string; professional_id?: string }
      const providerId = aptData.doctor_id ?? aptData.professional_id
      const { data: prof } = providerId ? await admin.from('professionals').select('auth_user_id').eq('id', providerId).maybeSingle() : { data: null }
      const isPatient = user && aptData.patient_id === user.id
      const isDoctor = user && prof && (prof as { auth_user_id?: string }).auth_user_id === user.id
      const isEmployee = empSession?.professional?.id === providerId
      if (!isPatient && !isDoctor && !isEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: docFull } = await admin.from('visit_documents').select('file_type, file_name').eq('id', id).single()
      const { data: fileData, error: downloadErr } = await admin.storage.from(BUCKET).download(doc.storage_path)
      if (downloadErr || !fileData) {
        return NextResponse.json({ error: 'Failed to load file' }, { status: 500 })
      }
      const ext = (docFull?.file_name || '').split('.').pop()?.toLowerCase()
      const contentType = docFull?.file_type === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/jpeg'
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      }
      if (forceDownload && docFull?.file_name) {
        headers['Content-Disposition'] = `attachment; filename="${docFull.file_name.replace(/"/g, '\\"')}"`
      }
      return new NextResponse(fileData, { headers })
    }

    if (type === 'patient') {
      const { data: doc, error } = await admin
        .from('patient_documents')
        .select('storage_path, patient_id')
        .eq('id', id)
        .single()

      if (error || !doc?.storage_path) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const isPatient = user && doc.patient_id === user.id
      const { data: apt } = await admin.from('appointments').select('doctor_id').eq('patient_id', doc.patient_id).limit(1).maybeSingle()
      const { data: prof } = apt ? await admin.from('professionals').select('auth_user_id').eq('id', apt.doctor_id).maybeSingle() : { data: null }
      const isDoctor = user && prof?.auth_user_id === user.id
      const isEmployeeWithAccess = empSession?.professional?.id && apt?.doctor_id === empSession.professional.id
      if (!isPatient && !isDoctor && !isEmployeeWithAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: docFull } = await admin.from('patient_documents').select('file_type, file_name').eq('id', id).single()
      const { data: fileData, error: downloadErr } = await admin.storage.from(BUCKET).download(doc.storage_path)
      if (downloadErr || !fileData) {
        return NextResponse.json({ error: 'Failed to load file' }, { status: 500 })
      }
      const ext = (docFull?.file_name || '').split('.').pop()?.toLowerCase()
      const contentType = docFull?.file_type === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/jpeg'
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      }
      if (forceDownload && docFull?.file_name) {
        headers['Content-Disposition'] = `attachment; filename="${docFull.file_name.replace(/"/g, '\\"')}"`
      }
      return new NextResponse(fileData, { headers })
    }

    if (type === 'lab_request') {
      const { data: doc, error } = await admin
        .from('lab_request_documents')
        .select('storage_path, file_name, file_type, lab_request_id')
        .eq('id', id)
        .single()

      if (error || !doc?.storage_path) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const { data: lr } = await admin.from('lab_test_requests').select('patient_id, doctor_id, laboratory_id').eq('id', doc.lab_request_id).single()
      if (!lr) return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })

      const labProf = lr.laboratory_id ? (await admin.from('professionals').select('auth_user_id').eq('id', lr.laboratory_id).maybeSingle()).data : null
      const doctorProf = lr.doctor_id ? (await admin.from('professionals').select('auth_user_id').eq('id', lr.doctor_id).maybeSingle()).data : null
      const isPatient = user && lr.patient_id === user.id
      const isDoctor = user && doctorProf && (doctorProf as { auth_user_id?: string }).auth_user_id === user.id
      const isLab = user && labProf && (labProf as { auth_user_id?: string }).auth_user_id === user.id
      const isLabEmployee = empSession?.professional?.id === lr.laboratory_id
      if (!isPatient && !isDoctor && !isLab && !isLabEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: fileData, error: downloadErr } = await admin.storage.from(BUCKET).download(doc.storage_path)
      if (downloadErr || !fileData) {
        return NextResponse.json({ error: 'Failed to load file' }, { status: 500 })
      }
      const ext = (doc.file_name || '').split('.').pop()?.toLowerCase()
      const contentType = doc.file_type === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/jpeg'
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      }
      if (forceDownload && doc.file_name) {
        headers['Content-Disposition'] = `attachment; filename="${doc.file_name.replace(/"/g, '\\"')}"`
      }
      return new NextResponse(fileData, { headers })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e) {
    console.error('[documents/proxy]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

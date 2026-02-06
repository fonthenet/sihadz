/**
 * GET /api/documents/proxy?type=professional|visit|patient&id=xxx
 * Redirects to Vercel Blob URL after verifying user has access.
 * Now uses Vercel Blob instead of Supabase Storage.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { NextRequest, NextResponse } from 'next/server'

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
        .select('file_url, professional_id')
        .eq('id', id)
        .single()

      if (error || !doc?.file_url) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const { data: prof } = await admin.from('professionals').select('auth_user_id').eq('id', doc.professional_id).maybeSingle()
      const isOwner = user && prof?.auth_user_id === user.id
      const isEmployee = empSession?.professional?.id === doc.professional_id
      if (!isOwner && !isEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Redirect to Vercel Blob URL
      return NextResponse.redirect(doc.file_url)
    }

    if (type === 'visit') {
      const { data: doc, error } = await admin
        .from('visit_documents')
        .select('file_url, appointment_id')
        .eq('id', id)
        .single()

      if (error || !doc?.file_url) {
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

      // Redirect to Vercel Blob URL
      return NextResponse.redirect(doc.file_url)
    }

    if (type === 'patient') {
      const { data: doc, error } = await admin
        .from('patient_documents')
        .select('file_url, patient_id')
        .eq('id', id)
        .single()

      if (error || !doc?.file_url) {
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

      // Redirect to Vercel Blob URL
      return NextResponse.redirect(doc.file_url)
    }

    if (type === 'lab_request') {
      const { data: doc, error } = await admin
        .from('lab_request_documents')
        .select('file_url, lab_request_id')
        .eq('id', id)
        .single()

      if (error || !doc?.file_url) {
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

      // Redirect to Vercel Blob URL
      return NextResponse.redirect(doc.file_url)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e) {
    console.error('[documents/proxy]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

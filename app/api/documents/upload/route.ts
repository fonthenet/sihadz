/**
 * Document upload API - supports professional, visit, and patient documents
 * POST: multipart form with file, type, and relevant IDs
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'documents'
// Vercel serverless has 4.5MB body limit - keep under to avoid 413
const MAX_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

type UploadType = 'professional' | 'visit' | 'patient' | 'lab_request'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
    const empSession = empToken ? await validateEmployeeSession(empToken) : null
    if (!user && !empSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploadType = formData.get('type') as UploadType | null
    const documentType = (formData.get('documentType') as string) || 'other'
    const professionalId = formData.get('professionalId') as string | null
    const appointmentId = formData.get('appointmentId') as string | null
    const patientId = formData.get('patientId') as string | null

    if (!file || !(file instanceof File) || !uploadType) {
      return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }
    const mime = file.type
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json({ error: 'Invalid file type (use JPEG, PNG, WebP, or PDF)' }, { status: 400 })
    }

    const admin = createAdminClient()
    const ext = file.name.split('.').pop() || (mime.includes('pdf') ? 'pdf' : 'jpg')
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    let fileUrl = ''

    if (uploadType === 'professional') {
      if (!professionalId) return NextResponse.json({ error: 'professionalId required' }, { status: 400 })
      const { data: prof } = await admin.from('professionals').select('id').eq('id', professionalId).eq('auth_user_id', user.id).maybeSingle()
      const { data: emp } = await admin.from('employee_sessions').select('professional_id').eq('auth_user_id', user.id).maybeSingle()
      if (!prof && (!emp || emp.professional_id !== professionalId)) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
      const path = `professional/${professionalId}/${fileId}.${ext}`
      const buf = Buffer.from(await file.arrayBuffer())
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false })
      if (uploadErr) {
        console.error('[documents/upload]', uploadErr)
        return NextResponse.json({ error: uploadErr.message || 'Upload failed' }, { status: 500 })
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
      fileUrl = urlData.publicUrl

      const category = documentType === 'insurance' ? 'insurance' : documentType === 'national_id' ? 'license' : ['medical_records', 'lab_results', 'xrays', 'prescription'].includes(documentType) ? 'certificate' : 'other'
      const { data: doc, error: insertErr } = await admin.from('professional_documents').insert({
        professional_id: professionalId,
        category,
        document_type: documentType,
        file_name: file.name,
        file_url: fileUrl,
        file_type: mime.includes('pdf') ? 'pdf' : 'image',
        storage_path: path,
      }).select('id').single()

      if (insertErr) {
        console.error('[documents/upload] insert', insertErr)
        return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
      }
      return NextResponse.json({ id: doc.id, fileUrl, type: 'professional' })
    }

    if (uploadType === 'visit') {
      if (!appointmentId) return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })
      const { data: apt } = await admin.from('appointments').select('id, patient_id, doctor_id').eq('id', appointmentId).maybeSingle()
      if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      const { data: prof } = await admin.from('professionals').select('id').eq('id', apt.doctor_id).eq('auth_user_id', user.id).maybeSingle()
      const isPatient = apt.patient_id === user.id
      const isDoctor = !!prof
      if (!isPatient && !isDoctor) {
        return NextResponse.json({ error: 'Not authorized for this appointment' }, { status: 403 })
      }
      const path = `visit/${appointmentId}/${fileId}.${ext}`
      const buf = Buffer.from(await file.arrayBuffer())
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false })
      if (uploadErr) {
        console.error('[documents/upload]', uploadErr)
        return NextResponse.json({ error: uploadErr.message || 'Upload failed' }, { status: 500 })
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
      fileUrl = urlData.publicUrl

      const { data: doc, error: insertErr } = await admin.from('visit_documents').insert({
        appointment_id: appointmentId,
        uploaded_by: user.id,
        uploaded_by_type: isPatient ? 'patient' : 'professional',
        document_type: documentType,
        file_name: file.name,
        file_url: fileUrl,
        file_type: mime.includes('pdf') ? 'pdf' : 'image',
        storage_path: path,
      }).select('id').single()

      if (insertErr) {
        console.error('[documents/upload] insert', insertErr)
        return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
      }

      // Notify the other party: patient uploads -> notify doctor; doctor uploads -> notify patient
      const { data: profData } = await admin.from('professionals').select('auth_user_id').eq('id', apt.doctor_id).maybeSingle()
      const providerUserId = profData?.auth_user_id ?? null
      const notifyUserId = isPatient ? providerUserId : apt.patient_id
      const actionUrl = isPatient ? `/professional/dashboard/appointments/${appointmentId}` : `/dashboard/appointments/${appointmentId}`
      if (notifyUserId) {
        await admin.from('notifications').insert({
          user_id: notifyUserId,
          type: 'document_added',
          title: 'New document added',
          title_ar: 'تمت إضافة مستند جديد',
          title_fr: 'Nouveau document ajouté',
          message: isPatient
            ? `Patient added a document to your appointment.`
            : `Your doctor added a document to your appointment.`,
          message_ar: isPatient ? 'أضاف المريض مستنداً إلى موعدك.' : 'أضاف طبيبك مستنداً إلى موعدك.',
          message_fr: isPatient ? 'Le patient a ajouté un document à votre rendez-vous.' : 'Votre médecin a ajouté un document à votre rendez-vous.',
          metadata: { appointment_id: appointmentId, document_id: doc.id },
          action_url: actionUrl,
        })
      }

      return NextResponse.json({ id: doc.id, fileUrl, type: 'visit' })
    }

    if (uploadType === 'lab_request') {
      const labRequestId = formData.get('labRequestId') as string | null
      if (!labRequestId) return NextResponse.json({ error: 'labRequestId required' }, { status: 400 })
      const { data: labReq } = await admin.from('lab_test_requests').select('id, laboratory_id, patient_id, doctor_id').eq('id', labRequestId).maybeSingle()
      if (!labReq) return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
      const { data: labProf } = await admin.from('professionals').select('id, auth_user_id').eq('id', labReq.laboratory_id).maybeSingle()
      let isLab = false
      let uploaderUserId: string | null = user?.id ?? null
      if (user && labProf?.auth_user_id === user.id) {
        isLab = true
      } else if (empSession?.professional?.id === labReq.laboratory_id) {
        isLab = true
        uploaderUserId = labProf?.auth_user_id ?? user?.id ?? null
      }
      if (!isLab) return NextResponse.json({ error: 'Only the assigned laboratory can upload documents' }, { status: 403 })
      if (!uploaderUserId) return NextResponse.json({ error: 'Cannot determine uploader' }, { status: 400 })
      const path = `lab_request/${labRequestId}/${fileId}.${ext}`
      const buf = Buffer.from(await file.arrayBuffer())
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false })
      if (uploadErr) {
        console.error('[documents/upload]', uploadErr)
        return NextResponse.json({ error: uploadErr.message || 'Upload failed' }, { status: 500 })
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
      fileUrl = urlData.publicUrl
      const { data: doc, error: insertErr } = await admin.from('lab_request_documents').insert({
        lab_request_id: labRequestId,
        uploaded_by: uploaderUserId,
        document_type: documentType || 'lab_result',
        file_name: file.name,
        file_url: fileUrl,
        file_type: mime.includes('pdf') ? 'pdf' : 'image',
        storage_path: path,
      }).select('id').single()
      if (insertErr) {
        console.error('[documents/upload] insert', insertErr)
        return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
      }
      // Notify doctor and patient
      const { data: doctorProf } = labReq.doctor_id ? await admin.from('professionals').select('auth_user_id').eq('id', labReq.doctor_id).maybeSingle() : { data: null }
      const doctorUserId = (doctorProf as { auth_user_id?: string } | null)?.auth_user_id
      const actionUrl = labReq.doctor_id ? `/professional/dashboard?section=lab-requests` : `/dashboard/appointments`
      const notifyUserIds = [labReq.patient_id, doctorUserId].filter(Boolean) as string[]
      const uniqueIds = [...new Set(notifyUserIds)]
      for (const uid of uniqueIds) {
        if (uid && uid !== uploaderUserId) {
          await admin.from('notifications').insert({
            user_id: uid,
            type: 'document_added',
            title: 'Lab document added',
            title_ar: 'تمت إضافة مستند مختبر',
            title_fr: 'Document de laboratoire ajouté',
            message: 'The laboratory added a document to your lab request.',
            message_ar: 'أضاف المختبر مستنداً إلى طلب المختبر الخاص بك.',
            message_fr: 'Le laboratoire a ajouté un document à votre demande d\'analyses.',
            metadata: { lab_request_id: labRequestId, document_id: doc.id },
            action_url: actionUrl,
          })
        }
      }
      return NextResponse.json({ id: doc.id, fileUrl, type: 'lab_request' })
    }

    if (uploadType === 'patient') {
      if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })
      if (patientId !== user.id) {
        const { data: apt } = await admin.from('appointments').select('doctor_id').eq('patient_id', patientId).limit(1).maybeSingle()
        if (!apt) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        const { data: prof } = await admin.from('professionals').select('id').eq('id', apt.doctor_id).eq('auth_user_id', user.id).maybeSingle()
        if (!prof) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
      const path = `patient/${patientId}/${fileId}.${ext}`
      const buf = Buffer.from(await file.arrayBuffer())
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false })
      if (uploadErr) {
        console.error('[documents/upload]', uploadErr)
        return NextResponse.json({ error: uploadErr.message || 'Upload failed' }, { status: 500 })
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
      fileUrl = urlData.publicUrl

      const { data: doc, error: insertErr } = await admin.from('patient_documents').insert({
        patient_id: patientId,
        document_type: documentType,
        file_name: file.name,
        file_url: fileUrl,
        file_type: mime.includes('pdf') ? 'pdf' : 'image',
        storage_path: path,
      }).select('id').single()

      if (insertErr) {
        console.error('[documents/upload] insert', insertErr)
        return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
      }
      return NextResponse.json({ id: doc.id, fileUrl, type: 'patient' })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e) {
    console.error('[documents/upload]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

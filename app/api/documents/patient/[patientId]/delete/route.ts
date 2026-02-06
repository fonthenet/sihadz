/**
 * DELETE /api/documents/patient/[patientId]/delete?id=xxx - Delete patient document (patient only)
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const docId = request.nextUrl.searchParams.get('id')
    if (!docId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (patientId !== user.id) return NextResponse.json({ error: 'Can only delete your own documents' }, { status: 403 })

    const { error } = await supabase.from('patient_documents').delete().eq('id', docId).eq('patient_id', patientId)
    if (error) {
      console.error('[documents/patient/delete]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[documents/patient]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

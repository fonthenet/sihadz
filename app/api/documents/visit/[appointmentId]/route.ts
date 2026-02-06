/**
 * GET /api/documents/visit/[appointmentId] - List visit documents
 * DELETE /api/documents/visit/[appointmentId] - Delete a document (query: id)
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params
    if (!appointmentId) return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('visit_documents')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[documents/visit]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ documents: data ?? [] })
  } catch (e) {
    console.error('[documents/visit]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params
    const docId = request.nextUrl.searchParams.get('id')
    if (!docId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('visit_documents')
      .delete()
      .eq('id', docId)
      .eq('appointment_id', appointmentId)

    if (error) {
      console.error('[documents/visit] delete', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[documents/visit]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

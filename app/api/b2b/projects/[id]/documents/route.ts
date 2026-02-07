import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/b2b/projects/[id]/documents */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: documents, error } = await supabase
      .from('b2b_project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ documents: documents ?? [] })
  } catch (e) {
    console.error('[b2b/projects/[id]/documents] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/b2b/projects/[id]/documents */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, file_url, document_type = 'other' } = body

    if (!name || !file_url) {
      return NextResponse.json({ error: 'name and file_url required' }, { status: 400 })
    }

    const { data: doc, error } = await supabase
      .from('b2b_project_documents')
      .insert({
        project_id: projectId,
        name,
        file_url,
        document_type: ['nda', 'contract', 'agreement', 'other'].includes(document_type) ? document_type : 'other',
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ document: doc })
  } catch (e) {
    console.error('[b2b/projects/[id]/documents] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PATCH /api/b2b/proposals/[id] — Update proposal status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { status } = body

    if (!status || !['draft', 'sent', 'responded', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required' }, { status: 400 })
    }

    const { data: proposal, error: fetchError } = await supabase
      .from('b2b_proposals')
      .select('id, project_id')
      .eq('id', id)
      .single()

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // RLS will enforce access; we rely on it. For server-side check:
    const { data: pro } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const { data: project } = await supabase
      .from('b2b_projects')
      .select('owner_professional_id')
      .eq('id', proposal.project_id)
      .single()

    const { data: members } = await supabase
      .from('b2b_project_members')
      .select('professional_id')
      .eq('project_id', proposal.project_id)

    const isOwner = pro && project?.owner_professional_id === pro.id
    const isMember = pro && members?.some((m) => m.professional_id === pro.id)
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'sent') {
      updates.sent_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('b2b_proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[b2b/proposals/[id]] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ proposal: updated })
  } catch (e) {
    console.error('[b2b/proposals/[id]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

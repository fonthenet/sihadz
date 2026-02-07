import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getB2BProfessional } from '@/lib/b2b-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORIES = ['signature', 'payment', 'nda', 'disclosure', 'lawyer', 'authority_requirement', 'other']
const STATUSES = ['pending', 'in_progress', 'completed', 'overdue']

async function hasProjectAccess(projectId: string, professionalId: string, client: Awaited<ReturnType<typeof createAdminClient>>) {
  const { data: proj } = await client.from('b2b_projects').select('owner_professional_id').eq('id', projectId).single()
  const { data: members } = await client.from('b2b_project_members').select('professional_id').eq('project_id', projectId)
  return proj?.owner_professional_id === professionalId || members?.some((m: { professional_id: string }) => m.professional_id === professionalId)
}

/** PATCH /api/b2b/projects/[id]/actions/[actionId] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { id: projectId, actionId } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    if (isEmployee && !(await hasProjectAccess(projectId, professional.id, client))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = body.title
    if (body.action_type !== undefined) updates.action_type = body.action_type === 'major' ? 'major' : 'small'
    if (body.category !== undefined && CATEGORIES.includes(body.category)) updates.category = body.category
    if (body.responsible_professional_id !== undefined) updates.responsible_professional_id = body.responsible_professional_id || null
    if (body.responsible_external !== undefined) updates.responsible_external = body.responsible_external || null
    if (body.deadline !== undefined) updates.deadline = body.deadline || null
    if (body.status !== undefined && STATUSES.includes(body.status)) {
      updates.status = body.status
      if (body.status === 'completed') updates.completed_at = new Date().toISOString()
      else updates.completed_at = null
    }
    if (body.objectives !== undefined) updates.objectives = body.objectives
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.order_index !== undefined) updates.order_index = body.order_index

    const { data: action, error } = await client
      .from('b2b_project_actions')
      .update(updates)
      .eq('id', actionId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action })
  } catch (e) {
    console.error('[b2b/projects/.../actions/[actionId]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/b2b/projects/[id]/actions/[actionId] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { id: projectId, actionId } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    if (isEmployee && !(await hasProjectAccess(projectId, professional.id, client))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { error } = await client
      .from('b2b_project_actions')
      .delete()
      .eq('id', actionId)
      .eq('project_id', projectId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[b2b/projects/.../actions/[actionId]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

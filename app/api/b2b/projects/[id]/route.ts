import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getB2BProfessional } from '@/lib/b2b-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/b2b/projects/[id] — Get project with members, meetings, actions */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    const { data: project, error } = await client
      .from('b2b_projects')
      .select(`
        id,
        title,
        description,
        status,
        project_deadline,
        metadata,
        created_at,
        updated_at,
        owner:professionals!b2b_projects_owner_professional_id_fkey(id, business_name, type)
      `)
      .eq('id', id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const projectWithOwner = project as { owner?: { id: string } }
    const { data: members } = await client.from('b2b_project_members').select('professional_id').eq('project_id', id)
    const isOwner = projectWithOwner.owner?.id === professional.id
    const isMember = members?.some((m: { professional_id: string }) => m.professional_id === professional.id)
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const [{ data: membersList }, { data: meetings }, { data: actions }, { data: documents }] = await Promise.all([
      client.from('b2b_project_members').select(`
        id,
        role,
        is_coordinator,
        professional_id,
        external_name,
        external_email,
        external_company,
        professionals:professional_id(id, business_name)
      `).eq('project_id', id).order('created_at'),
      client.from('b2b_project_meetings').select('*').eq('project_id', id).order('meeting_date', { ascending: false }),
      client.from('b2b_project_actions').select(`
        id,
        title,
        action_type,
        category,
        responsible_professional_id,
        responsible_external,
        deadline,
        status,
        objectives,
        notes,
        completed_at,
        order_index,
        created_at,
        professionals:responsible_professional_id(id, business_name)
      `).eq('project_id', id).order('order_index').order('deadline'),
      client.from('b2b_project_documents').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      project,
      members: membersList ?? [],
      meetings: meetings ?? [],
      actions: actions ?? [],
      documents: documents ?? [],
    })
  } catch (e) {
    console.error('[b2b/projects/[id]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/b2b/projects/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    const { data: existing } = await client.from('b2b_projects').select('owner_professional_id').eq('id', id).single()
    const { data: members } = await client.from('b2b_project_members').select('professional_id').eq('project_id', id)
    const isOwner = existing?.owner_professional_id === professional.id
    const isMember = members?.some((m: { professional_id: string }) => m.professional_id === professional.id)
    if (!isOwner && !isMember) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const body = await request.json()
    const { title, description, status, project_deadline, metadata } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (status !== undefined && ['draft', 'active', 'completed', 'cancelled'].includes(status)) updates.status = status
    if (project_deadline !== undefined) updates.project_deadline = project_deadline || null
    if (metadata !== undefined) updates.metadata = metadata

    const { data: project, error } = await client
      .from('b2b_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[b2b/projects/[id]] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project })
  } catch (e) {
    console.error('[b2b/projects/[id]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/b2b/projects/[id] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    const { data: existing } = await client.from('b2b_projects').select('owner_professional_id').eq('id', id).single()
    if (existing?.owner_professional_id !== professional.id) {
      return NextResponse.json({ error: 'Only project owner can delete' }, { status: 403 })
    }

    const { error } = await client.from('b2b_projects').delete().eq('id', id)

    if (error) {
      console.error('[b2b/projects/[id]] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[b2b/projects/[id]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getB2BProfessional } from '@/lib/b2b-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function hasProjectAccess(projectId: string, professionalId: string, client: Awaited<ReturnType<typeof createAdminClient>>) {
  const { data: proj } = await client.from('b2b_projects').select('owner_professional_id').eq('id', projectId).single()
  const { data: members } = await client.from('b2b_project_members').select('professional_id').eq('project_id', projectId)
  return proj?.owner_professional_id === professionalId || members?.some((m: { professional_id: string }) => m.professional_id === professionalId)
}

/** GET /api/b2b/projects/[id]/meetings */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    if (isEmployee && !(await hasProjectAccess(projectId, professional.id, client))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: meetings, error } = await client
      .from('b2b_project_meetings')
      .select('*')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ meetings: meetings ?? [] })
  } catch (e) {
    console.error('[b2b/projects/[id]/meetings] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/b2b/projects/[id]/meetings */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = isEmployee ? createAdminClient() : supabase
    if (isEmployee && !(await hasProjectAccess(projectId, professional.id, client))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    const body = await request.json()
    const { title, meeting_date, meeting_type = 'follow_up', notes, attendees = [], next_steps = [] } = body

    if (!title || !meeting_date) {
      return NextResponse.json({ error: 'title and meeting_date required' }, { status: 400 })
    }

    const { data: meeting, error } = await client
      .from('b2b_project_meetings')
      .insert({
        project_id: projectId,
        title,
        meeting_date,
        meeting_type: ['first_call', 'follow_up', 'kickoff', 'review', 'other'].includes(meeting_type) ? meeting_type : 'follow_up',
        notes: notes || null,
        attendees: Array.isArray(attendees) ? attendees : [],
        next_steps: Array.isArray(next_steps) ? next_steps : [],
        created_by: user?.id ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ meeting })
  } catch (e) {
    console.error('[b2b/projects/[id]/meetings] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

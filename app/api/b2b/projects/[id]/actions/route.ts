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

/** GET /api/b2b/projects/[id]/actions */
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

    const { data: actions, error } = await client
      .from('b2b_project_actions')
      .select(`
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
      `)
      .eq('project_id', projectId)
      .order('order_index')
      .order('deadline')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ actions: actions ?? [] })
  } catch (e) {
    console.error('[b2b/projects/[id]/actions] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/b2b/projects/[id]/actions */
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

    const body = await request.json()
    const {
      title,
      action_type = 'small',
      category = 'other',
      responsible_professional_id,
      responsible_external,
      deadline,
      status = 'pending',
      objectives,
      notes,
      order_index = 0,
    } = body

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const { data: action, error } = await client
      .from('b2b_project_actions')
      .insert({
        project_id: projectId,
        title,
        action_type: action_type === 'major' ? 'major' : 'small',
        category: CATEGORIES.includes(category) ? category : 'other',
        responsible_professional_id: responsible_professional_id || null,
        responsible_external: responsible_external || null,
        deadline: deadline || null,
        status: STATUSES.includes(status) ? status : 'pending',
        objectives: objectives || null,
        notes: notes || null,
        order_index: typeof order_index === 'number' ? order_index : 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action })
  } catch (e) {
    console.error('[b2b/projects/[id]/actions] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

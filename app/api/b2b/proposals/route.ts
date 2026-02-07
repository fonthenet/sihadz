import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getProfessionalId(request: NextRequest, supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken) {
    const session = await validateEmployeeSession(empToken)
    if (session?.professional) return (session.professional as { id: string }).id
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: pro } = await supabase.from('professionals').select('id').eq('auth_user_id', user.id).single()
  return pro?.id ?? null
}

/** GET /api/b2b/proposals — List proposals (filter by project_id or company_id) */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const proId = await getProfessionalId(request, supabase)
    if (!proId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const companyId = searchParams.get('company_id')

    const admin = createAdminClient()
    const { data: ownedProjects } = await admin.from('b2b_projects').select('id').eq('owner_professional_id', proId)
    const { data: memberRows } = await admin.from('b2b_project_members').select('project_id').eq('professional_id', proId)
    const allowedProjectIds = new Set([
      ...(ownedProjects ?? []).map((p: { id: string }) => p.id),
      ...(memberRows ?? []).map((m: { project_id: string }) => m.project_id),
    ])

    let query = admin
      .from('b2b_proposals')
      .select(`
        id,
        project_id,
        company_id,
        status,
        sent_at,
        created_at,
        project:b2b_projects(id, title),
        company:multinational_pharma_companies(id, name, country)
      `)
      .order('created_at', { ascending: false })

    if (projectId) {
      if (!allowedProjectIds.has(projectId)) return NextResponse.json({ proposals: [] })
      query = query.eq('project_id', projectId)
    } else if (allowedProjectIds.size > 0) {
      query = query.in('project_id', Array.from(allowedProjectIds))
    } else {
      return NextResponse.json({ proposals: [] })
    }
    if (companyId) query = query.eq('company_id', companyId)

    const { data: proposals, error } = await query

    if (error) {
      console.error('[b2b/proposals] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ proposals: proposals ?? [] })
  } catch (e) {
    console.error('[b2b/proposals] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/b2b/proposals — Create proposal (link project to company) */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const admin = createAdminClient()
    const proId = await getProfessionalId(request, supabase)
    if (!proId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { project_id, company_id, status = 'draft' } = body

    if (!project_id || !company_id) {
      return NextResponse.json({ error: 'project_id and company_id required' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: project } = await admin
      .from('b2b_projects')
      .select('id, owner_professional_id')
      .eq('id', project_id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: members } = await admin
      .from('b2b_project_members')
      .select('professional_id')
      .eq('project_id', project_id)

    const isOwner = project.owner_professional_id === proId
    const isMember = members?.some((m: { professional_id: string }) => m.professional_id === proId)
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
    }

    // Verify company exists
    const { data: company } = await admin
      .from('multinational_pharma_companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check for duplicate
    const { data: existing } = await admin
      .from('b2b_proposals')
      .select('id')
      .eq('project_id', project_id)
      .eq('company_id', company_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Proposal already exists for this project and company' }, { status: 409 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: proposal, error } = await admin
      .from('b2b_proposals')
      .insert({
        project_id,
        company_id,
        status,
        created_by: user?.id ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('[b2b/proposals] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ proposal })
  } catch (e) {
    console.error('[b2b/proposals] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

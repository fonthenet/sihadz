import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getB2BProfessional } from '@/lib/b2b-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const B2B_TYPES = ['laboratory', 'pharma_supplier', 'equipment_supplier', 'pharmacy']

/** GET /api/b2b/projects — List projects for current professional */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const client = isEmployee ? createAdminClient() : supabase
    let query = client
      .from('b2b_projects')
      .select(`
        id,
        title,
        description,
        status,
        project_deadline,
        created_at,
        updated_at,
        owner:professionals!b2b_projects_owner_professional_id_fkey(id, business_name, type)
      `)
      .order('updated_at', { ascending: false })

    if (isEmployee) {
      query = query.eq('owner_professional_id', professional.id)
    }
    if (status) query = query.eq('status', status)
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)

    const { data: projects, error } = await query

    if (error) {
      console.error('[b2b/projects] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects: projects ?? [] })
  } catch (e) {
    console.error('[b2b/projects] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/b2b/projects — Create project */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { professional, isEmployee } = await getB2BProfessional(supabase, request)
    if (!professional) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!B2B_TYPES.includes(professional.type)) {
      return NextResponse.json({ error: 'Only labs and pharma companies can create B2B projects' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, status = 'draft', project_deadline, metadata } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: project, error } = await admin
      .from('b2b_projects')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        status: ['draft', 'active', 'completed', 'cancelled'].includes(status) ? status : 'draft',
        owner_professional_id: professional.id,
        project_deadline: project_deadline || null,
        metadata: metadata ?? {},
      })
      .select('id, title, status, project_deadline, created_at')
      .single()

    if (error) {
      console.error('[b2b/projects] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project })
  } catch (e) {
    console.error('[b2b/projects] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

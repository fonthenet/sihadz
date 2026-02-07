import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/b2b/projects/[id]/members */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: members, error } = await supabase
      .from('b2b_project_members')
      .select(`
        id,
        role,
        is_coordinator,
        professional_id,
        external_name,
        external_email,
        external_company,
        professionals:professional_id(id, business_name, type)
      `)
      .eq('project_id', projectId)
      .order('created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: members ?? [] })
  } catch (e) {
    console.error('[b2b/projects/[id]/members] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/b2b/projects/[id]/members */
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
    const { professional_id, role = 'member', is_coordinator = false, external_name, external_email, external_company } = body

    if (!professional_id && !external_email && !external_name) {
      return NextResponse.json({ error: 'Provide professional_id or external (name, email, company)' }, { status: 400 })
    }

    const { data: member, error } = await supabase
      .from('b2b_project_members')
      .insert({
        project_id: projectId,
        professional_id: professional_id || null,
        role,
        is_coordinator,
        external_name: external_name || null,
        external_email: external_email || null,
        external_company: external_company || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Member already exists' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ member })
  } catch (e) {
    console.error('[b2b/projects/[id]/members] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

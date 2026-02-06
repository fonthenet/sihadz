import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  let isAuthorized = false

  // 1. Check employee session first
  const token = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (token) {
    const session = await validateEmployeeSession(token)
    if (session?.professional && session.professional.id === id) {
      isAuthorized = true
    }
  }

  // 2. Fall back to Supabase auth (owner)
  if (!isAuthorized) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: prof } = await supabase
      .from('professionals')
      .select('id, auth_user_id, type')
      .eq('id', id)
      .single()
    if (prof && prof.auth_user_id === user.id) {
      isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: prof } = await supabase
    .from('professionals')
    .select('id, type')
    .eq('id', id)
    .single()

  if (!prof || (prof as any).type !== 'laboratory') {
    return NextResponse.json({ error: 'Only laboratories can manage equipment' }, { status: 400 })
  }

  const body = await request.json()
  const { lab_equipment } = body

  if (!Array.isArray(lab_equipment)) {
    return NextResponse.json({ error: 'lab_equipment must be an array' }, { status: 400 })
  }

  // Use admin client to bypass RLS
  const admin = createAdminClient()
  const { error: updateErr } = await admin
    .from('professionals')
    .update({ lab_equipment })
    .eq('id', id)

  if (updateErr) {
    console.error('[equipment/PATCH] Update error:', updateErr)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }

  return NextResponse.json({ success: true, lab_equipment })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()
  
  const { data: prof, error } = await admin
    .from('professionals')
    .select('lab_equipment')
    .eq('id', id)
    .single()

  if (error || !prof) {
    return NextResponse.json({ error: 'Professional not found' }, { status: 404 })
  }

  return NextResponse.json({ lab_equipment: prof.lab_equipment || [] })
}

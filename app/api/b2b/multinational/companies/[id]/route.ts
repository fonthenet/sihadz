import { createServerClient } from '@/lib/supabase/server'
import { validateEmployeeSession, EMPLOYEE_SESSION_COOKIE } from '@/lib/employee-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function isAuthenticated(request: NextRequest, supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const empToken = request.cookies.get(EMPLOYEE_SESSION_COOKIE)?.value
  if (empToken && (await validateEmployeeSession(empToken))) return true
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

/** GET /api/b2b/multinational/companies/[id] — Company detail + contacts + products */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    if (!(await isAuthenticated(request, supabase))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: company, error } = await supabase
      .from('multinational_pharma_companies')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const [{ data: contacts }, { data: products }, { data: proposals }] = await Promise.all([
      supabase.from('multinational_pharma_contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }),
      supabase.from('multinational_pharma_products').select('*').eq('company_id', id).order('is_highlighted', { ascending: false }).order('name').limit(50),
      supabase.from('b2b_proposals').select('id, status, sent_at, created_at, project:b2b_projects(id, title)').eq('company_id', id).order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      company,
      contacts: contacts ?? [],
      products: products ?? [],
      proposals: proposals ?? [],
    })
  } catch (e) {
    console.error('[b2b/multinational/companies/[id]] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

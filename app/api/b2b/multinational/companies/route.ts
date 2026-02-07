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

/** GET /api/b2b/multinational/companies — Search/filter companies */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    if (!(await isAuthenticated(request, supabase))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const country = searchParams.get('country')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)

    let query = supabase
      .from('multinational_pharma_companies')
      .select(`
        id,
        name,
        slug,
        short_name,
        website,
        country,
        logo_url,
        description,
        business_development_url,
        partnership_contact_url,
        hq,
        ticker,
        revenue,
        employees,
        market_cap,
        founded,
        rd_spend,
        accent_color,
        focus_areas,
        collaboration_opportunities
      `)
      .order('name')
      .limit(limit)

    if (search) {
      const s = search.trim()
      query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%,short_name.ilike.%${s}%,country.ilike.%${s}%`)
    }
    if (country) {
      query = query.eq('country', country)
    }

    const { data: companies, error } = await query

    if (error) {
      console.error('[b2b/multinational/companies] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ companies: companies ?? [] })
  } catch (e) {
    console.error('[b2b/multinational/companies] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

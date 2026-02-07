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

/** GET /api/b2b/multinational/search?q= — Global search: companies, contacts, products */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    if (!(await isAuthenticated(request, supabase))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim().toLowerCase()

    // Stats: total counts
    const [
      { count: companiesCount },
      { count: contactsCount },
      { count: productsCount },
    ] = await Promise.all([
      supabase.from('multinational_pharma_companies').select('*', { count: 'exact', head: true }),
      supabase.from('multinational_pharma_contacts').select('*', { count: 'exact', head: true }),
      supabase.from('multinational_pharma_products').select('*', { count: 'exact', head: true }),
    ])

    if (!q) {
      return NextResponse.json({
        companies: [],
        contacts: [],
        products: [],
        stats: {
          companiesCount: companiesCount ?? 0,
          contactsCount: contactsCount ?? 0,
          productsCount: productsCount ?? 0,
        },
      })
    }

    // Search companies
    const { data: companies } = await supabase
      .from('multinational_pharma_companies')
      .select(`
        id,
        name,
        slug,
        short_name,
        country,
        logo_url,
        description,
        hq,
        ticker,
        revenue,
        accent_color,
        focus_areas
      `)
      .or(`name.ilike.%${q}%,short_name.ilike.%${q}%,description.ilike.%${q}%,country.ilike.%${q}%`)
      .order('name')
      .limit(20)

    // Search contacts (with company info)
    const { data: contactsRaw } = await supabase
      .from('multinational_pharma_contacts')
      .select(`
        id,
        name,
        title,
        department,
        email,
        year_since,
        company_id,
        company:multinational_pharma_companies(short_name, accent_color)
      `)
      .or(`name.ilike.%${q}%,title.ilike.%${q}%,department.ilike.%${q}%`)
      .limit(8)

    const contacts = (contactsRaw ?? []).map((c: any) => ({
      ...c,
      co: c.company?.short_name ?? '',
      cc: c.company?.accent_color ?? '#607D8B',
      company: undefined,
    }))

    // Search products (with company info)
    const { data: productsRaw } = await supabase
      .from('multinational_pharma_products')
      .select(`
        id,
        name,
        generic_name,
        therapeutic_area,
        indication,
        sales,
        growth,
        status_badge,
        company_id,
        company:multinational_pharma_companies(short_name, accent_color)
      `)
      .or(`name.ilike.%${q}%,generic_name.ilike.%${q}%,therapeutic_area.ilike.%${q}%,indication.ilike.%${q}%`)
      .limit(12)

    const products = (productsRaw ?? []).map((p: any) => ({
      ...p,
      co: p.company?.short_name ?? '',
      cc: p.company?.accent_color ?? '#607D8B',
      company: undefined,
    }))

    return NextResponse.json({
      companies: companies ?? [],
      contacts,
      products,
      stats: {
        companiesCount: companiesCount ?? 0,
        contactsCount: contactsCount ?? 0,
        productsCount: productsCount ?? 0,
      },
    })
  } catch (e) {
    console.error('[b2b/multinational/search] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

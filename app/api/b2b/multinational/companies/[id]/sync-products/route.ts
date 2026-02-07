import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/**
 * POST /api/b2b/multinational/companies/[id]/sync-products
 * Fetch drugs from openFDA for this company and add to multinational_pharma_products.
 * openFDA applicant names may not match exactly - we use company name variations.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const supabase = await createServerClient()
    if (!(await isAuthenticated(request, supabase))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: company } = await supabase
      .from('multinational_pharma_companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const applicantNames = getApplicantNames(company.name)
    const seen = new Set<string>()
    let added = 0

    for (const applicant of applicantNames) {
      try {
        const url = `https://api.fda.gov/drug/drugsfda.json?search=sponsor_name:${encodeURIComponent(applicant)}&limit=100`
        const res = await fetch(url)
        if (!res.ok) continue
        const data = await res.json()
        const results = data.results || []

        for (const r of results) {
          const products = r.products || []
          for (const p of products) {
            const name = p.brand_name || p.active_ingredients?.[0]?.name || 'Unknown'
            const key = `${name}-${p.dosage_form || ''}-${p.route || ''}`
            if (seen.has(key)) continue
            seen.add(key)

            const { error } = await admin.from('multinational_pharma_products').insert({
              company_id: companyId,
              name,
              brand_name: p.brand_name || null,
              generic_name: p.active_ingredients?.[0]?.name || null,
              indication: p.pharm_class?.[0] || null,
              source: 'openfda',
              external_id: r.application_number || null,
              metadata: { dosage_form: p.dosage_form, route: p.route },
            })
            if (!error) added++
          }
        }
      } catch {
        // Skip on fetch error
      }
    }

    await admin
      .from('multinational_pharma_companies')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', companyId)

    return NextResponse.json({ success: true, added })
  } catch (e) {
    console.error('[b2b/multinational/companies/[id]/sync-products] Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getApplicantNames(companyName: string): string[] {
  const map: Record<string, string[]> = {
    'Johnson & Johnson': ['JOHNSON', 'JANSSEN'],
    'Eli Lilly and Company': ['LILLY', 'ELI LILLY'],
    'Sanofi': ['SANOFI'],
    'Pfizer': ['PFIZER'],
    'Novartis': ['NOVARTIS'],
    'Roche': ['ROCHE', 'GENENTECH'],
    'Senovac': ['SINOVAC'],
    '3SBio': ['3SBIO'],
    'AstraZeneca': ['ASTRAZENECA'],
    'Merck': ['MERCK'],
    'GSK': ['GLAXOSMITHKLINE', 'GsK'],
    'AbbVie': ['ABBVIE'],
    'Takeda': ['TAKEDA'],
    'Moderna': ['MODERNA'],
    'BioNTech': ['BIONTECH'],
    'Bayer': ['BAYER'],
    'Boehringer Ingelheim': ['BOEHRINGER'],
    'Amgen': ['AMGEN'],
    'Gilead Sciences': ['GILEAD'],
    'Teva Pharmaceutical': ['TEVA'],
  }
  const lower = companyName.toLowerCase()
  for (const [key, vals] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return vals
  }
  return [companyName]
}

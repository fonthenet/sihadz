import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMA_MEDICINES_URL = 'https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json'
const CACHE_MAX_AGE = 60 * 60 * 12 // 12 hours in seconds

type EMAMedicine = {
  category?: string
  name_of_medicine?: string
  ema_product_number?: string
  medicine_status?: string
  international_non_proprietary_name_common_name?: string
  active_substance?: string
  therapeutic_area_mesh?: string
  atc_code_human?: string
  pharmacotherapeutic_group_human?: string
  therapeutic_indication?: string
  marketing_authorisation_developer_applicant_holder?: string
  european_commission_decision_date?: string
  medicine_url?: string
  first_published_date?: string
  last_updated_date?: string
  [key: string]: unknown
}

/**
 * GET /api/b2b/ema/medicines?q=...
 * Search EMA medicines by drug name, active substance, or marketing authorisation holder.
 * Fetches EMA JSON (cached via response headers), filters client-side.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    if (!q) {
      return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })
    }

    // Fetch EMA medicines JSON (server may cache via headers)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000) // 45s timeout
    const resp = await fetch(EMA_MEDICINES_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Next.js: revalidate every hour
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      return NextResponse.json(
        { error: `EMA API: ${resp.status}. Try a different search or use FDA.` },
        { status: resp.status }
      )
    }

    const data = await resp.json()
    // EMA JSON can be array or { results/data/medicines: [...] }
    let items: EMAMedicine[] = []
    if (Array.isArray(data)) {
      items = data
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data
    } else if (data.medicines && Array.isArray(data.medicines)) {
      items = data.medicines
    } else if (typeof data === 'object' && data !== null) {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null && 'name_of_medicine' in (v[0] as object)) {
          items = v
          break
        }
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ results: [], cached: false })
    }

    const lower = q.toLowerCase()
    const terms = lower.split(/\s+/).filter(Boolean)
    const matches = items.filter((m: EMAMedicine) => {
      const primary = [
        m.name_of_medicine,
        m.international_non_proprietary_name_common_name,
        m.active_substance,
        m.marketing_authorisation_developer_applicant_holder,
        m.therapeutic_area_mesh,
        m.pharmacotherapeutic_group_human,
        m.therapeutic_indication,
        m.atc_code_human,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase())
        .join(' ')
      if (terms.some((t) => primary.includes(t))) return true
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith('_') || k === 'medicine_url' || v == null) continue
        const vStr = typeof v === 'string' ? v : Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')).join(' ') : ''
        if (vStr && terms.some((t) => vStr.toLowerCase().includes(t))) return true
      }
      return false
    })

    const results = matches.slice(0, 25).map((m: EMAMedicine) => ({
      source: 'ema' as const,
      name_of_medicine: m.name_of_medicine,
      ema_product_number: m.ema_product_number,
      international_non_proprietary_name_common_name: m.international_non_proprietary_name_common_name,
      active_substance: m.active_substance,
      therapeutic_area_mesh: m.therapeutic_area_mesh,
      atc_code_human: m.atc_code_human,
      pharmacotherapeutic_group_human: m.pharmacotherapeutic_group_human,
      therapeutic_indication: m.therapeutic_indication,
      marketing_authorisation_developer_applicant_holder: m.marketing_authorisation_developer_applicant_holder,
      european_commission_decision_date: m.european_commission_decision_date,
      medicine_status: m.medicine_status,
      medicine_url: m.medicine_url,
      first_published_date: m.first_published_date,
      last_updated_date: m.last_updated_date,
    }))

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate`,
        },
      }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('abort')) {
      return NextResponse.json(
        { error: 'EMA request timed out. Try FDA or a shorter search term.' },
        { status: 504 }
      )
    }
    console.error('[b2b/ema/medicines] Error:', e)
    return NextResponse.json(
      { error: `EMA unavailable: ${msg}. Try FDA.` },
      { status: 502 }
    )
  }
}

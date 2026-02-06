import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/** Searchable fields for smart multi-field matching */
const SEARCH_FIELDS = [
  'brand_name',
  'dci',
  'full_name',
  'therapeutic_class',
  'pharmacological_class',
  'manufacturer',
  'conditioning',
  'indications',
] as const

function buildSearchConditions(term: string): string {
  const escaped = term.replace(/'/g, "''")
  const pattern = `%${escaped}%`
  return SEARCH_FIELDS.map((f) => `${f}.ilike.${pattern}`).join(',')
}

/**
 * GET /api/medications/search
 * Search the national Algerian medications database (5,100+ medications) for prescriptions.
 * Used by doctors in the prescription builder.
 *
 * Query params:
 * - q: search term. Smart search across brand_name, DCI, therapeutic class, pharmacological class,
 *      manufacturer, conditioning. Multi-word queries (e.g. "dol 500") match medications containing
 *      all words in any of these fields.
 * - marketed_only: if "true", only return marketed medications (default: false = show all)
 * - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const marketedOnly = searchParams.get('marketed_only') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 150)

    if (!q) {
      return NextResponse.json({ data: [] })
    }

    const admin = createAdminClient()

    let query = admin
      .from('algerian_medications')
      .select('id, brand_name, full_name, dci, therapeutic_class, pharmacological_class, dosage_forms, strengths, conditioning, manufacturer, cnas_covered, requires_prescription, prescription_list, reference_price_dzd, public_price_dzd')
      .limit(limit)

    if (marketedOnly) {
      query = query.eq('is_marketed', true)
    }

    // Smart multi-word search: split query into words (min 2 chars), each must match in any field
    const words = q
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 || (w.length === 1 && /[A-Za-z0-9]/.test(w)))

    if (words.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Apply AND of ORs: each word must match in at least one searchable field
    for (const word of words) {
      query = query.or(buildSearchConditions(word))
    }

    query = query
      .order('cnas_covered', { ascending: false })
      .order('brand_name', { ascending: true })

    const { data: rows, error } = await query

    if (error) {
      console.error('[Medications Search] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map to prescription-builder Medication shape
    const formMap: Record<string, string> = {
      'COMP': 'tablet', 'COMP.': 'tablet', 'COMP. PELLI': 'tablet', 'COMP. SEC': 'tablet',
      'COMP. EFFERV': 'tablet', 'COMP. ORODISPERS': 'tablet',
      'GLES': 'capsule', 'GLES.': 'capsule', 'GÉLULE': 'capsule', 'CAPS': 'capsule', 'CAPS. MOLLE': 'capsule',
      'SIROP': 'syrup', 'SOL. BUV': 'solution', 'SOL. INJ': 'injection', 'PDRE. SOL. INJ': 'injection',
      'CRÈME': 'cream', 'PDE. DERM': 'ointment', 'GEL': 'gel', 'COLLYRE': 'drops', 'AERO': 'inhaler',
      'SPRAY': 'spray', 'SUPPO': 'suppository', 'PDRE': 'powder', 'AMP. BUV': 'solution',
    }

    const data = (rows || []).map((m: any) => {
      let form = 'other'
      if (m.dosage_forms && m.dosage_forms.length > 0) {
        const key = (m.dosage_forms[0] || '').toUpperCase()
        form = formMap[key] || key.toLowerCase() || 'other'
      }
      const dosage = Array.isArray(m.strengths) && m.strengths.length > 0
        ? m.strengths.join(', ')
        : (m.conditioning || '')
      return {
        id: m.id,
        commercial_name: m.brand_name,
        commercial_name_ar: undefined,
        dci_name: m.dci || undefined,
        dci_name_ar: undefined,
        form,
        form_ar: undefined,
        dosage: dosage || '1',
        manufacturer: m.manufacturer || undefined,
        is_chifa_listed: !!m.cnas_covered,
        reimbursement_rate: m.cnas_covered ? 80 : 0,
        reimbursement_category: undefined,
        therapeutic_class: m.therapeutic_class || undefined,
        is_controlled: m.prescription_list === 'Liste I',
        requires_prescription: !!m.requires_prescription,
        prix_public: m.public_price_dzd ?? m.reference_price_dzd,
        tarif_reference: m.reference_price_dzd,
      }
    })

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[Medications Search] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

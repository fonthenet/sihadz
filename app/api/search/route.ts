/**
 * GET /api/search
 * Full platform search - doctors, pharmacies, labs, clinics
 * Query params: q (search term), location (wilaya code)
 * When location is empty = All Wilayas
 * Wilaya in DB can be code ("16") or name ("Alger", "Jijel") - we match both
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWilayaByCode } from '@/lib/data/algeria-locations'

const TYPE_KEYWORDS: Record<string, string[]> = {
  pharmacy: ['pharmacie', 'pharmacy', 'صيدلية', 'صيدليات'],
  doctor: ['docteur', 'doctor', 'médecin', 'طبيب', 'أطباء', 'medecin'],
  nurse: ['nurse', 'infirmier', 'infirmière', 'ممرض', 'ممرضة', 'ممرضين'],
  laboratory: ['lab', 'laboratoire', 'labo', 'مختبر', 'مختبرات', 'laboratory'],
  clinic: ['clinique', 'عيادة', 'عيادات', 'clinic'],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const location = (searchParams.get('location') || '').trim() // wilaya code, empty = all wilayas
    const professionalType = (searchParams.get('professionalType') || '').trim().toLowerCase()

    const admin = createAdminClient()

    // Filter by professional type when specified (doctor, nurse, pharmacy, laboratory, clinic)
    const types = ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic'] as const
    const requestedTypes = professionalType && types.includes(professionalType as any)
      ? [professionalType]
      : ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic']

    let query = admin
      .from('professionals')
      .select('id, auth_user_id, business_name, business_name_ar, type, specialties, wilaya, commune, address_line1, rating, review_count, working_hours')
      .eq('is_active', true)
      .eq('status', 'verified')
      .in('type', requestedTypes)

    // Filter by wilaya when specified - DB stores both code ("16") and name ("Alger", "Jijel")
    if (location) {
      const code = location.padStart(2, '0')
      const wilaya = getWilayaByCode(code)
      if (wilaya) {
        // Match code OR name (fr/en) - case insensitive for names
        const orParts = [`wilaya.eq.${code}`]
        if (wilaya.nameFr) orParts.push(`wilaya.ilike.${wilaya.nameFr}`)
        if (wilaya.nameEn && wilaya.nameEn !== wilaya.nameFr) orParts.push(`wilaya.ilike.${wilaya.nameEn}`)
        query = query.or(orParts.join(','))
      } else {
        query = query.or(`wilaya.eq.${code},wilaya.ilike.${location}`)
      }
    }

    const { data: pros, error } = await query

    if (error) {
      console.error('[Search API] Error:', error)
      return NextResponse.json({ professionals: [] }, { status: 500 })
    }

    // Client-side filtering by search term (name, specialty, type)
    let filtered = pros || []
    if (q.length >= 1) {
      filtered = filtered.filter((p: any) => {
        const name = (p.business_name || '').toLowerCase()
        const nameAr = (p.business_name_ar || '').toLowerCase()
        const commune = (p.commune || '').toLowerCase()
        const address = (p.address_line1 || '').toLowerCase()
        const wilayaVal = (p.wilaya || '').toLowerCase()
        const specs = Array.isArray(p.specialties) ? p.specialties : []
        const specMatch = specs.some((s: string) => (s || '').toLowerCase().includes(q))
        // Type matching: "pharmacy" / "pharmacie" matches type=pharmacy
        const typeKeywords = TYPE_KEYWORDS[p.type] || []
        const typeMatch = typeKeywords.some(kw => q.includes(kw) || kw.includes(q))
        return (
          name.includes(q) ||
          nameAr.includes(q) ||
          commune.includes(q) ||
          address.includes(q) ||
          wilayaVal.includes(q) ||
          specMatch ||
          typeMatch
        )
      })
    }

    return NextResponse.json({ professionals: filtered })
  } catch (err: any) {
    console.error('[Search API] Error:', err)
    return NextResponse.json({ professionals: [] }, { status: 500 })
  }
}

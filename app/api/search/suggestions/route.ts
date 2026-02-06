/**
 * GET /api/search/suggestions
 * Autocomplete/suggestions for healthcare search
 * Searches: doctors, clinics, pharmacies, labs by name, specialty, facility type
 * Supports fuzzy matching, wilaya search, and multi-language
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { algeriaWilayas } from '@/lib/data/algeria-locations'

const LIMIT = 12
const MIN_QUERY_LENGTH = 1

// All specialties with multilingual labels and search keywords
const SPECIALTY_CONFIG: Record<string, { en: string; fr: string; ar: string; keywords: string[] }> = {
  cardiology: { en: 'Cardiologist', fr: 'Cardiologue', ar: 'طب القلب', keywords: ['cardio', 'قلب', 'cœur', 'heart'] },
  dentistry: { en: 'Dentist', fr: 'Dentiste', ar: 'طب الأسنان', keywords: ['dent', 'أسنان', 'dentaire', 'teeth'] },
  dermatology: { en: 'Dermatologist', fr: 'Dermatologue', ar: 'الأمراض الجلدية', keywords: ['dermato', 'جلد', 'peau', 'skin'] },
  gynecology: { en: 'Gynecologist', fr: 'Gynécologue', ar: 'أمراض النساء', keywords: ['gynéco', 'نساء', 'femme', 'gynec'] },
  ophthalmology: { en: 'Ophthalmologist', fr: 'Ophtalmologue', ar: 'طب العيون', keywords: ['ophtalmo', 'عيون', 'œil', 'eye'] },
  pediatrics: { en: 'Pediatrician', fr: 'Pédiatre', ar: 'طب الأطفال', keywords: ['pédiatre', 'أطفال', 'enfant', 'child'] },
  general: { en: 'General Practitioner', fr: 'Généraliste', ar: 'الطب العام', keywords: ['général', 'عام', 'general', 'médecin', 'gp'] },
  ent: { en: 'ENT Specialist', fr: 'ORL', ar: 'أنف أذن حنجرة', keywords: ['orl', 'أنف', 'oreille', 'ear', 'nose'] },
  psychiatry: { en: 'Psychiatrist', fr: 'Psychiatre', ar: 'الطب النفسي', keywords: ['psych', 'نفس', 'mental', 'psy'] },
  orthopedics: { en: 'Orthopedist', fr: 'Orthopédiste', ar: 'جراحة العظام', keywords: ['ortho', 'عظام', 'os', 'bone'] },
  neurology: { en: 'Neurologist', fr: 'Neurologue', ar: 'طب الأعصاب', keywords: ['neuro', 'أعصاب', 'nerve'] },
  urology: { en: 'Urologist', fr: 'Urologue', ar: 'طب المسالك البولية', keywords: ['uro', 'مسالك', 'urinaire'] },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({
        professionals: [],
        specialties: [],
        wilayas: [],
      })
    }

    const qLower = q.toLowerCase()

    const admin = createAdminClient()

    // Build search pattern for ilike
    const pattern = `%${q}%`

    // 1. Search professionals - status 'verified' only (enum has no 'approved')
    let professionals: any[] = []
    let specialtyPros: any[] = []

    try {
      const [nameRes, specialtyRes] = await Promise.all([
        admin
          .from('professionals')
          .select('id, business_name, business_name_ar, type, specialties, wilaya, commune')
          .eq('is_active', true)
          .eq('status', 'verified')
          .or(`business_name.ilike.${pattern},business_name_ar.ilike.${pattern},commune.ilike.${pattern},address_line1.ilike.${pattern}`)
          .limit(LIMIT),
        admin
          .from('professionals')
          .select('id, business_name, business_name_ar, type, specialties, wilaya, commune')
          .eq('is_active', true)
          .eq('status', 'verified')
          .limit(80),
      ])
      professionals = nameRes.data || []
      specialtyPros = specialtyRes.data || []
    } catch (err) {
      // Fallback: try without address_line1 in case column differs
      try {
        const [nameRes, specialtyRes] = await Promise.all([
          admin
            .from('professionals')
            .select('id, business_name, business_name_ar, type, specialties, wilaya, commune')
            .eq('is_active', true)
            .eq('status', 'verified')
            .or(`business_name.ilike.${pattern},business_name_ar.ilike.${pattern},commune.ilike.${pattern}`)
            .limit(LIMIT),
          admin
            .from('professionals')
            .select('id, business_name, business_name_ar, type, specialties, wilaya, commune')
            .eq('is_active', true)
            .eq('status', 'verified')
            .limit(80),
        ])
        professionals = nameRes.data || []
        specialtyPros = specialtyRes.data || []
      } catch {
        // Ignore - professionals stay empty
      }
    }

    const prosWithMatchingSpecialty = specialtyPros.filter((p: any) => {
      const specs = Array.isArray(p.specialties) ? p.specialties : []
      return specs.some((s: string) => s?.toLowerCase().includes(qLower))
    })

    const typeKeywords: Record<string, string[]> = {
      pharmacy: ['pharmacie', 'pharmacy', 'صيدلية'],
      doctor: ['docteur', 'doctor', 'médecin', 'طبيب'],
      laboratory: ['lab', 'laboratoire', 'labo', 'مختبر'],
      clinic: ['clinique', 'عيادة'],
    }
    const prosWithMatchingType = specialtyPros.filter((p: any) => {
      const keywords = typeKeywords[p.type] || []
      return keywords.some(kw => qLower.includes(kw) || kw.includes(qLower))
    })

    // Combine and dedupe professionals
    const seen = new Set<string>()
    const uniquePros = [...professionals, ...prosWithMatchingSpecialty, ...prosWithMatchingType].filter((p: any) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    }).slice(0, LIMIT)

    // 2. Match specialties by keywords (fuzzy)
    const matchedSpecialties = Object.entries(SPECIALTY_CONFIG)
      .filter(([, config]) =>
        config.keywords.some(kw => qLower.includes(kw) || kw.includes(qLower) || config.en.toLowerCase().includes(qLower) || config.fr.toLowerCase().includes(qLower) || config.ar.includes(q))
      )
      .slice(0, 6)
      .map(([key, config]) => ({ key, en: config.en, fr: config.fr, ar: config.ar }))

    // 3. Wilaya search - match by name in all languages (fr, ar, en)
    const matchedWilayas = algeriaWilayas
      .filter(w =>
        w.nameFr.toLowerCase().includes(qLower) ||
        w.nameAr.includes(q) ||
        w.nameEn.toLowerCase().includes(qLower) ||
        w.code.includes(q)
      )
      .slice(0, 6)
      .map(w => ({
      code: w.code,
      nameFr: w.nameFr,
      nameAr: w.nameAr,
      nameEn: w.nameEn,
    }))

    return NextResponse.json({
      professionals: uniquePros.map((p: any) => ({
        id: p.id,
        name: p.business_name,
        nameAr: p.business_name_ar,
        type: p.type,
        specialty: Array.isArray(p.specialties)?.[0] || null,
        wilaya: p.wilaya,
        commune: p.commune,
      })),
      specialties: matchedSpecialties,
      wilayas: matchedWilayas,
    })
  } catch (error: any) {
    console.error('[Search suggestions] Error:', error)
    return NextResponse.json(
      { professionals: [], specialties: [], wilayas: [] },
      { status: 500 }
    )
  }
}

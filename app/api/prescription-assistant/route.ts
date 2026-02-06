'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { diagnosis, symptoms, patientAge, patientGender, currentMedications, specialNotes } = body

    if (!diagnosis && !symptoms) {
      return NextResponse.json(
        { error: 'Diagnosis or symptoms required' },
        { status: 400 }
      )
    }

    if (!hasAiProvider()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a professional (doctor) - professionals table uses "type" column
    const admin = createAdminClient()
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type, specialty')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!prof || prof.type !== 'doctor') {
      return NextResponse.json({ error: 'Access denied. Doctors only.' }, { status: 403 })
    }

    // Fetch relevant Algerian medications from full database (5,100+ medications)
    const searchTerms = `${diagnosis || ''} ${symptoms || ''}`.toLowerCase()
    
    // Map symptoms/diagnoses to therapeutic classes
    const therapeuticMap: Record<string, string[]> = {
      'infection|bactérie|bacterial': ['INFECTIOLOGIE'],
      'douleur|pain|ache': ['ANTALGIQUES', 'ANTI-INFLAMMATOIRES'],
      'fever|fièvre': ['ANTALGIQUES'],
      'toux|cough': ['PNEUMOLOGIE', 'ORL'],
      'asthma|asthme|respir': ['PNEUMOLOGIE'],
      'gastric|stomach|estomac|digest|ulcer|ulcère': ['GASTRO-ENTEROLOGIE'],
      'nausea|nausée|vomit': ['GASTRO-ENTEROLOGIE'],
      'diabetes|diabète|glyc': ['METABOLISME NUTRITION DIABETE'],
      'hypertension|tension|blood pressure': ['CARDIOLOGIE ET ANGEIOLOGIE'],
      'heart|coeur|cardio': ['CARDIOLOGIE ET ANGEIOLOGIE'],
      'anxiety|anxiété|stress': ['PSYCHIATRIE'],
      'depression|dépression': ['PSYCHIATRIE'],
      'insomnia|insomnie|sleep|sommeil': ['PSYCHIATRIE'],
      'skin|peau|dermato|eczema|acne': ['DERMATOLOGIE'],
      'eye|oeil|opht': ['OPHTALMOLOGIE'],
      'ear|oreille|otite': ['ORL', 'OTOLOGIE'],
      'throat|gorge|angine': ['ORL', 'INFECTIOLOGIE'],
      'allergy|allergie': ['ALLERGOLOGIE'],
      'arthrit|rhumat|joint|articul': ['RHUMATOLOGIE'],
      'anemia|anémie': ['HEMATOLOGIE ET HEMOSTASE'],
      'thyroid|thyroïde': ['METABOLISME NUTRITION DIABETE'],
      'cancer|tumor|tumeur': ['CANCEROLOGIE'],
    }

    const matchingClasses = new Set<string>()
    for (const [pattern, classes] of Object.entries(therapeuticMap)) {
      if (new RegExp(pattern, 'i').test(searchTerms)) {
        classes.forEach(c => matchingClasses.add(c))
      }
    }

    // Default to common classes if nothing specific matched
    if (matchingClasses.size === 0) {
      matchingClasses.add('ANTALGIQUES')
      matchingClasses.add('INFECTIOLOGIE')
      matchingClasses.add('GASTRO-ENTEROLOGIE')
    }

    // Query the full Algerian medications database
    const classArray = Array.from(matchingClasses)
    const orConditions = classArray.map(c => `therapeutic_class.ilike.%${c}%`).join(',')
    
    const { data: algerianMeds } = await admin
      .from('algerian_medications')
      .select('brand_name, dci, therapeutic_class, pharmacological_class, dosage_forms, strengths, conditioning, cnas_covered, requires_prescription, prescription_list, price_range, public_price_dzd, reference_price_dzd, country_origin, manufacturer')
      .or(orConditions)
      .eq('is_marketed', true)
      .order('cnas_covered', { ascending: false }) // CNAS covered medications first
      .limit(40)

    const medContext = algerianMeds?.length 
      ? `\n\n## ALGERIAN MEDICATIONS DATABASE (${algerianMeds.length} relevant medications):\n${algerianMeds.map(m => {
          const price = m.public_price_dzd || m.reference_price_dzd
          return `• ${m.brand_name} (${m.dci || 'N/A'})
  Classe: ${m.therapeutic_class} / ${m.pharmacological_class || ''}
  Formes: ${m.dosage_forms?.join(', ') || 'N/A'} | Dosages: ${m.strengths?.join(', ') || 'N/A'}
  Conditionnement: ${m.conditioning || 'N/A'}
  CNAS: ${m.cnas_covered ? '✓ REMBOURSÉ' : '✗ Non remboursé'} | Liste: ${m.prescription_list || 'N/A'}
  Prix: ${price ? `${price} DZD` : m.price_range || 'N/A'}
  Fabricant: ${m.manufacturer || 'N/A'} (${m.country_origin || 'N/A'})`
        }).join('\n\n')}`
      : '\n\nUse standard Algerian/European market medications (Doliprane, Augmentin, Spasfon, etc.).'

    const prompt = `You are a clinical pharmacist assistant helping doctors in Algeria prescribe medications. 

## Clinical Context
- Diagnosis: ${diagnosis || 'Not specified'}
- Symptoms: ${symptoms || 'Not specified'}
- Patient Age: ${patientAge || 'Not specified'}
- Patient Gender: ${patientGender || 'Not specified'}
- Current Medications: ${currentMedications?.join(', ') || 'None'}
- Special Notes: ${specialNotes || 'None'}
- Doctor Specialty: ${prof.specialty || 'General'}

${medContext}

## Instructions
Suggest appropriate medications for this patient. STRICT RULES:
1. USE ONLY medications from the ALGERIAN MEDICATIONS DATABASE above
2. Include the exact brand name, DCI, dosage, and price from the database
3. Prefer CNAS-covered medications (marked with ✓) to help patient save money
4. Include price ranges in DZD
5. NEVER recommend USA-only medications (no Tylenol, Advil, Motrin, NyQuil, etc.)
6. Check for interactions with current medications

Return a JSON response:
{
  "suggestions": [
    {
      "medication_name": "Commercial name in Algeria",
      "dci_name": "Generic/DCI name",
      "form": "tablet/syrup/injection/etc",
      "dosage": "500mg/1g/etc",
      "frequency": "twice daily/etc",
      "duration": "7 days/etc",
      "route": "oral/IV/IM/etc",
      "instructions": "Take with food/etc",
      "rationale": "Why this medication",
      "is_first_line": true/false,
      "chifa_eligible": true/false/unknown,
      "alternatives": ["Alternative 1", "Alternative 2"]
    }
  ],
  "warnings": ["Any prescribing warnings"],
  "monitoring": ["Parameters to monitor"],
  "patient_education": ["Key points to explain to patient"]
}

Be concise. Limit to 3-5 most appropriate medications.`

    const { text, provider } = await generateWithFallback(prompt, 2000)

    let suggestions
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        suggestions = { raw: text, suggestions: [] }
      }
    } catch {
      suggestions = { raw: text, suggestions: [] }
    }

    return NextResponse.json({
      success: true,
      ...suggestions,
      provider,
      disclaimer: 'AI suggestions for reference only. Clinical judgment required.'
    })

  } catch (error: any) {
    console.error('[Prescription Assistant] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

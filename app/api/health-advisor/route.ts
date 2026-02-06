'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { question, context } = body

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
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

    const admin = createAdminClient()

    // ========== FETCH COMPREHENSIVE PATIENT DATA ==========
    
    // 1. Full patient profile
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, date_of_birth, gender, blood_type, allergies, phone, city, wilaya')
      .eq('id', user.id)
      .single()

    const age = profile?.date_of_birth
      ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    // 2. Recent appointments/visits (last 10)
    const { data: recentAppointments } = await admin
      .from('appointments')
      .select(`
        id, date, time, status, reason, notes,
        professional:professional_id (full_name, specialty)
      `)
      .eq('patient_id', user.id)
      .in('status', ['completed', 'confirmed', 'scheduled'])
      .order('date', { ascending: false })
      .limit(10)

    // 3. Recent prescriptions with diagnoses (last 10)
    const { data: recentRx } = await admin
      .from('prescriptions')
      .select('medications, diagnosis, notes, created_at')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 4. Lab test results (last 10)
    const { data: labTests } = await admin
      .from('lab_test_requests')
      .select('test_name, results, status, notes, created_at, ai_explanation')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 5. Family members with health info
    const { data: familyMembers } = await admin
      .from('family_members')
      .select(`
        full_name, relationship, date_of_birth, gender, blood_type,
        allergies, chronic_conditions, current_medications, notes_for_doctor,
        height_cm, weight_kg, is_minor
      `)
      .eq('user_id', user.id)

    // 6. Family allergies
    const familyMemberIds = familyMembers?.map(f => f.full_name) || []
    const { data: familyAllergies } = await admin
      .from('family_allergies')
      .select('allergen, severity, reaction, family_member_id')
      .in('family_member_id', familyMembers?.map((_, i) => familyMembers[i]) ? 
        (await admin.from('family_members').select('id').eq('user_id', user.id)).data?.map(f => f.id) || [] : [])

    // 7. Referrals
    const { data: referrals } = await admin
      .from('referrals')
      .select('specialty, reason, notes, urgency, created_at')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // 8. Search Algerian medications database (5,100+ medications)
    const questionLower = question.toLowerCase()
    
    // Map symptoms/conditions to therapeutic classes for better search
    const therapeuticKeywords: Record<string, string[]> = {
      'headache|mal de tête|migraine|céphalée': ['ANTALGIQUES', 'ANTI-INFLAMMATOIRES'],
      'douleur|pain|ache': ['ANTALGIQUES', 'ANTI-INFLAMMATOIRES'],
      'fever|fièvre|température': ['ANTALGIQUES'],
      'cough|toux': ['PNEUMOLOGIE', 'ORL'],
      'cold|rhume|grippe|flu': ['PNEUMOLOGIE', 'ORL', 'ALLERGOLOGIE'],
      'allergy|allergie': ['ALLERGOLOGIE', 'DERMATOLOGIE'],
      'stomach|estomac|gastric|digestion': ['GASTRO-ENTEROLOGIE'],
      'nausea|nausée|vomit': ['GASTRO-ENTEROLOGIE'],
      'diarrhea|diarrhée': ['GASTRO-ENTEROLOGIE'],
      'constipation': ['GASTRO-ENTEROLOGIE'],
      'infection|bactérie': ['INFECTIOLOGIE'],
      'throat|gorge|angine': ['ORL', 'INFECTIOLOGIE'],
      'ear|oreille|otite': ['ORL', 'OTOLOGIE'],
      'diabetes|diabète|glycémie|sugar': ['METABOLISME NUTRITION DIABETE'],
      'heart|coeur|cardiaque': ['CARDIOLOGIE ET ANGEIOLOGIE'],
      'blood pressure|tension|hypertension': ['CARDIOLOGIE ET ANGEIOLOGIE'],
      'cholesterol': ['CARDIOLOGIE ET ANGEIOLOGIE'],
      'anxiety|anxiété|stress|angoisse': ['PSYCHIATRIE'],
      'sleep|sommeil|insomnie|insomnia': ['PSYCHIATRIE'],
      'depression|dépression': ['PSYCHIATRIE'],
      'skin|peau|rash|éruption|eczema|acne': ['DERMATOLOGIE'],
      'eye|oeil|yeux|vision': ['OPHTALMOLOGIE'],
      'vitamin|vitamine|fatigue|tired|fatigué': ['METABOLISME NUTRITION DIABETE'],
      'bone|os|articulation|joint|arthrite': ['RHUMATOLOGIE'],
      'asthma|asthme|respiration|breathing': ['PNEUMOLOGIE'],
      'cancer|tumeur': ['CANCEROLOGIE'],
      'anemia|anémie|blood|sang': ['HEMATOLOGIE ET HEMOSTASE'],
    }

    // Find matching therapeutic classes
    const matchingClasses = new Set<string>()
    for (const [pattern, classes] of Object.entries(therapeuticKeywords)) {
      if (new RegExp(pattern, 'i').test(questionLower)) {
        classes.forEach(c => matchingClasses.add(c))
      }
    }

    // Query medications from the full Algerian database
    let algerianMeds: any[] = []
    
    if (matchingClasses.size > 0) {
      // Search by therapeutic class
      const classArray = Array.from(matchingClasses)
      const orConditions = classArray.map(c => `therapeutic_class.ilike.%${c}%`).join(',')
      
      const { data: meds } = await admin
        .from('algerian_medications')
        .select('brand_name, dci, therapeutic_class, pharmacological_class, strengths, conditioning, cnas_covered, requires_prescription, price_range, public_price_dzd, reference_price_dzd, country_origin, manufacturer')
        .or(orConditions)
        .eq('is_marketed', true)
        .order('cnas_covered', { ascending: false }) // CNAS covered first
        .limit(25)
      
      algerianMeds = meds || []
    }
    
    // If no specific matches or too few, add common medications
    if (algerianMeds.length < 10) {
      const { data: commonMeds } = await admin
        .from('algerian_medications')
        .select('brand_name, dci, therapeutic_class, pharmacological_class, strengths, conditioning, cnas_covered, requires_prescription, price_range, public_price_dzd, reference_price_dzd, country_origin, manufacturer')
        .eq('is_marketed', true)
        .eq('cnas_covered', true)
        .in('therapeutic_class', ['ANTALGIQUES', 'GASTRO-ENTEROLOGIE', 'PNEUMOLOGIE', 'ALLERGOLOGIE'])
        .limit(15)
      
      if (commonMeds) {
        // Merge without duplicates
        const existingNames = new Set(algerianMeds.map(m => m.brand_name))
        commonMeds.forEach(m => {
          if (!existingNames.has(m.brand_name)) {
            algerianMeds.push(m)
          }
        })
      }
    }

    // Format medications for AI context
    const algerianMedsContext = algerianMeds.slice(0, 30).map(m => {
      const price = m.public_price_dzd || m.reference_price_dzd
      return `• ${m.brand_name} (${m.dci || 'N/A'})
  Classe: ${m.therapeutic_class || 'N/A'}
  Dosages: ${m.strengths?.join(', ') || 'N/A'}
  Conditionnement: ${m.conditioning || 'N/A'}
  CNAS: ${m.cnas_covered ? '✓ Remboursé' : '✗ Non remboursé'}
  Prix: ${price ? `${price} DZD` : m.price_range || 'N/A'}
  Origine: ${m.country_origin || 'N/A'} (${m.manufacturer || 'N/A'})`
    }).join('\n\n')

    // ========== BUILD COMPREHENSIVE CONTEXT ==========
    
    // Current medications from prescriptions
    const currentMeds = recentRx?.flatMap(rx => 
      (rx.medications as any[])?.map(m => `${m.medication_name || m.name} ${m.dosage || ''}`.trim()) || []
    ).filter(Boolean).slice(0, 15) || []

    // Past diagnoses
    const pastDiagnoses = recentRx?.map(rx => rx.diagnosis).filter(Boolean).slice(0, 10) || []

    // Lab results summary
    const labResultsSummary = labTests?.filter(t => t.status === 'completed' && t.results).map(t => {
      const results = typeof t.results === 'object' ? t.results : {}
      return `${t.test_name}: ${JSON.stringify(results).slice(0, 200)}`
    }).slice(0, 5) || []

    // Visit history
    const visitHistory = recentAppointments?.map(apt => {
      const pro = apt.professional as any
      return `${apt.date}: ${pro?.specialty || 'Doctor'} - ${apt.reason || apt.notes || 'Consultation'}`
    }).slice(0, 8) || []

    // Family health context
    const familyContext = familyMembers?.map(fm => {
      const fmAge = fm.date_of_birth 
        ? Math.floor((Date.now() - new Date(fm.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null
      return `${fm.relationship} (${fm.full_name}, ${fmAge || '?'} y/o): ${fm.chronic_conditions || 'No conditions'}, Allergies: ${fm.allergies || 'None'}`
    }).slice(0, 5) || []

    // Build the comprehensive patient context
    const patientContext = `
========== PATIENT HEALTH RECORD ==========

PERSONAL INFORMATION:
- Name: ${profile?.full_name || 'Patient'}
- Age: ${age || 'Unknown'} years old
- Gender: ${profile?.gender || 'Unknown'}
- Blood Type: ${profile?.blood_type || 'Unknown'}
- Location: ${profile?.city || ''}, ${profile?.wilaya || 'Algeria'}
- Known Allergies: ${profile?.allergies || 'None recorded'}

CURRENT MEDICATIONS:
${currentMeds.length > 0 ? currentMeds.map(m => `- ${m}`).join('\n') : '- None on record'}

PAST DIAGNOSES (Recent):
${pastDiagnoses.length > 0 ? pastDiagnoses.map(d => `- ${d}`).join('\n') : '- None recorded'}

RECENT LAB TEST RESULTS:
${labResultsSummary.length > 0 ? labResultsSummary.map(l => `- ${l}`).join('\n') : '- No recent lab tests'}

VISIT HISTORY (Last visits):
${visitHistory.length > 0 ? visitHistory.map(v => `- ${v}`).join('\n') : '- No visit history'}

SPECIALIST REFERRALS:
${referrals?.length ? referrals.map(r => `- ${r.specialty}: ${r.reason} (${r.urgency || 'routine'})`).join('\n') : '- None'}

FAMILY HEALTH CONTEXT:
${familyContext.length > 0 ? familyContext.map(f => `- ${f}`).join('\n') : '- No family members registered'}

========== ALGERIAN MEDICATIONS DATABASE ==========
The following medications are AVAILABLE in Algeria. Use these when recommending treatment:

${algerianMedsContext || 'No specific medications loaded for this query.'}

Note: CNAS = Algerian social security coverage. Prefer CNAS-covered medications when possible.
===================================================

${context ? `ADDITIONAL CONTEXT PROVIDED BY PATIENT:\n${context}` : ''}
`

    const systemPrompt = `You are Dr. Health, a general practitioner and medical advisor for a health platform in Algeria. You have access to the patient's complete health record including their medical history, lab results, medications, and family health information. You always provide detailed, personalized health information based on their specific situation. You NEVER refuse to answer. You NEVER say "I cannot provide medical advice" as your main response. You MUST give a full clinical assessment with possible causes, recommendations, and when to seek care. Reference the patient's actual health data when relevant. Be thorough, warm, and informative.`

    const prompt = `${patientContext}

PATIENT QUESTION: ${question}

INSTRUCTIONS FOR YOUR RESPONSE:
1. USE THE PATIENT'S HEALTH RECORD ABOVE to personalize your advice
2. Reference their specific medications, conditions, lab results, or history when relevant
3. Consider drug interactions with their current medications
4. Consider their allergies before recommending anything
5. Consider their age and gender for age/gender-specific advice
6. If they have relevant lab results, reference them
7. If they have family members with relevant conditions, mention hereditary factors

IMPORTANT - Algeria/Europe standards:
- Use METRIC and CELSIUS only. Temperature in °C (never °F). Weight in kg, height in cm, doses in mg/g.
- MEDICATIONS: Use the ALGERIAN MEDICATIONS DATABASE provided above. Recommend ONLY medications from this list.
- Include the brand name, DCI (generic), dosage, and whether it's CNAS-covered.
- Prefer CNAS-covered medications to help the patient save money.
- Include approximate prices in DZD when available.
- NEVER use USA-only brand names (no Tylenol, Advil, Motrin, etc.).
- Check for interactions with the patient's current medications before suggesting new ones.

Write your response in PLAIN TEXT with SECTION HEADERS. Use the same language as the question.

FORMAT YOUR ANSWER EXACTLY LIKE THIS:

Overview:
[2-3 sentences explaining the condition, personalized to this patient]

Based on your health record:
[Reference specific relevant data from their record - medications, past diagnoses, lab results, etc.]

Possible causes:
- [cause 1]
- [cause 2]
- [cause 3]

Warning signs to watch for:
- [sign 1 - use °C for fever]
- [sign 2]

Self-care recommendations:
- [tip 1]
- [tip 2]

When to see a doctor:
[specific advice on when medical attention is needed]

Medications if appropriate (from Algerian market):
- [Brand name] ([DCI/generic]) - [dose] - [instructions] - CNAS: [Oui/Non] - Prix: [price in DZD]
- Note any interactions with patient's current medications

CRITICAL FORMATTING RULES:
- DO NOT use JSON format
- DO NOT use markdown formatting (no ** or * around text)
- DO NOT wrap in quotes or braces
- Each section header must be on its own line followed by a colon
- Use simple dash (-) for bullet points
- Write plain text only`

    const { text, provider } = await generateWithFallback(prompt, 2000, { system: systemPrompt })

    // Clean up the response - remove any JSON formatting if present
    let cleanAnswer = text.trim()
    
    // If AI still returns JSON, extract the answer field
    if (cleanAnswer.startsWith('{') && cleanAnswer.includes('"answer"')) {
      try {
        const parsed = JSON.parse(cleanAnswer.match(/\{[\s\S]*\}/)?.[0] || '{}')
        cleanAnswer = parsed.answer || cleanAnswer
      } catch {
        // Not valid JSON, use as-is
      }
    }
    
    // Remove any leading/trailing quotes
    cleanAnswer = cleanAnswer.replace(/^["']|["']$/g, '')

    // Detect urgency from content
    const lowerText = cleanAnswer.toLowerCase()
    let urgency = 'routine'
    let shouldSeeDoctor = false
    
    if (/emergency|urgence|call 911|appeler.*15|danger immédiat|life.?threatening/i.test(lowerText)) {
      urgency = 'emergency'
      shouldSeeDoctor = true
    } else if (/urgent|see.*doctor.*immediately|consultez.*immédiatement|within 24/i.test(lowerText)) {
      urgency = 'urgent'
      shouldSeeDoctor = true
    } else if (/see.*doctor|consult|médecin|should be evaluated/i.test(lowerText)) {
      urgency = 'soon'
      shouldSeeDoctor = true
    }

    // Extract key points from bullet points
    const bulletPoints = cleanAnswer.match(/^[-•*]\s+.+$/gm) || []
    const keyPoints = bulletPoints.slice(0, 3).map(p => p.replace(/^[-•*]\s+/, ''))

    return NextResponse.json({
      success: true,
      answer: cleanAnswer,
      key_points: keyPoints,
      should_see_doctor: shouldSeeDoctor,
      urgency,
      provider,
      disclaimer: ''
    })

  } catch (error: any) {
    console.error('[Health Advisor] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process your question' },
      { status: 500 }
    )
  }
}

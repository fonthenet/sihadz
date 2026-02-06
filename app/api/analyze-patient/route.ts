'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const appointmentId = searchParams.get('appointmentId')
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: apt } = await admin.from('appointments').select('doctor_id').eq('id', appointmentId).single()
    if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    const { data: prof } = await admin.from('professionals').select('id').eq('auth_user_id', user.id).single()
    if (!prof || apt.doctor_id !== prof.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data } = await admin
      .from('patient_ai_analyses')
      .select('analysis_result, input_data, shared_with_patient')
      .eq('appointment_id', appointmentId)
      .maybeSingle()

    if (!data) return NextResponse.json({ analysis: null, inputData: null, sharedWithPatient: false })
    return NextResponse.json({
      analysis: data.analysis_result,
      inputData: data.input_data,
      sharedWithPatient: data.shared_with_patient ?? false,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { appointmentId, sharedWithPatient } = body

    if (!appointmentId || typeof sharedWithPatient !== 'boolean') {
      return NextResponse.json({ error: 'appointmentId and sharedWithPatient (boolean) required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: apt } = await admin.from('appointments').select('doctor_id').eq('id', appointmentId).single()
    if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    const { data: prof } = await admin.from('professionals').select('id').eq('auth_user_id', user.id).single()
    if (!prof || apt.doctor_id !== prof.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { error } = await admin
      .from('patient_ai_analyses')
      .update({ shared_with_patient: sharedWithPatient })
      .eq('appointment_id', appointmentId)

    if (error) throw error

    return NextResponse.json({ success: true, sharedWithPatient })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { appointmentId, inputData } = body

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
    }

    if (!hasAiProvider()) {
      return NextResponse.json(
        { error: 'AI service not configured. Start Ollama (ollama run llama3.1) or set OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Fetch appointment and verify doctor access
    const { data: apt, error: aptErr } = await admin
      .from('appointments')
      .select('id, patient_id, doctor_id, family_member_id, notes, symptoms, visit_type')
      .eq('id', appointmentId)
      .single()

    if (aptErr || !apt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const { data: prof } = await admin
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!prof || apt.doctor_id !== prof.id) {
      return NextResponse.json({ error: 'Access denied. Only the assigned doctor can use this feature.' }, { status: 403 })
    }

    // Fetch patient profile for age, gender, allergies
    let patientProfile: { full_name?: string; date_of_birth?: string; gender?: string; allergies?: string | null } | null = null
    let allergies: string | null = null

    if (apt.family_member_id) {
      // Appointment for family member: get allergies from family_members + family_allergies
      const { data: fm } = await admin
        .from('family_members')
        .select('full_name, date_of_birth, gender, allergies')
        .eq('id', apt.family_member_id)
        .single()
      if (fm) {
        patientProfile = fm
        const fmAllergies = fm.allergies
        const { data: detailedAllergies } = await admin
          .from('family_allergies')
          .select('allergen_name, severity, reaction_description')
          .eq('family_member_id', apt.family_member_id)
          .eq('is_active', true)
        const detailedStr = detailedAllergies?.length
          ? detailedAllergies.map((a: { allergen_name?: string; severity?: string; reaction_description?: string }) =>
              [a.allergen_name, a.severity, a.reaction_description].filter(Boolean).join(' - ')
            ).join('; ')
          : null
        const fmAllergiesStr = typeof fmAllergies === 'string'
          ? fmAllergies
          : Array.isArray(fmAllergies)
            ? fmAllergies.map((a: unknown) => (typeof a === 'object' && a && 'name' in (a as object) ? (a as { name?: string }).name : String(a))).filter(Boolean).join(', ')
            : null
        allergies = detailedStr || fmAllergiesStr || null
      }
    } else if (apt.patient_id) {
      const { data: p } = await admin
        .from('profiles')
        .select('full_name, date_of_birth, gender, allergies')
        .eq('id', apt.patient_id)
        .single()
      patientProfile = p
      allergies = patientProfile?.allergies ?? null
    }

    const age = patientProfile?.date_of_birth
      ? Math.floor((Date.now() - new Date(patientProfile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    // One generation per visit: if analysis already exists, return cached (no regenerate)
    const { data: existing } = await admin
      .from('patient_ai_analyses')
      .select('id, analysis_result, input_data, shared_with_patient')
      .eq('appointment_id', appointmentId)
      .maybeSingle()

    // Skip cache when AI_ALLOW_MULTIPLE_GENERATION=true (temp: allow multiple generations)
    if (existing?.analysis_result && process.env.AI_ALLOW_MULTIPLE_GENERATION !== 'true') {
      return NextResponse.json({
        success: true,
        analysis: existing.analysis_result,
        inputData: existing.input_data ?? {},
        analyzedAt: null,
        cached: true,
      })
    }

    // Build clinical context for AI
    const chiefComplaint = inputData?.chiefComplaint || apt.notes || apt.symptoms || 'Not provided'
    const vitals = inputData?.vitals || {}
    const physicalExam = inputData?.physicalExam || ''
    const clinicalNotes = inputData?.clinicalNotes || ''
    const historyOfPresentIllness = inputData?.historyOfPresentIllness || ''
    const allergiesInput = inputData?.allergies ?? allergies
    const allergiesText = typeof allergiesInput === 'string' ? allergiesInput : Array.isArray(allergiesInput) ? allergiesInput.join(', ') : allergiesInput ?? 'None documented'

    const prompt = `You are a clinical decision support AI assisting a physician in Algeria. The doctor is seeing a patient and has provided the following information. Generate a structured clinical analysis to help with differential diagnosis and treatment planning.

## Patient Information
- Age: ${age ?? 'Not provided'}
- Gender: ${patientProfile?.gender ?? 'Not provided'}
- Allergies: ${allergiesText}

## Chief Complaint / Reason for Visit
${chiefComplaint}

## History of Present Illness (if provided)
${historyOfPresentIllness || 'Not provided'}

## Vital Signs (if provided)
${vitals.bloodPressure ? `- BP: ${vitals.bloodPressure}` : ''}
${vitals.heartRate ? `- HR: ${vitals.heartRate} bpm` : ''}
${vitals.temperature ? `- Temp: ${vitals.temperature}°C` : ''}
${vitals.weight ? `- Weight: ${vitals.weight} kg` : ''}
${vitals.respiratoryRate ? `- RR: ${vitals.respiratoryRate}/min` : ''}
${!vitals.bloodPressure && !vitals.heartRate && !vitals.temperature && !vitals.weight ? 'Not recorded' : ''}

## Physical Exam Findings (if provided)
${physicalExam || 'Not documented'}

## Clinical Observations
${clinicalNotes || 'None'}

---

Provide a structured response in JSON format with the following fields:

{
  "differential_diagnosis": [
    {
      "condition": "Condition name",
      "likelihood": "high|moderate|low",
      "rationale": "Brief rationale"
    }
  ],
  "suggested_workup": [
    "Lab test or imaging suggestion 1",
    "Lab test or imaging suggestion 2"
  ],
  "treatment_suggestions": [
    {
      "category": "Pharmacological|Lifestyle|Referral|Follow-up",
      "suggestion": "Specific recommendation"
    }
  ],
  "red_flags": ["Any warning signs to consider"],
  "follow_up_recommendations": "When and how to follow up",
  "clinical_pearls": ["Key clinical points for this case"]
}

IMPORTANT:
- This is decision SUPPORT only. The treating physician retains full responsibility.
- ALWAYS consider allergies when suggesting medications. Avoid any drug that could cause an allergic reaction.
- Adapt recommendations to Algeria (DZD, local formulary, CNAS when relevant).
- Use metric and Celsius only (kg, °C, mg). Never USA units (°F, lb).
- Medications: suggest ONLY European and Algerian market drugs (Doliprane, Augmentin, etc.). NEVER USA-only brands (Tylenol, Advil, Motrin).
- Be concise and clinically actionable.`;

    const { text, provider } = await generateWithFallback(prompt, 3000)

    let analysis
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        analysis = { raw: text }
      }
    } catch {
      analysis = { raw: text }
    }

    // Add provider info to analysis
    analysis.provider = provider

    const inputToStore = {
      chiefComplaint,
      historyOfPresentIllness,
      vitals,
      physicalExam,
      clinicalNotes,
      allergies: allergiesText,
    }

    // Upsert into patient_ai_analyses
    await admin.from('patient_ai_analyses').upsert(
      {
        appointment_id: appointmentId,
        doctor_id: prof.id,
        input_data: inputToStore,
        analysis_result: analysis,
      },
      { onConflict: 'appointment_id' }
    )

    return NextResponse.json({
      success: true,
      analysis,
      provider,
      inputData: inputToStore,
      analyzedAt: new Date().toISOString(),
      cached: false,
    })
  } catch (error: any) {
    console.error('[AI] Patient analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate analysis. Please try again.' },
      { status: 500 }
    )
  }
}

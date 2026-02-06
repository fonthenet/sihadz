'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      diagnosis,
      symptoms,
      clinicalNotes,
      visitSummary,
      patientAge,
      patientGender,
      allergies,
      chronicConditions,
      currentMedications,
    } = body

    if (!diagnosis && !symptoms && !clinicalNotes && !visitSummary) {
      return NextResponse.json(
        { error: 'Diagnosis, symptoms, clinical notes, or visit summary required' },
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

    const admin = createAdminClient()
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type, specialty')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!prof || prof.type !== 'doctor') {
      return NextResponse.json({ error: 'Access denied. Doctors only.' }, { status: 403 })
    }

    // Fetch lab test types catalog
    const { data: labTestTypes, error: labError } = await admin
      .from('lab_test_types')
      .select('id, code, name, name_ar, name_fr, category, description, sample_type')
      .order('category')
      .order('name')

    if (labError || !labTestTypes?.length) {
      return NextResponse.json(
        { error: 'Lab test catalog unavailable' },
        { status: 500 }
      )
    }

    const catalogText = labTestTypes
      .map((t) => `- ${t.code}: ${t.name} (${t.name_fr || t.name_ar || ''}) | Category: ${t.category || 'N/A'} | Sample: ${t.sample_type || 'N/A'} | ${t.description || ''}`)
      .join('\n')

    const prompt = `You are a clinical lab assistant helping doctors in Algeria order appropriate lab tests.

## Available Lab Tests (use ONLY these codes)
${catalogText}

## Clinical Context (same ticket/visit)
- Diagnosis: ${diagnosis || 'Not specified'}
- Patient-reported symptoms: ${symptoms || 'Not specified'}
- Doctor clinical notes: ${clinicalNotes || 'Not specified'}
- Visit summary / notes: ${visitSummary || 'Not specified'}
- Patient age: ${patientAge ?? 'Not specified'}
- Patient gender: ${patientGender || 'Not specified'}
- Allergies: ${allergies || 'None'}
- Chronic conditions: ${chronicConditions || 'None'}
- Current medications: ${currentMedications || 'None'}
- Doctor specialty: ${prof.specialty || 'General'}

## Instructions
Suggest relevant lab tests from the catalog above based on the visit context. STRICT RULES:
1. Return ONLY test codes that exist in the catalog (e.g. FBC, HGB, GLU, HBA1C, TSH, CRP)
2. Suggest 3-8 most appropriate tests for the clinical picture
3. Consider: differential diagnosis, monitoring needs, screening, and Algerian clinical practice
4. Prefer Chifa-covered tests when relevant
5. Match tests to symptoms (e.g. fatigue + pallor → FBC, ferritin; diabetes → GLU, HBA1C; liver concern → AST, ALT, etc.)

Return a JSON response:
{
  "suggestions": [
    {
      "code": "FBC",
      "rationale": "Brief reason why this test is indicated"
    }
  ],
  "summary": "One sentence clinical rationale for this panel"
}

Be concise. Use only codes from the catalog.`

    const { text, provider } = await generateWithFallback(prompt, 1500)

    let parsed: { suggestions?: { code: string; rationale: string }[]; summary?: string }
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = { suggestions: [] }
      }
    } catch {
      parsed = { suggestions: [] }
    }

    const suggestions = parsed.suggestions || []
    const codeToTest = new Map(labTestTypes.map((t) => [t.code.toUpperCase(), t]))

    const matched = suggestions
      .map((s) => {
        const code = (s.code || '').toString().trim().toUpperCase()
        const test = codeToTest.get(code)
        if (!test) return null
        return {
          id: test.id,
          name: test.name,
          name_ar: test.name_ar,
          name_fr: test.name_fr,
          category: test.category,
          code: test.code,
          rationale: s.rationale || '',
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      tests: matched,
      summary: parsed.summary || null,
      provider,
      disclaimer: 'AI suggestions for reference only. Clinical judgment required.',
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error('[Lab Test Suggestions] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

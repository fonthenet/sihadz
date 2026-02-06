'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { labResults, patientInfo, labRequestId } = body

    if (!labResults || !Array.isArray(labResults) || labResults.length === 0) {
      return NextResponse.json(
        { error: 'Lab results are required' },
        { status: 400 }
      )
    }

    // labRequestId is required to enforce 1 request per test ever
    if (!labRequestId) {
      return NextResponse.json(
        { error: 'Lab request ID is required' },
        { status: 400 }
      )
    }

    if (!hasAiProvider()) {
      return NextResponse.json(
        { error: 'AI service not configured. Start Ollama (ollama run llama3.1) or set OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Check if this lab test already has a cached AI analysis (1 request per test, ever)
    const { data: labReq, error: labErr } = await admin
      .from('lab_test_requests')
      .select('id, patient_id, doctor_id, ai_analysis_cache, ai_analysis_cached_at')
      .eq('id', labRequestId)
      .single()

    if (labErr || !labReq) {
      return NextResponse.json({ error: 'Lab request not found' }, { status: 404 })
    }

    // Verify user has access (patient or doctor)
    const isPatient = labReq.patient_id === user.id
    const { data: prof } = await admin
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single()
    const isDoctor = prof && labReq.doctor_id === prof?.id
    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If already cached, return it (no new AI call) - skip when AI_ALLOW_MULTIPLE_GENERATION=true
    if (labReq.ai_analysis_cache && process.env.AI_ALLOW_MULTIPLE_GENERATION !== 'true') {
      return NextResponse.json({
        success: true,
        analysis: labReq.ai_analysis_cache,
        analyzedAt: labReq.ai_analysis_cached_at || new Date().toISOString(),
        cached: true,
      })
    }

    // Format lab results for AI analysis
    const formattedResults = labResults.map((result: any) => {
      const hasRange = result.normal_min != null && result.normal_max != null
      const status = hasRange
        ? (result.value < result.normal_min ? 'LOW' : result.value > result.normal_max ? 'HIGH' : 'NORMAL')
        : (result.status || 'NORMAL')
      const rangeStr = hasRange
        ? `(Normal: ${result.normal_min}-${result.normal_max} ${result.unit || ''})`
        : (result.reference_range ? `(Ref: ${result.reference_range})` : '')
      return `- ${result.test_name}: ${result.value} ${result.unit || ''} ${rangeStr} [${status}]`
    }).join('\n')

    const prompt = `You are a medical AI assistant helping patients understand their lab results in Algeria. Analyze the following lab results and provide a clear, patient-friendly explanation in both English and Arabic.

IMPORTANT: Use Algerian/European standards. All units in metric (g/L, mmol/L, mg/dL). Temperature in °C. No USA units (no °F, no lb). Medications: recommend only European/Algerian names (Doliprane, Dafalgan, etc.) - never USA-only brands (Tylenol, Advil).

Patient Information:
- Age: ${patientInfo?.age || 'Not provided'}
- Gender: ${patientInfo?.gender || 'Not provided'}

Lab Results:
${formattedResults}

Please provide:
1. A brief summary of the overall health picture
2. Explanation of any abnormal values and what they might indicate
3. General lifestyle recommendations based on the results
4. When to consult a doctor

IMPORTANT DISCLAIMERS:
- This is for educational purposes only
- This is NOT a medical diagnosis
- Always consult with a healthcare professional for proper interpretation
- Results should be reviewed in context of your complete medical history

Format your response in JSON with these fields:
{
  "summary": "Overall summary in English",
  "summary_ar": "الملخص العام بالعربية",
  "findings": [
    {
      "test": "Test name",
      "status": "normal/high/low",
      "explanation": "What this means",
      "explanation_ar": "التفسير بالعربية"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "recommendations_ar": ["التوصية 1", "التوصية 2"],
  "urgency": "routine/soon/urgent",
  "disclaimer": "Standard medical disclaimer"
}`

    const { text, provider } = await generateWithFallback(prompt, 2000)

    // Parse the AI response
    let analysis
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      // If parsing fails, return a structured response with the raw text
      analysis = {
        summary: text,
        summary_ar: 'يرجى مراجعة التحليل أعلاه',
        findings: [],
        recommendations: ['Please consult with your healthcare provider for detailed interpretation'],
        recommendations_ar: ['يرجى استشارة مقدم الرعاية الصحية للحصول على تفسير مفصل'],
        urgency: 'routine',
        disclaimer: 'This analysis is for educational purposes only. Please consult a healthcare professional.'
      }
    }

    // Add provider info to analysis
    analysis.provider = provider

    // Save to DB (one request per test, ever)
    await admin
      .from('lab_test_requests')
      .update({
        ai_analysis_cache: analysis,
        ai_analysis_cached_at: new Date().toISOString(),
      })
      .eq('id', labRequestId)

    return NextResponse.json({
      success: true,
      analysis,
      provider,
      analyzedAt: new Date().toISOString(),
      cached: false,
    })

  } catch (error: any) {
    console.error('[AI] Lab analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze lab results. Please try again.' },
      { status: 500 }
    )
  }
}

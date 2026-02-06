'use server'

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  try {
    const { labResults, patientInfo } = await req.json()

    if (!labResults || !Array.isArray(labResults) || labResults.length === 0) {
      return NextResponse.json(
        { error: 'Lab results are required' },
        { status: 400 }
      )
    }

    // Format lab results for AI analysis
    const formattedResults = labResults.map((result: any) => {
      const status = result.value < result.normal_min ? 'LOW' : 
                     result.value > result.normal_max ? 'HIGH' : 'NORMAL'
      return `- ${result.test_name}: ${result.value} ${result.unit} (Normal: ${result.normal_min}-${result.normal_max} ${result.unit}) [${status}]`
    }).join('\n')

    const prompt = `You are a medical AI assistant helping patients understand their lab results. Analyze the following lab results and provide a clear, patient-friendly explanation in both English and Arabic.

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

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
      maxTokens: 2000,
    })

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

    return NextResponse.json({
      success: true,
      analysis,
      analyzedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[v0] Lab analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze lab results. Please try again.' },
      { status: 500 }
    )
  }
}

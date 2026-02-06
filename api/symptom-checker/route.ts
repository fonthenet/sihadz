import { generateObject } from 'ai';
import { z } from 'zod';

const symptomAnalysisSchema = z.object({
  summary: z.string().describe('Brief summary of the patient symptoms in their language'),
  possibleConditions: z.array(z.object({
    name: z.string().describe('Name of the possible condition'),
    nameAr: z.string().describe('Arabic name of the condition'),
    nameFr: z.string().describe('French name of the condition'),
    probability: z.enum(['high', 'medium', 'low']).describe('Likelihood based on symptoms'),
    description: z.string().describe('Brief description of the condition'),
  })).max(5),
  urgencyLevel: z.enum(['emergency', 'urgent', 'soon', 'routine']).describe('How urgent is medical attention needed'),
  urgencyExplanation: z.string().describe('Explanation of why this urgency level was assigned'),
  recommendedSpecialty: z.string().describe('Medical specialty to consult'),
  recommendedSpecialtyAr: z.string().describe('Arabic name of recommended specialty'),
  recommendedSpecialtyFr: z.string().describe('French name of recommended specialty'),
  selfCareAdvice: z.array(z.string()).max(5).describe('Immediate self-care recommendations'),
  warningSignsToWatch: z.array(z.string()).max(5).describe('Red flags that require immediate medical attention'),
  questionsForDoctor: z.array(z.string()).max(5).describe('Questions patient should ask the doctor'),
});

export async function POST(req: Request) {
  const { symptoms, age, gender, language } = await req.json();

  const systemPrompt = `You are a medical triage AI assistant for DZDoc, a healthcare platform in Algeria. 
Your role is to analyze patient symptoms and provide helpful guidance while always emphasizing the importance of professional medical consultation.

IMPORTANT GUIDELINES:
- Never diagnose definitively - only suggest possible conditions
- Always recommend seeing a doctor
- Be culturally sensitive to Algerian patients
- Consider common conditions in Algeria/North Africa
- Provide responses appropriate for the patient's language preference
- Err on the side of caution with urgency levels
- Include traditional/common names when applicable

Patient Language Preference: ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'}`;

  const userPrompt = `Patient Information:
- Age: ${age} years
- Gender: ${gender}
- Reported Symptoms: ${symptoms}

Please analyze these symptoms and provide:
1. A summary of what the patient is experiencing
2. Up to 5 possible conditions (not diagnoses)
3. Urgency level for seeking care
4. Recommended medical specialty
5. Self-care advice while waiting for appointment
6. Warning signs to watch for
7. Questions to ask the doctor`;

  try {
    const { object } = await generateObject({
      model: 'openai/gpt-4o',
      schema: symptomAnalysisSchema,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    return Response.json({ 
      success: true, 
      analysis: object,
      disclaimer: {
        en: 'This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation.',
        ar: 'هذا ليس تشخيصًا طبيًا. يرجى استشارة أخصائي رعاية صحية للتقييم المناسب.',
        fr: 'Ceci n\'est pas un diagnostic médical. Veuillez consulter un professionnel de santé pour une évaluation appropriée.'
      }
    });
  } catch (error) {
    console.error('Symptom checker error:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to analyze symptoms' 
    }, { status: 500 });
  }
}

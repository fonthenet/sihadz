/**
 * Lab Summary Skill
 * Explains lab results in patient-friendly language
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, LabSummaryOutput } from '../types';

interface LabSummaryInput {
  labResult: any;
  previousResults?: any[];
}

export class SummarizeLabSkill extends BaseSkillHandler<LabSummaryInput, LabSummaryOutput> {
  skill: AISkill = 'summarize_lab';
  preferredModel = 'llama3';
  temperature = 0.5; // Lower temperature for more factual output
  maxTokens = 2500;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت مساعد طبي متخصص في شرح نتائج التحاليل المخبرية للمرضى بلغة بسيطة.

قواعد صارمة:
1. لا تقم أبداً بتشخيص أي مرض
2. لا تصف أي علاج
3. استخدم لغة بسيطة يفهمها الشخص العادي
4. أشر دائماً إلى ضرورة استشارة الطبيب
5. اذكر القيم غير الطبيعية بوضوح
6. قارن مع النتائج السابقة إن وجدت

${this.getJsonInstruction()}

الناتج يجب أن يكون JSON بالتنسيق التالي:
{
  "summary": "ملخص عام بفقرة واحدة",
  "highlights": [
    {
      "testName": "اسم التحليل",
      "value": "القيمة مع الوحدة",
      "status": "normal|low|high|critical",
      "explanation": "شرح مبسط"
    }
  ],
  "trends": [
    {
      "testName": "اسم التحليل",
      "change": "improved|worsened|stable",
      "previousValue": "القيمة السابقة",
      "currentValue": "القيمة الحالية"
    }
  ],
  "recommendations": ["توصية عامة"],
  "urgentFlags": ["إن وجد شيء يتطلب اهتمام فوري"]
}`,

      fr: `Vous êtes un assistant médical spécialisé dans l'explication des résultats de laboratoire aux patients en termes simples.

Règles strictes:
1. Ne jamais diagnostiquer une maladie
2. Ne jamais prescrire de traitement
3. Utiliser un langage simple compréhensible par tous
4. Toujours recommander de consulter le médecin
5. Signaler clairement les valeurs anormales
6. Comparer avec les résultats précédents si disponibles

${this.getJsonInstruction()}

Le résultat doit être un JSON au format suivant:
{
  "summary": "Résumé général en un paragraphe",
  "highlights": [
    {
      "testName": "Nom du test",
      "value": "Valeur avec unité",
      "status": "normal|low|high|critical",
      "explanation": "Explication simple"
    }
  ],
  "trends": [...],
  "recommendations": ["Recommandation générale"],
  "urgentFlags": ["Si quelque chose nécessite une attention immédiate"]
}`,

      en: `You are a medical assistant specialized in explaining laboratory results to patients in simple terms.

Strict rules:
1. Never diagnose any disease
2. Never prescribe any treatment
3. Use simple language understandable by anyone
4. Always recommend consulting the doctor
5. Clearly indicate abnormal values
6. Compare with previous results if available

${this.getJsonInstruction()}

Output must be JSON in the following format:
{
  "summary": "General summary in one paragraph",
  "highlights": [
    {
      "testName": "Test name",
      "value": "Value with unit",
      "status": "normal|low|high|critical",
      "explanation": "Simple explanation"
    }
  ],
  "trends": [...],
  "recommendations": ["General recommendation"],
  "urgentFlags": ["If something requires immediate attention"]
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: LabSummaryInput, context?: AIContext): string {
    const { labResult, previousResults } = input;
    
    let prompt = `Analyze these lab results:\n\n`;
    
    // Add patient context if available
    if (context?.patientHistory) {
      prompt += `Patient Context:\n${this.formatPatientHistory(context.patientHistory)}\n\n`;
    }
    
    // Current results
    prompt += `Current Lab Results:\n`;
    if (Array.isArray(labResult.results)) {
      for (const test of labResult.results) {
        prompt += `- ${test.test_name || test.name}: ${test.value} ${test.unit || ''} (Reference: ${test.reference_range || 'N/A'})\n`;
      }
    } else {
      prompt += JSON.stringify(labResult, null, 2);
    }
    
    // Previous results for trends
    if (previousResults && previousResults.length > 0) {
      prompt += `\n\nPrevious Results for Comparison:\n`;
      for (const prev of previousResults.slice(0, 3)) {
        prompt += `Date: ${prev.created_at || 'Unknown'}\n`;
        if (Array.isArray(prev.results)) {
          for (const test of prev.results) {
            prompt += `- ${test.test_name || test.name}: ${test.value} ${test.unit || ''}\n`;
          }
        }
        prompt += '\n';
      }
    }
    
    return prompt;
  }

  validateInput(input: LabSummaryInput): { valid: boolean; error?: string } {
    if (!input.labResult) {
      return { valid: false, error: 'Lab result data is required' };
    }
    return { valid: true };
  }
}

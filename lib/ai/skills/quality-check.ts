/**
 * Lab Quality Check Skill
 * Validates lab results before release
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, QualityCheckOutput } from '../types';

interface QualityCheckInput {
  results: Array<{
    testName: string;
    value: string | number;
    unit?: string;
    referenceRange?: string;
  }>;
  previousResults?: Array<{
    testName: string;
    value: string | number;
    date: string;
  }>;
}

export class QualityCheckSkill extends BaseSkillHandler<QualityCheckInput, QualityCheckOutput> {
  skill: AISkill = 'quality_check';
  preferredModel = 'llama3';
  temperature = 0.2; // Very low for accuracy
  maxTokens = 2000;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت مساعد مراقبة جودة مخبري. تحقق من نتائج التحاليل قبل الإصدار.

مهمتك:
1. كشف القيم المستحيلة أو غير المنطقية
2. تحديد القيم الحرجة التي تحتاج اهتمام فوري
3. مقارنة مع النتائج السابقة (فحص دلتا)
4. التحقق من اتساق الوحدات
5. تحديد الحقول المفقودة

مستويات الخطورة:
- warning: يحتاج مراجعة
- critical: يحتاج تأكيد قبل الإصدار
- panic: اتصل بالطبيب فوراً

${this.getJsonInstruction()}

الناتج JSON:
{
  "overallStatus": "passed|requires_review|failed",
  "flags": [
    {
      "testName": "اسم التحليل",
      "issue": "نوع المشكلة",
      "currentValue": "القيمة الحالية",
      "normalRange": "المعدل الطبيعي",
      "action": "الإجراء المطلوب",
      "severity": "warning|critical|panic"
    }
  ],
  "missingFields": ["الحقول المفقودة"],
  "deltaAlerts": [
    {
      "testName": "اسم التحليل",
      "previousValue": "القيمة السابقة",
      "currentValue": "القيمة الحالية",
      "changePercent": نسبة التغير
    }
  ],
  "recommendation": "التوصية العامة"
}`,

      fr: `Vous êtes un assistant de contrôle qualité laboratoire. Vérifiez les résultats avant diffusion.

Votre mission:
1. Détecter les valeurs impossibles ou illogiques
2. Identifier les valeurs critiques nécessitant attention immédiate
3. Comparer avec les résultats précédents (contrôle delta)
4. Vérifier la cohérence des unités
5. Identifier les champs manquants

Niveaux de sévérité:
- warning: Nécessite révision
- critical: Nécessite confirmation avant diffusion
- panic: Contacter le médecin immédiatement

${this.getJsonInstruction()}

Sortie JSON:
{
  "overallStatus": "passed|requires_review|failed",
  "flags": [...],
  "missingFields": ["Champs manquants"],
  "deltaAlerts": [...],
  "recommendation": "Recommandation générale"
}`,

      en: `You are a laboratory quality control assistant. Check results before release.

Your mission:
1. Detect impossible or illogical values
2. Identify critical values needing immediate attention
3. Compare with previous results (delta check)
4. Verify unit consistency
5. Identify missing fields

Severity levels:
- warning: Needs review
- critical: Needs confirmation before release
- panic: Contact physician immediately

${this.getJsonInstruction()}

Output JSON:
{
  "overallStatus": "passed|requires_review|failed",
  "flags": [
    {
      "testName": "Test name",
      "issue": "Issue type",
      "currentValue": "Current value",
      "normalRange": "Normal range",
      "action": "Required action",
      "severity": "warning|critical|panic"
    }
  ],
  "missingFields": ["Missing fields"],
  "deltaAlerts": [
    {
      "testName": "Test name",
      "previousValue": "Previous value",
      "currentValue": "Current value",
      "changePercent": Change percentage
    }
  ],
  "recommendation": "General recommendation"
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: QualityCheckInput, context?: AIContext): string {
    let prompt = `Check these lab results for quality:\n\n`;
    
    prompt += `Current Results:\n`;
    for (const result of input.results) {
      prompt += `- ${result.testName}: ${result.value} ${result.unit || ''} (Range: ${result.referenceRange || 'N/A'})\n`;
    }
    
    if (input.previousResults && input.previousResults.length > 0) {
      prompt += `\nPrevious Results for Delta Check:\n`;
      for (const prev of input.previousResults) {
        prompt += `- ${prev.testName}: ${prev.value} (${prev.date})\n`;
      }
    }
    
    prompt += `\nPerform quality check and identify any issues.`;
    
    return prompt;
  }

  validateInput(input: QualityCheckInput): { valid: boolean; error?: string } {
    if (!input.results || input.results.length === 0) {
      return { valid: false, error: 'Lab results are required' };
    }
    return { valid: true };
  }
}

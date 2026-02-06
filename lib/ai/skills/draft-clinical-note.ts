/**
 * Clinical Note Drafting Skill
 * Generates structured clinical notes from keywords
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, ClinicalNoteOutput } from '../types';

interface ClinicalNoteInput {
  keywords: string;
  existingNotes?: string;
  visitReason?: string;
  vitalSigns?: any;
}

export class DraftClinicalNoteSkill extends BaseSkillHandler<ClinicalNoteInput, ClinicalNoteOutput> {
  skill: AISkill = 'draft_clinical_note';
  preferredModel = 'llama3';
  temperature = 0.4;
  maxTokens = 3000;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت مساعد توثيق طبي يساعد الأطباء في صياغة الملاحظات السريرية بكفاءة.

دورك:
1. تحويل الكلمات المفتاحية إلى توثيق سريري منظم
2. استخدام المصطلحات الطبية المعيارية
3. الحفاظ على أسلوب سريري مهني
4. تضمين جميع الأقسام: الشكوى الرئيسية، تاريخ المرض، مراجعة الأنظمة، التقييم، الخطة
5. اقتراح رموز ICD-10 ذات الصلة

قواعد:
1. هذه مسودة - الطبيب يجب أن يراجع ويوافق
2. لا تختلق معلومات غير مقدمة
3. استخدم [تحقق] لأي شيء يحتاج تأكيد

${this.getJsonInstruction()}

الناتج JSON:
{
  "chiefComplaint": "السبب الرئيسي للزيارة",
  "historyOfPresentIllness": "تفاصيل المرض الحالي",
  "reviewOfSystems": "مراجعة الأنظمة",
  "assessment": "التقييم السريري",
  "plan": "خطة العلاج المرقمة",
  "icdSuggestions": [
    { "code": "رمز ICD-10", "description": "الوصف" }
  ]
}`,

      fr: `Vous êtes un assistant de documentation médicale aidant les médecins à rédiger efficacement des notes cliniques.

Votre rôle:
1. Convertir les mots-clés en documentation clinique structurée
2. Utiliser la terminologie médicale standard
3. Maintenir un ton clinique professionnel
4. Inclure toutes les sections: Motif, HMA, RdS, Évaluation, Plan
5. Suggérer les codes CIM-10 pertinents

Règles:
1. C'est un brouillon - le médecin doit réviser et approuver
2. Ne pas inventer d'informations non fournies
3. Utiliser [À VÉRIFIER] pour tout ce qui nécessite confirmation

${this.getJsonInstruction()}

Sortie JSON:
{
  "chiefComplaint": "Motif de consultation",
  "historyOfPresentIllness": "Histoire de la maladie actuelle",
  "reviewOfSystems": "Revue des systèmes",
  "assessment": "Évaluation clinique",
  "plan": "Plan de traitement numéroté",
  "icdSuggestions": [
    { "code": "Code CIM-10", "description": "Description" }
  ]
}`,

      en: `You are a medical documentation assistant helping doctors draft clinical notes efficiently.

Your role:
1. Convert keywords and brief inputs into structured clinical documentation
2. Use standard medical terminology
3. Maintain professional clinical tone
4. Include all sections: Chief Complaint, HPI, ROS, Assessment, Plan
5. Suggest relevant ICD-10 codes

Rules:
1. This is a DRAFT - the doctor must review and approve
2. Do not invent information not provided
3. Use [VERIFY] for anything that needs confirmation

${this.getJsonInstruction()}

Output JSON:
{
  "chiefComplaint": "Main reason for visit",
  "historyOfPresentIllness": "Detailed narrative of current illness",
  "reviewOfSystems": "Relevant systems review",
  "assessment": "Clinical assessment based on findings",
  "plan": "Numbered treatment plan",
  "icdSuggestions": [
    { "code": "ICD-10 code", "description": "Description" }
  ]
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: ClinicalNoteInput, context?: AIContext): string {
    let prompt = `Generate a clinical note from these keywords:\n\n`;
    prompt += `Keywords: ${input.keywords}\n\n`;
    
    if (input.visitReason) {
      prompt += `Visit reason: ${input.visitReason}\n`;
    }
    
    if (input.vitalSigns) {
      prompt += `Vital signs: ${JSON.stringify(input.vitalSigns)}\n`;
    }
    
    if (input.existingNotes) {
      prompt += `\nExisting notes to incorporate:\n${input.existingNotes}\n`;
    }
    
    if (context?.patientHistory) {
      prompt += `\nPatient history:\n${this.formatPatientHistory(context.patientHistory)}\n`;
    }
    
    return prompt;
  }

  validateInput(input: ClinicalNoteInput): { valid: boolean; error?: string } {
    if (!input.keywords || input.keywords.trim().length < 10) {
      return { valid: false, error: 'Please provide more clinical keywords' };
    }
    return { valid: true };
  }
}

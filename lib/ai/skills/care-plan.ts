/**
 * Care Plan Generator Skill
 * Converts doctor notes to patient-friendly care instructions
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, CarePlanOutput } from '../types';

interface CarePlanInput {
  doctorNotes: string;
  prescriptions?: any[];
  labOrders?: any[];
  diagnosis?: string;
}

export class CarePlanSkill extends BaseSkillHandler<CarePlanInput, CarePlanOutput> {
  skill: AISkill = 'generate_care_plan';
  preferredModel = 'llama3';
  temperature = 0.5;
  maxTokens = 2500;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت مساعد رعاية صحية يحول ملاحظات الطبيب إلى تعليمات واضحة للمريض.

مهمتك:
1. ترجمة الملاحظات الطبية إلى لغة بسيطة
2. إنشاء قائمة مهام يومية واضحة
3. شرح تعليمات الأدوية
4. تحديد علامات التحذير التي يجب مراقبتها
5. توضيح متى يجب المتابعة

قواعد:
1. استخدم لغة بسيطة ومفهومة
2. كن محددًا في التوقيتات
3. لا تضف معلومات غير موجودة في ملاحظات الطبيب

${this.getJsonInstruction()}

الناتج JSON:
{
  "todayActions": ["إجراءات اليوم"],
  "warningSignsWatchFor": ["علامات يجب مراقبتها"],
  "medicationInstructions": [
    {
      "medication": "اسم الدواء",
      "instructions": "تعليمات الاستخدام",
      "timing": "التوقيت"
    }
  ],
  "followUpSchedule": "موعد المتابعة",
  "lifestyleAdvice": ["نصائح لنمط الحياة"],
  "emergencyInstructions": "تعليمات الطوارئ"
}`,

      fr: `Vous êtes un assistant de soins de santé qui convertit les notes du médecin en instructions claires pour le patient.

Votre mission:
1. Traduire les notes médicales en langage simple
2. Créer une liste de tâches quotidiennes claire
3. Expliquer les instructions médicamenteuses
4. Identifier les signes d'alerte à surveiller
5. Clarifier quand faire le suivi

Règles:
1. Utilisez un langage simple et compréhensible
2. Soyez précis sur les horaires
3. N'ajoutez pas d'informations absentes des notes du médecin

${this.getJsonInstruction()}

Sortie JSON:
{
  "todayActions": ["Actions pour aujourd'hui"],
  "warningSignsWatchFor": ["Signes à surveiller"],
  "medicationInstructions": [
    {
      "medication": "Nom du médicament",
      "instructions": "Instructions d'utilisation",
      "timing": "Horaire"
    }
  ],
  "followUpSchedule": "Calendrier de suivi",
  "lifestyleAdvice": ["Conseils de mode de vie"],
  "emergencyInstructions": "Instructions d'urgence"
}`,

      en: `You are a healthcare assistant that converts doctor's notes into clear patient instructions.

Your mission:
1. Translate medical notes into simple language
2. Create a clear daily task list
3. Explain medication instructions
4. Identify warning signs to watch for
5. Clarify when to follow up

Rules:
1. Use simple, understandable language
2. Be specific about timing
3. Don't add information not in the doctor's notes

${this.getJsonInstruction()}

Output JSON:
{
  "todayActions": ["Today's actions"],
  "warningSignsWatchFor": ["Signs to watch for"],
  "medicationInstructions": [
    {
      "medication": "Medication name",
      "instructions": "Usage instructions",
      "timing": "Timing"
    }
  ],
  "followUpSchedule": "Follow-up schedule",
  "lifestyleAdvice": ["Lifestyle advice"],
  "emergencyInstructions": "Emergency instructions"
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: CarePlanInput, context?: AIContext): string {
    let prompt = `Create a patient care plan from:\n\n`;
    
    if (input.diagnosis) {
      prompt += `Diagnosis: ${input.diagnosis}\n\n`;
    }
    
    prompt += `Doctor's Notes:\n${input.doctorNotes}\n\n`;
    
    if (input.prescriptions && input.prescriptions.length > 0) {
      prompt += `Prescriptions:\n`;
      for (const rx of input.prescriptions) {
        if (rx.medications) {
          for (const med of rx.medications) {
            prompt += `- ${med.medication_name}: ${med.dosage}, ${med.frequency}, for ${med.duration}\n`;
          }
        }
      }
      prompt += '\n';
    }
    
    if (input.labOrders && input.labOrders.length > 0) {
      prompt += `Lab Orders:\n`;
      for (const lab of input.labOrders) {
        prompt += `- ${lab.test_name || lab.name}\n`;
      }
      prompt += '\n';
    }
    
    return prompt;
  }

  validateInput(input: CarePlanInput): { valid: boolean; error?: string } {
    if (!input.doctorNotes || input.doctorNotes.trim().length < 10) {
      return { valid: false, error: 'Doctor notes are required' };
    }
    return { valid: true };
  }
}

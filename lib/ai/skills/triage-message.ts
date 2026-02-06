/**
 * Message Triage Skill
 * Categorizes and prioritizes incoming messages
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, MessageTriageOutput } from '../types';

interface TriageInput {
  messageContent: string;
  senderType?: 'patient' | 'provider';
  messageContext?: string;
}

export class TriageMessageSkill extends BaseSkillHandler<TriageInput, MessageTriageOutput> {
  skill: AISkill = 'triage_message';
  preferredModel = 'llama3';
  temperature = 0.3;
  maxTokens = 1500;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت مساعد فرز رسائل لمنصة صحية. صنف الرسائل الواردة واقترح الردود.

الفئات المتاحة:
- appointment: استفسارات عن المواعيد
- medication: أسئلة عن الأدوية
- lab_result: استفسارات عن نتائج التحاليل
- prescription: طلبات وصفات أو تجديد
- urgent: حالات تحتاج اهتمام فوري
- billing: أسئلة عن الفواتير والدفع
- admin: طلبات إدارية
- general: استفسارات عامة

الأولويات:
- low: يمكن الرد خلال يوم أو يومين
- medium: يفضل الرد خلال ساعات
- high: يجب الرد اليوم
- urgent: يتطلب رد فوري

${this.getJsonInstruction()}

الناتج JSON:
{
  "category": "الفئة",
  "priority": "الأولوية",
  "suggestedReply": "رد مقترح مهني",
  "requiresHumanReview": true/false,
  "escalationReason": "سبب التصعيد إن وجد",
  "suggestedActions": ["إجراءات مقترحة"]
}`,

      fr: `Vous êtes un assistant de triage de messages pour une plateforme de santé. Catégorisez les messages entrants et suggérez des réponses.

Catégories disponibles:
- appointment: Questions sur les rendez-vous
- medication: Questions sur les médicaments
- lab_result: Questions sur les résultats de laboratoire
- prescription: Demandes d'ordonnances ou renouvellements
- urgent: Cas nécessitant attention immédiate
- billing: Questions sur la facturation
- admin: Demandes administratives
- general: Questions générales

Priorités:
- low: Peut répondre en 1-2 jours
- medium: Préférable de répondre dans les heures
- high: Doit répondre aujourd'hui
- urgent: Nécessite réponse immédiate

${this.getJsonInstruction()}

Sortie JSON:
{
  "category": "Catégorie",
  "priority": "Priorité",
  "suggestedReply": "Réponse suggérée professionnelle",
  "requiresHumanReview": true/false,
  "escalationReason": "Raison d'escalade si applicable",
  "suggestedActions": ["Actions suggérées"]
}`,

      en: `You are a message triage assistant for a healthcare platform. Categorize incoming messages and suggest responses.

Available categories:
- appointment: Appointment inquiries
- medication: Medication questions
- lab_result: Lab result inquiries
- prescription: Prescription requests or renewals
- urgent: Cases requiring immediate attention
- billing: Billing and payment questions
- admin: Administrative requests
- general: General inquiries

Priorities:
- low: Can respond in 1-2 days
- medium: Prefer to respond within hours
- high: Should respond today
- urgent: Requires immediate response

${this.getJsonInstruction()}

Output JSON:
{
  "category": "Category",
  "priority": "Priority",
  "suggestedReply": "Professional suggested reply",
  "requiresHumanReview": true/false,
  "escalationReason": "Escalation reason if applicable",
  "suggestedActions": ["Suggested actions"]
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: TriageInput, context?: AIContext): string {
    let prompt = `Triage this message:\n\n`;
    prompt += `Message: "${input.messageContent}"\n\n`;
    
    if (input.senderType) {
      prompt += `Sender type: ${input.senderType}\n`;
    }
    
    if (input.messageContext) {
      prompt += `Context: ${input.messageContext}\n`;
    }
    
    if (context?.patientHistory) {
      prompt += `\nPatient info:\n${this.formatPatientHistory(context.patientHistory)}\n`;
    }
    
    return prompt;
  }

  validateInput(input: TriageInput): { valid: boolean; error?: string } {
    if (!input.messageContent || input.messageContent.trim().length < 3) {
      return { valid: false, error: 'Message content is required' };
    }
    return { valid: true };
  }
}

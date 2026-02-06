/**
 * Symptom Extraction Skill
 * Extracts structured symptom data from free-text patient input
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, SymptomExtractionOutput } from '../types';

interface SymptomInput {
  freeText: string;
  patientAge?: number;
  patientGender?: string;
}

export class ExtractSymptomsSkill extends BaseSkillHandler<SymptomInput, SymptomExtractionOutput> {
  skill: AISkill = 'extract_symptoms';
  preferredModel = 'llama3';
  temperature = 0.3; // Low temperature for structured extraction
  maxTokens = 2000;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت مساعد فرز طبي أولي. مهمتك استخراج معلومات منظمة من وصف المريض لأعراضه.

قواعد صارمة:
1. لا تقم بأي تشخيص
2. لا تذكر أي مرض محدد
3. اقتراحات التخصص والنوع هي للتوجيه فقط
4. الطبيب سيقوم بالتقييم النهائي
5. إذا كانت الأعراض طارئة (ألم صدر، صعوبة تنفس، نزيف حاد)، ضع urgencyLevel: "urgent"

التخصصات المتاحة: general_practice, cardiology, neurology, dermatology, orthopedics, gastroenterology, pulmonology, endocrinology, psychiatry, ophthalmology, ent, urology, gynecology, pediatrics

${this.getJsonInstruction()}

الناتج JSON:
{
  "symptoms": [
    {
      "name": "اسم العرض",
      "duration": "المدة",
      "severity": "mild|moderate|severe",
      "frequency": "التكرار"
    }
  ],
  "suggestedSpecialty": "التخصص المقترح",
  "suggestedVisitType": "online|in_person|home_visit",
  "urgencyLevel": "routine|soon|urgent",
  "followUpQuestions": ["أسئلة إضافية لفهم أفضل"],
  "redFlags": ["علامات تحتاج اهتمام فوري"]
}`,

      fr: `Vous êtes un assistant de triage médical préliminaire. Votre tâche est d'extraire des informations structurées de la description des symptômes du patient.

Règles strictes:
1. Ne faites aucun diagnostic
2. Ne mentionnez aucune maladie spécifique
3. Les suggestions de spécialité et de type sont à titre indicatif uniquement
4. Le médecin effectuera l'évaluation finale
5. Si les symptômes sont urgents (douleur thoracique, difficulté respiratoire, hémorragie), mettez urgencyLevel: "urgent"

Spécialités disponibles: general_practice, cardiology, neurology, dermatology, orthopedics, gastroenterology, pulmonology, endocrinology, psychiatry, ophthalmology, ent, urology, gynecology, pediatrics

${this.getJsonInstruction()}

Sortie JSON:
{
  "symptoms": [
    {
      "name": "Nom du symptôme",
      "duration": "Durée",
      "severity": "mild|moderate|severe",
      "frequency": "Fréquence"
    }
  ],
  "suggestedSpecialty": "Spécialité suggérée",
  "suggestedVisitType": "online|in_person|home_visit",
  "urgencyLevel": "routine|soon|urgent",
  "followUpQuestions": ["Questions supplémentaires"],
  "redFlags": ["Signes nécessitant attention immédiate"]
}`,

      en: `You are a preliminary medical triage assistant. Your task is to extract structured information from the patient's symptom description.

Strict rules:
1. Never make any diagnosis
2. Never mention any specific disease
3. Specialty and visit type suggestions are for guidance only
4. The doctor will perform the final evaluation
5. If symptoms are urgent (chest pain, breathing difficulty, heavy bleeding), set urgencyLevel: "urgent"

Available specialties: general_practice, cardiology, neurology, dermatology, orthopedics, gastroenterology, pulmonology, endocrinology, psychiatry, ophthalmology, ent, urology, gynecology, pediatrics

${this.getJsonInstruction()}

Output JSON:
{
  "symptoms": [
    {
      "name": "Symptom name",
      "duration": "Duration",
      "severity": "mild|moderate|severe",
      "frequency": "Frequency"
    }
  ],
  "suggestedSpecialty": "Suggested specialty",
  "suggestedVisitType": "online|in_person|home_visit",
  "urgencyLevel": "routine|soon|urgent",
  "followUpQuestions": ["Follow-up questions"],
  "redFlags": ["Signs requiring immediate attention"]
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: SymptomInput, context?: AIContext): string {
    let prompt = `Patient describes their symptoms:\n\n"${input.freeText}"\n\n`;
    
    if (input.patientAge) {
      prompt += `Patient age: ${input.patientAge} years\n`;
    }
    
    if (input.patientGender) {
      prompt += `Patient gender: ${input.patientGender}\n`;
    }
    
    if (context?.patientHistory) {
      prompt += `\nPatient history:\n${this.formatPatientHistory(context.patientHistory)}\n`;
    }
    
    prompt += `\nExtract the symptoms and provide recommendations.`;
    
    return prompt;
  }

  validateInput(input: SymptomInput): { valid: boolean; error?: string } {
    if (!input.freeText || input.freeText.trim().length < 5) {
      return { valid: false, error: 'Please describe your symptoms in more detail' };
    }
    if (input.freeText.length > 5000) {
      return { valid: false, error: 'Symptom description is too long' };
    }
    return { valid: true };
  }
}

/**
 * AI Safety Post-Check Pipeline
 * Validates and sanitizes AI output before returning to user
 */

import { AISkill, PostCheckResult, Language } from '../types';

// Patterns for diagnostic language that should be removed/softened
const DIAGNOSTIC_PATTERNS = [
  /you have \w+ disease/gi,
  /this is definitely/gi,
  /i diagnose/gi,
  /your diagnosis is/gi,
  /you are suffering from/gi,
  /لديك مرض/gi,
  /تشخيصك هو/gi,
  /أنت مصاب بـ/gi,
  /vous avez la maladie/gi,
  /votre diagnostic est/gi,
  /vous souffrez de/gi,
];

// Patterns for prescription-like content
const PRESCRIPTION_PATTERNS = [
  /take \d+ (mg|ml|tablets?|pills?)/gi,
  /تناول \d+ (ملغ|حبة|قرص)/gi,
  /prenez \d+ (mg|ml|comprimés?)/gi,
  /i prescribe/gi,
  /أصف لك/gi,
  /je vous prescris/gi,
];

// Dangerous advice patterns
const DANGEROUS_PATTERNS = [
  /stop taking your medication/gi,
  /don't see a doctor/gi,
  /no need for medical attention/gi,
  /توقف عن تناول الدواء/gi,
  /لا حاجة للطبيب/gi,
  /arrêtez votre traitement/gi,
  /pas besoin de consulter/gi,
];

/**
 * Check if output contains diagnostic language
 */
function containsDiagnosticLanguage(output: any): boolean {
  const text = JSON.stringify(output);
  return DIAGNOSTIC_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if output contains prescription-like content
 */
function containsPrescriptionContent(output: any): boolean {
  const text = JSON.stringify(output);
  return PRESCRIPTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if output contains dangerous advice
 */
function containsDangerousAdvice(output: any): boolean {
  const text = JSON.stringify(output);
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Soften diagnostic language
 */
function softenDiagnosticLanguage(text: string): string {
  let softened = text;
  
  // Replace definitive language with softer alternatives
  softened = softened.replace(/you have/gi, 'you may have');
  softened = softened.replace(/this is definitely/gi, 'this could be');
  softened = softened.replace(/your diagnosis is/gi, 'possible considerations include');
  softened = softened.replace(/لديك مرض/gi, 'قد يكون لديك');
  softened = softened.replace(/تشخيصك هو/gi, 'من الاحتمالات');
  softened = softened.replace(/vous avez/gi, 'vous pourriez avoir');
  softened = softened.replace(/votre diagnostic est/gi, 'les possibilités incluent');
  
  return softened;
}

/**
 * Remove or flag dangerous advice
 */
function handleDangerousAdvice(text: string): string {
  let safe = text;
  
  // Add warnings before dangerous statements
  safe = safe.replace(
    /stop taking your medication/gi,
    '⚠️ [IMPORTANT: Never stop medication without consulting your doctor]'
  );
  safe = safe.replace(
    /توقف عن تناول الدواء/gi,
    '⚠️ [مهم: لا تتوقف عن تناول الدواء بدون استشارة طبيبك]'
  );
  safe = safe.replace(
    /arrêtez votre traitement/gi,
    '⚠️ [IMPORTANT: N\'arrêtez jamais votre traitement sans consulter votre médecin]'
  );
  
  return safe;
}

/**
 * Recursively apply text sanitization to an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    let sanitized = obj;
    sanitized = softenDiagnosticLanguage(sanitized);
    sanitized = handleDangerousAdvice(sanitized);
    return sanitized;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate output structure matches expected schema for skill
 */
function validateOutputStructure(output: any, skill: AISkill): boolean {
  if (!output || typeof output !== 'object') {
    return false;
  }
  
  // Basic structure validation per skill
  switch (skill) {
    case 'summarize_lab':
      return 'summary' in output || 'highlights' in output;
    case 'extract_symptoms':
      return 'symptoms' in output || 'suggestedSpecialty' in output;
    case 'draft_clinical_note':
      return 'chiefComplaint' in output || 'assessment' in output;
    case 'triage_message':
      return 'category' in output || 'priority' in output;
    case 'generate_care_plan':
      return 'todayActions' in output || 'medicationInstructions' in output;
    case 'explain_medication':
      return 'name' in output || 'purpose' in output;
    case 'check_interactions':
      return 'interactions' in output || 'overallRisk' in output;
    case 'suggest_lab_orders':
      return 'labSuggestions' in output || 'imagingSuggestions' in output;
    case 'inventory_forecast':
      return 'predictedDemand' in output || 'reorderRecommendation' in output;
    case 'quality_check':
      return 'overallStatus' in output || 'flags' in output;
    default:
      // For unknown skills, just check it's a non-empty object
      return Object.keys(output).length > 0;
  }
}

/**
 * Main post-check function
 * Validates and sanitizes AI output before returning to user
 */
export async function runPostChecks(
  output: any,
  skill: AISkill
): Promise<PostCheckResult> {
  const warnings: string[] = [];
  let modified = false;
  let sanitized = output;

  // 1. Check for dangerous advice first
  if (containsDangerousAdvice(output)) {
    sanitized = sanitizeObject(sanitized);
    warnings.push('Flagged potentially dangerous advice');
    modified = true;
  }

  // 2. Check for diagnostic language
  if (containsDiagnosticLanguage(output)) {
    sanitized = sanitizeObject(sanitized);
    warnings.push('Softened diagnostic language');
    modified = true;
  }

  // 3. Check for prescription content (warning only, don't modify)
  if (containsPrescriptionContent(output)) {
    warnings.push('Contains prescription-like content - ensure user understands this is not a real prescription');
  }

  // 4. Validate output structure
  if (!validateOutputStructure(sanitized, skill)) {
    return {
      safe: false,
      sanitized: null,
      warnings: ['Invalid output structure for skill: ' + skill],
      modified: false,
    };
  }

  return {
    safe: true,
    sanitized,
    warnings,
    modified,
  };
}

/**
 * Get disclaimer for a specific skill and language
 */
export function getDisclaimer(skill: AISkill, language: Language): string {
  const disclaimers: Record<AISkill, Record<Language, string>> = {
    summarize_lab: {
      ar: '⚠️ هذا الملخص للأغراض التعليمية فقط وليس تشخيصاً طبياً. استشر طبيبك لتفسير النتائج.',
      fr: '⚠️ Ce résumé est à titre éducatif uniquement et ne constitue pas un diagnostic médical. Consultez votre médecin pour l\'interprétation des résultats.',
      en: '⚠️ This summary is for educational purposes only and is not a medical diagnosis. Consult your doctor for result interpretation.',
    },
    extract_symptoms: {
      ar: '⚠️ هذا التقييم الأولي ليس تشخيصاً. الطبيب سيقوم بالتقييم النهائي.',
      fr: '⚠️ Cette évaluation préliminaire n\'est pas un diagnostic. Le médecin effectuera l\'évaluation finale.',
      en: '⚠️ This preliminary assessment is not a diagnosis. The doctor will perform the final evaluation.',
    },
    draft_clinical_note: {
      ar: '⚠️ مسودة تم إنشاؤها بالذكاء الاصطناعي. راجع وعدّل قبل الحفظ في سجل المريض.',
      fr: '⚠️ Brouillon généré par l\'IA. Veuillez réviser et modifier avant de sauvegarder dans le dossier du patient.',
      en: '⚠️ AI-generated draft. Review and modify before saving to patient record.',
    },
    triage_message: {
      ar: '⚠️ تصنيف تلقائي للمساعدة. راجع قبل الرد.',
      fr: '⚠️ Classification automatique pour assistance. Vérifiez avant de répondre.',
      en: '⚠️ Automated classification for assistance. Review before responding.',
    },
    explain_medication: {
      ar: '⚠️ هذه المعلومات تعليمية. استشر الصيدلي أو الطبيب قبل تغيير أي دواء.',
      fr: '⚠️ Ces informations sont éducatives. Consultez votre pharmacien ou médecin avant de modifier tout médicament.',
      en: '⚠️ This information is educational. Consult your pharmacist or doctor before changing any medication.',
    },
    generate_care_plan: {
      ar: '⚠️ خطة رعاية مبنية على ملاحظات الطبيب. اتبع تعليمات طبيبك.',
      fr: '⚠️ Plan de soins basé sur les notes du médecin. Suivez les instructions de votre médecin.',
      en: '⚠️ Care plan based on doctor\'s notes. Follow your doctor\'s instructions.',
    },
    check_interactions: {
      ar: '⚠️ أداة مساعدة للصيدلي. القرار النهائي يعود للصيدلي المرخص.',
      fr: '⚠️ Outil d\'aide au pharmacien. La décision finale appartient au pharmacien diplômé.',
      en: '⚠️ Pharmacist assistance tool. Final decision rests with the licensed pharmacist.',
    },
    suggest_lab_orders: {
      ar: '⚠️ اقتراحات مبنية على الأعراض. الطبيب يقرر الفحوصات المطلوبة.',
      fr: '⚠️ Suggestions basées sur les symptômes. Le médecin décide des examens nécessaires.',
      en: '⚠️ Suggestions based on symptoms. The doctor decides on required tests.',
    },
    inventory_forecast: {
      ar: '⚠️ توقعات مبنية على البيانات التاريخية. قد تختلف الطلبات الفعلية.',
      fr: '⚠️ Prévisions basées sur les données historiques. La demande réelle peut varier.',
      en: '⚠️ Forecasts based on historical data. Actual demand may vary.',
    },
    quality_check: {
      ar: '⚠️ فحص جودة تلقائي. المختبر يتحمل المسؤولية النهائية.',
      fr: '⚠️ Contrôle qualité automatique. Le laboratoire reste responsable.',
      en: '⚠️ Automated quality check. Laboratory remains responsible.',
    },
    translate_simplify: {
      ar: '⚠️ ترجمة تقريبية. راجع المصدر الأصلي.',
      fr: '⚠️ Traduction approximative. Consultez la source originale.',
      en: '⚠️ Approximate translation. Refer to original source.',
    },
    normalize_data: {
      ar: '⚠️ تطبيع تلقائي للبيانات. تحقق من الدقة.',
      fr: '⚠️ Normalisation automatique des données. Vérifiez l\'exactitude.',
      en: '⚠️ Automated data normalization. Verify accuracy.',
    },
    patient_analysis: {
      ar: '⚠️ تحليل مساعد للطبيب. القرار الطبي يعود للطبيب المعالج.',
      fr: '⚠️ Analyse d\'aide au médecin. La décision médicale appartient au médecin traitant.',
      en: '⚠️ Physician assistance analysis. Medical decisions rest with the treating physician.',
    },
    health_advice: {
      ar: '⚠️ نصائح صحية عامة. استشر طبيبك للحالات الخاصة.',
      fr: '⚠️ Conseils de santé généraux. Consultez votre médecin pour les cas particuliers.',
      en: '⚠️ General health advice. Consult your doctor for specific cases.',
    },
    referral_letter: {
      ar: '⚠️ مسودة خطاب تحويل. راجع وعدّل قبل الإرسال.',
      fr: '⚠️ Brouillon de lettre de référence. Révisez avant d\'envoyer.',
      en: '⚠️ Draft referral letter. Review and modify before sending.',
    },
  };

  return disclaimers[skill]?.[language] || disclaimers[skill]?.en || '';
}

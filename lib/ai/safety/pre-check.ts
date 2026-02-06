/**
 * AI Safety Pre-Check Pipeline
 * Validates input before sending to AI providers
 */

import { AIRequest, PreCheckResult, Language } from '../types';

// Emergency keywords that should bypass AI and show emergency message
const EMERGENCY_KEYWORDS: Record<Language, string[]> = {
  ar: [
    'انتحار', 'أقتل نفسي', 'نزيف شديد', 'لا أستطيع التنفس', 'سكتة قلبية',
    'أموت', 'ضيق تنفس شديد', 'ألم صدر حاد', 'فقدان الوعي', 'تسمم'
  ],
  fr: [
    'suicide', 'me tuer', 'hémorragie', 'ne peux pas respirer', 'crise cardiaque',
    'mourir', 'détresse respiratoire', 'douleur thoracique sévère', 'perte de conscience', 'empoisonnement'
  ],
  en: [
    'suicide', 'kill myself', 'heavy bleeding', 'cant breathe', 'heart attack',
    'dying', 'severe chest pain', 'loss of consciousness', 'poisoning', 'overdose'
  ],
};

const EMERGENCY_MESSAGES: Record<Language, string> = {
  ar: '🚨 إذا كنت في خطر فوري، اتصل بالطوارئ: 14 أو توجه لأقرب مستشفى. لا تنتظر.',
  fr: '🚨 Si vous êtes en danger immédiat, appelez les urgences: 14 ou rendez-vous aux urgences les plus proches. N\'attendez pas.',
  en: '🚨 If you are in immediate danger, call emergency services: 14 or go to the nearest emergency room. Do not wait.',
};

// PII patterns to mask in logs
const PII_PATTERNS = [
  /\b\d{10}\b/g, // Phone numbers
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone with separators
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{2}\/\d{2}\/\d{4}\b/g, // Dates
  /\b\d{16}\b/g, // Card numbers
];

/**
 * Check for emergency keywords in input
 */
function checkEmergencyKeywords(input: any, language: Language): { isEmergency: boolean; message?: string } {
  const text = JSON.stringify(input).toLowerCase();
  
  // Check all languages, not just the current one
  for (const [lang, keywords] of Object.entries(EMERGENCY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          isEmergency: true,
          message: EMERGENCY_MESSAGES[language] || EMERGENCY_MESSAGES.en,
        };
      }
    }
  }
  
  return { isEmergency: false };
}

/**
 * Mask PII in input for logging purposes
 */
export function maskPII(input: any): any {
  if (typeof input === 'string') {
    let masked = input;
    for (const pattern of PII_PATTERNS) {
      masked = masked.replace(pattern, '[REDACTED]');
    }
    return masked;
  }
  
  if (Array.isArray(input)) {
    return input.map(maskPII);
  }
  
  if (typeof input === 'object' && input !== null) {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      // Mask sensitive field names entirely
      if (['password', 'token', 'secret', 'ssn', 'card_number'].includes(key.toLowerCase())) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = maskPII(value);
      }
    }
    return masked;
  }
  
  return input;
}

/**
 * Check rate limits (currently returns true - unlimited for testing)
 */
async function checkRateLimit(userId: string, skill: string): Promise<{ allowed: boolean; reason?: string }> {
  // For now, always allow (unlimited testing)
  // TODO: Implement actual rate limiting when subscriptions are enabled
  return { allowed: true };
}

/**
 * Check subscription tier (currently returns true - all features unlocked)
 */
async function checkSubscriptionTier(userId: string, skill: string): Promise<{ allowed: boolean; reason?: string }> {
  // For now, always allow (all features unlocked for testing)
  // TODO: Implement subscription checking when tiers are enabled
  return { allowed: true };
}

/**
 * Validate input size and structure
 */
function validateInputSize(input: any): { valid: boolean; reason?: string } {
  const inputStr = JSON.stringify(input);
  
  // Max 100KB input
  if (inputStr.length > 100 * 1024) {
    return { valid: false, reason: 'Input too large. Maximum 100KB allowed.' };
  }
  
  // Check for extremely long strings (potential injection)
  const checkLongStrings = (obj: any, depth = 0): boolean => {
    if (depth > 10) return false; // Too deeply nested
    if (typeof obj === 'string' && obj.length > 50000) return false;
    if (Array.isArray(obj)) {
      if (obj.length > 1000) return false;
      return obj.every(item => checkLongStrings(item, depth + 1));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).every(val => checkLongStrings(val, depth + 1));
    }
    return true;
  };
  
  if (!checkLongStrings(input)) {
    return { valid: false, reason: 'Input contains invalid structure or extremely long values.' };
  }
  
  return { valid: true };
}

/**
 * Main pre-check function
 * Runs all safety checks before AI processing
 */
export async function runPreChecks(request: AIRequest): Promise<PreCheckResult> {
  // 1. Check for emergency keywords first
  const emergencyCheck = checkEmergencyKeywords(request.input, request.language);
  if (emergencyCheck.isEmergency) {
    return {
      safe: false,
      reason: emergencyCheck.message,
      emergencyDetected: true,
      emergencyMessage: emergencyCheck.message,
    };
  }

  // 2. Validate input size and structure
  const sizeCheck = validateInputSize(request.input);
  if (!sizeCheck.valid) {
    return {
      safe: false,
      reason: sizeCheck.reason,
    };
  }

  // 3. Check rate limits
  const rateLimitCheck = await checkRateLimit(request.userId, request.skill);
  if (!rateLimitCheck.allowed) {
    return {
      safe: false,
      reason: rateLimitCheck.reason || 'Rate limit exceeded. Please try again later.',
    };
  }

  // 4. Check subscription tier
  const tierCheck = await checkSubscriptionTier(request.userId, request.skill);
  if (!tierCheck.allowed) {
    return {
      safe: false,
      reason: tierCheck.reason || 'This feature requires a premium subscription.',
    };
  }

  // 5. Mask PII in input (for logging purposes)
  const sanitizedInput = maskPII(request.input);

  return {
    safe: true,
    sanitizedInput,
  };
}

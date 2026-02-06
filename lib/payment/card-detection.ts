/**
 * Card Detection Utility
 * Detects card type from BIN (Bank Identification Number) for Algerian and international cards.
 * Supports: Eddahabia, CIB (Visa/Mastercard), Visa, Mastercard, and generic detection.
 */

export type DetectedCardType =
  | 'eddahabia'   // Algerie Poste Eddahabia (BIN 437711)
  | 'cib_visa'    // CIB / SATIM Visa (Algerian bank)
  | 'cib_mastercard' // CIB / SATIM Mastercard (Algerian bank)
  | 'visa'        // Visa (international)
  | 'mastercard'  // Mastercard (international)
  | 'amex'        // American Express
  | 'discover'    // Discover
  | 'unknown'

export interface CardDetectionResult {
  type: DetectedCardType
  /** Suggested Chargily/payment method: edahabia, cib, or null if not applicable */
  suggestedPaymentMethod: 'edahabia' | 'cib' | null
  /** Display label (localized by caller) */
  labelKey: string
  /** Whether this card is compatible with Algerian payment gateways (Chargily) */
  isAlgerianCompatible: boolean
  /** Expected length for validation hint */
  expectedLength?: number
}

/** Eddahabia BIN - Algerie Poste card. Format: 4377 11XX XXXX XXXX */
const EDAHABIA_BIN = '437711'

/** BIN prefixes for detection (order matters - more specific first) */
const BIN_PATTERNS: Array<{
  pattern: RegExp
  type: 'visa' | 'mastercard' | 'amex' | 'discover'
  suggestedMethod: 'edahabia' | 'cib' | null
  expectedLength?: number
}> = [
  // American Express - 34 or 37 (check before generic)
  { pattern: /^3[47]/, type: 'amex', suggestedMethod: 'cib', expectedLength: 15 },
  // Mastercard - 51-55 or 2221-2720
  { pattern: /^(5[1-5]|2(22[1-9]|2[3-9]\d|[3-6]\d{2}|7(0[1-9]|1\d|20)))/, type: 'mastercard', suggestedMethod: 'cib', expectedLength: 16 },
  // Visa - starts with 4 (after Eddahabia which is 437711)
  { pattern: /^4/, type: 'visa', suggestedMethod: 'cib', expectedLength: 16 },
  // Discover - 6011, 644-649, 65
  { pattern: /^(6011|65\d{2}|64[4-9])/, type: 'discover', suggestedMethod: null, expectedLength: 16 },
]

/**
 * Get raw digits from card number (strip spaces, dashes, etc.)
 */
export function getCardDigits(cardNumber: string): string {
  return (cardNumber || '').replace(/\D/g, '')
}

/**
 * Detect card type from card number (BIN-based).
 * Returns detection result for display and routing.
 */
export function detectCardType(cardNumber: string): CardDetectionResult {
  const digits = getCardDigits(cardNumber)

  if (digits.length < 4) {
    return {
      type: 'unknown',
      suggestedPaymentMethod: null,
      labelKey: 'cardUnknown',
      isAlgerianCompatible: false,
    }
  }

  // Eddahabia - exact BIN match (must be before Visa since 437711 starts with 4)
  if (digits.startsWith(EDAHABIA_BIN)) {
    return {
      type: 'eddahabia',
      suggestedPaymentMethod: 'edahabia',
      labelKey: 'cardEddahabia',
      isAlgerianCompatible: true,
      expectedLength: 16,
    }
  }

  // CIB cards are Visa or Mastercard from Algerian banks (SATIM network).
  // Treat all Visa/Mastercard as CIB-compatible.
  for (const { pattern, type, suggestedMethod, expectedLength } of BIN_PATTERNS) {
    if (pattern.test(digits)) {
      const isCib = type === 'visa' || type === 'mastercard'
      const detType: DetectedCardType = isCib
        ? (type === 'visa' ? 'cib_visa' : 'cib_mastercard')
        : type
      const labelKey = type === 'visa' ? 'cardCibVisa' : type === 'mastercard' ? 'cardCibMastercard' : `card${type.charAt(0).toUpperCase() + type.slice(1)}`
      return {
        type: detType,
        suggestedPaymentMethod: suggestedMethod,
        labelKey,
        isAlgerianCompatible: suggestedMethod !== null,
        expectedLength,
      }
    }
  }

  return {
    type: 'unknown',
    suggestedPaymentMethod: null,
    labelKey: 'cardUnknown',
    isAlgerianCompatible: false,
  }
}

/**
 * Format card number with spaces (4-digit groups)
 */
export function formatCardNumber(value: string): string {
  const digits = getCardDigits(value)
  const parts: string[] = []
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.substring(i, i + 4))
  }
  return parts.join(' ')
}

/**
 * Validate card number length based on detected type
 */
export function validateCardLength(cardNumber: string): { valid: boolean; message?: string } {
  const digits = getCardDigits(cardNumber)
  const detection = detectCardType(cardNumber)

  if (detection.type === 'unknown' && digits.length >= 4) {
    return { valid: true } // Can't validate unknown
  }

  if (detection.expectedLength && digits.length > 0) {
    if (digits.length < detection.expectedLength) {
      return {
        valid: false,
        message: `Card number should be ${detection.expectedLength} digits`,
      }
    }
    if (digits.length > detection.expectedLength) {
      return {
        valid: false,
        message: `Card number should be ${detection.expectedLength} digits`,
      }
    }
  }

  // Generic: 13-19 digits for most cards
  if (digits.length >= 13 && digits.length <= 19) {
    return { valid: true }
  }
  if (digits.length > 0 && digits.length < 13) {
    return { valid: false, message: 'Card number is too short' }
  }

  return { valid: true }
}

/**
 * Luhn (mod 10) check for card number validity
 */
export function luhnCheck(cardNumber: string): boolean {
  const digits = getCardDigits(cardNumber)
  if (digits.length < 13) return false

  let sum = 0
  let isEven = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10)
    if (isEven) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    isEven = !isEven
  }
  return sum % 10 === 0
}

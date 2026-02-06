/**
 * INPUT VALIDATION & SANITIZATION
 * 
 * Prevents injection attacks (SQL, XSS, NoSQL).
 * All user input MUST be validated before processing.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean
  sanitized: string
  errors: string[]
}

export interface ValidationRule {
  pattern?: RegExp
  minLength?: number
  maxLength?: number
  required?: boolean
  allowHtml?: boolean
  customValidator?: (value: string) => boolean
}

// =============================================================================
// SANITIZATION
// =============================================================================

/**
 * Remove potentially dangerous HTML/script content.
 * Use for any user-provided text that will be displayed.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  
  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (can contain scripts)
    .replace(/data:/gi, '')
    // Escape remaining HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Sanitize for SQL-safe identifiers (table names, column names).
 * Only allows alphanumeric and underscores.
 */
export function sanitizeSqlIdentifier(input: string): string {
  if (!input) return ''
  return input.replace(/[^a-zA-Z0-9_]/g, '')
}

/**
 * Sanitize phone numbers - remove all non-digits except leading +
 */
export function sanitizePhone(input: string): string {
  if (!input) return ''
  const hasPlus = input.startsWith('+')
  const digits = input.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

/**
 * Sanitize email - lowercase, trim, basic validation
 */
export function sanitizeEmail(input: string): string {
  if (!input) return ''
  return input.toLowerCase().trim()
}

/**
 * Sanitize UUID - ensure valid format
 */
export function sanitizeUuid(input: string): string | null {
  if (!input) return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const cleaned = input.trim().toLowerCase()
  return uuidRegex.test(cleaned) ? cleaned : null
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate and sanitize a string input.
 */
export function validateString(
  input: unknown,
  rules: ValidationRule
): ValidationResult {
  const errors: string[] = []
  
  // Type check
  if (typeof input !== 'string') {
    if (rules.required) {
      return { valid: false, sanitized: '', errors: ['Value must be a string'] }
    }
    return { valid: true, sanitized: '', errors: [] }
  }
  
  let value = input.trim()
  
  // Required check
  if (rules.required && !value) {
    errors.push('This field is required')
  }
  
  // Length checks
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`)
  }
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`)
  }
  
  // Pattern check
  if (rules.pattern && value && !rules.pattern.test(value)) {
    errors.push('Invalid format')
  }
  
  // Custom validator
  if (rules.customValidator && value && !rules.customValidator(value)) {
    errors.push('Validation failed')
  }
  
  // Sanitize unless HTML is explicitly allowed
  const sanitized = rules.allowHtml ? value : sanitizeHtml(value)
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  }
}

/**
 * Validate email format.
 */
export function validateEmail(input: unknown): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', errors: ['Invalid email'] }
  }
  
  const sanitized = sanitizeEmail(input)
  const valid = emailRegex.test(sanitized)
  
  return {
    valid,
    sanitized,
    errors: valid ? [] : ['Invalid email format'],
  }
}

/**
 * Validate Algerian phone number.
 */
export function validateAlgerianPhone(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', errors: ['Invalid phone number'] }
  }
  
  const sanitized = sanitizePhone(input)
  // Algerian numbers: 0XXXXXXXXX (10 digits) or +213XXXXXXXXX
  const valid = /^(0[567]\d{8}|\+213[567]\d{8})$/.test(sanitized)
  
  return {
    valid,
    sanitized,
    errors: valid ? [] : ['Invalid Algerian phone number'],
  }
}

/**
 * Validate UUID format.
 */
export function validateUuid(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', errors: ['Invalid UUID'] }
  }
  
  const sanitized = sanitizeUuid(input)
  
  return {
    valid: sanitized !== null,
    sanitized: sanitized || '',
    errors: sanitized ? [] : ['Invalid UUID format'],
  }
}

/**
 * Validate password strength.
 */
export function validatePassword(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', errors: ['Invalid password'] }
  }
  
  const errors: string[] = []
  
  if (input.length < 8) errors.push('Password must be at least 8 characters')
  if (!/[A-Z]/.test(input)) errors.push('Password must contain uppercase letter')
  if (!/[a-z]/.test(input)) errors.push('Password must contain lowercase letter')
  if (!/[0-9]/.test(input)) errors.push('Password must contain a number')
  
  return {
    valid: errors.length === 0,
    sanitized: input, // Never sanitize passwords
    errors,
  }
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validate an entire request body against a schema.
 */
export function validateRequestBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: Record<keyof T, ValidationRule>
): { valid: boolean; data: Partial<T>; errors: Record<string, string[]> } {
  if (typeof body !== 'object' || body === null) {
    return { 
      valid: false, 
      data: {}, 
      errors: { _root: ['Request body must be an object'] } 
    }
  }
  
  const data: Partial<T> = {}
  const errors: Record<string, string[]> = {}
  let hasErrors = false
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = (body as Record<string, unknown>)[key]
    const result = validateString(value, rules as ValidationRule)
    
    if (!result.valid) {
      errors[key] = result.errors
      hasErrors = true
    } else {
      (data as Record<string, unknown>)[key] = result.sanitized
    }
  }
  
  return { valid: !hasErrors, data, errors }
}

// =============================================================================
// DANGEROUS INPUT DETECTION
// =============================================================================

/**
 * Detect potentially malicious input patterns.
 * Returns true if input looks suspicious.
 */
export function detectMaliciousInput(input: string): {
  isMalicious: boolean
  threats: string[]
} {
  const threats: string[] = []
  
  // SQL injection patterns
  if (/('|"|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i.test(input)) {
    threats.push('Potential SQL injection')
  }
  
  // XSS patterns
  if (/<script|javascript:|on\w+\s*=/i.test(input)) {
    threats.push('Potential XSS attack')
  }
  
  // Path traversal
  if (/\.\.\/|\.\.\\/.test(input)) {
    threats.push('Potential path traversal')
  }
  
  // Command injection
  if (/[;&|`$]/.test(input)) {
    threats.push('Potential command injection')
  }
  
  // LDAP injection
  if (/[()\\*]/.test(input) && /[=|&]/.test(input)) {
    threats.push('Potential LDAP injection')
  }
  
  return {
    isMalicious: threats.length > 0,
    threats,
  }
}

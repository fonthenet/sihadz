/**
 * DATA MASKING & REDACTION
 * 
 * Prevents sensitive data from appearing in logs, error messages, and responses.
 * Critical for healthcare data privacy compliance.
 */

// =============================================================================
// TYPES
// =============================================================================

interface MaskingRule {
  pattern: RegExp
  mask: (match: string) => string
}

// =============================================================================
// MASKING PATTERNS
// =============================================================================

const MASKING_RULES: MaskingRule[] = [
  // Email addresses: show first 2 chars + domain
  {
    pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    mask: (match) => {
      const [local, domain] = match.split('@')
      return `${local.slice(0, 2)}***@${domain}`
    },
  },
  
  // Phone numbers: show last 4 digits
  {
    pattern: /(\+?[0-9]{1,4})?[.\-\s]?\(?[0-9]{1,3}\)?[.\-\s]?[0-9]{1,4}[.\-\s]?[0-9]{1,9}/g,
    mask: (match) => {
      const digits = match.replace(/\D/g, '')
      if (digits.length < 4) return '****'
      return `***${digits.slice(-4)}`
    },
  },
  
  // Credit card numbers (16 digits)
  {
    pattern: /\b[0-9]{4}[.\-\s]?[0-9]{4}[.\-\s]?[0-9]{4}[.\-\s]?[0-9]{4}\b/g,
    mask: (match) => {
      const digits = match.replace(/\D/g, '')
      return `****-****-****-${digits.slice(-4)}`
    },
  },
  
  // National ID (Algerian format: 18 digits)
  {
    pattern: /\b[0-9]{18}\b/g,
    mask: () => '***NID***',
  },
  
  // CHIFA numbers (Algerian health insurance)
  {
    pattern: /\b[0-9]{12,15}\b/g,
    mask: (match) => `***${match.slice(-4)}`,
  },
  
  // Passwords in logs (various patterns)
  {
    pattern: /(password|pwd|passwd|secret|token|api_key|apikey|auth)["\s:=]+["']?([^"'\s,}]+)/gi,
    mask: (match, p1) => `${p1}=[REDACTED]`,
  },
  
  // JWT tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    mask: () => '[JWT_REDACTED]',
  },
  
  // UUIDs (partial masking for debugging)
  {
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    mask: (match) => `${match.slice(0, 8)}-****-****-****-${match.slice(-12)}`,
  },
]

// =============================================================================
// SENSITIVE FIELD NAMES
// =============================================================================

const SENSITIVE_FIELDS = new Set([
  // Personal identifiers
  'password', 'pwd', 'passwd',
  'token', 'access_token', 'refresh_token', 'jwt',
  'api_key', 'apikey', 'secret', 'secret_key',
  'ssn', 'national_id', 'id_number',
  'chifa_number', 'insurance_number',
  
  // Healthcare data
  'diagnosis', 'diagnosis_ar',
  'symptoms', 'symptoms_ar',
  'medical_history',
  'medications', 'prescriptions',
  'lab_results', 'test_results',
  'notes', 'clinical_notes',
  
  // Financial
  'credit_card', 'card_number', 'cvv', 'cvc',
  'bank_account', 'iban', 'routing_number',
  
  // Contact
  'phone', 'phone_number', 'mobile',
  'address', 'home_address', 'street',
])

// =============================================================================
// MASKING FUNCTIONS
// =============================================================================

/**
 * Mask sensitive patterns in a string.
 */
export function maskString(input: string): string {
  if (!input) return input
  
  let result = input
  
  for (const rule of MASKING_RULES) {
    result = result.replace(rule.pattern, rule.mask)
  }
  
  return result
}

/**
 * Mask sensitive fields in an object for logging.
 * Returns a new object with sensitive data redacted.
 */
export function maskObject<T extends Record<string, any>>(
  obj: T,
  options: {
    preserveStructure?: boolean
    customSensitiveFields?: string[]
  } = {}
): T {
  const { preserveStructure = true, customSensitiveFields = [] } = options
  
  const sensitiveFields = new Set([
    ...SENSITIVE_FIELDS,
    ...customSensitiveFields,
  ])
  
  const maskValue = (key: string, value: any): any => {
    // Check if this is a sensitive field
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveFields.has(lowerKey) ||
      [...sensitiveFields].some(sf => lowerKey.includes(sf))
    
    if (isSensitive) {
      if (preserveStructure) {
        if (typeof value === 'string') return '[REDACTED]'
        if (typeof value === 'number') return 0
        if (Array.isArray(value)) return '[REDACTED_ARRAY]'
        if (typeof value === 'object' && value !== null) return '[REDACTED_OBJECT]'
      }
      return '[REDACTED]'
    }
    
    // Recursively mask nested objects
    if (Array.isArray(value)) {
      return value.map((item, i) => 
        typeof item === 'object' && item !== null
          ? maskObject(item, options)
          : maskValue(String(i), item)
      )
    }
    
    if (typeof value === 'object' && value !== null) {
      return maskObject(value, options)
    }
    
    // Mask strings that might contain sensitive patterns
    if (typeof value === 'string') {
      return maskString(value)
    }
    
    return value
  }
  
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    result[key] = maskValue(key, value)
  }
  
  return result as T
}

/**
 * Create a safe log entry from an object.
 * Removes all sensitive data and limits size.
 */
export function createSafeLogEntry(
  data: Record<string, any>,
  options: {
    maxDepth?: number
    maxStringLength?: number
    maxArrayLength?: number
  } = {}
): Record<string, any> {
  const { 
    maxDepth = 3, 
    maxStringLength = 200,
    maxArrayLength = 10,
  } = options
  
  const truncate = (value: any, depth: number): any => {
    if (depth > maxDepth) return '[MAX_DEPTH]'
    
    if (typeof value === 'string') {
      const masked = maskString(value)
      if (masked.length > maxStringLength) {
        return masked.slice(0, maxStringLength) + '...[TRUNCATED]'
      }
      return masked
    }
    
    if (Array.isArray(value)) {
      const truncated = value.slice(0, maxArrayLength).map(v => truncate(v, depth + 1))
      if (value.length > maxArrayLength) {
        truncated.push(`...[${value.length - maxArrayLength} more]`)
      }
      return truncated
    }
    
    if (typeof value === 'object' && value !== null) {
      const result: Record<string, any> = {}
      for (const [k, v] of Object.entries(value)) {
        result[k] = truncate(v, depth + 1)
      }
      return result
    }
    
    return value
  }
  
  return truncate(maskObject(data), 0)
}

/**
 * Safe JSON.stringify that masks sensitive data.
 */
export function safeStringify(
  data: any,
  options: {
    pretty?: boolean
    maxLength?: number
  } = {}
): string {
  const { pretty = false, maxLength = 10000 } = options
  
  try {
    const masked = typeof data === 'object' && data !== null
      ? maskObject(data)
      : data
    
    const json = JSON.stringify(masked, null, pretty ? 2 : undefined)
    
    if (json.length > maxLength) {
      return json.slice(0, maxLength) + '...[TRUNCATED]'
    }
    
    return json
  } catch (e) {
    return '[STRINGIFY_ERROR]'
  }
}

/**
 * Log safely with automatic masking.
 */
export function safeLog(
  level: 'log' | 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, any>
): void {
  const logFn = console[level]
  
  if (data) {
    logFn(maskString(message), createSafeLogEntry(data))
  } else {
    logFn(maskString(message))
  }
}

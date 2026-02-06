/**
 * Tests for input-validation - OPTIONAL (delete __tests__ to remove)
 */
import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeSqlIdentifier,
  sanitizePhone,
  sanitizeEmail,
  sanitizeUuid,
  validateEmail,
  validateAlgerianPhone,
  validateUuid,
  validatePassword,
  detectMaliciousInput,
} from '@/lib/security/input-validation'

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>hello')).not.toContain('script')
  })

  it('escapes HTML entities', () => {
    expect(sanitizeHtml('<b>bold</b>')).toContain('&lt;')
    expect(sanitizeHtml('a & b')).toContain('&amp;')
  })

  it('returns empty for null/undefined', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('sanitizeSqlIdentifier', () => {
  it('allows alphanumeric and underscore', () => {
    expect(sanitizeSqlIdentifier('table_name')).toBe('table_name')
  })

  it('removes dangerous chars', () => {
    expect(sanitizeSqlIdentifier("table'; DROP")).toBe('tableDROP')
  })
})

describe('sanitizePhone', () => {
  it('keeps digits and leading +', () => {
    expect(sanitizePhone('+213 55 12 34 56 78')).toBe('+2135512345678')
  })

  it('removes non-digits when no plus', () => {
    expect(sanitizePhone('055-123-4567')).toBe('0551234567')
  })
})

describe('sanitizeEmail', () => {
  it('lowercases and trims', () => {
    expect(sanitizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })
})

describe('sanitizeUuid', () => {
  it('returns cleaned UUID when valid', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(sanitizeUuid(uuid)).toBe(uuid.toLowerCase())
  })

  it('returns null for invalid', () => {
    expect(sanitizeUuid('not-a-uuid')).toBe(null)
  })
})

describe('validateEmail', () => {
  it('validates correct emails', () => {
    expect(validateEmail('user@example.com').valid).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid').valid).toBe(false)
    expect(validateEmail('no@domain').valid).toBe(false)
  })
})

describe('validateAlgerianPhone', () => {
  it('validates 0X format', () => {
    expect(validateAlgerianPhone('0551234567').valid).toBe(true)
  })

  it('validates +213 format', () => {
    expect(validateAlgerianPhone('+213551234567').valid).toBe(true)
  })

  it('rejects invalid', () => {
    expect(validateAlgerianPhone('123').valid).toBe(false)
  })
})

describe('validateUuid', () => {
  it('validates correct UUID', () => {
    expect(validateUuid('550e8400-e29b-41d4-a716-446655440000').valid).toBe(true)
  })

  it('rejects invalid', () => {
    expect(validateUuid('x').valid).toBe(false)
  })
})

describe('validatePassword', () => {
  it('requires 8+ chars, upper, lower, number', () => {
    expect(validatePassword('Short1').valid).toBe(false)
    expect(validatePassword('nouppercase1').valid).toBe(false)
    expect(validatePassword('NOLOWERCASE1').valid).toBe(false)
    expect(validatePassword('NoNumbers').valid).toBe(false)
    expect(validatePassword('ValidPass1').valid).toBe(true)
  })
})

describe('detectMaliciousInput', () => {
  it('detects SQL injection', () => {
    const r = detectMaliciousInput("'; DROP TABLE users--")
    expect(r.isMalicious).toBe(true)
    expect(r.threats.some(t => t.includes('SQL'))).toBe(true)
  })

  it('detects XSS', () => {
    const r = detectMaliciousInput('<script>alert(1)</script>')
    expect(r.isMalicious).toBe(true)
  })

  it('allows safe input', () => {
    const r = detectMaliciousInput('Hello world')
    expect(r.isMalicious).toBe(false)
  })
})

/**
 * Tests for chat-error-and-hydrate - OPTIONAL (delete __tests__ to remove)
 */
import { describe, it, expect } from 'vitest'
import { getErrorMessage, isSchemaRelError } from '@/lib/chat/chat-error-and-hydrate'

describe('getErrorMessage', () => {
  it('returns fallback for null/undefined', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback')
  })

  it('returns string errors as-is', () => {
    expect(getErrorMessage('Something went wrong', 'fallback')).toBe('Something went wrong')
  })

  it('extracts message from Error-like objects', () => {
    expect(getErrorMessage({ message: 'DB error' }, 'fallback')).toBe('DB error')
  })

  it('falls back when message is empty', () => {
    expect(getErrorMessage({ message: '' }, 'fallback')).toBe('{"message":""}')
  })

  it('tries error_description, details, hint, code', () => {
    expect(getErrorMessage({ error_description: 'Auth failed' }, 'fallback')).toBe('Auth failed')
    expect(getErrorMessage({ details: 'Constraint violation' }, 'fallback')).toBe('Constraint violation')
  })
})

describe('isSchemaRelError', () => {
  it('returns true for relationship error', () => {
    expect(
      isSchemaRelError(
        { message: "Could not find a relationship between 'chat_messages' and 'profiles'" },
        'chat_messages',
        'profiles'
      )
    ).toBe(true)
  })

  it('returns true for schema cache error', () => {
    expect(isSchemaRelError({ message: 'schema cache invalid' }, 'a', 'b')).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isSchemaRelError({ message: 'Network error' }, 'chat_messages', 'profiles')).toBe(false)
    expect(isSchemaRelError('Generic error', 'a', 'b')).toBe(false)
  })
})

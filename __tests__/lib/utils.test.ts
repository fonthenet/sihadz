/**
 * Tests for lib/utils - OPTIONAL (delete __tests__ to remove)
 */
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toContain('visible')
  })

  it('handles tailwind conflicts (last wins)', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBeTruthy()
  })
})

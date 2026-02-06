/**
 * Tests for payment validation - OPTIONAL (delete __tests__ to remove)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatPaymentError,
  validateWalletPayment,
  calculateRefundInfo,
  parseApiError,
  PAYMENT_ERRORS,
} from '@/lib/payment/validation'

describe('formatPaymentError', () => {
  it('replaces placeholders with details', () => {
    const err = {
      ...PAYMENT_ERRORS.WALLET_INSUFFICIENT_BALANCE,
      details: { difference: 500 },
    }
    const msg = formatPaymentError(err, 'en')
    expect(msg).toContain('500')
  })
})

describe('validateWalletPayment', () => {
  it('returns AUTH error when not logged in', () => {
    const r = validateWalletPayment(1000, 500, false)
    expect(r?.code).toBe('BOOKING_REQUIRES_AUTH')
  })

  it('returns NOT_FOUND when wallet is null', () => {
    const r = validateWalletPayment(null, 500, true)
    expect(r?.code).toBe('WALLET_NOT_FOUND')
  })

  it('returns ZERO_BALANCE when balance is 0', () => {
    const r = validateWalletPayment(0, 500, true)
    expect(r?.code).toBe('WALLET_ZERO_BALANCE')
  })

  it('returns INSUFFICIENT when balance < deposit', () => {
    const r = validateWalletPayment(300, 500, true)
    expect(r?.code).toBe('WALLET_INSUFFICIENT_BALANCE')
    expect(r?.details?.difference).toBe(200)
  })

  it('returns null when balance sufficient', () => {
    const r = validateWalletPayment(500, 500, true)
    expect(r).toBe(null)
  })
})

describe('calculateRefundInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 100% for provider cancellation', () => {
    const appt = new Date('2025-02-10T10:00:00')
    vi.setSystemTime(new Date('2025-02-09T10:00:00'))
    const r = calculateRefundInfo(appt, 500, 'provider')
    expect(r.percentage).toBe(100)
    expect(r.amount).toBe(500)
    expect(r.forfeit).toBe(0)
  })

  it('returns 100% when 48h+ notice (patient)', () => {
    const appt = new Date('2025-02-10T10:00:00')
    vi.setSystemTime(new Date('2025-02-08T09:00:00')) // 49h before
    const r = calculateRefundInfo(appt, 500, 'patient')
    expect(r.percentage).toBe(100)
    expect(r.amount).toBe(500)
  })

  it('returns 50% when 24-48h notice', () => {
    const appt = new Date('2025-02-10T10:00:00')
    vi.setSystemTime(new Date('2025-02-09T00:00:00')) // 34h before (in 24-48h window)
    const r = calculateRefundInfo(appt, 500, 'patient')
    expect(r.percentage).toBe(50)
    expect(r.amount).toBe(250)
    expect(r.forfeit).toBe(250)
  })

  it('returns 0% when less than 24h', () => {
    const appt = new Date('2025-02-10T10:00:00')
    vi.setSystemTime(new Date('2025-02-10T09:00:00')) // 1h before
    const r = calculateRefundInfo(appt, 500, 'patient')
    expect(r.percentage).toBe(0)
    expect(r.amount).toBe(0)
    expect(r.forfeit).toBe(500)
  })
})

describe('parseApiError', () => {
  it('maps Insufficient balance to WALLET_INSUFFICIENT_BALANCE', () => {
    const r = parseApiError({ message: 'Insufficient balance' })
    expect(r.code).toBe('WALLET_INSUFFICIENT_BALANCE')
  })

  it('maps duplicate to BOOKING_DUPLICATE', () => {
    const r = parseApiError({ message: 'already exists' })
    expect(r.code).toBe('BOOKING_DUPLICATE')
  })

  it('returns default for unknown', () => {
    const r = parseApiError({ message: 'Something weird' }, 'SYSTEM_ERROR')
    expect(r.code).toBe('SYSTEM_ERROR')
  })
})

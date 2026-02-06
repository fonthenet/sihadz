'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * Prevents double submission of async actions (orders, forms, etc.).
 * Returns [execute, isSubmitting] - wrap your async handler and use isSubmitting to disable UI.
 * Uses a ref for synchronous guard so rapid double-clicks are blocked before state updates.
 *
 * @example
 * const [submitOrder, isSubmitting] = useSubmitGuard(async () => {
 *   await fetch('/api/orders', { method: 'POST', ... })
 * })
 * <Button onClick={submitOrder} disabled={isSubmitting}>Submit</Button>
 */
export function useSubmitGuard<T extends (...args: any[]) => Promise<any>>(
  handler: T
): [(...args: Parameters<T>) => Promise<void>, boolean] {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlightRef = useRef(false)

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      setIsSubmitting(true)
      try {
        await handler(...args)
      } finally {
        inFlightRef.current = false
        setIsSubmitting(false)
      }
    },
    [handler]
  )

  return [execute, isSubmitting]
}

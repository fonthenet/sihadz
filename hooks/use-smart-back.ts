'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Smart back navigation: uses router.back() to return to the exact previous page
 * (preserving list filters, sort, scroll). Falls back to fallbackUrl when there's
 * no history (e.g. opened in new tab).
 */
export function useSmartBack(fallbackUrl: string) {
  const router = useRouter()
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackUrl)
    }
  }, [router, fallbackUrl])
}

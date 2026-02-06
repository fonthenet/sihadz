'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * Persist tab selection in URL so refresh keeps the user on the same tab.
 * Uses ?tab=value query param.
 */
export function useUrlTab(paramKey: string, validValues: string[], defaultValue: string) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tab = useMemo(() => {
    const raw = searchParams.get(paramKey)
    if (raw && validValues.includes(raw)) return raw
    return defaultValue
  }, [searchParams, paramKey, validValues, defaultValue])

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === defaultValue) {
        params.delete(paramKey)
      } else {
        params.set(paramKey, value)
      }
      const query = params.toString()
      const url = query ? `${pathname}?${query}` : pathname
      router.replace(url, { scroll: false })
    },
    [pathname, router, searchParams, paramKey, defaultValue]
  )

  return [tab, setTab] as const
}

'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export type PreservedParamConfig = {
  key: string
  defaultValue: string
  validValues?: string[]
}

/**
 * Persist list state (filters, sort, view) in URL so:
 * - Back button returns to exact state
 * - Refresh preserves state
 * - Shareable URLs
 *
 * Usage:
 *   const { state, update, getBackHref } = usePreservedListState({
 *     params: [
 *       { key: 'date', defaultValue: 'upcoming', validValues: ['all','today','upcoming','past'] },
 *       { key: 'sort', defaultValue: 'date-desc' },
 *       { key: 'view', defaultValue: 'by-date' },
 *     ],
 *     listPath: '/professional/dashboard/appointments',
 *   })
 *   // state.date, state.sort, state.view
 *   // update('date', 'today')
 *   // Back button: router.back() or <Link href={getBackHref()}>
 */
export function usePreservedListState(config: {
  params: PreservedParamConfig[]
  listPath: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const state = useMemo(() => {
    const s: Record<string, string> = {}
    for (const p of config.params) {
      const raw = searchParams.get(p.key)
      const value = raw && (!p.validValues || p.validValues.includes(raw)) ? raw : p.defaultValue
      s[p.key] = value
    }
    return s
  }, [searchParams, config.params])

  const update = useCallback(
    (key: string, value: string) => {
      const paramConfig = config.params.find(p => p.key === key)
      const defaultValue = paramConfig?.defaultValue ?? ''
      const params = new URLSearchParams(searchParams.toString())
      if (value === defaultValue || !value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const query = params.toString()
      const url = query ? `${config.listPath}?${query}` : config.listPath
      router.replace(url, { scroll: false })
    },
    [config.listPath, config.params, router, searchParams]
  )

  const getBackHref = useCallback(() => {
    const q = searchParams.toString()
    return q ? `${config.listPath}?${q}` : config.listPath
  }, [config.listPath, searchParams])

  return { state, update, getBackHref }
}

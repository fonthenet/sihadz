'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_INTERVAL_MS = 60_000 // 60 seconds

export interface AutoRefreshOpts {
  /** When true, avoid showing loading spinners or causing visible UI changes. */
  silent?: boolean
}

export interface UseAutoRefreshOptions {
  /** Only run refresh when the tab is visible (default: true). Reduces load when user switches tabs. */
  whenVisibleOnly?: boolean
  /** Pause auto-refresh when false. Typically pass !!user so refresh only runs when logged in (default: true). */
  enabled?: boolean
}

export type AutoRefreshCallback = (opts?: AutoRefreshOpts) => void | Promise<void>

/**
 * Runs the given callback on an interval to auto-refresh dashboard data.
 * Uses a ref for the callback so the interval always invokes the latest function
 * without needing to re-create the interval when dependencies change.
 *
 * Interval ticks call the callback with { silent: true } so it can avoid showing
 * loading states and prevent visible page reloads / work loss.
 *
 * @param refetch - Async or sync function. Receives { silent?: boolean } on interval ticks.
 * @param intervalMs - Interval in milliseconds (default: 60000).
 * @param options - whenVisibleOnly (default true), enabled (default true; pass !!user to run only when logged in).
 */
export function useAutoRefresh(
  refetch: AutoRefreshCallback,
  intervalMs: number = DEFAULT_INTERVAL_MS,
  options: UseAutoRefreshOptions = {}
): void {
  const { whenVisibleOnly = true, enabled = true } = options
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return

    const tick = () => {
      if (whenVisibleOnly && typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      try {
        const fn = refetchRef.current
        if (fn) {
          const result = fn({ silent: true })
          if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch(() => {})
          }
        }
      } catch (_) {}
    }

    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled, whenVisibleOnly])
}

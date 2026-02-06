'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { User } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UiPresence = 'available' | 'busy' | 'away' | 'not_available'

const STORAGE_KEY = (userId: string) => `dzd_presence_manual_v1:${userId}`

export function dotClassFor(status: UiPresence) {
  switch (status) {
    case 'available':
      return 'bg-emerald-500'
    case 'busy':
      return 'bg-rose-500'
    case 'away':
      return 'bg-amber-500'
    case 'not_available':
      return 'bg-slate-400'
  }
}

/** Get dot color class from DB presence_status value (online/busy/away/offline) */
export function dotClassForDbStatus(dbStatus: string | null | undefined): string {
  switch (dbStatus) {
    case 'online':
      return 'bg-emerald-500'
    case 'busy':
      return 'bg-rose-500'
    case 'away':
      return 'bg-amber-500'
    case 'offline':
    default:
      return 'bg-slate-400'
  }
}

/** Get human-readable label from DB presence_status value */
export function statusLabelForDb(dbStatus: string | null | undefined): string {
  switch (dbStatus) {
    case 'online':
      return 'Online'
    case 'busy':
      return 'Busy'
    case 'away':
      return 'Away'
    case 'offline':
    default:
      return 'Offline'
  }
}

/** Check if user should show a presence indicator (any status except offline) */
export function shouldShowPresence(dbStatus: string | null | undefined, isOnline?: boolean): boolean {
  // Show presence for any non-offline status, or if is_online is true
  if (dbStatus && dbStatus !== 'offline') return true
  return isOnline === true
}

function toDbStatus(status: UiPresence): 'online' | 'away' | 'offline' | 'busy' {
  switch (status) {
    case 'available':
      return 'online'
    case 'busy':
      return 'busy'
    case 'away':
      return 'away'
    case 'not_available':
      return 'offline'
  }
}

function isOnlineFor(status: UiPresence) {
  return status === 'available' || status === 'busy'
}

/** Read-only status dot - no dropdown, just displays presence status from DB */
export function StatusDot({ userId, className }: { userId: string; className?: string }) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [dbStatus, setDbStatus] = useState<string>('offline')

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Fetch directly from DB - this is for displaying OTHER users' status
      const { data } = await supabase
        .from('profiles')
        .select('presence_status, is_online')
        .eq('id', userId)
        .maybeSingle()

      if (!alive) return
      const status = (data as any)?.presence_status || 'offline'
      // If presence_status not set but is_online is true, show as online
      if (status === 'offline' && (data as any)?.is_online) {
        setDbStatus('online')
      } else {
        setDbStatus(status)
      }
    })()

    return () => { alive = false }
  }, [supabase, userId])

  // Don't show anything if offline
  if (dbStatus === 'offline') return null

  return (
    <span
      className={cn('block h-2.5 w-2.5 shrink-0 rounded-full', dotClassForDbStatus(dbStatus), className)}
      title={dbStatus === 'online' ? 'Online' : dbStatus === 'busy' ? 'Busy' : dbStatus === 'away' ? 'Away' : 'Offline'}
    />
  )
}

/** Display-only status dot with pre-fetched status - no DB call */
export function StatusDotFromData({ 
  presenceStatus, 
  isOnline,
  className 
}: { 
  presenceStatus?: string | null
  isOnline?: boolean
  className?: string 
}) {
  const show = shouldShowPresence(presenceStatus, isOnline)
  if (!show) return null

  return (
    <span
      className={cn('block h-2.5 w-2.5 shrink-0 rounded-full', dotClassForDbStatus(presenceStatus), className)}
      title={presenceStatus === 'online' ? 'Online' : presenceStatus === 'busy' ? 'Busy' : presenceStatus === 'away' ? 'Away' : 'Offline'}
    />
  )
}

export function PresenceStatusSelector({
  userId,
  className,
  displayName,
  avatarUrl,
  extraMenuItems,
  compact,
  hideDot,
}: {
  userId: string
  className?: string
  displayName?: string
  avatarUrl?: string | null
  extraMenuItems?: ReactNode
  /** When true, renders a smaller trigger to fit inline with titles */
  compact?: boolean
  /** When true, hides the status dot indicator */
  hideDot?: boolean
}) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [status, setStatus] = useState<UiPresence>('available')
  const [loading, setLoading] = useState(false)

  // Load initial (prefer manual override, else DB)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY(userId))
        if (raw) {
          const parsed = raw as UiPresence
          if (parsed === 'available' || parsed === 'busy' || parsed === 'away' || parsed === 'not_available') {
            if (alive) setStatus(parsed)
            return
          }
        }
      } catch (_) {}

      const { data } = await supabase
        .from('profiles')
        .select('presence_status, is_online')
        .eq('id', userId)
        .maybeSingle()

      if (!alive) return
      const db = String((data as any)?.presence_status || '')
      if (db === 'offline') setStatus('not_available')
      else if (db === 'away') setStatus('away')
      else if (db === 'busy') setStatus('busy')
      else setStatus('available')
    })()

    return () => {
      alive = false
    }
  }, [supabase, userId])

  const persistManual = useCallback((next: UiPresence) => {
    try {
      localStorage.setItem(STORAGE_KEY(userId), next)
      window.dispatchEvent(new Event('dzd_presence_changed'))
    } catch (_) {}
  }, [userId])

  const update = useCallback(async (next: UiPresence) => {
    setStatus(next)
    persistManual(next)
    setLoading(true)

    const dbStatus = toDbStatus(next)
    const payload: any = {
      is_online: isOnlineFor(next),
      presence_status: dbStatus,
      last_seen_at: new Date().toISOString(),
    }

    const tryUpdate = async (p: any) => {
      const res = await supabase.from('profiles').update(p).eq('id', userId)
      return res.error
    }

    let err = await tryUpdate(payload)
    // If DB doesn't support "busy" (enum), fall back to "away"
    if (err && next === 'busy') {
      const fallback: any = { ...payload, presence_status: 'away', is_online: true }
      const err2 = await tryUpdate(fallback)
      if (!err2) {
        setStatus('away')
        persistManual('away')
        err = null
      }
    }
    // If presence_status column/enum fails, at least update is_online
    if (err) {
      await tryUpdate({ is_online: isOnlineFor(next), last_seen_at: new Date().toISOString() })
    }

    setLoading(false)
  }, [persistManual, supabase, userId])

  const [open, setOpen] = useState(false)
  const trigger = useMemo(() => {
    const dotSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
    const dotEl = hideDot ? null : (
      <span
        className={cn(
          'absolute -bottom-0.5 -end-0.5 rounded-full ring-2 ring-white dark:ring-slate-900',
          dotSize,
          dotClassFor(status)
        )}
        title={status.replace('_', ' ')}
      />
    )
    const dotSizeLarge = compact ? 'h-3 w-3' : 'h-3.5 w-3.5'
    if (compact && displayName) {
      return (
        <Button variant="ghost" size="sm" disabled={loading} suppressHydrationWarning className={cn('h-8 gap-1.5 rounded-lg px-2 py-1.5 bg-sky-100/80 text-sky-900 hover:bg-sky-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25', className)}>
          <span className="relative flex h-5 w-5 shrink-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden bg-background/80">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-3 w-3" />
              )}
            </span>
            {dotEl}
          </span>
          <span className="max-w-[72px] truncate text-xs font-medium">{displayName}</span>
        </Button>
      )
    }
    return displayName ? (
      <Button variant="ghost" size="sm" disabled={loading} suppressHydrationWarning className={cn('gap-2 rounded-full px-3 py-1.5 bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25', className)}>
        <span className="relative flex h-8 w-8 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-background/80">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </span>
          {dotEl}
        </span>
        <span className="max-w-[150px] truncate font-medium">{displayName}</span>
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        disabled={loading}
        suppressHydrationWarning
        title={`Status: ${status.replace('_', ' ')}. Click to change.`}
        className={cn(
          'h-6 w-6 min-w-6 rounded-full p-0.5 border-0 shadow-none hover:bg-transparent cursor-pointer',
          className
        )}
      >
        {hideDot ? <User className="h-4 w-4" /> : <span className={cn('block rounded-full', dotSizeLarge, dotClassFor(status))} />}
      </Button>
    )
  }, [displayName, avatarUrl, status, loading, className, compact, hideDot])

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Status</div>
        <DropdownMenuItem onClick={() => update('available')}>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            Available
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => update('busy')}>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            Busy
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => update('away')}>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            Away
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => update('not_available')}>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
            Not available
          </span>
        </DropdownMenuItem>
        {extraMenuItems && (
          <>
            <DropdownMenuSeparator />
            {extraMenuItems}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


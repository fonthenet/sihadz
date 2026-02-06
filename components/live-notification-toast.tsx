'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Clock,
  Info,
  AlertCircle,
  FlaskConical,
  ShoppingCart,
  Truck,
  X,
  ArrowRight,
  ClipboardList,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/language-context'
import { cn } from '@/lib/utils'

const AUTO_DISMISS_MS = 15000
const MAX_VISIBLE = 3
const POLL_INTERVAL_MS = 20000

interface ToastNotification {
  id: string
  type: string
  title: string
  title_ar?: string
  title_fr?: string
  message: string
  message_ar?: string
  message_fr?: string
  action_url?: string
  metadata?: Record<string, unknown>
  created_at: string
}

function getIcon(type: string) {
  switch (type) {
    case 'appointment':
    case 'appointment_rescheduled':
      return <Calendar className="h-5 w-5 text-primary shrink-0" />
    case 'appointment_cancelled':
      return <Calendar className="h-5 w-5 text-red-500 shrink-0" />
    case 'prescription':
    case 'new_prescription':
    case 'prescription_sent':
    case 'prescription_ready':
    case 'prescription_collected':
    case 'prescription_dispensed':
    case 'prescription_partial':
    case 'prescription_unavailable':
    case 'prescription_declined':
    case 'prescription_fulfilled':
      return <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
    case 'payment':
      return <CreditCard className="h-5 w-5 text-blue-500 shrink-0" />
    case 'message':
    case 'chat':
      return <MessageSquare className="h-5 w-5 text-teal-500 shrink-0" />
    case 'review':
      return <MessageSquare className="h-5 w-5 text-amber-500 shrink-0" />
    case 'reminder':
      return <Clock className="h-5 w-5 text-orange-500 shrink-0" />
    case 'new_lab_request':
    case 'lab_request_created':
      return <FlaskConical className="h-5 w-5 text-violet-500 shrink-0" />
    case 'lab_results_ready':
      return <FlaskConical className="h-5 w-5 text-emerald-500 shrink-0" />
    case 'lab_request_denied':
      return <FlaskConical className="h-5 w-5 text-red-500 shrink-0" />
    case 'document_added':
    case 'file_added':
      return <FileText className="h-5 w-5 text-sky-500 shrink-0" />
    case 'supplier_order':
      return <ClipboardList className="h-5 w-5 text-amber-500 shrink-0" />
    case 'supplier_invoice':
      return <ShoppingCart className="h-5 w-5 text-amber-500 shrink-0" />
    case 'new_referral':
    case 'referral_created':
      return <Truck className="h-5 w-5 text-violet-500 shrink-0" />
    case 'alert':
      return <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
    case 'system':
    default:
      return <Info className="h-5 w-5 text-muted-foreground shrink-0" />
  }
}

function getTitle(n: ToastNotification, language: string) {
  if (language === 'ar' && n.title_ar) return n.title_ar
  if (language === 'fr' && n.title_fr) return n.title_fr
  return n.title
}

function getMessage(n: ToastNotification, language: string) {
  if (language === 'ar' && n.message_ar) return n.message_ar
  if (language === 'fr' && n.message_fr) return n.message_fr
  return n.message
}

function getAccentForType(type: string): string {
  switch (type) {
    case 'appointment':
    case 'appointment_rescheduled':
      return 'border-s-4 border-s-primary'
    case 'appointment_cancelled':
    case 'lab_request_denied':
    case 'alert':
      return 'border-s-4 border-s-red-500'
    case 'supplier_order':
    case 'supplier_invoice':
      return 'border-s-4 border-s-amber-500'
    case 'new_prescription':
    case 'prescription_ready':
    case 'lab_results_ready':
      return 'border-s-4 border-s-emerald-500'
    case 'new_lab_request':
    case 'lab_request_created':
    case 'new_referral':
    case 'referral_created':
      return 'border-s-4 border-s-violet-500'
    case 'chat':
    case 'message':
      return 'border-s-4 border-s-teal-500'
    case 'payment':
      return 'border-s-4 border-s-blue-500'
    default:
      return 'border-s-4 border-s-muted-foreground'
  }
}

export interface LiveNotificationToastProps {
  userId: string | null
  /** Optional: for professional dashboards (doctor, pharmacy, supplier, etc.) */
  userType?: string
  className?: string
}

export function LiveNotificationToast({ userId, userType, className }: LiveNotificationToastProps) {
  const { language, dir } = useLanguage()
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      setDismissed((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }, [])

  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addToast = useCallback(
    (n: ToastNotification) => {
      setToasts((prev) => {
        const next = [n, ...prev].slice(0, MAX_VISIBLE * 2)
        return next
      })
      const t = setTimeout(() => dismiss(n.id), AUTO_DISMISS_MS)
      timeoutsRef.current.set(n.id, t)
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t))
      timeoutsRef.current.clear()
    }
  }, [])

  const seenIdsRef = useRef<Set<string>>(new Set())

  const rowToToast = useCallback((row: Record<string, unknown>): ToastNotification => ({
    id: row.id as string,
    type: (row.type as string) || 'system',
    title: (row.title as string) || '',
    title_ar: row.title_ar as string | undefined,
    title_fr: row.title_fr as string | undefined,
    message: (row.message as string) || '',
    message_ar: row.message_ar as string | undefined,
    message_fr: row.message_fr as string | undefined,
    action_url: row.action_url as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    created_at: row.created_at as string,
  }), [])

  const handleNewNotification = useCallback((n: ToastNotification) => {
    if (seenIdsRef.current.has(n.id)) return
    seenIdsRef.current.add(n.id)
    addToast(n)
  }, [addToast])

  // Realtime subscription (primary - instant delivery)
  useEffect(() => {
    if (!userId) return

    const supabase = createBrowserClient()
    const ch = supabase
      .channel('live-notification-toast')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          handleNewNotification(rowToToast(row))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [userId, handleNewNotification, rowToToast])

  // Polling fallback (when realtime is disabled or unreliable)
  useEffect(() => {
    if (!userId) return

    const supabase = createBrowserClient()
    let baselineEstablished = false

    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, title_ar, title_fr, message, message_ar, message_fr, action_url, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      const rows = (data || []) as Record<string, unknown>[]
      if (!baselineEstablished) {
        for (const row of rows) seenIdsRef.current.add(row.id as string)
        baselineEstablished = true
        return
      }
      for (const row of rows) {
        const n = rowToToast(row)
        if (seenIdsRef.current.has(n.id)) continue
        seenIdsRef.current.add(n.id)
        addToast(n)
      }
    }

    const t = setTimeout(poll, 2000)
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [userId, addToast, rowToToast])

  const visible = toasts.slice(0, MAX_VISIBLE)

  if (visible.length === 0) return null

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-3 pointer-events-none',
        dir === 'rtl' ? 'start-4 bottom-4' : 'end-4 bottom-4',
        'max-w-[min(360px,calc(100vw-2rem))]',
        className
      )}
      role="region"
      aria-label="Live notifications"
    >
      {visible.map((n) => (
        <LiveToastCard
          key={n.id}
          notification={n}
          language={language}
          dir={dir}
          isDismissing={dismissed.has(n.id)}
          onDismiss={() => dismiss(n.id)}
          getIcon={getIcon}
          getTitle={getTitle}
          getMessage={getMessage}
          getAccent={getAccentForType}
        />
      ))}
    </div>
  )
}

function LiveToastCard({
  notification,
  language,
  dir,
  isDismissing,
  onDismiss,
  getIcon,
  getTitle,
  getMessage,
  getAccent,
}: {
  notification: ToastNotification
  language: string
  dir: string
  isDismissing: boolean
  onDismiss: () => void
  getIcon: (t: string) => React.ReactNode
  getTitle: (n: ToastNotification, l: string) => string
  getMessage: (n: ToastNotification, l: string) => string
  getAccent: (t: string) => string
}) {
  const href = notification.action_url || '#'
  const isLink = !!notification.action_url

  const content = (
    <div
      className={cn(
        'pointer-events-auto flex gap-3 p-4 rounded-xl border bg-card/95 backdrop-blur-md shadow-lg',
        getAccent(notification.type),
        'animate-in slide-in-from-end-4 fade-in duration-300',
        'transition-all duration-300 ease-out',
        isDismissing && (dir === 'rtl' ? 'opacity-0 -translate-x-4 scale-95' : 'opacity-0 translate-x-4 scale-95')
      )}
    >
      <div className="flex shrink-0 mt-0.5">{getIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {getTitle(notification, language)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {getMessage(notification, language)}
        </p>
        {isLink && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary">
            {language === 'ar' ? 'عرض' : language === 'fr' ? 'Voir' : 'View'}
            <ArrowRight className={cn('h-3.5 w-3.5', dir === 'rtl' && 'rotate-180')} />
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDismiss()
        }}
        className="shrink-0 p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Dismiss'}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  if (isLink) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}

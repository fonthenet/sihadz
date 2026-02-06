'use client'

import { useState, useEffect } from 'react'
import { VoiceMessagePlayer } from './voice-message-player'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'

/**
 * Renders a voice message player. Fetches playable URL via API.
 */
export function VoiceMessageBubble({
  messageId,
  attachment: initialAttachment,
  isOwn = false,
  className,
}: {
  messageId: string
  attachment?: { storage_path?: string; file_type?: string; duration?: number; url?: string } | null
  isOwn?: boolean
  className?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const att = initialAttachment
    if (att && (att.file_type || '').startsWith('audio/') && att.storage_path) {
      setUrl(`/api/chat/attachment?path=${encodeURIComponent(att.storage_path)}`)
      setDuration(att.duration)
      setLoading(false)
      return
    }
    if (att?.url && (att.url.startsWith('http') || att.url.startsWith('/'))) {
      setUrl(att.url)
      setDuration(att.duration)
      setLoading(false)
      return
    }

    let cancelled = false
    fetch(`/api/chat/voice-url?messageId=${encodeURIComponent(messageId)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.url) {
          setUrl(data.url)
          setDuration(data.duration)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [messageId, initialAttachment])

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[260px] max-w-[320px]',
          isOwn
            ? 'bg-gradient-to-br from-teal-500 via-teal-500 to-cyan-600'
            : 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-700/50',
          className
        )}
      >
        <LoadingSpinner size="md" className="shrink-0" />
        <span className={cn('text-[11px]', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
          Loading...
        </span>
      </div>
    )
  }

  if (!url) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-2xl min-w-[200px] text-sm',
        isOwn ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        className
      )}>
        <span>Audio unavailable</span>
      </div>
    )
  }

  return (
    <VoiceMessagePlayer
      src={url}
      duration={duration}
      isOwn={isOwn}
      className={className}
    />
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Star, Building2, Pill, TestTube, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'
import type { ThreadWithDetails } from '@/types/chat'

interface FavoriteProfessional {
  id: string
  professional_id: string
  auth_user_id: string | null
  type: string
  business_name: string
  full_name?: string
  avatar_url?: string
}

interface ChatQuickAccessProps {
  currentUserId: string
  threads: ThreadWithDetails[]
  isDark?: boolean
  onCreateThread: (otherUserId: string) => Promise<ThreadWithDetails | null>
  onSelectThread: (thread: ThreadWithDetails) => void
}

export function ChatQuickAccess({
  currentUserId,
  threads,
  isDark = false,
  onCreateThread,
  onSelectThread,
}: ChatQuickAccessProps) {
  const [favorites, setFavorites] = useState<FavoriteProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        const favs = (data.favorites || []).filter(
          (f: { professionals?: { auth_user_id?: string } }) =>
            f.professionals?.auth_user_id && f.professionals.auth_user_id !== currentUserId
        )
        if (!cancelled) {
          setFavorites(
            favs.map((f: { professional_id: string; professionals?: Record<string, unknown> }) => {
              const p = f.professionals || {}
              return {
                id: f.professional_id,
                professional_id: f.professional_id,
                auth_user_id: (p.auth_user_id as string) || null,
                type: (p.type as string) || '',
                business_name: ((p.business_name as string) || '').trim() || 'Business',
                full_name: p.full_name as string | undefined,
                avatar_url: p.avatar_url as string | undefined,
              }
            })
          )
        }
      } catch {
        if (!cancelled) setFavorites([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchFavorites()
    return () => { cancelled = true }
  }, [currentUserId])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <Stethoscope className="h-4 w-4" />
      case 'pharmacy': return <Pill className="h-4 w-4" />
      case 'laboratory': return <TestTube className="h-4 w-4" />
      case 'clinic': return <Building2 className="h-4 w-4" />
      default: return <Building2 className="h-4 w-4" />
    }
  }

  const handleClick = async (prof: FavoriteProfessional) => {
    const authUserId = prof.auth_user_id
    if (!authUserId) return

    const existing = threads.find(
      (t) =>
        t.thread_type === 'direct' &&
        (t.other_user?.id === authUserId || t.members?.some((m: { user_id: string }) => m.user_id === authUserId))
    )
    if (existing) {
      onSelectThread(existing)
      return
    }

    const thread = await onCreateThread(authUserId)
    if (thread) onSelectThread(thread)
  }

  if (loading || favorites.length === 0) return null

  return (
    <div className={cn('border-b', isDark ? 'border-slate-700' : 'border-slate-100')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors',
          isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'
        )}
      >
        <span className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Quick access
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="max-h-32 overflow-y-auto">
          {favorites.map((prof) => {
            if (!prof.auth_user_id) return null
            return (
              <button
                key={prof.id}
                onClick={() => handleClick(prof)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                  isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isDark ? 'bg-slate-700 text-amber-400' : 'bg-amber-50 text-amber-600'
                  )}
                >
                  {prof.avatar_url ? (
                    <img
                      src={prof.avatar_url}
                      alt=""
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    getTypeIcon(prof.type)
                  )}
                </div>
                <span className="text-sm font-medium truncate">{prof.business_name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

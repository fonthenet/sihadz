'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, Star, Building2, Pill, TestTube, Stethoscope, UserPlus, MessageCircle, MoreHorizontal, UserMinus, BellOff, Shield, ShieldOff } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ThreadWithDetails } from '@/types/chat'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FavoriteProfessional {
  id: string
  professional_id: string
  auth_user_id: string | null
  type: string
  business_name: string
  full_name?: string
  avatar_url?: string
}

function ContactRow({
  prof,
  isDark,
  getTypeIcon,
  hasThread,
  isBlocked,
  onChat,
  onRemove,
  onBlock,
  onUnblock,
  onMute,
}: {
  prof: FavoriteProfessional
  isDark: boolean
  getTypeIcon: (type: string) => React.ReactNode
  hasThread: boolean
  isBlocked: boolean
  onChat: () => void
  onRemove: (e: React.MouseEvent) => void
  onBlock: (e: React.MouseEvent) => void
  onUnblock: (e: React.MouseEvent) => void
  onMute: (e: React.MouseEvent) => void
}) {
  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 group',
          isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
        )}
      >
        <button
          onClick={onChat}
          className="flex-1 flex items-center gap-3 min-w-0 text-left"
        >
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden',
              isDark ? 'bg-slate-700 text-amber-400' : 'bg-slate-100 text-amber-600'
            )}
          >
            {prof.avatar_url ? (
              <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              getTypeIcon(prof.type)
            )}
          </div>
          <span className={cn('flex-1 font-medium text-sm truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
            {prof.business_name}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'p-1.5 rounded-lg shrink-0 transition-opacity',
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800',
                'opacity-60 group-hover:opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(isDark ? 'bg-slate-800 border-slate-700' : '')}>
            <DropdownMenuItem onClick={onChat} className={cn(isDark && 'focus:bg-slate-700 focus:text-white')}>
              <MessageCircle className="h-4 w-4 me-2" />
              Message
            </DropdownMenuItem>
            <DropdownMenuSeparator className={cn(isDark && 'bg-slate-700')} />
            {hasThread && (
              <DropdownMenuItem onClick={onMute} className={cn(isDark && 'focus:bg-slate-700 focus:text-white')}>
                <BellOff className="h-4 w-4 me-2" />
                Silent
              </DropdownMenuItem>
            )}
            {isBlocked ? (
              <DropdownMenuItem onClick={onUnblock} className={cn(isDark && 'focus:bg-slate-700 focus:text-white')}>
                <ShieldOff className="h-4 w-4 me-2" />
                Unblock
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onBlock} className={cn(isDark && 'focus:bg-slate-700 focus:text-white')}>
                <Shield className="h-4 w-4 me-2" />
                Block
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className={cn(isDark && 'bg-slate-700')} />
            <DropdownMenuItem onClick={onRemove} className={cn('text-red-600 dark:text-red-400', isDark && 'focus:bg-slate-700')}>
              <UserMinus className="h-4 w-4 me-2" />
              Remove from contacts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

interface ContactsViewProps {
  currentUserId: string
  threads: ThreadWithDetails[]
  isDark?: boolean
  onCreateThread: (otherUserId: string) => Promise<ThreadWithDetails | null>
  onSelectThread: (thread: ThreadWithDetails) => void
  onAddContact: () => void
  onBack: () => void
  onBlockUser?: (userId: string) => Promise<void>
  onUnblockUser?: (userId: string) => Promise<void>
  isBlocked?: (userId: string) => boolean
  onMuteThread?: (threadId: string, until: Date | null) => Promise<void>
}

export function ContactsView({
  currentUserId,
  threads,
  isDark = false,
  onCreateThread,
  onSelectThread,
  onAddContact,
  onBack,
  onBlockUser,
  onUnblockUser,
  isBlocked: checkBlocked,
  onMuteThread,
}: ContactsViewProps) {
  const [favorites, setFavorites] = useState<FavoriteProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    setActiveTab('all')
  }, [])

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
      case 'nurse': return <Stethoscope className="h-4 w-4" />
      case 'pharmacy': return <Pill className="h-4 w-4" />
      case 'laboratory': return <TestTube className="h-4 w-4" />
      case 'clinic': return <Building2 className="h-4 w-4" />
      default: return <Building2 className="h-4 w-4" />
    }
  }

  const typeOrder = ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance'] as const
  const typeLabels: Record<string, string> = {
    doctor: 'Doctors',
    nurse: 'Nurses',
    pharmacy: 'Pharmacies',
    laboratory: 'Laboratories',
    clinic: 'Clinics',
    ambulance: 'Ambulances',
  }

  const favoritesByType = useMemo(() => {
    const grouped = new Map<string, FavoriteProfessional[]>()
    for (const prof of favorites) {
      const t = (prof.type || 'other').toLowerCase()
      const key = typeOrder.includes(t) ? t : 'other'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(prof)
    }
    const result: { type: string; label: string; items: FavoriteProfessional[] }[] = []
    for (const t of typeOrder) {
      const items = grouped.get(t)
      if (items && items.length > 0) {
        result.push({ type: t, label: typeLabels[t] || t, items })
      }
    }
    const other = grouped.get('other')
    if (other && other.length > 0) {
      result.push({ type: 'other', label: 'Other', items: other })
    }
    return result
  }, [favorites])

  const displayedItems = useMemo(() => {
    if (activeTab === 'all') return favorites.filter(f => f.auth_user_id)
    const group = favoritesByType.find(g => g.type === activeTab)
    return group ? group.items.filter(f => f.auth_user_id) : []
  }, [activeTab, favorites, favoritesByType])

  const handleContactClick = async (prof: FavoriteProfessional) => {
    const authUserId = prof.auth_user_id
    if (!authUserId) return

    const existing = threads.find(
      (t) =>
        t.thread_type === 'direct' &&
        (t.other_user?.id === authUserId || t.members?.some((m: { user_id: string }) => m.user_id === authUserId))
    )
    if (existing) {
      onSelectThread(existing)
      onBack()
      return
    }

    const thread = await onCreateThread(authUserId)
    if (thread) {
      onSelectThread(thread)
      onBack()
    }
  }

  const getThreadForUser = useCallback((authUserId: string) => {
    return threads.find(
      (t) =>
        t.thread_type === 'direct' &&
        (t.other_user?.id === authUserId || t.members?.some((m: { user_id: string }) => m.user_id === authUserId))
    )
  }, [threads])

  const handleRemove = useCallback(async (e: React.MouseEvent, prof: FavoriteProfessional) => {
    e.stopPropagation()
    try {
      const r = await fetch(`/api/favorites?professional_id=${prof.professional_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) throw new Error('Failed')
      setFavorites(prev => prev.filter(f => f.professional_id !== prof.professional_id))
      toast.success('Removed from contacts')
    } catch {
      toast.error('Failed to remove from contacts')
    }
  }, [])

  const handleBlock = useCallback(async (e: React.MouseEvent, authUserId: string) => {
    e.stopPropagation()
    if (!onBlockUser) return
    try {
      await onBlockUser(authUserId)
      toast.success('Contact blocked')
    } catch {
      toast.error('Failed to block')
    }
  }, [onBlockUser])

  const handleUnblock = useCallback(async (e: React.MouseEvent, authUserId: string) => {
    e.stopPropagation()
    if (!onUnblockUser) return
    try {
      await onUnblockUser(authUserId)
      toast.success('Contact unblocked')
    } catch {
      toast.error('Failed to unblock')
    }
  }, [onUnblockUser])

  const handleMute = useCallback(async (e: React.MouseEvent, authUserId: string) => {
    e.stopPropagation()
    const thread = getThreadForUser(authUserId)
    if (!thread || !onMuteThread) return
    try {
      await onMuteThread(thread.id, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
      toast.success('Notifications muted')
    } catch {
      toast.error('Failed to mute')
    }
  }, [getThreadForUser, onMuteThread])

  return (
    <div className={cn('flex flex-col h-full min-h-0', isDark ? 'bg-slate-900' : 'bg-white')}>
      <div className={cn('flex-shrink-0 p-4 border-b', isDark ? 'border-slate-700' : 'border-slate-100')}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className={cn(
              'p-2 rounded-xl transition-colors -ms-1',
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            )}
            title="Back to messages"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className={cn('text-lg font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-slate-900')}>
            <Star className="h-5 w-5 text-amber-500" />
            Contacts
          </h2>
          <button
            onClick={() => { onBack(); onAddContact(); }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-colors',
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-teal-400' : 'bg-teal-50 hover:bg-teal-100 text-teal-600'
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className={cn('flex gap-1 overflow-x-auto min-w-0 pt-3 mt-3 pb-1 border-t', isDark ? 'border-slate-700' : 'border-slate-200')}>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-2.5 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-all',
              activeTab === 'all'
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All
          </button>
          {favoritesByType.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-all',
                activeTab === type
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {getTypeIcon(type)}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" className="text-teal-500" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
              isDark ? 'bg-slate-800' : 'bg-slate-100'
            )}>
              <Star className={cn('h-8 w-8', isDark ? 'text-amber-400' : 'text-amber-500')} />
            </div>
            <h3 className={cn('text-base font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>
              No contacts yet
            </h3>
            <p className={cn('text-sm mb-6 max-w-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Add professionals from your conversations or search to quickly access them here.
            </p>
            <button
              onClick={() => { onBack(); onAddContact(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25"
            >
              <UserPlus className="h-4 w-4" />
              Add contact
            </button>
          </div>
        ) : (
          <div className="-mx-2">
            {displayedItems.length === 0 ? (
              <p className={cn('py-8 text-center text-sm px-4', isDark ? 'text-slate-400' : 'text-slate-500')}>
                No contacts in this category
              </p>
            ) : activeTab === 'all' ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700/80">
                {favoritesByType.map(({ type, label, items }) => {
                  const validItems = items.filter(f => f.auth_user_id)
                  if (validItems.length === 0) return null
                  return (
                    <section key={type} className="py-1">
                      <div className={cn(
                        'px-4 py-2 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2',
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      )}>
                        {getTypeIcon(type)}
                        {label}
                      </div>
                      <ul className="list-none p-0 m-0 divide-y divide-slate-100 dark:divide-slate-800">
                        {validItems.map((prof) => (
                          <ContactRow
                            key={prof.id}
                            prof={prof}
                            isDark={isDark}
                            getTypeIcon={getTypeIcon}
                            hasThread={!!getThreadForUser(prof.auth_user_id!)}
                            isBlocked={checkBlocked?.(prof.auth_user_id!) ?? false}
                            onChat={() => handleContactClick(prof)}
                            onRemove={(e) => handleRemove(e, prof)}
                            onBlock={(e) => prof.auth_user_id && handleBlock(e, prof.auth_user_id)}
                            onUnblock={(e) => prof.auth_user_id && handleUnblock(e, prof.auth_user_id)}
                            onMute={(e) => prof.auth_user_id && handleMute(e, prof.auth_user_id)}
                          />
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            ) : (
              <ul className="list-none p-0 m-0 divide-y divide-slate-100 dark:divide-slate-800">
                {displayedItems.map((prof) => (
                  <ContactRow
                    key={prof.id}
                    prof={prof}
                    isDark={isDark}
                    getTypeIcon={getTypeIcon}
                    hasThread={!!getThreadForUser(prof.auth_user_id!)}
                    isBlocked={checkBlocked?.(prof.auth_user_id!) ?? false}
                    onChat={() => handleContactClick(prof)}
                    onRemove={(e) => handleRemove(e, prof)}
                    onBlock={(e) => prof.auth_user_id && handleBlock(e, prof.auth_user_id)}
                    onUnblock={(e) => prof.auth_user_id && handleUnblock(e, prof.auth_user_id)}
                    onMute={(e) => prof.auth_user_id && handleMute(e, prof.auth_user_id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Star, Building2, Pill, TestTube, Stethoscope, UserPlus, MessageCircle } from 'lucide-react'
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

interface ContactsDialogProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  threads: ThreadWithDetails[]
  isDark?: boolean
  onCreateThread: (otherUserId: string) => Promise<ThreadWithDetails | null>
  onSelectThread: (thread: ThreadWithDetails) => void
  onAddContact: () => void
}

export function ContactsDialog({
  isOpen,
  onClose,
  currentUserId,
  threads,
  isDark = false,
  onCreateThread,
  onSelectThread,
  onAddContact,
}: ContactsDialogProps) {
  const [favorites, setFavorites] = useState<FavoriteProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    if (isOpen) setActiveTab('all')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
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
  }, [isOpen, currentUserId])

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
      onClose()
      return
    }

    const thread = await onCreateThread(authUserId)
    if (thread) {
      onSelectThread(thread)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'relative w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden',
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b flex-shrink-0',
          isDark ? 'border-slate-700' : 'border-slate-100'
        )}>
          <h2 className={cn('text-lg font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-slate-900')}>
            <Star className="h-5 w-5 text-amber-500" />
            Contacts
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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
                onClick={() => { onClose(); onAddContact(); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25"
              >
                <UserPlus className="h-4 w-4" />
                Add contact
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex gap-1 overflow-x-auto min-w-0 pb-1">
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
                <button
                  onClick={() => { onClose(); onAddContact(); }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-colors',
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-teal-400' : 'bg-teal-50 hover:bg-teal-100 text-teal-600'
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              <div className="space-y-1">
                {displayedItems.length === 0 ? (
                  <p className={cn('py-8 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    No contacts in this category
                  </p>
                ) : displayedItems.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => handleContactClick(prof)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isDark ? 'bg-slate-700 text-amber-400' : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      {prof.avatar_url ? (
                        <img
                          src={prof.avatar_url}
                          alt=""
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        getTypeIcon(prof.type)
                      )}
                    </div>
                    <span className="flex-1 font-medium truncate">{prof.business_name}</span>
                    <MessageCircle className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

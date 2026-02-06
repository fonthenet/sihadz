'use client'

import { useState, useMemo, memo, useCallback, useEffect } from 'react'
import { Search, Plus, Users, MessageCircle, Trash2, Star, Building2, Pill, TestTube, Stethoscope, Settings, ChevronLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { PresenceStatusSelector, dotClassForDbStatus, shouldShowPresence } from '@/components/presence-status'
import { cn } from '@/lib/utils'
import { formatRelativeTime, getInitials } from '@/lib/chat/chat-utils'
import { avatarGradientFor } from '@/lib/chat/ui'
import type { ThreadWithDetails } from '@/types/chat'

interface FavoriteContact {
  professional_id: string
  auth_user_id: string | null
  type: string
  business_name: string
  avatar_url?: string
}

interface ThreadListProps {
  threads: ThreadWithDetails[]
  loading: boolean
  selectedThreadId: string | null
  currentUserId: string
  onSelectThread: (thread: ThreadWithDetails) => void
  onCreateThread?: (otherUserId: string) => Promise<ThreadWithDetails | null>
  onNewChat: () => void
  onContacts?: () => void
  onSettings?: () => void
  onDeleteThread?: (thread: ThreadWithDetails) => void | Promise<void>
  /** When provided, show a back button to collapse/hide the sidebar (e.g. when empty state is full width) */
  onBack?: () => void
  title?: string
  isDark?: boolean
  /** When false, hide online indicator on thread avatars */
  showOnlineStatus?: boolean
  /** Current user display name for presence status selector */
  currentUserName?: string
  /** Current user avatar for presence status selector */
  currentUserAvatar?: string | null
}

export function ThreadList({
  threads,
  loading,
  selectedThreadId,
  currentUserId,
  onSelectThread,
  onCreateThread,
  onNewChat,
  onContacts,
  onSettings,
  onDeleteThread,
  title = 'Chat',
  isDark = false,
  showOnlineStatus = true,
  currentUserName,
  currentUserAvatar,
}: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all')
  const [contacts, setContacts] = useState<FavoriteContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchContacts = async () => {
      setContactsLoading(true)
      try {
        const res = await fetch('/api/favorites', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        const favs = (data.favorites || []).filter(
          (f: { professionals?: { auth_user_id?: string } }) =>
            f.professionals?.auth_user_id && f.professionals.auth_user_id !== currentUserId
        )
        if (!cancelled) {
          setContacts(
            favs.map((f: { professional_id: string; professionals?: Record<string, unknown> }) => {
              const p = f.professionals || {}
              return {
                professional_id: f.professional_id,
                auth_user_id: (p.auth_user_id as string) || null,
                type: (p.type as string) || '',
                business_name: ((p.business_name as string) || '').trim() || 'Business',
                avatar_url: p.avatar_url as string | undefined,
              }
            })
          )
        }
      } catch {
        if (!cancelled) setContacts([])
      } finally {
        if (!cancelled) setContactsLoading(false)
      }
    }
    fetchContacts()
    return () => { cancelled = true }
  }, [currentUserId])

  const getContactTypeIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <Stethoscope className="h-4 w-4" />
      case 'pharmacy': return <Pill className="h-4 w-4" />
      case 'laboratory': return <TestTube className="h-4 w-4" />
      case 'clinic': return <Building2 className="h-4 w-4" />
      default: return <Building2 className="h-4 w-4" />
    }
  }

  // Memoize filtered threads to avoid recalculation on every render
  const filteredThreads = useMemo(() => {
    return threads.filter(thread => {
      if (filter === 'direct' && thread.thread_type !== 'direct') return false
      if (filter === 'group' && thread.thread_type !== 'group') return false

      if (searchQuery) {
        const name = thread.thread_type === 'direct'
          ? thread.other_user?.full_name || ''
          : thread.title || ''
        return name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
  }, [threads, filter, searchQuery])

  // Filter contacts by search query; exclude those who already have a thread
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    const threadUserIds = new Set(
      threads
        .filter(t => t.thread_type === 'direct')
        .flatMap(t => [
          t.other_user?.id,
          ...(t.members?.map((m: { user_id: string }) => m.user_id) || []),
        ])
        .filter(Boolean)
    )
    return contacts.filter(
      c =>
        c.auth_user_id &&
        !threadUserIds.has(c.auth_user_id) &&
        (c.business_name || '').toLowerCase().includes(q)
    )
  }, [contacts, searchQuery, threads])

  const [creatingContactId, setCreatingContactId] = useState<string | null>(null)

  const handleContactClick = useCallback(
    async (contact: FavoriteContact) => {
      const authUserId = contact.auth_user_id
      if (!authUserId || !onCreateThread) return

      const existing = threads.find(
        (t) =>
          t.thread_type === 'direct' &&
          (t.other_user?.id === authUserId || t.members?.some((m: { user_id: string }) => m.user_id === authUserId))
      )
      if (existing) {
        onSelectThread(existing)
        return
      }

      setCreatingContactId(authUserId)
      try {
        const thread = await onCreateThread(authUserId)
        if (thread) onSelectThread(thread)
      } finally {
        setCreatingContactId(null)
      }
    },
    [threads, onCreateThread, onSelectThread]
  )

  const getThreadDisplayName = (thread: ThreadWithDetails) => {
    if (thread.thread_type === 'group') return (thread.title || '').trim() || 'Group Chat'
    const other = thread.members?.find((m: any) => m.user_id !== currentUserId)
    const name = (thread.other_user?.full_name || (other?.profile as any)?.full_name || '').trim()
    return name || 'Contact'
  }

  const getThreadAvatar = (thread: ThreadWithDetails) => {
    if (thread.thread_type === 'group') {
      return (thread.title && getInitials(thread.title)) || 'GC'
    }
    const other = thread.members?.find((m: any) => m.user_id !== currentUserId)
    const name = (thread.other_user?.full_name || (other?.profile as any)?.full_name || '').trim()
    return name ? getInitials(name) : '?'
  }

  /** Unique seed for avatar color - ensures each contact gets a distinct gradient */
  const getAvatarColorSeed = (thread: ThreadWithDetails) => {
    if (thread.thread_type === 'group') return thread.id
    const other = thread.members?.find((m: any) => m.user_id !== currentUserId)
    return thread.other_user?.id || (other as any)?.user_id || thread.id
  }

  // Single shared state for context menu and delete confirm - prevents overlapping dialogs
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; thread: ThreadWithDetails } | null>(null)
  const [deleteConfirmThread, setDeleteConfirmThread] = useState<ThreadWithDetails | null>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleRequestDelete = useCallback((thread: ThreadWithDetails) => {
    setContextMenu(null)
    setDeleteConfirmThread(thread)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (deleteConfirmThread && onDeleteThread) {
      await onDeleteThread(deleteConfirmThread)
      setDeleteConfirmThread(null)
    }
  }, [deleteConfirmThread, onDeleteThread])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmThread(null)
  }, [])

  return (
    <div className={cn('flex flex-col h-full min-h-0', isDark ? 'bg-slate-900' : 'bg-white')}>
      <div className={cn('flex-shrink-0 p-4 border-b', isDark ? 'border-slate-700' : 'border-slate-100')}>
        <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 className={cn('text-lg font-semibold truncate', isDark ? 'text-white' : 'text-slate-900')}>{title}</h2>
            {currentUserId && (
              <PresenceStatusSelector
                userId={currentUserId}
                avatarUrl={currentUserAvatar}
                compact
                hideDot
                className={cn(
                  'shrink-0',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}
              />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onSettings && (
              <button
                onClick={onSettings}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                )}
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25"
              title="New chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations and contacts..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400',
              'border'
            )}
          />
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex gap-2">
            {(['all', 'direct', 'group'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  filter === f
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                    : isDark 
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f === 'all' ? 'All' : f === 'direct' ? 'Direct' : 'Groups'}
              </button>
            ))}
          </div>
          {onContacts && (
            <button
              onClick={onContacts}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0',
                isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              )}
            >
              Contacts
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="md" className="text-slate-400" />
          </div>
        ) : filteredThreads.length === 0 && filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <MessageCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">
              {searchQuery.trim() ? 'No conversations or contacts found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="p-2 pb-6">
            {filteredContacts.length > 0 && (
              <div className={cn('mb-3 pb-2', filteredThreads.length > 0 && 'border-b border-slate-100 dark:border-slate-800')}>
                <div className={cn(
                  'px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  Contacts
                </div>
                {filteredContacts.map((contact) => {
                  const isCreating = creatingContactId === contact.auth_user_id
                  return (
                    <button
                      key={contact.professional_id}
                      onClick={() => handleContactClick(contact)}
                      disabled={isCreating}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all mb-1',
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50',
                        isCreating && 'opacity-70 pointer-events-none'
                      )}
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden',
                        isDark ? 'bg-slate-700 text-amber-400' : 'bg-amber-50 text-amber-600'
                      )}>
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getContactTypeIcon(contact.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn('font-medium truncate block', isDark ? 'text-white' : 'text-slate-900')}>
                          {contact.business_name}
                        </span>
                        <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                          {isCreating ? 'Starting...' : 'Start chat'}
                        </span>
                      </div>
                      {isCreating ? (
                        <LoadingSpinner size="sm" className="text-slate-400 shrink-0" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {filteredThreads.length > 0 && filteredContacts.length > 0 && (
              <div className={cn(
                'px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2 mt-1',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                <MessageCircle className="h-3.5 w-3.5" />
                Conversations
              </div>
            )}
            {filteredThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                currentUserId={currentUserId}
                isDark={isDark}
                showOnlineStatus={showOnlineStatus}
                onSelect={onSelectThread}
                onContextMenu={onDeleteThread ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ x: e.clientX, y: e.clientY, thread })
                } : undefined}
                getThreadDisplayName={getThreadDisplayName}
                getThreadAvatar={getThreadAvatar}
                getAvatarColorSeed={getAvatarColorSeed}
              />
            ))}
            <div className="h-4 shrink-0" aria-hidden />
          </div>
        )}
      </div>

      {/* Single context menu - only one at a time */}
      {contextMenu && onDeleteThread && (
        <div
          className="fixed z-50 py-1 rounded-xl shadow-lg border min-w-[180px]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            ...(isDark
              ? { background: 'rgb(30 41 59)', borderColor: 'rgb(51 65 85)' }
              : { background: 'white', borderColor: 'rgb(226 232 240)' }),
          }}
        >
          <button
            onClick={() => handleRequestDelete(contextMenu.thread)}
            className={cn(
              'w-full px-3 py-2 text-sm flex items-center gap-3 transition-colors text-left',
              isDark
                ? 'text-red-400 hover:bg-slate-800'
                : 'text-red-600 hover:bg-red-50'
            )}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Delete conversation
          </button>
        </div>
      )}

      {/* Single delete confirmation dialog - only one at a time */}
      {deleteConfirmThread && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancelDelete}
            aria-hidden
          />
          <div
            className={cn(
              'relative rounded-2xl p-6 max-w-sm mx-4 shadow-2xl',
              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={cn('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>
              Delete conversation?
            </h3>
            <p className={cn('text-sm mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
              {deleteConfirmThread.thread_type === 'group'
                ? 'You will leave this group and it will be removed from your list.'
                : 'This conversation will be removed from your list.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoized thread item to prevent re-renders when other threads update
interface ThreadItemProps {
  thread: ThreadWithDetails
  isSelected: boolean
  currentUserId: string
  isDark: boolean
  showOnlineStatus?: boolean
  onSelect: (thread: ThreadWithDetails) => void
  onContextMenu?: (e: React.MouseEvent) => void
  getThreadDisplayName: (thread: ThreadWithDetails) => string
  getThreadAvatar: (thread: ThreadWithDetails) => string
  getAvatarColorSeed: (thread: ThreadWithDetails) => string
}

const ThreadItem = memo(function ThreadItem({
  thread,
  isSelected,
  currentUserId,
  isDark,
  showOnlineStatus = true,
  onSelect,
  onContextMenu,
  getThreadDisplayName,
  getThreadAvatar,
  getAvatarColorSeed,
}: ThreadItemProps) {
  const handleClick = useCallback(() => {
    onSelect(thread)
  }, [onSelect, thread])

  return (
    <button
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className={cn(
        'w-full p-3 rounded-xl text-left transition-all mb-1',
        isSelected
          ? isDark
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100'
          : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white',
            'bg-gradient-to-br',
            thread.thread_type === 'group'
              ? 'from-amber-400 to-orange-500'
              : avatarGradientFor(getAvatarColorSeed(thread))
          )}>
            {thread.thread_type === 'group' ? (
              <Users className="h-6 w-6 text-white" />
            ) : thread.other_user?.avatar_url ? (
              <img src={thread.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getThreadAvatar(thread)
            )}
          </div>
          {/* Status indicator - shows colored dot based on presence_status (online=green, busy=red, away=amber) */}
          {showOnlineStatus && thread.thread_type === 'direct' && shouldShowPresence(thread.other_user?.presence_status, thread.other_user?.is_online) && (
            <span 
              className={cn(
                "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full",
                dotClassForDbStatus(thread.other_user?.presence_status)
              )}
              title={thread.other_user?.presence_status || 'online'}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              'font-medium truncate',
              isDark ? 'text-white' : 'text-slate-900'
            )}>
              {getThreadDisplayName(thread)}
            </span>
            {thread.last_message && (
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatRelativeTime(thread.last_message.created_at)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <p className={cn(
              'text-sm truncate',
              isDark ? 'text-slate-400' : 'text-slate-500'
            )}>
              {thread.last_message?.is_deleted
                ? 'Message deleted'
                : thread.last_message?.content || 'No messages yet'}
            </p>
            {thread.unread_count > 0 && (
              <span className="flex-shrink-0 px-2 py-0.5 bg-teal-500 text-white text-xs font-medium rounded-full">
                {thread.unread_count > 99 ? '99+' : thread.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})

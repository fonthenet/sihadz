'use client'

import { useState } from 'react'
import { Phone, Video, MoreVertical, Info, Users, Bell, BellOff, Trash2, LogOut, Pin, UserPlus, Search, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials, formatLastSeen } from '@/lib/chat/chat-utils'
import type { ThreadWithDetails } from '@/types/chat'
import { avatarGradientFor } from '@/lib/chat/ui'
import { dotClassForDbStatus, shouldShowPresence } from '@/components/presence-status'

interface ThreadHeaderProps {
  thread: ThreadWithDetails | null
  onShowInfo: () => void
  isDark?: boolean
  onMute?: (threadId: string, until: Date | null) => Promise<void>
  onLeave?: (threadId: string) => Promise<void>
  onClearChat?: (threadId: string) => Promise<void>
  onRefreshMessages?: () => void
  /** When false, hide online/last-seen indicator for direct chats */
  showOnlineStatus?: boolean
  /** When provided, show Search button (Ctrl+K) - for embedded chat */
  onSearch?: () => void
}

export function ThreadHeader({ thread, onShowInfo, isDark = false, onMute, onLeave, onClearChat, onRefreshMessages, showOnlineStatus = true, onSearch }: ThreadHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)

  if (!thread) {
    return (
      <div className={cn(
        'h-16 border-b flex items-center justify-center',
        isDark ? 'border-slate-700' : 'border-slate-100'
      )}>
        <p className="text-slate-400">Select a conversation</p>
      </div>
    )
  }

  const displayName = thread.thread_type === 'group'
    ? (thread.title || '').trim() || 'Group Chat'
    : (thread.other_user?.full_name || '').trim() || 'Contact'

  const memberCount = thread.members?.length || 0
  const presenceStatus = thread.other_user?.presence_status
  const hasPresence = thread.thread_type === 'direct' && shouldShowPresence(presenceStatus, thread.other_user?.is_online)
  const groupMembers = thread.thread_type === 'group'
    ? (thread.members || []).slice(0, 4).map((m: any) => ({
        id: m.user_id,
        name: (m.profile?.full_name || '').trim() || 'Unknown',
        avatar_url: m.profile?.avatar_url || null,
      }))
    : []
  const groupNames = thread.thread_type === 'group'
    ? (thread.members || [])
        .map((m: any) => m.profile?.full_name)
        .filter(Boolean) as string[]
    : []

  return (
    <div className={cn(
      'h-16 border-b flex items-center justify-between px-4',
      isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white',
          thread.thread_type === 'group'
            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
            : cn('bg-gradient-to-br', avatarGradientFor(thread.other_user?.id || thread.id))
        )}>
          {thread.thread_type === 'group' ? (
            <Users className="h-5 w-5 text-white" />
          ) : thread.other_user?.avatar_url ? (
            <img src={thread.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitials(displayName) || '?'
          )}
        </div>

        <div>
          <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{displayName}</h3>
          {thread.thread_type === 'group' ? (
            <>
              <p className="text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span>{`${memberCount} members`}</span>
                  <span className="flex -space-x-2">
                    {groupMembers.map((m) => (
                      <span
                        key={m.id}
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold text-white overflow-hidden',
                          isDark ? 'border-slate-900' : 'border-white',
                          'bg-gradient-to-br',
                          avatarGradientFor(m.id)
                        )}
                        title={m.name}
                      >
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(m.name)
                        )}
                      </span>
                    ))}
                  </span>
                  {memberCount > groupMembers.length && (
                    <span className={cn('text-[10px] font-medium', isDark ? 'text-slate-400' : 'text-slate-400')}>
                      +{memberCount - groupMembers.length}
                    </span>
                  )}
                </span>
              </p>
              {groupNames.length > 0 && (
                <p className={cn('text-[11px] truncate max-w-[220px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  {groupNames.slice(0, 3).join(', ')}
                  {groupNames.length > 3 ? '…' : ''}
                </p>
              )}
            </>
          ) : showOnlineStatus ? (
            <p className="text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', hasPresence ? dotClassForDbStatus(presenceStatus) : 'bg-slate-300')} />
                {hasPresence 
                  ? (presenceStatus === 'online' ? 'Online' : presenceStatus === 'busy' ? 'Busy' : presenceStatus === 'away' ? 'Away' : 'Offline')
                  : formatLastSeen(thread.other_user?.last_seen_at || null)}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onSearch && (
          <button
            onClick={onSearch}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            )}
            title="Search messages (Ctrl+K)"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
        <button className={cn(
          'p-2.5 rounded-xl transition-all',
          isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        )}>
          <Phone className="h-5 w-5" />
        </button>
        <button className={cn(
          'p-2.5 rounded-xl transition-all',
          isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        )}>
          <Video className="h-5 w-5" />
        </button>
        <button
          onClick={onShowInfo}
          className={cn(
            'p-2.5 rounded-xl transition-all',
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          )}
        >
          <Info className="h-5 w-5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              showMenu
                ? isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            )}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
              <div className={cn(
                'absolute top-full right-0 mt-1 py-1 rounded-xl shadow-lg border min-w-[180px] z-10',
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
              )}>
                {thread.thread_type === 'group' && (
                  <button className={cn(
                    'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                    isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                  )}>
                    <UserPlus className="h-4 w-4 text-slate-400" />
                    Add members
                  </button>
                )}
                {onRefreshMessages && (
                  <button
                    onClick={() => { setShowMenu(false); onRefreshMessages() }}
                    className={cn(
                      'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                      isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <RotateCw className="h-4 w-4 text-slate-400" />
                    Refresh messages
                  </button>
                )}
                <button className={cn(
                  'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                  isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                )}>
                  <Pin className="h-4 w-4 text-slate-400" />
                  Pinned messages
                </button>
                <button 
                  onClick={async () => {
                    setShowMenu(false)
                    if (onMute) {
                      const isMuted = thread.my_membership?.is_muted
                      await onMute(thread.id, isMuted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
                    }
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                    isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {thread.my_membership?.is_muted ? (
                    <BellOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Bell className="h-4 w-4 text-slate-400" />
                  )}
                  {thread.my_membership?.is_muted ? 'Unmute notifications' : 'Mute notifications'}
                </button>
                <button 
                  onClick={async () => {
                    setShowMenu(false)
                    if (onClearChat && confirm('Clear all messages? This cannot be undone.')) {
                      await onClearChat(thread.id)
                    }
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                    isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Trash2 className="h-4 w-4 text-slate-400" />
                  Clear chat
                </button>
                {thread.thread_type === 'group' && (
                  <button 
                    onClick={async () => {
                      setShowMenu(false)
                      if (onLeave && confirm('Leave this group?')) {
                        await onLeave(thread.id)
                      }
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                      isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                    Leave group
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

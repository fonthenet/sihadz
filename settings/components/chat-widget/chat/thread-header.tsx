'use client'

import { useState } from 'react'
import { Phone, Video, MoreVertical, Info, Users, Bell, BellOff, Trash2, LogOut, Pin, UserPlus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials, formatLastSeen } from '@/lib/chat/chat-utils'
import type { ThreadWithDetails } from '@/types/chat'

interface ThreadHeaderProps {
  thread: ThreadWithDetails | null
  onShowInfo: () => void
  isDark?: boolean
}

export function ThreadHeader({ thread, onShowInfo, isDark = false }: ThreadHeaderProps) {
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
    ? thread.title || 'Group Chat'
    : thread.other_user?.full_name || 'Unknown User'

  const memberCount = thread.members?.length || 0
  const isOnline = thread.thread_type === 'direct' && thread.other_user?.is_online

  return (
    <div className={cn(
      'h-16 border-b flex items-center justify-between px-4',
      isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold',
          thread.thread_type === 'group'
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
            : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
        )}>
          {thread.thread_type === 'group' ? (
            <Users className="h-5 w-5" />
          ) : thread.other_user?.avatar_url ? (
            <img src={thread.other_user.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>

        <div>
          <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{displayName}</h3>
          <p className="text-xs text-slate-500">
            {thread.thread_type === 'group' ? (
              `${memberCount} members`
            ) : (
              <span className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-green-500' : 'bg-slate-300')} />
                {isOnline ? 'Online' : formatLastSeen(thread.other_user?.last_seen_at || null)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
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
                <button className={cn(
                  'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                  isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                )}>
                  <Pin className="h-4 w-4 text-slate-400" />
                  Pinned messages
                </button>
                <button className={cn(
                  'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                  isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                )}>
                  <Bell className="h-4 w-4 text-slate-400" />
                  Mute notifications
                </button>
                <button className={cn(
                  'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                  isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                )}>
                  <Trash2 className="h-4 w-4 text-slate-400" />
                  Clear chat
                </button>
                {thread.thread_type === 'group' && (
                  <button className={cn(
                    'w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors',
                    isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'
                  )}>
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

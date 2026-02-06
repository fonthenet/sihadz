'use client'

import { useState } from 'react'
import { Search, Plus, Users, MessageCircle, Star } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'
import { formatRelativeTime, getInitials } from '@/lib/chat/chat-utils'
import type { ThreadWithDetails } from '@/types/chat'

interface ThreadListProps {
  threads: ThreadWithDetails[]
  loading: boolean
  selectedThreadId: string | null
  currentUserId: string
  onSelectThread: (thread: ThreadWithDetails) => void
  onNewChat: () => void
  onContacts?: () => void
  isDark?: boolean
}

export function ThreadList({
  threads,
  loading,
  selectedThreadId,
  currentUserId,
  onSelectThread,
  onNewChat,
  isDark = false
}: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all')

  const filteredThreads = threads.filter(thread => {
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

  const getThreadDisplayName = (thread: ThreadWithDetails) => {
    if (thread.thread_type === 'group') return thread.title || 'Group Chat'
    return thread.other_user?.full_name || 'Unknown User'
  }

  const getThreadAvatar = (thread: ThreadWithDetails) => {
    if (thread.thread_type === 'group') {
      return thread.title ? getInitials(thread.title) : 'GC'
    }
    return thread.other_user?.full_name ? getInitials(thread.other_user.full_name) : '??'
  }

  return (
    <div className={cn('flex flex-col h-full', isDark ? 'bg-slate-900' : 'bg-white')}>
      <div className={cn('p-4 border-b', isDark ? 'border-slate-700' : 'border-slate-100')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Messages</h2>
          <div className="flex items-center gap-1">
            {onContacts && (
              <button
                onClick={onContacts}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  isDark ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-50 text-amber-600'
                )}
                title="Contacts"
              >
                <Star className="h-5 w-5" />
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
            placeholder="Search conversations..."
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

        <div className="flex gap-2 mt-3">
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="md" className="text-slate-400" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <MessageCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={cn(
                  'w-full p-3 rounded-xl text-left transition-all mb-1',
                  selectedThreadId === thread.id
                    ? 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-100 dark:border-teal-800'
                    : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0',
                    thread.thread_type === 'group'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                      : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
                  )}>
                    {thread.thread_type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : thread.other_user?.avatar_url ? (
                      <img src={thread.other_user.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      getThreadAvatar(thread)
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
                    
                    {/* Online indicator for direct chats */}
                    {thread.thread_type === 'direct' && thread.other_user?.is_online && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-green-500">Online</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

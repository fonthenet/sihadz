'use client'

import { useState } from 'react'
import { X, Search, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/chat/chat-utils'
import { avatarGradientFor } from '@/lib/chat/ui'
import type { ThreadWithDetails, Message } from '@/types/chat'

interface ForwardMessageDialogProps {
  isOpen: boolean
  message: Message | null
  threads: ThreadWithDetails[]
  currentThreadId: string | null
  currentUserId: string
  isDark?: boolean
  onClose: () => void
  onForward: (targetThreadId: string, messageId: string) => Promise<void>
}

export function ForwardMessageDialog({
  isOpen,
  message,
  threads,
  currentThreadId,
  currentUserId,
  isDark = false,
  onClose,
  onForward,
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [forwarding, setForwarding] = useState(false)

  if (!isOpen) return null

  const targetThreads = threads.filter((t) => t.id !== currentThreadId)

  const filteredThreads = searchQuery.trim()
    ? targetThreads.filter((t) => {
        const name =
          t.thread_type === 'direct'
            ? ((t.other_user?.full_name || '').trim() || 'contact').toLowerCase()
            : ((t.title || '').trim() || 'group').toLowerCase()
        return name.includes(searchQuery.toLowerCase())
      })
    : targetThreads

  const getThreadName = (t: ThreadWithDetails) =>
    t.thread_type === 'direct'
      ? (t.other_user?.full_name || '').trim() || 'Contact'
      : (t.title || '').trim() || 'Group'

  const handleForward = async (threadId: string) => {
    if (!message) return
    setForwarding(true)
    try {
      await onForward(threadId, message.id)
      onClose()
    } finally {
      setForwarding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl shadow-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden',
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-slate-700' : 'border-slate-100'
          )}
        >
          <h2 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
            Forward to
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-400'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn('p-2 border-b', isDark ? 'border-slate-700' : 'border-slate-100')}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              )}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-sm">No contacts to forward to</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleForward(thread.id)}
                  disabled={forwarding}
                  className={cn(
                    'w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all',
                    isDark
                      ? 'hover:bg-slate-800 text-white'
                      : 'hover:bg-slate-50 text-slate-900'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 bg-gradient-to-br',
                      thread.thread_type === 'group'
                        ? 'from-amber-400 to-orange-500'
                        : avatarGradientFor(thread.other_user?.id || thread.id)
                    )}
                  >
                    {thread.thread_type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : thread.other_user?.avatar_url ? (
                      <img
                        src={thread.other_user.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(getThreadName(thread))
                    )}
                  </div>
                  <span className="font-medium truncate">{getThreadName(thread)}</span>
                  {forwarding && (
                    <LoadingSpinner size="sm" className="text-teal-500 ms-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

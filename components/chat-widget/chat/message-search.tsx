'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'
import { formatRelativeTime, highlightMatches, debounce } from '@/lib/chat/chat-utils'
import type { SearchResult, ThreadWithDetails } from '@/types/chat'

interface MessageSearchProps {
  isOpen: boolean
  onClose: () => void
  isDark?: boolean
  results: SearchResult[]
  loading: boolean
  onSearch: (query: string, threadId?: string) => Promise<void>
  onClear: () => void
  threads: ThreadWithDetails[]
  onSelectResult: (result: SearchResult) => void
  currentThreadId?: string | null
  /** Top offset for positioning (e.g. top-14 for widget, top-16 for embedded) */
  topOffset?: string
}

export function MessageSearch({
  isOpen,
  onClose,
  isDark = false,
  results,
  loading,
  onSearch,
  onClear,
  threads,
  onSelectResult,
  currentThreadId,
  topOffset = 'top-14'
}: MessageSearchProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'current' | 'all'>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedIndex(0)
      onClear()
    }
  }, [isOpen, onClear])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((q: string) => {
      if (q.length >= 2) {
        onSearch(q, scope === 'current' ? currentThreadId || undefined : undefined)
      } else {
        onClear()
      }
    }, 300),
    [onSearch, onClear, scope, currentThreadId]
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      onSelectResult(results[selectedIndex])
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Get thread name for a result
  const getThreadName = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return 'Unknown'
    if (thread.thread_type === 'group') return thread.title || 'Group'
    return thread.other_user?.full_name || 'Direct Message'
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      "absolute inset-x-0 z-40 shadow-xl",
      topOffset,
      isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200",
      "border-b"
    )}>
      {/* Search input */}
      <div className="p-3">
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            isDark ? "text-slate-500" : "text-slate-400"
          )} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages..."
            className={cn(
              "w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all",
              "focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
              isDark 
                ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" 
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400",
              "border"
            )}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); onClear() }}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full",
                isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scope toggle */}
        {currentThreadId && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setScope('all')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                scope === 'all'
                  ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                  : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
              )}
            >
              All chats
            </button>
            <button
              onClick={() => setScope('current')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                scope === 'current'
                  ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                  : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
              )}
            >
              This chat
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" className="text-slate-400" />
          </div>
        ) : query.length < 2 ? (
          <div className={cn(
            "py-8 text-center text-sm",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            Type at least 2 characters to search
          </div>
        ) : results.length === 0 ? (
          <div className={cn(
            "py-8 text-center",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <div className="pb-2">
            {results.map((result, idx) => (
              <button
                key={result.id}
                onClick={() => { onSelectResult(result); onClose() }}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors",
                  idx === selectedIndex
                    ? isDark ? "bg-slate-800" : "bg-teal-50"
                    : isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-medium",
                    isDark ? "text-teal-400" : "text-teal-600"
                  )}>
                    {getThreadName(result.thread_id)}
                  </span>
                  <span className={cn(
                    "text-xs",
                    isDark ? "text-slate-500" : "text-slate-400"
                  )}>
                    {formatRelativeTime(result.created_at)}
                  </span>
                </div>
                <p 
                  className={cn(
                    "text-sm line-clamp-2",
                    isDark ? "text-slate-300" : "text-slate-700"
                  )}
                  dangerouslySetInnerHTML={{ 
                    __html: highlightMatches(result.content || '', query) 
                  }}
                />
                <p className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}>
                  by {result.sender_name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      {results.length > 0 && (
        <div className={cn(
          "px-4 py-2 border-t flex items-center gap-4 text-xs",
          isDark ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"
        )}>
          <span className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> Navigate
          </span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      )}
    </div>
  )
}

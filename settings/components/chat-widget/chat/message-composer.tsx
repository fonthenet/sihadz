'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, X, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '../../types/types'

interface MessageComposerProps {
  disabled?: boolean
  replyTo: Message | null
  onSend: (content: string, replyToId?: string) => Promise<void>
  onCancelReply: () => void
  onTyping: (isTyping: boolean) => void
}

const EMOJI_LIST = ['smile', 'heart', 'thumbs-up', 'fire', 'party', 'clap', 'think', 'sad']

export function MessageComposer({
  disabled,
  replyTo,
  onSend,
  onCancelReply,
  onTyping
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [replyTo])

  const handleContentChange = (value: string) => {
    setContent(value)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    onTyping(true)
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false)
    }, 2000)
  }

  const handleSend = async () => {
    if (!content.trim() || sending) return

    setSending(true)
    try {
      await onSend(content.trim(), replyTo?.id)
      setContent('')
      onCancelReply()
      onTyping(false)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [content])

  return (
    <div className="border-t border-slate-100 bg-white p-4">
      {replyTo && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-teal-50 rounded-xl border border-teal-100">
          <div className="w-1 h-8 bg-teal-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-teal-600 font-medium">
              Replying to {replyTo.sender?.full_name || 'Unknown'}
            </p>
            <p className="text-sm text-slate-600 truncate">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-lg hover:bg-teal-100 text-teal-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex gap-1">
          <button
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Send image"
          >
            <Image className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className={cn(
                'p-2.5 rounded-xl transition-all',
                showEmoji
                  ? 'bg-teal-100 text-teal-600'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
              title="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 flex gap-1 z-10">
                {['1f604', '2764', '1f44d', '1f525', '1f389', '1f44f', '1f914', '1f622'].map((code, i) => (
                  <button
                    key={code}
                    onClick={() => {
                      setContent(prev => prev + String.fromCodePoint(parseInt(code, 16)))
                      setShowEmoji(false)
                    }}
                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {String.fromCodePoint(parseInt(code, 16))}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px' }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled || sending}
          className={cn(
            'p-3 rounded-xl transition-all',
            content.trim()
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25'
              : 'bg-slate-100 text-slate-400',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

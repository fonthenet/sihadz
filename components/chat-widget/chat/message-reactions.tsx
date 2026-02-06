'use client'

// ============================================
// MESSAGE REACTIONS COMPONENT
// ============================================

import { useState, useRef, useEffect } from 'react'
import { Plus, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageReaction } from '@/types/chat'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏']

interface MessageReactionsProps {
  reactions: MessageReaction[]
  currentUserId: string
  onAddReaction: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
  compact?: boolean
}

export function MessageReactions({
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  compact = false
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = []
    acc[r.emoji].push(r)
    return acc
  }, {} as Record<string, MessageReaction[]>)

  const handleReactionClick = (emoji: string) => {
    const hasReacted = grouped[emoji]?.some(r => r.user_id === currentUserId)
    if (hasReacted) {
      onRemoveReaction(emoji)
    } else {
      onAddReaction(emoji)
    }
  }

  const handleAddNew = (emoji: string) => {
    onAddReaction(emoji)
    setShowPicker(false)
  }

  if (Object.keys(grouped).length === 0 && compact) {
    return null
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Object.entries(grouped).map(([emoji, reacts]) => {
        const hasReacted = reacts.some(r => r.user_id === currentUserId)
        const userNames = reacts
          .map(r => r.user?.full_name || 'Unknown')
          .slice(0, 5)
          .join(', ')
        const extraCount = reacts.length > 5 ? ` +${reacts.length - 5} more` : ''
        
        return (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            title={`${userNames}${extraCount}`}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all',
              'hover:scale-105 active:scale-95',
              hasReacted
                ? 'bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700'
                : 'bg-slate-100 text-slate-600 border border-transparent hover:border-slate-200 dark:bg-slate-700 dark:text-slate-300'
            )}
          >
            <span className="text-sm">{emoji}</span>
            <span>{reacts.length}</span>
          </button>
        )
      })}
      
      {/* Add reaction button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            'p-1 rounded-full transition-colors',
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
            'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700',
            showPicker && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        
        {showPicker && (
          <div className={cn(
            'absolute z-50 p-2 rounded-xl shadow-lg border',
            'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
            'bottom-full left-0 mb-1',
            'animate-in fade-in zoom-in-95 duration-150'
          )}>
            <div className="flex gap-1">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleAddNew(emoji)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-lg text-lg',
                    'hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                    grouped[emoji]?.some(r => r.user_id === currentUserId) && 
                      'bg-teal-50 dark:bg-teal-900/30'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// REACTION PICKER (Full Emoji Picker)
// ============================================

interface ReactionPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (emoji: string) => void
  position?: { x: number; y: number }
}

export function ReactionPicker({ isOpen, onClose, onSelect, position }: ReactionPickerProps) {
  const [activeCategory, setActiveCategory] = useState('smileys')
  
  const categories = {
    smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🙏', '👏', '🤝', '🙌', '👐', '🤲'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    objects: ['🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '🎉', '🎊', '🎁', '🏆', '🥇', '🎯', '💡', '📌', '📍', '🔔', '🔕', '💬', '💭', '🗯️', '✅', '❌', '⚠️', '❗', '❓', '💤'],
  }

  if (!isOpen) return null

  return (
    <div 
      className={cn(
        'fixed z-[100] w-72 rounded-2xl shadow-2xl border overflow-hidden',
        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        'animate-in fade-in zoom-in-95 duration-150'
      )}
      style={position ? { top: position.y, left: position.x } : undefined}
    >
      {/* Category tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 px-2 py-1">
        {Object.entries(categories).map(([key, emojis]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              'flex-1 p-2 rounded-lg text-lg transition-colors',
              activeCategory === key 
                ? 'bg-slate-100 dark:bg-slate-700' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            )}
          >
            {emojis[0]}
          </button>
        ))}
      </div>
      
      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {categories[activeCategory as keyof typeof categories].map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji)
                onClose()
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

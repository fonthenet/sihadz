'use client'

// ============================================
// ENHANCED MESSAGE LIST COMPONENT
// ============================================

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { 
  Trash2, MoreHorizontal, Check, CheckCheck, 
  Edit, Copy, Forward, Pin, AlertCircle, RotateCcw, X,
  Clock, MessageCircleOff
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatMessageTime, formatSmartDate, getInitials, copyToClipboard, isMessageEditable, isMessageDeletable } from '@/lib/chat/chat-utils'
import { useAttachmentUrl } from '@/lib/chat/use-attachment-url'
import { MessageReactions } from './message-reactions'
import { VoiceMessagePlayer } from '@/components/chat/voice-message-player'
import { VoiceMessageBubble } from '@/components/chat/voice-message-bubble'
import type { Message, PendingMessage, TypingEvent, ChatUserSettings, MessageReaction } from '@/types/chat'
import { avatarGradientFor } from '@/lib/chat/ui'

// Animation variants for messages
const messageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
}

interface MessageListProps {
  messages: Message[]
  pendingMessages?: PendingMessage[]
  loading: boolean
  hasMore: boolean
  currentUserId: string
  typingUsers: TypingEvent[]
  settings?: ChatUserSettings | null
  /** When thread changes, scroll to bottom after messages load */
  threadId?: string | null
  isDark?: boolean
  onLoadMore: () => void
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void
  onEditMessage?: (messageId: string, content: string) => void
  onReplyMessage: (message: Message) => void
  onForwardMessage?: (message: Message) => void
  onReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
  onRetryMessage?: (tempId: string) => void
  onCancelMessage?: (tempId: string) => void
  onCopyMessage?: (content: string) => void
  onPinMessage?: (messageId: string) => void
}

export function MessageList({
  messages,
  pendingMessages = [],
  loading,
  hasMore,
  currentUserId,
  typingUsers,
  settings,
  onLoadMore,
  onDeleteMessage,
  onEditMessage,
  onReplyMessage,
  onForwardMessage,
  onReaction,
  onRemoveReaction,
  onRetryMessage,
  onCancelMessage,
  onCopyMessage,
  onPinMessage,
  threadId,
  isDark = false
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: string; forEveryone: boolean } | null>(null)

  // Last message id (most recent) - used to detect new messages at bottom vs load-more at top
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null
  const prevThreadIdRef = useRef<string | null>(null)
  const prevLoadingRef = useRef(loading)

  // Instant scroll - use scrollTop for reliability (no smooth animation lag)
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    } else {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' })
    }
  }, [])

  const prevScrollDeps = useRef({ threadId: null as string | null, lastMessageId: null as string | null, pendingLen: 0 })
  useEffect(() => {
    const prev = prevScrollDeps.current
    const threadChanged = prev.threadId !== threadId
    const newMessageAtBottom = prev.lastMessageId !== lastMessageId
    const pendingChanged = prev.pendingLen !== pendingMessages.length
    const loadingJustFinished = prevLoadingRef.current && !loading
    prevScrollDeps.current = { threadId: threadId ?? null, lastMessageId, pendingLen: pendingMessages.length }
    prevLoadingRef.current = loading

    if (threadId) prevThreadIdRef.current = threadId

    const shouldScroll = threadChanged || newMessageAtBottom || pendingChanged || loadingJustFinished
    if (!shouldScroll) return

    scrollToBottom()
    // Delayed scroll for layout/images - thread change or loading need extra pass
    const needsDelayedScroll = threadChanged || loadingJustFinished
    const t1 = needsDelayedScroll ? setTimeout(scrollToBottom, 100) : undefined
    const t2 = needsDelayedScroll ? setTimeout(scrollToBottom, 300) : undefined
    return () => {
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [threadId, lastMessageId, pendingMessages.length, loading, scrollToBottom])

  // ResizeObserver: scroll when content height changes (e.g. images load) and user is near bottom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const el = containerRef.current
      if (!el) return
      const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 120
      if (nearBottom) el.scrollTop = el.scrollHeight
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [threadId])

  // Load more on scroll to top
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop < 100 && hasMore && !loading) {
      onLoadMore()
    }
  }, [hasMore, loading, onLoadMore])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // Group messages by date - memoized to avoid recalculation on every render
  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    messages.forEach((message) => {
      const messageDate = formatSmartDate(message.created_at)
      if (messageDate !== currentDate) {
        currentDate = messageDate
        groups.push({ date: messageDate, messages: [] })
      }
      groups[groups.length - 1].messages.push(message)
    })

    return groups
  }, [messages])

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault()
    if (message.is_deleted) return
    setContextMenu({ x: e.clientX, y: e.clientY, message })
  }

  // Handle copy
  const handleCopy = async (content: string) => {
    await copyToClipboard(content)
    onCopyMessage?.(content)
    setContextMenu(null)
  }

  // Handle delete
  const handleDelete = (messageId: string, forEveryone: boolean) => {
    onDeleteMessage(messageId, forEveryone)
    setDeleteConfirm(null)
    setContextMenu(null)
  }

  const fontSizeClass = settings?.font_size === 'small' ? 'text-xs' : settings?.font_size === 'large' ? 'text-base' : 'text-sm'

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-20',
        settings?.compact_mode ? 'space-y-1' : 'space-y-2',
        isDark && 'dark'
      )}
      style={{ scrollBehavior: 'auto' } as React.CSSProperties}
    >
      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" className="text-slate-400" />
        </div>
      ) : messages.length === 0 && pendingMessages.length === 0 ? (
        <div className={cn("flex flex-col items-center justify-center h-full", isDark ? "text-slate-500" : "text-slate-400")}>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4", isDark ? "bg-slate-800" : "bg-slate-100")}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className={cn("font-medium", isDark ? "text-slate-300" : "text-slate-600")}>No messages yet</p>
          <p className="text-sm mt-1">Start the conversation!</p>
        </div>
      ) : (
        <>
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mb-4">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg transition-colors",
                  isDark 
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Load earlier messages'}
              </button>
            </div>
          )}

          {/* Message groups */}
          {messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date separator */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center my-6"
              >
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm",
                  isDark 
                    ? "bg-slate-800/90 text-slate-400 ring-1 ring-slate-700" 
                    : "bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200/50"
                )}>
                  {group.date}
                </div>
              </motion.div>

              {/* Messages with animations */}
              <AnimatePresence mode="popLayout">
                {group.messages.map((message, messageIndex) => {
                  const isOwn = message.sender_id === currentUserId
                  const showAvatar = !isOwn && (
                    messageIndex === 0 ||
                    group.messages[messageIndex - 1]?.sender_id !== message.sender_id
                  )
                  const showName = showAvatar && !isOwn

                  return (
                    <motion.div
                      key={message.id}
                      layout
                      variants={messageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <MessageItem
                        message={message}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        showName={showName}
                        currentUserId={currentUserId}
                        fontSizeClass={fontSizeClass}
                        compact={settings?.compact_mode}
                        showReadReceipts={settings?.show_read_receipts !== false}
                        isDark={isDark}
                        onContextMenu={(e) => handleContextMenu(e, message)}
                        onReply={() => onReplyMessage(message)}
                        onPreviewImage={(url) => setImagePreviewUrl(url)}
                        onReaction={onReaction}
                        onRemoveReaction={onRemoveReaction}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          ))}

          {/* Pending messages */}
          <AnimatePresence mode="popLayout">
            {pendingMessages.map((pending) => (
              <motion.div
                key={pending.tempId}
                variants={messageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <PendingMessageItem
                  message={pending}
                  fontSizeClass={fontSizeClass}
                  isDark={isDark}
                  onRetry={() => onRetryMessage?.(pending.tempId)}
                  onCancel={() => onCancelMessage?.(pending.tempId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Enhanced typing indicator */}
          <AnimatePresence>
            {typingUsers.length > 0 && settings?.show_typing_indicators !== false && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2 ml-10 mt-2"
              >
                <div className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl rounded-bl-md",
                  isDark ? "bg-slate-800" : "bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm"
                )}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span 
                        key={i}
                        className="w-2 h-2 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ 
                          duration: 0.8, 
                          repeat: Infinity, 
                          delay: i * 0.15,
                          ease: 'easeInOut'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} className="h-8 shrink-0" aria-hidden />
        </>
      )}

      {/* Image preview - click to enlarge modal */}
      {imagePreviewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setImagePreviewUrl(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full h-[calc(100dvh-2rem)] max-w-4xl flex flex-col items-center">
            <button
              onClick={() => setImagePreviewUrl(null)}
              className="absolute top-2 end-2 sm:top-4 sm:end-4 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-black shadow-lg"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={imagePreviewUrl}
              alt="Enlarged preview"
              className="w-full h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="mt-2 text-sm text-white/80 hidden sm:block">Click outside to close</p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          isOwn={contextMenu.message.sender_id === currentUserId}
          onReply={() => { setContextMenu(null) }}
          onEdit={() => { onEditMessage?.(contextMenu.message.id, contextMenu.message.content || ''); setContextMenu(null) }}
          onCopy={() => handleCopy(contextMenu.message.content || '')}
          onForward={() => { onForwardMessage?.(contextMenu.message); setContextMenu(null) }}
          onPin={() => { onPinMessage?.(contextMenu.message.id); setContextMenu(null) }}
          onDelete={(forEveryone) => setDeleteConfirm({ messageId: contextMenu.message.id, forEveryone })}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deleteConfirm.messageId, deleteConfirm.forEveryone)}
          onCancel={() => setDeleteConfirm(null)}
          forEveryone={deleteConfirm.forEveryone}
        />
      )}
    </div>
  )
}

// ============================================
// MESSAGE ITEM (Memoized for performance)
// ============================================

const MessageItem = memo(function MessageItem(props: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  showName: boolean
  currentUserId: string
  fontSizeClass: string
  compact?: boolean
  showReadReceipts?: boolean
  isDark?: boolean
  onContextMenu: (e: React.MouseEvent) => void
  onReply: () => void
  onPreviewImage: (url: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
}) {
  const {
    message,
    isOwn,
    showAvatar,
    showName,
    currentUserId,
    fontSizeClass,
    compact,
    isDark = false,
    onContextMenu,
    onReply,
    onPreviewImage,
    onReaction,
    onRemoveReaction
  } = props
  const showReadReceipts = props.showReadReceipts ?? true
  const [showActions, setShowActions] = useState(false)
  const attachments = (message.attachments || message.chat_attachments || []) as any[]
  const hasImageAttachment = !!attachments.some((a: any) => (a?.file_type || '').startsWith('image/'))
  const hasAudioAttachment = !!attachments.some((a: any) => (a?.file_type || '').startsWith('audio/'))
  const firstFileName = attachments[0]?.file_name
  const hideTopFileName = !message.is_deleted && hasImageAttachment && !!firstFileName && message.content === firstFileName
  const isVoicePlaceholder = (message.content || '').includes('Voice message') || (message.content || '').includes('🎙️')
  const hideContentForVoice = isVoicePlaceholder || hasAudioAttachment

  return (
    <div
      className={cn('flex group transition-all duration-200', isOwn ? 'justify-end' : 'justify-start', compact ? 'mb-0.5' : 'mb-1.5')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onContextMenu={onContextMenu}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0 mr-2">
          {showAvatar && message.sender && (
            <div className={cn(
              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-medium",
              avatarGradientFor(message.sender.id || message.sender.full_name || message.id)
            )}>
              {message.sender.avatar_url ? (
                <img src={message.sender.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                getInitials(message.sender.full_name)
              )}
            </div>
          )}
        </div>
      )}

      <div className={cn('max-w-[70%] relative', isOwn ? 'order-1' : '')}>
        {/* Sender name */}
        {showName && message.sender && (
          <p className={cn("text-xs mb-1 ml-1", isDark ? "text-slate-400" : "text-slate-500")}>{message.sender.full_name}</p>
        )}

        {/* Message bubble - Premium styling */}
        <div className="flex items-end gap-2">
          <div
            className={cn(
              'rounded-2xl relative transition-all duration-200',
              hideTopFileName || hideContentForVoice ? 'p-0 bg-transparent' : 'px-4 py-2.5',
              isOwn
                ? (hideTopFileName || hideContentForVoice ? '' : 'bg-gradient-to-br from-teal-500 via-teal-500 to-cyan-600 text-white rounded-br-md shadow-lg shadow-teal-500/20')
                : (hideTopFileName || hideContentForVoice ? '' : cn(
                    'rounded-bl-md shadow-sm',
                    isDark 
                      ? 'bg-gradient-to-br from-slate-800 to-slate-800/80 text-slate-100 ring-1 ring-slate-700/50' 
                      : 'bg-gradient-to-br from-white to-slate-50 text-slate-900 ring-1 ring-slate-200/50'
                  )),
              message.is_deleted && 'italic opacity-60',
              'hover:scale-[1.01]'
            )}
          >
            {/* Content */}
            {message.is_deleted ? (
              <p className={cn(fontSizeClass, 'flex items-center gap-2 text-muted-foreground italic')}>
                <MessageCircleOff className="h-4 w-4 shrink-0 opacity-70" />
                This message was deleted
              </p>
            ) : hideTopFileName || hideContentForVoice ? null : (
              <p className={cn(fontSizeClass, 'whitespace-pre-wrap break-words leading-relaxed')}>
                {message.content}
              </p>
            )}

            {/* Edited indicator */}
            {message.edited_at && !message.is_deleted && (
              <span className={cn('text-[10px] opacity-50 ml-2', isOwn ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500')}>
                (edited)
              </span>
            )}

            {/* Attachments - hide when message is deleted */}
            {!message.is_deleted && (hasAudioAttachment || isVoicePlaceholder || attachments.some((a: any) => !(a?.file_type || '').startsWith('audio/'))) && (
              <div className={cn(hideContentForVoice || isVoicePlaceholder ? '' : 'mt-2', 'space-y-2')}>
                {/* Voice messages: always show player (fetches attachment if missing) */}
                {(hasAudioAttachment || isVoicePlaceholder) && (
                  <VoiceMessageBubble
                    messageId={message.id}
                    attachment={attachments.find((a: any) => (a?.file_type || '').startsWith('audio/'))}
                    isOwn={isOwn}
                  />
                )}
                {/* Non-audio attachments */}
                {attachments
                  .filter((a: any) => !(a?.file_type || '').startsWith('audio/'))
                  .map((att, i) => (
                    <AttachmentPreview key={att.id || att.storage_path || i} attachment={att} onPreview={onPreviewImage} isOwn={isOwn} />
                  ))}
              </div>
            )}
          </div>

          {/* Actions (right side for others' messages) */}
          {/* Reply feature removed */}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('mt-1', isOwn ? 'text-right' : 'text-left')}>
            <MessageReactions
              reactions={message.reactions}
              currentUserId={currentUserId}
              onAddReaction={(emoji) => onReaction?.(message.id, emoji)}
              onRemoveReaction={(emoji) => onRemoveReaction?.(message.id, emoji)}
              compact
            />
          </div>
        )}

        {/* Timestamp & status */}
        <div className={cn('flex items-center gap-1.5 mt-1.5', isOwn ? 'justify-end' : 'justify-start')}>
          <span className="text-[11px] text-slate-400 font-medium">{formatMessageTime(message.created_at)}</span>
          {showReadReceipts && isOwn && !message.is_deleted && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  )
})

// ============================================
// PENDING MESSAGE ITEM (Memoized)
// ============================================

function PendingMessageItem({
  message,
  fontSizeClass,
  isDark = false,
  onRetry,
  onCancel
}: {
  message: PendingMessage
  fontSizeClass: string
  isDark?: boolean
  onRetry: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end mb-1">
      <div className="max-w-[70%]">
        <div className={cn(
          'px-4 py-2.5 rounded-2xl rounded-br-md',
          message.status === 'failed'
            ? isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
            : 'bg-gradient-to-r from-teal-500/70 to-cyan-600/70 text-white'
        )}>
          <p className={cn(fontSizeClass, 'whitespace-pre-wrap break-words')}>{message.content}</p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-1">
          {message.status === 'sending' && (
            <>
              <Clock className="h-3 w-3 text-slate-400 animate-pulse" />
              <span className="text-xs text-slate-400">Sending...</span>
            </>
          )}
          {message.status === 'failed' && (
            <>
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-500">Failed</span>
              <button onClick={onRetry} className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
              <button onClick={onCancel} className="text-xs text-slate-500 hover:underline">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MESSAGE STATUS
// ============================================

function MessageStatus({ status }: { status?: string }) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3.5 w-3.5 text-white/60" />
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-white/60" />
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-white/60" />
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-teal-300" />
    case 'failed':
      return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
    default:
      return <CheckCheck className="h-3.5 w-3.5 text-teal-300" />
  }
}

// ============================================
// MESSAGE ACTIONS
// ============================================

// ============================================
// CONTEXT MENU
// ============================================

function ContextMenu({
  x, y, message, isOwn,
  onReply, onEdit, onCopy, onForward, onPin, onDelete, onClose
}: {
  x: number; y: number; message: Message; isOwn: boolean
  onReply: () => void; onEdit: () => void; onCopy: () => void
  onForward: () => void; onPin: () => void
  onDelete: (forEveryone: boolean) => void; onClose: () => void
}) {
  const canEdit = isOwn && isMessageEditable(message.created_at)
  const canDeleteForEveryone = isOwn && isMessageDeletable(message.created_at)

  return (
    <div
      className="fixed z-50 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[160px]"
      style={{ top: y, left: x }}
    >
      <ContextMenuItem icon={<Copy className="h-4 w-4" />} label="Copy" onClick={onCopy} />
      {canEdit && <ContextMenuItem icon={<Edit className="h-4 w-4" />} label="Edit" onClick={onEdit} />}
      <ContextMenuItem icon={<Forward className="h-4 w-4" />} label="Forward" onClick={onForward} />
      <ContextMenuItem icon={<Pin className="h-4 w-4" />} label="Pin" onClick={onPin} />
      <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
      <ContextMenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete for me" onClick={() => onDelete(false)} danger />
      {canDeleteForEveryone && (
        <ContextMenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete for everyone" onClick={() => onDelete(true)} danger />
      )}
    </div>
  )
}

function ContextMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 text-sm text-left flex items-center gap-3 transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ============================================
// DELETE CONFIRM DIALOG
// ============================================

function DeleteConfirmDialog({ onConfirm, onCancel, forEveryone }: { onConfirm: () => void; onCancel: () => void; forEveryone: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold mb-2">Delete message?</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {forEveryone
            ? 'This message will be deleted for everyone in this chat.'
            : 'This message will only be deleted for you.'}
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ATTACHMENT PREVIEW
// ============================================

function AttachmentPreview({ attachment, onPreview, isOwn = false }: { attachment: any; onPreview: (url: string) => void; isOwn?: boolean }) {
  const resolvedUrl = useAttachmentUrl(attachment)
  const isImage = attachment.file_type?.startsWith('image/')
  const isVideo = attachment.file_type?.startsWith('video/')
  const isAudio = attachment.file_type?.startsWith('audio/')
  const url = resolvedUrl && (resolvedUrl.startsWith('http') || resolvedUrl.startsWith('/')) ? resolvedUrl : ''

  if (isImage) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => url && onPreview(url)}
          className="block rounded-xl overflow-hidden border border-slate-200/30 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          disabled={!url}
          title={url ? 'Click to enlarge' : undefined}
        >
          {url ? (
            <img
              src={url}
              alt={attachment.file_name}
              className="max-w-[240px] max-h-[180px] w-auto h-auto object-contain rounded-xl"
            />
          ) : (
            <div className="w-[240px] h-[140px] flex items-center justify-center text-slate-500 text-sm">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </button>
        {attachment.file_name && (
          <p className="text-xs truncate opacity-75 max-w-[240px]">{attachment.file_name}</p>
        )}
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-200/30 dark:border-slate-700">
        <video controls className="max-w-[280px] max-h-[200px]">
          {url && <source src={url} type={attachment.file_type} />}
        </video>
      </div>
    )
  }

  if (isAudio && url) {
    return (
      <VoiceMessagePlayer 
        src={url} 
        duration={attachment.duration}
        isOwn={isOwn}
      />
    )
  }
  
  // Loading state for audio
  if (isAudio) {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[260px] max-w-[320px]",
        isOwn 
          ? "bg-gradient-to-br from-teal-500 via-teal-500 to-cyan-600" 
          : "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
      )}>
        <div className={cn(
          "h-11 w-11 rounded-full flex items-center justify-center shrink-0",
          isOwn ? "bg-white/25" : "bg-gradient-to-br from-teal-500 to-cyan-600"
        )}>
          <LoadingSpinner size="sm" className="text-white" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-[2px] h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full animate-pulse",
                  isOwn ? "bg-white/35" : "bg-slate-300 dark:bg-slate-600"
                )}
                style={{ height: 6 + Math.random() * 18, animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          <span className={cn("text-[11px]", isOwn ? "text-white/70" : "text-muted-foreground")}>
            Loading...
          </span>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg max-w-[280px]",
        url ? "bg-white/10 hover:bg-white/20" : "opacity-60 pointer-events-none"
      )}
    >
      <span className="text-2xl">📎</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
        {attachment.file_size && (
          <p className="text-xs opacity-75">{Math.round(attachment.file_size / 1024)} KB</p>
        )}
      </div>
    </a>
  )
}

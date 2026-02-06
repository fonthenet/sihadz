'use client'

// ============================================
// ENHANCED MESSAGE LIST COMPONENT
// ============================================

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Trash2, Reply, MoreHorizontal, Check, CheckCheck, 
  Edit, Copy, Forward, Pin, AlertCircle, RotateCcw, X,
  Clock
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'
import { formatMessageTime, formatSmartDate, getInitials, copyToClipboard, isMessageEditable, isMessageDeletable } from '@/lib/chat/chat-utils'
import { MessageReactions } from './message-reactions'
import type { Message, PendingMessage, TypingEvent, ChatUserSettings, MessageReaction } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
  pendingMessages?: PendingMessage[]
  loading: boolean
  hasMore: boolean
  currentUserId: string
  typingUsers: TypingEvent[]
  settings?: ChatUserSettings | null
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
  onPinMessage
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: string; forEveryone: boolean } | null>(null)

  // Auto-scroll to bottom on new messages - instant for responsiveness
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current
    if (container) container.scrollTop = container.scrollHeight
    else bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' })
  }, [])
  useEffect(() => {
    scrollToBottom()
    const t = setTimeout(scrollToBottom, 150)
    return () => clearTimeout(t)
  }, [messages.length, pendingMessages.length, scrollToBottom])

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

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    msgs.forEach((message) => {
      const messageDate = formatSmartDate(message.created_at)
      if (messageDate !== currentDate) {
        currentDate = messageDate
        groups.push({ date: messageDate, messages: [] })
      }
      groups[groups.length - 1].messages.push(message)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

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
        'flex-1 overflow-y-auto px-4 py-6',
        settings?.compact_mode ? 'space-y-1' : 'space-y-2'
      )}
    >
      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" className="text-slate-400" />
        </div>
      ) : messages.length === 0 && pendingMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="font-medium">No messages yet</p>
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
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Load earlier messages'}
              </button>
            </div>
          )}

          {/* Message groups */}
          {messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-6">
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-500 font-medium">
                  {group.date}
                </div>
              </div>

              {/* Messages */}
              {group.messages.map((message, messageIndex) => {
                const isOwn = message.sender_id === currentUserId
                const showAvatar = !isOwn && (
                  messageIndex === 0 ||
                  group.messages[messageIndex - 1]?.sender_id !== message.sender_id
                )
                const showName = showAvatar && !isOwn

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    showName={showName}
                    currentUserId={currentUserId}
                    fontSizeClass={fontSizeClass}
                    compact={settings?.compact_mode}
                    onContextMenu={(e) => handleContextMenu(e, message)}
                    onReply={() => onReplyMessage(message)}
                    onReaction={onReaction}
                    onRemoveReaction={onRemoveReaction}
                  />
                )
              })}
            </div>
          ))}

          {/* Pending messages */}
          {pendingMessages.map((pending) => (
            <PendingMessageItem
              key={pending.tempId}
              message={pending}
              fontSizeClass={fontSizeClass}
              onRetry={() => onRetryMessage?.(pending.tempId)}
              onCancel={() => onCancelMessage?.(pending.tempId)}
            />
          ))}

          {/* Typing indicator */}
          {typingUsers.length > 0 && settings?.show_typing_indicators !== false && (
            <div className="flex items-center gap-2 ml-10 mt-2">
              <div className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <span className="text-xs text-slate-500">
                {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          isOwn={contextMenu.message.sender_id === currentUserId}
          onReply={() => { onReplyMessage(contextMenu.message); setContextMenu(null) }}
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
// MESSAGE ITEM
// ============================================

function MessageItem({
  message,
  isOwn,
  showAvatar,
  showName,
  currentUserId,
  fontSizeClass,
  compact,
  onContextMenu,
  onReply,
  onReaction,
  onRemoveReaction
}: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  showName: boolean
  currentUserId: string
  fontSizeClass: string
  compact?: boolean
  onContextMenu: (e: React.MouseEvent) => void
  onReply: () => void
  onReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={cn('flex group', isOwn ? 'justify-end' : 'justify-start', compact ? 'mb-0.5' : 'mb-1')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onContextMenu={onContextMenu}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0 mr-2">
          {showAvatar && message.sender && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-medium">
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
          <p className="text-xs text-slate-500 mb-1 ml-1">{message.sender.full_name}</p>
        )}

        {/* Message bubble */}
        <div className="flex items-end gap-2">
          {/* Actions (left side for own messages) */}
          {showActions && isOwn && !message.is_deleted && (
            <MessageActions onReply={onReply} isOwn />
          )}

          <div
            className={cn(
              'px-4 py-2.5 rounded-2xl relative',
              isOwn
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-br-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md',
              message.is_deleted && 'italic opacity-60'
            )}
          >
            {/* Reply preview */}
            {message.reply_to && (
              <div className={cn(
                'mb-2 pb-2 border-b text-xs opacity-75',
                isOwn ? 'border-white/20' : 'border-slate-300 dark:border-slate-600'
              )}>
                <span className="font-medium">{message.reply_to.sender?.full_name}</span>
                <p className="truncate">{message.reply_to.content}</p>
              </div>
            )}

            {/* Content */}
            {message.is_deleted ? (
              <p className={fontSizeClass}>This message was deleted</p>
            ) : (
              <p className={cn(fontSizeClass, 'whitespace-pre-wrap break-words')}>
                {message.content}
              </p>
            )}

            {/* Edited indicator */}
            {message.edited_at && !message.is_deleted && (
              <span className={cn('text-xs opacity-60 ml-2', isOwn ? 'text-white' : 'text-slate-500')}>
                (edited)
              </span>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map(att => (
                  <AttachmentPreview key={att.id} attachment={att} />
                ))}
              </div>
            )}
          </div>

          {/* Actions (right side for others' messages) */}
          {showActions && !isOwn && !message.is_deleted && (
            <MessageActions onReply={onReply} />
          )}
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
        <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
          <span className="text-xs text-slate-400">{formatMessageTime(message.created_at)}</span>
          {isOwn && !message.is_deleted && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// PENDING MESSAGE ITEM
// ============================================

function PendingMessageItem({
  message,
  fontSizeClass,
  onRetry,
  onCancel
}: {
  message: PendingMessage
  fontSizeClass: string
  onRetry: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end mb-1">
      <div className="max-w-[70%]">
        <div className={cn(
          'px-4 py-2.5 rounded-2xl rounded-br-md',
          message.status === 'failed'
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
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

function MessageActions({ onReply, isOwn }: { onReply: () => void; isOwn?: boolean }) {
  return (
    <button
      onClick={onReply}
      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      <Reply className="h-4 w-4" />
    </button>
  )
}

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
      <ContextMenuItem icon={<Reply className="h-4 w-4" />} label="Reply" onClick={onReply} />
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

function AttachmentPreview({ attachment }: { attachment: any }) {
  const isImage = attachment.file_type?.startsWith('image/')
  const isVideo = attachment.file_type?.startsWith('video/')
  const isAudio = attachment.file_type?.startsWith('audio/')

  if (isImage) {
    return (
      <img
        src={attachment.url || `${attachment.storage_path}`}
        alt={attachment.file_name}
        className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
        onClick={() => window.open(attachment.url, '_blank')}
      />
    )
  }

  if (isVideo) {
    return (
      <video controls className="max-w-full rounded-lg">
        <source src={attachment.url} type={attachment.file_type} />
      </video>
    )
  }

  if (isAudio) {
    return (
      <audio controls className="w-full">
        <source src={attachment.url} type={attachment.file_type} />
      </audio>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20"
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

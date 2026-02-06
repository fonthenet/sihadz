'use client'

// ============================================
// CHAT WIDGET - MAIN COMPONENT
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, Settings, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatProvider, useChat } from '@/contexts/chat-context'
import { ThreadList } from './chat/thread-list'
import { ContactsView } from './chat/contacts-view'
import { ThreadHeader } from './chat/thread-header'
import { MessageList } from './chat/message-list'
import { MessageComposer } from './chat/message-composer'
import { ThreadInfo } from './chat/thread-info'
import { NewChatDialog } from './chat/new-chat-dialog'
import { ForwardMessageDialog } from './chat/forward-message-dialog'
import { ChatQuickAccess } from './chat/chat-quick-access'
import { ChatSettings } from './chat/chat-settings'
import { MessageSearch } from './chat/message-search'
import type { ChatWidgetProps, SearchResult } from '@/types/chat'
import { useChatWidgetPosition, clampPosition } from '@/hooks/use-chat-widget-position'
import { requestNotificationPermission, showBrowserNotification } from '@/lib/chat/chat-utils'

const WIDGET_WIDTH = 384
const WIDGET_HEIGHT = 600
const LAUNCHER_WIDTH = 200
const LAUNCHER_HEIGHT = 48

// ============================================
// MAIN WIDGET WRAPPER
// ============================================

export function ChatWidget(props: ChatWidgetProps) {
  return (
    <ChatProvider
      userId={props.userId}
      userName={props.userName}
      userAvatar={props.userAvatar}
      userType={props.userType}
      defaultThreadId={props.defaultThreadId}
    >
      <ChatWidgetInner {...props} />
    </ChatProvider>
  )
}

// ============================================
// INNER WIDGET COMPONENT
// ============================================

function ChatWidgetInner({
  position = 'bottom-right',
  defaultOpen = false,
  className,
  onOpenChange
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { effectiveTheme } = useChat()
  const launcherOffset = { x: WIDGET_WIDTH - LAUNCHER_WIDTH, y: WIDGET_HEIGHT - LAUNCHER_HEIGHT }
  const { getPosition, updatePosition, customPos, resetToDefault } = useChatWidgetPosition(
    position,
    WIDGET_WIDTH,
    WIDGET_HEIGHT,
    launcherOffset
  )
  const storedPos = getPosition()
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const pos = dragPos ?? storedPos
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)
  const didDragRef = useRef(false)
  const isLauncherRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null)

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, clientX: number, clientY: number, onReleaseWithoutDrag?: () => void) => {
      e.preventDefault()
      e.stopPropagation()
      didDragRef.current = false
      isLauncherRef.current = !isOpen
      const p = getPosition()
      dragRef.current = { startX: clientX, startY: clientY, posX: p.x, posY: p.y }
      setDragPos({ x: p.x, y: p.y })
      const cleanup = () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        pendingPosRef.current = null
        dragRef.current = null
        setDragPos(null)
        window.removeEventListener('mousemove', onMove as (e: MouseEvent) => void)
        window.removeEventListener('mouseup', onEnd)
        window.removeEventListener('touchmove', onMove as (e: TouchEvent) => void, { passive: false, capture: true })
        window.removeEventListener('touchend', onEnd)
        window.removeEventListener('touchcancel', onEnd)
      }
      const flushPos = () => {
        const next = pendingPosRef.current
        if (next) {
          pendingPosRef.current = null
          setDragPos(next)
        }
        rafRef.current = null
      }
      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!dragRef.current) return
        const cx = 'touches' in ev ? ev.touches[0]?.clientX : ev.clientX
        const cy = 'touches' in ev ? ev.touches[0]?.clientY : ev.clientY
        if (cx == null || cy == null) return
        if ('touches' in ev) ev.preventDefault()
        const { startX, startY, posX, posY } = dragRef.current
        const deltaX = cx - startX
        const deltaY = cy - startY
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) didDragRef.current = true
        const clamped = clampPosition(posX + deltaX, posY + deltaY, WIDGET_WIDTH, WIDGET_HEIGHT, launcherOffset)
        dragRef.current = { startX: cx, startY: cy, posX: clamped.x, posY: clamped.y }
        pendingPosRef.current = clamped
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(flushPos)
        }
      }
      const onEnd = () => {
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        const pending = pendingPosRef.current
        const drag = dragRef.current
        const final = pending ?? (drag ? { x: drag.posX, y: drag.posY } : null)
        if (final && didDragRef.current) {
          updatePosition(final.x, final.y)
        } else if (!didDragRef.current && onReleaseWithoutDrag) {
          onReleaseWithoutDrag()
        }
        cleanup()
      }
      window.addEventListener('mousemove', onMove as (e: MouseEvent) => void)
      window.addEventListener('mouseup', onEnd)
      window.addEventListener('touchmove', onMove as (e: TouchEvent) => void, { passive: false, capture: true })
      window.addEventListener('touchend', onEnd)
      window.addEventListener('touchcancel', onEnd)
    },
    [isOpen, getPosition, updatePosition]
  )

  const onLauncherPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    handleDragStart(e, clientX, clientY, () => setIsOpen(true))
  }

  const onHeaderPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    handleDragStart(e, clientX, clientY)
  }
  
  const {
    isExpanded,
    setIsExpanded,
    showSettings,
    setShowSettings,
    showNewChat,
    setShowNewChat,
    showContacts,
    setShowContacts,
    showInfo,
    setShowInfo,
    showSearch,
    setShowSearch,
    selectedThread,
    forwardMessage,
    setForwardMessage,
    forwardMessageToThread,
    selectThread,
    threads,
    threadsLoading,
    messages,
    pendingMessages,
    messagesLoading,
    hasMoreMessages,
    loadMoreMessages,
    refreshMessages,
    sendMessage,
    sendVoiceMessage,
    editMessage,
    deleteMessage,
    retryMessage,
    cancelMessage,
    addReaction,
    removeReaction,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    typingUsers,
    setTyping,
    settings,
    updateSettings,
    createDirectThread,
    createGroupThread,
    muteThread,
    leaveGroup,
    removeMember,
    updateMemberRole,
    deleteGroup,
    clearChat,
    blockUser,
    unblockUser,
    isBlocked,
    userId,
    userName,
    userAvatar = undefined,
    userType,
    profiles,
    profilesLoading,
    searchProfiles,
    uploads,
    uploadFile,
    searchResults,
    searchLoading,
    searchMessages,
    clearSearch,
  } = useChat()

  // Request notification permission on mount
  useEffect(() => {
    if (settings?.desktop_notifications) {
      requestNotificationPermission()
    }
  }, [settings?.desktop_notifications])

  // Handle selecting a search result
  const handleSearchSelect = useCallback((result: SearchResult) => {
    const thread = threads.find(t => t.id === result.thread_id)
    if (thread) {
      selectThread(thread)
      setShowSearch(false)
      // TODO: Could scroll to the specific message
    }
  }, [threads, selectThread, setShowSearch])

  // Notify parent of open state changes
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        if (showSettings) {
          setShowSettings(false)
        } else if (showNewChat) {
          setShowNewChat(false)
        } else if (showInfo) {
          setShowInfo(false)
        } else if (showSearch) {
          setShowSearch(false)
        } else if (isExpanded) {
          setIsExpanded(false)
        }
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && isOpen) {
        e.preventDefault()
        setShowSearch(!showSearch)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isExpanded, showSettings, showNewChat, showContacts, showInfo, showSearch])

  const isDark = effectiveTheme === 'dark'
  const launcherX = pos.x + WIDGET_WIDTH - LAUNCHER_WIDTH
  const launcherY = pos.y + WIDGET_HEIGHT - LAUNCHER_HEIGHT

  // Widget is closed - show launcher button (draggable)
  if (!isOpen) {
    return (
      <button
        type="button"
        onMouseDown={onLauncherPointerDown}
        onTouchStart={onLauncherPointerDown}
        className={cn(
          'fixed z-50 flex items-center justify-center p-4 rounded-full shadow-2xl transition-transform duration-150 ease-out hover:scale-105 active:scale-[0.98] cursor-grab active:cursor-grabbing touch-none select-none',
          'bg-gradient-to-r from-teal-500 to-cyan-600 text-white',
          className
        )}
        style={{ left: launcherX, top: launcherY }}
        title="Chat - drag to move"
      >
        <MessageCircle className="h-6 w-6" />
        {threads.reduce((sum, t) => sum + t.unread_count, 0) > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {threads.reduce((sum, t) => sum + t.unread_count, 0) > 9 ? '9+' : threads.reduce((sum, t) => sum + t.unread_count, 0)}
          </span>
        )}
      </button>
    )
  }

  // Widget is open
  return (
    <>
      <div
        className={cn(
          'fixed z-50 rounded-2xl shadow-2xl overflow-hidden transition-colors duration-200',
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200',
          'border',
          isExpanded
            ? 'inset-4 w-full max-w-[min(72rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] mx-auto'
            : 'w-96 h-[600px] max-h-[calc(100vh-2rem)]',
          className
        )}
        style={isExpanded ? undefined : { left: pos.x, top: pos.y }}
      >
        {/* Header - grip area for dragging */}
        <div className="h-14 bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onMouseDown={onHeaderPointerDown}
              onTouchStart={onHeaderPointerDown}
              className="p-3 -ml-1 -my-1 rounded-lg hover:bg-white/20 text-white/90 cursor-grab active:cursor-grabbing shrink-0 touch-none select-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Drag to move"
              aria-label="Drag to move chat widget"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="text-white">
              <p className="font-semibold text-sm">Messages</p>
              {selectedThread && (
                <p className="text-xs text-white/80">
                  {selectedThread.thread_type === 'group' 
                    ? (selectedThread.title || '').trim() || 'Group'
                    : (selectedThread.other_user?.full_name || '').trim() || 'Contact'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Panel */}
        <MessageSearch
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          isDark={isDark}
          results={searchResults}
          loading={searchLoading}
          onSearch={searchMessages}
          onClear={clearSearch}
          threads={threads}
          onSelectResult={handleSearchSelect}
          currentThreadId={selectedThread?.id}
        />

        {/* Main content */}
        <div className={cn('h-[calc(100%-3.5rem)] flex', isDark ? 'bg-slate-900' : 'bg-white')}>
          {/* Sidebar - Thread List (shown when expanded or no thread selected) */}
          {(isExpanded || !selectedThread) && (
            <div className={cn(
              'flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-r',
              isDark ? 'border-slate-700' : 'border-slate-200',
              isExpanded ? 'w-80' : 'w-full'
            )}>
              {showContacts ? (
                <ContactsView
                  currentUserId={userId}
                  threads={threads}
                  isDark={isDark}
                  onCreateThread={createDirectThread}
                  onSelectThread={selectThread}
                  onAddContact={() => setShowNewChat(true)}
                  onBack={() => setShowContacts(false)}
                  onBlockUser={blockUser}
                  onUnblockUser={unblockUser}
                  isBlocked={isBlocked}
                  onMuteThread={muteThread}
                />
              ) : (
                <ThreadList
                  threads={threads}
                  loading={threadsLoading}
                  selectedThreadId={selectedThread?.id || null}
                  currentUserId={userId}
                  onSelectThread={selectThread}
                  onCreateThread={createDirectThread}
                  onNewChat={() => setShowNewChat(true)}
                  onContacts={() => setShowContacts(true)}
                  onSettings={() => setShowSettings(true)}
                  onDeleteThread={async (thread) => {
                    await leaveGroup(thread.id)
                    if (selectedThread?.id === thread.id) selectThread(null)
                  }}
                  isDark={isDark}
                  showOnlineStatus={settings?.show_online_status !== false}
                  currentUserName={userName}
                  currentUserAvatar={userAvatar}
                />
              )}
            </div>
          )}

          {/* Chat area */}
          {(isExpanded || selectedThread) && selectedThread && (
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              {/* Thread header (in compact mode, show back button) */}
              {!isExpanded && (
                <div className={cn(
                  'h-12 flex items-center gap-2 px-3 flex-shrink-0 border-b',
                  isDark ? 'border-slate-700' : 'border-slate-100'
                )}>
                  <button
                    onClick={() => selectThread(null)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    )}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isDark ? 'text-white' : 'text-slate-900')}>
                      {selectedThread.thread_type === 'group'
                        ? (selectedThread.title || '').trim() || 'Group'
                        : (selectedThread.other_user?.full_name || '').trim() || 'Contact'}
                    </p>
                    {selectedThread.thread_type === 'group' && selectedThread.members && selectedThread.members.length > 0 && (
                      <p className={cn('text-[11px] truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {selectedThread.members
                          .map((m: any) => m.profile?.full_name)
                          .filter(Boolean)
                          .slice(0, 3)
                          .join(', ')}
                        {selectedThread.members.filter((m: any) => m.profile?.full_name).length > 3 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    )}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Thread header (expanded mode) */}
              {isExpanded && (
                <ThreadHeader
                  thread={selectedThread}
                  onShowInfo={() => setShowInfo(!showInfo)}
                  isDark={isDark}
                  onMute={muteThread}
                  onLeave={async (threadId) => { await leaveGroup(threadId); selectThread(null) }}
                  onClearChat={clearChat}
                  onRefreshMessages={refreshMessages}
                  showOnlineStatus={settings?.show_online_status !== false}
                  onSearch={() => setShowSearch(true)}
                />
              )}

              {/* Messages */}
              <MessageList
                messages={messages}
                pendingMessages={pendingMessages}
                loading={messagesLoading}
                hasMore={hasMoreMessages}
                currentUserId={userId}
                typingUsers={typingUsers}
                settings={settings}
                threadId={selectedThread?.id ?? null}
                isDark={isDark}
                onLoadMore={loadMoreMessages}
                onDeleteMessage={deleteMessage}
                onEditMessage={(id, content) => {
                  const msg = messages.find(m => m.id === id)
                  if (msg) setEditingMessage(msg)
                }}
                onReplyMessage={() => {}}
                onForwardMessage={(msg) => setForwardMessage(msg)}
                onReaction={addReaction}
                onRemoveReaction={removeReaction}
                onRetryMessage={retryMessage}
                onCancelMessage={cancelMessage}
                onCopyMessage={() => {}}
                onPinMessage={() => {}}
              />

              {/* Composer - flex-shrink-0 so message list gets remaining space */}
              <div className="flex-shrink-0">
                <MessageComposer
                  disabled={!selectedThread}
                  replyTo={replyTo}
                  editingMessage={editingMessage}
                  onSend={async (content, replyToId) => {
                    await sendMessage(content, replyToId)
                  }}
                  onCancelReply={() => setReplyTo(null)}
                  onEdit={async (messageId, content) => {
                    const ok = await editMessage(messageId, content)
                    if (ok) setEditingMessage(null)
                  }}
                  onCancelEdit={() => setEditingMessage(null)}
                  onTyping={setTyping}
                  onFileSelect={async (file: File) => {
                    const res = await sendMessage(file.name)
                    if (res?.success && res.messageId) {
                      await uploadFile(file, res.messageId)
                    }
                  }}
                  onVoiceSend={async (blob: Blob, duration: number) => {
                    await sendVoiceMessage(blob, duration)
                  }}
                  isDark={isDark}
                  uploads={uploads}
                  enterToSend={settings?.enter_to_send !== false}
                />
              </div>
            </div>
          )}

          {/* Empty state */}
          {isExpanded && !selectedThread && (
            <div className={cn('flex-1 flex flex-col items-center justify-center', isDark ? 'text-slate-400' : 'text-slate-400')}>
              <div className={cn(
                'w-24 h-24 rounded-3xl flex items-center justify-center mb-6',
                isDark ? 'bg-slate-800' : 'bg-gradient-to-br from-teal-100 to-cyan-100'
              )}>
                <MessageCircle className={cn('w-12 h-12', isDark ? 'text-teal-400' : 'text-teal-500')} />
              </div>
              <h3 className={cn('text-xl font-semibold mb-2', isDark ? 'text-white' : 'text-slate-700')}>Welcome to Chat</h3>
              <p className="text-sm text-center max-w-sm">
                Select a conversation or start a new chat
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25"
              >
                Start a conversation
              </button>
            </div>
          )}

          {/* Thread Info Panel */}
          {isExpanded && showInfo && selectedThread && (
            <ThreadInfo
              thread={selectedThread}
              isOpen={showInfo}
              onClose={() => setShowInfo(false)}
              isDark={isDark}
              currentUserId={userId}
              onMuteThread={muteThread}
              onLeaveGroup={async (threadId) => { await leaveGroup(threadId); selectThread(null); setShowInfo(false) }}
              onClearChat={clearChat}
              onRemoveMember={removeMember}
              onUpdateMemberRole={updateMemberRole}
              onDeleteGroup={async (threadId) => { await deleteGroup(threadId); selectThread(null); setShowInfo(false) }}
              onBlockUser={blockUser}
              isBlocked={isBlocked}
              showOnlineStatus={settings?.show_online_status !== false}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <NewChatDialog
        isOpen={showNewChat}
        currentUserId={userId}
        currentUserType={userType}
        onClose={() => setShowNewChat(false)}
        isDark={isDark}
        onCreateDirect={async (otherUserId) => {
          const thread = await createDirectThread(otherUserId)
          if (thread) selectThread(thread)
        }}
        onCreateGroup={async (title, memberIds) => {
          const thread = await createGroupThread(title, memberIds)
          if (thread) selectThread(thread)
        }}
      />

      <ChatSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetPosition={customPos ? resetToDefault : undefined}
      />

      <ForwardMessageDialog
        isOpen={!!forwardMessage}
        message={forwardMessage}
        threads={threads}
        currentThreadId={selectedThread?.id ?? null}
        currentUserId={userId}
        isDark={isDark}
        onClose={() => setForwardMessage(null)}
        onForward={forwardMessageToThread}
      />

    </>
  )
}

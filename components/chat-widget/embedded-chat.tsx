'use client'

// ============================================
// EMBEDDED CHAT - Full-size chat for dashboards
// Uses the same logic as the floating chat widget
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatProvider, useChat } from '@/contexts/chat-context'
import { ThreadList } from './chat/thread-list'
import { ThreadHeader } from './chat/thread-header'
import { MessageList } from './chat/message-list'
import { MessageComposer } from './chat/message-composer'
import { ThreadInfo } from './chat/thread-info'
import { NewChatDialog } from './chat/new-chat-dialog'
import { ForwardMessageDialog } from './chat/forward-message-dialog'
import { ContactsView } from './chat/contacts-view'
import { ChatSettings } from './chat/chat-settings'
import { MessageSearch } from './chat/message-search'
import { requestNotificationPermission } from '@/lib/chat/chat-utils'
import type { UserType } from '@/types/chat'
import type { SearchResult } from '@/types/chat'

interface EmbeddedChatProps {
  userId: string
  userName: string
  userAvatar?: string
  userType?: UserType
  defaultThreadId?: string
  className?: string
}

export function EmbeddedChat(props: EmbeddedChatProps) {
  return (
    <ChatProvider
      userId={props.userId}
      userName={props.userName}
      userAvatar={props.userAvatar}
      userType={props.userType}
      defaultThreadId={props.defaultThreadId}
    >
      <EmbeddedChatInner {...props} />
    </ChatProvider>
  )
}

const SIDEBAR_MIN = 240
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 320
const STORAGE_KEY = 'dzdoc-chat-sidebar-width'

function EmbeddedChatInner({ className }: EmbeddedChatProps) {
  const { effectiveTheme } = useChat()
  const isDark = effectiveTheme === 'dark'

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT
    const stored = localStorage.getItem(STORAGE_KEY)
    const n = stored ? parseInt(stored, 10) : NaN
    return Number.isFinite(n) ? Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n)) : SIDEBAR_DEFAULT
  })

  const resizeRef = useRef<{ startX: number; startW: number } | null>(null)

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    resizeRef.current = { startX: e.clientX, startW: sidebarWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return
      const delta = ev.clientX - resizeRef.current.startX
      const dir = typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? -1 : 1
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, resizeRef.current.startW + delta * dir))
      setSidebarWidth(next)
      localStorage.setItem(STORAGE_KEY, String(next))
    }
    const onUp = () => {
      resizeRef.current = null
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [sidebarWidth])

  const {
    refreshMessages,
    showNewChat,
    setShowNewChat,
    showContacts,
    setShowContacts,
    showSettings,
    setShowSettings,
    showInfo,
    setShowInfo,
    showSearch,
    setShowSearch,
    selectedThread,
    selectThread,
    threads,
    forwardMessage,
    setForwardMessage,
    forwardMessageToThread,
    threadsLoading,
    messages,
    pendingMessages,
    messagesLoading,
    hasMoreMessages,
    loadMoreMessages,
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

  // Handle keyboard shortcuts (ref keeps handler stable; deps array stays constant)
  const stateRef = useRef({
    showSettings,
    showNewChat,
    showContacts,
    showInfo,
    showSearch,
    selectedThread,
    setShowSettings,
    setShowNewChat,
    setShowContacts,
    setShowInfo,
    setShowSearch,
    selectThread,
  })
  stateRef.current = {
    showSettings,
    showNewChat,
    showContacts,
    showInfo,
    showSearch,
    selectedThread,
    setShowSettings,
    setShowNewChat,
    setShowContacts,
    setShowInfo,
    setShowSearch,
    selectThread,
  }
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current
      if (e.key === 'Escape') {
        if (s.showSettings) s.setShowSettings(false)
        else if (s.showNewChat) s.setShowNewChat(false)
        else if (s.showContacts) s.setShowContacts(false)
        else if (s.showInfo) s.setShowInfo(false)
        else if (s.showSearch) s.setShowSearch(false)
        else if (s.selectedThread) s.selectThread(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        s.setShowSearch(!s.showSearch)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSelect = useCallback((result: SearchResult) => {
    const thread = threads.find(t => t.id === result.thread_id)
    if (thread) {
      selectThread(thread)
      setShowSearch(false)
    }
  }, [threads, selectThread, setShowSearch])

  // Request notification permission when desktop notifications are enabled
  useEffect(() => {
    if (settings?.desktop_notifications) {
      requestNotificationPermission()
    }
  }, [settings?.desktop_notifications])

  return (
    <div className={cn(
      'flex h-full rounded-xl overflow-hidden border',
      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200',
      className
    )}>
      {/* Sidebar: resizable width */}
      <div
        className={cn(
          'flex flex-shrink-0 flex-col border-e',
          isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white',
          selectedThread ? 'hidden md:flex' : 'flex'
        )}
        style={{ width: sidebarWidth }}
      >
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
            title="Conversations"
            isDark={isDark}
            showOnlineStatus={settings?.show_online_status !== false}
            currentUserName={userName}
            currentUserAvatar={userAvatar}
          />
        )}
      </div>

      {/* Resize handle - only when sidebar visible */}
      <div
        className={cn(
          'flex-shrink-0 w-2 flex items-center justify-center cursor-col-resize select-none touch-none group',
          'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors',
          selectedThread ? 'hidden md:flex' : 'flex'
        )}
        onPointerDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize conversations panel"
      >
        <div className={cn(
          'w-0.5 h-8 rounded-full transition-opacity',
          isDark ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-slate-300 group-hover:bg-slate-400'
        )} />
      </div>

      {/* Chat Area */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0 relative',
          !selectedThread ? 'hidden md:flex' : 'flex'
        )}>
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
          currentThreadId={selectedThread?.id ?? null}
          topOffset={selectedThread ? 'top-16' : 'top-0'}
        />
        {selectedThread ? (
          <>
            <ThreadHeader
              thread={selectedThread}
              onShowInfo={() => setShowInfo(true)}
              isDark={isDark}
              onMute={muteThread}
              onLeave={async (threadId) => { await leaveGroup(threadId); selectThread(null) }}
              onClearChat={clearChat}
              onRefreshMessages={refreshMessages}
              showOnlineStatus={settings?.show_online_status !== false}
              onSearch={() => setShowSearch(true)}
            />

            <MessageList
              messages={messages}
              pendingMessages={pendingMessages}
              loading={messagesLoading}
              hasMore={hasMoreMessages}
              currentUserId={userId}
              typingUsers={typingUsers}
              settings={settings}
              threadId={selectedThread.id}
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

            <MessageComposer
              disabled={false}
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
          </>
        ) : (
          <div className={cn(
            'flex-1 flex flex-col items-center justify-center',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}>
            <Users className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm opacity-75">or start a new one</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-4 px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </button>
          </div>
        )}
        </div>

      {/* Thread Info Panel */}
      {showInfo && selectedThread && (
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
        onResetPosition={undefined}
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

    </div>
  )
}

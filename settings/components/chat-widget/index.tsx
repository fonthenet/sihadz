'use client'

// ============================================
// CHAT WIDGET - MAIN COMPONENT
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, Settings, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatProvider, useChat, useTheme, ThemeProvider } from '@/contexts/chat-context'
import { ThreadList } from './chat/thread-list'
import { ThreadHeader } from './chat/thread-header'
import { MessageList } from './chat/message-list'
import { MessageComposer } from './chat/message-composer'
import { ThreadInfo } from './chat/thread-info'
import { NewChatDialog } from './chat/new-chat-dialog'
import { ContactsDialog } from '@/components/chat-widget/chat/contacts-dialog'
import { ChatSettings } from './chat/chat-settings'
import type { ChatWidgetProps } from '@/types/chat'

// ============================================
// MAIN WIDGET WRAPPER
// ============================================

export function ChatWidget(props: ChatWidgetProps) {
  return (
    <ThemeProvider>
      <ChatProvider
        userId={props.userId}
        userName={props.userName}
        userAvatar={props.userAvatar}
        userType={props.userType}
        defaultThreadId={props.defaultThreadId}
      >
        <ChatWidgetInner {...props} />
      </ChatProvider>
    </ThemeProvider>
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
  const { effectiveTheme } = useTheme()
  
  const {
    isExpanded,
    setIsExpanded,
    showSettings,
    setShowSettings,
    showNewChat,
    setShowNewChat,
    showInfo,
    setShowInfo,
    showSearch,
    setShowSearch,
    selectedThread,
    selectThread,
    threads,
    threadsLoading,
    messages,
    pendingMessages,
    messagesLoading,
    hasMoreMessages,
    loadMoreMessages,
    sendMessage,
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
    forwardMessage,
    setForwardMessage,
    forwardMessageToThread,
    userId,
    userName,
    profiles,
    profilesLoading,
    searchProfiles,
    uploads,
    uploadFile,
  } = useChat()

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
        } else if (showContacts) {
          setShowContacts(false)
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
  }, [isOpen, isExpanded, showSettings, showNewChat, showInfo, showSearch])

  const positionClasses = position === 'bottom-right' ? 'right-4' : 'left-4'
  const isDark = effectiveTheme === 'dark'

  // Widget is closed - show launcher button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95',
          'bg-gradient-to-r from-teal-500 to-cyan-600 text-white',
          positionClasses,
          className
        )}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-medium">Chat</span>
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
          'fixed z-50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300',
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200',
          'border',
          isExpanded ? 'inset-4 w-full max-w-[min(72rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] mx-auto' : [positionClasses, 'bottom-4 w-96 h-[600px] max-h-[calc(100vh-2rem)]'],
          className
        )}
      >
        {/* Header */}
        <div className="h-14 bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="text-white">
              <p className="font-semibold text-sm">Messages</p>
              <p className="text-xs text-white/80">
                {selectedThread 
                  ? (selectedThread.thread_type === 'group' 
                      ? selectedThread.title 
                      : selectedThread.other_user?.full_name || 'Chat')
                  : "We're here to help"
                }
              </p>
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

        {/* Main content */}
        <div className={cn('h-[calc(100%-3.5rem)] flex', isDark ? 'bg-slate-900' : 'bg-white')}>
          {/* Sidebar - Thread List (shown when expanded or no thread selected) */}
          {(isExpanded || !selectedThread) && (
            <div className={cn(
              'flex-shrink-0 border-r',
              isDark ? 'border-slate-700' : 'border-slate-200',
              isExpanded ? 'w-80' : 'w-full'
            )}>
              <ThreadList
                threads={threads}
                loading={threadsLoading}
                selectedThreadId={selectedThread?.id || null}
                currentUserId={userId}
                onSelectThread={selectThread}
                onNewChat={() => setShowNewChat(true)}
                onContacts={() => setShowContacts(true)}
                onDeleteThread={async (thread) => {
                  await leaveGroup(thread.id)
                  if (selectedThread?.id === thread.id) selectThread(null)
                }}
                isDark={isDark}
              />
            </div>
          )}

          {/* Chat area */}
          {(isExpanded || selectedThread) && selectedThread && (
            <div className="flex-1 flex flex-col min-w-0">
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
                        ? selectedThread.title
                        : selectedThread.other_user?.full_name || 'Chat'}
                    </p>
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
                onLoadMore={loadMoreMessages}
                onDeleteMessage={deleteMessage}
                onEditMessage={(id, content) => {
                  const msg = messages.find(m => m.id === id)
                  if (msg) setEditingMessage(msg)
                }}
                onReplyMessage={setReplyTo}
                onForwardMessage={(msg) => setForwardMessage(msg)}
                onReaction={addReaction}
                onRemoveReaction={removeReaction}
                onRetryMessage={retryMessage}
                onCancelMessage={cancelMessage}
                onCopyMessage={() => {}}
                onPinMessage={() => {}}
              />

              {/* Composer */}
              <MessageComposer
                disabled={!selectedThread}
                replyTo={replyTo}
                editingMessage={editingMessage}
                settings={settings}
                uploads={uploads}
                onSend={async (content, replyToId) => {
                  await sendMessage(content, replyToId)
                }}
                onCancelReply={() => setReplyTo(null)}
                onCancelEdit={() => setEditingMessage(null)}
                onSaveEdit={async (content) => {
                  if (editingMessage) {
                    await editMessage(editingMessage.id, content)
                    setEditingMessage(null)
                  }
                }}
                onTyping={setTyping}
                onFileSelect={() => {}}
              />
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
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <NewChatDialog
        isOpen={showNewChat}
        currentUserId={userId}
        onClose={() => setShowNewChat(false)}
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

      <ContactsDialog
        isOpen={showContacts}
        onClose={() => setShowContacts(false)}
        currentUserId={userId}
        threads={threads}
        isDark={isDark}
        onCreateThread={createDirectThread}
        onSelectThread={selectThread}
        onAddContact={() => setShowNewChat(true)}
      />
    </>
  )
}

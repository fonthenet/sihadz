'use client'

// ============================================
// CHAT WIDGET - CONTEXT PROVIDER
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useTheme as useNextTheme } from 'next-themes'
import { toast } from 'sonner'
import { 
  useThreads, 
  useMessages, 
  useTypingIndicator, 
  usePresence, 
  useSettings,
  useProfiles,
  useMessageSearch,
  useFileUpload
} from '@/lib/chat/use-chat-hooks'
import type { 
  ThreadWithDetails, 
  Message, 
  PendingMessage,
  ChatUserSettings,
  Profile,
  TypingEvent,
  SearchResult,
  UploadProgress,
  ThemeMode
} from '@/types/chat'

// ============================================
// TYPES
// ============================================

interface ChatContextValue {
  // User
  userId: string
  userName: string
  userAvatar?: string
  userType: string
  
  // Threads
  threads: ThreadWithDetails[]
  threadsLoading: boolean
  selectedThread: ThreadWithDetails | null
  selectThread: (thread: ThreadWithDetails | null) => void
  createDirectThread: (otherUserId: string) => Promise<ThreadWithDetails | null>
  createGroupThread: (title: string, memberIds: string[]) => Promise<ThreadWithDetails | null>
  muteThread: (threadId: string, until: Date | null) => Promise<void>
  leaveGroup: (threadId: string) => Promise<void>
  removeMember: (threadId: string, memberUserId: string) => Promise<void>
  updateMemberRole: (threadId: string, memberUserId: string, role: 'owner' | 'admin' | 'member') => Promise<void>
  deleteGroup: (threadId: string) => Promise<void>
  clearChat: (threadId: string) => Promise<void>
  refreshThreads: () => Promise<void>
  
  // Messages
  messages: Message[]
  pendingMessages: PendingMessage[]
  messagesLoading: boolean
  hasMoreMessages: boolean
  loadMoreMessages: () => void
  refreshMessages: () => void
  sendMessage: (content: string, replyToId?: string) => Promise<{ success: boolean; messageId?: string }>
  sendVoiceMessage: (blob: Blob, duration: number) => Promise<{ success: boolean; messageId?: string }>
  editMessage: (messageId: string, content: string) => Promise<boolean>
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<boolean>
  retryMessage: (tempId: string) => Promise<void>
  cancelMessage: (tempId: string) => void
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  
  // Reply
  replyTo: Message | null
  setReplyTo: (message: Message | null) => void
  
  // Edit
  editingMessage: Message | null
  setEditingMessage: (message: Message | null) => void
  
  // Forward
  forwardMessage: Message | null
  setForwardMessage: (message: Message | null) => void
  forwardMessageToThread: (targetThreadId: string, messageId: string) => Promise<void>
  
  // Typing
  typingUsers: TypingEvent[]
  setTyping: (isTyping: boolean) => void
  
  // Settings
  settings: ChatUserSettings | null
  updateSettings: (updates: Partial<ChatUserSettings>) => Promise<void>
  
  // Search
  searchResults: SearchResult[]
  searchLoading: boolean
  searchMessages: (query: string, threadId?: string) => Promise<void>
  clearSearch: () => void
  
  // Profiles
  profiles: Profile[]
  profilesLoading: boolean
  searchProfiles: (query: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
  isBlocked: (userId: string) => boolean
  
  // File Upload
  uploads: UploadProgress[]
  uploadFile: (file: File, messageId: string) => Promise<{ url?: string; error?: string }>
  
  // UI State
  showNewChat: boolean
  setShowNewChat: (show: boolean) => void
  showContacts: boolean
  setShowContacts: (show: boolean) => void
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  showSearch: boolean
  setShowSearch: (show: boolean) => void
  showInfo: boolean
  setShowInfo: (show: boolean) => void
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  
  // Theme
  theme: ThemeMode
  effectiveTheme: 'light' | 'dark'
}

// ============================================
// CONTEXT
// ============================================

const ChatContext = createContext<ChatContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

interface ChatProviderProps {
  children: ReactNode
  userId: string
  userName: string
  userAvatar?: string
  userType?: string
  defaultThreadId?: string
}

export function ChatProvider({
  children,
  userId,
  userName,
  userAvatar,
  userType = 'patient',
  defaultThreadId
}: ChatProviderProps) {
  // UI State
  const [selectedThread, setSelectedThread] = useState<ThreadWithDetails | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Hooks
  const { 
    threads, 
    loading: threadsLoading, 
    createDirectThread, 
    createGroupThread,
    muteThread,
    leaveGroup,
    removeMember,
    updateMemberRole,
    deleteGroup,
    refresh: refreshThreads 
  } = useThreads(userId)
  
  const { settings, updateSettings } = useSettings(userId)
  
  const {
    messages,
    pendingMessages,
    loading: messagesLoading,
    hasMore: hasMoreMessages,
    loadMore: loadMoreMessages,
    refresh: refreshMessages,
    sendMessage,
    sendVoiceMessage,
    editMessage,
    deleteMessage,
    clearChat,
    retryMessage,
    cancelMessage,
    addReaction,
    removeReaction,
    markAsRead
  } = useMessages(selectedThread?.id || null, userId, settings)
  
  const { typingUsers, setTyping: setTypingRaw } = useTypingIndicator(
    selectedThread?.id || null, 
    userId
  )
  
  usePresence(userId)
  
  const {
    profiles,
    loading: profilesLoading,
    searchProfiles,
    blockUser,
    unblockUser,
    isBlocked
  } = useProfiles(userId)
  
  const {
    results: searchResults,
    loading: searchLoading,
    search: searchMessages,
    clear: clearSearch
  } = useMessageSearch(userId)
  
  const { uploads, uploadFile } = useFileUpload(selectedThread?.id || null, userId)

  // Select thread by ID on mount (only update when thread id differs to avoid refresh loops)
  useEffect(() => {
    if (defaultThreadId && threads.length > 0) {
      const thread = threads.find(t => t.id === defaultThreadId)
      if (thread) {
        setSelectedThread(prev => (prev?.id === thread.id ? prev : thread))
      }
    }
  }, [defaultThreadId, threads])

  // Sync selectedThread with refreshed threads so unread_count and last_message stay up to date
  useEffect(() => {
    if (selectedThread?.id && threads.length > 0) {
      const fresh = threads.find(t => t.id === selectedThread.id)
      if (fresh && (
        fresh.unread_count !== selectedThread.unread_count ||
        fresh.last_message?.id !== selectedThread.last_message?.id
      )) {
        setSelectedThread(fresh)
      }
    }
  }, [threads, selectedThread?.id, selectedThread?.unread_count, selectedThread?.last_message?.id])

  // Mark messages as read when thread selected - only run once per thread selection
  const markedAsReadRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (!selectedThread?.id) {
      markedAsReadRef.current = null
      return
    }
    // Only mark as read once per thread to avoid infinite loops
    if (selectedThread.id !== markedAsReadRef.current && messages.length > 0) {
      markedAsReadRef.current = selectedThread.id
      markAsRead()
      // Realtime on chat_thread_members will refresh the list after last_read_message_id update
    }
  }, [selectedThread?.id, messages.length, markAsRead])

  // Clear reply/edit/forward when thread changes
  useEffect(() => {
    setReplyTo(null)
    setEditingMessage(null)
    setForwardMessage(null)
  }, [selectedThread?.id])

  // Typing wrapper
  const setTyping = useCallback((isTyping: boolean) => {
    setTypingRaw(isTyping, userName)
  }, [setTypingRaw, userName])

  // Wrapped operations with error toasts
  const sendMessageWithToast = useCallback(async (content: string, replyToId?: string) => {
    const result = await sendMessage(content, replyToId)
    if (!result.success) {
      toast.error('Failed to send message. Please try again.')
    }
    // Skip refreshThreads - realtime subscription on chat_messages will update the list
    return result
  }, [sendMessage])

  const sendVoiceMessageWithToast = useCallback(async (blob: Blob, duration: number) => {
    const result = await sendVoiceMessage(blob, duration)
    if (!result.success) {
      const msg = (result as { error?: string }).error
      toast.error('Failed to send voice message', {
        description: msg || 'Please check your connection and try again.',
        duration: 5000,
      })
      throw new Error(msg || 'Failed to send voice message')
    }
    return result
  }, [sendVoiceMessage])

  const editMessageWithToast = useCallback(async (messageId: string, content: string) => {
    const result = await editMessage(messageId, content)
    if (!result) {
      toast.error('Failed to edit message. Please try again.')
    }
    return result
  }, [editMessage])

  const deleteMessageWithToast = useCallback(async (messageId: string, forEveryone?: boolean) => {
    const result = await deleteMessage(messageId, forEveryone)
    if (!result) {
      toast.error('Failed to delete message. Please try again.')
    }
    return result
  }, [deleteMessage])

  const clearChatWithToast = useCallback(async (threadId: string) => {
    try {
      await clearChat(threadId)
      toast.success('Chat cleared')
    } catch {
      toast.error('Failed to clear chat')
    }
  }, [clearChat])

  const uploadFileWithToast = useCallback(async (file: File, messageId: string) => {
    const result = await uploadFile(file, messageId)
    if (result.error) {
      toast.error(`Upload failed: ${result.error}`)
    }
    return result
  }, [uploadFile])

  const createDirectThreadWithToast = useCallback(async (otherUserId: string) => {
    // If we already have a thread with this user, select it instead of creating a new one
    const existingThread = threads.find(
      (t) => t.thread_type === 'direct' && (t.other_user?.id === otherUserId || t.members?.some((m: { user_id: string }) => m.user_id === otherUserId))
    )
    if (existingThread) {
      return existingThread
    }
    const result = await createDirectThread(otherUserId)
    if (!result) {
      toast.error('Failed to create conversation. Please try again.')
    }
    return result
  }, [createDirectThread, threads])

  const createGroupThreadWithToast = useCallback(async (title: string, memberIds: string[]) => {
    try {
      const result = await createGroupThread(title, memberIds)
      if (!result) {
        toast.error('Failed to create group. Please try again.')
      }
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group. Please try again.'
      toast.error(msg)
      return null
    }
  }, [createGroupThread])

  // Select thread handler
  const selectThread = useCallback((thread: ThreadWithDetails | null) => {
    setSelectedThread(thread)
    setReplyTo(null)
    setEditingMessage(null)
  }, [])

  const removeMemberWithToast = useCallback(async (threadId: string, memberUserId: string) => {
    try {
      await removeMember(threadId, memberUserId)
      toast.success('Member removed from group')
    } catch {
      toast.error('Failed to remove member')
    }
  }, [removeMember])

  const updateMemberRoleWithToast = useCallback(async (threadId: string, memberUserId: string, role: 'owner' | 'admin' | 'member') => {
    try {
      await updateMemberRole(threadId, memberUserId, role)
      toast.success(role === 'admin' ? 'Member promoted to admin' : role === 'member' ? 'Admin demoted to member' : 'Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }, [updateMemberRole])

  const deleteGroupWithToast = useCallback(async (threadId: string) => {
    try {
      await deleteGroup(threadId)
      selectThread(null)
      toast.success('Group deleted')
    } catch {
      toast.error('Failed to delete group')
    }
  }, [deleteGroup, selectThread])

  const forwardMessageToThread = useCallback(async (targetThreadId: string, messageId: string) => {
    try {
      const res = await fetch('/api/chat/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetThreadId, messageId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to forward')
      toast.success('Message forwarded')
      setForwardMessage(null)
      refreshThreads()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to forward message'
      toast.error(msg)
      throw err
    }
  }, [refreshThreads])

  // Theme: use next-themes resolved theme to inherit from parent app
  const { resolvedTheme: appTheme } = useNextTheme()
  const effectiveTheme = (() => {
    if (settings?.theme && settings.theme !== 'system') return settings.theme
    if (appTheme === 'dark' || appTheme === 'light') return appTheme
    if (typeof window !== 'undefined') {
      if (document.documentElement.classList.contains('dark')) return 'dark'
      if (document.documentElement.classList.contains('light')) return 'light'
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })()

  const value: ChatContextValue = {
    // User
    userId,
    userName,
    userAvatar: userAvatar ?? undefined,
    userType,
    
    // Threads
    threads,
    threadsLoading,
    selectedThread,
    selectThread,
    createDirectThread: createDirectThreadWithToast,
    createGroupThread: createGroupThreadWithToast,
    muteThread,
    leaveGroup,
    removeMember: removeMemberWithToast,
    updateMemberRole: updateMemberRoleWithToast,
    deleteGroup: deleteGroupWithToast,
    clearChat: clearChatWithToast,
    refreshThreads,
    
    // Messages
    messages,
    pendingMessages,
    messagesLoading,
    hasMoreMessages,
    loadMoreMessages,
    refreshMessages,
    sendMessage: sendMessageWithToast,
    sendVoiceMessage: sendVoiceMessageWithToast,
    editMessage: editMessageWithToast,
    deleteMessage: deleteMessageWithToast,
    retryMessage,
    cancelMessage,
    addReaction,
    removeReaction,
    
    // Reply & Edit
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    
    // Forward
    forwardMessage,
    setForwardMessage,
    forwardMessageToThread,
    
    // Typing
    typingUsers,
    setTyping,
    
    // Settings
    settings,
    updateSettings,
    
    // Search
    searchResults,
    searchLoading,
    searchMessages,
    clearSearch,
    
    // Profiles
    profiles,
    profilesLoading,
    searchProfiles,
    blockUser,
    unblockUser,
    isBlocked,
    
    // File Upload
    uploads,
    uploadFile: uploadFileWithToast,
    
    // UI State
    showNewChat,
    setShowNewChat,
    showContacts,
    setShowContacts,
    showSettings,
    setShowSettings,
    showSearch,
    setShowSearch,
    showInfo,
    setShowInfo,
    isExpanded,
    setIsExpanded,
    
    // Theme
    theme: settings?.theme || 'system',
    effectiveTheme,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

// ============================================
// THEME CONTEXT (for standalone use)
// ============================================

interface ThemeContextValue {
  theme: ThemeMode
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  effectiveTheme: 'light',
  setTheme: () => {}
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to system to match profile/app theme (user can switch in settings)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const updateEffectiveTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setEffectiveTheme(isDark ? 'dark' : 'light')
      } else {
        setEffectiveTheme(theme)
      }
    }

    updateEffectiveTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateEffectiveTheme)

    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

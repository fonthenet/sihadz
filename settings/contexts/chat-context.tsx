'use client'

// ============================================
// CHAT WIDGET - CONTEXT PROVIDER
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
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
  refreshThreads: () => Promise<void>
  
  // Messages
  messages: Message[]
  pendingMessages: PendingMessage[]
  messagesLoading: boolean
  hasMoreMessages: boolean
  loadMoreMessages: () => void
  sendMessage: (content: string, replyToId?: string) => Promise<{ success: boolean; messageId?: string }>
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
  const [showNewChat, setShowNewChat] = useState(false)
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
    refresh: refreshThreads 
  } = useThreads(userId)
  
  const { settings, updateSettings } = useSettings(userId)
  
  const {
    messages,
    pendingMessages,
    loading: messagesLoading,
    hasMore: hasMoreMessages,
    loadMore: loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
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

  // Select thread by ID on mount
  useEffect(() => {
    if (defaultThreadId && threads.length > 0) {
      const thread = threads.find(t => t.id === defaultThreadId)
      if (thread) setSelectedThread(thread)
    }
  }, [defaultThreadId, threads])

  // Mark messages as read when thread selected
  useEffect(() => {
    if (selectedThread && messages.length > 0) {
      markAsRead()
    }
  }, [selectedThread, messages.length])

  // Clear reply/edit when thread changes
  useEffect(() => {
    setReplyTo(null)
    setEditingMessage(null)
  }, [selectedThread?.id])

  // Typing wrapper
  const setTyping = useCallback((isTyping: boolean) => {
    setTypingRaw(isTyping, userName)
  }, [setTypingRaw, userName])

  // Select thread handler
  const selectThread = useCallback((thread: ThreadWithDetails | null) => {
    setSelectedThread(thread)
    setReplyTo(null)
    setEditingMessage(null)
  }, [])

  // Theme calculation
  const effectiveTheme = (() => {
    if (!settings?.theme || settings.theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }
    return settings.theme
  })()

  const value: ChatContextValue = {
    // User
    userId,
    userName,
    userAvatar,
    userType,
    
    // Threads
    threads,
    threadsLoading,
    selectedThread,
    selectThread,
    createDirectThread,
    createGroupThread,
    muteThread,
    leaveGroup,
    refreshThreads,
    
    // Messages
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
    
    // Reply & Edit
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    
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
    uploadFile,
    
    // UI State
    showNewChat,
    setShowNewChat,
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

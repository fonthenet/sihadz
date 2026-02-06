'use client'

// ============================================
// CHAT WIDGET - COMPREHENSIVE CHAT HOOKS
// ============================================

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { generateTempId, playNotificationSound } from '@/lib/chat/chat-utils'
import type {
  Profile,
  ThreadWithDetails,
  Message,
  PendingMessage,
  MessageReaction,
  ChatUserSettings,
  ChatSystemPolicy,
  ChatNotification,
  TypingEvent,
  SearchResult,
  UploadProgress,
} from '@/types/chat'

// Create supabase client helper
const useSupabase = () => useMemo(() => createBrowserClient(), [])

// For non-hook contexts (inside callbacks)
const getSupabase = () => createBrowserClient()

// Alias for direct use in hooks
const supabase = {
  from: (table: string) => getSupabase().from(table),
  channel: (name: string) => getSupabase().channel(name),
  removeChannel: (channel: any) => getSupabase().removeChannel(channel),
  rpc: (fn: string, params: any) => getSupabase().rpc(fn, params),
  storage: getSupabase().storage,
}

// Constants
const LIMITS = {
  MESSAGES_PER_PAGE: 50,
  SEARCH_RESULTS_LIMIT: 50,
  MIN_SEARCH_QUERY: 2,
}

const TIMING = {
  TYPING_TIMEOUT: 3000,
  PRESENCE_HEARTBEAT: 30000,
  IDLE_TIMEOUT: 300000,
}

// ============================================
// PROFILES HOOK
// ============================================

export function useProfiles(currentUserId: string | null) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (currentUserId) {
      loadProfiles()
      loadBlockedUsers()
    }
  }, [currentUserId])

  const loadProfiles = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    setProfiles(data || [])
    setLoading(false)
  }

  const loadBlockedUsers = async () => {
    if (!currentUserId) return
    const { data } = await supabase
      .from('chat_blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId)
    setBlockedUsers(new Set(data?.map(b => b.blocked_id) || []))
  }

  const searchProfiles = async (query: string) => {
    if (!query.trim()) {
      await loadProfiles()
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${query}%`)
      .order('full_name')
      .limit(20)
    setProfiles(data || [])
    setLoading(false)
  }

  const blockUser = async (userId: string) => {
    if (!currentUserId) return
    await supabase
      .from('chat_blocks')
      .insert({ blocker_id: currentUserId, blocked_id: userId })
    setBlockedUsers(prev => new Set([...prev, userId]))
  }

  const unblockUser = async (userId: string) => {
    if (!currentUserId) return
    await supabase
      .from('chat_blocks')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', userId)
    setBlockedUsers(prev => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }

  const isBlocked = useCallback((userId: string) => blockedUsers.has(userId), [blockedUsers])

  return { 
    profiles, 
    loading, 
    blockedUsers,
    searchProfiles, 
    blockUser,
    unblockUser,
    isBlocked,
    refresh: loadProfiles 
  }
}

// ============================================
// THREADS HOOK
// ============================================

export function useThreads(userId: string | null) {
  const [threads, setThreads] = useState<ThreadWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const loadThreads = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data: memberThreads } = await supabase
      .from('chat_thread_members')
      .select('thread_id')
      .eq('user_id', userId)

    if (!memberThreads?.length) {
      setThreads([])
      setLoading(false)
      return
    }

    const threadIds = memberThreads.map(m => m.thread_id)

    const { data: threadsData } = await supabase
      .from('chat_threads')
      .select('*')
      .in('id', threadIds)
      .order('updated_at', { ascending: false })

    if (!threadsData?.length) {
      setThreads([])
      setLoading(false)
      return
    }

    const threadsWithDetails: ThreadWithDetails[] = await Promise.all(
      threadsData.map(async (thread) => {
        const { data: members } = await supabase
          .from('chat_thread_members')
          .select('*, profile:profiles(*)')
          .eq('thread_id', thread.id)

        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles(*)')
          .eq('thread_id', thread.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const userMembership = members?.find(m => m.user_id === userId)
        let unreadCount = 0

        if (userMembership) {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .eq('is_deleted', false)
            .gt('created_at', userMembership.joined_at)

          unreadCount = count || 0
        }

        const otherMember = members?.find(m => m.user_id !== userId)

        return {
          ...thread,
          members: members || [],
          last_message: lastMessage,
          unread_count: unreadCount,
          other_user: thread.thread_type === 'direct' ? otherMember?.profile : null,
          my_membership: userMembership,
        }
      })
    )

    threadsWithDetails.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.updated_at
      const bTime = b.last_message?.created_at || b.updated_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    setThreads(threadsWithDetails)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`threads-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        loadThreads()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => {
        loadThreads()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, loadThreads])

  const createDirectThread = async (otherUserId: string) => {
    if (!userId) return null

    const { data } = await supabase.rpc('find_or_create_direct_thread', {
      user1_id: userId,
      user2_id: otherUserId
    })

    if (data) {
      await loadThreads()
      return threads.find(t => t.id === data) || null
    }
    return null
  }

  const createGroupThread = async (title: string, memberIds: string[]) => {
    if (!userId) return null

    const { data: thread, error } = await supabase
      .from('chat_threads')
      .insert({ thread_type: 'group', title, created_by: userId })
      .select()
      .single()

    if (error || !thread) return null

    const allMembers = [...new Set([userId, ...memberIds])]
    await supabase.from('chat_thread_members').insert(
      allMembers.map((id, idx) => ({ 
        thread_id: thread.id, 
        user_id: id,
        role: id === userId ? 'owner' : 'member'
      }))
    )

    await loadThreads()
    return threads.find(t => t.id === thread.id) || null
  }

  const muteThread = async (threadId: string, until: Date | null) => {
    if (!userId) return
    await supabase
      .from('chat_thread_members')
      .update({ 
        is_muted: until !== null,
        muted_until: until?.toISOString() 
      })
      .eq('thread_id', threadId)
      .eq('user_id', userId)
    await loadThreads()
  }

  const leaveGroup = async (threadId: string) => {
    if (!userId) return
    await supabase
      .from('chat_thread_members')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', userId)
    await loadThreads()
  }

  return { 
    threads, 
    loading, 
    refresh: loadThreads, 
    createDirectThread, 
    createGroupThread,
    muteThread,
    leaveGroup,
  }
}

// ============================================
// MESSAGES HOOK
// ============================================

export function useMessages(
  threadId: string | null, 
  userId: string | null,
  settings?: ChatUserSettings | null
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)

  const loadMessages = useCallback(async (reset = false) => {
    if (!threadId) return
    setLoading(true)

    if (reset) {
      cursorRef.current = null
      setHasMore(true)
    }

    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles(*),
        attachments:chat_attachments(*)
      `)
      .filter('thread_id', 'eq', threadId)
      .order('created_at', { ascending: false })
      .limit(LIMITS.MESSAGES_PER_PAGE)

    if (cursorRef.current && !reset) {
      query = query.lt('created_at', cursorRef.current)
    }

    const { data } = await query

    if (data) {
      const reversed = [...data].reverse()
      
      if (reset) {
        setMessages(reversed)
      } else {
        setMessages(prev => [...reversed, ...prev])
      }
      
      if (data.length > 0) {
        cursorRef.current = data[data.length - 1].created_at
      }
      setHasMore(data.length === LIMITS.MESSAGES_PER_PAGE)
    }

    setLoading(false)
  }, [threadId])

  useEffect(() => {
    if (threadId) {
      loadMessages(true)
    } else {
      setMessages([])
      setPendingMessages([])
    }
  }, [threadId, loadMessages])

  useEffect(() => {
    if (!threadId) return

    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select('*, sender:profiles(*), attachments:chat_attachments(*)')
            .eq('id', payload.new.id)
            .single()

          if (data && data.sender_id !== userId) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data]
            })
            
            if (settings?.sound_enabled) {
              playNotificationSound()
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages(prev => 
            prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, userId, settings?.sound_enabled])

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!threadId || !userId || !content.trim()) return { success: false }

    const tempId = generateTempId()
    const now = new Date().toISOString()

    const optimisticMessage: PendingMessage = {
      tempId,
      retryCount: 0,
      thread_id: threadId,
      sender_id: userId,
      content: content.trim(),
      message_type: 'text',
      reply_to_message_id: replyToId || null,
      forwarded_from_id: null,
      is_deleted: false,
      deleted_at: null,
      deleted_for: null,
      edited_at: null,
      status: 'sending',
      metadata: {},
      created_at: now,
    }

    setPendingMessages(prev => [...prev, optimisticMessage])

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: userId,
          content: content.trim(),
          message_type: 'text',
          reply_to_message_id: replyToId || null,
        })
        .select('*, sender:profiles(*), attachments:chat_attachments(*)')
        .single()

      if (error) throw error

      setPendingMessages(prev => prev.filter(m => m.tempId !== tempId))
      setMessages(prev => [...prev, data])

      return { success: true, messageId: data.id }
    } catch (error) {
      setPendingMessages(prev =>
        prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m)
      )
      return { success: false }
    }
  }

  const retryMessage = async (tempId: string) => {
    const message = pendingMessages.find(m => m.tempId === tempId)
    if (!message) return

    setPendingMessages(prev =>
      prev.map(m => m.tempId === tempId ? { ...m, status: 'sending' } : m)
    )

    await sendMessage(message.content || '', message.reply_to_message_id || undefined)
    setPendingMessages(prev => prev.filter(m => m.tempId !== tempId))
  }

  const cancelMessage = (tempId: string) => {
    setPendingMessages(prev => prev.filter(m => m.tempId !== tempId))
  }

  const editMessage = async (messageId: string, newContent: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId)

    if (!error) {
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m)
      )
    }
    return !error
  }

  const deleteMessage = async (messageId: string, forEveryone: boolean = true) => {
    if (forEveryone) {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), content: null })
        .eq('id', messageId)

      if (!error) {
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: null } : m)
        )
      }
      return !error
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId))
      return true
    }
  }

  const addReaction = async (messageId: string, emoji: string) => {
    if (!userId) return

    await supabase
      .from('chat_message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji })
  }

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!userId) return

    await supabase
      .from('chat_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
  }

  const markAsRead = async () => {
    if (!threadId || !userId || messages.length === 0) return

    const lastMsg = messages[messages.length - 1]
    await supabase
      .from('chat_thread_members')
      .update({ last_read_message_id: lastMsg.id })
      .eq('thread_id', threadId)
      .eq('user_id', userId)
  }

  return {
    messages,
    pendingMessages,
    loading,
    hasMore,
    loadMore: () => loadMessages(false),
    sendMessage,
    retryMessage,
    cancelMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    refresh: () => loadMessages(true)
  }
}

// ============================================
// TYPING INDICATOR HOOK
// ============================================

export function useTypingIndicator(threadId: string | null, userId: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    if (!threadId || !userId) return

    const channel = supabase.channel(`typing-${threadId}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === userId) return

        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== payload.user_id)
          if (payload.is_typing) {
            return [...filtered, payload as TypingEvent]
          }
          return filtered
        })

        const existing = timeoutsRef.current.get(payload.user_id)
        if (existing) clearTimeout(existing)

        if (payload.is_typing) {
          const timeout = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== payload.user_id))
          }, TIMING.TYPING_TIMEOUT)
          timeoutsRef.current.set(payload.user_id, timeout)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      timeoutsRef.current.forEach(t => clearTimeout(t))
      timeoutsRef.current.clear()
    }
  }, [threadId, userId])

  const setTyping = useCallback((isTyping: boolean, userName: string) => {
    if (!channelRef.current || !userId || !threadId) return
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId, user_name: userName, thread_id: threadId, is_typing: isTyping }
    })
  }, [userId, threadId])

  return { typingUsers, setTyping }
}

// ============================================
// PRESENCE HOOK
// ============================================

export function usePresence(userId: string | null) {
  const heartbeatRef = useRef<NodeJS.Timeout>()
  const idleTimeoutRef = useRef<NodeJS.Timeout>()

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline') => {
    if (!userId) return

    await supabase
      .from('profiles')
      .update({ 
        is_online: status === 'online',
        presence_status: status,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', userId)
  }, [userId])

  useEffect(() => {
    if (!userId) return

    updatePresence('online')

    heartbeatRef.current = setInterval(() => {
      updatePresence('online')
    }, TIMING.PRESENCE_HEARTBEAT)

    const handleActivity = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = setTimeout(() => updatePresence('away'), TIMING.IDLE_TIMEOUT)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    const handleVisibility = () => {
      updatePresence(document.visibilityState === 'visible' ? 'online' : 'away')
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      events.forEach(e => window.removeEventListener(e, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      updatePresence('offline')
    }
  }, [userId, updatePresence])

  return { updatePresence }
}

// ============================================
// SETTINGS HOOK
// ============================================

export function useSettings(userId: string | null) {
  const [settings, setSettings] = useState<ChatUserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadSettings()
  }, [userId])

  const loadSettings = async () => {
    if (!userId) return
    
    const { data } = await supabase
      .from('chat_user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (data) {
      setSettings(data)
    } else {
      const defaults: ChatUserSettings = {
        user_id: userId,
        notifications_enabled: true,
        sound_enabled: true,
        desktop_notifications: false,
        theme: 'system',
        font_size: 'medium',
        enter_to_send: true,
        show_typing_indicators: true,
        show_read_receipts: true,
        show_online_status: true,
        compact_mode: false,
        message_preview_lines: 2,
        updated_at: new Date().toISOString()
      }
      await supabase.from('chat_user_settings').insert(defaults)
      setSettings(defaults)
    }
    setLoading(false)
  }

  const updateSettings = async (updates: Partial<ChatUserSettings>) => {
    if (!userId || !settings) return

    const updated = { ...settings, ...updates }
    setSettings(updated)

    await supabase
      .from('chat_user_settings')
      .update(updates)
      .eq('user_id', userId)
  }

  return { settings, loading, updateSettings, refresh: loadSettings }
}

// ============================================
// FILE UPLOAD HOOK
// ============================================

export function useFileUpload(threadId: string | null, userId: string | null) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())

  const uploadFile = async (file: File, messageId: string) => {
    if (!threadId || !userId) return { error: 'Not authenticated' }

    const fileId = generateTempId()
    
    setUploads(prev => new Map(prev).set(fileId, {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'uploading'
    }))

    try {
      const filePath = `chat/${threadId}/${messageId}/${Date.now()}-${file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      await supabase
        .from('chat_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath
        })

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath)

      setUploads(prev => {
        const updated = new Map(prev)
        updated.set(fileId, { ...updated.get(fileId)!, progress: 100, status: 'complete', url: publicUrl })
        return updated
      })

      return { url: publicUrl }
    } catch (error) {
      setUploads(prev => {
        const updated = new Map(prev)
        updated.set(fileId, { ...updated.get(fileId)!, status: 'error', error: (error as Error).message })
        return updated
      })
      return { error: (error as Error).message }
    }
  }

  return { uploads: Array.from(uploads.values()), uploadFile }
}

// ============================================
// MESSAGE SEARCH HOOK
// ============================================

export function useMessageSearch(userId: string | null) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = async (query: string, threadId?: string) => {
    if (!userId || query.length < LIMITS.MIN_SEARCH_QUERY) {
      setResults([])
      return
    }

    setLoading(true)

    const { data } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles(full_name, avatar_url)')
      .ilike('content', `%${query}%`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(LIMITS.SEARCH_RESULTS_LIMIT)

    setResults(data?.map(m => ({
      id: m.id,
      thread_id: m.thread_id,
      content: m.content,
      sender_id: m.sender_id,
      sender_name: m.sender?.full_name || 'Unknown',
      created_at: m.created_at,
      rank: 1
    })) || [])
    
    setLoading(false)
  }

  const clear = () => setResults([])

  return { results, loading, search, clear }
}

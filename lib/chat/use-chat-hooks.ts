'use client'

// ============================================
// CHAT WIDGET - COMPREHENSIVE CHAT HOOKS
// ============================================

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { generateTempId, playNotificationSound, showBrowserNotification } from '@/lib/chat/chat-utils'
import { getErrorMessage, isSchemaRelError, hydrateProfilesByUserId, hydrateSendersById, ensureOtherUserBusinessName } from '@/lib/chat/chat-error-and-hydrate'
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

const normalizeThreadType = (thread: any): 'direct' | 'group' => {
  const t = thread?.thread_type ?? thread?.type ?? 'direct'
  return t === 'group' ? 'group' : 'direct'
}

/** Resolve attachment URLs. Audio uses proxy API for playback; others use signed URLs. */
async function withAttachmentUrlsAsync(messages: any[]) {
  const sb = getSupabase()
  const BUCKET = 'chat-attachments'
  const EXPIRES_IN = 3600 // 1 hour

  const resolveUrl = async (a: any): Promise<string> => {
    if (a?.url) return a.url
    const path = a?.storage_path
    if (!path || typeof path !== 'string') return ''
    if (path.startsWith('http')) return path
    // Audio: use proxy API for reliable playback (avoids CORS with signed URLs)
    if ((a?.file_type || '').startsWith('audio/')) {
      return `/api/chat/attachment?path=${encodeURIComponent(path)}`
    }
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN)
    if (error) return ''
    return data?.signedUrl || ''
  }

  const resolved = await Promise.all(
    (messages || []).map(async (m) => {
      const atts = (m.attachments || m.chat_attachments || []) as any[]
      const next = await Promise.all(
        atts.map(async (a) => ({ ...a, url: await resolveUrl(a) }))
      )
      return { ...m, attachments: next }
    })
  )
  return resolved
}

/** Fetch attachments for messages that don't have them (fallback when relation fails or returns empty). */
async function fetchAttachmentsForMessages(sb: ReturnType<typeof getSupabase>, messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, any[]>()
  const { data } = await sb
    .from('chat_attachments')
    .select('*')
    .in('message_id', messageIds)
  const byMessage = new Map<string, any[]>()
  for (const a of data || []) {
    const mid = (a as any).message_id
    if (!byMessage.has(mid)) byMessage.set(mid, [])
    byMessage.get(mid)!.push(a)
  }
  return byMessage
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
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      setProfiles(data || [])
    } catch (err) {
      console.error('[useProfiles] Error loading profiles:', err)
      setProfiles([])
    } finally {
      setLoading(false)
    }
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
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .order('full_name')
        .limit(20)
      setProfiles(data || [])
    } catch (err) {
      console.error('[useProfiles] Error searching profiles:', err)
      setProfiles([])
    } finally {
      setLoading(false)
    }
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
  // Track if we've successfully completed a load (even with empty results)
  // This prevents infinite retry loops for new accounts with no conversations
  const loadedSuccessfullyRef = useRef(false)
  const threadsRef = useRef<ThreadWithDetails[]>([])
  threadsRef.current = threads

  useEffect(() => {
    if (!userId) {
      setThreads([])
      setLoading(false)
      loadedSuccessfullyRef.current = false
    }
  }, [userId])

  const loadThreads = useCallback(async (silent = false) => {
    if (!userId) return
    if (!silent) setLoading(true)
    try {
    // Wait for auth session to be ready (fixes race on initial load)
    const sb = getSupabase()
    const { data: sessionData } = await sb.auth.getSession()
    if (!sessionData?.session) {
      console.warn('[useThreads] No auth session yet, will retry')
      if (!silent) setLoading(false)
      return
    }

    // Query memberships - try with left_at filter first, fall back without it
    let memberThreads: { thread_id: string }[] = []
    try {
      const { data, error } = await supabase
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', userId)
        .is('left_at', null)
      if (error) throw error
      memberThreads = data || []
    } catch (e: any) {
      // If left_at column doesn't exist, query without it
      if (e?.message?.includes?.('left_at')) {
        const { data } = await supabase
          .from('chat_thread_members')
          .select('thread_id')
          .eq('user_id', userId)
        memberThreads = data || []
      } else {
        throw e
      }
    }

    if (!memberThreads?.length) {
      setThreads([])
      loadedSuccessfullyRef.current = true // New account: no conversations is valid, stop retries
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
      loadedSuccessfullyRef.current = true // Empty threads is valid, stop retries
      return
    }

    // Batch 1: All members - always hydrate (profile join can be unreliable)
    let allMembers: any[] = []
    try {
      const { data, error } = await supabase
        .from('chat_thread_members')
        .select('*')
        .in('thread_id', threadIds)
        .is('left_at', null)
      if (error) throw error
      const raw = (data as any[]) || []
      allMembers = await hydrateProfilesByUserId(getSupabase(), raw)
    } catch (e2: any) {
      if (e2?.message?.includes?.('left_at')) {
        const { data } = await supabase.from('chat_thread_members').select('*').in('thread_id', threadIds)
        const raw = (data as any[]) || []
        allMembers = await hydrateProfilesByUserId(getSupabase(), raw)
      } else {
        throw e2
      }
    }
    const membersByThread = new Map<string, any[]>()
    for (const m of allMembers) {
      const tid = (m as any).thread_id
      if (!membersByThread.has(tid)) membersByThread.set(tid, [])
      membersByThread.get(tid)!.push(m)
    }

    // Batch 2: Last message per thread (simple select to avoid 400 from relation parsing)
    let recentMsgs: any[] = []
    try {
      const res = await supabase
        .from('chat_messages')
        .select('*')
        .in('thread_id', threadIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(Math.min(threadIds.length * 3, 150))
      const rows = (res.data as any[]) || []
      recentMsgs = await hydrateSendersById(getSupabase(), rows as any) as any[]
    } catch {
      // fallback: try without hydrate
      try {
        const { data: fb } = await supabase.from('chat_messages').select('*').in('thread_id', threadIds).eq('is_deleted', false).order('created_at', { ascending: false }).limit(threadIds.length * 2)
        recentMsgs = (fb as any[]) || []
      } catch {
        recentMsgs = []
      }
    }
    const lastMsgByThread = new Map<string, any>()
    for (const msg of recentMsgs) {
      const tid = (msg as any).thread_id
      if (!lastMsgByThread.has(tid)) lastMsgByThread.set(tid, msg)
    }

    // Batch 3: last_read_message created_at for unread cutoff
    const lastReadIds = [...new Set(allMembers.map((m: any) => m.last_read_message_id).filter(Boolean))]
    const readCutoffByMsgId = new Map<string, string>()
    if (lastReadIds.length > 0) {
      const { data: rm } = await supabase.from('chat_messages').select('id, created_at').in('id', lastReadIds)
      for (const r of rm || []) readCutoffByMsgId.set((r as any).id, (r as any).created_at)
    }

    // Batch 4: Professionals and profiles for members still missing names (hydrate covers most cases)
    const needProfIds = [...new Set(allMembers.filter((m: any) => !(m.profile as any)?.full_name?.trim()).map((m: any) => m.user_id))]
    const profByUserId = new Map<string, any>()
    const profileByUserId = new Map<string, any>()
    if (needProfIds.length > 0) {
      const [profsRes, profilesRes] = await Promise.all([
        supabase.from('professionals').select('auth_user_id, business_name, type').in('auth_user_id', needProfIds),
        supabase.from('profiles').select('id, full_name, email, avatar_url, user_type, is_online, presence_status, last_seen_at').in('id', needProfIds),
      ])
      for (const p of profsRes.data || []) profByUserId.set((p as any).auth_user_id, p)
      for (const p of profilesRes.data || []) profileByUserId.set((p as any).id, p)
    }

    // Batch 5: Unread counts (exclude messages user has "deleted for me")
    let deletedForMeIds = new Set<string>()
    if (userId) {
      try {
        const { data: deletes } = await supabase.from('chat_message_deletes').select('message_id').eq('user_id', userId)
        if (deletes?.length) deletedForMeIds = new Set(deletes.map((d: any) => d.message_id))
      } catch (_) {
        // Table might not exist in older DBs
      }
    }
    const unreadResults = await Promise.all(threadsData.map(async (thread) => {
      const members = membersByThread.get(thread.id) || []
      const userMembership = members.find((m: any) => m.user_id === userId)
      if (!userMembership) return { id: thread.id, count: 0 }
      let cutoff = (userMembership as any)?.last_read_message_id ? readCutoffByMsgId.get((userMembership as any).last_read_message_id) : null
      if (!cutoff) cutoff = (userMembership as any)?.joined_at || null
      const { data: unreadRows } = await supabase.from('chat_messages').select('id')
        .eq('thread_id', thread.id).eq('is_deleted', false).neq('sender_id', userId)
        .gt('created_at', cutoff || new Date(0).toISOString())
      const count = (unreadRows || []).filter((m: any) => !deletedForMeIds.has(m.id)).length
      return { id: thread.id, count }
    }))
    const unreadByThread = new Map(unreadResults.map(r => [r.id, r.count]))

    const threadsWithDetails: ThreadWithDetails[] = threadsData.map((thread) => {
      const members = membersByThread.get(thread.id) || []
      const lastMessage = lastMsgByThread.get(thread.id) || null
      const userMembership = members.find((m: any) => m.user_id === userId)
      const unreadCount = unreadByThread.get(thread.id) || 0
      const otherMember = members.find((m: any) => m.user_id !== userId)
      const thread_type = normalizeThreadType(thread)
      let other_user: any = thread_type === 'direct' ? (otherMember?.profile ?? null) : null

      if (thread_type === 'direct' && otherMember) {
        const name = (other_user?.full_name || '').trim()
        const profile = (otherMember.profile as any) ?? profileByUserId.get(otherMember.user_id)
        const preservePresence = { is_online: profile?.is_online ?? other_user?.is_online ?? false, presence_status: profile?.presence_status ?? other_user?.presence_status ?? 'offline', last_seen_at: profile?.last_seen_at ?? other_user?.last_seen_at }
        if (!name) {
          const prof = profByUserId.get(otherMember.user_id)
          if (prof) {
            other_user = { id: (prof as any).auth_user_id, full_name: (prof as any).business_name || 'Contact', avatar_url: profile?.avatar_url ?? null, user_type: (prof as any).type || 'doctor', ...preservePresence }
          } else {
            const pName = (profile?.full_name || '').trim()
            const pEmail = (profile?.email || '').trim()
            const displayName = pName || (pEmail ? pEmail.split('@')[0] : null) || 'Contact'
            other_user = profile
              ? { ...profile, full_name: displayName, ...preservePresence }
              : { id: otherMember.user_id, full_name: 'Contact', avatar_url: null, user_type: 'patient', ...preservePresence }
          }
        }
      }
      if (thread_type === 'direct' && (!other_user || !(other_user?.full_name || '').trim()) && otherMember) {
        const prof = profByUserId.get(otherMember.user_id)
        const profile = (otherMember.profile as any) ?? profileByUserId.get(otherMember.user_id)
        const name = (other_user?.full_name || (prof as any)?.business_name || profile?.full_name || '').trim()
        const emailPart = (profile?.email || '').trim() ? (profile?.email || '').trim().split('@')[0] : null
        const displayName = name || emailPart || 'Contact'
        const preservePresence = { is_online: profile?.is_online ?? other_user?.is_online ?? false, presence_status: profile?.presence_status ?? other_user?.presence_status ?? 'offline', last_seen_at: profile?.last_seen_at ?? other_user?.last_seen_at }
        other_user = { id: otherMember.user_id, full_name: displayName, avatar_url: other_user?.avatar_url ?? profile?.avatar_url ?? null, user_type: other_user?.user_type ?? (prof as any)?.type ?? profile?.user_type ?? 'patient', ...preservePresence }
      }

      return {
        ...thread,
        thread_type,
        members,
        last_message: lastMessage,
        unread_count: unreadCount,
        other_user,
        my_membership: userMembership,
      }
    })

    threadsWithDetails.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.updated_at
      const bTime = b.last_message?.created_at || b.updated_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    setThreads(threadsWithDetails)
    // Mark as successfully loaded (even if empty - this is valid for new accounts)
    loadedSuccessfullyRef.current = true
    } catch (err: any) {
      console.error('[useThreads] Error loading threads:', err?.message || err?.code || JSON.stringify(err) || 'Unknown error')
      setThreads([])
      // Don't mark as loaded on error - allow retries
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  const threadsRetryRef = useRef(0)
  useEffect(() => {
    threadsRetryRef.current = 0
    loadThreads()
  }, [loadThreads])

  // Retry loading threads if empty after initial load (auth session race)
  // Only retry if load failed (not if result is legitimately empty for new accounts)
  useEffect(() => {
    if (!userId || loading || threads.length > 0) {
      threadsRetryRef.current = 0
      return
    }
    // If we've successfully loaded (even with empty results), don't retry
    if (loadedSuccessfullyRef.current) return
    if (threadsRetryRef.current >= 2) return
    const t = setTimeout(() => {
      threadsRetryRef.current++
      loadThreads()
    }, 800)
    return () => clearTimeout(t)
  }, [userId, loading, threads.length, loadThreads])

  // Retry loading threads when auth session becomes available (run once per userId, avoid recreating subscription when threads change)
  const threadsLengthRef = useRef(0)
  threadsLengthRef.current = threads.length
  useEffect(() => {
    if (!userId) return
    const sb = getSupabase()
    let retryCount = 0
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        // Only retry if we haven't successfully loaded yet (prevents loops for empty accounts)
        if (threadsLengthRef.current === 0 && !loadedSuccessfullyRef.current && retryCount < 3) {
          retryCount++
          loadThreads()
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [userId, loadThreads])

  useEffect(() => {
    if (!userId) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        loadThreads(true) // Silent - no loading spinner
      }, 1200) // Longer debounce to batch rapid changes (messages, typing, etc.)
    }

    // Use a stable supabase client for subscriptions
    const sb = getSupabase()
    const onProfileChange = (payload: { new?: { id?: string }; old?: { id?: string } }) => {
      const id = payload?.new?.id ?? payload?.old?.id
      if (!id || id === userId) return
      const otherIds = new Set(threadsRef.current.map((t) => t.thread_type === 'direct' && t.other_user?.id).filter(Boolean) as string[])
      if (otherIds.has(id)) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          debounceTimer = null
          loadThreads(true)
        }, 300) // Fast refresh for presence (300ms)
      }
    }
    const channel = sb
      .channel(`threads-realtime-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, debouncedLoad)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, debouncedLoad)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_deletes' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_thread_members' }, debouncedLoad)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, onProfileChange)
      .subscribe()

    // Fallback: periodic refresh every 30 seconds (matches presence heartbeat, picks up status changes if realtime fails)
    const pollInterval = setInterval(() => {
      loadThreads(true) // Silent - no loading spinner
    }, 30000)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(pollInterval)
      sb.removeChannel(channel)
    }
  }, [userId, loadThreads])

  const fetchThreadById = useCallback(async (threadId: string): Promise<ThreadWithDetails | null> => {
    const { data: thread } = await supabase.from('chat_threads').select('*').eq('id', threadId).maybeSingle()
    if (!thread) return null
    let members: any[] = []
    try {
      const { data, error } = await supabase
        .from('chat_thread_members')
        .select('*')
        .eq('thread_id', threadId)
        .is('left_at', null)
      if (error) throw error
      const raw = (data as any[]) || []
      members = await hydrateProfilesByUserId(getSupabase(), raw)
    } catch {
      const { data } = await supabase.from('chat_thread_members').select('*').eq('thread_id', threadId)
      const raw = (data as any[]) || []
      members = await hydrateProfilesByUserId(getSupabase(), raw)
    }
    const otherMember = members.find((m: any) => m.user_id !== userId)
    let other_user: any = otherMember?.profile ?? null
    if (otherMember && !(other_user?.full_name || '').trim()) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('auth_user_id, business_name, type')
        .eq('auth_user_id', otherMember.user_id)
        .maybeSingle()
      if (prof) {
        other_user = { id: (prof as any).auth_user_id, full_name: (prof as any).business_name || 'Contact', avatar_url: null, user_type: (prof as any).type || 'doctor' }
      } else {
        // Patient: fetch profile for display name (hydrate may have missed it)
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, user_type')
          .eq('id', otherMember.user_id)
          .maybeSingle()
        const pName = (profileRow as any)?.full_name?.trim()
        const pEmail = (profileRow as any)?.email?.trim()
        const displayName = pName || (pEmail ? pEmail.split('@')[0] : null) || 'Contact'
        other_user = {
          id: otherMember.user_id,
          full_name: displayName,
          avatar_url: (profileRow as any)?.avatar_url ?? null,
          user_type: (profileRow as any)?.user_type ?? 'patient',
        }
      }
    }
    const thread_type = (thread as any).thread_type ?? (thread as any).type ?? 'direct'
    return {
      ...thread,
      thread_type,
      members,
      last_message: null,
      unread_count: 0,
      other_user,
      my_membership: members.find((m: any) => m.user_id === userId),
    } as ThreadWithDetails
  }, [userId])

  const createDirectThread = async (otherUserId: string) => {
    if (!userId || otherUserId === userId) return null

    const { data: rpcId, error: rpcErr } = await supabase.rpc('find_or_create_direct_thread', {
      user1_id: userId,
      user2_id: otherUserId
    })

    if (rpcId && !rpcErr) {
      const thread = await fetchThreadById(rpcId)
      if (thread) {
        void loadThreads(true) // Refresh list in background - don't block UI
        return thread
      }
    }

    const errMsg = getErrorMessage(rpcErr, '')
    const useFallback = !rpcId || errMsg.includes('function') || errMsg.includes('does not exist') || errMsg.includes('schema cache')
    if (!useFallback) return null

    try {
      let memberThreads: { thread_id: string }[] = []
      try {
        const { data, error } = await supabase
          .from('chat_thread_members')
          .select('thread_id')
          .eq('user_id', userId)
          .is('left_at', null)
        if (!error) memberThreads = data || []
      } catch {
        const { data } = await supabase
          .from('chat_thread_members')
          .select('thread_id')
          .eq('user_id', userId)
        memberThreads = data || []
      }

      for (const m of memberThreads) {
        let t: any = null
        try {
          const { data: t1 } = await supabase.from('chat_threads').select('*').eq('id', m.thread_id).eq('thread_type', 'direct').maybeSingle()
          t = t1
        } catch (_) {}
        if (!t) {
          const { data: t2 } = await supabase.from('chat_threads').select('*').eq('id', m.thread_id).eq('type', 'direct').maybeSingle()
          t = t2
        }
        if (!t) continue
        let mem: { user_id: string }[] = []
        try {
          const { data, error } = await supabase
            .from('chat_thread_members')
            .select('user_id')
            .eq('thread_id', t.id)
            .is('left_at', null)
          if (!error) mem = data || []
        } catch {
          const { data } = await supabase.from('chat_thread_members').select('user_id').eq('thread_id', t.id)
          mem = data || []
        }
        const ids = [...new Set(mem.map((x) => x.user_id))]
        if (ids.includes(otherUserId) && ids.length === 2) {
          const { data: tm } = await supabase
            .from('chat_thread_members')
            .select('*, profile:profiles(*)')
            .eq('thread_id', t.id)
          const other = (tm || []).find((x: { user_id: string }) => x.user_id !== userId)
          const base = { ...t, thread_type: (t as any).thread_type ?? (t as any).type ?? 'direct' }
          const otherUser = other ? await ensureOtherUserBusinessName(getSupabase(), other.user_id, other.profile as Record<string, unknown>) : null
          void loadThreads(true) // Refresh list in background - don't block UI
          return {
            ...base,
            members: tm || [],
            last_message: null,
            unread_count: 0,
            other_user: otherUser,
            my_membership: (tm || []).find((x: { user_id: string }) => x.user_id === userId)
          } as ThreadWithDetails
        }
      }

      let newThread: any
      const ins1 = await supabase
        .from('chat_threads')
        .insert({ thread_type: 'direct', type: 'direct', created_by: userId } as any)
        .select()
        .single()
      if (!ins1.error) {
        newThread = ins1.data
      } else {
        const m = getErrorMessage(ins1.error, '')
        if (m.includes('thread_type') || m.includes('column') || m.includes('schema cache')) {
          const ins2 = await supabase
            .from('chat_threads')
            .insert({ type: 'direct', created_by: userId } as any)
            .select()
            .single()
          if (ins2.error) return null
          newThread = ins2.data
        } else {
          return null
        }
      }

      const { error: memErr } = await supabase.from('chat_thread_members').insert([
        { thread_id: newThread.id, user_id: userId, role: 'admin' },
        { thread_id: newThread.id, user_id: otherUserId, role: 'member' }
      ])
      if (memErr) return null

      const { data: otherProfile } = await supabase.from('profiles').select('*').eq('id', otherUserId).single()
      const otherUser = await ensureOtherUserBusinessName(getSupabase(), otherUserId, otherProfile as Record<string, unknown>)
      const base = { ...newThread, thread_type: (newThread as any).thread_type ?? (newThread as any).type ?? 'direct' }
      void loadThreads(true) // Refresh list in background - don't block UI
      return {
        ...base,
        members: [],
        last_message: null,
        unread_count: 0,
        other_user: otherUser,
        my_membership: undefined
      } as ThreadWithDetails
    } catch {
      return null
    }
  }

  const createGroupThread = async (title: string, memberIds: string[]) => {
    if (!userId) return null

    try {
    // --- DUPLICATE_GROUP_CHECK: Reuse existing group with same name (remove this block to allow duplicates) ---
    const trimmedTitle = (title || '').trim()
    if (trimmedTitle) {
      const { data: myGroups } = await supabase
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', userId)
        .is('left_at', null)
      const myThreadIds = (myGroups || []).map((g: { thread_id: string }) => g.thread_id)
      if (myThreadIds.length > 0) {
        const { data: existing } = await supabase
          .from('chat_threads')
          .select('id, thread_type, type, title, created_by, updated_at')
          .eq('thread_type', 'group')
          .ilike('title', trimmedTitle)
          .in('id', myThreadIds)
          .limit(1)
          .maybeSingle()
        if (existing) {
          const full = await fetchThreadById(existing.id)
          if (full) {
            await loadThreads(true)
            return { ...full, thread_type: 'group', title: full.title || trimmedTitle } as ThreadWithDetails
          }
        }
      }
    }
    // --- END DUPLICATE_GROUP_CHECK ---

    // Insert thread - set both thread_type and type (schema has type as NOT NULL)
    const res = await supabase
      .from('chat_threads')
      .insert({ thread_type: 'group', type: 'group', title, created_by: userId } as any)
      .select()
      .single()
    if (res.error) throw res.error
    const thread = res.data

    if (!thread) return null

    const allMembers = [...new Set([userId, ...memberIds])]

    // Insert creator as owner first (RLS requires owner to exist before adding others)
    const { error: ownerErr } = await supabase.from('chat_thread_members').insert({
      thread_id: thread.id,
      user_id: userId,
      role: 'owner'
    })
    if (ownerErr) {
      console.error('[createGroupThread] Failed to add owner:', ownerErr)
      return null
    }

    // Insert other members (RLS allows owner to add members)
    const otherMemberIds = memberIds.filter(id => id !== userId)
    if (otherMemberIds.length > 0) {
      const { error: membersErr } = await supabase.from('chat_thread_members').insert(
        otherMemberIds.map((id) => ({ 
          thread_id: thread.id, 
          user_id: id,
          role: 'member'
        }))
      )
      if (membersErr) {
        console.error('[createGroupThread] Failed to add members:', membersErr)
        return null
      }
    }

    try {
      await loadThreads(true)
    } catch (_) {
      // Ignore loadThreads errors - thread was created successfully
    }

    const thread_type = (thread as any).thread_type ?? (thread as any).type ?? 'group'
    return {
      ...thread,
      thread_type,
      title: title || (thread as any).title,
      members: allMembers.map(id => ({ user_id: id, role: id === userId ? 'owner' : 'member', profile: null })),
      last_message: null,
      unread_count: 0,
      other_user: null,
      my_membership: undefined,
    } as ThreadWithDetails
    } catch (err) {
      const msg = getErrorMessage(err, 'Unknown error')
      console.error('[createGroupThread] Error:', msg)
      return null
    }
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
    await loadThreads(true)
  }

  const leaveGroup = async (threadId: string) => {
    if (!userId) return
    await supabase
      .from('chat_thread_members')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', userId)
    await loadThreads(true)
  }

  const removeMember = async (threadId: string, memberUserId: string) => {
    if (!userId) return
    await supabase
      .from('chat_thread_members')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', memberUserId)
    await loadThreads(true)
  }

  const updateMemberRole = async (threadId: string, memberUserId: string, role: 'owner' | 'admin' | 'member') => {
    if (!userId) return
    await supabase
      .from('chat_thread_members')
      .update({ role })
      .eq('thread_id', threadId)
      .eq('user_id', memberUserId)
    await loadThreads(true)
  }

  const deleteGroup = async (threadId: string) => {
    if (!userId) return
    const { error } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', threadId)
    if (error) throw error
    await loadThreads(true)
  }

  return { 
    threads, 
    loading, 
    refresh: () => loadThreads(true), // Silent refresh for background updates
    createDirectThread, 
    createGroupThread,
    muteThread,
    leaveGroup,
    removeMember,
    updateMemberRole,
    deleteGroup,
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
  const loadingRef = useRef(false)
  // Track successful loads per thread to prevent infinite retry loops for threads with no messages
  const loadedSuccessfullyRef = useRef<Record<string, boolean>>({})

  const loadMessages = useCallback(async (reset = false) => {
    if (!threadId) return
    // Prevent concurrent reset loads (avoids reload loop when realtime + threads sync fire together)
    if (reset && loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    if (reset) {
      cursorRef.current = null
      setHasMore(true)
    }

    const doLoad = async (): Promise<boolean> => {
      // Wait for auth session to be ready (fixes race on initial load)
      const sb = getSupabase()
      const { data: sessionData } = await sb.auth.getSession()
      if (!sessionData?.session) {
        console.warn('[useMessages] No auth session yet')
        return false
      }

      let data: any[] | null = null
      try {
        // Use simple select (no relations) to avoid 400 from PostgREST relation parsing.
        // Relations (profiles, chat_attachments) are fetched separately and merged.
        let query: any = supabase
          .from('chat_messages')
          .select(`*`)
          .filter('thread_id', 'eq', threadId)
          .order('created_at', { ascending: false })
          .limit(LIMITS.MESSAGES_PER_PAGE)
        if (cursorRef.current && !reset) query = query.lt('created_at', cursorRef.current)
        const res = await query
        if (res.error) throw res.error
        const rows = (res.data as any[]) || []
        data = await hydrateSendersById(getSupabase(), rows as any) as any

        if (data) {
          const ids = data.map((m: any) => m.id).filter(Boolean)
          const attsByMsg = await fetchAttachmentsForMessages(getSupabase(), ids)
          for (const m of data) {
            const existing = (m.attachments || m.chat_attachments || []) as any[]
            const fetched = attsByMsg.get(m.id)
            // Prefer fetched when relation returned empty (e.g. voice messages)
            if (fetched?.length) {
              m.attachments = fetched
            } else if (existing.length) {
              m.attachments = existing
            } else {
              m.attachments = []
            }
            // Don't show attachments for deleted messages (they reappear on refresh otherwise)
            if (m.is_deleted) m.attachments = []
          }
          // Filter out messages user has "deleted for me" (persisted in chat_message_deletes)
          let filtered = data
          if (userId && ids.length > 0) {
            try {
              const { data: deletes } = await getSupabase()
                .from('chat_message_deletes')
                .select('message_id')
                .eq('user_id', userId)
                .in('message_id', ids)
              const deletedIds = new Set((deletes || []).map((d: any) => d.message_id))
              filtered = data.filter((m: any) => !deletedIds.has(m.id))
            } catch (_) {
              // Table might not exist in older DBs
            }
          }
          const reversed = await withAttachmentUrlsAsync([...filtered].reverse())
          
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
        // Mark as successfully loaded for this thread (even if empty - valid for new conversations)
        if (threadId) loadedSuccessfullyRef.current[threadId] = true
        return true
      } catch (err: unknown) {
        console.error('[useMessages] Error loading messages:', err)
        return false
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    }

    const ok = await doLoad()
    if (!ok && reset) {
      // Retry after short delay (helps with session/auth race on first load)
      setTimeout(async () => {
        setLoading(true)
        const ok2 = await doLoad()
        if (!ok2) {
          // Second retry with longer delay
          setTimeout(() => {
            setLoading(true)
            doLoad()
          }, 1200)
        }
      }, 500)
    }
  }, [threadId])

  useEffect(() => {
    if (threadId) {
      loadMessages(true)
    } else {
      setMessages([])
      setPendingMessages([])
      setLoading(false)
    }
  }, [threadId, loadMessages])

  // Listen for auth state changes and reload messages when session becomes available
  // Use ref for messages.length to avoid recreating subscription on every new message (prevents reload loop)
  const messagesLengthRef = useRef(0)
  messagesLengthRef.current = messages.length
  useEffect(() => {
    if (!threadId) return
    const sb = getSupabase()
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Only reload if we haven't successfully loaded this thread yet
        if (messagesLengthRef.current === 0 && !loadedSuccessfullyRef.current[threadId]) {
          loadMessages(true)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [threadId, loadMessages])

  // Reload when tab becomes visible and messages are empty (fixes failed initial load)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  useEffect(() => {
    if (!threadId) return
    const onVisible = () => {
      // Only reload if we haven't successfully loaded this thread yet
      if (document.visibilityState === 'visible' && messagesRef.current.length === 0 && !loading && !loadedSuccessfullyRef.current[threadId]) {
        loadMessages(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [threadId, loadMessages, loading])

  // Retry load when thread selected but messages empty after initial load (fixes auth/session race)
  // Only retry if load failed (not if result is legitimately empty for threads with no messages)
  const retryCountRef = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!threadId || loading) return
    if (messages.length > 0) {
      retryCountRef.current[threadId] = 0
      return
    }
    // If we've successfully loaded this thread (even with empty results), don't retry
    if (loadedSuccessfullyRef.current[threadId]) return
    const count = retryCountRef.current[threadId] ?? 0
    if (count >= 2) return
    const t = setTimeout(() => {
      retryCountRef.current[threadId] = (retryCountRef.current[threadId] ?? 0) + 1
      loadMessages(true)
    }, 1500)
    return () => clearTimeout(t)
  }, [threadId, loading, messages.length, loadMessages])

  // Use ref for settings so subscription doesn't need to recreate when settings change
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    if (!threadId) return

    // Use a stable supabase client for subscriptions
    const sb = getSupabase()
    const channel = sb
      .channel(`messages-realtime-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          let row: any = null
          try {
            const res = await sb
              .from('chat_messages')
              .select('*')
              .eq('id', payload.new.id)
              .single()
            if (res.error) throw res.error
            const hydrated = await hydrateSendersById(sb, res.data ? [res.data as any] : [])
            row = hydrated[0] ?? null
            if (row?.id) {
              const { data: atts } = await sb.from('chat_attachments').select('*').eq('message_id', row.id)
              row.attachments = atts || []
            }
          } catch (_) {
            row = null
          }

          if (row && row.sender_id !== userId) {
            row = (await withAttachmentUrlsAsync([row]))[0]
            setMessages(prev => {
              if (prev.some(m => m.id === row.id)) return prev
              return [...prev, row]
            })

            const s = settingsRef.current
            if (s?.notifications_enabled !== false && s?.sound_enabled) {
              playNotificationSound()
            }
            if (s?.notifications_enabled !== false && s?.desktop_notifications && document.visibilityState === 'hidden') {
              const senderName = row.sender?.full_name || 'Someone'
              const content = row.content || 'Sent an attachment'
              showBrowserNotification(
                `New message from ${senderName}`,
                content.slice(0, 100),
                { onClick: () => window.focus() }
              )
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const newRow = payload.new as any
          const isDeleted = newRow?.is_deleted === true
          // When message is deleted, clear attachments so they don't reappear on refresh
          if (isDeleted) {
            setMessages((prev) =>
              prev.map((m) => (m.id === newRow.id ? { ...m, ...newRow, attachments: [], content: null } : m))
            )
            return
          }
          // Refresh attachments for this message (needed after uploading files)
          try {
            const res = await sb
              .from('chat_attachments')
              .select('*')
              .eq('message_id', newRow.id)
            const atts = res.data || []
            const nextAtts = await Promise.all(
              atts.map(async (a: any) => {
                let url = a?.url
                if (!url && typeof a?.storage_path === 'string') {
                  if (a.storage_path.startsWith('http')) url = a.storage_path
                  else if ((a?.file_type || '').startsWith('audio/')) {
                    url = `/api/chat/attachment?path=${encodeURIComponent(a.storage_path)}`
                  } else {
                    const { data } = await sb.storage.from('chat-attachments').createSignedUrl(a.storage_path, 3600)
                    url = data?.signedUrl || ''
                  }
                }
                return { ...a, url: url || '' }
              })
            )
            setMessages((prev) =>
              prev.map((m) => (m.id === newRow.id ? { ...m, ...newRow, attachments: nextAtts } : m))
            )
          } catch (_) {
            setMessages((prev) => prev.map((m) => (m.id === newRow.id ? { ...m, ...newRow } : m)))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_message_deletes' },
        (payload) => {
          const row = payload.new as any
          if (row?.user_id === userId) {
            setMessages((prev) => prev.filter((m) => m.id !== row.message_id))
          }
        }
      )
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [threadId, userId])

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
        .select('*')
        .single()

      if (error) throw error
      const hydrated = await withAttachmentUrlsAsync(await hydrateSendersById(getSupabase(), [data as any]) as any)

      setPendingMessages(prev => prev.filter(m => m.tempId !== tempId))
      setMessages(prev => [...prev, hydrated[0] as any])

      await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

      return { success: true, messageId: (hydrated[0] as any)?.id || data.id }
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
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('chat_messages')
      .update({ content: newContent, is_edited: true, edited_at: now })
      .eq('id', messageId)
      .eq('sender_id', userId)

    if (!error) {
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, content: newContent, is_edited: true, edited_at: now } : m)
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
        .eq('sender_id', userId)

      if (!error) {
        setMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: null, attachments: [] } : m)
        )
      }
      return !error
    } else {
      // Delete for me: persist to chat_message_deletes so it stays hidden after refresh
      const { error } = await supabase
        .from('chat_message_deletes')
        .insert({ user_id: userId, message_id: messageId })

      if (!error) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
      }
      // Ignore duplicate key errors (user already deleted for me)
      return !error || (error as any)?.message?.includes?.('duplicate')
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

  const clearChat = async (targetThreadId: string) => {
    if (!userId) return
    if (targetThreadId !== threadId) return
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('thread_id', targetThreadId)
    const ids = (msgs || []).map((m: { id: string }) => m.id)
    if (ids.length === 0) {
      setMessages([])
      setPendingMessages(prev => prev.filter(p => p.thread_id !== targetThreadId))
      return
    }
    const batchSize = 100
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const rows = batch.map(message_id => ({ user_id: userId, message_id }))
      await supabase
        .from('chat_message_deletes')
        .upsert(rows, { onConflict: 'user_id,message_id', ignoreDuplicates: true })
    }
    setMessages([])
    setPendingMessages(prev => prev.filter(p => p.thread_id !== targetThreadId))
  }

  // Send voice message via API (bypasses RLS - works for widget, embedded, all contexts)
  const sendVoiceMessage = async (blob: Blob, duration: number) => {
    if (!threadId || !userId) return { success: false }

    const tempId = generateTempId()
    const now = new Date().toISOString()
    const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'webm'
    const fileName = `voice-${Date.now()}.${ext}`
    const contentType = ext === 'webm' ? 'audio/webm' : 'audio/mp4'

    const optimisticMessage: PendingMessage = {
      tempId,
      retryCount: 0,
      thread_id: threadId,
      sender_id: userId,
      content: '🎙️ Voice message',
      message_type: 'audio',
      reply_to_message_id: null,
      forwarded_from_id: null,
      is_deleted: false,
      deleted_at: null,
      deleted_for: null,
      edited_at: null,
      status: 'sending',
      metadata: { duration },
      created_at: now,
    }

    setPendingMessages(prev => [...prev, optimisticMessage])

    try {
      // Use FormData endpoint to avoid JSON body size limits
      const formData = new FormData()
      const file = new File([blob], fileName, { type: contentType })
      formData.append('audio', file)
      formData.append('duration', String(duration))

      const res = await fetch(`/api/threads/${threadId}/voice`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to send voice message')
      const messageId = json.messageId

      // Hydrate and add to messages (API uses admin, so we need to fetch for our UI)
      const { data: msgRow } = await getSupabase()
        .from('chat_messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (msgRow) {
        const { data: atts } = await getSupabase().from('chat_attachments').select('*').eq('message_id', messageId)
        const fullMsg = { ...msgRow, attachments: atts || [] }
        const hydrated = await withAttachmentUrlsAsync(await hydrateSendersById(getSupabase(), [fullMsg as any]) as any)
        setPendingMessages(prev => prev.filter(m => m.tempId !== tempId))
        setMessages(prev => [...prev, hydrated[0] as any])
      } else {
        setPendingMessages(prev => prev.filter(m => m.tempId !== tempId))
        // Trigger refresh so realtime or next load picks it up
        loadMessages(true)
      }

      return { success: true, messageId }
    } catch (error: any) {
      const errMsg = getErrorMessage(error, 'Failed to send voice message')
      console.error('[sendVoiceMessage]', errMsg, error)
      setPendingMessages(prev =>
        prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m)
      )
      return { success: false, error: errMsg }
    }
  }

  return {
    messages,
    pendingMessages,
    loading,
    hasMore,
    loadMore: () => loadMessages(false),
    sendMessage,
    sendVoiceMessage,
    retryMessage,
    cancelMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    clearChat,
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

    const manualKey = `dzd_presence_manual_v1:${userId}`
    const getManual = () => {
      try {
        const raw = localStorage.getItem(manualKey)
        if (raw === 'available') return 'online' as const
        if (raw === 'away') return 'away' as const
        if (raw === 'not_available') return 'offline' as const
        // if user picked "busy", keep presence online but don't let activity override
        if (raw === 'busy') return 'online' as const
      } catch (_) {}
      return null
    }

    const effective = () => getManual() ?? ('online' as const)

    updatePresence(effective())

    heartbeatRef.current = setInterval(() => {
      updatePresence(effective())
    }, TIMING.PRESENCE_HEARTBEAT)

    const handleActivity = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      // If user manually set a status (away/busy/not available), don't override it via idle timer
      if (getManual()) return
      idleTimeoutRef.current = setTimeout(() => updatePresence('away'), TIMING.IDLE_TIMEOUT)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    const handleVisibility = () => {
      // If manual override set, keep it
      if (getManual()) {
        updatePresence(effective())
        return
      }
      updatePresence(document.visibilityState === 'visible' ? 'online' : 'away')
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const onManualChange = () => updatePresence(effective())
    window.addEventListener('dzd_presence_changed', onManualChange)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      events.forEach(e => window.removeEventListener(e, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('dzd_presence_changed', onManualChange)
      updatePresence('offline')
    }
  }, [userId, updatePresence])

  return { updatePresence }
}

// Default chat settings - used when no DB row exists (new users, first load)
function getDefaultChatSettings(userId: string): ChatUserSettings {
  return {
    user_id: userId,
    accepting_new_chats: true,
    accept_from_patients: true,
    accept_from_providers: true,
    accept_from_anyone: false,
    notifications_enabled: true,
    sound_enabled: true,
    desktop_notifications: false,
    theme: 'system',
    font_size: 'medium',
    compact_mode: false,
    message_preview_lines: 2,
    show_typing_indicators: true,
    show_read_receipts: true,
    show_online_status: true,
    enter_to_send: true,
    updated_at: new Date().toISOString()
  }
}

// ============================================
// SETTINGS HOOK
// ============================================

export function useSettings(userId: string | null) {
  // Initialize with defaults so components never see null (fixes new-user crashes)
  const [settings, setSettings] = useState<ChatUserSettings | null>(() =>
    userId ? getDefaultChatSettings(userId) : null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      setSettings(getDefaultChatSettings(userId))
      loadSettings()
    } else {
      setSettings(null)
      setLoading(false)
    }
  }, [userId])

  const loadSettings = async () => {
    if (!userId) return

    const localKey = `dzd_widget_chat_settings_${userId}`
    const defaults = getDefaultChatSettings(userId)

    try {
      // Try DB settings first
      const { data, error } = await supabase
        .from('chat_user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        // Merge with defaults so font_size, compact_mode etc. always have values (handles old DB rows)
        const raw = data as Record<string, unknown>
        const merged = {
          ...defaults,
          ...raw,
          // DB has show_typing_indicator (singular); we use show_typing_indicators
          show_typing_indicators: raw.show_typing_indicators ?? raw.show_typing_indicator ?? true,
          // DB has show_online_status as TEXT ('everyone'|'contacts'|'nobody'); we use boolean
          show_online_status: raw.show_online_status === 'nobody' || raw.show_online_status === false ? false : true,
        } as ChatUserSettings
        setSettings(merged)
        try { localStorage.setItem(localKey, JSON.stringify(merged)) } catch (_) {}
      } else {
        // If table missing/RLS, fall back to localStorage or defaults
        let local: ChatUserSettings | null = null
        try {
          const raw = localStorage.getItem(localKey)
          if (raw) local = JSON.parse(raw)
        } catch (_) {}
        setSettings(local || defaults)

        // Best-effort insert; map our type to DB columns
        const toInsert = local || defaults
        const dbRow = { ...toInsert, show_typing_indicator: toInsert.show_typing_indicators ?? true, show_online_status: toInsert.show_online_status !== false ? 'contacts' : 'nobody' } as Record<string, unknown>
        delete dbRow.show_typing_indicators
        await supabase.from('chat_user_settings').insert(dbRow)
      }
    } catch (_) {
      let local: ChatUserSettings | null = null
      try {
        const raw = localStorage.getItem(localKey)
        if (raw) local = JSON.parse(raw)
      } catch (_) {}
      setSettings(local || defaults)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<ChatUserSettings>) => {
    if (!userId) return
    const base = settings ?? getDefaultChatSettings(userId)
    const updated = { ...base, ...updates }
    setSettings(updated)
    try {
      localStorage.setItem(`dzd_widget_chat_settings_${userId}`, JSON.stringify(updated))
    } catch (_) {}

    // Map our type to DB columns (show_typing_indicators -> show_typing_indicator, show_online_status bool -> TEXT)
    const dbUpdates: Record<string, unknown> = { ...updates }
    if ('show_typing_indicators' in updates) {
      dbUpdates.show_typing_indicator = updates.show_typing_indicators
      delete dbUpdates.show_typing_indicators
    }
    if ('show_online_status' in updates) {
      dbUpdates.show_online_status = updates.show_online_status ? 'contacts' : 'nobody'
    }

    // Best-effort DB update; ignore if table/RLS missing
    try {
      await supabase
        .from('chat_user_settings')
        .update(dbUpdates)
        .eq('user_id', userId)
    } catch (_) {}
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

      // Trigger a message UPDATE so clients can refresh attachments (realtime subscription listens to chat_messages)
      try {
        await supabase
          .from('chat_messages')
          .update({ edited_at: new Date().toISOString() })
          .eq('id', messageId)
      } catch (_) {}

      const { data } = await getSupabase().storage.from('chat-attachments').createSignedUrl(filePath, 3600)
      const signedUrl = data?.signedUrl || ''

      setUploads(prev => {
        const updated = new Map(prev)
        updated.set(fileId, { ...updated.get(fileId)!, progress: 100, status: 'complete', url: signedUrl })
        return updated
      })

      return { url: signedUrl }
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

    try {
      const { data: rows } = await supabase
        .from('chat_messages')
        .select('*')
        .ilike('content', `%${query}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(LIMITS.SEARCH_RESULTS_LIMIT)

      const hydrated = await hydrateSendersById(getSupabase(), (rows || []) as any)
      const data = hydrated

      setResults(data?.map((m: any) => ({
        id: m.id,
        thread_id: m.thread_id,
        content: m.content,
        sender_id: m.sender_id,
        sender_name: (m.sender as any)?.full_name || 'Unknown',
        created_at: m.created_at,
        rank: 1
      })) || [])
    } catch (err) {
      console.error('[useMessageSearch] Error searching messages:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const clear = useCallback(() => setResults([]), [])

  return { results, loading, search, clear }
}

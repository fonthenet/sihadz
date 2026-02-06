'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { ChatMessage, ChatMessageRow, DirectoryUser, ThreadListItem } from './types'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

function asNum(n: any) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data as T
}

export function useThreads(userId: string | null) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!userId) return
    if (!opts?.silent) setLoading(true)
    const { data, error } = await supabase.rpc('chat_get_threads', { p_user_id: userId })
    if (!error) {
      const threads = (data || []).map((x: any) => ({ ...x, unread_count: asNum(x.unread_count) }))
      threads.sort((a: any, b: any) => {
        const at = new Date(a.last_message_created_at || a.updated_at || 0).getTime()
        const bt = new Date(b.last_message_created_at || b.updated_at || 0).getTime()
        return bt - at
      })
      setThreads(threads)
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // realtime: refresh sidebar on new messages and threads (silent to avoid visible reloads)
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`chat-threads-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => refresh({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_threads' }, () => refresh({ silent: true }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_thread_members' }, () => refresh({ silent: true }))
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, userId, refresh])

  return { threads, loading, refresh }
}

// Directory search (providers by default; optionally include patients)
export function useDirectorySearch(userId: string | null, query: string, includePatients: boolean) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [results, setResults] = useState<DirectoryUser[]>([])
  const [loading, setLoading] = useState(false)
  const q = query.trim().toLowerCase()

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!userId || !q) {
        setResults([])
        return
      }
      setLoading(true)

      const { data, error } = await supabase
        .from('directory_users')
        .select('user_id, display_name, entity_type, avatar_url, is_active, search_text')
        .ilike('search_text', `%${q}%`)
        .limit(25)

      if (!alive) return
      if (error || !data) {
        setResults([])
        setLoading(false)
        return
      }

      const allowed = new Set(['doctor', 'pharmacy', 'laboratory', 'clinic', 'business', 'admin'])
      if (includePatients) allowed.add('patient')

      const filtered = (data as any[])
        .filter((u) => u.user_id !== userId)
        .filter((u) => allowed.has(String(u.entity_type)))
        .filter((u) => u.is_active !== false)
        .map((u) => ({
          user_id: u.user_id,
          display_name: u.display_name,
          entity_type: u.entity_type,
          avatar_url: u.avatar_url,
          is_active: u.is_active,
        }))

      setResults(filtered)
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [supabase, userId, q])

  return { results, loading }
}

export function useThreadMessages(userId: string | null, threadId: string | null) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const cursorRef = useRef<string | null>(null)
  const hasMoreRef = useRef(true)

  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; display_name: string }>>([])
  const typingOffTimeouts = useRef<Map<string, any>>(new Map())
  const channelRef = useRef<any>(null)

  const [otherLastReadId, setOtherLastReadId] = useState<string | null>(null)
  const membersMapRef = useRef<Map<string, { display_name: string }>>(new Map())

  // Per-user deletes (best effort; table might not exist in older DBs)
  const deletedForMeRef = useRef<Set<string>>(new Set())

  const hydrateSenders = useCallback(
    async (rows: ChatMessageRow[]): Promise<ChatMessage[]> => {
      const senderIds = Array.from(new Set(rows.map((m) => m.sender_id)))
      const { data: dir } = await supabase
        .from('directory_users')
        .select('user_id, display_name, entity_type, avatar_url')
        .in('user_id', senderIds)

      const map = new Map((dir || []).map((d: any) => [d.user_id, d]))

      return rows.map((m: any) => {
        const d = map.get(m.sender_id)
        return {
          ...m,
          attachments: m.chat_attachments || [],
          sender: d
            ? { id: d.user_id, name: d.display_name, avatar: d.avatar_url, type: d.entity_type }
            : { id: m.sender_id, name: 'User', avatar: null, type: 'business' },
        }
      })
    },
    [supabase]
  )

  const loadDeletesForMe = useCallback(
    async (messageIds: string[]) => {
      if (!userId || !threadId) return
      if (!messageIds.length) return
      try {
        const { data } = await supabase
          .from('chat_message_deletes')
          .select('message_id')
          .eq('user_id', userId)
          .in('message_id', messageIds)

        const set = new Set<string>((data || []).map((d: any) => d.message_id))
        deletedForMeRef.current = set
      } catch {
        // ignore (older DB might not have the table)
      }
    },
    [supabase, userId, threadId]
  )

  const loadMembersMeta = useCallback(async () => {
    if (!userId || !threadId) return
    const { data: mem } = await supabase
      .from('chat_thread_members')
      .select('user_id, last_read_message_id')
      .eq('thread_id', threadId)

    const ids = Array.from(new Set((mem || []).map((m: any) => m.user_id)))
    const { data: dir } = await supabase.from('directory_users').select('user_id, display_name').in('user_id', ids)

    const map = new Map((dir || []).map((d: any) => [d.user_id, { display_name: d.display_name }]))
    membersMapRef.current = map

    const other = (mem || []).find((m: any) => m.user_id !== userId)
    setOtherLastReadId(other?.last_read_message_id || null)
  }, [supabase, userId, threadId])

  const loadInitial = useCallback(async () => {
    if (!userId || !threadId) return
    setLoading(true)
    cursorRef.current = null
    hasMoreRef.current = true

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`*, chat_attachments(*)`)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error || !data) {
      setMessages([])
      setLoading(false)
      return
    }

    const rows = (data as any[]).reverse()
    await loadDeletesForMe(rows.map((r) => r.id))
    const hydrated = await hydrateSenders(rows as any)

    setMessages(hydrated.filter((m) => !deletedForMeRef.current.has(m.id)))
    const oldest = rows[0]
    cursorRef.current = oldest?.created_at || null
    hasMoreRef.current = rows.length === 40
    setLoading(false)

    // mark read
    const last = hydrated[hydrated.length - 1]
    if (last?.id) {
      await supabase
        .from('chat_thread_members')
        .update({ last_read_message_id: last.id })
        .eq('thread_id', threadId)
        .eq('user_id', userId)
    }

    await loadMembersMeta()
  }, [supabase, userId, threadId, hydrateSenders, loadMembersMeta, loadDeletesForMe])

  const loadMore = useCallback(async () => {
    if (!userId || !threadId) return
    if (!hasMoreRef.current || !cursorRef.current) return
    setLoadingMore(true)

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`*, chat_attachments(*)`)
      .eq('thread_id', threadId)
      .lt('created_at', cursorRef.current)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error || !data) {
      setLoadingMore(false)
      return
    }

    const rows = (data as any[]).reverse()
    await loadDeletesForMe(rows.map((r) => r.id))
    const hydrated = await hydrateSenders(rows as any)
    setMessages((prev) => [...hydrated.filter((m) => !deletedForMeRef.current.has(m.id)), ...prev])

    const oldest = rows[0]
    cursorRef.current = oldest?.created_at || cursorRef.current
    hasMoreRef.current = rows.length === 40
    setLoadingMore(false)
  }, [supabase, userId, threadId, hydrateSenders, loadDeletesForMe])

  useEffect(() => {
    if (!userId || !threadId) return
    loadInitial()
  }, [loadInitial])

  // realtime: new messages, deletes, receipts, typing
  useEffect(() => {
    if (!userId || !threadId) return

    const ch = supabase.channel(`chat-thread-${threadId}`, { config: { broadcast: { self: false } } })
    channelRef.current = ch

    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
      async (payload) => {
        const row = payload.new as any
        // ignore if we already have it (optimistic) or if user deleted it for themselves
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev
          if (deletedForMeRef.current.has(row.id)) return prev
          return prev
        })

        const { data: msgRow } = await supabase
          .from('chat_messages')
          .select(`*, chat_attachments(*)`)
          .eq('id', row.id)
          .single()

        if (!msgRow) return
        const hydrated = await hydrateSenders([msgRow as any])

        setMessages((prev) => {
          if (prev.some((m) => m.id === hydrated[0].id)) return prev
          if (deletedForMeRef.current.has(hydrated[0].id)) return prev
          return [...prev, hydrated[0]]
        })

        if (row.sender_id !== userId) {
          await supabase
            .from('chat_thread_members')
            .update({ last_read_message_id: row.id })
            .eq('thread_id', threadId)
            .eq('user_id', userId)
        }
      }
    )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as any
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)))
        }
      )
      // Delete-for-me updates (best effort; table might not exist)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_deletes' }, (payload) => {
        const row: any = payload.new
        if (row?.user_id !== userId) return
        deletedForMeRef.current.add(row.message_id)
        setMessages((prev) => prev.filter((m) => m.id !== row.message_id))
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_thread_members', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row: any = payload.new
          if (row?.user_id && row.user_id !== userId) {
            setOtherLastReadId(row.last_read_message_id || null)
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const p = payload?.payload || {}
        if (!p.user_id || p.user_id === userId) return
        const name = membersMapRef.current.get(p.user_id)?.display_name || 'User'

        setTypingUsers((prev) => {
          const filtered = prev.filter((x) => x.user_id !== p.user_id)
          return p.typing ? [...filtered, { user_id: p.user_id, display_name: name }] : filtered
        })

        // auto turn off in 3s if no further typing events
        const existing = typingOffTimeouts.current.get(p.user_id)
        if (existing) clearTimeout(existing)
        if (p.typing) {
          const t = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((x) => x.user_id !== p.user_id))
          }, 3000)
          typingOffTimeouts.current.set(p.user_id, t)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
      typingOffTimeouts.current.forEach((t) => clearTimeout(t))
      typingOffTimeouts.current.clear()
      setTypingUsers([])
    }
  }, [supabase, userId, threadId, hydrateSenders])

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!userId || !threadId) return
      const ch = channelRef.current
      if (!ch) return
      ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId, typing } })
    },
    [userId, threadId]
  )

  const send = useCallback(
    async (text: string, files: File[] = [], opts?: { replyToMessageId?: string }) => {
      if (!userId || !threadId) throw new Error('Not ready')

      for (const f of files) {
        if (f.size > MAX_FILE_SIZE_BYTES) {
          throw new Error('File too large. Max size is 15MB.')
        }
      }
      const content = text.trim()

      const tempId = `temp-${Date.now()}`
      const optimisticMessage: ChatMessage = {
        id: tempId,
        thread_id: threadId,
        sender_id: userId,
        content: content || null,
        message_type: files.length > 0 ? (files[0].type.startsWith('image/') ? 'image' : 'file') : 'text',
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        reply_to_message_id: opts?.replyToMessageId || null,
        attachments: [],
        client_status: 'sending',
        sender: { id: userId, name: 'You', avatar: null, type: 'business' },
      }

      setMessages((prev) => [...prev, optimisticMessage])

      try {
        const resp = await postJson<any>('/api/messaging', {
          action: 'message.send',
          threadId,
          content: content || null,
          replyToMessageId: opts?.replyToMessageId || null,
          attachments: files.map((f) => ({ fileName: f.name, fileType: f.type, fileSize: f.size })),
        })

        const realId = resp.messageId as string | undefined
        if (realId) {
          const { data: msgRow } = await supabase
            .from('chat_messages')
            .select(`*, chat_attachments(*)`)
            .eq('id', realId)
            .single()

          if (msgRow) {
            const hydrated = await hydrateSenders([msgRow as any])
            setMessages((prev) => prev.map((m) => (m.id === tempId ? hydrated[0] : m)))
          } else {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...optimisticMessage, id: realId, client_status: undefined } : m)))
          }
        }

        if (resp.uploads?.length) {
          for (let i = 0; i < resp.uploads.length; i++) {
            const u = resp.uploads[i]
            const file = files[i]
            if (!file) continue
            await supabase.storage.from('chat-attachments').uploadToSignedUrl(u.storagePath, u.token, file)
          }
        }

        // clear client status if we never swapped with hydrated message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, client_status: undefined } : m)))
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, client_status: 'failed', client_error: (error as any)?.message || 'Failed' } : m))
        )
        throw error
      }
    },
    [supabase, userId, hydrateSenders]
  )

  const retrySend = useCallback(
    async (tempId: string, text: string, files: File[] = [], opts?: { replyToMessageId?: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      return await send(text, files, opts)
    },
    [send]
  )

  const deleteMessage = useCallback(async (messageId: string) => {
    await postJson<any>('/api/messaging', { action: 'message.delete', messageId })
  }, [])

  const deleteMessageForMe = useCallback(async (messageId: string) => {
    await postJson<any>('/api/messaging', { action: 'message.deleteForMe', messageId })
  }, [])

  const editMessage = useCallback(async (messageId: string, content: string) => {
    await postJson<any>('/api/messaging', { action: 'message.edit', messageId, content })
  }, [])

  const togglePinMessage = useCallback(async (messageId: string) => {
    if (!threadId) throw new Error('Not ready')
    return await postJson<any>('/api/messaging', { action: 'message.togglePinned', threadId, messageId })
  }, [])

  const searchMessages = useCallback(async (q: string) => {
    if (!threadId) return []
    const url = `/api/messaging?type=search&threadId=${encodeURIComponent(threadId)}&q=${encodeURIComponent(q)}`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Search failed')
    return data.results as Array<{ id: string; sender_id: string; content: string | null; created_at: string }>
  }, [])

  const getDownloadUrl = useCallback(async (storagePath: string) => {
    const resp = await postJson<any>('/api/messaging', { action: 'file.getDownloadUrl', storagePath })
    return resp.url as string
  }, [])

  return {
    messages,
    loading,
    loadingMore,
    loadMore,
    send,
    retrySend,
    getDownloadUrl,
    typingUsers,
    setTyping,
    otherLastReadId,
    deleteMessage,
    deleteMessageForMe,
    editMessage,
    togglePinMessage,
    searchMessages,
  }
}

// Legacy export
export function useChat(userId: string | null) {
  const { threads, loading, refresh } = useThreads(userId)
  return {
    conversations: threads,
    isLoading: loading,
    refreshConversations: refresh,
  }
}

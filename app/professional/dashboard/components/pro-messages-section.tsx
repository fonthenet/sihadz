'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImagePreviewDialog } from '@/components/image-preview-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MessageSquare, Search, Plus, Send, ArrowLeft, CheckCheck, Check, Paperclip, Smile,
  User, Stethoscope, Pill, FlaskConical, Building2, Truck, Users, Settings, Trash2, MoreHorizontal, UserMinus, Crown, Shield, LogOut, X, UserPlus, Pencil, AlertTriangle,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { getErrorMessage, isSchemaRelError, hydrateProfilesByUserId, hydrateSendersById } from '@/lib/chat/chat-error-and-hydrate'
import { avatarGradientFor } from '@/lib/chat/ui'
import { useToast } from '@/hooks/use-toast'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { useSearchParams } from 'next/navigation'
import PrescriptionBuilder from './prescription-builder'
import { LoadingSpinner } from '@/components/ui/page-loading'

export interface ProMessagesSectionProps {
  professional: { id?: string; business_name?: string; type?: string } | null
}

export interface ChatProfile {
  id: string
  full_name: string
  avatar_url: string | null
  user_type?: string
  is_online?: boolean
  professional_id?: string
}

export interface ChatThread {
  id: string
  thread_type: 'direct' | 'group'
  title: string | null
  description?: string | null
  created_by: string | null
  updated_at: string
  order_type?: 'prescription' | 'lab' | 'referral' | null
  order_id?: string | null
  metadata?: { appointment_id?: string; doctor_id?: string; target_id?: string; target_type?: string; prescription_id?: string }
  members?: { user_id: string; role?: string; profile?: ChatProfile }[]
  last_message?: { id: string; content: string | null; created_at: string; is_deleted: boolean; sender_id: string }
  unread_count?: number
  other_user?: ChatProfile | null
}

export interface ChatAttachment {
  id: string
  message_id: string
  file_name: string
  file_type: string
  file_size?: number
  storage_path: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string | null
  message_type: string
  is_deleted: boolean
  edited_at: string | null
  created_at: string
  sender?: ChatProfile
  chat_attachments?: ChatAttachment[]
}

function getInitials(name: string): string {
  return (name || '').trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(it => it?.id && !seen.has(it.id) && (seen.add(it.id), true))
}

const EMOJI_CODES = ['1f604', '2764', '1f44d', '1f525', '1f389', '1f44f', '1f914', '1f622']
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏']

function formatMessageTime(date: string): string {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function getUserTypeIcon(type: string) {
  switch (type) {
    case 'doctor': return <Stethoscope className="h-4 w-4" />
    case 'pharmacy': return <Pill className="h-4 w-4" />
    case 'laboratory': return <FlaskConical className="h-4 w-4" />
    case 'clinic': return <Building2 className="h-4 w-4" />
    case 'ambulance': return <Truck className="h-4 w-4" />
    default: return <User className="h-4 w-4" />
  }
}

function getUserTypeColor(type: string) {
  // Same blue/cyan format for all business types (matches professional cards)
  switch (type) {
    case 'doctor':
    case 'pharmacy':
    case 'laboratory':
    case 'clinic':
    case 'ambulance':
      return 'from-blue-500 to-cyan-600'
    default: return 'from-blue-500 to-cyan-600'
  }
}

function getUserTypeLabel(type: string) {
  switch (type) {
    case 'doctor': return 'Doctor'
    case 'pharmacy': return 'Pharmacy'
    case 'laboratory': return 'Laboratory'
    case 'clinic': return 'Clinic'
    case 'ambulance': return 'Ambulance'
    default: return 'Patient'
  }
}

export function ProMessagesSection({ professional }: ProMessagesSectionProps) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')

  const [threadsLoading, setThreadsLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPrivateChat, setShowPrivateChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)

  const [availableUsers, setAvailableUsers] = useState<ChatProfile[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupMemberSearch, setGroupMemberSearch] = useState('')
  const [groupSelectedIds, setGroupSelectedIds] = useState<Set<string>>(new Set())
  const [showGroupControls, setShowGroupControls] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [addMembersSearch, setAddMembersSearch] = useState('')
  const [addMembersIds, setAddMembersIds] = useState<Set<string>>(new Set())
  const [groupControlsSaving, setGroupControlsSaving] = useState(false)
  const [groupDeleteConfirm, setGroupDeleteConfirm] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: string; forEveryone: boolean } | null>(null)
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(new Set())
  const [reactionsByMessageId, setReactionsByMessageId] = useState<Record<string, { emoji: string; user_id: string }[]>>({})
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const reactionPickerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) setUser(authUser)
      } catch (err) {
        console.error('[ProMessages] Error loading user:', err)
      } finally {
        setUserLoaded(true)
      }
    }
    loadUser()
  }, [supabase])

  const loadThreads = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) return
    setThreadsLoading(true)

    try {
      let memberships: { thread_id: string }[] = []
      try {
        const { data, error } = await supabase
          .from('chat_thread_members')
          .select('thread_id')
          .eq('user_id', user.id)
          .is('left_at', null)
        if (!error) memberships = data || []
      } catch (e: any) {
        if (e?.message?.includes?.('left_at')) {
          const { data, error } = await supabase
            .from('chat_thread_members')
            .select('thread_id')
            .eq('user_id', user.id)
          if (!error) memberships = data || []
        } else throw e
      }

      if (!memberships.length) {
        setThreads([])
        return
      }

      const threadIds = memberships.map(m => m.thread_id)
      const { data: threadsData, error: threadsError } = await supabase
        .from('chat_threads')
        .select('*')
        .in('id', threadIds)
        .order('updated_at', { ascending: false })

      if (threadsError || !threadsData?.length) {
        setThreads([])
        return
      }

      const enrichedThreads = await Promise.all(
        threadsData.map(async (thread) => {
          const tt = (thread as any).thread_type ?? (thread as any).type ?? 'direct'
          let members: any[] = []
          try {
            const { data, error } = await supabase
              .from('chat_thread_members')
              .select('*, profile:profiles(*)')
              .eq('thread_id', thread.id)
              .is('left_at', null)
            if (!error) members = data || []
          } catch (e2: any) {
            if (e2?.message?.includes?.('left_at')) {
              const { data, error } = await supabase
                .from('chat_thread_members')
                .select('*, profile:profiles(*)')
                .eq('thread_id', thread.id)
              if (!error) members = data || []
            } else if (isSchemaRelError(e2, 'chat_thread_members', 'profiles')) {
              let raw: any[] = []
              try {
                const { data, error } = await supabase
                  .from('chat_thread_members')
                  .select('*')
                  .eq('thread_id', thread.id)
                  .is('left_at', null)
                if (!error) raw = data || []
              } catch {
                const { data } = await supabase.from('chat_thread_members').select('*').eq('thread_id', thread.id)
                raw = data || []
              }
              members = await hydrateProfilesByUserId(supabase, raw)
            } else {
              members = []
            }
          }

          let lastMsg: any = null
          try {
            const { data, error } = await supabase
              .from('chat_messages')
              .select('*, sender:profiles(*)')
              .eq('thread_id', thread.id)
              .eq('is_deleted', false)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (!error) lastMsg = data
          } catch (e) {
            if (isSchemaRelError(e, 'chat_messages', 'profiles')) {
              const { data } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('thread_id', thread.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (data) {
                const [h] = await hydrateSendersById(supabase, [data as any])
                lastMsg = h
              }
            }
          }

          const otherMember = members?.find((m: { user_id: string }) => m.user_id !== user.id)
          let other_user: ChatProfile | null = tt === 'direct' ? (otherMember?.profile as ChatProfile | null) ?? null : null
          if (tt === 'direct' && otherMember) {
            // Professionals ALWAYS show business_name as contact name
            const { data: prof } = await supabase
              .from('professionals')
              .select('auth_user_id, business_name, type')
              .eq('auth_user_id', otherMember.user_id)
              .maybeSingle()
            if (prof && (prof as { business_name?: string }).business_name) {
              other_user = {
                id: (prof as { auth_user_id: string }).auth_user_id,
                full_name: (prof as { business_name: string }).business_name,
                avatar_url: (other_user as ChatProfile)?.avatar_url ?? null,
                user_type: (prof as { type?: string }).type || 'doctor',
              }
            } else if (!(other_user?.full_name || '').trim()) {
              const profileData = otherMember.profile as { id?: string; full_name?: string; avatar_url?: string; user_type?: string } | undefined
              other_user = profileData
                ? { id: profileData.id || otherMember.user_id, full_name: profileData.full_name || 'Contact', avatar_url: profileData.avatar_url, user_type: profileData.user_type || 'patient' }
                : { id: otherMember.user_id, full_name: 'Contact', avatar_url: null, user_type: 'patient' }
            }
          }
          return {
            ...thread,
            thread_type: tt,
            order_type: (thread as any).order_type || null,
            order_id: (thread as any).order_id || null,
            metadata: (thread as any).metadata || {},
            members,
            last_message: lastMsg,
            unread_count: 0,
            other_user,
          }
        })
      )

      enrichedThreads.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.updated_at
        const bTime = b.last_message?.created_at || b.updated_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      setThreads(enrichedThreads)

      // Auto-select thread from URL params
      const threadIdFromUrl = searchParams?.get('threadId')
      if (threadIdFromUrl && !selectedThread) {
        const threadToSelect = enrichedThreads.find(t => t.id === threadIdFromUrl)
        if (threadToSelect) {
          setSelectedThread(threadToSelect)
        }
      }
      return enrichedThreads
    } catch (err) {
      console.error('[ProMessages] Error loading threads:', err)
    } finally {
      if (!opts?.silent) setThreadsLoading(false)
    }
  }, [supabase, user, searchParams, selectedThread])

  useEffect(() => {
    if (user) {
      loadThreads()
      const channel = supabase
        .channel(`pro-messages-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
          loadThreads({ silent: true })
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [supabase, user, loadThreads])

  useAutoRefresh(loadThreads, 60_000, { enabled: !!user })

  const loadMessages = useCallback(async () => {
    if (!selectedThread || !user) return
    setMessagesLoading(true)
    try {
      let rows: any[] = []
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*, chat_attachments(*)')
          .eq('thread_id', selectedThread.id)
          .order('created_at', { ascending: true })
          .limit(100)
        if (error) throw error
        rows = (data as any[]) || []
      } catch (e) {
        if (isSchemaRelError(e, 'chat_messages', 'profiles') || getErrorMessage(e, '').toLowerCase().includes('chat_attachments') || getErrorMessage(e, '').includes('schema cache')) {
          try {
            const { data } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('thread_id', selectedThread.id)
              .order('created_at', { ascending: true })
              .limit(100)
            rows = (data as any[]) || []
            const ids = rows.map((r: any) => r.id).filter(Boolean)
            if (ids.length) {
              try {
                const { data: atts } = await supabase.from('chat_attachments').select('*').in('message_id', ids)
                const byMsg = new Map<string, any[]>()
                for (const a of atts || []) {
                  if (!byMsg.has(a.message_id)) byMsg.set(a.message_id, [])
                  byMsg.get(a.message_id)!.push(a)
                }
                rows = rows.map((r: any) => ({ ...r, chat_attachments: byMsg.get(r.id) || [] }))
              } catch (_) {
                rows = rows.map((r: any) => ({ ...r, chat_attachments: [] }))
              }
            }
          } catch (e2) {
            throw e2
          }
        } else throw e
      }
      const hydrated = await hydrateSendersById(supabase, rows)
      setMessages(dedupeById(hydrated))

      const ids = (hydrated as any[]).map((r: any) => r.id).filter(Boolean)
      if (ids.length) {
        try {
          const { data: reacts } = await supabase
            .from('chat_message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', ids)
          const byMsg: Record<string, { emoji: string; user_id: string }[]> = {}
          for (const r of reacts || []) {
            if (!byMsg[r.message_id]) byMsg[r.message_id] = []
            byMsg[r.message_id].push({ emoji: r.emoji, user_id: r.user_id })
          }
          setReactionsByMessageId(byMsg)
        } catch {
          setReactionsByMessageId({})
        }
      } else {
        setReactionsByMessageId({})
      }
    } catch (err) {
      console.error('[ProMessages] Error loading messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }, [supabase, selectedThread, user])

  useEffect(() => {
    if (!selectedThread || !user) {
      setMessages([])
      setMessagesLoading(false)
      return
    }
    setReactionPickerMsgId(null)
    loadMessages()

    const channel = supabase
      .channel(`messages-${selectedThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${selectedThread.id}`,
      }, async (payload: { new: { id: string } }) => {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*, chat_attachments(*)')
            .eq('id', payload.new.id)
            .single()
          let row: any = data
          if (error && (getErrorMessage(error, '').toLowerCase().includes('chat_attachments') || getErrorMessage(error, '').includes('schema cache'))) {
            const { data: m } = await supabase.from('chat_messages').select('*').eq('id', payload.new.id).single()
            if (!m) return
            try {
              const { data: atts } = await supabase.from('chat_attachments').select('*').eq('message_id', m.id)
              row = { ...m, chat_attachments: atts || [] }
            } catch (_) {
              row = { ...m, chat_attachments: [] }
            }
          } else if (error) return
          if (!row) return
          const [h] = await hydrateSendersById(supabase, [row])
          if (h) setMessages(prev => (prev.some(m => m.id === h.id) ? prev : dedupeById([...prev, h])))
        } catch (e) {
          console.error('[ProMessages] Realtime new message hydrate:', e)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${selectedThread.id}`,
      }, (payload: { new: { id: string; is_deleted?: boolean } }) => {
        const row = payload.new as any
        if (row?.is_deleted) {
          setMessages(prev => prev.map(m => m.id === row.id ? { ...m, is_deleted: true, content: null, chat_attachments: [] } : m))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, user, selectedThread, loadMessages])

  const loadAvailableUsers = useCallback(async () => {
    if (!user) return
    setUsersLoading(true)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url')
        .neq('id', user.id)
        .order('full_name')
        .limit(100)

      const merged: ChatProfile[] = (profiles || []).map((p: { id: string; full_name: string; user_type?: string; avatar_url: string | null }) => ({
        id: p.id,
        full_name: p.full_name || 'Unknown User',
        user_type: p.user_type || 'patient',
        avatar_url: p.avatar_url,
        is_online: false,
      }))

      setAvailableUsers(merged)
    } catch (err) {
      console.error('Error loading users:', err)
    }
    setUsersLoading(false)
  }, [supabase, user])

  useEffect(() => {
    if (showPrivateChat || showNewGroup || showGroupControls) loadAvailableUsers()
  }, [showPrivateChat, showNewGroup, showGroupControls, loadAvailableUsers])

  useEffect(() => {
    if (showGroupControls && selectedThread?.thread_type === 'group') {
      setEditGroupName(selectedThread.title || '')
      setEditGroupDescription((selectedThread as { description?: string }).description || '')
      setAddMembersIds(new Set())
      setAddMembersSearch('')
      setGroupDeleteConfirm(false)
    }
  }, [showGroupControls, selectedThread])

  const filteredUsers = useMemo(() => {
    return availableUsers.filter(p => {
      if (userFilter !== 'all' && p.user_type !== userFilter) return false
      if (userSearch) {
        const search = userSearch.toLowerCase()
        if (!p.full_name.toLowerCase().includes(search)) return false
      }
      return true
    })
  }, [availableUsers, userFilter, userSearch])

  const groupFilteredUsers = useMemo(() => {
    return availableUsers.filter(p => {
      if (user?.id && p.id === user.id) return false
      if (groupMemberSearch) {
        const q = groupMemberSearch.toLowerCase()
        if (!(p.full_name || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [availableUsers, groupMemberSearch, user?.id])

  const groupThreads = useMemo(() => threads.filter(t => t.thread_type === 'group'), [threads])

  const createDirectThread = async (otherUserId: string, provider?: ChatProfile) => {
    if (!user || otherUserId === user.id) return null
    const fail = (e: unknown, label: string) => {
      const msg = getErrorMessage(e, 'Could not start conversation.')
      console.error(`[ProMessages] ${label}:`, msg, e)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }

    try {
      let existingMemberships: { thread_id: string }[] = []
      try {
        const { data, error } = await supabase
          .from('chat_thread_members')
          .select('thread_id')
          .eq('user_id', user.id)
          .is('left_at', null)
        if (!error) existingMemberships = data || []
      } catch (e: any) {
        if (e?.message?.includes?.('left_at')) {
          const { data, error } = await supabase
            .from('chat_thread_members')
            .select('thread_id')
            .eq('user_id', user.id)
          if (!error) existingMemberships = data || []
        } else throw e
      }

      for (const m of existingMemberships) {
        const { data: t1 } = await supabase.from('chat_threads').select('*').eq('id', m.thread_id).eq('thread_type', 'direct').maybeSingle()
        const t = t1 || (await supabase.from('chat_threads').select('*').eq('id', m.thread_id).eq('type', 'direct').maybeSingle()).data
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
        const ids = [...new Set(mem.map(x => x.user_id))]
        if (ids.includes(otherUserId) && ids.length === 2) {
          const { data: threadMembers } = await supabase
            .from('chat_thread_members')
            .select('*, profile:profiles(*)')
            .eq('thread_id', t.id)
          const otherMember = (threadMembers || []).find((tm: { user_id: string }) => tm.user_id !== user.id)
          let ou: ChatProfile | null = (otherMember?.profile as ChatProfile | null) ?? null
          if (ou && !(ou.full_name || '').trim()) {
            const { data: prof } = await supabase
              .from('professionals')
              .select('business_name')
              .eq('auth_user_id', otherUserId)
              .maybeSingle()
            ou = { ...ou, full_name: (prof as { business_name?: string } | null)?.business_name || 'Contact' }
          } else if (!ou && otherMember) {
            const { data: prof } = await supabase
              .from('professionals')
              .select('business_name')
              .eq('auth_user_id', otherUserId)
              .maybeSingle()
            ou = { id: otherUserId, full_name: (prof as { business_name?: string } | null)?.business_name || 'Contact', avatar_url: null, user_type: 'doctor' }
          }
          return { ...t, members: threadMembers || [], other_user: ou }
        }
      }

      let newThread: any
      const ins1 = await supabase
        .from('chat_threads')
        .insert({ thread_type: 'direct', created_by: user.id })
        .select()
        .single()
      if (!ins1.error) {
        newThread = ins1.data
      } else {
        const m = getErrorMessage(ins1.error, '')
        if (m.includes('thread_type') || m.includes('schema cache')) {
          const ins2 = await supabase
            .from('chat_threads')
            .insert({ type: 'direct', created_by: user.id } as any)
            .select()
            .single()
          if (ins2.error) {
            fail(ins2.error, 'create thread')
            return null
          }
          newThread = ins2.data
        } else {
          fail(ins1.error, 'create thread')
          return null
        }
      }

      const { error: membersErr } = await supabase.from('chat_thread_members').insert([
        { thread_id: newThread.id, user_id: user.id, role: 'admin' },
        { thread_id: newThread.id, user_id: otherUserId, role: 'member' },
      ])
      if (membersErr) {
        fail(membersErr, 'create thread members')
        return null
      }

      let other_user: ChatProfile | null = null
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle()
      if (otherProfile?.full_name?.trim()) {
        other_user = otherProfile as ChatProfile
      } else {
        const { data: prof } = await supabase
          .from('professionals')
          .select('auth_user_id, business_name, type')
          .eq('auth_user_id', otherUserId)
          .maybeSingle()
        if (prof) {
          other_user = {
            id: (prof as { auth_user_id: string }).auth_user_id,
            full_name: (prof as { business_name?: string }).business_name || 'Contact',
            avatar_url: null,
            user_type: (prof as { type?: string }).type || 'doctor',
          }
        } else if (otherProfile) {
          other_user = { ...otherProfile, full_name: otherProfile.full_name || 'Contact' } as ChatProfile
        } else {
          other_user = { id: otherUserId, full_name: 'Contact', avatar_url: null, user_type: 'patient' }
        }
      }
      return { ...newThread, members: [], other_user }
    } catch (err) {
      fail(err, 'createDirectThread')
      return null
    }
  }

  const sendMessage = async () => {
    if (!selectedThread || !draft.trim() || sending || !user) return
    const content = draft.trim()
    setDraft('')
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: tempId,
      thread_id: selectedThread.id,
      sender_id: user.id,
      content,
      message_type: 'text',
      is_deleted: false,
      edited_at: null,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: professional?.business_name || 'You', avatar_url: null, user_type: (professional?.type as any) || 'doctor' },
    }
    setMessages(prev => [...prev, optimisticMessage])
    setSending(true)
    try {
      // Use API to bypass RLS
      const res = await fetch(`/api/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to send message')
      }

      // Reload messages to get the actual message with proper sender info
      setMessages(prev => prev.filter(m => m.id !== tempId))
      await loadMessages()
      loadThreads()
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setDraft(content)
      const msg = getErrorMessage(err, 'Failed to send message.')
      console.error('[ProMessages] Error sending message:', err)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
    setSending(false)
  }

  const handleStartChat = async (profile: ChatProfile) => {
    const thread = await createDirectThread(profile.id, profile)
    if (thread) {
      setSelectedThread(thread as ChatThread)
      setShowPrivateChat(false)
      await loadThreads()
    }
  }

  const getUserRole = (thread: ChatThread) => {
    if (!user || !thread.members) return null
    const m = thread.members.find((x) => x.user_id === user.id)
    return (m as { role?: string })?.role ?? null
  }

  const isAdminOrOwner = (thread: ChatThread) => {
    const r = getUserRole(thread)
    return r === 'owner' || r === 'admin'
  }

  const createGroup = async () => {
    if (!user || !groupTitle.trim() || groupSelectedIds.size === 0) return
    try {
      // --- DUPLICATE_GROUP_CHECK: Reuse existing group with same name (remove this block to allow duplicates) ---
      const trimmedTitle = groupTitle.trim()
      const { data: myGroups } = await supabase
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', user.id)
        .is('left_at', null)
      const myThreadIds = (myGroups || []).map((g: { thread_id: string }) => g.thread_id)
      if (myThreadIds.length > 0) {
        const { data: existingRow } = await supabase
          .from('chat_threads')
          .select('id')
          .eq('thread_type', 'group')
          .ilike('title', trimmedTitle)
          .in('id', myThreadIds)
          .limit(1)
          .maybeSingle()
        if (existingRow) {
          let existingThread = threads.find(t => t.id === existingRow.id)
          if (!existingThread) {
            const loaded = await loadThreads()
            existingThread = loaded?.find((t: ChatThread) => t.id === existingRow.id)
          }
          if (existingThread) {
            setShowNewGroup(false)
            setGroupTitle('')
            setGroupSelectedIds(new Set())
            setSelectedThread(existingThread)
            toast({ title: 'Opened existing group', description: `"${trimmedTitle}" already exists.` })
            return
          }
        }
      }
      // --- END DUPLICATE_GROUP_CHECK ---

      let newThread: any = null
      try {
        const res = await supabase
          .from('chat_threads')
          .insert({ thread_type: 'group', title: groupTitle.trim(), created_by: user.id })
          .select()
          .single()
        if (res.error) throw res.error
        newThread = res.data
      } catch (e: any) {
        const msg = getErrorMessage(e, '')
        if (msg.toLowerCase().includes('thread_type') || msg.toLowerCase().includes('schema cache')) {
          const res2 = await supabase
            .from('chat_threads')
            .insert({ type: 'group', title: groupTitle.trim(), created_by: user.id } as any)
            .select()
            .single()
          if (res2.error) throw res2.error
          newThread = res2.data
        } else throw e
      }
      const rows = [
        { thread_id: newThread.id, user_id: user.id, role: 'owner' },
        ...Array.from(groupSelectedIds).map((uid) => ({ thread_id: newThread.id, user_id: uid, role: 'member' })),
      ]
      const { error: membersErr } = await supabase.from('chat_thread_members').insert(rows)
      if (membersErr) throw membersErr
      const title = groupTitle.trim()
      const selectedIds = new Set(groupSelectedIds)
      setShowNewGroup(false)
      setGroupTitle('')
      setGroupMemberSearch('')
      setGroupSelectedIds(new Set())
      const ownerProfile = { full_name: 'You', user_type: 'doctor' as const }
      const membersList: { user_id: string; role: string; profile?: { full_name: string } }[] = [
        { user_id: user.id, role: 'owner', profile: ownerProfile },
        ...Array.from(selectedIds).map((uid) => {
          const p = availableUsers.find((u) => u.id === uid)
          return { user_id: uid, role: 'member', profile: { full_name: p?.full_name ?? 'Unknown' } }
        }),
      ]
      const optimistic: ChatThread = {
        ...newThread,
        thread_type: 'group',
        title,
        members: membersList as any,
        last_message: null,
        other_user: null,
      }
      setThreads(prev => [optimistic, ...prev.filter(t => t.id !== newThread.id)])
      setSelectedThread(optimistic)
      setMessages([])
      await loadThreads()
      toast({ title: 'Group created' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    }
  }

  const toggleGroupMember = (id: string) => {
    setGroupSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeGroupMember = async (memberId: string) => {
    if (!selectedThread || !user || selectedThread.thread_type !== 'group' || !isAdminOrOwner(selectedThread) || memberId === user.id) return
    try {
      try {
        const { error } = await supabase
          .from('chat_thread_members')
          .update({ left_at: new Date().toISOString() })
          .eq('thread_id', selectedThread.id)
          .eq('user_id', memberId)
        if (error) throw error
      } catch (e: any) {
        if (e?.message?.includes?.('left_at')) {
          const { error: delErr } = await supabase
            .from('chat_thread_members')
            .delete()
            .eq('thread_id', selectedThread.id)
            .eq('user_id', memberId)
          if (delErr) throw delErr
        } else throw e
      }
      setSelectedThread(t => (!t ? t : { ...t, members: (t.members || []).filter((m: any) => m.user_id !== memberId) }))
      await loadThreads()
      toast({ title: 'Member removed' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    }
  }

  const leaveGroup = async () => {
    if (!selectedThread || !user || selectedThread.thread_type !== 'group') return
    try {
      try {
        const { error } = await supabase
          .from('chat_thread_members')
          .update({ left_at: new Date().toISOString() })
          .eq('thread_id', selectedThread.id)
          .eq('user_id', user.id)
        if (error) throw error
      } catch (e: any) {
        if (e?.message?.includes?.('left_at')) {
          const { error: delErr } = await supabase
            .from('chat_thread_members')
            .delete()
            .eq('thread_id', selectedThread.id)
            .eq('user_id', user.id)
          if (delErr) throw delErr
        } else throw e
      }
      setShowGroupControls(false)
      setSelectedThread(null)
      setMessages([])
      await loadThreads()
      toast({ title: 'Left group' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    }
  }

  const toggleMemberAdmin = async (memberId: string) => {
    if (!selectedThread || !user || selectedThread.thread_type !== 'group' || getUserRole(selectedThread) !== 'owner' || memberId === user.id) return
    const member = selectedThread.members?.find((m: any) => m.user_id === memberId)
    const currentRole = (member as any)?.role || 'member'
    const nextRole = currentRole === 'admin' ? 'member' : 'admin'
    try {
      const { error } = await supabase
        .from('chat_thread_members')
        .update({ role: nextRole })
        .eq('thread_id', selectedThread.id)
        .eq('user_id', memberId)
      if (error) throw error
      setSelectedThread(t => (!t ? t : {
        ...t,
        members: (t.members || []).map((m: any) => m.user_id === memberId ? { ...m, role: nextRole } : m),
      }))
      await loadThreads()
      toast({ title: nextRole === 'admin' ? 'Made admin' : 'Removed admin' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    }
  }

  const updateGroupInfo = async () => {
    if (!selectedThread || !user || selectedThread.thread_type !== 'group' || !isAdminOrOwner(selectedThread)) return
    const title = editGroupName.trim()
    if (!title) {
      toast({ title: 'Group name required', variant: 'destructive' })
      return
    }
    setGroupControlsSaving(true)
    try {
      const updatePayload: Record<string, unknown> = { title, updated_at: new Date().toISOString() }
      if (editGroupDescription !== undefined) updatePayload.description = editGroupDescription.trim() || null
      const { error } = await supabase
        .from('chat_threads')
        .update(updatePayload)
        .eq('id', selectedThread.id)
      if (error) throw error
      setSelectedThread(t => (!t ? t : { ...t, title, description: editGroupDescription.trim() || null }))
      await loadThreads()
      toast({ title: 'Group updated' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    } finally {
      setGroupControlsSaving(false)
    }
  }

  const addMembersToGroup = async () => {
    if (!selectedThread || !user || selectedThread.thread_type !== 'group' || !isAdminOrOwner(selectedThread) || addMembersIds.size === 0) return
    try {
      const currentMemberIds = new Set((selectedThread.members || []).map((m: any) => m.user_id))
      const toAdd = Array.from(addMembersIds).filter(id => !currentMemberIds.has(id))
      if (toAdd.length === 0) {
        toast({ title: 'No new members to add', variant: 'destructive' })
        return
      }
      setGroupControlsSaving(true)
      const rows = toAdd.map(uid => ({ thread_id: selectedThread.id, user_id: uid, role: 'member' }))
      const { error } = await supabase.from('chat_thread_members').insert(rows)
      if (error) throw error
      const newMembers = await Promise.all(toAdd.map(async (uid) => {
        const p = availableUsers.find(u => u.id === uid)
        return { user_id: uid, role: 'member' as const, profile: p ? { full_name: p.full_name, avatar_url: p.avatar_url } : undefined }
      }))
      setSelectedThread(t => (!t ? t : { ...t, members: [...(t.members || []), ...newMembers] }))
      setAddMembersIds(new Set())
      await loadThreads()
      toast({ title: `${toAdd.length} member(s) added` })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    } finally {
      setGroupControlsSaving(false)
    }
  }

  const deleteGroup = async () => {
    if (!selectedThread || !user || selectedThread.thread_type !== 'group' || getUserRole(selectedThread) !== 'owner') return
    setGroupControlsSaving(true)
    try {
      const { error } = await supabase.from('chat_threads').delete().eq('id', selectedThread.id)
      if (error) throw error
      setShowGroupControls(false)
      setSelectedThread(null)
      setMessages([])
      await loadThreads()
      toast({ title: 'Group deleted', variant: 'destructive' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' })
    } finally {
      setGroupControlsSaving(false)
      setGroupDeleteConfirm(false)
    }
  }

  const addMembersFilteredUsers = useMemo(() => {
    const memberIds = new Set((selectedThread?.members || []).map((m: any) => m.user_id))
    return availableUsers.filter(p => {
      if (p.id === user?.id) return false
      if (memberIds.has(p.id)) return false
      if (addMembersSearch) {
        const q = addMembersSearch.toLowerCase()
        if (!(p.full_name || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [availableUsers, selectedThread?.members, addMembersSearch, user?.id])

  const getThreadName = (thread: ChatThread) => {
    if (thread.thread_type === 'group') return thread.title || 'Group Chat'
    const name = thread.other_user?.full_name || (thread.members?.find(m => m.user_id !== user?.id)?.profile as { full_name?: string } | undefined)?.full_name
    return (name || '').trim() || 'Contact'
  }

  const getThreadAvatar = (thread: ChatThread) => {
    if (thread.thread_type === 'group') return thread.title ? getInitials(thread.title) : 'GC'
    const name = thread.other_user?.full_name || (thread.members?.find(m => m.user_id !== user?.id)?.profile as { full_name?: string } | undefined)?.full_name
    return (name || '').trim() ? getInitials((name || '').trim()) : '?'
  }

  const deleteMessage = useCallback(async (messageId: string, forEveryone: boolean) => {
    if (!user) return
    if (forEveryone) {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), content: null })
        .eq('id', messageId)
      if (error) {
        toast({ title: 'Error', description: getErrorMessage(error, 'Failed to delete'), variant: 'destructive' })
        return
      }
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: null } : m))
      toast({ title: 'Message deleted' })
    } else {
      setDeletedForMeIds(prev => new Set(prev).add(messageId))
      toast({ title: 'Removed for you' })
    }
    setDeleteConfirm(null)
  }, [supabase, user, toast])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false)
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmojiPicker])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (reactionPickerMsgId && reactionPickerContainerRef.current && !reactionPickerContainerRef.current.contains(e.target as Node))
        setReactionPickerMsgId(null)
    }
    if (reactionPickerMsgId) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [reactionPickerMsgId])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    try {
      await supabase.from('chat_message_reactions').insert({ message_id: messageId, user_id: user.id, emoji })
      setReactionsByMessageId(prev => {
        const list = prev[messageId] || []
        if (list.some(r => r.emoji === emoji && r.user_id === user.id)) return prev
        return { ...prev, [messageId]: [...list, { emoji, user_id: user.id }] }
      })
    } catch (e) {
      toast({ title: 'Error', description: getErrorMessage(e, 'Could not add reaction'), variant: 'destructive' })
    }
  }, [supabase, user, toast])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    try {
      await supabase
        .from('chat_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
      setReactionsByMessageId(prev => {
        const list = (prev[messageId] || []).filter(r => !(r.emoji === emoji && r.user_id === user.id))
        if (list.length === 0) { const { [messageId]: _, ...rest } = prev; return rest }
        return { ...prev, [messageId]: list }
      })
    } catch (e) {
      toast({ title: 'Error', description: getErrorMessage(e, 'Could not remove reaction'), variant: 'destructive' })
    }
  }, [supabase, user, toast])

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Thread List Sidebar */}
      <div className={cn('w-80 border-r flex flex-col bg-slate-50', selectedThread && 'hidden md:flex')}>
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-lg">Conversations</h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setShowNewGroup(true)} title="New group">
                <Users className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setShowPrivateChat(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-1" /> Private chat
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 bg-slate-50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {(!userLoaded || threadsLoading) ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" className="text-slate-400" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 px-4">
              <MessageSquare className="h-12 w-12 mb-3" />
              <p className="text-sm text-center font-medium">No conversations yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowPrivateChat(true)}>
                <Plus className="h-4 w-4 mr-1" /> Start a Chat
              </Button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads
                .filter(t => !searchQuery || getThreadName(t).toLowerCase().includes(searchQuery.toLowerCase()))
                .map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      selectedThread?.id === thread.id ? 'bg-teal-50 border border-teal-200' : 'hover:bg-white'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white',
                          thread.thread_type === 'group'
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                            : cn('bg-gradient-to-br', avatarGradientFor(thread.other_user?.id || thread.id))
                        )}
                      >
                        {getThreadAvatar(thread)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900 truncate text-sm">{getThreadName(thread)}</span>
                          {thread.last_message && (
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {formatMessageTime(thread.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${((thread.last_message?.content ?? '').toLowerCase().includes('declined') || (thread.last_message?.content ?? '').toLowerCase().includes('denied')) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500'}`}>
                          {thread.last_message?.is_deleted ? 'Message deleted' : thread.last_message?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn('flex-1 flex flex-col', !selectedThread && 'hidden md:flex')}>
        {selectedThread ? (
          <>
            <div className="h-14 px-4 flex items-center justify-between border-b bg-white">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedThread(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white',
                    selectedThread.thread_type === 'group'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : cn('bg-gradient-to-br', avatarGradientFor(selectedThread.other_user?.id || selectedThread.id))
                  )}
                >
                  {getThreadAvatar(selectedThread)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{getThreadName(selectedThread)}</p>
                  {selectedThread.thread_type === 'group' ? (
                    <div className="text-xs text-slate-400">
                      <span>{(selectedThread.members?.length ?? 0)} members</span>
                      {(() => {
                        const names = (selectedThread.members || []).map((m: any) => (m.profile?.full_name || '').trim()).filter(Boolean) as string[]
                        if (names.length === 0) return null
                        const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '')
                        return <p className="truncate max-w-[200px] mt-0.5">{preview}</p>
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Direct message</p>
                  )}
                </div>
              </div>
              {selectedThread.thread_type === 'group' && (
                <Button variant="ghost" size="sm" onClick={() => setShowGroupControls(true)} title="Manage group">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Prescription Builder for prescription threads */}
            {selectedThread?.order_type === 'prescription' && selectedThread.metadata && (
              <div className="border-b bg-white p-4">
                <PrescriptionBuilder
                  threadId={selectedThread.id}
                  appointmentId={selectedThread.metadata.appointment_id || selectedThread.order_id || ''}
                  doctorId={selectedThread.metadata.doctor_id || professional?.id || ''}
                  patientId={undefined} // Will be loaded from appointment in component
                  pharmacyId={selectedThread.metadata.target_type === 'pharmacy' ? selectedThread.metadata.target_id : undefined}
                  onPrescriptionCreated={(prescriptionId) => {
                    // Reload messages to show prescription created message
                    loadMessages()
                  }}
                />
              </div>
            )}

            <ScrollArea className="flex-1 p-4 bg-slate-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="lg" className="text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages
                    .filter(m => !deletedForMeIds.has(m.id))
                    .map((message, idx) => {
                    const isOwn = message.sender_id === user?.id
                    const filtered = messages.filter(m => !deletedForMeIds.has(m.id))
                    const prevIdx = filtered.indexOf(message) - 1
                    const prev = prevIdx >= 0 ? filtered[prevIdx] : null
                    const showAvatar = !isOwn && (prev == null || prev.sender_id !== message.sender_id)
                    const isFileMsg = message.message_type === 'file' && (message.chat_attachments?.length ?? 0) > 0
                    const hasImage = isFileMsg && message.chat_attachments!.some((a) => (a.file_type || '').startsWith('image/'))
                    const senderName = (message.sender as { full_name?: string } | null)?.full_name?.trim() || null
                    const isGroup = selectedThread?.thread_type === 'group'
                    return (
                      <div key={`msg-${message.id}-${idx}`} className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                        {!isOwn && showAvatar && (
                          <div
                            className={cn(
                              'w-7 h-7 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-medium flex-shrink-0',
                              avatarGradientFor(message.sender_id || message.id)
                            )}
                          >
                            {senderName ? getInitials(senderName) : '?'}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-7" />}
                        <div className="max-w-[70%]">
                          {isGroup && showAvatar && senderName && (
                            <p className="text-xs text-slate-500 mb-0.5 ml-1">{senderName}</p>
                          )}
                          <div className="relative group/msg">
                          <div
                            className={cn(
                              'rounded-2xl text-sm',
                              hasImage ? 'p-0 bg-transparent' : 'px-3 py-2',
                              !hasImage && (isOwn ? 'bg-teal-600 text-white rounded-br-md' : 'bg-white text-slate-900 rounded-bl-md shadow-sm border')
                            )}
                          >
                            {message.is_deleted ? (
                              <p className="italic text-muted-foreground flex items-center gap-1.5">
                                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                Message deleted
                              </p>
                            ) : isFileMsg ? (
                              <div className="space-y-2">
                                {(message.chat_attachments as ChatAttachment[]).map((att) => {
                                  const fileUrl = att.storage_path.startsWith('http')
                                    ? att.storage_path
                                    : supabase.storage.from('chat-attachments').getPublicUrl(att.storage_path).data.publicUrl
                                  const isImage = (att.file_type || '').startsWith('image/')
                                  return (
                                    <div key={att.id} className="space-y-1">
                                      {!isImage && (
                                        <p className="text-sm font-medium break-words">
                                          {att.file_name}
                                          {att.file_size != null && <span className="opacity-70"> ({(att.file_size / 1024).toFixed(1)} KB)</span>}
                                        </p>
                                      )}
                                      {isImage ? (
                                        <button
                                          type="button"
                                          onClick={() => setImagePreviewUrl(fileUrl)}
                                          className="block text-left"
                                          title="View image"
                                        >
                                          <img
                                            src={fileUrl}
                                            alt={att.file_name}
                                            className="max-w-[240px] max-h-[240px] rounded-xl border border-slate-200 object-contain bg-slate-50 hover:opacity-90 transition-opacity"
                                            loading="lazy"
                                          />
                                        </button>
                                      ) : (
                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline break-all">
                                          <Paperclip className="h-4 w-4 flex-shrink-0" />
                                          <span>{att.file_name}</span>
                                        </a>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className={`whitespace-pre-wrap break-words ${((message.content ?? '').toLowerCase().includes('declined') || (message.content ?? '').toLowerCase().includes('denied')) ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded' : ''}`}>{message.content ?? ''}</p>
                            )}
                          </div>
                          {!message.is_deleted && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 transition-opacity',
                                    isOwn ? 'text-white/80 hover:bg-white/20' : 'text-slate-400 hover:bg-slate-100'
                                  )}
                                  aria-label="Message options"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                                {isOwn && (
                                  <>
                                    <DropdownMenuItem onClick={() => setDeleteConfirm({ messageId: message.id, forEveryone: false })}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete for me
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeleteConfirm({ messageId: message.id, forEveryone: true })}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete for everyone
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {!isOwn && (
                                  <DropdownMenuItem onClick={() => setDeleteConfirm({ messageId: message.id, forEveryone: false })}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Remove for me
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          </div>
                          <div className={cn('flex items-center gap-1 mt-1 text-xs text-slate-400', isOwn ? 'justify-end' : 'justify-start')}>
                            <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                            {isOwn && <CheckCheck className="h-3 w-3 text-teal-400" />}
                          </div>
                          {!message.is_deleted && (
                            <div className={cn('flex flex-wrap items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                              {(() => {
                                const reacts = reactionsByMessageId[message.id] || []
                                const byEmoji = reacts.reduce((acc, r) => {
                                  if (!acc[r.emoji]) acc[r.emoji] = []
                                  acc[r.emoji].push(r)
                                  return acc
                                }, {} as Record<string, { emoji: string; user_id: string }[]>)
                                return (
                                  <>
                                    {Object.entries(byEmoji).map(([emoji, list]) => {
                                      const hasReacted = list.some(r => r.user_id === user?.id)
                                      return (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => hasReacted ? removeReaction(message.id, emoji) : addReaction(message.id, emoji)}
                                          className={cn(
                                            'px-1.5 py-0.5 rounded text-xs border transition-colors',
                                            hasReacted ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                          )}
                                        >
                                          {emoji} {list.length > 1 && <span>{list.length}</span>}
                                        </button>
                                      )
                                    })}
                                    <div className="relative" ref={reactionPickerMsgId === message.id ? reactionPickerContainerRef : undefined}>
                                      <button
                                        type="button"
                                        onClick={() => setReactionPickerMsgId(prev => prev === message.id ? null : message.id)}
                                        className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        aria-label="Add reaction"
                                      >
                                        <Smile className="h-3.5 w-3.5" />
                                      </button>
                                      {reactionPickerMsgId === message.id && (
                                        <div className="absolute bottom-full left-0 mb-1 p-1.5 rounded-lg shadow border bg-white flex gap-1 flex-wrap z-20 w-40">
                                          {REACTION_EMOJIS.map((emoji) => (
                                            <button
                                              key={emoji}
                                              type="button"
                                              className="w-7 h-7 flex items-center justify-center text-base rounded hover:bg-slate-100"
                                              onClick={() => {
                                                addReaction(message.id, emoji)
                                                setReactionPickerMsgId(null)
                                              }}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t bg-white">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !selectedThread || !user || sending) return
                  e.target.value = ''
                  setSending(true)
                  try {
                    const path = `${user.id}/${selectedThread.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                    const { error: uploadErr } = await supabase.storage.from('chat-attachments').upload(path, file, { upsert: false })
                    if (uploadErr) throw uploadErr
                    const { data: msg, error: msgErr } = await supabase
                      .from('chat_messages')
                      .insert({ thread_id: selectedThread.id, sender_id: user.id, content: file.name, message_type: 'file' })
                      .select('*')
                      .single()
                    if (msgErr) throw msgErr
                    const { error: attErr } = await supabase.from('chat_attachments').insert({
                      message_id: msg.id,
                      file_name: file.name,
                      file_type: file.type || 'application/octet-stream',
                      file_size: file.size,
                      storage_path: path,
                    })
                    if (attErr) throw attErr
                    const { data: updated } = await supabase
                      .from('chat_messages')
                      .select('*, chat_attachments(*)')
                      .eq('id', msg.id)
                      .single()
                    const [h] = await hydrateSendersById(supabase, [((updated || msg) as any)])
                    if (h) setMessages(prev => (prev.some(m => m.id === h.id) ? prev : dedupeById([...prev, h])))
                    await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', selectedThread.id)
                    loadThreads()
                  } catch (err: any) {
                    console.error('[ProMessages] File upload:', err)
                    toast({ title: 'Error', description: err?.message || 'Failed to upload file. Ensure storage bucket "chat-attachments" exists.', variant: 'destructive' })
                  }
                  setSending(false)
                }}
              />
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach file">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="relative flex-1 min-w-0" ref={emojiPickerRef}>
                  <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl shadow-lg border bg-white flex gap-1 flex-wrap z-10 w-64"
                    style={{ display: showEmojiPicker ? 'flex' : 'none' }}
                  >
                    {EMOJI_CODES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-slate-100 transition-colors"
                        onClick={() => {
                          setDraft(prev => prev + String.fromCodePoint(parseInt(code, 16)))
                          setShowEmojiPicker(false)
                        }}
                      >
                        {String.fromCodePoint(parseInt(code, 16))}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    style={{ minHeight: '40px', maxHeight: '100px' }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('h-10 w-10 rounded-lg shrink-0', showEmojiPicker && 'bg-teal-100 text-teal-600')}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className={cn('h-10 w-10 rounded-lg shrink-0', draft.trim() && !sending ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-100 text-slate-400')}
                >
                  {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Messages</h3>
            <p className="text-sm text-center max-w-sm mb-4">
              Connect with patients and other healthcare providers
            </p>
            <Button onClick={() => setShowPrivateChat(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" /> Start a conversation
            </Button>
          </div>
        )}
      </div>

      {/* Delete message confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirm?.forEveryone ? 'Delete for everyone?' : 'Remove for you?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.forEveryone
                ? 'This message will be deleted for all participants.'
                : 'This message will be hidden only for you.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteMessage(deleteConfirm.messageId, deleteConfirm.forEveryone)}
            >
              {deleteConfirm?.forEveryone ? 'Delete for everyone' : 'Remove for me'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview */}
      <ImagePreviewDialog
        open={!!imagePreviewUrl}
        onOpenChange={(open) => { if (!open) setImagePreviewUrl(null) }}
        src={imagePreviewUrl || ''}
        alt="Preview"
      />

      {/* Private chat: select contact + categories */}
      <Dialog open={showPrivateChat} onOpenChange={setShowPrivateChat}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 pr-12 border-b border-slate-200 space-y-0">
            <DialogTitle className="text-lg font-semibold">Private chat</DialogTitle>
            <p className="text-sm text-slate-500 mt-0.5">Select a contact to start a direct conversation.</p>
          </DialogHeader>
          <div className="px-6 py-4 flex flex-col min-h-0">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name..." className="pl-9 h-10" />
            </div>
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-600 mb-2">Categories</p>
              <Tabs value={userFilter} onValueChange={setUserFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-9 gap-1">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="patient" className="text-xs">Patients</TabsTrigger>
                  <TabsTrigger value="doctor" className="text-xs">Doctors</TabsTrigger>
                  <TabsTrigger value="pharmacy" className="text-xs">Pharmacy</TabsTrigger>
                  <TabsTrigger value="clinic" className="text-xs">Clinic</TabsTrigger>
                  <TabsTrigger value="laboratory" className="text-xs">Lab</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ScrollArea className="max-h-[280px] rounded-xl border border-slate-200">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" className="text-slate-400" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm"><Users className="h-10 w-10 mb-2 opacity-50" /><p>No one found. Try a different search or category.</p></div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {filteredUsers.map((profile) => (
                    <button key={profile.id} type="button" onClick={() => handleStartChat(profile)} className="w-full p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-colors text-left">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 bg-gradient-to-br', getUserTypeColor(profile.user_type || 'patient'))}>{getInitials(profile.full_name)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">{profile.full_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">{getUserTypeIcon(profile.user_type || 'patient')}{getUserTypeLabel(profile.user_type || 'patient')}</p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* New group: name + members + categories */}
      <Dialog
        open={showNewGroup}
        onOpenChange={(open) => {
          setShowNewGroup(open)
          if (!open) {
            setGroupTitle('')
            setGroupMemberSearch('')
            setGroupSelectedIds(new Set())
          }
        }}
      >
        <DialogContent resizable={false} className="sm:max-w-lg w-[95vw] h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0" style={{ overflow: 'hidden' }}>
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-3 pr-12 border-b border-slate-200 space-y-0">
            <DialogTitle className="text-lg font-semibold">New group</DialogTitle>
            <p className="text-sm text-slate-500 mt-0.5">Create a group and add members.</p>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Group name</label>
              <Input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="e.g. Team Alpha, Project Group" className="w-full h-10" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Members</label>
                <span className="text-sm font-medium text-teal-600 tabular-nums">{groupSelectedIds.size} selected</span>
              </div>
              {groupSelectedIds.size > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-[100px] overflow-y-auto">
                  {Array.from(groupSelectedIds).map((uid) => {
                    const p = availableUsers.find((u) => u.id === uid)
                    const name = p?.full_name ?? 'Unknown'
                    return (
                      <span key={uid} className="inline-flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm flex-shrink-0">
                        <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 bg-gradient-to-br', getUserTypeColor(p?.user_type || 'patient'))}>{getInitials(name)}</span>
                        <span className="text-sm font-medium text-slate-800 max-w-[120px] truncate">{name}</span>
                        <button type="button" onClick={() => toggleGroupMember(uid)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600" aria-label={`Remove ${name}`}><X className="h-3.5 w-3.5" /></button>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-1">Search and tap below to add people.</p>
              )}
            </div>

            <div className="space-y-2 flex flex-col min-h-0">
              <label className="text-sm font-medium text-slate-700">Add people</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={groupMemberSearch} onChange={(e) => setGroupMemberSearch(e.target.value)} placeholder="Search by name..." className="pl-9 h-10" />
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden" style={{ minHeight: 120, maxHeight: 200 }}>
                <ScrollArea className="h-[200px]">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8"><LoadingSpinner size="lg" className="text-slate-400" /></div>
                  ) : groupFilteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm"><Users className="h-10 w-10 mb-2 opacity-50" /><p>No one found. Try a different search.</p></div>
                  ) : (
                    <div className="p-2 space-y-0.5">
                      {groupFilteredUsers.map((p) => {
                        const selected = groupSelectedIds.has(p.id)
                        return (
                          <button key={p.id} type="button" onClick={() => toggleGroupMember(p.id)} className={cn('w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors', selected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-slate-50 border border-transparent')}>
                            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 bg-gradient-to-br', getUserTypeColor(p.user_type || 'patient'))}>{getInitials(p.full_name)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate text-sm">{p.full_name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">{getUserTypeIcon(p.user_type || 'patient')}{getUserTypeLabel(p.user_type || 'patient')}</p>
                            </div>
                            {selected ? <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0"><Check className="h-3.5 w-3.5 text-white" /></div> : <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setGroupTitle(''); setGroupMemberSearch(''); setGroupSelectedIds(new Set()); }}>Clear</Button>
            <Button onClick={createGroup} disabled={!groupTitle.trim() || groupSelectedIds.size === 0} className="bg-teal-600 hover:bg-teal-700 min-w-[120px]">Create group</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Controls (Manage group) - Full admin tools */}
      <Dialog open={showGroupControls} onOpenChange={(open) => { setShowGroupControls(open); if (!open) setGroupDeleteConfirm(false) }}>
        <DialogContent size="lg" style={{width: '560px', maxHeight: '90vh'}} className="flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage group
            </DialogTitle>
          </DialogHeader>
          {selectedThread && selectedThread.thread_type === 'group' && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              {/* Group info - editable by owner/admin */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Group info
                </h4>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Group name</label>
                  <Input
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="Group name"
                    className="h-10"
                    disabled={!isAdminOrOwner(selectedThread)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Description (optional)</label>
                  <Input
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    placeholder="Brief description"
                    className="h-10"
                    disabled={!isAdminOrOwner(selectedThread)}
                  />
                </div>
                {isAdminOrOwner(selectedThread) && (
                  <Button size="sm" onClick={updateGroupInfo} disabled={groupControlsSaving}>
                    {groupControlsSaving ? <LoadingSpinner size="sm" className="me-2" /> : <Pencil className="h-4 w-4 me-2" />}
                    Save changes
                  </Button>
                )}
              </div>

              {/* Add members - owner/admin */}
              {isAdminOrOwner(selectedThread) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add members
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from(addMembersIds).map((uid) => {
                      const p = availableUsers.find(u => u.id === uid)
                      const name = p?.full_name ?? 'Unknown'
                      return (
                        <span key={uid} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-teal-50 border border-teal-200 text-sm">
                          <span className="font-medium truncate max-w-[100px]">{name}</span>
                          <button type="button" onClick={() => setAddMembersIds(prev => { const n = new Set(prev); n.delete(uid); return n })} className="p-0.5 rounded hover:bg-teal-100"><X className="h-3.5 w-3.5" /></button>
                        </span>
                      )
                    })}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={addMembersSearch} onChange={(e) => setAddMembersSearch(e.target.value)} placeholder="Search to add..." className="pl-9 h-10" />
                  </div>
                  <ScrollArea className="h-[140px] rounded-lg border p-2">
                    {usersLoading ? (
                      <div className="flex justify-center py-6"><LoadingSpinner size="lg" className="text-slate-400" /></div>
                    ) : addMembersFilteredUsers.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4 text-center">No users found</p>
                    ) : (
                      <div className="space-y-0.5">
                        {addMembersFilteredUsers.slice(0, 20).map((p) => {
                          const selected = addMembersIds.has(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setAddMembersIds(prev => { const n = new Set(prev); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n })}
                              className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg text-left', selected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-slate-50')}
                            >
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 bg-gradient-to-br', avatarGradientFor(p.id))}>{getInitials(p.full_name)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate text-sm">{p.full_name}</p>
                                <p className="text-xs text-slate-500">{getUserTypeLabel(p.user_type || 'patient')}</p>
                              </div>
                              {selected ? <Check className="h-5 w-5 text-teal-600 flex-shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <Button size="sm" onClick={addMembersToGroup} disabled={addMembersIds.size === 0 || groupControlsSaving}>
                    {groupControlsSaving ? <LoadingSpinner size="sm" className="me-2" /> : <UserPlus className="h-4 w-4 me-2" />}
                    Add {addMembersIds.size > 0 ? addMembersIds.size : ''} member(s)
                  </Button>
                </div>
              )}

              {/* Members list */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Members ({(selectedThread.members || []).length})</h4>
                <ScrollArea className="h-[180px] rounded-lg border p-2">
                  <div className="space-y-1 pr-2">
                    {(selectedThread.members || []).map((m: any) => {
                      const uid = m.user_id
                      const profile = (m.profile || {}) as { full_name?: string }
                      const name = (profile.full_name || '').trim() || 'Unknown'
                      const role = (m.role || 'member') as string
                      const isOwner = role === 'owner'
                      const isAdmin = role === 'admin'
                      const canRemove = isAdminOrOwner(selectedThread) && uid !== user?.id && !isOwner
                      const canToggleAdmin = getUserRole(selectedThread) === 'owner' && uid !== user?.id && !isOwner
                      return (
                        <div key={uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 bg-gradient-to-br', avatarGradientFor(uid))}>
                            {getInitials(name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate text-sm">{name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              {isOwner && <Crown className="h-3 w-3" />}
                              {isAdmin && !isOwner && <Shield className="h-3 w-3" />}
                              {role}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {canToggleAdmin && (
                              <Button variant="ghost" size="sm" onClick={() => toggleMemberAdmin(uid)} title={isAdmin ? 'Remove admin' : 'Make admin'}>
                                <Shield className={cn('h-4 w-4', isAdmin && 'text-teal-600')} />
                              </Button>
                            )}
                            {canRemove && (
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeGroupMember(uid)} title="Remove from group">
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Danger zone */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold text-slate-700">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={leaveGroup}>
                    <LogOut className="h-4 w-4 me-1" /> Leave group
                  </Button>
                  {getUserRole(selectedThread) === 'owner' && (
                    <>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setGroupDeleteConfirm(true)}>
                        <Trash2 className="h-4 w-4 me-1" /> Delete group
                      </Button>
                      <AlertDialog open={groupDeleteConfirm} onOpenChange={setGroupDeleteConfirm}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Delete group?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the group and all messages. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteGroup} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { 
  MessageCircle, Search, Plus, Users, ArrowLeft,
  Send, Paperclip, MoreVertical, Check, CheckCheck, Phone, Video,
  Star, Bell, BellOff, Trash2, Archive, X, Stethoscope, Pill,
  TestTube, Building2, Truck, User, MapPin, Filter, RefreshCw, Image
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { ensureOtherUserBusinessName } from '@/lib/chat/chat-error-and-hydrate'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

// Types
interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  user_type?: string
  is_online?: boolean
  professional_id?: string
  wilaya?: string
  rating?: number
  is_verified?: boolean
}

interface ThreadMember {
  thread_id: string
  user_id: string
  role: string
  joined_at: string
  profile?: Profile
}

interface Message {
  id: string
  thread_id: string
  sender_id: string
  content: string | null
  message_type: string
  reply_to_message_id: string | null
  is_deleted: boolean
  edited_at: string | null
  created_at: string
  sender?: Profile
}

interface Thread {
  id: string
  thread_type: 'direct' | 'group'
  title: string | null
  created_by: string | null
  updated_at: string
  members?: ThreadMember[]
  last_message?: Message | null
  unread_count?: number
  other_user?: Profile | null
}

// Utility functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatMessageTime(date: string): string {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function getUserTypeIcon(type: string) {
  switch(type) {
    case 'doctor': return <Stethoscope className="h-4 w-4" />
    case 'pharmacy': return <Pill className="h-4 w-4" />
    case 'laboratory': return <TestTube className="h-4 w-4" />
    case 'clinic': return <Building2 className="h-4 w-4" />
    case 'ambulance': return <Truck className="h-4 w-4" />
    default: return <User className="h-4 w-4" />
  }
}

function getUserTypeColor(type: string) {
  switch(type) {
    case 'doctor': return 'from-blue-500 to-indigo-600'
    case 'pharmacy': return 'from-green-500 to-emerald-600'
    case 'laboratory': return 'from-purple-500 to-violet-600'
    case 'clinic': return 'from-pink-500 to-rose-600'
    case 'ambulance': return 'from-red-500 to-orange-600'
    default: return 'from-teal-500 to-cyan-600'
  }
}

function getUserTypeLabel(type: string) {
  switch(type) {
    case 'doctor': return 'Doctor'
    case 'pharmacy': return 'Pharmacy'
    case 'laboratory': return 'Laboratory'
    case 'clinic': return 'Clinic'
    case 'ambulance': return 'Ambulance'
    default: return 'Patient'
  }
}

export default function MessagesPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  
  // Auth state
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Chat state
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  
  // UI state
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  
  // Provider discovery state
  const [availableProviders, setAvailableProviders] = useState<Profile[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)
  const [providerSearch, setProviderSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  
  // Refs for auto-scroll and file upload
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])
  
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }
      setUser(authUser)
      setLoading(false)
    }
    loadUser()
  }, [supabase])

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!user) return
    setThreadsLoading(true)
    
    try {
      let memberships: { thread_id: string }[] | null = null
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

      if (!memberships?.length) {
        setThreads([])
        return
      }

      const threadIds = memberships.map(m => m.thread_id)

      const { data: threadsData } = await supabase
        .from('chat_threads')
        .select('*')
        .in('id', threadIds)
        .order('updated_at', { ascending: false })

      if (!threadsData?.length) {
        setThreads([])
        return
      }

      const enrichedThreads = await Promise.all(
        threadsData.map(async (thread) => {
          const { data: members } = await supabase
            .from('chat_thread_members')
            .select('*, profile:profiles(*)')
            .eq('thread_id', thread.id)
            .is('left_at', null)

          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('*, sender:profiles(*)')
            .eq('thread_id', thread.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const otherMember = members?.find(m => m.user_id !== user.id)
          const rawOther = thread.thread_type === 'direct' ? otherMember?.profile : null
          const other_user = otherMember && rawOther
            ? await ensureOtherUserBusinessName(supabase, otherMember.user_id, rawOther as Record<string, unknown>)
            : rawOther

          return {
            ...thread,
            members: members || [],
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
    } catch (err) {
      console.error('Error loading threads:', err)
    }
    
    setThreadsLoading(false)
  }, [supabase, user])

  useEffect(() => {
    if (user) {
      loadThreads()
      
      // Real-time subscription
      const channel = supabase
        .channel(`dashboard-messages-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
          loadThreads()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, user, loadThreads])

  // Load messages when thread selected
  useEffect(() => {
    if (!selectedThread || !user) {
      setMessages([])
      setMessagesLoading(false)
      return
    }
    
    const loadMessages = async () => {
      setMessagesLoading(true)
      
      try {
        const { data } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles(*)')
          .eq('thread_id', selectedThread.id)
          .order('created_at', { ascending: true })
          .limit(100)

        setMessages(data || [])

        // Mark as read (ignore if column missing)
        if (data?.length) {
          try {
            const lastMsg = data[data.length - 1]
            await supabase
              .from('chat_thread_members')
              .update({ last_read_message_id: lastMsg.id })
              .eq('thread_id', selectedThread.id)
              .eq('user_id', user.id)
          } catch (_) {}
        }
      } catch (err) {
        console.error('Error loading messages:', err)
      } finally {
        setMessagesLoading(false)
      }
    }
    
    loadMessages()

    // Real-time for messages
    const channel = supabase
      .channel(`messages-${selectedThread.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `thread_id=eq.${selectedThread.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles(*)')
          .eq('id', payload.new.id)
          .single()
        
        if (data) {
          setMessages(prev => [...prev, data])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user, selectedThread])

  // Load available providers when opening new chat dialog
  const loadAvailableProviders = useCallback(async () => {
    if (!user) return
    setProvidersLoading(true)

    try {
      // Load ALL professionals (remove strict status filter for testing)
      const { data: professionals, error: profError } = await supabase
        .from('professionals')
        .select('id, auth_user_id, business_name, type, wilaya, commune, is_verified, is_active, rating, review_count, status')
        .order('business_name')

      if (profError) {
        console.error('Error loading professionals:', profError)
      } else {
        console.log('Loaded professionals:', professionals?.length)
      }

      // Load patients/regular users from profiles
      const { data: patients, error: patError } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url')
        .neq('id', user.id)
        .order('full_name')
        .limit(100)

      if (patError) {
        console.error('Error loading patients:', patError)
      } else {
        console.log('Loaded patients:', patients?.length)
      }

      const merged: Profile[] = []
      
      // Add professionals (with or without auth_user_id)
      if (professionals && professionals.length > 0) {
        for (const p of professionals) {
          // Skip if this is the current user
          if (p.auth_user_id === user.id) continue
          
          // Use auth_user_id if available, otherwise use the professional's own id
          const oderId = p.auth_user_id || p.id
          
          merged.push({
            id: oderId,
            full_name: p.business_name || 'Unknown Provider',
            user_type: p.type || 'doctor',
            avatar_url: null,
            is_online: p.is_active || false,
            professional_id: p.id,
            wilaya: p.wilaya || undefined,
            rating: p.rating || undefined,
            is_verified: p.is_verified || p.status === 'verified'
          })
        }
      }

      // Add patients (avoid duplicates)
      if (patients && patients.length > 0) {
        for (const p of patients) {
          if (!merged.find(m => m.id === p.id)) {
            merged.push({
              id: p.id,
              full_name: p.full_name || 'Unknown User',
              user_type: p.user_type || 'patient',
              avatar_url: p.avatar_url,
              is_online: false
            })
          }
        }
      }

      console.log('Total merged profiles:', merged.length)
      setAvailableProviders(merged)
    } catch (err) {
      console.error('Error loading providers:', err)
    }

    setProvidersLoading(false)
  }, [supabase, user])

  // Load providers when dialog opens
  useEffect(() => {
    if (showNewChat) {
      loadAvailableProviders()
    }
  }, [showNewChat, loadAvailableProviders])

  // Filter providers based on search and type filter
  const filteredProviders = useMemo(() => {
    return availableProviders.filter(p => {
      // Type filter
      if (providerFilter !== 'all' && p.user_type !== providerFilter) return false
      
      // Search filter
      if (providerSearch) {
        const search = providerSearch.toLowerCase()
        const nameMatch = p.full_name.toLowerCase().includes(search)
        const typeMatch = p.user_type?.toLowerCase().includes(search)
        const locationMatch = p.wilaya?.toLowerCase().includes(search)
        if (!nameMatch && !typeMatch && !locationMatch) return false
      }
      
      return true
    })
  }, [availableProviders, providerFilter, providerSearch])

  // Create direct thread
  const createDirectThread = async (otherUserId: string) => {
    if (!user || otherUserId === user.id) return null

    try {
      // Check for existing thread
      const { data: existingMemberships } = await supabase
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', user.id)

      if (existingMemberships?.length) {
        for (const m of existingMemberships) {
          const { data: thread } = await supabase
            .from('chat_threads')
            .select('*')
            .eq('id', m.thread_id)
            .eq('thread_type', 'direct')
            .single()

          if (thread) {
            const { data: members } = await supabase
              .from('chat_thread_members')
              .select('user_id')
              .eq('thread_id', thread.id)

            const memberIds = members?.map(m => m.user_id) || []
            if (memberIds.includes(otherUserId) && memberIds.length === 2) {
              // Found existing thread
              const { data: threadMembers } = await supabase
                .from('chat_thread_members')
                .select('*, profile:profiles(*)')
                .eq('thread_id', thread.id)

              const otherMember = threadMembers?.find(tm => tm.user_id !== user.id)
              return {
                ...thread,
                members: threadMembers || [],
                other_user: otherMember?.profile
              }
            }
          }
        }
      }

      // Create new thread
      const { data: newThread, error: threadErr } = await supabase
        .from('chat_threads')
        .insert({ thread_type: 'direct', created_by: user.id })
        .select()
        .single()

      if (threadErr) throw threadErr

      await supabase.from('chat_thread_members').insert([
        { thread_id: newThread.id, user_id: user.id, role: 'member' },
        { thread_id: newThread.id, user_id: otherUserId, role: 'member' },
      ])

      // Get other user profile (use business_name for professionals)
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single()

      const other_user = await ensureOtherUserBusinessName(supabase, otherUserId, otherProfile as Record<string, unknown>)

      return {
        ...newThread,
        members: [],
        other_user
      }
    } catch (err) {
      console.error('Error creating thread:', err)
      return null
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!selectedThread || !draft.trim() || sending || !user) return
    setSending(true)

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: selectedThread.id,
          sender_id: user.id,
          content: draft.trim(),
          message_type: 'text',
        })
        .select('*, sender:profiles(*)')
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
      setDraft('')

      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedThread.id)
    } catch (err) {
      console.error('Error sending message:', err)
    }

    setSending(false)
  }

  const getThreadName = (thread: Thread) => {
    if (thread.thread_type === 'group') return thread.title || 'Group Chat'
    const other = thread.members?.find(m => m.user_id !== user?.id)
    return other?.profile?.full_name || 'Chat'
  }

  const getThreadAvatar = (thread: Thread) => {
    if (thread.thread_type === 'group') return thread.title ? getInitials(thread.title) : 'GC'
    const other = thread.members?.find(m => m.user_id !== user?.id)
    return other?.profile?.full_name ? getInitials(other.profile.full_name) : '??'
  }

  // Start chat with a provider
  const handleStartChat = async (provider: Profile) => {
    const thread = await createDirectThread(provider.id)
    if (thread) {
      setSelectedThread(thread as Thread)
      setShowNewChat(false)
      await loadThreads()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" className="text-teal-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <MessageCircle className="h-16 w-16 text-slate-300" />
        <h1 className="text-xl font-semibold text-slate-700">Please login to view messages</h1>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-slate-50">
      {/* Sidebar - Thread List */}
      <div className={cn(
        'w-80 bg-white border-r border-slate-200 flex flex-col',
        selectedThread && 'hidden md:flex'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-900">Messages</h1>
            <Button 
              size="sm"
              onClick={() => setShowNewChat(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" className="border-slate-400" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 px-4">
              <MessageCircle className="h-12 w-12 mb-3" />
              <p className="text-sm text-center font-medium">No conversations yet</p>
              <p className="text-xs text-center mt-1">
                Start chatting with healthcare providers
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowNewChat(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Find Providers
              </Button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads
                .filter(t => {
                  if (!searchQuery) return true
                  return getThreadName(t).toLowerCase().includes(searchQuery.toLowerCase())
                })
                .map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={cn(
                      'w-full p-3 rounded-xl text-left transition-all',
                      selectedThread?.id === thread.id
                        ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
                        thread.thread_type === 'group'
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
                      )}>
                        {thread.thread_type === 'group' ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getThreadAvatar(thread)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900 truncate">
                            {getThreadName(thread)}
                          </span>
                          {thread.last_message && (
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {formatMessageTime(thread.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {thread.last_message?.is_deleted
                            ? 'Message deleted'
                            : thread.last_message?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        'flex-1 flex flex-col bg-white',
        !selectedThread && 'hidden md:flex'
      )}>
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedThread(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
                  'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
                )}>
                  {getThreadAvatar(selectedThread)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{getThreadName(selectedThread)}</p>
                  <p className="text-xs text-slate-400">
                    {selectedThread.thread_type === 'group' 
                      ? `${selectedThread.members?.length || 0} members`
                      : 'Direct message'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Star className="h-4 w-4 mr-2" />
                      Star conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute notifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="lg" className="border-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageCircle className="h-16 w-16 mb-3 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => {
                    const isOwn = message.sender_id === user.id
                    const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.sender_id !== message.sender_id)

                    return (
                      <div
                        key={message.id}
                        className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}
                      >
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {message.sender?.full_name ? getInitials(message.sender.full_name) : '??'}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        
                        <div className="max-w-[70%]">
                          {!isOwn && showAvatar && (
                            <p className="text-xs text-slate-400 mb-1 ml-1">
                              {message.sender?.full_name || 'Unknown'}
                            </p>
                          )}
                          <div
                            className={cn(
                              'px-4 py-2.5 rounded-2xl',
                              isOwn
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-br-md'
                                : 'bg-white text-slate-900 rounded-bl-md shadow-sm border border-slate-100'
                            )}
                          >
                            {message.is_deleted ? (
                              <p className="italic text-sm opacity-60">Message deleted</p>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                          </div>
                          <div className={cn(
                            'flex items-center gap-1 mt-1 text-xs text-slate-400',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}>
                            <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                            {message.edited_at && <span>(edited)</span>}
                            {isOwn && <CheckCheck className="h-3 w-3 text-teal-400" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-slate-100 bg-white">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  
                  // For now, show a toast/alert that file upload is coming soon
                  alert(`File upload coming soon! Selected: ${file.name}`)
                  
                  // TODO: Implement actual file upload to Supabase Storage
                  // const { data, error } = await supabase.storage
                  //   .from('chat-attachments')
                  //   .upload(`${user.id}/${Date.now()}-${file.name}`, file)
                  
                  e.target.value = '' // Reset input
                }}
              />
              <div className="flex items-end gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className={cn(
                    'h-11 w-11 rounded-xl',
                    draft.trim() && !sending
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {sending ? (
                    <LoadingSpinner size="md" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-teal-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Welcome to Messages</h2>
            <p className="text-sm text-center max-w-sm mb-6">
              Connect with healthcare providers, pharmacies, laboratories and more
            </p>
            <Button 
              onClick={() => setShowNewChat(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start a conversation
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Dialog - Now with Provider Discovery */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Find Someone to Chat With</span>
              <Button variant="ghost" size="icon" onClick={loadAvailableProviders}>
                <RefreshCw className={cn("h-4 w-4", providersLoading && "animate-spin")} />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Search by name, type, or location..."
                className="pl-9"
              />
            </div>

            {/* Type Filter Tabs */}
            <Tabs value={providerFilter} onValueChange={setProviderFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="all" className="text-xs py-2">All</TabsTrigger>
                <TabsTrigger value="doctor" className="text-xs py-2">
                  <Stethoscope className="h-3 w-3 mr-1" />
                  Doctors
                </TabsTrigger>
                <TabsTrigger value="pharmacy" className="text-xs py-2">
                  <Pill className="h-3 w-3 mr-1" />
                  Pharmacies
                </TabsTrigger>
                <TabsTrigger value="laboratory" className="text-xs py-2">
                  <TestTube className="h-3 w-3 mr-1" />
                  Labs
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Provider List */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-[300px]">
              {providersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" className="border-slate-400" />
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Users className="h-12 w-12 mb-3" />
                  <p className="text-sm font-medium">No users found</p>
                  <p className="text-xs text-center mt-1 max-w-xs">
                    {providerSearch 
                      ? 'Try a different search term'
                      : availableProviders.length === 0
                        ? 'Make sure the chat database tables are set up. Run scripts/012-chat-complete-v2.sql in Supabase.'
                        : 'No users match this filter'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={loadAvailableProviders}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 px-1 mb-2">
                    {filteredProviders.length} {filteredProviders.length === 1 ? 'user' : 'users'} found
                  </p>
                  {filteredProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleStartChat(provider)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 hover:bg-slate-50 transition-all text-left"
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
                        getUserTypeColor(provider.user_type || 'patient')
                      )}>
                        {getInitials(provider.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">
                            {provider.full_name}
                          </p>
                          {provider.is_verified && (
                            <span className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {getUserTypeIcon(provider.user_type || 'patient')}
                            {getUserTypeLabel(provider.user_type || 'patient')}
                          </span>
                          {provider.wilaya && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {provider.wilaya}
                            </span>
                          )}
                          {provider.rating && provider.rating > 0 && (
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-500" />
                              {provider.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <MessageCircle className="h-5 w-5 text-teal-500 flex-shrink-0" />
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

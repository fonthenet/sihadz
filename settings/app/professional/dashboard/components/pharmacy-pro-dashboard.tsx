'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  Pill, Calendar, Users, DollarSign, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Settings, Search,
  FileText, MessageSquare, Star, Package, Truck, ShoppingCart,
  BarChart3, Wallet, ArrowUpRight, ArrowDownRight,
  Filter, Download, RefreshCw, MoreHorizontal, ChevronRight, Plus,
  MapPin, Mail, Volume2, Eye, LayoutDashboard, Cog,
  LogOut, ChevronLeft, Clipboard, Banknote, BarChart2, Box,
  Layers, QrCode, Scan, Receipt, AlertTriangle, ThermometerSun,
  PackageCheck, PackageX, Send, Archive, ArrowLeft, Paperclip, CheckCheck,
  Phone, Video, BellOff, Trash2, User, Stethoscope, TestTube, Building2,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'

interface PharmacyProDashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

// ============================================
// MESSAGES SECTION COMPONENT
// ============================================
interface MessagesSectionProps {
  professional: any
}

interface ChatProfile {
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

interface ChatThread {
  id: string
  thread_type: 'direct' | 'group'
  title: string | null
  created_by: string | null
  updated_at: string
  members?: any[]
  last_message?: any
  unread_count?: number
  other_user?: ChatProfile | null
}

interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string | null
  message_type: string
  is_deleted: boolean
  edited_at: string | null
  created_at: string
  sender?: ChatProfile
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

function MessagesSection({ professional }: MessagesSectionProps) {
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [user, setUser] = useState<any>(null)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  
  const [availableUsers, setAvailableUsers] = useState<ChatProfile[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState('all')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) setUser(authUser)
    }
    loadUser()
  }, [supabase])

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
          return {
            ...thread,
            members: members || [],
            last_message: lastMsg,
            unread_count: 0,
            other_user: thread.thread_type === 'direct' ? otherMember?.profile : null,
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
      setThreads([])
    } finally {
      setThreadsLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (user) {
      loadThreads()
      const channel = supabase
        .channel(`pro-messages-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
          loadThreads()
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [supabase, user, loadThreads])

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
      } catch (err) {
        console.error('Error loading messages:', err)
      } finally {
        setMessagesLoading(false)
      }
    }
    
    loadMessages()
    
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
        if (data) setMessages(prev => [...prev, data])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, user, selectedThread])

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

      const merged: ChatProfile[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Unknown User',
        user_type: p.user_type || 'patient',
        avatar_url: p.avatar_url,
        is_online: false
      }))

      setAvailableUsers(merged)
    } catch (err) {
      console.error('Error loading users:', err)
    }
    setUsersLoading(false)
  }, [supabase, user])

  useEffect(() => {
    if (showNewChat) loadAvailableUsers()
  }, [showNewChat, loadAvailableUsers])

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

  const createDirectThread = async (otherUserId: string) => {
    if (!user || otherUserId === user.id) return null
    try {
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
              const { data: threadMembers } = await supabase
                .from('chat_thread_members')
                .select('*, profile:profiles(*)')
                .eq('thread_id', thread.id)
              const otherMember = threadMembers?.find(tm => tm.user_id !== user.id)
              return { ...thread, members: threadMembers || [], other_user: otherMember?.profile }
            }
          }
        }
      }

      const { data: newThread, error } = await supabase
        .from('chat_threads')
        .insert({ thread_type: 'direct', created_by: user.id })
        .select()
        .single()

      if (error) throw error

      await supabase.from('chat_thread_members').insert([
        { thread_id: newThread.id, user_id: user.id, role: 'member' },
        { thread_id: newThread.id, user_id: otherUserId, role: 'member' },
      ])

      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single()

      return { ...newThread, members: [], other_user: otherProfile }
    } catch (err) {
      console.error('Error creating thread:', err)
      return null
    }
  }

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

  const handleStartChat = async (profile: ChatProfile) => {
    const thread = await createDirectThread(profile.id)
    if (thread) {
      setSelectedThread(thread as ChatThread)
      setShowNewChat(false)
      await loadThreads()
    }
  }

  const getThreadName = (thread: ChatThread) => {
    if (thread.thread_type === 'group') return thread.title || 'Group Chat'
    const other = thread.members?.find(m => m.user_id !== user?.id)
    return other?.profile?.full_name || 'Chat'
  }

  const getThreadAvatar = (thread: ChatThread) => {
    if (thread.thread_type === 'group') return thread.title ? getInitials(thread.title) : 'GC'
    const other = thread.members?.find(m => m.user_id !== user?.id)
    return other?.profile?.full_name ? getInitials(other.profile.full_name) : '??'
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Thread List Sidebar */}
      <div className={cn(
        'w-80 border-r flex flex-col bg-slate-50',
        selectedThread && 'hidden md:flex'
      )}>
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Conversations</h2>
            <Button size="sm" onClick={() => setShowNewChat(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 bg-slate-50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {threadsLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="md" className="text-slate-400" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 px-4">
              <MessageSquare className="h-12 w-12 mb-3" />
              <p className="text-sm text-center font-medium">No conversations yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowNewChat(true)}>
                <Plus className="h-4 w-4 mr-1" /> Start a Chat
              </Button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads.filter(t => !searchQuery || getThreadName(t).toLowerCase().includes(searchQuery.toLowerCase()))
                .map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      selectedThread?.id === thread.id
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'hover:bg-white'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
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
                        <p className="text-xs text-slate-500 truncate mt-0.5">
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-semibold">
                  {getThreadAvatar(selectedThread)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{getThreadName(selectedThread)}</p>
                  <p className="text-xs text-slate-400">Direct message</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-slate-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="md" className="text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, idx) => {
                    const isOwn = message.sender_id === user?.id
                    const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.sender_id !== message.sender_id)
                    return (
                      <div key={message.id} className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                        {!isOwn && showAvatar && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {message.sender?.full_name ? getInitials(message.sender.full_name) : '??'}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-7" />}
                        <div className="max-w-[70%]">
                          <div className={cn(
                            'px-3 py-2 rounded-2xl text-sm',
                            isOwn
                              ? 'bg-emerald-600 text-white rounded-br-md'
                              : 'bg-white text-slate-900 rounded-bl-md shadow-sm border'
                          )}>
                            {message.is_deleted ? (
                              <p className="italic opacity-60">Message deleted</p>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                          </div>
                          <div className={cn('flex items-center gap-1 mt-1 text-xs text-slate-400', isOwn ? 'justify-end' : 'justify-start')}>
                            <span>{format(new Date(message.created_at), 'HH:mm')}</span>
                            {isOwn && <CheckCheck className="h-3 w-3 text-emerald-400" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    style={{ minHeight: '40px', maxHeight: '100px' }}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className={cn('h-10 w-10 rounded-lg', draft.trim() && !sending ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-100 text-slate-400')}
                >
                  {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Messages</h3>
            <p className="text-sm text-center max-w-sm mb-4">
              Connect with patients and other healthcare providers
            </p>
            <Button onClick={() => setShowNewChat(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Start a conversation
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="pl-9"
              />
            </div>

            <Tabs value={userFilter} onValueChange={setUserFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="patient" className="text-xs">Patients</TabsTrigger>
                <TabsTrigger value="doctor" className="text-xs">Doctors</TabsTrigger>
              </TabsList>
            </Tabs>

            <ScrollArea className="flex-1 min-h-[250px]">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="md" className="text-slate-400" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Users className="h-10 w-10 mb-2" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="space-y-1 pr-2">
                  {filteredUsers.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleStartChat(profile)}
                      className="w-full p-2 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-all text-left"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
                        getUserTypeColor(profile.user_type || 'patient')
                      )}>
                        {getInitials(profile.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">{profile.full_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {getUserTypeIcon(profile.user_type || 'patient')}
                          {getUserTypeLabel(profile.user_type || 'patient')}
                        </p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// MOCK DATA
// ============================================
const salesData = [
  { month: 'Jan', sales: 890000, prescriptions: 145, orders: 312 },
  { month: 'Feb', sales: 1020000, prescriptions: 168, orders: 389 },
  { month: 'Mar', sales: 945000, prescriptions: 152, orders: 345 },
  { month: 'Apr', sales: 1180000, prescriptions: 189, orders: 421 },
  { month: 'May', sales: 1095000, prescriptions: 175, orders: 398 },
  { month: 'Jun', sales: 1340000, prescriptions: 212, orders: 478 },
]

const weeklyOrders = [
  { day: 'Sat', orders: 12, delivered: 10 },
  { day: 'Sun', orders: 45, delivered: 42 },
  { day: 'Mon', orders: 58, delivered: 55 },
  { day: 'Tue', orders: 62, delivered: 58 },
  { day: 'Wed', orders: 48, delivered: 45 },
  { day: 'Thu', orders: 55, delivered: 52 },
  { day: 'Fri', orders: 38, delivered: 36 },
]

const orderSources = [
  { name: 'Walk-in', value: 45, color: '#0891b2' },
  { name: 'Prescriptions', value: 35, color: '#7c3aed' },
  { name: 'Delivery', value: 20, color: '#f59e0b' },
]

const topProducts = [
  { name: 'Paracetamol 500mg', sales: 245, stock: 1200, status: 'good' },
  { name: 'Amoxicillin 500mg', sales: 189, stock: 450, status: 'good' },
  { name: 'Ibuprofen 400mg', sales: 167, stock: 89, status: 'low' },
  { name: 'Omeprazole 20mg', sales: 145, stock: 320, status: 'good' },
  { name: 'Metformin 850mg', sales: 132, stock: 15, status: 'critical' },
]

export function PharmacyProDashboard({ professional, onSignOut }: PharmacyProDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isOnDuty, setIsOnDuty] = useState(true)
  const [acceptingOrders, setAcceptingOrders] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(3)

  const [stats, setStats] = useState({
    todayOrders: 67,
    pendingPrescriptions: 12,
    deliveryQueue: 8,
    lowStockItems: 15,
    monthlyRevenue: 1340000,
    revenueGrowth: 18.5,
    rating: 4.7,
    reviewCount: 234,
    fulfillmentRate: 97,
    avgDeliveryTime: 28,
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    
    const { data: prescList } = await supabase
      .from('prescriptions')
      .select('*, doctor:healthcare_professionals!prescriptions_doctor_id_fkey(business_name), patient:profiles!prescriptions_patient_id_fkey(full_name)')
      .eq('pharmacy_id', professional.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (prescList) setPrescriptions(prescList)
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, badge: stats.pendingPrescriptions },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: stats.todayOrders },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: null },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: stats.lowStockItems },
    { id: 'delivery', label: 'Delivery', icon: Truck, badge: stats.deliveryQueue },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]

  const quickActions = [
    { label: 'Process Order', icon: CheckCircle, color: 'bg-emerald-500', action: () => {} },
    { label: 'Scan Prescription', icon: Scan, color: 'bg-cyan-500', action: () => {} },
    { label: 'Add Stock', icon: Package, color: 'bg-violet-500', action: () => {} },
    { label: 'New Delivery', icon: Truck, color: 'bg-amber-500', action: () => {} },
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">PharmaPro</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Profile */}
        <div className={cn("p-4 border-b border-slate-200 dark:border-slate-800", sidebarCollapsed && "px-2")}>
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <Avatar className={cn("ring-2 ring-emerald-500/50 ring-offset-2", sidebarCollapsed ? "h-10 w-10" : "h-12 w-12")}>
              <AvatarImage src={professional?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold">
                {professional?.business_name?.charAt(0) || 'P'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{professional?.business_name || 'Pharmacy'}</p>
                <p className="text-xs text-muted-foreground truncate">{professional?.city || 'Location'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-2 h-2 rounded-full", isOnDuty ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                  <span className="text-xs text-muted-foreground">{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">On Duty Mode</span>
              <Switch checked={isOnDuty} onCheckedChange={setIsOnDuty} />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className={cn("space-y-1", sidebarCollapsed ? "px-2" : "px-3")}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
                  sidebarCollapsed ? "justify-center p-3" : "px-4 py-3",
                  activeSection === item.id
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <Badge className="bg-emerald-500 text-white text-xs px-2 py-0.5">{item.badge}</Badge>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <div className={cn("p-4 border-t border-slate-200 dark:border-slate-800 space-y-2", sidebarCollapsed && "px-2")}>
          {!sidebarCollapsed && (
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25">
              <Scan className="h-4 w-4 mr-2" />
              Scan Prescription
            </Button>
          )}
          <Button 
            variant="ghost" 
            className={cn("w-full text-red-500 hover:text-red-600 hover:bg-red-50", sidebarCollapsed && "px-0")}
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders, medications..."
                className="pl-10 w-72 bg-slate-50 dark:bg-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                {unreadMessages + stats.lowStockItems}
              </span>
            </Button>

            <Button variant="outline" size="icon" onClick={loadDashboardData} className="bg-transparent">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {quickActions.map((action, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    className="flex-shrink-0 gap-2 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                  >
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", action.color)}>
                      <action.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Today's Orders</p>
                        <p className="text-4xl font-bold mt-2">{stats.todayOrders}</p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+12 from yesterday</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Pending Prescriptions</p>
                        <p className="text-4xl font-bold mt-2">{stats.pendingPrescriptions}</p>
                        <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Awaiting processing</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-violet-100 text-sm font-medium">Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">{(stats.monthlyRevenue / 1000000).toFixed(1)}M</p>
                        <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+{stats.revenueGrowth}% growth</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Low Stock Alerts</p>
                        <p className="text-4xl font-bold mt-2">{stats.lowStockItems}</p>
                        <div className="flex items-center gap-1 mt-2 text-amber-100 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Items need restock</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Package className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Sales Overview</CardTitle>
                      <CardDescription>Monthly sales and order trends</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            formatter={(value: number) => [`${value.toLocaleString()} DZD`, 'Sales']}
                          />
                          <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Order Sources</CardTitle>
                    <CardDescription>Distribution by channel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderSources}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {orderSources.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-2">
                      {orderSources.map((source) => (
                        <div key={source.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                            <span className="text-sm font-medium">{source.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{source.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Prescriptions */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Pending Prescriptions</CardTitle>
                      <CardDescription>{stats.pendingPrescriptions} awaiting processing</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {prescriptions.length > 0 ? prescriptions.slice(0, 5).map((rx, i) => (
                        <div key={rx.id || i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="h-10 w-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {rx.patient?.full_name || 'Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Dr. {rx.doctor?.business_name || 'Unknown'} • {rx.medications?.length || 0} items
                            </p>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            rx.status === 'pending' && 'bg-amber-100 text-amber-700',
                            rx.status === 'processing' && 'bg-cyan-100 text-cyan-700',
                            rx.status === 'ready' && 'bg-green-100 text-green-700',
                          )}>
                            {rx.status || 'pending'}
                          </Badge>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            Process
                          </Button>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending prescriptions</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products & Alerts */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Top Products</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {topProducts.slice(0, 4).map((product, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              product.status === 'good' && 'bg-green-500',
                              product.status === 'low' && 'bg-amber-500',
                              product.status === 'critical' && 'bg-red-500',
                            )} />
                            <span className="text-sm font-medium truncate max-w-[140px]">{product.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{product.sales} sold</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Fulfillment Rate</span>
                          <span className="font-semibold">{stats.fulfillmentRate}%</span>
                        </div>
                        <Progress value={stats.fulfillmentRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Avg Delivery Time</span>
                          <span className="font-semibold">{stats.avgDeliveryTime} min</span>
                        </div>
                        <Progress value={100 - stats.avgDeliveryTime} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Section */}
          {activeSection === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products..." className="pl-10 w-64" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Stock Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">SKU</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stock</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sales</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topProducts.map((product, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <Pill className="h-5 w-5 text-emerald-600" />
                                </div>
                                <p className="font-medium">{product.name}</p>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">SKU-{1000 + i}</td>
                            <td className="p-4 font-medium">{product.stock}</td>
                            <td className="p-4 text-muted-foreground">{product.sales} units</td>
                            <td className="p-4">
                              <Badge className={cn(
                                product.status === 'good' && 'bg-green-100 text-green-700',
                                product.status === 'low' && 'bg-amber-100 text-amber-700',
                                product.status === 'critical' && 'bg-red-100 text-red-700',
                              )}>
                                {product.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button variant="ghost" size="sm">Restock</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Pharmacy Settings</CardTitle>
                  <CardDescription>Manage your pharmacy preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">On Duty Mode</Label>
                      <p className="text-sm text-muted-foreground">Show as available for prescriptions</p>
                    </div>
                    <Switch checked={isOnDuty} onCheckedChange={setIsOnDuty} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Accept Online Orders</Label>
                      <p className="text-sm text-muted-foreground">Allow customers to order online</p>
                    </div>
                    <Switch checked={acceptingOrders} onCheckedChange={setAcceptingOrders} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Delivery Service</Label>
                      <p className="text-sm text-muted-foreground">Enable home delivery</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Allow Patient Messages</Label>
                      <p className="text-sm text-muted-foreground">Receive direct messages from patients</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>New Prescription Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified for new prescriptions</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>Low Stock Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Messages Section - Full Chat UI */}
          {activeSection === 'messages' && (
            <MessagesSection
              professional={professional}
            />
          )}

          {/* Placeholder sections */}
          {['prescriptions', 'orders', 'delivery', 'analytics', 'finances'].includes(activeSection) && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  {activeSection === 'prescriptions' && <FileText className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'orders' && <ShoppingCart className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'delivery' && <Truck className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'analytics' && <BarChart2 className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'finances' && <Banknote className="h-8 w-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {sidebarItems.find(i => i.id === activeSection)?.label}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Manage all your {activeSection.replace('-', ' ')} from this section.
                </p>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

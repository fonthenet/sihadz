'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  Send, Paperclip, Image as ImageIcon, FileText, MoreVertical, 
  Phone, Video, Search, Plus, Check, CheckCheck, Clock, X,
  Pill, FlaskConical, Calendar, Share2, AlertCircle,
  ArrowLeft, User, Building2, Stethoscope, UserPlus, Star
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { ar, fr, enUS } from 'date-fns/locale'

// Types
interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: string
  sender_name?: string
  content: string
  message_type: 'text' | 'image' | 'document' | 'prescription' | 'lab_result' | 'referral' | 'appointment'
  attachments?: Array<{
    url: string
    type: string
    name: string
    size?: number
  }>
  metadata?: Record<string, any>
  reply_to_id?: string
  is_edited?: boolean
  is_deleted?: boolean
  created_at: string
}

interface Conversation {
  id: string
  type: string
  title?: string
  participant_1_id: string
  participant_1_type: string
  participant_2_id: string
  participant_2_type: string
  related_patient_id?: string
  related_prescription_id?: string
  related_lab_request_id?: string
  last_message_text?: string
  last_message_at?: string
  last_message_sender_id?: string
  status: string
  // Joined data
  other_participant?: {
    id: string
    name: string
    type: string
    avatar_url?: string
    is_online?: boolean
  }
  unread_count?: number
}

interface ChatUser {
  id: string
  type: 'patient' | 'doctor' | 'pharmacy' | 'laboratory' | 'clinic'
  name: string
  avatar_url?: string
}

interface HealthcareMessagingProps {
  currentUser: ChatUser
  initialConversationId?: string
  contextType?: 'prescription' | 'lab_request' | 'appointment' | 'general'
  contextId?: string
  language?: 'ar' | 'fr' | 'en'
  onClose?: () => void
  embedded?: boolean
}

export function HealthcareMessaging({ 
  currentUser, 
  initialConversationId,
  contextType,
  contextId,
  language = 'ar',
  onClose,
  embedded = false
}: HealthcareMessagingProps) {
  const { toast } = useToast()
  const supabase = createBrowserClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileConversations, setShowMobileConversations] = useState(true)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  
  // New chat state
  const [newChatSearch, setNewChatSearch] = useState('')
  const [newChatResults, setNewChatResults] = useState<any[]>([])
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [addingFavorite, setAddingFavorite] = useState<string | null>(null)
  
  // Locale for date formatting
  const dateLocale = language === 'ar' ? ar : language === 'fr' ? fr : enUS

  // Labels
  const labels = {
    ar: {
      messages: 'الرسائل',
      newChat: 'محادثة جديدة',
      search: 'بحث...',
      typeMessage: 'اكتب رسالتك...',
      send: 'إرسال',
      today: 'اليوم',
      yesterday: 'أمس',
      online: 'متصل',
      offline: 'غير متصل',
      noMessages: 'لا توجد رسائل',
      startConversation: 'ابدأ محادثة',
      searchContacts: 'ابحث عن طبيب، صيدلية، أو مختبر...',
      noResults: 'لا توجد نتائج',
      prescription: 'وصفة طبية',
      labResult: 'نتائج تحليل',
      referral: 'إحالة طبية',
      attachment: 'مرفق',
      delivered: 'تم التسليم',
      read: 'تمت القراءة',
      doctor: 'طبيب',
      pharmacy: 'صيدلية',
      laboratory: 'مختبر',
      patient: 'مريض',
      clinic: 'عيادة',
    },
    fr: {
      messages: 'Messages',
      newChat: 'Nouvelle conversation',
      search: 'Rechercher...',
      typeMessage: 'Tapez votre message...',
      send: 'Envoyer',
      today: "Aujourd'hui",
      yesterday: 'Hier',
      online: 'En ligne',
      offline: 'Hors ligne',
      noMessages: 'Aucun message',
      startConversation: 'Démarrer une conversation',
      searchContacts: 'Rechercher un médecin, pharmacie ou laboratoire...',
      noResults: 'Aucun résultat',
      prescription: 'Ordonnance',
      labResult: 'Résultats de laboratoire',
      referral: 'Référence médicale',
      attachment: 'Pièce jointe',
      delivered: 'Livré',
      read: 'Lu',
      doctor: 'Médecin',
      pharmacy: 'Pharmacie',
      laboratory: 'Laboratoire',
      patient: 'Patient',
      clinic: 'Clinique',
    },
    en: {
      messages: 'Messages',
      newChat: 'New Chat',
      search: 'Search...',
      typeMessage: 'Type your message...',
      send: 'Send',
      today: 'Today',
      yesterday: 'Yesterday',
      online: 'Online',
      offline: 'Offline',
      noMessages: 'No messages',
      startConversation: 'Start a conversation',
      searchContacts: 'Search for a doctor, pharmacy, or laboratory...',
      noResults: 'No results',
      prescription: 'Prescription',
      labResult: 'Lab Results',
      referral: 'Medical Referral',
      attachment: 'Attachment',
      delivered: 'Delivered',
      read: 'Read',
      doctor: 'Doctor',
      pharmacy: 'Pharmacy',
      laboratory: 'Laboratory',
      patient: 'Patient',
      clinic: 'Clinic',
    },
  }
  
  const l = labels[language]

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:participant_1_id(id, full_name, avatar_url),
          participant_2:participant_2_id(id, full_name, avatar_url)
        `)
        .or(`participant_1_id.eq.${currentUser.id},participant_2_id.eq.${currentUser.id}`)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error

      // Enrich with other participant info
      const enrichedConversations = (data || []).map(conv => {
        const isParticipant1 = conv.participant_1_id === currentUser.id
        const otherParticipant = isParticipant1 ? conv.participant_2 : conv.participant_1
        const otherParticipantType = isParticipant1 ? conv.participant_2_type : conv.participant_1_type
        
        return {
          ...conv,
          other_participant: {
            id: otherParticipant?.id,
            name: otherParticipant?.full_name || 'Unknown',
            type: otherParticipantType,
            avatar_url: otherParticipant?.avatar_url,
          }
        }
      })

      setConversations(enrichedConversations)
      
      // Auto-select conversation if provided
      if (initialConversationId) {
        const found = enrichedConversations.find(c => c.id === initialConversationId)
        if (found) {
          setSelectedConversation(found)
          setShowMobileConversations(false)
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser.id, supabase, initialConversationId])

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!selectedConversation?.id) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
      
      // Mark as read
      await supabase
        .from('conversation_participants')
        .update({ 
          last_read_at: new Date().toISOString(),
          unread_count: 0 
        })
        .eq('conversation_id', selectedConversation.id)
        .eq('user_id', currentUser.id)
        
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [selectedConversation?.id, currentUser.id, supabase])

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
    }
  }, [selectedConversation, loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    if (!selectedConversation?.id) return

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id, supabase])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setIsSending(true)
    try {
      const messageData = {
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        sender_type: currentUser.type,
        sender_name: currentUser.name,
        content: newMessage.trim(),
        message_type: 'text',
        reply_to_id: replyTo?.id || null,
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData)

      if (error) throw error

      setNewMessage('')
      setReplyTo(null)
      inputRef.current?.focus()
    } catch (error: any) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsSending(false)
    }
  }

  // Fetch favorites when new chat dialog opens
  useEffect(() => {
    if (!showNewChat) return
    let cancelled = false
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        const ids = new Set((data.favorites || []).map((f: { professional_id?: string }) => f.professional_id).filter(Boolean))
        if (!cancelled) setFavoriteIds(ids)
      } catch {
        if (!cancelled) setFavoriteIds(new Set())
      }
    }
    fetchFavorites()
    return () => { cancelled = true }
  }, [showNewChat])

  const toggleFavorite = useCallback(async (e: React.MouseEvent, professionalId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (addingFavorite) return
    setAddingFavorite(professionalId)
    try {
      const isFav = favoriteIds.has(professionalId)
      const r = await fetch(
        isFav ? `/api/favorites?professional_id=${professionalId}` : '/api/favorites',
        isFav
          ? { method: 'DELETE', credentials: 'include' }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ professional_id: professionalId }) }
      )
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed')
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (isFav) next.delete(professionalId)
        else next.add(professionalId)
        return next
      })
      toast({ title: isFav ? 'Removed from contacts' : 'Added to contacts' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update contacts', variant: 'destructive' })
    } finally {
      setAddingFavorite(null)
    }
  }, [favoriteIds, addingFavorite])

  // Search contacts for new chat
  const searchContacts = async (query: string) => {
    if (!query.trim()) {
      setNewChatResults([])
      return
    }

    setSearchingContacts(true)
    try {
      // Search professionals (doctors, pharmacies, labs)
      const { data: professionals } = await supabase
        .from('professionals')
        .select('id, business_name, professional_type, wilaya, avatar_url')
        .or(`business_name.ilike.%${query}%,email.ilike.%${query}%`)
        .eq('status', 'verified')
        .limit(10)

      // Search patients if current user is a professional
      let patients: any[] = []
      if (currentUser.type !== 'patient') {
        const { data: patientData } = await supabase
          .from('profiles')
          .select('id, full_name, phone, avatar_url')
          .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(10)
        patients = patientData || []
      }

      const results = [
        ...(professionals || []).map(p => ({
          id: p.id,
          name: p.business_name,
          type: p.professional_type,
          subtitle: p.wilaya,
          avatar_url: p.avatar_url,
        })),
        ...patients.map(p => ({
          id: p.id,
          name: p.full_name,
          type: 'patient',
          subtitle: p.phone,
          avatar_url: p.avatar_url,
        }))
      ]

      setNewChatResults(results)
    } catch (error) {
      console.error('Error searching contacts:', error)
    } finally {
      setSearchingContacts(false)
    }
  }

  // Start new conversation
  const startNewConversation = async (contact: any) => {
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(c => 
        c.other_participant?.id === contact.id
      )

      if (existingConv) {
        setSelectedConversation(existingConv)
        setShowNewChat(false)
        setShowMobileConversations(false)
        return
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: currentUser.id,
          participant_1_type: currentUser.type,
          participant_2_id: contact.id,
          participant_2_type: contact.type,
          type: 'direct',
        })
        .select()
        .single()

      if (error) throw error

      // Add participants
      await supabase.from('conversation_participants').insert([
        { conversation_id: data.id, user_id: currentUser.id, user_type: currentUser.type },
        { conversation_id: data.id, user_id: contact.id, user_type: contact.type }
      ])

      const newConv = {
        ...data,
        other_participant: {
          id: contact.id,
          name: contact.name,
          type: contact.type,
          avatar_url: contact.avatar_url,
        }
      }

      setConversations(prev => [newConv, ...prev])
      setSelectedConversation(newConv)
      setShowNewChat(false)
      setShowMobileConversations(false)
    } catch (error: any) {
      toast({
        title: 'Error creating conversation',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <Stethoscope className="h-4 w-4" />
      case 'pharmacy': return <Pill className="h-4 w-4" />
      case 'laboratory': return <FlaskConical className="h-4 w-4" />
      case 'clinic': return <Building2 className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  // Format message time
  const formatMessageTime = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return `${l.yesterday} ${format(d, 'HH:mm')}`
    return format(d, 'dd/MM/yyyy HH:mm')
  }

  // Format conversation time
  const formatConversationTime = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return l.yesterday
    return format(d, 'dd/MM')
  }

  // Render special message types
  const renderMessageContent = (message: Message) => {
    switch (message.message_type) {
      case 'prescription':
        return (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Pill className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{l.prescription}</p>
              <p className="text-xs text-muted-foreground">{message.content}</p>
            </div>
          </div>
        )
      case 'lab_result':
        return (
          <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-sm">{l.labResult}</p>
              <p className="text-xs text-muted-foreground">{message.content}</p>
            </div>
          </div>
        )
      case 'referral':
        return (
          <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg">
            <Share2 className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-sm">{l.referral}</p>
              <p className="text-xs text-muted-foreground">{message.content}</p>
            </div>
          </div>
        )
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>
    }
  }

  // Conversation list
  const renderConversationList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{l.messages}</h2>
          <Button size="sm" onClick={() => setShowNewChat(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={l.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" className="text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-muted rounded-full p-4 mb-4">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{l.noMessages}</p>
            <Button onClick={() => setShowNewChat(true)}>
              {l.startConversation}
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {conversations
              .filter(c => !searchQuery || 
                c.other_participant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(conv => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv)
                    setShowMobileConversations(false)
                  }}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={conv.other_participant?.avatar_url} />
                    <AvatarFallback>
                      {getTypeIcon(conv.other_participant?.type || 'patient')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conv.other_participant?.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatConversationTime(conv.last_message_at || '')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message_text || l.startConversation}
                      </p>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Chat view
  const renderChatView = () => (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setShowMobileConversations(true)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {selectedConversation && (
          <>
            <Avatar>
              <AvatarImage src={selectedConversation.other_participant?.avatar_url} />
              <AvatarFallback>
                {getTypeIcon(selectedConversation.other_participant?.type || 'patient')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{selectedConversation.other_participant?.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {getTypeIcon(selectedConversation.other_participant?.type || 'patient')}
                {l[selectedConversation.other_participant?.type as keyof typeof l] || selectedConversation.other_participant?.type}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>Search Messages</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Block</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === currentUser.id
            const showAvatar = index === 0 || 
              messages[index - 1].sender_id !== message.sender_id

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && showAvatar && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {message.sender_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}
                
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Reply indicator */}
                  {message.reply_to_id && (
                    <div className="text-xs text-muted-foreground mb-1 px-2 border-s-2 border-muted">
                      Reply to message
                    </div>
                  )}
                  
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted rounded-tl-none'
                    }`}
                  >
                    {renderMessageContent(message)}
                  </div>
                  
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(message.created_at)}
                    </span>
                    {isOwn && (
                      <CheckCheck className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-primary rounded" />
            <div>
              <p className="text-xs font-medium">Replying to {replyTo.sender_name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{replyTo.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <ImageIcon className="h-4 w-4 me-2" />
                Image
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 me-2" />
                Document
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pill className="h-4 w-4 me-2" />
                {l.prescription}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FlaskConical className="h-4 w-4 me-2" />
                {l.labResult}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            ref={inputRef}
            placeholder={l.typeMessage}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            className="flex-1"
          />

          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  // New chat dialog
  const renderNewChatDialog = () => (
    <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{l.newChat}</DialogTitle>
          <DialogDescription>{l.searchContacts}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={l.searchContacts}
              value={newChatSearch}
              onChange={(e) => {
                setNewChatSearch(e.target.value)
                searchContacts(e.target.value)
              }}
              className="ps-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {searchingContacts ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" className="text-muted-foreground" />
              </div>
            ) : newChatResults.length === 0 ? (
              newChatSearch && (
                <div className="text-center py-8 text-muted-foreground">
                  {l.noResults}
                </div>
              )
            ) : (
              <div className="divide-y">
                {newChatResults.map(contact => {
                  const isProfessional = contact.type !== 'patient'
                  const professionalId = isProfessional ? contact.id : null
                  const isInContacts = professionalId ? favoriteIds.has(professionalId) : false
                  const isAdding = professionalId ? addingFavorite === professionalId : false
                  return (
                    <div
                      key={contact.id}
                      onClick={() => startNewConversation(contact)}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
                    >
                      <Avatar>
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback>
                          {getTypeIcon(contact.type)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {getTypeIcon(contact.type)}
                          <span>{l[contact.type as keyof typeof l] || contact.type}</span>
                          {contact.subtitle && (
                            <span className="text-xs">• {contact.subtitle}</span>
                          )}
                        </p>
                      </div>
                      {professionalId && (
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, professionalId)}
                          disabled={isAdding}
                          title={isInContacts ? 'Remove from contacts' : 'Add to contacts'}
                          className={cn(
                            'p-2 rounded-lg shrink-0 transition-colors',
                            isInContacts
                              ? 'text-amber-500 hover:bg-amber-500/10'
                              : 'text-muted-foreground hover:bg-muted hover:text-teal-600'
                          )}
                        >
                          {isAdding ? (
                            <LoadingSpinner size="sm" />
                          ) : isInContacts ? (
                            <Star className="h-4 w-4 fill-current" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )

  // Main render
  const mainContent = (
    <div className={`flex ${embedded ? 'h-full' : 'h-[600px]'} bg-background rounded-lg border overflow-hidden`}>
      {/* Conversations sidebar */}
      <div className={`w-full md:w-80 border-e ${
        showMobileConversations ? 'block' : 'hidden md:block'
      }`}>
        {renderConversationList()}
      </div>

      {/* Chat area */}
      <div className={`flex-1 ${
        showMobileConversations ? 'hidden md:flex' : 'flex'
      } flex-col`}>
        {selectedConversation ? (
          renderChatView()
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>{l.startConversation}</p>
            </div>
          </div>
        )}
      </div>

      {renderNewChatDialog()}
    </div>
  )

  if (embedded) {
    return mainContent
  }

  return (
    <Card>
      <CardContent className="p-0">
        {mainContent}
      </CardContent>
    </Card>
  )
}

export default HealthcareMessaging

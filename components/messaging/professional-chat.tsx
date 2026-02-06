'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, Search, User, Building2, Pill, FlaskConical,
  Phone, Video, Paperclip, MoreVertical, MessageSquare
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

interface Conversation {
  id: string
  participant_1_id: string
  participant_1_type: string
  participant_2_id: string
  participant_2_type: string
  last_message: string | null
  last_message_at: string | null
  unread_count_1: number
  unread_count_2: number
  participant_name?: string
  participant_type?: string
  participant_id?: string
}

interface ProfessionalChatProps {
  userId: string
  userType: 'doctor' | 'pharmacy' | 'laboratory' | 'clinic'
  userName: string
}

const TYPE_ICONS = {
  doctor: User,
  pharmacy: Pill,
  laboratory: FlaskConical,
  clinic: Building2,
  patient: User
}

const TYPE_COLORS = {
  doctor: 'bg-blue-500',
  pharmacy: 'bg-green-500',
  laboratory: 'bg-purple-500',
  clinic: 'bg-orange-500',
  patient: 'bg-gray-500'
}

export function ProfessionalChat({ userId, userType, userName }: ProfessionalChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showNewChat, setShowNewChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  // Load conversations
  useEffect(() => {
    async function loadConversations() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('professional_conversations')
          .select('*')
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
          .order('last_message_at', { ascending: false })

        if (data) {
          // Enrich with participant info
          const enriched = await Promise.all(data.map(async (conv) => {
            const isParticipant1 = conv.participant_1_id === userId
            const otherId = isParticipant1 ? conv.participant_2_id : conv.participant_1_id
            const otherType = isParticipant1 ? conv.participant_2_type : conv.participant_1_type
            
            // Get participant info
            const { data: prof } = await supabase
              .from('professionals')
              .select('business_name')
              .eq('id', otherId)
              .single()
            
            return {
              ...conv,
              participant_id: otherId,
              participant_type: otherType,
              participant_name: prof?.business_name || 'Unknown'
            }
          }))
          
          setConversations(enriched)
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()

    // Subscribe to new messages
    const channel = supabase
      .channel('professional_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'professional_messages'
      }, () => {
        loadConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return

    async function loadMessages() {
      const { data, error } = await supabase
        .from('professional_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data)
      }
    }

    loadMessages()
  }, [selectedConversation, supabase])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Search professionals
  const searchProfessionals = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    const { data } = await supabase
      .from('professionals')
      .select('id, business_name, type, wilaya')
      .or(`business_name.ilike.%${query}%,wilaya.ilike.%${query}%`)
      .neq('auth_user_id', userId)
      .limit(10)

    if (data) {
      setSearchResults(data)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setIsSending(true)
    try {
      const { error } = await supabase
        .from('professional_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: userId,
          content: newMessage.trim(),
          is_read: false
        })

      if (error) throw error

      // Update conversation's last message
      await supabase
        .from('professional_conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id)

      // Reload messages
      const { data } = await supabase
        .from('professional_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true })
      
      if (data) setMessages(data)
      setNewMessage('')

    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Start new conversation
  const startConversation = async (professional: any) => {
    // Check if conversation exists
    const existing = conversations.find(c => c.participant_id === professional.id)
    if (existing) {
      setSelectedConversation(existing)
      setShowNewChat(false)
      return
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('professional_conversations')
      .insert({
        participant_1_id: userId,
        participant_1_type: userType,
        participant_2_id: professional.id,
        participant_2_type: professional.type,
        unread_count_1: 0,
        unread_count_2: 0
      })
      .select()
      .single()

    if (data) {
      const enriched = {
        ...data,
        participant_id: professional.id,
        participant_type: professional.type,
        participant_name: professional.business_name
      }
      setConversations(prev => [enriched, ...prev])
      setSelectedConversation(enriched)
    }
    setShowNewChat(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const TypeIcon = selectedConversation?.participant_type 
    ? TYPE_ICONS[selectedConversation.participant_type as keyof typeof TYPE_ICONS] 
    : MessageSquare

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-background">
      {/* Conversation List */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Messages</h3>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowNewChat(!showNewChat)}
              className="bg-transparent"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (showNewChat) searchProfessionals(e.target.value)
              }}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {showNewChat ? (
            <div className="p-2 space-y-1">
              <p className="text-sm text-muted-foreground p-2">Search for professionals to message</p>
              {searchResults.map(prof => (
                <div
                  key={prof.id}
                  className="p-3 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => startConversation(prof)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className={TYPE_COLORS[prof.type as keyof typeof TYPE_COLORS]}>
                        {prof.business_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{prof.business_name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {prof.type} {prof.wilaya && `- ${prof.wilaya}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" className="text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const isParticipant1 = conv.participant_1_id === userId
                  const unreadCount = isParticipant1 ? conv.unread_count_1 : conv.unread_count_2
                  
                  return (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conv.id 
                          ? 'bg-primary/10' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className={TYPE_COLORS[conv.participant_type as keyof typeof TYPE_COLORS]}>
                            {conv.participant_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{conv.participant_name}</span>
                            {conv.last_message_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message || 'No messages yet'}
                            </p>
                            {unreadCount > 0 && (
                              <Badge className="ml-2">{unreadCount}</Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs mt-1 capitalize">
                            {conv.participant_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className={TYPE_COLORS[selectedConversation.participant_type as keyof typeof TYPE_COLORS]}>
                    <TypeIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedConversation.participant_name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedConversation.participant_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === userId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                        msg.sender_id === userId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        <span>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-1">No conversation selected</h3>
              <p className="text-sm">Choose a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

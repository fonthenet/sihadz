"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, FileText, Pill, TestTube, Search, MessageSquare, QrCode, ArrowLeft, Send } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

const translations = {
  en: {
    title: "My Healthcare Tickets",
    subtitle: "Track all your appointments, prescriptions, and lab requests",
    all: "All",
    appointments: "Appointments",
    prescriptions: "Prescriptions",
    labRequests: "Lab Requests",
    search: "Search tickets...",
    noTickets: "No tickets found",
    viewDetails: "View Details",
    sendMessage: "Send Message",
    timeline: "Timeline",
    messages: "Messages",
    back: "Back to Dashboard"
  },
  fr: {
    title: "Mes Tickets de Santé",
    subtitle: "Suivez tous vos rendez-vous, ordonnances et demandes de laboratoire",
    all: "Tous",
    appointments: "Rendez-vous",
    prescriptions: "Ordonnances",
    labRequests: "Analyses",
    search: "Rechercher...",
    noTickets: "Aucun ticket trouvé",
    viewDetails: "Voir Détails",
    sendMessage: "Envoyer Message",
    timeline: "Chronologie",
    messages: "Messages",
    back: "Retour au Tableau de Bord"
  },
  ar: {
    title: "تذاكري الصحية",
    subtitle: "تتبع جميع مواعيدك ووصفاتك وطلبات المختبر",
    all: "الكل",
    appointments: "المواعيد",
    prescriptions: "الوصفات",
    labRequests: "التحاليل",
    search: "بحث...",
    noTickets: "لا توجد تذاكر",
    viewDetails: "عرض التفاصيل",
    sendMessage: "إرسال رسالة",
    timeline: "الجدول الزمني",
    messages: "الرسائل",
    back: "العودة للوحة التحكم"
  }
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  ready_for_pickup: "bg-emerald-100 text-emerald-800",
  processing: "bg-indigo-100 text-indigo-800"
}

const typeIcons: Record<string, any> = {
  appointment: Calendar,
  prescription: Pill,
  lab_request: TestTube,
  referral: FileText
}

export default function PatientTicketsPage() {
  const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en')
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const searchParams = useSearchParams()

  const t = translations[language]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as 'en' | 'fr' | 'ar'
      if (stored) setLanguage(stored)
    }
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('healthcare_tickets')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data)
    }
    setLoading(false)
  }

  const fetchTicketDetails = async (ticketId: string) => {
    const supabase = createBrowserClient()
    
    // Fetch timeline
    const { data: timelineData } = await supabase
      .from('ticket_timeline')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (timelineData) setTimeline(timelineData)

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messagesData) setMessages(messagesData)
  }

  const openTicketDetail = async (ticket: any) => {
    setSelectedTicket(ticket)
    setIsDetailOpen(true)
    await fetchTicketDetails(ticket.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return
    setSendingMessage(true)

    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user?.id,
        sender_type: 'patient',
        message: newMessage
      })

    if (!error) {
      setNewMessage("")
      await fetchTicketDetails(selectedTicket.id)
    }
    setSendingMessage(false)
  }

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab !== 'all' && ticket.type !== activeTab) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return ticket.ticket_number.toLowerCase().includes(query) ||
             ticket.metadata?.patient_name?.toLowerCase().includes(query) ||
             ticket.metadata?.doctor_name?.toLowerCase().includes(query)
    }
    return true
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="min-h-screen bg-background p-4 md:p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mb-2">
                  <ArrowLeft className="h-4 w-4 me-2" />
                  {t.back}
                </Button>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">{t.all}</TabsTrigger>
              <TabsTrigger value="appointment">{t.appointments}</TabsTrigger>
              <TabsTrigger value="prescription">{t.prescriptions}</TabsTrigger>
              <TabsTrigger value="lab_request">{t.labRequests}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" className="text-muted-foreground" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t.noTickets}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredTickets.map((ticket) => {
                    const Icon = typeIcons[ticket.type] || FileText
                    return (
                      <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-medium">{ticket.ticket_number}</span>
                                  <Badge className={statusColors[ticket.status] || "bg-gray-100"}>
                                    {ticket.status.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <p className="font-medium">{ticket.metadata?.doctor_name || 'Healthcare Provider'}</p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {ticket.metadata?.appointment_date || formatDate(ticket.created_at)}
                                  </span>
                                  {ticket.metadata?.appointment_time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {ticket.metadata.appointment_time}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {ticket.verification_code && (
                                <Button variant="outline" size="sm">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="sm" onClick={() => openTicketDetail(ticket)}>
                                {t.viewDetails}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Ticket Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono">{selectedTicket?.ticket_number}</span>
                <Badge className={statusColors[selectedTicket?.status] || "bg-gray-100"}>
                  {selectedTicket?.status?.replace(/_/g, ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedTicket?.metadata?.doctor_name} - {formatDate(selectedTicket?.created_at || '')}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="timeline" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline">{t.timeline}</TabsTrigger>
                <TabsTrigger value="messages">{t.messages}</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {index < timeline.length - 1 && <div className="w-0.5 h-full bg-border" />}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">{event.action.replace(/_/g, ' ')}</p>
                        {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(event.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="messages" className="mt-4">
                <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.sender_type === 'patient' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">{formatDate(msg.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t.sendMessage}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                  />
                  <Button onClick={sendMessage} disabled={sendingMessage}>
                    {sendingMessage ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}

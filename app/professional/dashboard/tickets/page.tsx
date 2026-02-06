"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, FileText, Pill, FlaskConical, Search, MessageSquare, Send, Plus, CheckCircle, XCircle, ArrowRight, User } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

const translations = {
  en: {
    title: "Healthcare Tickets",
    subtitle: "Manage appointments, prescriptions, and lab requests",
    all: "All",
    appointments: "Appointments",
    prescriptions: "Prescriptions",
    labRequests: "Lab Requests",
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    search: "Search by ticket number or patient...",
    noTickets: "No tickets found",
    viewDetails: "Details",
    updateStatus: "Update Status",
    createPrescription: "Create Prescription",
    createLabRequest: "Create Lab Request",
    timeline: "Timeline",
    messages: "Messages",
    accept: "Accept",
    reject: "Reject",
    markComplete: "Mark Complete",
    sendMessage: "Send Message",
    assignPharmacy: "Assign Pharmacy",
    assignLab: "Assign Lab"
  },
  fr: {
    title: "Tickets de Santé",
    subtitle: "Gérez les rendez-vous, ordonnances et demandes de laboratoire",
    all: "Tous",
    appointments: "Rendez-vous",
    prescriptions: "Ordonnances",
    labRequests: "Analyses",
    pending: "En Attente",
    inProgress: "En Cours",
    completed: "Terminés",
    search: "Rechercher par numéro ou patient...",
    noTickets: "Aucun ticket trouvé",
    viewDetails: "Détails",
    updateStatus: "Mettre à jour",
    createPrescription: "Créer Ordonnance",
    createLabRequest: "Demander Analyse",
    timeline: "Chronologie",
    messages: "Messages",
    accept: "Accepter",
    reject: "Refuser",
    markComplete: "Terminer",
    sendMessage: "Envoyer",
    assignPharmacy: "Assigner Pharmacie",
    assignLab: "Assigner Labo"
  },
  ar: {
    title: "التذاكر الصحية",
    subtitle: "إدارة المواعيد والوصفات وطلبات المختبر",
    all: "الكل",
    appointments: "المواعيد",
    prescriptions: "الوصفات",
    labRequests: "التحاليل",
    pending: "قيد الانتظار",
    inProgress: "قيد التنفيذ",
    completed: "مكتملة",
    search: "بحث برقم التذكرة أو المريض...",
    noTickets: "لا توجد تذاكر",
    viewDetails: "تفاصيل",
    updateStatus: "تحديث الحالة",
    createPrescription: "إنشاء وصفة",
    createLabRequest: "طلب تحليل",
    timeline: "الجدول الزمني",
    messages: "الرسائل",
    accept: "قبول",
    reject: "رفض",
    markComplete: "إكمال",
    sendMessage: "إرسال",
    assignPharmacy: "تعيين صيدلية",
    assignLab: "تعيين مختبر"
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
  lab_request: FlaskConical,
  referral: FileText
}

const LIST_PATH = "/professional/dashboard/tickets"

export default function ProfessionalTicketsPage() {
  const searchParams = useSearchParams()
  const { state: urlState, update: updateUrl } = usePreservedListState({
    params: [
      { key: "tab", defaultValue: "all", validValues: ["all", "appointment", "prescription", "lab_request"] },
      { key: "status", defaultValue: "all", validValues: ["all", "pending", "in_progress", "completed", "cancelled"] },
      { key: "q", defaultValue: "" },
    ],
    listPath: LIST_PATH,
  })
  const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en')
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(urlState.q)
  const [activeTab, setActiveTab] = useState(urlState.tab)
  const [statusFilter, setStatusFilter] = useState(urlState.status)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<'prescription' | 'lab_request'>('prescription')
  const [timeline, setTimeline] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [newTicketData, setNewTicketData] = useState({
    patient_name: '',
    patient_phone: '',
    notes: '',
    medications: '',
    tests: ''
  })

  const t = translations[language]

  useEffect(() => {
    setSearchQuery(urlState.q)
    setActiveTab(urlState.tab)
    setStatusFilter(urlState.status)
  }, [urlState.q, urlState.tab, urlState.status])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as 'en' | 'fr' | 'ar'
      if (stored) setLanguage(stored)
    }
    fetchTickets()
  }, [])

  const { user } = useAuth()
  const fetchTickets = async (opts?: { silent?: boolean }) => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('healthcare_tickets')
      .select(`
        *,
        appointment:appointments(
          id,
          patient_name,
          patient_email,
          patient_phone,
          appointment_date,
          appointment_time
        )
      `)
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data)
    }
    if (!opts?.silent) setLoading(false)
  }

  useAutoRefresh(fetchTickets, 60_000, { enabled: !!user })

  const fetchTicketDetails = async (ticketId: string) => {
    const supabase = createBrowserClient()
    
    const { data: timelineData } = await supabase
      .from('ticket_timeline')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (timelineData) setTimeline(timelineData)

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

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('healthcare_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)

    if (!error) {
      await supabase.from('ticket_timeline').insert({
        ticket_id: ticketId,
        action: `status_changed_to_${newStatus}`,
        performed_by: user?.id,
        notes: `Status updated to ${newStatus}`
      })
      fetchTickets()
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
        fetchTicketDetails(ticketId)
      }
    }
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
        sender_type: 'doctor',
        message: newMessage
      })

    if (!error) {
      setNewMessage("")
      await fetchTicketDetails(selectedTicket.id)
    }
    setSendingMessage(false)
  }

  const createTicket = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const ticketNumber = `TKT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substr(2,5).toUpperCase()}`
    
    const { error } = await supabase.from('healthcare_tickets').insert({
      ticket_number: ticketNumber,
      type: createType,
      status: 'pending',
      doctor_id: user?.id,
      metadata: {
        patient_name: newTicketData.patient_name,
        patient_phone: newTicketData.patient_phone,
        notes: newTicketData.notes,
        medications: createType === 'prescription' ? newTicketData.medications : undefined,
        tests: createType === 'lab_request' ? newTicketData.tests : undefined
      },
      priority: 'normal'
    })

    if (!error) {
      setIsCreateOpen(false)
      setNewTicketData({ patient_name: '', patient_phone: '', notes: '', medications: '', tests: '' })
      fetchTickets()
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab !== 'all' && ticket.type !== activeTab) return false
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && ticket.status !== 'pending') return false
      if (statusFilter === 'in_progress' && !['confirmed', 'in_progress', 'processing'].includes(ticket.status)) return false
      if (statusFilter === 'completed' && ticket.status !== 'completed') return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return ticket.ticket_number.toLowerCase().includes(query) ||
             ticket.metadata?.patient_name?.toLowerCase().includes(query)
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

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'pending').length,
    inProgress: tickets.filter(t => ['confirmed', 'in_progress', 'processing'].includes(t.status)).length,
    completed: tickets.filter(t => t.status === 'completed').length
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="w-full min-h-full py-4 sm:py-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setCreateType('prescription'); setIsCreateOpen(true); }}>
                <Pill className="h-4 w-4 me-2" />
                {t.createPrescription}
              </Button>
              <Button variant="outline" onClick={() => { setCreateType('lab_request'); setIsCreateOpen(true); }}>
                <FlaskConical className="h-4 w-4 me-2" />
                {t.createLabRequest}
              </Button>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 px-4 sm:px-6">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{t.all}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{t.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{t.inProgress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{t.completed}</div>
              </CardContent>
            </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 px-4 sm:px-6">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => {
                  const v = e.target.value
                  setSearchQuery(v)
                  updateUrl("q", v)
                }}
                className="ps-10 h-8 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                updateUrl("status", v)
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="pending">{t.pending}</SelectItem>
                <SelectItem value="in_progress">{t.inProgress}</SelectItem>
                <SelectItem value="completed">{t.completed}</SelectItem>
              </SelectContent>
            </Select>
        </div>

        {/* Tabs (synced to URL for back navigation) */}
        <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v)
              updateUrl("tab", v)
            }}
          >
            <TabsList>
              <TabsTrigger value="all">{t.all}</TabsTrigger>
              <TabsTrigger value="appointment">{t.appointments}</TabsTrigger>
              <TabsTrigger value="prescription">{t.prescriptions}</TabsTrigger>
              <TabsTrigger value="lab_request">{t.labRequests}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 px-4 sm:px-6">
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
                  {filteredTickets.map((ticket, index) => {
                    const Icon = typeIcons[ticket.type] || FileText
                    return (
                      <Card
                        key={ticket.id}
                        className={cn(
                          "hover:shadow-md transition-shadow",
                          index % 2 === 1 && "bg-slate-50/80 dark:bg-slate-800/30"
                        )}
                      >
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
                                <p className="font-medium flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {ticket.appointment?.patient_name || ticket.metadata?.patient_name || 'Patient'}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(ticket.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {ticket.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket.id, 'confirmed')}>
                                    <CheckCircle className="h-4 w-4 me-1" />
                                    {t.accept}
                                  </Button>
                                </>
                              )}
                              {ticket.status === 'confirmed' && (
                                <Button size="sm" onClick={() => updateTicketStatus(ticket.id, 'completed')}>
                                  <CheckCircle className="h-4 w-4 me-1" />
                                  {t.markComplete}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => openTicketDetail(ticket)}>
                                {t.viewDetails}
                                <ArrowRight className="h-4 w-4 ms-1" />
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

        {/* Ticket Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent size="xl" style={{width: '800px', height: '80vh'}}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono">{selectedTicket?.ticket_number}</span>
                <Badge className={statusColors[selectedTicket?.status] || "bg-gray-100"}>
                  {selectedTicket?.status?.replace(/_/g, ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Patient: {selectedTicket?.metadata?.patient_name} - {formatDate(selectedTicket?.created_at || '')}
              </DialogDescription>
            </DialogHeader>

            {selectedTicket?.metadata?.medications && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Medications</h4>
                <p className="text-sm">{selectedTicket.metadata.medications}</p>
              </div>
            )}

            {selectedTicket?.metadata?.tests && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Tests Requested</h4>
                <p className="text-sm">{selectedTicket.metadata.tests}</p>
              </div>
            )}

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
                    messages.map((msg) => {
                      const isDeclined = ((msg.message ?? '').toLowerCase().includes('declined') || (msg.message ?? '').toLowerCase().includes('denied'))
                      return (
                        <div key={msg.id} className={`flex ${msg.sender_type === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${isDeclined ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' : msg.sender_type === 'doctor' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className={`text-sm ${isDeclined ? 'font-medium' : ''}`}>{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">{formatDate(msg.created_at)}</p>
                          </div>
                        </div>
                      )
                    })
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

        {/* Create Ticket Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent size="lg" style={{width: '640px'}}>
            <DialogHeader>
              <DialogTitle>
                {createType === 'prescription' ? t.createPrescription : t.createLabRequest}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Patient Name</Label>
                <Input
                  value={newTicketData.patient_name}
                  onChange={(e) => setNewTicketData({ ...newTicketData, patient_name: e.target.value })}
                  placeholder="Enter patient name"
                />
              </div>
              <div className="space-y-2">
                <Label>Patient Phone</Label>
                <Input
                  value={newTicketData.patient_phone}
                  onChange={(e) => setNewTicketData({ ...newTicketData, patient_phone: e.target.value })}
                  placeholder="0554128522"
                />
              </div>
              {createType === 'prescription' ? (
                <div className="space-y-2">
                  <Label>Medications</Label>
                  <Textarea
                    value={newTicketData.medications}
                    onChange={(e) => setNewTicketData({ ...newTicketData, medications: e.target.value })}
                    placeholder="Enter medications and dosage..."
                    rows={4}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Tests Required</Label>
                  <Textarea
                    value={newTicketData.tests}
                    onChange={(e) => setNewTicketData({ ...newTicketData, tests: e.target.value })}
                    placeholder="Enter required tests..."
                    rows={4}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newTicketData.notes}
                  onChange={(e) => setNewTicketData({ ...newTicketData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={createTicket}>Create Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}

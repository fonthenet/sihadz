"use client"
/**
 * Stable system v2: Patient ticket list + ticket detail (prescription + timeline).
 * Do not break: prescription viewing, pharmacy status, APIs. See docs/STABLE-SYSTEM-V2.md
 */

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { usePreservedListState } from "@/hooks/use-preserved-list-state"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, FileText, Pill, TestTube, Search, QrCode, ArrowLeft } from "lucide-react"
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useAuth } from "@/components/auth-provider"
import Loading from "./loading"
import { formatDateTimeAlgeria } from "@/lib/date-algeria"
import type { AlgeriaLang } from "@/lib/date-algeria"
import { getAppointmentStatusLabel, getStatusBadgeClassName, showVisitCompleteAbove } from "@/lib/appointment-status"
import type { StatusLanguage } from "@/lib/appointment-status"

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

function getTicketStatusLabel(
  status: string | undefined,
  pharmacyName: string | null | undefined,
  lang: StatusLanguage
): string {
  return getAppointmentStatusLabel(status, pharmacyName, lang)
}

const typeIcons: Record<string, any> = {
  appointment: Calendar,
  prescription: Pill,
  lab_request: TestTube,
  referral: FileText
}

const LIST_PATH = "/dashboard/tickets"

export default function PatientTicketsPage() {
  const { user } = useAuth()
  const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en')
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { state: urlState, update: updateUrl } = usePreservedListState({
    params: [
      { key: "tab", defaultValue: "all", validValues: ["all", "appointment", "prescription", "lab_request"] },
      { key: "q", defaultValue: "" },
    ],
    listPath: LIST_PATH,
  })
  const [searchQuery, setSearchQuery] = useState(urlState.q)
  const [activeTab, setActiveTab] = useState(urlState.tab)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [prescription, setPrescription] = useState<any>(null)
  const [labRequest, setLabRequest] = useState<any>(null)
  const [ticketPharmacyName, setTicketPharmacyName] = useState<string | null>(null)
  const [ticketLaboratoryName, setTicketLaboratoryName] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Patient does not send messages; messages state kept for API response shape only

  const t = translations[language]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as 'en' | 'fr' | 'ar'
      if (stored) setLanguage(stored)
    }
    fetchTickets()
  }, [])

  useAutoRefresh(fetchTickets, 60_000)

  // Auto-open ticket detail if ?ticket=id is in URL
  useEffect(() => {
    const ticketId = searchParams.get('ticket')
    if (ticketId && tickets.length > 0 && !isDetailOpen) {
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket) {
        openTicketDetail(ticket)
      }
    }
  }, [tickets, searchParams, isDetailOpen])

  const fetchTickets = async (opts?: { silent?: boolean }) => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    if (!opts?.silent) setLoading(true)
    const { data, error } = await supabase
      .from('healthcare_tickets')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data)
    }
    if (!opts?.silent) setLoading(false)
  }

  const fetchTicketDetails = async (ticketId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTimeline([])
        setMessages([])
        setPrescription(null)
        setTicketPharmacyName(null)
        return
      }
      setTimeline(data.timeline || [])
      setMessages(data.messages || [])
      setPrescription(data.prescription || null)
      setTicketPharmacyName(data.pharmacyName ?? null)
    } finally {
      setDetailLoading(false)
    }
  }

  const openTicketDetail = async (ticket: any) => {
    setSelectedTicket(ticket)
    setIsDetailOpen(true)
    await fetchTicketDetails(ticket.id)
  }


  const ticketType = (t: any) => t?.ticket_type ?? t?.type
  const filteredTickets = tickets.filter(ticket => {
    if (activeTab !== 'all') {
      const type = ticketType(ticket)
      const tabToType: Record<string, string> = { appointment: 'appointment', prescription: 'prescription', lab_request: 'lab_request' }
      if (tabToType[activeTab] && type !== tabToType[activeTab]) return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (ticket.ticket_number || '').toLowerCase().includes(query) ||
             ticket.metadata?.patient_name?.toLowerCase().includes(query) ||
             ticket.metadata?.doctor_name?.toLowerCase().includes(query)
    }
    return true
  })

  const formatDate = (date: string) => {
    return formatDateTimeAlgeria(new Date(date), (language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en') as AlgeriaLang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="w-full min-h-full py-4 sm:py-6 space-y-6 px-4 sm:px-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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

          {/* Search and Filter (synced to URL for back navigation) */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => {
                  const v = e.target.value
                  setSearchQuery(v)
                  updateUrl("q", v)
                }}
                className="ps-10"
              />
            </div>
          </div>

          {/* Tabs (synced to URL for back navigation) */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v)
              updateUrl("tab", v)
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">{t.all}</TabsTrigger>
              <TabsTrigger value="appointment">{t.appointments}</TabsTrigger>
              <TabsTrigger value="prescription">{t.prescriptions}</TabsTrigger>
              <TabsTrigger value="lab_request">{t.labRequests}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <SectionLoading minHeight="min-h-[200px]" label={language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'} />
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
                              <div className="p-2 rounded-lg bg-primary dark:bg-emerald-500/10">
                                <Icon className="h-5 w-5 text-primary dark:text-emerald-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-medium">{ticket.ticket_number}</span>
                                  <Badge className={statusColors[ticket.status] || "bg-gray-100"}>
                                    {getTicketStatusLabel(ticket.status, ticket, ticket.metadata?.pharmacy_name)}
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

        {/* Ticket Detail Modal — patient only sees status updates and prescription (no thread) */}
        <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) { setPrescription(null); setLabRequest(null); setTicketPharmacyName(null); setTicketLaboratoryName(null); } }}>
          <DialogContent size="xl" style={{width: '800px', height: '80vh'}}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono">{selectedTicket?.ticket_number}</span>
                {selectedTicket && showVisitCompleteAbove({ ticket_status: selectedTicket.status, rawData: selectedTicket }, selectedTicket.status || '') && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    {language === 'ar' ? 'زيارة الطبيب مكتملة' : language === 'fr' ? 'Visite médecin terminée' : 'Doctor visit complete'}
                  </span>
                )}
                <Badge className={cn('border', selectedTicket ? getStatusBadgeClassName(selectedTicket.status || '') : 'bg-gray-100')}>
                  {getTicketStatusLabel(selectedTicket?.status, ticketPharmacyName ?? selectedTicket?.metadata?.pharmacy_name, language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en')}
                </Badge>
                {selectedTicket?.appointment_id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/appointments/${selectedTicket.appointment_id}`}>
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {language === 'ar' ? 'عرض الموعد' : language === 'fr' ? 'Voir le rendez-vous' : 'View appointment'}
                    </Link>
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedTicket?.metadata?.doctor_name} - {formatDate(selectedTicket?.created_at || '')}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <SectionLoading minHeight="min-h-[120px]" label={language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'} />
            ) : (
              <Tabs defaultValue={selectedTicket?.ticket_type === 'lab_request' ? 'lab' : 'prescription'} className="mt-4">
                <TabsList className={`grid w-full ${prescription && labRequest ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {prescription && (
                    <TabsTrigger value="prescription" className="gap-1.5">
                      <Pill className="h-4 w-4" />
                      {language === 'ar' ? 'الوصفة' : language === 'fr' ? 'Ordonnance' : 'Prescription'}
                    </TabsTrigger>
                  )}
                  {labRequest && (
                    <TabsTrigger value="lab" className="gap-1.5">
                      <TestTube className="h-4 w-4" />
                      {language === 'ar' ? 'طلب التحليل' : language === 'fr' ? 'Demande d\'analyse' : 'Lab Request'}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="timeline">{t.timeline}</TabsTrigger>
                </TabsList>

                <TabsContent value="prescription" className="mt-4">
                  {prescription ? (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'الوصفة المرتبطة بهذا التذكرة. التحديثات تظهر أدناه.' : language === 'fr' ? 'Ordonnance liée à ce ticket. Les mises à jour apparaissent ci-dessous.' : 'Prescription linked to this ticket. Updates show below.'}
                      </p>
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        {prescription.diagnosis && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{language === 'ar' ? 'التشخيص' : language === 'fr' ? 'Diagnostic' : 'Diagnosis'}</p>
                            <p className="text-sm">{prescription.diagnosis}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{language === 'ar' ? 'الحالة' : language === 'fr' ? 'État' : 'Status'}</p>
                          <Badge variant="secondary" className="mt-1">{prescription.status?.replace(/_/g, ' ') || prescription.status}</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{language === 'ar' ? 'الأدوية' : language === 'fr' ? 'Médicaments' : 'Medications'}</p>
                          <div className="space-y-2">
                            {(prescription.medications || []).map((med: any, i: number) => (
                              <div key={i} className="text-sm rounded border bg-background p-2">
                                <p className="font-medium">{med.medication_name || med.medication_name_ar || '—'}</p>
                                <p className="text-muted-foreground text-xs">{med.dosage} · {med.frequency} · {med.duration}{med.quantity ? ` · Qty ${med.quantity}` : ''}</p>
                                {med.instructions && <p className="text-xs mt-1">{med.instructions}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                        {prescription.notes && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{language === 'ar' ? 'ملاحظة الطبيب لك (لا يراها إلا أنت)' : language === 'fr' ? 'Note de votre médecin (visible par vous uniquement)' : 'Note from your doctor (visible only to you)'}</p>
                            <p className="text-sm">{prescription.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {language === 'ar' ? 'لا توجد وصفة مرتبطة بهذا التذكرة بعد.' : language === 'fr' ? 'Aucune ordonnance liée à ce ticket pour le moment.' : 'No prescription linked to this ticket yet.'}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    {language === 'ar' ? 'تغييرات حالة التذكرة.' : language === 'fr' ? 'Changements d\'état du ticket.' : 'Ticket status updates.'}
                  </p>
                  <div className="space-y-4">
                    {timeline.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">No timeline events</p>
                    ) : (
                      timeline.map((event, index) => (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            {index < timeline.length - 1 && <div className="w-0.5 h-full bg-border min-h-4" />}
                          </div>
                          <div className="pb-4">
                            <p className="font-medium">{event.action?.replace(/_/g, ' ') || event.event_type?.replace(/_/g, ' ') || 'Event'}</p>
                            {(event.action_description || event.notes) && <p className="text-sm text-muted-foreground">{event.action_description || event.notes}</p>}
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(event.created_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}

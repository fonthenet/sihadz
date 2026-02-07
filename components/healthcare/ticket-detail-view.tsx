'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar, Clock, MapPin, User, Stethoscope, Pill, FlaskConical,
  Building2, Phone, MessageSquare, Send, CheckCircle, XCircle,
  AlertCircle, QrCode, Download, ArrowLeft, FileText, History, Eye,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { QRCodeDisplay } from '@/components/qr-code-display'
import { DocumentViewer } from '@/components/document-viewer'
import { LabRequestDocumentsAttach } from '@/components/lab-request-documents-attach'

// Simplified types for this component
interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: string
  sender_name: string
  content: string
  created_at: string
}

interface TicketTimelineEntry {
  id: string
  ticket_id: string
  activity_type: string
  activity_description: string
  activity_description_ar?: string
  actor_id: string
  actor_type: string
  actor_name: string
  is_system_generated: boolean
  created_at: string
}

interface TicketDetailViewProps {
  ticketId: string
  viewerRole: 'patient' | 'doctor' | 'pharmacy' | 'laboratory' | 'admin'
  viewerId: string
  viewerName: string
  language?: 'ar' | 'fr' | 'en'
  open: boolean
  onClose: () => void
  onUpdate?: () => void
}

export function TicketDetailView({
  ticketId,
  viewerRole,
  viewerId,
  viewerName,
  language = 'ar',
  open,
  onClose,
  onUpdate,
}: TicketDetailViewProps) {
  const { toast } = useToast()
  const supabase = createBrowserClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [ticket, setTicket] = useState<any>(null)
  const [timeline, setTimeline] = useState<TicketTimelineEntry[]>([])
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [labResultViewOpen, setLabResultViewOpen] = useState(false)

  const labels = {
    ar: {
      overview: 'نظرة عامة', timeline: 'التسلسل الزمني', messages: 'الرسائل',
      patient: 'المريض', doctor: 'الطبيب', pharmacy: 'الصيدلية', laboratory: 'المختبر',
      status: 'الحالة', payment: 'الدفع', paid: 'مدفوع', unpaid: 'غير مدفوع',
      sendMessage: 'إرسال', typeMessage: 'اكتب رسالتك...', noMessages: 'لا توجد رسائل',
      qrCode: 'رمز QR', close: 'إغلاق', medications: 'الأدوية', tests: 'التحاليل',
      diagnosis: 'التشخيص', chifaNumber: 'رقم الشفاء', verificationCode: 'رمز التحقق',
    },
    fr: {
      overview: 'Aperçu', timeline: 'Chronologie', messages: 'Messages',
      patient: 'Patient', doctor: 'Médecin', pharmacy: 'Pharmacie', laboratory: 'Laboratoire',
      status: 'Statut', payment: 'Paiement', paid: 'Payé', unpaid: 'Non payé',
      sendMessage: 'Envoyer', typeMessage: 'Écrivez votre message...', noMessages: 'Pas de messages',
      qrCode: 'Code QR', close: 'Fermer', medications: 'Médicaments', tests: 'Analyses',
      diagnosis: 'Diagnostic', chifaNumber: 'Numéro Chifa', verificationCode: 'Code de vérification',
    },
    en: {
      overview: 'Overview', timeline: 'Timeline', messages: 'Messages',
      patient: 'Patient', doctor: 'Doctor', pharmacy: 'Pharmacy', laboratory: 'Laboratory',
      status: 'Status', payment: 'Payment', paid: 'Paid', unpaid: 'Unpaid',
      sendMessage: 'Send', typeMessage: 'Type your message...', noMessages: 'No messages',
      qrCode: 'QR Code', close: 'Close', medications: 'Medications', tests: 'Tests',
      diagnosis: 'Diagnosis', chifaNumber: 'Chifa Number', verificationCode: 'Verification Code',
    },
  }
  const l = labels[language]

  // Load ticket data
  const loadTicket = async () => {
    setIsLoading(true)
    try {
      // Load ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('healthcare_tickets')
        .select(`
          *,
          patient:profiles!healthcare_tickets_patient_id_fkey(id, full_name, phone, email, avatar_url, chifa_number)
        `)
        .eq('id', ticketId)
        .single()

      if (ticketError) throw ticketError

      // Load related data
      if (ticketData.primary_doctor_id) {
        const { data: doctor } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', ticketData.primary_doctor_id)
          .single()
        ticketData.doctor = doctor
      }

      if (ticketData.pharmacy_id) {
        const { data: pharmacy } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', ticketData.pharmacy_id)
          .single()
        ticketData.pharmacy = pharmacy
      }

      if (ticketData.laboratory_id) {
        const { data: laboratory } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', ticketData.laboratory_id)
          .single()
        ticketData.laboratory = laboratory
      }

      if (ticketData.prescription_id) {
        const { data: prescription } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('id', ticketData.prescription_id)
          .single()
        ticketData.prescription = prescription
      }

      if (ticketData.lab_request_id) {
        const { data: labRequest } = await supabase
          .from('lab_test_requests')
          .select(`
            *,
            items:lab_test_items(id, test_type:lab_test_types(name, name_ar, category))
          `)
          .eq('id', ticketData.lab_request_id)
          .single()
        ticketData.lab_request = labRequest
      }

      setTicket(ticketData)

      // Load timeline
      const { data: timelineData } = await supabase
        .from('ticket_timeline')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
      setTimeline(timelineData || [])

      // Load messages
      const { data: messagesData } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      setMessages(messagesData || [])

    } catch (error) {
      console.error('Error loading ticket:', error)
      toast({ title: 'Error loading ticket', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && ticketId) {
      loadTicket()
    }
  }, [open, ticketId])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return

    setIsSending(true)
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: viewerId,
          sender_type: viewerRole,
          sender_name: viewerName,
          content: newMessage.trim(),
        })

      if (error) throw error

      // Refresh messages
      const { data: messagesData } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      setMessages(messagesData || [])

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: 'Error sending message', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  // Render message
  const renderMessage = (message: TicketMessage) => {
    const isOwn = message.sender_id === viewerId

    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%]`}>
          <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {!isOwn && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {message.sender_type === 'doctor' ? <Stethoscope className="h-4 w-4" /> :
                   message.sender_type === 'pharmacy' ? <Building2 className="h-4 w-4" /> :
                   message.sender_type === 'laboratory' ? <FlaskConical className="h-4 w-4" /> :
                   <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              {!isOwn && <p className="text-xs text-muted-foreground mb-1">{message.sender_name}</p>}
              <div className={`rounded-2xl px-4 py-2 ${
                isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-end' : ''}`}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <LoadingSpinner size="lg" className="text-muted-foreground" />
          </div>
        ) : ticket ? (
          <div className="flex flex-col h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold">{ticket.ticket_number}</h2>
                  <p className="text-sm text-muted-foreground">
                    {ticket.ticket_type} • {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{ticket.status}</Badge>
                <Button variant="ghost" size="icon" onClick={() => setShowQRDialog(true)}>
                  <QrCode className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b px-4">
                <TabsList className="h-12">
                  <TabsTrigger value="overview" className="gap-2">
                    <FileText className="h-4 w-4" /> {l.overview}
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-2">
                    <History className="h-4 w-4" /> {l.timeline}
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="gap-2">
                    <MessageSquare className="h-4 w-4" /> {l.messages}
                    {messages.length > 0 && (
                      <Badge variant="secondary" className="ms-1 h-5 w-5 p-0 text-xs">{messages.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="flex-1 overflow-auto p-4 m-0">
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Patient */}
                    {ticket.patient && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">{l.patient}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={ticket.patient.avatar_url} />
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{ticket.patient.full_name}</p>
                              <p className="text-sm text-muted-foreground">{ticket.patient.phone}</p>
                            </div>
                          </div>
                          {ticket.chifa_number && (
                            <p className="text-sm text-muted-foreground mt-2">{l.chifaNumber}: {ticket.chifa_number}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Doctor */}
                    {ticket.doctor && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">{l.doctor}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{ticket.doctor.business_name}</p>
                              <p className="text-sm text-muted-foreground">{ticket.doctor.specialty}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Pharmacy */}
                    {ticket.pharmacy && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">{l.pharmacy}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full">
                              <Building2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{ticket.pharmacy.business_name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ticket.pharmacy.commune}, {ticket.pharmacy.wilaya}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Laboratory */}
                    {ticket.laboratory && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">{l.laboratory}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-2 rounded-full">
                              <FlaskConical className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">{ticket.laboratory.business_name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ticket.laboratory.commune}, {ticket.laboratory.wilaya}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Family members / patient health data from ticket metadata */}
                  {(() => {
                    const meta = ticket.metadata as Record<string, unknown> | null
                    const familyVitals = Array.isArray(meta?.family_members_vitals) ? meta.family_members_vitals as Array<{ id: string; full_name: string; date_of_birth?: string; age_years?: number; gender?: string; blood_type?: string; allergies?: string; chronic_conditions?: string; current_medications?: string; height_cm?: number; weight_kg?: number }> : []
                    const hasFamilyVitals = familyVitals.length > 0
                    const hasFlatVitals = meta && (meta.date_of_birth || meta.allergies || meta.chronic_conditions || meta.current_medications)
                    if (!hasFamilyVitals && !hasFlatVitals) return null
                    return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {hasFamilyVitals && familyVitals.length > 1 ? 'Patients (family members)' : 'Patient health info'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {hasFamilyVitals ? (
                          familyVitals.map((m, idx) => (
                            <div key={m.id || idx} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                              <p className="font-medium text-sm">{m.full_name || `Patient ${idx + 1}`}</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                {m.age_years != null && <div><span className="text-muted-foreground">Age:</span> {m.age_years} yrs</div>}
                                {m.gender && <div><span className="text-muted-foreground">Gender:</span> {m.gender}</div>}
                                {m.blood_type && <div><span className="text-muted-foreground">Blood:</span> {m.blood_type}</div>}
                                {m.height_cm != null && <div><span className="text-muted-foreground">Height:</span> {m.height_cm} cm</div>}
                                {m.weight_kg != null && <div><span className="text-muted-foreground">Weight:</span> {m.weight_kg} kg</div>}
                              </div>
                              {m.allergies && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground font-medium">Allergies: </span>
                                  <span className="text-amber-600 dark:text-amber-400">{m.allergies}</span>
                                </div>
                              )}
                              {m.chronic_conditions && (
                                <div className="text-sm"><span className="text-muted-foreground font-medium">Chronic conditions: </span>{m.chronic_conditions}</div>
                              )}
                              {m.current_medications && (
                                <div className="text-sm"><span className="text-muted-foreground font-medium">Medications: </span>{m.current_medications}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-sm">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {meta?.date_of_birth && <div><span className="text-muted-foreground">DOB:</span> {String(meta.date_of_birth)}</div>}
                              {meta?.age_years != null && <div><span className="text-muted-foreground">Age:</span> {Number(meta.age_years)} yrs</div>}
                              {meta?.gender && <div><span className="text-muted-foreground">Gender:</span> {String(meta.gender)}</div>}
                              {meta?.blood_type && <div><span className="text-muted-foreground">Blood:</span> {String(meta.blood_type)}</div>}
                              {meta?.height_cm != null && <div><span className="text-muted-foreground">Height:</span> {Number(meta.height_cm)} cm</div>}
                              {meta?.weight_kg != null && <div><span className="text-muted-foreground">Weight:</span> {Number(meta.weight_kg)} kg</div>}
                            </div>
                            {meta?.allergies && (
                              <div><span className="text-muted-foreground font-medium">Allergies: </span><span className="text-amber-600 dark:text-amber-400">{String(meta.allergies)}</span></div>
                            )}
                            {meta?.chronic_conditions && <div><span className="text-muted-foreground font-medium">Chronic conditions: </span>{String(meta.chronic_conditions)}</div>}
                            {meta?.current_medications && <div><span className="text-muted-foreground font-medium">Medications: </span>{String(meta.current_medications)}</div>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    )
                  })()}

                  {/* Prescription details */}
                  {ticket.prescription && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Pill className="h-5 w-5" /> {l.medications}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {ticket.prescription.diagnosis && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-muted-foreground">{l.diagnosis}</p>
                            <p>{ticket.prescription.diagnosis}</p>
                          </div>
                        )}
                        <div className="space-y-3">
                          {(ticket.prescription.medications || []).map((med: any, idx: number) => (
                            <div key={idx} className="p-3 border rounded-lg">
                              <p className="font-medium">{med.name}</p>
                              <div className="grid grid-cols-2 gap-2 mt-1 text-sm text-muted-foreground">
                                <p>Dosage: {med.dosage}</p>
                                <p>Frequency: {med.frequency}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Lab request details */}
                  {ticket.lab_request && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FlaskConical className="h-5 w-5" /> {l.tests}
                        </CardTitle>
                        {ticket.lab_request.status && (
                          <Badge variant={
                            ['fulfilled', 'completed'].includes(ticket.lab_request.status) ? 'default' :
                            ['processing', 'sample_collected'].includes(ticket.lab_request.status) ? 'secondary' : 'outline'
                          }>
                            {ticket.lab_request.status === 'fulfilled' || ticket.lab_request.status === 'completed' ? 'Results Received' : ticket.lab_request.status.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="results" className="w-full">
                          <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="results">Results</TabsTrigger>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                          </TabsList>
                          <TabsContent value="results" className="mt-3">
                            <div className="space-y-2">
                              {(ticket.lab_request.items?.length ?? 0) > 0 ? (
                                (ticket.lab_request.items || []).map((item: any, idx: number) => {
                                  const name = item?.test_type?.name || '—'
                                  const fulfillment = (ticket.lab_request.lab_fulfillment || []).find((f: any) => f.item_id === item?.id)
                                  const status = fulfillment?.status
                                  const resultValue = item?.result_value ?? fulfillment?.result_value
                                  const resultUnit = item?.result_unit ?? fulfillment?.result_unit
                                  const refRange = item?.reference_range ?? fulfillment?.reference_range
                                  const resultStatus = item?.result_status ?? fulfillment?.result_status
                                  const showResults = ['fulfilled', 'completed'].includes(ticket.lab_request.status || '')
                                  return (
                                    <div key={item?.id || idx} className="flex flex-wrap items-center justify-between gap-2 text-sm py-1.5 border-b border-muted/50 last:border-0">
                                      <div>
                                        <span className="font-medium">{name}</span>
                                        {showResults && (resultValue || status === 'failed') && (
                                          <div className="text-xs text-muted-foreground mt-0.5">
                                            {status === 'failed' ? (
                                              <span className="text-red-600">Failed{fulfillment?.failed_reason ? `: ${fulfillment.failed_reason}` : ''}</span>
                                            ) : (
                                              <>{resultValue}{resultUnit && ` ${resultUnit}`} {refRange && `(Ref: ${refRange})`}</>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {status && (
                                        <Badge variant={
                                          status === 'completed' ? 'default' :
                                          status === 'failed' ? 'destructive' :
                                          status === 'processing' || status === 'sample_collected' ? 'secondary' : 'outline'
                                        } className="text-xs">
                                          {status === 'failed' ? '✗ Failed' : status === 'completed' ? (resultStatus || '✓ Done') : status.replace(/_/g, ' ')}
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {(ticket.lab_request.test_types || []).map((test: string, idx: number) => (
                                    <Badge key={idx} variant="secondary">{test}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {(ticket.lab_request.result_pdf_url || ticket.lab_request.id) && (
                              <div className="mt-4 flex gap-2">
                                <Button variant="outline" onClick={() => setLabResultViewOpen(true)}>
                                  <Eye className="h-4 w-4 me-2" /> View Results
                                </Button>
                                <Button variant="outline" asChild>
                                  <a href={`/api/documents/lab-results/${ticket.lab_request.id}/view${ticketId ? `?ticketId=${ticketId}&` : '?'}download=1`} download>
                                    <Download className="h-4 w-4 me-2" /> Download
                                  </a>
                                </Button>
                              </div>
                            )}
                          </TabsContent>
                          <TabsContent value="documents" className="mt-3">
                            {ticket.lab_request.id ? (
                              <LabRequestDocumentsAttach
                                labRequestId={ticket.lab_request.id}
                                viewerType={viewerRole === 'patient' ? 'patient' : 'doctor'}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">No lab request linked</p>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment */}
                  {ticket.amount && ticket.amount > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{l.payment}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {ticket.payment_status === 'paid' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                            )}
                            <span>{ticket.payment_status === 'paid' ? l.paid : l.unpaid}</span>
                          </div>
                          <span className="text-2xl font-bold">{ticket.amount} DZD</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="flex-1 overflow-auto p-4 m-0">
                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((entry) => (
                      <div key={entry.id} className="flex gap-4 pb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                          <History className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{entry.activity_description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.actor_name} • {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden m-0">
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{l.noMessages}</p>
                    </div>
                  ) : (
                    <>
                      {messages.map(renderMessage)}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </ScrollArea>
                <div className="p-4 border-t bg-muted/30">
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder={l.typeMessage}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="min-h-[44px] max-h-[120px] resize-none"
                      rows={1}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending}>
                      {isSending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>Ticket not found</p>
          </div>
        )}
      </DialogContent>

      {labResultViewOpen && ticket?.lab_request?.id && (
        <DocumentViewer
          open={labResultViewOpen}
          onOpenChange={setLabResultViewOpen}
          fileUrl={`/api/documents/lab-results/${ticket.lab_request.id}/view${ticketId ? `?ticketId=${ticketId}` : ''}`}
          fileName={`Lab Results ${ticket.lab_request.request_number || ticket.lab_request.id}`}
          fileType="text/html"
        />
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{l.qrCode}</DialogTitle>
            <DialogDescription>
              {ticket?.ticket_number} - {l.verificationCode}: {ticket?.verification_code}
            </DialogDescription>
          </DialogHeader>
          {ticket && (
            <div className="flex justify-center">
              <QRCodeDisplay
                value={JSON.stringify({
                  type: ticket.ticket_type,
                  ticket_number: ticket.ticket_number,
                  verification_code: ticket.verification_code,
                })}
                size={200}
                downloadFileName={`ticket-${ticket.ticket_number}`}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRDialog(false)}>{l.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

export default TicketDetailView

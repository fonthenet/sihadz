'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Clock, MapPin, Video, Plus, Phone, MessageCircle, CalendarClock, FileText, Pill, TestTube, CalendarPlus, Stethoscope, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase/client'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { AppointmentCard } from '@/components/dashboard/appointment-card'
import { useAuth } from '@/components/auth-provider'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { usePreservedListState } from '@/hooks/use-preserved-list-state'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseDateOnlyAsLocal, toDateOnlyString, formatDateAlgeria } from '@/lib/date-algeria'
import type { AlgeriaLang } from '@/lib/date-algeria'
import {
  getAppointmentStatusLabel as getStatusLabel,
  getDisplayStatus,
  getPharmacyName,
  getStatusBadgeClassName,
} from '@/lib/appointment-status'
import type { StatusLanguage } from '@/lib/appointment-status'

const RESCHEDULE_AM = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
const RESCHEDULE_PM = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
const RESCHEDULE_TIME_SLOTS = [...RESCHEDULE_AM, ...RESCHEDULE_PM]

const LIST_PATH = '/dashboard/appointments'

export default function AppointmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const labRequestParam = searchParams.get('labRequest')
  const debug = searchParams.get('debug') === '1'
  const { state: urlState, update: updateUrl } = usePreservedListState({
    params: [
      { key: 'view', defaultValue: 'upcoming', validValues: ['upcoming', 'all'] },
      { key: 'sort', defaultValue: 'date-desc', validValues: ['date-asc', 'date-desc', 'status'] },
      { key: 'group', defaultValue: 'category', validValues: ['category', 'date', 'none'] },
    ],
    listPath: LIST_PATH,
  })
  const { language, dir } = useLanguage()
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [changeDialogOpen, setChangeDialogOpen] = useState(false)
  const [changeAppointment, setChangeAppointment] = useState<any>(null)
  const [changeDate, setChangeDate] = useState<string | null>(null)
  const [changeTime, setChangeTime] = useState<string | null>(null)
  const [changeLoading, setChangeLoading] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [changeViewYear, setChangeViewYear] = useState(() => new Date().getFullYear())
  const [changeViewMonth, setChangeViewMonth] = useState(() => new Date().getMonth() + 1)
  const [debugInfo, setDebugInfo] = useState<{ count?: number; error?: string } | null>(null)

  // When ?labRequest=X is in URL, redirect to appointment detail with lab tab
  useEffect(() => {
    if (!labRequestParam || !user?.id) return
    const redirect = async () => {
      const { data } = await supabase
        .from('lab_test_requests')
        .select('appointment_id')
        .eq('id', labRequestParam)
        .eq('patient_id', user.id)
        .maybeSingle()
      if (data?.appointment_id) {
        router.replace(`/dashboard/appointments/${data.appointment_id}?labRequest=${labRequestParam}`, { scroll: true })
      } else {
        router.replace('/dashboard/prescriptions?tab=labtests', { scroll: true })
      }
    }
    redirect()
  }, [labRequestParam, user?.id, supabase, router])

  const fetchAppointments = async (opts?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false)
      return
    }
    if (!opts?.silent) setLoading(true)
    setDebugInfo(null)
    try {
      const lang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
      const [list, ticketsList] = await Promise.all([
        fetchAppointmentsFromSupabase(lang, debug),
        fetchTicketsFromSupabase(),
      ])
      setAppointments(list)
      setTickets(ticketsList)
      if (debug) setDebugInfo({ count: list.length })
    } catch (error) {
      console.error('[appointments] Error:', error)
      setAppointments([])
      setTickets([])
      if (debug) setDebugInfo({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  async function fetchTicketsFromSupabase(): Promise<any[]> {
    if (!user?.id) return []
    const { data, error } = await supabase
      .from('healthcare_tickets')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[appointments] Tickets fetch error:', error)
      return []
    }
    return data ?? []
  }

  async function fetchAppointmentsFromSupabase(lang: string, debugLog = false): Promise<any[]> {
    const userId = user!.id
    if (debugLog) console.log('[appointments] Fetching for patient_id:', userId)
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', userId)
      .order('appointment_date', { ascending: false })
      .limit(500) // Limit to prevent fetching thousands of rows
    if (error) {
      console.error('[appointments] Supabase fetch error:', error)
      return []
    }
    const statusCounts: Record<string, number> = {}
    for (const a of appointmentsData || []) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1
    }
    if (debugLog) console.log('[appointments] Raw rows:', appointmentsData?.length ?? 0, 'statuses:', statusCounts, 'user:', userId.slice(0, 8) + '…')
    if (!appointmentsData?.length) return []
    
    // Fetch tickets for these appointments (ticket-centric: every appointment has a ticket)
    const appointmentIds = appointmentsData.map((a: any) => a.id)
    const { data: ticketsData } = await supabase
      .from('healthcare_tickets')
      .select('id, ticket_number, appointment_id, status, ticket_type, metadata')
      .eq('patient_id', userId)
      .in('appointment_id', appointmentIds)
    const ticketByAppointmentId = new Map<string, any>()
    if (ticketsData) {
      ticketsData.forEach((t: any) => {
        if (t.appointment_id) ticketByAppointmentId.set(t.appointment_id, t)
      })
    }

    // Fallback: resolve pharmacy name from prescriptions when ticket metadata has no pharmacy_name (e.g. prescription sent to Pharmacie de nuit)
    const { data: prescriptionsData } = await supabase
      .from('prescriptions')
      .select('id, appointment_id, pharmacy_id')
      .in('appointment_id', appointmentIds)
      .not('pharmacy_id', 'is', null)
    const pharmacyIdsFromPrescriptions = [...new Set((prescriptionsData || []).map((p: any) => p.pharmacy_id).filter(Boolean))] as string[]
    const { data: pharmacyProfessionalsData } = pharmacyIdsFromPrescriptions.length
      ? await supabase
          .from('professionals')
          .select('id, business_name')
          .in('id', pharmacyIdsFromPrescriptions)
      : { data: [] }
    const pharmacyNameById = new Map((pharmacyProfessionalsData || []).map((p: any) => [p.id, p.business_name || 'Pharmacy']))
    const pharmacyNameByAppointmentId = new Map<string, string>()
    ;(prescriptionsData || []).forEach((p: any) => {
      if (p.appointment_id && p.pharmacy_id) {
        const name = pharmacyNameById.get(p.pharmacy_id)
        if (name) pharmacyNameByAppointmentId.set(p.appointment_id, name)
      }
    })

    const providerIds = [...new Set(
      appointmentsData.map((a: any) => a.doctor_id ?? a.professional_id).filter(Boolean)
    )] as string[]
    const { data: professionalsData } = providerIds.length
      ? await supabase
          .from('professionals')
          .select('id, business_name, business_name_ar, specialty, specialty_ar, phone, address')
          .in('id', providerIds)
      : { data: [] }
    const professionalsMap = new Map((professionalsData || []).map((p: any) => [p.id, p]))
    // Fallback: resolve doctor name from doctors + profiles when not in professionals (so list matches detail page)
    const { data: doctorsData } = providerIds.length
      ? await supabase
          .from('doctors')
          .select('id, full_name')
          .in('id', providerIds)
      : { data: [] }
    const { data: profilesData } = providerIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', providerIds)
      : { data: [] }
    const doctorNameByProviderId = new Map<string, string>()
    ;(doctorsData || []).forEach((d: any) => { if (d?.full_name?.trim()) doctorNameByProviderId.set(d.id, d.full_name.trim()) })
    ;(profilesData || []).forEach((p: any) => { if (p?.full_name?.trim() && !doctorNameByProviderId.has(p.id)) doctorNameByProviderId.set(p.id, p.full_name.trim()) })
    const transformed: any[] = []
    for (const apt of appointmentsData) {
      try {
        const providerId = apt.doctor_id ?? apt.professional_id
        const pro = professionalsMap.get(providerId) || {}
        const dispName = apt.doctor_display_name?.trim() || null
        const fallbackName = doctorNameByProviderId.get(providerId) || null
        const dispSpecialty = apt.doctor_specialty?.trim() || null
        const d = parseDateOnlyAsLocal(apt.appointment_date) ?? new Date(0)
        const dateStr = formatDateAlgeria(d, lang as 'ar' | 'fr' | 'en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        const dateStrAr = formatDateAlgeria(d, 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        const timeStr = typeof apt.appointment_time === 'string' ? apt.appointment_time.substring(0, 5) : '00:00'
        const isEvisit = apt.visit_type === 'e-visit'
        const ticket = ticketByAppointmentId.get(apt.id)
        const resolvedDoctorName = dispName || pro.business_name || fallbackName || 'Doctor'
        const resolvedDoctorNameAr = dispName || pro.business_name_ar || pro.business_name || fallbackName || 'طبيب'
        transformed.push({
          id: apt.id,
          doctorName: resolvedDoctorName,
          doctorNameAr: resolvedDoctorNameAr,
          specialty: dispSpecialty || pro.specialty || 'General Medicine',
          specialtyAr: dispSpecialty || pro.specialty_ar || pro.specialty || 'طب عام',
          date: dateStr,
          dateAr: dateStrAr,
          time: timeStr,
          location: isEvisit ? 'Video Call' : (pro.address || 'Clinic'),
          locationAr: isEvisit ? 'مكالمة فيديو' : (pro.address || 'عيادة'),
          type: isEvisit ? 'video' : 'in-person',
          status: apt.status,
          doctorPhone: pro.phone || '+213555000000',
          rawData: apt,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          appointment_type: isEvisit ? 'e-visit' : 'in-person',
          formattedDate: dateStr,
          formattedDateAr: dateStrAr,
          doctor: { address: isEvisit ? undefined : (pro.address || 'Clinic'), phone: pro.phone || '+213555000000' },
          ticket_number: ticket?.ticket_number || null,
          ticket_id: ticket?.id || null,
          ticket_status: ticket?.status || null,
          pharmacy_name: ticket?.metadata?.pharmacy_name || pharmacyNameByAppointmentId.get(apt.id) || null,
          doctor_id: apt.doctor_id ?? apt.professional_id,
        })
      } catch (e) {
        console.warn('[appointments] Skip transform for apt', apt?.id, e)
      }
    }
    if (debugLog && transformed.length !== (appointmentsData?.length ?? 0)) console.warn('[appointments] Transform dropped rows:', appointmentsData?.length, '->', transformed.length)
    return transformed
  }

  useEffect(() => {
    fetchAppointments()
  }, [user?.id, language, debug])

  useAutoRefresh(fetchAppointments, 60_000, { enabled: !!user })

  const handleJoinVideoCall = (appointmentId: string) => {
    console.log('[v0] Joining video call for appointment:', appointmentId)
    window.open(`/video-call/${appointmentId}`, '_blank')
  }

  const handleWhatsAppCall = (doctorPhone: string) => {
    window.open(`https://wa.me/${doctorPhone}`, '_blank')
  }

  const handlePhoneCall = (doctorPhone: string) => {
    window.location.href = `tel:${doctorPhone}`
  }

  const handleCancelAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setCancelDialogOpen(true)
  }

  const confirmCancelAppointment = async () => {
    if (selectedAppointmentId) {
      console.log('[v0] Cancelling appointment:', selectedAppointmentId)
      
      try {
        // Try to update in database if appointments were loaded from DB
        if (appointments.length > 0) {
          const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', selectedAppointmentId)
          
          if (error) {
            console.error('[v0] Error cancelling appointment in DB:', error)
          }
        }
        
        // Save to localStorage for persistence with mock data
        const cancelledIds = JSON.parse(localStorage.getItem('cancelledAppointments') || '[]')
        if (!cancelledIds.includes(selectedAppointmentId)) {
          cancelledIds.push(selectedAppointmentId)
          localStorage.setItem('cancelledAppointments', JSON.stringify(cancelledIds))
        }
        
        // Always update local state regardless of DB success
        setAppointments(prev => prev.map(apt => 
          apt.id === selectedAppointmentId 
            ? { ...apt, status: 'cancelled' }
            : apt
        ))
        
        setCancelDialogOpen(false)
        await fetchAppointments()
        setSuccessDialogOpen(true)
      } catch (error) {
        console.error('[v0] Error:', error)
        toast({
          title: language === 'ar' ? 'خطأ' : language === 'fr' ? 'Erreur' : 'Error',
          description: language === 'ar' 
            ? 'فشل في إلغاء الموعد'
            : language === 'fr'
            ? 'Échec de l\'annulation du rendez-vous'
            : 'Failed to cancel appointment',
          variant: 'destructive'
        })
      }
    }
  }

  const handleOpenChangeDateTime = (apt: any) => {
    const raw = apt.rawData
    const localDate = raw?.appointment_date ? parseDateOnlyAsLocal(raw.appointment_date) : null
    const dateVal = localDate ? toDateOnlyString(localDate) : null
    const timeStr = (apt.time ?? raw?.appointment_time ?? '')
    const timeNormalized = typeof timeStr === 'string' ? timeStr.substring(0, 5) : ''
    const initialTime = timeNormalized && RESCHEDULE_TIME_SLOTS.includes(timeNormalized) ? timeNormalized : null
    setChangeAppointment(apt)
    setChangeDate(dateVal)
    setChangeTime(initialTime)
    if (dateVal) {
      const [y, m] = dateVal.split('-').map(Number)
      setChangeViewYear(y)
      setChangeViewMonth(m)
    } else {
      const now = new Date()
      setChangeViewYear(now.getFullYear())
      setChangeViewMonth(now.getMonth() + 1)
    }
    setChangeDialogOpen(true)
    setBookedSlots([])
  }

  useEffect(() => {
    if (!changeDialogOpen || !changeAppointment || !changeDate) {
      setBookedSlots([])
      return
    }
    const providerId = changeAppointment.rawData?.doctor_id ?? changeAppointment.rawData?.professional_id
    if (!providerId) {
      setBookedSlots([])
      return
    }
    const fetchBooked = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('id, appointment_time, doctor_id, professional_id')
        .eq('appointment_date', changeDate)
        .neq('status', 'cancelled')
      const rows = (data || []).filter((r: any) => (r.doctor_id ?? r.professional_id) === providerId)
      const other = rows.filter((r: any) => r.id !== changeAppointment?.id)
      const taken = other.map((r: any) => (r.appointment_time || '').substring(0, 5)).filter(Boolean)
      setBookedSlots(taken)
    }
    fetchBooked()
  }, [changeDialogOpen, changeAppointment, changeDate, supabase])

  const availableSlots = RESCHEDULE_TIME_SLOTS.filter(t => !bookedSlots.includes(t))

  const confirmChangeDateTime = async () => {
    if (!changeAppointment || !changeDate || !changeTime) return
    setChangeLoading(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: changeDate,
          appointment_time: changeTime.length === 5 ? `${changeTime}:00` : changeTime
        })
        .eq('id', changeAppointment.id)
      if (error) throw error
      setChangeDialogOpen(false)
      setChangeAppointment(null)
      setChangeDate(null)
      setChangeTime(null)
      await fetchAppointments()
      toast({
        title: language === 'ar' ? 'تم تغيير الموعد' : language === 'fr' ? 'Rendez-vous modifié' : 'Appointment updated',
        description: language === 'ar' ? 'تم تغيير التاريخ والوقت بنجاح.' : language === 'fr' ? 'Date et heure mises à jour.' : 'Date and time updated successfully.',
      })
    } catch (e: any) {
      console.error('[appointments] Change date/time error:', e)
      toast({
        title: language === 'ar' ? 'خطأ' : language === 'fr' ? 'Erreur' : 'Error',
        description: e?.message || (language === 'ar' ? 'فشل تغيير الموعد' : language === 'fr' ? 'Échec de la modification' : 'Failed to update appointment'),
        variant: 'destructive'
      })
    } finally {
      setChangeLoading(false)
    }
  }

  // UNIFIED MODEL: Merge appointments and tickets into one list - memoized for performance
  // Every appointment has a ticket, and standalone tickets are treated as appointment-like items
  
  const { sortedUnified, upcomingItems, completedItems, cancelledItems } = useMemo(() => {
    // Create a map of appointments by ID for quick lookup
    const appointmentsById = new Map(appointments.map(apt => [apt.id, apt]))
    
    // Create a map of ticket IDs that are already represented by appointments
    const ticketsWithAppointments = new Set<string>()
    tickets.forEach(t => {
      if (t.appointment_id && appointmentsById.has(t.appointment_id)) {
        ticketsWithAppointments.add(t.id)
      }
    })
    
    // Merge tickets with appointments: tickets WITH appointments are already represented by the appointment
    // Tickets WITHOUT appointments (or whose appointments aren't in our list) become standalone items
    const standaloneTickets = tickets.filter(t => {
      // Exclude tickets that are already represented by an appointment
      if (ticketsWithAppointments.has(t.id)) return false
      // Include all other tickets (standalone tickets)
      return true
    })
    
    // Convert standalone tickets to appointment-like objects for unified display
    const standaloneAsAppointments = standaloneTickets.map(ticket => {
      const ticketDate = ticket.metadata?.appointment_date || ticket.created_at
      const ticketTime = ticket.metadata?.appointment_time || ''
      const isCompleted = ticket.status === 'completed' || ticket.status === 'visit_completed'
      return {
        id: `ticket-${ticket.id}`, // Unique ID
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        ticket_status: ticket.status,
        ticket_type: ticket.ticket_type || ticket.type,
        isStandaloneTicket: true,
        doctorName: ticket.metadata?.doctor_name || 'Healthcare Provider',
        doctorNameAr: ticket.metadata?.doctor_name || 'مقدم الرعاية الصحية',
        specialty: ticket.ticket_type === 'prescription' ? 'Prescription' : ticket.ticket_type === 'lab_request' ? 'Lab Request' : 'Healthcare',
        specialtyAr: ticket.ticket_type === 'prescription' ? 'وصفة طبية' : ticket.ticket_type === 'lab_request' ? 'طلب مختبر' : 'رعاية صحية',
        date: ticketDate ? formatDateAlgeria(new Date(ticketDate), language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '',
        dateAr: ticketDate ? formatDateAlgeria(new Date(ticketDate), 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '',
        time: ticketTime || '',
        appointment_date: ticketDate,
        appointment_time: ticketTime,
        status: ticket.status === 'confirmed' ? 'confirmed' : ticket.status === 'pending' ? 'pending' : isCompleted ? 'completed' : ticket.status === 'cancelled' ? 'cancelled' : 'pending',
        type: 'in-person',
        location: 'See appointment details',
        locationAr: 'انظر تفاصيل الموعد',
        pharmacy_name: ticket.metadata?.pharmacy_name || null,
        doctor_id: null,
        rawData: ticket,
      }
    })
    
    // Merge appointments + standalone tickets into ONE unified list
    const unifiedItems = [...appointments, ...standaloneAsAppointments]
    
    // Sort unified list: upcoming first, then completed, then cancelled at bottom
    const sortPriority = (item: any) => {
      if (item.status === 'cancelled') return 3 // Bottom
      if (item.status === 'completed') return 2 // Middle
      return 1 // Top (pending/confirmed)
    }
    const sortedUnified = [...unifiedItems].sort((a, b) => {
      const priorityDiff = sortPriority(a) - sortPriority(b)
      if (priorityDiff !== 0) return priorityDiff
      // Within same priority, sort by date (upcoming first, then most recent)
      const dateA = new Date(a.appointment_date || a.rawData?.appointment_date || a.created_at || 0).getTime()
      const dateB = new Date(b.appointment_date || b.rawData?.appointment_date || b.created_at || 0).getTime()
      // For upcoming, sort ascending (earliest first). For history, sort descending (most recent first)
      const isUpcoming = sortPriority(a) === 1
      return isUpcoming ? dateA - dateB : dateB - dateA
    })

    // Filter unified list by status
    const upcomingItems = sortedUnified.filter(item => 
      item.status === 'confirmed' || item.status === 'pending'
    )
    const completedItems = sortedUnified.filter(item => item.status === 'completed')
    const cancelledItems = sortedUnified.filter(item => item.status === 'cancelled') // Always at bottom
    
    return { sortedUnified, upcomingItems, completedItems, cancelledItems }
  }, [appointments, tickets, language])

  // Category for "All" tab: group by status/type, then sort by date within each
  type CategoryKey = 'upcoming' | 'prescription_pharmacy' | 'in_progress' | 'lab' | 'completed' | 'cancelled'
  const CATEGORY_ORDER: CategoryKey[] = ['upcoming', 'prescription_pharmacy', 'in_progress', 'lab', 'completed', 'cancelled']
  function getCategory(item: any): CategoryKey {
    if (item.status === 'cancelled') return 'cancelled'
    if (item.status === 'completed' || item.ticket_status === 'visit_completed') return 'completed'
    const ticketStatus = item.ticket_status ?? item.rawData?.status
    const ticketType = item.ticket_type ?? item.rawData?.ticket_type ?? item.rawData?.type
    if (['prescription_sent', 'sent', 'ready_for_pickup', 'processing'].includes(ticketStatus)) return 'prescription_pharmacy'
    if (ticketType === 'lab_request') return 'lab'
    if (item.status === 'pending' || item.status === 'confirmed') return 'upcoming'
    if (['in_progress', 'created'].includes(ticketStatus) || ticketStatus) return 'in_progress'
    return 'completed'
  }
  const allByCategory = new Map<CategoryKey, any[]>()
  CATEGORY_ORDER.forEach(k => allByCategory.set(k, []))
  sortedUnified.forEach(item => {
    const cat = getCategory(item)
    allByCategory.get(cat)!.push(item)
  })
  CATEGORY_ORDER.forEach(cat => {
    const list = allByCategory.get(cat)!
    const isUpcoming = cat === 'upcoming'
    list.sort((a, b) => {
      const dateA = new Date(a.appointment_date || a.rawData?.appointment_date || a.rawData?.created_at || 0).getTime()
      const dateB = new Date(b.appointment_date || b.rawData?.appointment_date || b.rawData?.created_at || 0).getTime()
      return isUpcoming ? dateA - dateB : dateB - dateA
    })
  })
  // Unique doctors from past appointments (completed/cancelled) for quick rebook
  const myDoctors = useMemo(() => {
    const seen = new Map<string, { doctor_id: string; doctorName: string; doctorNameAr: string; specialty: string; specialtyAr: string }>()
    for (const apt of appointments) {
      if (apt.doctor_id && (apt.status === 'completed' || apt.status === 'cancelled')) {
        if (!seen.has(apt.doctor_id)) {
          seen.set(apt.doctor_id, {
            doctor_id: apt.doctor_id,
            doctorName: apt.doctorName || 'Doctor',
            doctorNameAr: apt.doctorNameAr || 'طبيب',
            specialty: apt.specialty || 'General Medicine',
            specialtyAr: apt.specialtyAr || 'طب عام',
          })
        }
      }
    }
    return Array.from(seen.values())
  }, [appointments])

  const categorySectionLabels: Record<CategoryKey, { en: string; fr: string; ar: string }> = {
    upcoming: { en: 'Upcoming', fr: 'À venir', ar: 'القادم' },
    prescription_pharmacy: { en: 'Prescription / Pharmacy', fr: 'Ordonnance / Pharmacie', ar: 'الوصفة / الصيدلية' },
    in_progress: { en: 'In progress', fr: 'En cours', ar: 'قيد المعالجة' },
    lab: { en: 'Lab requests', fr: 'Demandes labo', ar: 'طلبات المختبر' },
    completed: { en: 'Completed', fr: 'Terminés', ar: 'المكتملة' },
    cancelled: { en: 'Cancelled', fr: 'Annulés', ar: 'الملغاة' },
  }

  // Apply sort and group from URL
  const sortBy = urlState.sort || 'date-desc'
  const groupBy = urlState.group || 'category'
  const { displayedUpcoming, displayedAllByCategory, displayedAllFlat } = useMemo(() => {
    const getDate = (item: any) => new Date(item.appointment_date || item.rawData?.appointment_date || item.rawData?.created_at || 0).getTime()
    const upcomingSorted = [...upcomingItems].sort((a, b) =>
      sortBy === 'date-asc' ? getDate(a) - getDate(b) : getDate(b) - getDate(a)
    )
    const byCat = new Map<CategoryKey, any[]>()
    CATEGORY_ORDER.forEach(k => byCat.set(k, []))
    sortedUnified.forEach(item => byCat.get(getCategory(item))!.push(item))
    CATEGORY_ORDER.forEach(cat => {
      const list = byCat.get(cat)!
      list.sort((a, b) => (sortBy === 'date-asc' ? getDate(a) - getDate(b) : getDate(b) - getDate(a)))
    })
    const allFlat = [...sortedUnified].sort((a, b) => {
      if (sortBy === 'status') {
        const catA = CATEGORY_ORDER.indexOf(getCategory(a))
        const catB = CATEGORY_ORDER.indexOf(getCategory(b))
        if (catA !== catB) return catA - catB
      }
      const dA = getDate(a)
      const dB = getDate(b)
      return sortBy === 'date-asc' ? dA - dB : dB - dA
    })
    return {
      displayedUpcoming: upcomingSorted,
      displayedAllByCategory: byCat,
      displayedAllFlat: allFlat,
    }
  }, [upcomingItems, sortedUnified, sortBy])

  const langStatus: StatusLanguage = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  function getAppointmentStatusLabel(status: string | undefined, pharmacyName?: string | null) {
    return getStatusLabel(status, pharmacyName ?? null, langStatus)
  }

  const typeIcons: Record<string, any> = {
    appointment: CalendarIcon,
    prescription: Pill,
    lab_request: TestTube,
    referral: FileText,
  }

  if (loading) {
    return (
      <DashboardPageWrapper maxWidth="xl" showHeader={false}>
        <SectionLoading
          minHeight="min-h-[280px]"
          label={language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}
        />
      </DashboardPageWrapper>
    )
  }

  return (
    <DashboardPageWrapper maxWidth="xl" showHeader={false}>
      {/* Header — clean, minimal */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight min-w-0">
            {language === 'ar' ? 'مواعيدي' : language === 'fr' ? 'Mes Rendez-vous' : 'My Appointments'}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="rounded-xl h-9 px-3 gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {language === 'ar' ? 'ترتيب وتجميع' : language === 'fr' ? 'Trier & grouper' : 'Sort & group'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {language === 'ar' ? 'ترتيب حسب' : language === 'fr' ? 'Trier par' : 'Sort by'}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => updateUrl('sort', 'date-desc')}>
                    {sortBy === 'date-desc' && <span className="me-2">✓</span>}
                    {language === 'ar' ? 'التاريخ (الأحدث أولاً)' : language === 'fr' ? 'Date (plus récent)' : 'Date (newest first)'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateUrl('sort', 'date-asc')}>
                    {sortBy === 'date-asc' && <span className="me-2">✓</span>}
                    {language === 'ar' ? 'التاريخ (الأقدم أولاً)' : language === 'fr' ? 'Date (plus ancien)' : 'Date (oldest first)'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateUrl('sort', 'status')}>
                    {sortBy === 'status' && <span className="me-2">✓</span>}
                    {language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  {language === 'ar' ? 'تجميع حسب' : language === 'fr' ? 'Grouper par' : 'Group by'}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => updateUrl('group', 'category')}>
                    {groupBy === 'category' && <span className="me-2">✓</span>}
                    {language === 'ar' ? 'الفئة' : language === 'fr' ? 'Catégorie' : 'Category'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateUrl('group', 'date')}>
                    {groupBy === 'date' && <span className="me-2">✓</span>}
                    {language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateUrl('group', 'none')}>
                    {groupBy === 'none' && <span className="me-2">✓</span>}
                    {language === 'ar' ? 'بدون تجميع' : language === 'fr' ? 'Aucun' : 'None'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/booking/new">
              <Button size="default" className="rounded-xl h-9 px-4">
                <Plus className="h-4 w-4 me-2" />
                {language === 'ar' ? 'حجز موعد' : language === 'fr' ? 'Nouveau rendez-vous' : 'Book Appointment'}
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-0">
          {language === 'ar' ? 'مواعيدك ورعايتك الصحية' : language === 'fr' ? 'Rendez-vous et suivi médical' : 'Your appointments and healthcare'}
        </p>
      </header>

        {debug && (
          <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm font-mono space-y-1">
            <div>User ID: {user?.id?.slice(0, 8)}…</div>
            <div>Appointments: {appointments.length} | Tickets: {tickets.length} | Unified: {sortedUnified.length}</div>
            {debugInfo?.error && <div className="text-red-500">Error: {debugInfo.error}</div>}
          </div>
        )}

        {/* My doctors — quick rebook */}
        {myDoctors.length > 0 && (
          <div className="rounded-2xl border bg-card p-4 md:p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              {language === 'ar' ? 'أعد الحجز مع طبيب سابق' : language === 'fr' ? 'Revoir un médecin' : 'Rebook with a doctor you\'ve seen'}
            </h2>
            {/* Mobile: horizontal row (same as desktop). Desktop: horizontal scroll */}
            <div className="flex flex-row gap-3 overflow-x-auto overflow-y-hidden pb-2 sm:hidden">
              {myDoctors.map((d) => (
                <Link
                  key={d.doctor_id}
                  href={`/booking/new?doctor=${d.doctor_id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-colors min-w-[200px] shrink-0"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{language === 'ar' ? d.doctorNameAr : d.doctorName}</p>
                    <p className="text-xs text-muted-foreground truncate">{language === 'ar' ? d.specialtyAr : d.specialty}</p>
                  </div>
                  <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
                </Link>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto overflow-y-hidden -mx-1 px-1">
              <div className="flex gap-3 pb-2 pe-2 min-w-max" dir="ltr">
                {myDoctors.map((d) => (
                  <Link
                    key={d.doctor_id}
                    href={`/booking/new?doctor=${d.doctor_id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-colors min-w-[200px] shrink-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{language === 'ar' ? d.doctorNameAr : d.doctorName}</p>
                      <p className="text-xs text-muted-foreground truncate">{language === 'ar' ? d.specialtyAr : d.specialty}</p>
                    </div>
                    <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs + menu control */}
        <Tabs
          value={urlState.view}
          onValueChange={(v) => {
            const val = v as 'upcoming' | 'all'
            updateUrl('view', val)
          }}
          className="w-full"
        >
          <TabsList className="h-auto min-h-11 p-1 rounded-xl bg-muted/50 border flex flex-wrap sm:inline-flex w-full sm:w-fit gap-1">
            <TabsTrigger value="upcoming" className="gap-2 text-sm rounded-lg px-5 border border-transparent data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 data-[state=active]:shadow-sm [&[data-state=active]_span]:text-primary/80">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              {language === 'ar' ? 'القادم' : language === 'fr' ? 'À venir' : 'Upcoming'}
              {upcomingItems.length > 0 && (
                <span className="text-xs text-muted-foreground">({upcomingItems.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 text-sm rounded-lg px-5 border border-transparent data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 data-[state=active]:shadow-sm [&[data-state=active]_span]:text-primary/80">
              <FileText className="h-4 w-4 shrink-0" />
              {language === 'ar' ? 'الكل' : language === 'fr' ? 'Historique' : 'History'}
              {sortedUnified.length > 0 && (
                <span className="text-xs text-muted-foreground">({sortedUnified.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-8">
            {displayedUpcoming.length === 0 ? (
              <Empty className="rounded-2xl border-2 border-dashed bg-muted/20 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="rounded-2xl">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl">
                    {language === 'ar' ? 'لا توجد مواعيد قادمة' : language === 'fr' ? 'Aucun rendez-vous à venir' : 'No upcoming appointments'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {language === 'ar' ? 'احجز موعدك الأول مع طبيبك' : language === 'fr' ? 'Réservez votre premier rendez-vous' : 'Book your first appointment with a doctor'}
                  </EmptyDescription>
                </EmptyHeader>
                <Link href="/booking/new" className="mt-6">
                  <Button size="lg" className="rounded-xl">
                    {language === 'ar' ? 'احجز موعداً' : language === 'fr' ? 'Réserver' : 'Book appointment'}
                  </Button>
                </Link>
              </Empty>
            ) : (
              <div className="space-y-4">
                {displayedUpcoming.map((item, index) => (
                  <AppointmentCard
                    key={item.id}
                    item={item}
                    stripe={index % 2 === 1}
                    language={language}
                    dir={dir}
                    langStatus={langStatus}
                    getStatusLabel={getAppointmentStatusLabel}
                    typeIcons={typeIcons}
                    isUpcoming
                    onJoinVideo={handleJoinVideoCall}
                    onPhoneCall={handlePhoneCall}
                    onWhatsApp={handleWhatsAppCall}
                    onReschedule={handleOpenChangeDateTime}
                    onCancel={handleCancelAppointment}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-8">
            {displayedAllFlat.length === 0 ? (
              <Empty className="rounded-2xl border-2 border-dashed bg-muted/20 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="rounded-2xl">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl">
                    {language === 'ar' ? 'لا توجد مواعيد' : language === 'fr' ? 'Aucun rendez-vous' : 'No appointments yet'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {language === 'ar' ? 'سيظهر سجل مواعيدك هنا' : language === 'fr' ? 'Votre historique apparaîtra ici' : 'Your appointment history will appear here'}
                  </EmptyDescription>
                </EmptyHeader>
                <Link href="/booking/new" className="mt-6">
                  <Button size="lg" className="rounded-xl">
                    {language === 'ar' ? 'احجز موعداً' : language === 'fr' ? 'Réserver' : 'Book appointment'}
                  </Button>
                </Link>
              </Empty>
            ) : groupBy === 'category' ? (
              <div className="space-y-10">
                {CATEGORY_ORDER.map((cat) => {
                  const catItems = displayedAllByCategory.get(cat)!
                  if (catItems.length === 0) return null
                  const labels = categorySectionLabels[cat]
                  const sectionTitle = language === 'ar' ? labels.ar : language === 'fr' ? labels.fr : labels.en
                  const isCancelled = cat === 'cancelled'
                  return (
                    <section key={cat}>
                      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        {cat === 'prescription_pharmacy' && <Pill className="h-4 w-4 text-primary" />}
                        {cat === 'lab' && <TestTube className="h-4 w-4 text-primary" />}
                        {sectionTitle}
                        <Badge variant="secondary" className="text-xs rounded-md">{catItems.length}</Badge>
                      </h2>
                      <div className={cn('space-y-3', isCancelled && 'opacity-80')}>
                        {catItems.map((item, index) => (
                          <AppointmentCard
                            key={item.id}
                            item={item}
                            stripe={index % 2 === 1}
                            language={language}
                            dir={dir}
                            langStatus={langStatus}
                            getStatusLabel={getAppointmentStatusLabel}
                            typeIcons={typeIcons}
                            isUpcoming={cat === 'upcoming'}
                            onJoinVideo={handleJoinVideoCall}
                            onPhoneCall={handlePhoneCall}
                            onWhatsApp={handleWhatsAppCall}
                            onReschedule={handleOpenChangeDateTime}
                            onCancel={handleCancelAppointment}
                            variant={cat === 'upcoming' ? 'full' : 'compact'}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            ) : groupBy === 'date' ? (
              (() => {
                const byDate = new Map<string, any[]>()
                displayedAllFlat.forEach((item) => {
                  const d = item.appointment_date || item.rawData?.appointment_date || item.rawData?.created_at
                  const key = d ? toDateOnlyString(new Date(d)) : 'unknown'
                  if (!byDate.has(key)) byDate.set(key, [])
                  byDate.get(key)!.push(item)
                })
                const dates = Array.from(byDate.keys()).sort((a, b) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)))
                return (
                  <div className="space-y-10">
                    {dates.map((dateKey) => {
                      const items = byDate.get(dateKey)!
                      const label = dateKey === 'unknown'
                        ? (language === 'ar' ? 'غير معروف' : language === 'fr' ? 'Inconnu' : 'Unknown')
                        : formatDateAlgeria(new Date(dateKey + 'T12:00:00'), language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      return (
                        <section key={dateKey}>
                          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            {label}
                            <Badge variant="secondary" className="text-xs rounded-md">{items.length}</Badge>
                          </h2>
                          <div className="space-y-3">
                            {items.map((item, index) => (
                              <AppointmentCard
                                key={item.id}
                                item={item}
                                stripe={index % 2 === 1}
                                language={language}
                                dir={dir}
                                langStatus={langStatus}
                                getStatusLabel={getAppointmentStatusLabel}
                                typeIcons={typeIcons}
                                isUpcoming={item.status === 'confirmed' || item.status === 'pending'}
                                onJoinVideo={handleJoinVideoCall}
                                onPhoneCall={handlePhoneCall}
                                onWhatsApp={handleWhatsAppCall}
                                onReschedule={handleOpenChangeDateTime}
                                onCancel={handleCancelAppointment}
                                variant={(item.status === 'confirmed' || item.status === 'pending') ? 'full' : 'compact'}
                              />
                            ))}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                )
              })()
            ) : (
              <div className="space-y-3">
                {displayedAllFlat.map((item, index) => (
                  <AppointmentCard
                    key={item.id}
                    item={item}
                    stripe={index % 2 === 1}
                    language={language}
                    dir={dir}
                    langStatus={langStatus}
                    getStatusLabel={getAppointmentStatusLabel}
                    typeIcons={typeIcons}
                    isUpcoming={item.status === 'confirmed' || item.status === 'pending'}
                    onJoinVideo={handleJoinVideoCall}
                    onPhoneCall={handlePhoneCall}
                    onWhatsApp={handleWhatsAppCall}
                    onReschedule={handleOpenChangeDateTime}
                    onCancel={handleCancelAppointment}
                    variant={(item.status === 'confirmed' || item.status === 'pending') ? 'full' : 'compact'}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs — Cancel, Success, Change date/time */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'إلغاء الموعد' : language === 'fr' ? 'Annuler le rendez-vous' : 'Cancel Appointment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد أنك تريد إلغاء هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.'
                : language === 'fr'
                ? 'Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action ne peut pas être annulée.'
                : 'Are you sure you want to cancel this appointment? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Go Back'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAppointment} className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700">
              {language === 'ar' ? 'نعم، إلغاء الموعد' : language === 'fr' ? 'Oui, annuler' : 'Yes, Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Confirmation Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={(open) => {
        setSuccessDialogOpen(open)
        if (!open) {
          setSelectedAppointmentId(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {language === 'ar' ? '✓ تم الإلغاء بنجاح' : language === 'fr' ? '✓ Annulation réussie' : '✓ Cancellation Successful'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              {language === 'ar' 
                ? 'تم إلغاء موعدك بنجاح. يمكنك العثور عليه في قسم المواعيد الملغاة أدناه.'
                : language === 'fr'
                ? 'Votre rendez-vous a été annulé avec succès. Vous pouvez le retrouver dans la section des rendez-vous annulés ci-dessous.'
                : 'Your appointment has been cancelled successfully. You can find it in the cancelled appointments section below.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setSuccessDialogOpen(false)} className="w-full sm:w-auto">
              {language === 'ar' ? 'حسناً' : language === 'fr' ? 'D\'accord' : 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change date/time Dialog */}
      <Dialog open={changeDialogOpen} onOpenChange={(open) => {
        setChangeDialogOpen(open)
        if (!open) {
          setChangeAppointment(null)
          setChangeDate(null)
          setChangeTime(null)
        }
      }}>
        <DialogContent size="xl" style={{width: '720px'}} className="rounded-2xl" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تغيير التاريخ والوقت' : language === 'fr' ? 'Changer la date et l\'heure' : 'Change date/time'}
            </DialogTitle>
            {changeAppointment && (
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'مع' : language === 'fr' ? 'Avec' : 'With'}{' '}
                {language === 'ar' ? changeAppointment.doctorNameAr : changeAppointment.doctorName}
              </p>
            )}
          </DialogHeader>
          {changeAppointment && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Date: Custom calendar (local dates, single selection) */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}
                </p>
                {(() => {
                  const now = new Date()
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                  const year = changeViewYear
                  const month = changeViewMonth
                  const first = new Date(year, month - 1, 1)
                  const last = new Date(year, month, 0)
                  const startPad = first.getDay()
                  const daysInMonth = last.getDate()
                  const monthLabel = formatDateAlgeria(first, language === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' })
                  const canPrev = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)
                  const limit = new Date(now.getFullYear(), now.getMonth() + 2, 1)
                  const limitYear = limit.getFullYear()
                  const limitMonth = limit.getMonth() + 1
                  const canNext = year < limitYear || (year === limitYear && month < limitMonth)
                  const weekdays = language === 'ar'
                    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
                    : language === 'fr'
                      ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
                      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                  const cells: { type: 'pad' | 'day'; dateStr?: string; day?: number; disabled?: boolean }[] = []
                  for (let i = 0; i < startPad; i++) cells.push({ type: 'pad' })
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    cells.push({ type: 'day', dateStr, day: d, disabled: dateStr < todayStr })
                  }
                  while (cells.length < 42) cells.push({ type: 'pad' })
                  return (
                    <div className="rounded-lg border bg-card p-4 sm:p-5 w-full min-w-[280px] sm:min-w-[320px] max-w-[360px]">
                      <div className="flex items-center justify-between mb-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!canPrev}
                          onClick={() => {
                            if (month === 1) {
                              setChangeViewYear(year - 1)
                              setChangeViewMonth(12)
                            } else {
                              setChangeViewMonth(month - 1)
                            }
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm sm:text-base font-medium min-w-[140px] text-center">{monthLabel}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!canNext}
                          onClick={() => {
                            if (month === 12) {
                              setChangeViewYear(year + 1)
                              setChangeViewMonth(1)
                            } else {
                              setChangeViewMonth(month + 1)
                            }
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {weekdays.map((w) => (
                          <div key={w} className="text-[0.65rem] sm:text-xs text-muted-foreground font-medium py-1.5 leading-tight break-words min-w-0" title={w}>
                            {w}
                          </div>
                        ))}
                        {cells.map((cell, idx) =>
                          cell.type === 'pad' ? (
                            <div key={`pad-${idx}`} className="aspect-square" />
                          ) : (
                            <Button
                              key={cell.dateStr}
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'aspect-square h-9 w-9 sm:h-10 sm:w-10 text-sm sm:text-base',
                                cell.disabled && 'opacity-40 cursor-not-allowed',
                                changeDate === cell.dateStr &&
                                  'bg-primary dark:bg-emerald-500 text-primary-foreground dark:text-white hover:bg-primary/90 dark:hover:bg-emerald-600'
                              )}
                              disabled={cell.disabled}
                              onClick={() => {
                                if (cell.dateStr && !cell.disabled) {
                                  setChangeDate(cell.dateStr)
                                  setChangeTime(null)
                                }
                              }}
                            >
                              {cell.day}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
              {/* Time: AM/PM slots */}
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  {language === 'ar' ? 'الوقت (المتاح فقط)' : language === 'fr' ? 'Heure (disponible)' : 'Time (available only)'}
                </p>
                {!changeDate ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {language === 'ar' ? 'اختر تاريخًا أولاً' : language === 'fr' ? 'Choisissez d\'abord une date' : 'Select a date first'}
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {language === 'ar' ? 'لا توجد أوقات متاحة في هذا اليوم.' : language === 'fr' ? 'Aucun créneau disponible ce jour.' : 'No slots available on this day.'}
                  </p>
                ) : (
                  <ScrollArea className="h-[280px] pr-3">
                    <div className="space-y-4">
                      {RESCHEDULE_AM.some((t) => availableSlots.includes(t)) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                            {language === 'ar' ? 'صباحاً' : language === 'fr' ? 'Matin' : 'Morning'}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {RESCHEDULE_AM.filter((t) => availableSlots.includes(t)).map((t) => {
                              const isSelected = changeTime === t
                              return (
                                <Button
                                  key={t}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    !isSelected && 'bg-transparent',
                                    isSelected && 'bg-primary dark:bg-emerald-500 hover:bg-primary/90 dark:hover:bg-emerald-600 text-white border-primary dark:border-emerald-500'
                                  )}
                                  onClick={() => setChangeTime(t)}
                                >
                                  {t}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {RESCHEDULE_PM.some((t) => availableSlots.includes(t)) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                            {language === 'ar' ? 'بعد الظهر' : language === 'fr' ? 'Après-midi' : 'Afternoon'}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {RESCHEDULE_PM.filter((t) => availableSlots.includes(t)).map((t) => {
                              const isSelected = changeTime === t
                              return (
                                <Button
                                  key={t}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    !isSelected && 'bg-transparent',
                                    isSelected && 'bg-primary dark:bg-emerald-500 hover:bg-primary/90 dark:hover:bg-emerald-600 text-white border-primary dark:border-emerald-500'
                                  )}
                                  onClick={() => setChangeTime(t)}
                                >
                                  {t}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button
              onClick={confirmChangeDateTime}
              disabled={!changeDate || !changeTime || changeLoading}
            >
              {changeLoading ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  {language === 'ar' ? 'جاري...' : language === 'fr' ? 'En cours...' : 'Updating...'}
                </>
              ) : (
                language === 'ar' ? 'تأكيد التغيير' : language === 'fr' ? 'Confirmer' : 'Confirm change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPageWrapper>
  )
}

'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EditableAvatar } from '@/components/editable-avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  Stethoscope, Calendar, Users, DollarSign, TrendingUp, TrendingDown,
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Settings, Search,
  FileText, Pill, FlaskConical, MessageSquare, Star, Activity, Heart,
  BarChart3, PieChart as PieChartIcon, Wallet, CreditCard, ArrowUpRight, ArrowDownRight,
  Filter, Download, RefreshCw, MoreHorizontal, ChevronRight, ChevronDown, Plus,
  Video, Phone, MapPin, Mail, Shield, Eye, EyeOff, Zap, Target,
  Briefcase, GraduationCap, Award, Building2, Layers, Grid3X3,
  LayoutDashboard, CalendarDays, UserCheck, Receipt, Cog, HelpCircle,
  LogOut, Moon, Sun, Globe, Volume2, VolumeX, Lock, Smartphone,
  ChevronLeft, Home, Clipboard, Banknote, BarChart2,
  PenTool, ImageIcon, Send, Inbox, Archive, Trash2, Edit, Copy, Share2
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getStatCardClasses, getStatCardTextLight } from '@/lib/dashboard-stat-colors'
import { useToast } from '@/hooks/use-toast'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'
import { ProDocumentsSection } from './pro-documents-section'
import { SuppliersSection } from './suppliers-section'
import { PatientDocumentsView } from '@/components/patient-documents-view'
import { AvailabilityCalendar } from './availability-calendar'
import { Skeleton } from '@/components/ui/skeleton'
import ProfessionalPOSUnified from './pos/professional-pos-unified'

interface DoctorProDashboardProps {
  professional: any
  profile: any
  authUserId?: string | null
  avatarUrl?: string | null
  onAvatarUpdate?: () => void
  onSignOut: () => void
  onProfessionalUpdate?: () => void
  initialSection?: string
  employeePermissions?: Record<string, Record<string, boolean>> | null
  employeeUsername?: string | null
}

/** Doctor section id -> permission key(s); only sections relevant to doctor (no lab tests, no POS). */
const DOCTOR_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  schedule: ['appointments', 'overview'],
  appointments: ['appointments'],
  patients: ['patients'],
  messages: ['messages'],
  prescriptions: ['prescriptions'],
  'lab-requests': ['lab_requests'],
  analytics: ['analytics'],
  finances: ['finances'],
  documents: ['documents'],
  settings: ['settings'],
}

function canAccessDoctorSection(perms: Record<string, boolean> | null | undefined, sectionId: string): boolean {
  if (!perms) return true
  const keys = DOCTOR_SECTION_PERMISSIONS[sectionId]
  if (!keys) return true
  return keys.some(k => perms[k] === true)
}

const DOCTOR_SECTION_IDS = ['overview', 'schedule', 'appointments', 'patients', 'messages', 'pos', 'prescriptions', 'lab-requests', 'analytics', 'finances', 'documents', 'settings'] as const

const CHART_COLORS = { inPerson: '#0891b2', video: '#7c3aed', phone: '#f59e0b', homeVisit: '#10b981' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function DoctorProDashboard({ professional, profile, authUserId, avatarUrl, onAvatarUpdate, onSignOut, onProfessionalUpdate, initialSection = 'overview', employeePermissions, employeeUsername }: DoctorProDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [isOnline, setIsOnline] = useState(true)
  const [acceptingPatients, setAcceptingPatients] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [appointmentsSearch, setAppointmentsSearch] = useState('')
  const [appointmentsStatusFilter, setAppointmentsStatusFilter] = useState('all')
  const [appointments, setAppointments] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [professionalPatients, setProfessionalPatients] = useState<any[]>([])
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null)
  const [patientVisits, setPatientVisits] = useState<any[]>([])
  const [loadingPatientVisits, setLoadingPatientVisits] = useState(false)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [revenueChartData, setRevenueChartData] = useState<{ month: string; revenue: number; patients: number; consultations: number }[]>([])
  const [appointmentTypeChart, setAppointmentTypeChart] = useState<{ name: string; value: number; color: string }[]>([])
  const [weeklyChartData, setWeeklyChartData] = useState<{ day: string; appointments: number; completed: number }[]>([])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    todayVsYesterday: null as number | null,
    todayCompleted: 0,
    weekAppointments: 0,
    totalPatients: 0,
    newPatientsWeek: 0,
    monthlyRevenue: 0,
    revenueGrowth: null as number | null,
    rating: 0,
    reviewCount: 0,
    completionRate: 0,
    avgWaitTime: 0,
    pendingPrescriptions: 0,
    pendingLabRequests: 0,
  })

  useEffect(() => {
    if (!professional?.id) return
    loadDashboardData()
  }, [professional?.id])

  useEffect(() => {
    const threadId = searchParams.get('threadId')
    const section = searchParams.get('section')
    if (threadId) setActiveSection('messages')
    else if (section && ['overview', 'schedule', 'patients', 'messages', 'prescriptions', 'lab-requests', 'analytics', 'finances', 'documents'].includes(section)) {
      setActiveSection(section)
    }
  }, [searchParams])

  // Sync section to URL so refresh preserves the current view
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const current = params.get('section')
    const threadId = params.get('threadId')
    if (threadId) return // Don't overwrite when viewing a thread
    if (activeSection === 'overview' && !current) return
    if (activeSection === current) return
    if (activeSection === 'overview') {
      params.delete('section')
    } else {
      params.set('section', activeSection)
    }
    const q = params.toString()
    const url = '/professional/dashboard' + (q ? '?' + q : '')
    router.replace(url, { scroll: false })
  }, [activeSection, router])

  useEffect(() => {
    if (professional?.is_active !== undefined) setAcceptingPatients(!!professional.is_active)
  }, [professional?.is_active])

  const handleAcceptingPatientsChange = useCallback(async (checked: boolean) => {
    setAcceptingPatients(checked)
    if (!professional?.id) return
    const supabase = createBrowserClient()
    const { error } = await supabase.from('professionals').update({ is_active: checked }).eq('id', professional.id)
    if (error) {
      setAcceptingPatients(!checked)
      toast({ title: 'Error', description: 'Could not update availability.', variant: 'destructive' })
    } else {
      toast({ title: checked ? 'Accepting patients' : 'Not accepting new patients' })
    }
  }, [professional?.id, toast])

  const handleExportRevenue = useCallback(() => {
    const headers = ['Month', 'Revenue (DZD)', 'Patients', 'Consultations']
    const rows = revenueChartData.length ? revenueChartData : [{ month: '–', revenue: 0, patients: 0, consultations: 0 }]
    const csv = [headers.join(','), ...rows.map(r => [r.month, r.revenue, r.patients, r.consultations].join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-overview-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Export', description: 'Revenue data downloaded.' })
  }, [revenueChartData, toast])

  const loadDashboardData = async () => {
    if (!professional?.id) {
      setIsDashboardLoading(false)
      return
    }
    setIsDashboardLoading(true)
    try {
    const supabase = createBrowserClient()

    // SINGLE SOURCE OF TRUTH: Use professionals.id only (no legacy doctors table fallback)
    const providerId = professional.id
    const doctorIds = [providerId]

    const today = new Date().toISOString().split('T')[0]
    const todayObj = new Date()
    const yesterday = new Date(todayObj)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const weekStart = new Date(todayObj)
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const yearStart = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(todayObj.getFullYear(), todayObj.getMonth(), 0).toISOString().split('T')[0]

    const { data: allAppts } = await supabase
      .from('appointments')
      .select('id, patient_id, appointment_date, appointment_time, status, visit_type, payment_amount, consultation_fee')
      .in('doctor_id', doctorIds)
      .gte('appointment_date', new Date(todayObj.getFullYear(), todayObj.getMonth() - 5, 1).toISOString().split('T')[0])
      .order('appointment_date', { ascending: false })
      .limit(500)

    const appts = allAppts || []

    const todayList = appts.filter((a: any) => a.appointment_date === today)
    const yesterdayList = appts.filter((a: any) => a.appointment_date === yesterdayStr)
    const weekList = appts.filter((a: any) => a.appointment_date >= weekStartStr)
    const completed = appts.filter((a: any) => a.status === 'completed')
    const totalForCompletion = appts.filter((a: any) => ['completed', 'no-show', 'confirmed', 'pending'].includes(a.status))
    const completionRate = totalForCompletion.length ? Math.round((completed.length / totalForCompletion.length) * 100) : 0

    const patientIds = new Set<string>()
    appts.forEach((a: any) => { if (a.patient_id) patientIds.add(a.patient_id) })
    const firstApptByPatient = new Map<string, string>()
    appts.forEach((a: any) => {
      if (!a.patient_id) return
      if (!firstApptByPatient.has(a.patient_id)) firstApptByPatient.set(a.patient_id, a.appointment_date)
    })
    const newThisWeek = [...firstApptByPatient.entries()].filter(([, d]) => d >= weekStartStr).length

    let monthlyRevenue = 0
    let lastMonthRevenue = 0
    appts.forEach((a: any) => {
      const amt = Number(a.payment_amount ?? a.consultation_fee ?? 0)
      if (a.status === 'completed' || a.status === 'confirmed' || a.status === 'pending') {
        if (a.appointment_date >= yearStart && a.appointment_date <= today) monthlyRevenue += amt
        if (a.appointment_date >= lastMonthStart && a.appointment_date <= lastMonthEnd) lastMonthRevenue += amt
      }
    })
    const revGrowth = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
      : null

    const byMonth: Record<string, { revenue: number; patients: Set<string>; consultations: number }> = {}
    const monthKeys: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayObj.getFullYear(), todayObj.getMonth() - i, 1)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthKeys.push(k)
      byMonth[k] = { revenue: 0, patients: new Set(), consultations: 0 }
    }
    appts.forEach((a: any) => {
      const k = a.appointment_date?.slice(0, 7)
      if (!k || !byMonth[k]) return
      const amt = Number(a.payment_amount ?? a.consultation_fee ?? 0)
      if (a.status === 'completed' || a.status === 'confirmed' || a.status === 'pending') {
        byMonth[k].revenue += amt
        byMonth[k].consultations += 1
        if (a.patient_id) byMonth[k].patients.add(a.patient_id)
      }
    })
    setRevenueChartData(monthKeys.map(k => {
      const d = new Date(k + '-01')
      return { month: MONTHS[d.getMonth()], revenue: byMonth[k]?.revenue ?? 0, patients: byMonth[k]?.patients?.size ?? 0, consultations: byMonth[k]?.consultations ?? 0 }
    }))

    const typeCount: Record<string, number> = { 'in-person': 0, 'e-visit': 0, 'video': 0, 'home-visit': 0, phone: 0 }
    appts.forEach((a: any) => {
      const v = (a.visit_type || 'in-person').toLowerCase().replace(/\s/g, '-')
      typeCount[v] = (typeCount[v] ?? 0) + 1
    })
    const totalTyped = Object.values(typeCount).reduce((s, n) => s + n, 0)
    const typeChart: { name: string; value: number; color: string }[] = []
    if (totalTyped > 0) {
      if (typeCount['in-person']) typeChart.push({ name: 'In-Person', value: Math.round((typeCount['in-person'] / totalTyped) * 100), color: CHART_COLORS.inPerson })
      if (typeCount['e-visit'] || typeCount['video']) typeChart.push({ name: 'Video Call', value: Math.round(((typeCount['e-visit'] || 0) + (typeCount['video'] || 0)) / totalTyped * 100), color: CHART_COLORS.video })
      if (typeCount['home-visit']) typeChart.push({ name: 'Home Visit', value: Math.round((typeCount['home-visit'] / totalTyped) * 100), color: CHART_COLORS.homeVisit })
      if (typeCount['phone']) typeChart.push({ name: 'Phone', value: Math.round((typeCount['phone'] / totalTyped) * 100), color: CHART_COLORS.phone })
    }
    if (typeChart.length === 0) typeChart.push({ name: 'No data', value: 100, color: '#94a3b8' })
    setAppointmentTypeChart(typeChart)

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekly: { day: string; appointments: number; completed: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayObj)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dayList = appts.filter((a: any) => a.appointment_date === ds)
      weekly.push({ day: dayNames[d.getDay()], appointments: dayList.length, completed: dayList.filter((a: any) => a.status === 'completed').length })
    }
    setWeeklyChartData(weekly)

    const rating = Number(professional?.rating) || 0
    const reviewCount = Number(professional?.review_count) || 0

    const apptsWithPatientQ = supabase
      .from('appointments')
      .select('*, patient:profiles!appointments_patient_id_fkey(full_name, phone, email)')
      .gte('appointment_date', today)
      .order('appointment_date')
      .order('appointment_time')
      .limit(50)
    const { data: apptsWithPatient } = await apptsWithPatientQ.eq('doctor_id', providerId)
    const upcomingList = apptsWithPatient || []
    setAppointments(upcomingList)
    setTodayAppointments(upcomingList.filter((a: any) => a.appointment_date === today))

    const prescRes = await fetch('/api/prescriptions?role=doctor', { credentials: 'include' })
    const prescJson = await prescRes.json()
    const prescList = prescRes.ok && prescJson?.prescriptions ? prescJson.prescriptions : []
    setPrescriptions(prescList)

    const labRes = await fetch('/api/lab-requests?role=doctor', { credentials: 'include' })
    const labJson = await labRes.json()
    const labList = labRes.ok && labJson?.labRequests ? labJson.labRequests : []
    setLabRequests(labList)

    const { data: patientsList, error: patientsError } = await supabase
      .from('professional_patients')
      .select('*')
      .eq('professional_id', providerId)
      .order('last_visit_date', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(200)
    if (patientsError) {
      console.error('Error loading professional_patients:', patientsError)
      if (patientsError.code === '42P01') {
        console.error('Table professional_patients does not exist. Please run migration: scripts/048-professional-patients-and-trigger.sql')
      }
    } else {
      console.log(`Loaded ${patientsList?.length || 0} patients from professional_patients`)
    }
    setProfessionalPatients(patientsList || [])

    const awaitingLabResults = labList.filter((l: any) =>
      !['fulfilled', 'completed', 'denied'].includes(l.status || '')
    ).length
    setStats({
      todayAppointments: todayList.length,
      upcomingAppointments: upcomingList.length,
      todayVsYesterday: yesterdayList.length > 0 || todayList.length > 0 ? todayList.length - yesterdayList.length : null,
      todayCompleted: todayList.filter((a: any) => a.status === 'completed').length,
      weekAppointments: weekList.length,
      totalPatients: patientIds.size,
      newPatientsWeek: newThisWeek,
      monthlyRevenue,
      revenueGrowth: revGrowth,
      rating,
      reviewCount,
      completionRate,
      avgWaitTime: 0,
      pendingPrescriptions: prescList.length,
      pendingLabRequests: awaitingLabResults,
    })
    } finally {
      setIsDashboardLoading(false)
    }
  }

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      onProfessionalUpdate?.()
      await loadDashboardData()
    } finally {
      setIsRefreshing(false)
    }
  }, [professional?.id, onProfessionalUpdate])

  const dashPerms = employeePermissions?.dashboard
  const allSidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'schedule', label: 'Schedule', icon: Calendar, badge: null },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, badge: stats.upcomingAppointments },
    { id: 'patients', label: 'Patients', icon: Users, badge: null },
    { id: 'messages', label: 'Messages', icon: Inbox, badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'pos', label: 'Point of Sale', icon: Receipt, badge: null },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill, badge: stats.pendingPrescriptions },
    { id: 'lab-requests', label: 'Lab Requests', icon: FlaskConical, badge: stats.pendingLabRequests },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'documents', label: 'Documents', icon: FileText, badge: null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]
  const sidebarItems = dashPerms
    ? allSidebarItems.filter(item => canAccessDoctorSection(dashPerms, item.id))
    : allSidebarItems

  // When employee permissions apply, redirect to first allowed section if current is not allowed
  const allowedDoctorSectionIds = useMemo(() => {
    if (!dashPerms) return null
    return DOCTOR_SECTION_IDS.filter(id => canAccessDoctorSection(dashPerms, id))
  }, [dashPerms])
  useEffect(() => {
    if (!allowedDoctorSectionIds || allowedDoctorSectionIds.length === 0) return
    if (!allowedDoctorSectionIds.includes(activeSection)) {
      setActiveSection(allowedDoctorSectionIds[0])
    }
  }, [allowedDoctorSectionIds, activeSection])

  const quickActions = [
    { label: 'New Prescription', icon: Pill, color: 'bg-cyan-500', action: () => setActiveSection('prescriptions') },
    { label: 'Lab Request', icon: FlaskConical, color: 'bg-violet-500', action: () => setActiveSection('lab-requests') },
    { label: 'Video Call', icon: Video, color: 'bg-emerald-500', action: () => { router.push('/professional/dashboard/appointments'); toast({ title: 'Appointments', description: 'Schedule a video call from Appointments.' }) } },
    { label: 'Send Message', icon: Send, color: 'bg-amber-500', action: () => setActiveSection('messages') },
  ]

  const filteredTodayAppointments = useMemo(() => {
    if (!searchQuery.trim()) return todayAppointments
    const q = searchQuery.toLowerCase()
    return todayAppointments.filter((apt: any) =>
      (apt.patient?.full_name || apt.guest_name || apt.patient_name || '').toLowerCase().includes(q)
    )
  }, [todayAppointments, searchQuery])

  const filteredAppointmentsTable = useMemo(() => {
    let list = appointments
    if (appointmentsSearch.trim()) {
      const q = appointmentsSearch.toLowerCase()
      list = list.filter((apt: any) =>
        (apt.patient?.full_name || apt.guest_name || apt.patient_name || '').toLowerCase().includes(q) ||
        (apt.patient?.phone || apt.guest_phone || apt.patient_phone || '').includes(appointmentsSearch)
      )
    }
    if (appointmentsStatusFilter !== 'all') {
      list = list.filter((apt: any) => apt.status === appointmentsStatusFilter)
    }
    return list
  }, [appointments, appointmentsSearch, appointmentsStatusFilter])

  const loadPatientVisits = useCallback(async (p: any) => {
    if (!professional?.id) return
    setLoadingPatientVisits(true)
    const supabase = createBrowserClient()
    let q = supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, visit_type, status, notes')
      .eq('doctor_id', professional.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
    if (p.patient_id) {
      q = q.eq('patient_id', p.patient_id)
    } else {
      q = q.is('patient_id', null).eq('guest_name', p.full_name || '')
    }
    const { data } = await q
    setPatientVisits(data || [])
    setLoadingPatientVisits(false)
  }, [professional?.id])

  const handlePatientRowClick = useCallback((p: any) => {
    if (expandedPatientId === p.id) {
      setExpandedPatientId(null)
      setPatientVisits([])
    } else {
      setExpandedPatientId(p.id)
      loadPatientVisits(p)
    }
  }, [expandedPatientId, loadPatientVisits])

  // Messages section - render directly like patient page (no extra wrappers)
  if (activeSection === 'messages' && authUserId) {
    return (
      <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
        <EmbeddedChat
          userId={authUserId}
          userName={professional?.business_name || profile?.full_name || 'User'}
          userAvatar={avatarUrl || undefined}
          userType={professional?.type || 'doctor'}
        />
      </div>
    )
  }

  // POS section - full Point of Sale (cash primary, cards optional)
  if (activeSection === 'pos') {
    // Check if an appointment ID is passed to pre-fill POS
    const appointmentIdFromUrl = searchParams.get('appointment')
    return (
      <div className="w-full min-w-0 py-4 sm:py-6 px-0">
        <ProfessionalPOSUnified
          professionalName={professional?.business_name}
          employeeUsername={employeeUsername}
          appointmentId={appointmentIdFromUrl}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950">
      {/* Main Content - sidebar is provided by layout (ProDashboardSidebar) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients, appointments..."
                className="pl-10 w-72 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Time Range */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] sm:w-[180px] min-h-10 bg-slate-50 dark:bg-slate-800 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={handleRefresh} className="bg-transparent" disabled={isRefreshing} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-auto flex flex-col py-4 sm:py-6 px-0 bg-white dark:bg-slate-900">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {quickActions.map((action, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    size="sm"
                    className="flex-shrink-0 gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow text-xs sm:text-sm"
                    onClick={action.action}
                  >
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", action.color)}>
                      <action.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Appointments */}
                <Card className={cn(getStatCardClasses(0))} onClick={() => router.push('/professional/dashboard/appointments')}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={cn(getStatCardTextLight(0), 'text-sm font-medium')}>Today's Appointments</p>
                        <p className="text-4xl font-bold mt-2">{stats.todayAppointments}</p>
                        {stats.todayVsYesterday != null && (
                          <div className={cn('flex items-center gap-1 mt-2 text-sm', getStatCardTextLight(0))}>
                            {stats.todayVsYesterday >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            <span>{stats.todayVsYesterday >= 0 ? stats.todayVsYesterday : -stats.todayVsYesterday} {stats.todayVsYesterday >= 0 ? 'more' : 'fewer'} than yesterday</span>
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Calendar className="h-6 w-6" />
                      </div>
                    </div>
                    {stats.todayAppointments > 0 && (
                      <div className="mt-4">
                        <div className={cn('flex justify-between text-xs mb-1', getStatCardTextLight(0))}>
                          <span>Completion</span>
                          <span>{Math.round((stats.todayCompleted / stats.todayAppointments) * 100)}%</span>
                        </div>
                        <Progress value={(stats.todayCompleted / stats.todayAppointments) * 100} className="h-1.5 bg-white/20" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Total Patients */}
                <Card className={cn(getStatCardClasses(1))} onClick={() => setActiveSection('patients')}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={cn(getStatCardTextLight(1), 'text-sm font-medium')}>Total Patients</p>
                        <p className="text-4xl font-bold mt-2">{stats.totalPatients}</p>
                        {stats.newPatientsWeek > 0 && (
                          <div className={cn('flex items-center gap-1 mt-2 text-sm', getStatCardTextLight(1))}>
                            <ArrowUpRight className="h-4 w-4" />
                            <span>+{stats.newPatientsWeek} new this week</span>
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Revenue */}
                <Card className={cn(getStatCardClasses(2))} onClick={() => setActiveSection('finances')}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={cn(getStatCardTextLight(2), 'text-sm font-medium')}>Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">{stats.monthlyRevenue >= 1000 ? `${(stats.monthlyRevenue / 1000).toFixed(0)}K` : stats.monthlyRevenue}</p>
                        {stats.revenueGrowth != null && (
                          <div className={cn('flex items-center gap-1 mt-2 text-sm', getStatCardTextLight(2))}>
                            {stats.revenueGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            <span>{stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}% vs last month</span>
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rating */}
                <Card className={cn(getStatCardClasses(3))} onClick={() => setActiveSection('analytics')}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={cn(getStatCardTextLight(3), 'text-sm font-medium')}>Patient Rating</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <p className="text-4xl font-bold">{stats.rating || '–'}</p>
                          <span className={getStatCardTextLight(3)}>/5</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("h-4 w-4", stats.rating > 0 && i <= Math.round(stats.rating) ? "fill-white" : "fill-white/30")} />
                          ))}
                        </div>
                        {stats.reviewCount > 0 && <p className={cn(getStatCardTextLight(3), 'opacity-80 text-xs mt-1')}>{stats.reviewCount} reviews</p>}
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Star className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's Schedule Row (top) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Today's Schedule</CardTitle>
                      <CardDescription>{stats.todayAppointments} appointments scheduled</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700" asChild>
                      <Link href="/professional/dashboard/appointments">View All <ChevronRight className="h-4 w-4 ml-1" /></Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 list-stripe">
                      {filteredTodayAppointments.length > 0 ? filteredTodayAppointments.slice(0, 5).map((apt, i) => (
                        <div
                          key={apt.id || i}
                          role="button"
                          tabIndex={0}
                          className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          onClick={() => router.push(`/professional/dashboard/appointments/${apt.id}`)}
                          onKeyDown={(e) => e.key === 'Enter' && router.push(`/professional/dashboard/appointments/${apt.id}`)}
                        >
                          <div className="w-14 text-center">
                            <p className="text-sm font-bold text-cyan-600">{apt.appointment_time?.slice(0, 5) || '09:00'}</p>
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-cyan-100 text-cyan-700 font-medium">
                              {(apt.patient?.full_name || apt.guest_name || apt.patient_name || 'P').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {apt.patient?.full_name || apt.guest_name || apt.patient_name || 'Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">{apt.visit_type || 'Consultation'}</p>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            apt.status === 'confirmed' && 'bg-green-100 text-green-700 hover:bg-green-100',
                            apt.status === 'pending' && 'bg-amber-100 text-amber-700 hover:bg-amber-100',
                            apt.status === 'completed' && 'bg-slate-100 text-slate-700 hover:bg-slate-100',
                          )}>
                            {apt.status || 'pending'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/professional/dashboard/appointments/${apt.id}`); }}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No appointments scheduled for today</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats & Actions */}
                <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Revenue Overview</CardTitle>
                      <CardDescription>Monthly revenue and patient trends</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="bg-transparent" onClick={handleExportRevenue}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueChartData.length ? revenueChartData : [{ month: '–', revenue: 0, patients: 0, consultations: 0 }]}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            formatter={(value: number) => [`${value.toLocaleString()} DZD`, 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Appointment Types */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Appointment Types</CardTitle>
                    <CardDescription>Distribution by consultation type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={appointmentTypeChart}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {appointmentTypeChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-2">
                      {appointmentTypeChart.map((type) => (
                        <div key={type.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                            <span className="text-sm font-medium">{type.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{type.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

                  {/* Performance Metrics */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Completion Rate</span>
                          <span className="font-semibold">{stats.completionRate}%</span>
                        </div>
                        <Progress value={stats.completionRate} className="h-2" />
                      </div>
                      {stats.reviewCount > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Rating</span>
                            <span className="font-semibold">{stats.rating}/5 ({stats.reviewCount} reviews)</span>
                          </div>
                          <Progress value={stats.rating ? (stats.rating / 5) * 100 : 0} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pending Tasks */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Pending Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Pill className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Prescriptions</p>
                            <p className="text-xs text-muted-foreground">Awaiting review</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500 text-white">{stats.pendingPrescriptions}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <FlaskConical className="h-4 w-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Lab Results</p>
                            <p className="text-xs text-muted-foreground">Awaiting results</p>
                          </div>
                        </div>
                        <Badge className="bg-violet-500 text-white">{stats.pendingLabRequests}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Activity */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Weekly Activity</CardTitle>
                    <CardDescription>Appointments completed vs scheduled</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="appointments" name="Scheduled" fill="#0891b2" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Patient Age Groups */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Patient Demographics</CardTitle>
                    <CardDescription>Distribution by age group</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{ age: 'No data', count: 0 }]} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis dataKey="age" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Patients" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Schedule Section - Availability Calendar */}
          {activeSection === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Manage your working hours, time-off, and view your appointment calendar</p>
                <Button variant="outline" onClick={() => router.push('/professional/dashboard/settings?tab=practice')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </div>
              <AvailabilityCalendar 
                professional={professional} 
                onDateSelect={(date) => router.push(`/professional/dashboard/appointments?date=${date}`)}
              />
            </div>
          )}

          {/* Patients: list from completed visits (professional_patients) */}
          {activeSection === 'patients' && (
            <div className="space-y-3 -mx-4 sm:-mx-6">
              <div className="flex items-center justify-between px-4 sm:px-6">
                <p className="text-muted-foreground text-sm">
                  Patients you have seen (from completed visits). Last visit info for quick reference.
                </p>
              </div>
              <Card className="shadow-sm w-full pt-0 overflow-hidden rounded-xl">
                <CardContent className="p-0">
                  {isDashboardLoading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : professionalPatients.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">No patients yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        When you mark an appointment or visit as completed, the patient is added here with their last visit info.
                      </p>
                      <Button className="mt-4" asChild>
                        <Link href="/professional/dashboard/appointments">Go to Appointments</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Patient</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last visit</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Visits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {professionalPatients.map((p: any) => (
                            <Fragment key={p.id}>
                              <tr
                                onClick={() => handlePatientRowClick(p)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handlePatientRowClick(p)}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <p className="font-medium">{p.full_name || 'Patient'}</p>
                                      {p.patient_id ? (
                                        <p className="text-xs text-muted-foreground">Registered</p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Guest</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm">
                                    {p.phone && <p>{p.phone}</p>}
                                    {p.email && <p className="text-muted-foreground truncate max-w-[180px]">{p.email}</p>}
                                    {!p.phone && !p.email && <span className="text-muted-foreground">—</span>}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm">
                                    {p.last_visit_date ? (
                                      <>
                                        <p className="font-medium md:hidden">
                                          {new Date(p.last_visit_date).toLocaleDateString()} {p.last_visit_time && String(p.last_visit_time).slice(0, 5)}
                                        </p>
                                        <div className="hidden md:block">
                                          <p className="font-medium">
                                            {new Date(p.last_visit_date).toLocaleDateString()} {p.last_visit_time && String(p.last_visit_time).slice(0, 5)}
                                          </p>
                                          {p.last_visit_type && <p className="text-muted-foreground capitalize">{p.last_visit_type}</p>}
                                          {p.last_visit_notes && <p className="text-muted-foreground truncate max-w-[200px]" title={p.last_visit_notes}>{p.last_visit_notes}</p>}
                                          {p.last_visit_fee != null && <p className="text-muted-foreground">{p.last_visit_fee} DZD</p>}
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Badge variant="outline">{p.visit_count || 0}</Badge>
                                </td>
                              </tr>
                              {expandedPatientId === p.id && (
                                <tr key={`${p.id}-visits`} className="bg-slate-50/50 dark:bg-slate-800/30">
                                  <td colSpan={4} className="p-4 pl-14">
                                    <div className="text-sm space-y-4">
                                      <div>
                                        <p className="font-medium mb-2">All visits</p>
                                        {loadingPatientVisits ? (
                                          <p className="text-muted-foreground">Loading…</p>
                                        ) : patientVisits.length === 0 ? (
                                          <p className="text-muted-foreground">No visits found.</p>
                                        ) : (
                                          <ul className="space-y-2">
                                            {patientVisits.map((apt: any) => (
                                              <li
                                                key={apt.id}
                                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                              >
                                                <div className="flex items-center gap-4">
                                                  <span className="font-medium">
                                                    {new Date(apt.appointment_date).toLocaleDateString()} {apt.appointment_time && String(apt.appointment_time).slice(0, 5)}
                                                  </span>
                                                  <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                                    {apt.status}
                                                  </Badge>
                                                  {apt.visit_type && (
                                                    <span className="text-muted-foreground capitalize">{apt.visit_type}</span>
                                                  )}
                                                  {apt.notes && (
                                                    <span className="text-muted-foreground truncate max-w-[200px]" title={apt.notes}>{apt.notes}</span>
                                                  )}
                                                </div>
                                                <Button variant="ghost" size="sm" asChild>
                                                  <Link href={`/professional/dashboard/appointments/${apt.id}`} onClick={(e) => e.stopPropagation()}>
                                                    View
                                                  </Link>
                                                </Button>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                      {p.patient_id && (
                                        <PatientDocumentsView patientId={p.patient_id} canAttach />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Prescriptions list */}
          {activeSection === 'prescriptions' && (
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-cyan-600" />
                      Prescriptions
                    </CardTitle>
                    <CardDescription>Your recent prescriptions. Manage in Appointments.</CardDescription>
                  </div>
                  <Button onClick={() => router.push('/professional/dashboard/appointments')} variant="outline" size="sm">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    View in Appointments
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48 flex-1" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pill className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No prescriptions yet</p>
                    <p className="text-sm">Create prescriptions from an appointment.</p>
                    <Button className="mt-4" onClick={() => router.push('/professional/dashboard/appointments')}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Go to Appointments
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prescriptions.map((p: any) => {
                      const apptId = p.appointment_id
                      const href = apptId
                        ? `/professional/dashboard/appointments/${apptId}?prescription=${p.id}`
                        : `/professional/dashboard/appointments?prescription=${p.id}`
                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(href)}
                          onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                          className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {p.prescription_number || `RX-${p.id?.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {p.patient?.full_name || 'Patient'} • {(p.medications || []).length} medication(s)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={p.status === 'ready' || p.status === 'picked_up' ? 'default' : 'secondary'}>
                              {(p.status || 'active').replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">View</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lab requests list */}
          {activeSection === 'lab-requests' && (
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-violet-600" />
                      Lab Requests
                    </CardTitle>
                    <CardDescription>Your recent lab test requests. Manage in Appointments.</CardDescription>
                  </div>
                  <Button onClick={() => router.push('/professional/dashboard/appointments')} variant="outline" size="sm">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    View in Appointments
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48 flex-1" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : labRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No lab requests yet</p>
                    <p className="text-sm">Create lab requests from an appointment.</p>
                    <Button className="mt-4" variant="outline" onClick={() => router.push('/professional/dashboard/appointments')}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Go to Appointments
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {labRequests.map((lr: any) => {
                      const apptId = lr.appointment_id
                      const href = apptId
                        ? `/professional/dashboard/appointments/${apptId}?labRequest=${lr.id}`
                        : `/professional/dashboard/appointments?labRequest=${lr.id}`
                      return (
                        <div
                          key={lr.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(href)}
                          onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                          className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {lr.request_number || `LT-${lr.id?.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {lr.patient?.full_name || 'Patient'} • {(lr.items || []).length} test(s) • {lr.priority || 'normal'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={lr.status === 'completed' || lr.status === 'fulfilled' ? 'default' : 'secondary'}>
                              {lr.status === 'completed' || lr.status === 'fulfilled' ? 'Results Received' : (lr.status || 'pending').replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">View</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documents section - upload and manage documents */}
          {activeSection === 'documents' && (
            <ProDocumentsSection professionalId={professional?.id} />
          )}

          {/* Suppliers section */}
          {activeSection === 'suppliers' && (
            <SuppliersSection
              professionalId={professional?.id}
              professionalType={professional?.type}
            />
          )}

          {/* Placeholder section - finances */}
          {activeSection === 'finances' && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  <Banknote className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {sidebarItems.find(i => i.id === activeSection)?.label}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  This section is coming soon. You'll be able to manage all your finances here.
                </p>
                <Button
                  className="mt-4 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600"
                  onClick={() => toast({ title: 'Coming soon', description: 'Full finances management will be available here.' })}
                >
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

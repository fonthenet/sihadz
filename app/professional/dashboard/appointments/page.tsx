'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { usePreservedListState } from '@/hooks/use-preserved-list-state'
import { Calendar, Clock, Search, Video, MapPin, User, Phone, ChevronDown, ChevronRight, LayoutList, Users, Banknote, Filter, SlidersHorizontal, List, Activity } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseDateOnlyAsLocal } from '@/lib/date-algeria'
import Loading from './loading'
import { cn } from '@/lib/utils'

function AppointmentRow({ appt, router, stripe, compact }: { appt: any; router: ReturnType<typeof useRouter>; stripe?: boolean; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-muted cursor-pointer transition-colors",
        compact ? "border-0 rounded-none border-b border-border last:border-b-0" : "border rounded-lg",
        stripe && "bg-slate-50/90 dark:bg-slate-800/40"
      )}
      onClick={() => router.push(`/professional/dashboard/appointments/${appt.id}`)}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`p-2 rounded-full shrink-0 ${
          appt.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30' :
          appt.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30' :
          appt.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30' :
          'bg-yellow-100 dark:bg-yellow-900/30'
        }`}>
          {appt.visit_type === 'video-call' ? (
            <Video className={`h-5 w-5 ${
              appt.status === 'confirmed' ? 'text-green-600' :
              appt.status === 'cancelled' ? 'text-red-600' :
              appt.status === 'completed' ? 'text-blue-600' :
              'text-yellow-600'
            }`} />
          ) : (
            <MapPin className={`h-5 w-5 ${
              appt.status === 'confirmed' ? 'text-green-600' :
              appt.status === 'cancelled' ? 'text-red-600' :
              appt.status === 'completed' ? 'text-blue-600' :
              'text-yellow-600'
            }`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{appt.patient?.full_name || appt.guest_name || appt.patient_name || 'Patient'}</p>
            <Badge variant="outline" className="text-xs shrink-0">
              {appt.visit_type === 'video-call' ? 'Video' : 'In-Person'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {(parseDateOnlyAsLocal(appt.appointment_date) ?? new Date(0)).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {appt.appointment_time}
            </span>
            {(appt.patient?.phone || appt.guest_phone || appt.patient_phone) && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {appt.patient?.phone || appt.guest_phone || appt.patient_phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap" onClick={(e) => e.stopPropagation()}>
        <Badge
          variant="outline"
          className={
            appt.status === 'confirmed'
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400'
              : appt.status === 'cancelled'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400'
              : appt.status === 'completed'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400'
              : ''
          }
        >
          {appt.status}
        </Badge>
        {appt.payment_status !== 'paid' && appt.status !== 'cancelled' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 px-2"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/professional/dashboard?section=pos&appointment=${appt.id}`)
            }}
          >
            <Banknote className="h-3 w-3 me-1" />
            Charge
          </Button>
        )}
        {appt.payment_status === 'paid' && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
            Paid
          </Badge>
        )}
      </div>
    </div>
  )
}

type ViewMode = 'by-date' | 'by-patient' | 'by-status' | 'by-visit-type' | 'list'
type SortBy = 'date-desc' | 'date-asc' | 'patient-name' | 'status'

const LIST_PATH = '/professional/dashboard/appointments'

export default function ProfessionalAppointmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state: urlState, update: updateUrl } = usePreservedListState({
    params: [
      { key: 'date', defaultValue: 'upcoming', validValues: ['all', 'today', 'upcoming', 'past'] },
      { key: 'status', defaultValue: 'all', validValues: ['all', 'pending', 'confirmed', 'completed', 'cancelled'] },
      { key: 'view', defaultValue: 'by-date', validValues: ['by-date', 'by-patient', 'by-status', 'by-visit-type', 'list'] },
      { key: 'sort', defaultValue: 'date-asc', validValues: ['date-desc', 'date-asc', 'patient-name', 'status'] },
      { key: 'q', defaultValue: '' },
    ],
    listPath: LIST_PATH,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState<any[]>([])
  const [professional, setProfessional] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState(urlState.q)
  const [statusFilter, setStatusFilter] = useState(urlState.status)
  const [dateFilter, setDateFilter] = useState(urlState.date)
  const [viewMode, setViewMode] = useState<ViewMode>(urlState.view as ViewMode)
  const [sortBy, setSortBy] = useState<SortBy>(urlState.sort as SortBy)
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set())
  const byPatientInitialized = useRef(false)

  // Sync URL -> state when navigating back (e.g. browser back)
  useEffect(() => {
    setSearchQuery(urlState.q)
    setStatusFilter(urlState.status)
    setDateFilter(urlState.date)
    setViewMode(urlState.view as ViewMode)
    setSortBy(urlState.sort as SortBy)
  }, [urlState.q, urlState.status, urlState.date, urlState.view, urlState.sort])

  const loadAppointments = async () => {
    try {
      const supabase = createBrowserClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/professional/auth/login')
        return
      }

      // Load professional data
      const { data: profData } = await supabase
        .from('professionals')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!profData) {
        router.push('/professional/auth/signup')
        return
      }

      setProfessional(profData)

      // For doctors: load by doctor_id. For clinics: load by all doctors in the clinic.
      let doctorIds: string[] = []
      if (profData.type === 'clinic') {
        const { data: team } = await supabase
          .from('professional_team')
          .select('doctor_id')
          .eq('clinic_id', profData.id)
        doctorIds = (team || []).map((r: { doctor_id: string }) => r.doctor_id).filter(Boolean)
        if (doctorIds.length === 0) {
          setAppointments([])
          return
        }
      } else {
        doctorIds = [profData.id]
      }

      // Load all appointments (without FK join to avoid RLS issues)
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('*')
        .in('doctor_id', doctorIds)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      if (!appts || appts.length === 0) {
        setAppointments([])
        return
      }

      // Get unique patient IDs and fetch their profiles separately
      const patientIds = [...new Set(appts.map(a => a.patient_id).filter(Boolean))]
      let patientsMap = new Map()
      
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email, gender')
          .in('id', patientIds)
        
        if (patients) {
          patientsMap = new Map(patients.map(p => [p.id, p]))
        }
      }

      // Combine appointments with patient data
      const enrichedAppts = appts.map(appt => ({
        ...appt,
        patient: patientsMap.get(appt.patient_id) || null,
        // Fallback display fields
        patient_display_name: patientsMap.get(appt.patient_id)?.full_name || appt.guest_name || appt.patient_name || 'Patient',
        patient_display_email: patientsMap.get(appt.patient_id)?.email || appt.guest_email || appt.patient_email,
        patient_display_phone: patientsMap.get(appt.patient_id)?.phone || appt.guest_phone || appt.patient_phone
      }))

      setAppointments(enrichedAppts)
    } catch (err) {
      console.error('Appointments load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  useAutoRefresh(loadAppointments, 60_000, { enabled: !!professional })

  const filteredAppointments = appointments.filter(appt => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' || 
      (appt.patient?.full_name || appt.guest_name || appt.patient_name || '').toLowerCase().includes(searchLower) ||
      (appt.patient?.phone || appt.guest_phone || appt.patient_phone || '').includes(searchQuery)

    // Status filter
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter

    // Date filter (parse as local to avoid -1 day in negative-offset timezones)
    const apptDate = parseDateOnlyAsLocal(appt.appointment_date) ?? new Date(0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let matchesDate = true
    if (dateFilter === 'today') {
      matchesDate = apptDate.toDateString() === today.toDateString()
    } else if (dateFilter === 'upcoming') {
      matchesDate = apptDate >= today
    } else if (dateFilter === 'past') {
      matchesDate = apptDate < today
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  // Sort filtered appointments
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortBy === 'date-desc') {
      const dA = (a.appointment_date || '') + (a.appointment_time || '')
      const dB = (b.appointment_date || '') + (b.appointment_time || '')
      return dB.localeCompare(dA)
    }
    if (sortBy === 'date-asc') {
      const dA = (a.appointment_date || '') + (a.appointment_time || '')
      const dB = (b.appointment_date || '') + (b.appointment_time || '')
      return dA.localeCompare(dB)
    }
    if (sortBy === 'patient-name') {
      const nameA = (a.patient?.full_name || a.guest_name || a.patient_name || '').toLowerCase()
      const nameB = (b.patient?.full_name || b.guest_name || b.patient_name || '').toLowerCase()
      return nameA.localeCompare(nameB) || ((a.appointment_date || '') + (a.appointment_time || '')).localeCompare((b.appointment_date || '') + (b.appointment_time || ''))
    }
    if (sortBy === 'status') {
      const order = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 }
      return (order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4)
    }
    return 0
  })

  // Group by date (for by-date view)
  const groupedByDate = sortedAppointments.reduce((acc, appt) => {
    const date = appt.appointment_date
    if (!acc[date]) acc[date] = []
    acc[date].push(appt)
    return acc
  }, {} as Record<string, any[]>)

  // Group by patient (for by-patient view)
  const todayMs = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })()
  const groupedByPatient = sortedAppointments.reduce((acc, appt) => {
    const key = appt.patient_id || `guest-${(appt.guest_email || appt.guest_phone || appt.guest_name || appt.patient_name || 'unknown').toString().trim()}`
    const name = appt.patient?.full_name || appt.guest_name || appt.patient_name || 'Patient'
    if (!acc[key]) acc[key] = { key, name, appointments: [] }
    acc[key].appointments.push(appt)
    return acc
  }, {} as Record<string, { key: string; name: string; appointments: any[] }>)

  // Within each patient group, sort visits by nearest date (closest to today first)
  for (const group of Object.values(groupedByPatient)) {
    group.appointments.sort((a, b) => {
      const dateA = parseDateOnlyAsLocal(a.appointment_date) ?? new Date(0)
      const dateB = parseDateOnlyAsLocal(b.appointment_date) ?? new Date(0)
      const msA = dateA.getTime()
      const msB = dateB.getTime()
      const distA = Math.abs(msA - todayMs)
      const distB = Math.abs(msB - todayMs)
      if (distA !== distB) return distA - distB
      return (a.appointment_time || '').localeCompare(b.appointment_time || '')
    })
  }

  const patientGroups = Object.values(groupedByPatient).sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  )

  // Group by status (for by-status view)
  const statusOrder = ['pending', 'confirmed', 'completed', 'cancelled'] as const
  const statusLabels: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }
  const groupedByStatus = statusOrder.reduce((acc, status) => {
    const appts = sortedAppointments.filter(a => a.status === status)
    if (appts.length > 0) acc[status] = appts
    return acc
  }, {} as Record<string, any[]>)

  // Group by visit type (for by-visit-type view)
  const groupedByVisitType = sortedAppointments.reduce((acc, appt) => {
    const type = appt.visit_type === 'video-call' ? 'video' : 'in-person'
    if (!acc[type]) acc[type] = []
    acc[type].push(appt)
    return acc
  }, {} as Record<string, any[]>)
  const visitTypeLabels: Record<string, string> = { 'in-person': 'In-Person', 'video': 'Video' }

  // Expand all patient groups when first switching to by-patient view
  useEffect(() => {
    if (viewMode === 'by-patient') {
      if (!byPatientInitialized.current && patientGroups.length > 0) {
        const keys = patientGroups.filter(g => g.appointments.length > 1).map(g => g.key)
        setExpandedPatients(prev => (prev.size === 0 && keys.length > 0 ? new Set(keys) : prev))
        byPatientInitialized.current = true
      }
    } else {
      byPatientInitialized.current = false
    }
  }, [viewMode, patientGroups])

  const togglePatientExpanded = (key: string) => {
    setExpandedPatients(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="w-full min-h-full py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Appointments</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            {filteredAppointments.length === 0
              ? 'Manage and view all your appointments'
              : `${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 w-fit h-8 text-sm" onClick={() => router.push('/professional/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Filters & Organization */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  const v = e.target.value
                  setSearchQuery(v)
                  updateUrl('q', v)
                }}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date</label>
                      <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); updateUrl('date', v) }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="past">Past</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); updateUrl('status', v) }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                    <LayoutList className="h-3.5 w-3.5" />
                    View
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">View by</label>
                    <Select value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); updateUrl('view', v) }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="by-date">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            By date
                          </span>
                        </SelectItem>
                        <SelectItem value="by-patient">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            By patient
                          </span>
                        </SelectItem>
                        <SelectItem value="by-status">
                          <span className="flex items-center gap-1.5">
                            <Activity className="h-3 w-3" />
                            By status
                          </span>
                        </SelectItem>
                        <SelectItem value="by-visit-type">
                          <span className="flex items-center gap-1.5">
                            <Video className="h-3 w-3" />
                            By visit type
                          </span>
                        </SelectItem>
                        <SelectItem value="list">
                          <span className="flex items-center gap-1.5">
                            <List className="h-3 w-3" />
                            List
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Sort
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sort by</label>
                    <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortBy); updateUrl('sort', v) }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">Most recent first</SelectItem>
                        <SelectItem value="date-asc">Earliest first</SelectItem>
                        <SelectItem value="patient-name">Patient name A–Z</SelectItem>
                        <SelectItem value="status">By status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      {sortedAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </CardContent>
          </Card>
        ) : viewMode === 'by-date' ? (
          (() => {
            let globalIndex = 0
            return (
              <div className="space-y-6">
                {Object.entries(groupedByDate).map(([date, dayAppts]) => (
                  <Card key={date}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {(parseDateOnlyAsLocal(date) ?? new Date(0)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </CardTitle>
                      <CardDescription>{dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dayAppts.map((appt) => {
                          const index = globalIndex++
                          return (
                            <AppointmentRow
                              key={appt.id}
                              appt={appt}
                              router={router}
                              stripe={index % 2 === 1}
                            />
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()
        ) : viewMode === 'by-status' ? (
          (() => {
            let globalIndex = 0
            return (
              <div className="space-y-6">
                {Object.entries(groupedByStatus).map(([status, appts]) => (
                  <Card key={status}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        {statusLabels[status] || status}
                      </CardTitle>
                      <CardDescription>{appts.length} appointment{appts.length !== 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {appts.map((appt) => {
                          const index = globalIndex++
                          return (
                            <AppointmentRow
                              key={appt.id}
                              appt={appt}
                              router={router}
                              stripe={index % 2 === 1}
                            />
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()
        ) : viewMode === 'by-visit-type' ? (
          (() => {
            let globalIndex = 0
            return (
              <div className="space-y-6">
                {Object.entries(groupedByVisitType).map(([type, appts]) => (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {type === 'video' ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                        {visitTypeLabels[type] || type}
                      </CardTitle>
                      <CardDescription>{appts.length} appointment{appts.length !== 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {appts.map((appt) => {
                          const index = globalIndex++
                          return (
                            <AppointmentRow
                              key={appt.id}
                              appt={appt}
                              router={router}
                              stripe={index % 2 === 1}
                            />
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()
        ) : viewMode === 'list' ? (
          (() => {
            return (
              <Card>
                <CardContent className="p-0">
                  <div>
                    {sortedAppointments.map((appt, index) => (
                      <AppointmentRow
                        key={appt.id}
                        appt={appt}
                        router={router}
                        stripe={index % 2 === 1}
                        compact
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()
        ) : (
          (() => {
            let globalIndex = 0
            return (
              <div className="space-y-3">
                {patientGroups.map((group) => {
                  const isExpanded = expandedPatients.has(group.key) || group.appointments.length === 1
                  const hasMultiple = group.appointments.length > 1
                  return (
                    <Card key={group.key}>
                      {hasMultiple ? (
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={() => togglePatientExpanded(group.key)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="text-start">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      {group.name}
                                      <Badge variant="secondary" className="text-xs font-normal">
                                        {group.appointments.length} visits
                                      </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                      {(group.appointments[0]?.patient?.phone || group.appointments[0]?.guest_phone) && (
                                        <span className="flex items-center gap-1 mt-0.5">
                                          <Phone className="h-3 w-3" />
                                          {group.appointments[0]?.patient?.phone || group.appointments[0]?.guest_phone}
                                        </span>
                                      )}
                                    </CardDescription>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 space-y-2">
                              {group.appointments.map((appt) => {
                                const index = globalIndex++
                                return (
                                  <AppointmentRow
                                    key={appt.id}
                                    appt={appt}
                                    router={router}
                                    stripe={index % 2 === 1}
                                  />
                                )
                              })}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <CardContent className="p-0">
                          <AppointmentRow
                            appt={group.appointments[0]}
                            router={router}
                            stripe={globalIndex++ % 2 === 1}
                          />
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )
          })()
        )}
    </div>
  )
}

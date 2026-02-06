'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Calendar, Users, Inbox, CalendarDays, Clock, RefreshCw } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getStatCardClasses, getStatCardTextLight } from '@/lib/dashboard-stat-colors'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { AvailabilityCalendar } from './availability-calendar'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'
import { ProDocumentsSection } from './pro-documents-section'
import ProfessionalPOSUnified from './pos/professional-pos-unified'

interface NurseProDashboardProps {
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

const NURSE_SECTIONS = ['overview', 'schedule', 'appointments', 'patients', 'messages', 'pos', 'documents', 'settings'] as const

export default function NurseProDashboard({
  professional,
  profile,
  authUserId,
  avatarUrl,
  onSignOut,
  initialSection = 'overview',
  employeeUsername,
}: NurseProDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    todayVisits: 0,
    totalPatients: 0,
    weekVisits: 0,
  })
  const [appointments, setAppointments] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])

  useEffect(() => {
    const section = searchParams.get('section')
    const threadId = searchParams.get('threadId')
    if (threadId) setActiveSection('messages')
    else if (section && NURSE_SECTIONS.includes(section as any)) setActiveSection(section as typeof NURSE_SECTIONS[number])
  }, [searchParams])

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection)
  }, [initialSection])

  // Sync section to URL so refresh preserves the current view
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const current = params.get('section')
    const threadId = params.get('threadId')
    if (threadId) return
    if (activeSection === 'overview' && !current) return
    if (activeSection === current) return
    if (activeSection === 'overview') {
      params.delete('section')
    } else {
      params.set('section', activeSection)
    }
    const q = params.toString()
    router.replace('/professional/dashboard' + (q ? '?' + q : ''), { scroll: false })
  }, [activeSection, router])

  useEffect(() => {
    loadDashboardData()
  }, [professional?.id])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    const providerId = professional.id
    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: appts } = await supabase
      .from('appointments')
      .select('id, patient_id, appointment_date, appointment_time, status, visit_type')
      .eq('doctor_id', providerId)
      .gte('appointment_date', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0])
      .order('appointment_date', { ascending: false })
      .limit(200)

    const list = appts || []
    const todayList = list.filter((a: any) => a.appointment_date === today)
    const weekList = list.filter((a: any) => a.appointment_date >= weekStartStr)
    const patientIds = new Set<string>()
    list.forEach((a: any) => { if (a.patient_id) patientIds.add(a.patient_id) })

    setStats({
      todayVisits: todayList.length,
      totalPatients: patientIds.size,
      weekVisits: weekList.length,
    })
    setAppointments(todayList.slice(0, 10))
  }

  useAutoRefresh(loadDashboardData, 60_000, { enabled: !!professional })

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadDashboardData().finally(() => setIsRefreshing(false))
  }

  // Messages section - render directly like patient page (no extra wrappers)
  if (activeSection === 'messages' && authUserId) {
    return (
      <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
        <EmbeddedChat
          userId={authUserId}
          userName={professional?.business_name || 'User'}
          userAvatar={avatarUrl || undefined}
          userType="nurse"
        />
      </div>
    )
  }

  // POS section - full Point of Sale (cash primary, cards optional)
  if (activeSection === 'pos') {
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
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
        <h1 className="text-base sm:text-xl font-bold truncate">
          {activeSection === 'overview' ? 'Nurse Dashboard' :
           activeSection === 'schedule' ? 'Schedule' :
           activeSection === 'appointments' ? 'Appointments' :
           activeSection === 'patients' ? 'Patients' :
           activeSection === 'documents' ? 'Documents' : 'Dashboard'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} className="bg-transparent" disabled={isRefreshing} aria-label="Refresh">
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push('/professional/dashboard/settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-auto flex flex-col py-4 sm:py-6 px-0">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className={cn('rounded-none sm:rounded-xl', getStatCardClasses(0))} onClick={() => setActiveSection('appointments')}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm font-medium', getStatCardTextLight(0))}>Today&apos;s Visits</p>
                      <p className="text-3xl font-bold mt-2">{stats.todayVisits}</p>
                    </div>
                    <Calendar className={cn('h-10 w-10', getStatCardTextLight(0))} />
                  </div>
                </CardContent>
              </Card>
              <Card className={cn('rounded-none sm:rounded-xl', getStatCardClasses(1))} onClick={() => setActiveSection('patients')}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm font-medium', getStatCardTextLight(1))}>Total Patients</p>
                      <p className="text-3xl font-bold mt-2">{stats.totalPatients}</p>
                    </div>
                    <Users className={cn('h-10 w-10', getStatCardTextLight(1))} />
                  </div>
                </CardContent>
              </Card>
              <Card className={cn('rounded-none sm:rounded-xl', getStatCardClasses(2))}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-sm font-medium', getStatCardTextLight(2))}>This Week</p>
                      <p className="text-3xl font-bold mt-2">{stats.weekVisits}</p>
                    </div>
                    <Clock className={cn('h-10 w-10', getStatCardTextLight(2))} />
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-none sm:rounded-xl">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your nursing practice</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => router.push('/professional/dashboard/appointments')}>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  View Appointments
                </Button>
                <Button variant="outline" onClick={() => setActiveSection('schedule')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
                <Button variant="outline" onClick={() => setActiveSection('messages')}>
                  <Inbox className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'schedule' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground text-sm">Manage your working hours</p>
              <Button variant="outline" onClick={() => router.push('/professional/dashboard/settings?tab=practice')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
            <AvailabilityCalendar professional={professional} />
          </div>
        )}

        {activeSection === 'appointments' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => router.push('/professional/dashboard/appointments')}>
                View All
              </Button>
            </div>
            <Card className="rounded-none sm:rounded-xl">
              <CardContent className="p-6">
                {appointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{apt.appointment_time || '—'}</p>
                          <p className="text-sm text-muted-foreground">{apt.visit_type || 'Visit'}</p>
                        </div>
                        <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'}>{apt.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'patients' && (
          <div className="space-y-6">
            <Card className="rounded-none sm:rounded-xl">
              <CardContent className="p-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Patient list from completed visits</p>
                  <Button variant="outline" className="mt-4" onClick={() => router.push('/professional/dashboard/appointments')}>
                    View Appointments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'documents' && (
          <ProDocumentsSection professionalId={professional?.id} />
        )}
      </div>
    </div>
  )
}

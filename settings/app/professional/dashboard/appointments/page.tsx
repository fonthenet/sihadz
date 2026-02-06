'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Calendar, Clock, Plus, Search, Filter, Video, MapPin, Pill, FlaskConical, User, Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Loading from './loading'

export default function ProfessionalAppointmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState<any[]>([])
  const [professional, setProfessional] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('upcoming')

  useEffect(() => {
    loadAppointments()
  }, [])

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

      // Check for linked doctors table entry
      const { data: doctorEntry } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', profData.auth_user_id)
        .single()

      const doctorId = doctorEntry?.id || profData.id

      // Load all appointments (without FK join to avoid RLS issues)
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
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

  const filteredAppointments = appointments.filter(appt => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' || 
      (appt.patient?.full_name || appt.guest_name || appt.patient_name || '').toLowerCase().includes(searchLower) ||
      (appt.patient?.phone || appt.guest_phone || appt.patient_phone || '').includes(searchQuery)

    // Status filter
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter

    // Date filter
    const apptDate = new Date(appt.appointment_date)
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

  const groupedAppointments = filteredAppointments.reduce((acc, appt) => {
    const date = appt.appointment_date
    if (!acc[date]) acc[date] = []
    acc[date].push(appt)
    return acc
  }, {} as Record<string, any[]>)

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">Manage and view all your appointments</p>
          </div>
          <Button onClick={() => router.push('/professional/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Date filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status filter" />
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
          </CardContent>
        </Card>

        {/* Appointments List */}
        {Object.keys(groupedAppointments).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAppointments).map(([date, dayAppts]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardTitle>
                  <CardDescription>{dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => router.push(`/professional/dashboard/appointments/${appt.id}`)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-2 rounded-full ${
                            appt.status === 'confirmed' ? 'bg-green-100' : 
                            appt.status === 'cancelled' ? 'bg-red-100' : 
                            appt.status === 'completed' ? 'bg-blue-100' :
                            'bg-yellow-100'
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{appt.patient?.full_name || appt.guest_name || appt.patient_name || 'Patient'}</p>
                              <Badge variant="outline" className="text-xs">
                                {appt.visit_type === 'video-call' ? 'Video' : 'In-Person'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Badge 
                            variant="outline"
                            className={
                              appt.status === 'confirmed' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : appt.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : appt.status === 'completed'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : ''
                            }
                          >
                            {appt.status}
                          </Badge>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/professional/dashboard/appointments/${appt.id}`)
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

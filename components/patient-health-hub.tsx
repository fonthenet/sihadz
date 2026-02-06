'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar, Pill, FlaskConical, FileText, Heart, Activity,
  Bell, Clock, MapPin, Phone, User, Stethoscope, Building2,
  ChevronRight, Download, Share2, MessageSquare,
  CheckCircle, Plus, Eye, Syringe, AlertTriangle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import PrescriptionWorkflow from './prescription-workflow'
import LabTestWorkflow from './lab-test-workflow'

interface PatientHealthHubProps {
  userId: string
  language?: 'ar' | 'fr' | 'en'
}

export function PatientHealthHub({ userId, language = 'ar' }: PatientHealthHubProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createBrowserClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [vaccinations, setVaccinations] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [selectedLabRequest, setSelectedLabRequest] = useState<any>(null)
  const [showMessaging, setShowMessaging] = useState(false)
  const [initialChatOtherUserId, setInitialChatOtherUserId] = useState<string | null>(null)

  const labels = {
    ar: {
      healthHub: 'مركز صحتي',
      overview: 'نظرة عامة',
      appointments: 'المواعيد',
      prescriptions: 'الوصفات الطبية',
      labResults: 'نتائج التحاليل',
      vaccinations: 'التطعيمات',
      family: 'العائلة',
      messages: 'الرسائل',
      upcoming: 'قادم',
      active: 'نشط',
      completed: 'مكتمل',
      viewAll: 'عرض الكل',
      noAppointments: 'لا توجد مواعيد',
      noPrescriptions: 'لا توجد وصفات',
      noLabResults: 'لا توجد نتائج تحاليل',
      bookAppointment: 'احجز موعد',
      healthScore: 'مؤشر الصحة',
      quickActions: 'إجراءات سريعة',
      shareWith: 'مشاركة مع',
      download: 'تحميل',
      sendMessage: 'إرسال رسالة',
      viewDetails: 'عرض التفاصيل',
      ready: 'جاهز',
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      today: 'اليوم',
      tomorrow: 'غداً',
      healthRecords: 'السجلات الصحية',
      emergencyContacts: 'جهات الطوارئ',
    },
    fr: {
      healthHub: 'Mon Espace Santé',
      overview: 'Aperçu',
      appointments: 'Rendez-vous',
      prescriptions: 'Ordonnances',
      labResults: 'Résultats de laboratoire',
      vaccinations: 'Vaccinations',
      family: 'Famille',
      messages: 'Messages',
      upcoming: 'À venir',
      active: 'Actif',
      completed: 'Terminé',
      viewAll: 'Voir tout',
      noAppointments: 'Aucun rendez-vous',
      noPrescriptions: 'Aucune ordonnance',
      noLabResults: 'Aucun résultat',
      bookAppointment: 'Prendre rendez-vous',
      healthScore: 'Score de santé',
      quickActions: 'Actions rapides',
      shareWith: 'Partager avec',
      download: 'Télécharger',
      sendMessage: 'Envoyer un message',
      viewDetails: 'Voir les détails',
      ready: 'Prêt',
      pending: 'En attente',
      processing: 'En cours',
      today: "Aujourd'hui",
      tomorrow: 'Demain',
      healthRecords: 'Dossiers médicaux',
      emergencyContacts: 'Contacts d\'urgence',
    },
    en: {
      healthHub: 'My Health Hub',
      overview: 'Overview',
      appointments: 'Appointments',
      prescriptions: 'Prescriptions',
      labResults: 'Lab Results',
      vaccinations: 'Vaccinations',
      family: 'Family',
      messages: 'Messages',
      upcoming: 'Upcoming',
      active: 'Active',
      completed: 'Completed',
      viewAll: 'View All',
      noAppointments: 'No appointments',
      noPrescriptions: 'No prescriptions',
      noLabResults: 'No lab results',
      bookAppointment: 'Book Appointment',
      healthScore: 'Health Score',
      quickActions: 'Quick Actions',
      shareWith: 'Share with',
      download: 'Download',
      sendMessage: 'Send Message',
      viewDetails: 'View Details',
      ready: 'Ready',
      pending: 'Pending',
      processing: 'Processing',
      today: 'Today',
      tomorrow: 'Tomorrow',
      healthRecords: 'Health Records',
      emergencyContacts: 'Emergency Contacts',
    },
  }
  
  const l = labels[language]

  const loadPatientData = async () => {
    setIsLoading(true)
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(profileData)

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`*, doctor:doctor_id(id, auth_user_id, business_name, specialty, wilaya, phone)`)
        .eq('patient_id', userId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date')
        .limit(10)
      setAppointments(appointmentsData || [])

      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select(`*, doctor:doctor_id(id, auth_user_id, business_name, specialty), pharmacy:pharmacy_id(id, auth_user_id, business_name, wilaya)`)
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      setPrescriptions(prescriptionsData || [])

      const { data: labData } = await supabase
        .from('lab_test_requests')
        .select(`*, doctor:doctor_id(id, auth_user_id, business_name, specialty), laboratory:laboratory_id(id, auth_user_id, business_name, wilaya)`)
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      setLabRequests(labData || [])

      const { data: vaccinationsData } = await supabase
        .from('vaccination_records')
        .select(`*, vaccine:vaccine_id(id, name, name_ar, disease_prevention)`)
        .eq('patient_id', userId)
        .order('administered_date', { ascending: false })
        .limit(10)
      setVaccinations(vaccinationsData || [])

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .limit(5)
      setNotifications(notificationsData || [])

      const { data: familyData } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
      setFamilyMembers(familyData || [])

    } catch (error) {
      console.error('Error loading patient data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPatientData()
  }, [userId])

  const getStatusBadge = (status: string, type?: 'lab' | 'prescription' | 'appointment') => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: l.pending, className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
      confirmed: { label: 'Confirmed', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
      sent_to_pharmacy: { label: 'At Pharmacy', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
      ready: { label: l.ready, className: 'bg-green-500/10 text-green-600 border-green-500/30' },
      processing: { label: l.processing, className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
      fulfilled: { label: type === 'lab' ? 'Results Received' : l.completed, className: 'bg-green-600 text-white' },
      completed: { label: type === 'lab' ? 'Results Received' : l.completed, className: 'bg-green-600 text-white' },
      collected: { label: l.completed, className: 'bg-green-600 text-white' },
    }
    const config = statusMap[status] || { label: status, className: '' }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const getDateLabel = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return l.today
    if (d.toDateString() === tomorrow.toDateString()) return l.tomorrow
    return d.toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US', { 
      weekday: 'short', month: 'short', day: 'numeric' 
    })
  }

  const calculateHealthScore = () => {
    let score = 70
    if (vaccinations.length > 0) score += 10
    if (appointments.some(a => a.status === 'confirmed')) score += 10
    if (labRequests.some(l => l.status === 'fulfilled')) score += 5
    return Math.min(score, 100)
  }

  const openMessaging = (otherAuthUserId?: string | null) => {
    setInitialChatOtherUserId(otherAuthUserId || null)
    setShowMessaging(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{l.healthHub}</h1>
          <p className="text-muted-foreground">
            {profile?.full_name && `Welcome back, ${profile.full_name}`}
          </p>
        </div>
        
        <div className="relative">
          <Button variant="outline" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">{l.overview}</TabsTrigger>
          <TabsTrigger value="appointments">{l.appointments}</TabsTrigger>
          <TabsTrigger value="prescriptions">{l.prescriptions}</TabsTrigger>
          <TabsTrigger value="labResults">{l.labResults}</TabsTrigger>
          <TabsTrigger value="vaccinations">{l.vaccinations}</TabsTrigger>
          <TabsTrigger value="family">{l.family}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{appointments.filter(a => a.status !== 'cancelled').length}</p>
                    <p className="text-sm text-muted-foreground">{l.appointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary/10 p-2 rounded-lg">
                    <Pill className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{prescriptions.filter(p => p.status !== 'collected').length}</p>
                    <p className="text-sm text-muted-foreground">{l.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 p-2 rounded-lg">
                    <FlaskConical className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{labRequests.filter(l => l.status === 'fulfilled').length}</p>
                    <p className="text-sm text-muted-foreground">{l.labResults}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 p-2 rounded-lg">
                    <Heart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{calculateHealthScore()}%</p>
                    <p className="text-sm text-muted-foreground">{l.healthScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {l.healthScore}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{l.healthScore}</span>
                  <span className="font-bold">{calculateHealthScore()}%</span>
                </div>
                <Progress value={calculateHealthScore()} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{l.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <Calendar className="h-6 w-6 text-primary" />
                  <span className="text-xs">{l.bookAppointment}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => {
                    setInitialChatOtherUserId(null)
                    setShowMessaging(true)
                  }}
                >
                  <MessageSquare className="h-6 w-6 text-secondary" />
                  <span className="text-xs">{l.messages}</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span className="text-xs">{l.healthRecords}</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <span className="text-xs">{l.emergencyContacts}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{l.upcoming} {l.appointments}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('appointments')}>
                {l.viewAll} <ChevronRight className="h-4 w-4 ms-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{l.noAppointments}</p>
                  <Button size="sm" className="mt-4">
                    <Plus className="h-4 w-4 me-2" />
                    {l.bookAppointment}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 3).map(apt => (
                    <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="bg-primary/10 p-3 rounded-lg text-center min-w-[60px]">
                        <p className="text-xs text-muted-foreground">{getDateLabel(apt.appointment_date)}</p>
                        <p className="text-lg font-bold">{apt.appointment_time?.slice(0, 5)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{apt.doctor?.business_name || 'Doctor'}</p>
                        <p className="text-sm text-muted-foreground">{apt.doctor?.specialty}</p>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Prescriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{l.active} {l.prescriptions}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('prescriptions')}>
                {l.viewAll} <ChevronRight className="h-4 w-4 ms-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {prescriptions.filter(p => p.status !== 'collected').length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{l.noPrescriptions}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.filter(p => p.status !== 'collected').slice(0, 3).map(rx => (
                    <div 
                      key={rx.id} 
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPrescription(rx)}
                    >
                      <div className="bg-secondary/10 p-3 rounded-lg">
                        <Pill className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {rx.medications?.length || 0} medications
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rx.doctor?.business_name || 'Doctor'}
                        </p>
                      </div>
                      {getStatusBadge(rx.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-6 space-y-4">
          {appointments.map(apt => (
            <Card key={apt.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="bg-primary/10 p-4 rounded-lg text-center min-w-[80px]">
                    <p className="text-sm text-muted-foreground">{getDateLabel(apt.appointment_date)}</p>
                    <p className="text-2xl font-bold">{apt.appointment_time?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(apt.status)}
                      <Badge variant="outline">
                        {apt.appointment_type === 'e-visit' ? 'Video' : 'In-Person'}
                      </Badge>
                    </div>
                    <p className="font-medium">{apt.doctor?.business_name || 'Doctor'}</p>
                    <p className="text-sm text-muted-foreground">{apt.doctor?.specialty}</p>
                    {apt.doctor?.wilaya && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {apt.doctor.wilaya}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 me-2" />
                      {l.viewDetails}
                    </Button>
                    {apt.doctor?.phone && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`tel:${apt.doctor.phone}`}>
                          <Phone className="h-4 w-4 me-2" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="mt-6 space-y-4">
          {prescriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noPrescriptions}</p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map(rx => {
              const apptId = rx.appointment_id
              const href = apptId ? `/dashboard/appointments/${apptId}?prescription=${rx.id}` : null
              return (
              <Card key={rx.id} className={rx.status === 'ready' ? 'border-green-500' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div
                      className={`flex-1 space-y-3 ${href ? 'cursor-pointer' : ''}`}
                      role={href ? 'button' : undefined}
                      tabIndex={href ? 0 : undefined}
                      onClick={href ? () => router.push(href) : undefined}
                      onKeyDown={href ? (e) => e.key === 'Enter' && router.push(href) : undefined}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(rx.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(rx.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{rx.doctor?.business_name || 'Doctor'}</p>
                          <p className="text-sm text-muted-foreground">{rx.doctor?.specialty}</p>
                        </div>
                      </div>

                      {rx.medications && rx.medications.length > 0 && (
                        <div className="space-y-1">
                          {rx.medications.slice(0, 3).map((med: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Pill className="h-3 w-3 text-secondary" />
                              <span>{med.name}</span>
                              <span className="text-muted-foreground">- {med.dosage}</span>
                            </div>
                          ))}
                          {rx.medications.length > 3 && (
                            <p className="text-xs text-muted-foreground">+{rx.medications.length - 3} more</p>
                          )}
                        </div>
                      )}

                      {rx.pharmacy && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{rx.pharmacy.business_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => setSelectedPrescription(rx)}>
                        <Eye className="h-4 w-4 me-2" />
                        {l.viewDetails}
                      </Button>
                      
                      {rx.doctor && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openMessaging(rx.doctor?.auth_user_id)}
                        >
                          <MessageSquare className="h-4 w-4 me-2" />
                          {l.sendMessage}
                        </Button>
                      )}

                      <Button size="sm" variant="ghost">
                        <Share2 className="h-4 w-4 me-2" />
                        {l.shareWith}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="labResults" className="mt-6 space-y-4">
          {labRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noLabResults}</p>
              </CardContent>
            </Card>
          ) : (
            labRequests.map(lab => {
              const apptId = lab.appointment_id
              const href = apptId ? `/dashboard/appointments/${apptId}?labRequest=${lab.id}` : `/dashboard/prescriptions?tab=labtests`
              return (
              <Card
                key={lab.id}
                className={`cursor-pointer hover:border-primary/50 transition-colors ${lab.status === 'fulfilled' ? 'border-green-500' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(lab.status, 'lab')}
                        {lab.priority === 'urgent' && <Badge variant="destructive">Urgent</Badge>}
                        <span className="text-sm text-muted-foreground">
                          {new Date(lab.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{lab.doctor?.business_name || 'Doctor'}</p>
                          <p className="text-sm text-muted-foreground">{lab.doctor?.specialty}</p>
                        </div>
                      </div>

                      {lab.test_types && lab.test_types.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {lab.test_types.map((test: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{test}</Badge>
                          ))}
                        </div>
                      )}

                      {lab.laboratory && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <FlaskConical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lab.laboratory.business_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                      {lab.status === 'fulfilled' && lab.result_pdf_url && (
                        <Button size="sm" asChild>
                          <a href={lab.result_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 me-2" />
                            {l.download} PDF
                          </a>
                        </Button>
                      )}
                      
                      {lab.doctor && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openMessaging(lab.doctor?.auth_user_id)}
                        >
                          <MessageSquare className="h-4 w-4 me-2" />
                          {l.sendMessage}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </TabsContent>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations" className="mt-6 space-y-4">
          {vaccinations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Syringe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No vaccination records</p>
              </CardContent>
            </Card>
          ) : (
            vaccinations.map(vax => (
              <Card key={vax.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <Syringe className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {language === 'ar' && vax.vaccine?.name_ar ? vax.vaccine.name_ar : vax.vaccine?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{vax.vaccine?.disease_prevention}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Dose {vax.dose_number}</span>
                        <span>{new Date(vax.administered_date).toLocaleDateString()}</span>
                        {vax.administered_at_facility && <span>{vax.administered_at_facility}</span>}
                      </div>
                    </div>
                    {vax.is_verified && (
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 me-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{l.family}</CardTitle>
              <CardDescription>Manage health records for family members</CardDescription>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No family members added</p>
                  <Button>
                    <Plus className="h-4 w-4 me-2" />
                    Add Family Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {familyMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Avatar>
                        <AvatarFallback>{member.first_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.first_name} {member.last_name}</p>
                        <p className="text-sm text-muted-foreground">{member.relationship}</p>
                      </div>
                      <Button size="sm" variant="outline">Manage</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Prescription Workflow Dialog */}
      {selectedPrescription && (
        <PrescriptionWorkflow
          prescription={selectedPrescription}
          userRole="patient"
          patientId={userId}
          open={true}
          onClose={() => {
            setSelectedPrescription(null)
            loadPatientData()
          }}
          onUpdate={loadPatientData}
        />
      )}

      {/* Lab Test Workflow Dialog */}
      {selectedLabRequest && (
        <LabTestWorkflow
          labRequest={selectedLabRequest}
          userRole="patient"
          patientId={userId}
          open={true}
          onClose={() => {
            setSelectedLabRequest(null)
            loadPatientData()
          }}
          onUpdate={loadPatientData}
        />
      )}

      {/* Messaging Dialog */}
      <Dialog open={showMessaging} onOpenChange={setShowMessaging}>
        <DialogContent size="lg" style={{width: '560px'}}>
          <DialogHeader>
            <DialogTitle>{l.messages}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p>Messaging feature coming soon</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PatientHealthHub

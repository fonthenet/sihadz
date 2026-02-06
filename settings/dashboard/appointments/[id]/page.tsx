'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Video, Building2, 
  Phone, Mail, FileText, Pill, TestTube, User, Stethoscope,
  AlertCircle, CheckCircle
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { PrescriptionWorkflow } from '@/components/prescription-workflow'
import { LabTestWorkflow } from '@/components/lab-test-workflow'
import { useLanguage } from '@/lib/i18n/language-context'

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const [appointment, setAppointment] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadAppointment = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setCurrentUserId(user.id)

    // Load appointment details - simple query
    const { data: appt, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !appt) {
      console.error('Error loading appointment:', error)
      return
    }

    // Fetch doctor details separately
    if (appt.doctor_id) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', appt.doctor_id)
        .single()
      
      const { data: doctorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, email')
        .eq('id', appt.doctor_id)
        .single()
      
      appt.doctor = doctor
      appt.doctor_profile = doctorProfile
    }

    // Fetch patient details separately
    if (appt.patient_id) {
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, email')
        .eq('id', appt.patient_id)
        .single()
      
      appt.patient = patientProfile
    }

    setAppointment(appt)

    // Load prescriptions for this appointment
    const { data: presc } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })

    setPrescriptions(presc || [])

    // Load lab test requests for this appointment
    const { data: labReq } = await supabase
      .from('lab_test_requests')
      .select('*')
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })

    setLabRequests(labReq || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAppointment()
  }, [id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Completed</Badge>
      case 'confirmed':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Appointment not found</p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const doctor = appointment.doctor
  const doctorProfile = appointment.doctor_profile
  const patient = appointment.patient
  
  console.log('[v0] Appointment details:', { appointment, doctor, doctorProfile })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/appointments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {language === 'ar' ? 'تفاصيل الموعد' : language === 'fr' ? 'Détails du rendez-vous' : 'Appointment Details'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {new Date(appointment.appointment_date).toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(appointment.status)}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={async () => {
                if (confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذا الموعد؟' : 'Are you sure you want to cancel this appointment?')) {
                  const supabase = createBrowserClient()
                  
                  console.log('[v0] Cancelling appointment:', id)
                  
                  const { error } = await supabase
                    .from('appointments')
                    .update({ status: 'cancelled' })
                    .eq('id', id)
                  
                  if (!error) {
                    console.log('[v0] Appointment cancelled successfully')
                    // Update local state immediately
                    setAppointment({ ...appointment, status: 'cancelled' })
                    // Navigate back after a brief delay to show the updated state
                    setTimeout(() => {
                      router.push('/dashboard/appointments')
                    }, 500)
                  } else {
                    console.error('[v0] Failed to cancel appointment:', error)
                    alert(language === 'ar' ? 'فشل في إلغاء الموعد' : 'Failed to cancel appointment')
                  }
                }
              }}
            >
              {language === 'ar' ? 'إلغاء الموعد' : language === 'fr' ? 'Annuler' : 'Cancel Appointment'}
            </Button>
          )}
        </div>
      </div>

      {/* Appointment Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Doctor Info */}
            <div className="flex items-start gap-4 flex-1">
              <Avatar className="h-16 w-16">
                <AvatarImage src={doctorProfile?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  <Stethoscope className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">
                  {doctorProfile?.full_name || 'Doctor'}
                </h3>
                <p className="text-sm text-muted-foreground">{doctor?.specialty || 'Medical Professional'}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{doctor?.city || ''}</span>
                </div>
                {doctorProfile?.phone && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span dir="ltr">{doctorProfile.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator orientation="vertical" className="hidden md:block h-auto" />

            {/* Appointment Details */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}
                  </p>
                  <p className="font-medium">{new Date(appointment.appointment_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الوقت' : language === 'fr' ? 'Heure' : 'Time'}
                  </p>
                  <p className="font-medium">{appointment.appointment_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  {appointment.visit_type === 'video' ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'نوع الزيارة' : language === 'fr' ? 'Type de visite' : 'Visit Type'}
                  </p>
                  <p className="font-medium">
                    {appointment.visit_type === 'video' 
                      ? (language === 'ar' ? 'استشارة عن بعد' : language === 'fr' ? 'Téléconsultation' : 'Video Consultation')
                      : (language === 'ar' ? 'حضوري' : language === 'fr' ? 'En personne' : 'In-Person')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Notes */}
          {appointment.notes && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {language === 'ar' ? 'ملاحظات الطبيب' : language === 'fr' ? 'Notes du médecin' : 'Doctor\'s Notes'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescriptions and Lab Tests Tabs */}
      <Tabs defaultValue="prescriptions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prescriptions" className="gap-2">
            <Pill className="h-4 w-4" />
            {language === 'ar' ? 'الوصفات الطبية' : language === 'fr' ? 'Ordonnances' : 'Prescriptions'}
            {prescriptions.length > 0 && (
              <Badge variant="secondary" className="ms-1">{prescriptions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lab-tests" className="gap-2">
            <TestTube className="h-4 w-4" />
            {language === 'ar' ? 'التحاليل المخبرية' : language === 'fr' ? 'Analyses' : 'Lab Tests'}
            {labRequests.length > 0 && (
              <Badge variant="secondary" className="ms-1">{labRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="space-y-4">
          {prescriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Pill className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد وصفات طبية لهذا الموعد' : language === 'fr' ? 'Aucune ordonnance pour ce rendez-vous' : 'No prescriptions for this appointment'}
                </p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((prescription) => (
              <PrescriptionWorkflow
                key={prescription.id}
                prescription={prescription}
                userRole="patient"
                patientId={patient?.id}
                onUpdate={loadAppointment}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="lab-tests" className="space-y-4">
          {labRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TestTube className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد تحاليل مطلوبة لهذا الموعد' : language === 'fr' ? 'Aucune analyse demandée pour ce rendez-vous' : 'No lab tests requested for this appointment'}
                </p>
              </CardContent>
            </Card>
          ) : (
            labRequests.map((labRequest) => (
              <LabTestWorkflow
                key={labRequest.id}
                labRequest={labRequest}
                userRole="patient"
                patientId={patient?.id}
                onUpdate={loadAppointment}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

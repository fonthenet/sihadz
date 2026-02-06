'use client'

import { useRouter } from "next/navigation"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/header'
import { DocumentUpload, type Document } from '@/components/document-upload'
import { useLanguage } from '@/lib/i18n/language-context'
import { useAuth } from '@/components/auth-provider'
import { createBrowserClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Stethoscope, 
  Phone,
  XCircle,
  Plus,
  FileText,
  Download,
  Video,
  Building,
  ArrowRight,
  ArrowLeft,
  Pill,
  Shield,
  CreditCard,
  Navigation,
  Bell,
  CheckCircle,
  QrCode
} from 'lucide-react'

export default function PatientDashboard() {
  const { t, language, dir } = useLanguage()
  const { user, profile, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()
  
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [familyMembers, setFamilyMembers] = useState<any[]>([])

  // Check if user is a professional and redirect
  useEffect(() => {
    async function checkUserRole() {
      if (!user?.id) return
      
      const { data: professionalData } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      
      if (professionalData) {
        console.log('[v0] User is a professional, redirecting to professional dashboard')
        router.push('/professional/dashboard')
      }
    }
    
    checkUserRole()
  }, [user, supabase, router])

  // Fetch real data from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        console.log('[v0] Dashboard: Fetching data for user:', user.id)
        
        // Fetch appointments - match by patient_id OR email (for guest bookings)
        const { data: appointmentsData, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .or(`patient_id.eq.${user.id},patient_email.eq.${user.email},guest_email.eq.${user.email}`)
          .order('appointment_date', { ascending: true })

        console.log('[v0] Dashboard appointments:', appointmentsData, 'Error:', apptError)
        
        // Enrich appointments with doctor data and filter out invalid ones
        if (appointmentsData && appointmentsData.length > 0) {
          const doctorIds = [...new Set(appointmentsData.map(a => a.doctor_id).filter(Boolean))]
          
          // Get doctors info
          const { data: doctorsData } = await supabase
            .from('doctors')
            .select('*')
            .in('id', doctorIds)
          
          // Get doctor profiles (user_id from doctors table)
          const doctorUserIds = (doctorsData || []).map(d => d.user_id).filter(Boolean)
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', doctorUserIds)
          
          const doctorsMap = new Map((doctorsData || []).map(d => [d.id, d]))
          const profilesMap = new Map((profilesData || []).map(p => [p.id, p]))
          
          console.log('[v0] Dashboard enrichment:', { doctorsData, profilesData, doctorsMap, profilesMap })
          
          // Enrich appointments with doctor info
          const enrichedAppointments = appointmentsData
            .filter(apt => doctorsMap.has(apt.doctor_id))
            .map(apt => {
              const doctor = doctorsMap.get(apt.doctor_id)
              const profile = profilesMap.get(doctor?.user_id)
              
              return {
                ...apt,
                doctorName: profile?.full_name || 'Doctor',
                doctorNameAr: profile?.full_name || 'طبيب',
                specialty: doctor?.specialty || 'Medical Professional',
                specialtyAr: doctor?.specialty || 'مهني طبي'
              }
            })
          
          console.log('[v0] Enriched appointments:', enrichedAppointments)
          setAppointments(enrichedAppointments)
        } else {
          setAppointments([])
        }

        // Fetch prescriptions - simple query
        const { data: prescriptionsData, error: prescError } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        console.log('[v0] Dashboard prescriptions:', prescriptionsData, 'Error:', prescError)
        setPrescriptions(prescriptionsData || [])

        // Fetch family members - simple query
        const { data: familyData, error: familyError } = await supabase
          .from('family_members')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        console.log('[v0] Dashboard family:', familyData, 'Error:', familyError)
        setFamilyMembers(familyData || [])

        // Fetch documents
        const { data: documentsData } = await supabase
          .from('patient_documents')
          .select('*')
          .eq('patient_id', user.id)
          .order('uploaded_at', { ascending: false })

        setDocuments(documentsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])
  const upcomingAppointments = appointments.filter(apt => apt.status === 'confirmed')
  const activePrescriptions = prescriptions.filter(rx => rx.status === 'ready')
  
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const handleDocumentUpload = (doc: Omit<Document, 'id'>) => {
    setDocuments([...documents, { ...doc, id: Date.now().toString() }])
  }

  const handleDocumentDelete = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id))
  }

  // Show loading while auth or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header showNav={false} />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('myAppointments')}</h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة مواعيدك ووصفاتك الطبية' : language === 'fr' ? 'Gérez vos consultations et ordonnances' : 'Manage your appointments and prescriptions'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-5">
          <Link href="/booking/new">
            <Card className="transition-shadow hover:shadow-lg cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t('newAppointment')}</p>
                    <p className="text-sm text-muted-foreground">{t('findDoctor')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/tickets">
            <Card className="transition-shadow hover:shadow-lg cursor-pointer h-full border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
                    <QrCode className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{language === 'ar' ? 'تذاكري الصحية' : language === 'fr' ? 'Mes Tickets' : 'My Tickets'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تتبع كل شيء' : language === 'fr' ? 'Suivre tout' : 'Track Everything'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/pharmacies">
            <Card className="transition-shadow hover:shadow-lg cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <Pill className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t('findPharmacy')}</p>
                    <p className="text-sm text-muted-foreground">{t('nearbyPharmacies')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{upcomingAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">{t('upcoming')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activePrescriptions.length}</p>
                  <p className="text-sm text-muted-foreground">{t('prescriptions')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">{t('myAppointments')}</TabsTrigger>
            <TabsTrigger value="prescriptions">{t('prescriptions')}</TabsTrigger>
            <TabsTrigger value="documents">{t('documents')}</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => {
                // Use enriched fields from the data fetch
                const doctorName = language === 'ar' 
                  ? appointment.doctorNameAr || appointment.doctorName || 'Doctor'
                  : appointment.doctorName || 'Doctor'
                const specialty = language === 'ar'
                  ? appointment.specialtyAr || appointment.specialty || 'Medical Professional'
                  : appointment.specialty || 'Medical Professional'
                const appointmentDate = new Date(appointment.appointment_date)
                const appointmentTime = appointment.appointment_time || appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <Card key={appointment.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid lg:grid-cols-[1fr_auto]">
                        <div className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${
                                appointment.appointment_type === 'e-visit' ? 'bg-secondary/10' : 'bg-primary/10'
                              }`}>
                                {appointment.appointment_type === 'e-visit' ? (
                                  <Video className="h-7 w-7 text-secondary" />
                                ) : (
                                  <Stethoscope className="h-7 w-7 text-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-foreground">{doctorName}</h3>
                                <p className="text-muted-foreground">{specialty}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={appointment.appointment_type === 'e-visit' ? 'secondary' : 'default'}>
                                {appointment.appointment_type === 'e-visit' ? (
                                  <><Video className="h-3 w-3 me-1" />{t('eVisit')}</>
                                ) : (
                                  <><Building className="h-3 w-3 me-1" />{t('inPerson')}</>
                                )}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={
                                  appointment.status === 'confirmed'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : appointment.status === 'cancelled'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : ''
                                }
                              >
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{appointmentDate.toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{appointmentTime}</span>
                            </div>
                            {appointment.appointment_type === 'in-person' && appointment.doctor?.address && (
                              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                                <MapPin className="h-4 w-4" />
                                <span>{appointment.doctor.address}</span>
                              </div>
                            )}
                          </div>

                          {appointment.confirmation_code && (
                            <div className="rounded-lg bg-muted/50 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t('confirmationCode')}</span>
                                <span className="font-mono text-sm font-semibold text-foreground">
                                  {appointment.confirmation_code}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 border-t p-6 lg:min-w-[250px] lg:border-s lg:border-t-0">
                          <div className="mb-2">
                            <div className="text-sm text-muted-foreground">{t('consultation')}</div>
                            <div className="text-2xl font-bold text-primary">
                              {appointment.consultation_fee ? `${appointment.consultation_fee} DZD` : 'N/A'}
                            </div>
                          </div>
                          {appointment.appointment_type === 'e-visit' && appointment.video_link && (
                            <Link href={appointment.video_link}>
                              <Button size="sm" className="w-full bg-secondary hover:bg-secondary/90">
                                <Video className="me-2 h-4 w-4" />
                                {language === 'ar' ? 'انضم للاستشارة' : language === 'fr' ? 'Rejoindre' : 'Join E-Visit'}
                              </Button>
                            </Link>
                          )}
                          {appointment.doctor?.phone && (
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              <Phone className="me-2 h-4 w-4" />
                              {t('contact')}
                            </Button>
                          )}
                          <Link href={`/dashboard/appointments/${appointment.id}`}>
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              {t('viewDetails')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{t('noUpcoming')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {language === 'ar' ? 'لا توجد مواعيد قادمة' : language === 'fr' ? 'Aucun rendez-vous à venir' : 'You have no upcoming appointments'}
                  </p>
                  <Link href="/booking/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t('findDoctor')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-4">
            {prescriptions.length > 0 ? (
              prescriptions.map((rx) => {
                const doctorName = rx.doctor?.profiles?.first_name 
                  ? `Dr. ${rx.doctor.profiles.first_name} ${rx.doctor.profiles.last_name}`
                  : rx.doctor?.business_name || 'Doctor'
                
                return (
                  <Card key={rx.id} className={rx.status === 'ready' ? 'border-green-500/50 bg-green-500/5' : ''}>
                    <CardContent className="p-6">
                      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {rx.status?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <p className="text-foreground font-semibold mt-1">{doctorName}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(rx.created_at).toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US')}
                              </p>
                            </div>
                          </div>

                          {/* Medications */}
                          {rx.medications && rx.medications.length > 0 && (
                            <div className="space-y-2">
                              {rx.medications.map((med: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Pill className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{med.name}</span>
                                  <span className="text-muted-foreground">{med.dosage}</span>
                                  <span className="text-muted-foreground">- {med.frequency}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {rx.diagnosis && (
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="text-sm font-medium mb-1">{t('diagnosis')}</p>
                              <p className="text-sm text-muted-foreground">{rx.diagnosis}</p>
                            </div>
                          )}

                          {/* Pharmacy */}
                          {rx.pharmacy && (
                            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                              <Pill className="h-5 w-5 text-secondary" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{rx.pharmacy.business_name}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 lg:min-w-[200px]">
                          {rx.total_amount && (
                            <div className="mb-2">
                              <div className="text-sm text-muted-foreground">{t('totalAmount')}</div>
                              <div className="text-xl font-bold text-primary">{rx.total_amount} DZD</div>
                            </div>
                          )}
                          <Link href={`/dashboard/prescriptions`}>
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              <FileText className="h-4 w-4 me-1" />
                              {t('viewDetails')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {language === 'ar' ? 'لا توجد وصفات طبية' : language === 'fr' ? 'Aucune ordonnance' : 'No prescriptions yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'سيتم عرض وصفاتك الطبية هنا' : language === 'fr' ? 'Vos ordonnances apparaîtront ici' : 'Your prescriptions will appear here'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <DocumentUpload
              documents={documents}
              onUpload={handleDocumentUpload}
              onDelete={handleDocumentDelete}
              showChifaCard={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Header } from '@/components/header'
import { useLanguage } from '@/lib/i18n/language-context'
import { 
  Calendar, 
  Clock, 
  User, 
  Settings, 
  LogOut, 
  Stethoscope, 
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Video,
  Building,
  ImageIcon,
  FileText,
  Play,
  Eye,
  AlertCircle
} from 'lucide-react'

// Mock appointments data with e-visit and image support
const mockAppointments = [
  {
    id: 1,
    patient: 'Karim Benali',
    patientAr: 'كريم بن علي',
    time: '09:00',
    date: 'today',
    status: 'confirmed',
    visitType: 'e-visit',
    phone: '+213 XXX XX XX XX',
    email: 'k.benali@email.dz',
    symptoms: 'Chest pain and shortness of breath for 3 days',
    symptomsAr: 'ألم في الصدر وضيق في التنفس منذ 3 أيام',
    severity: 'moderate',
    images: [
      { id: '1', name: 'ECG_result.pdf', type: 'pdf' },
      { id: '2', name: 'chest_xray.jpg', type: 'image' }
    ],
    allergies: 'Penicillin',
    currentMedications: 'Aspirin 100mg daily'
  },
  {
    id: 2,
    patient: 'Fatima Cherif',
    patientAr: 'فاطمة شريف',
    time: '10:00',
    date: 'today',
    status: 'confirmed',
    visitType: 'in-person',
    phone: '+213 XXX XX XX XX',
    email: 'f.cherif@email.dz',
    symptoms: 'Regular checkup and blood pressure monitoring',
    symptomsAr: 'فحص روتيني ومراقبة ضغط الدم',
    severity: 'mild',
    images: [],
    allergies: 'None',
    currentMedications: 'Lisinopril 10mg'
  },
  {
    id: 3,
    patient: 'Ahmed Mansouri',
    patientAr: 'أحمد منصوري',
    time: '14:00',
    date: 'today',
    status: 'pending',
    visitType: 'e-visit',
    phone: '+213 XXX XX XX XX',
    email: 'a.mansouri@email.dz',
    symptoms: 'Post-surgery follow-up, healing well but some discomfort',
    symptomsAr: 'متابعة بعد العملية، الشفاء جيد لكن يوجد بعض الانزعاج',
    severity: 'mild',
    images: [
      { id: '3', name: 'surgery_site.jpg', type: 'image' }
    ],
    allergies: 'Sulfa drugs',
    currentMedications: 'Paracetamol 500mg as needed'
  },
  {
    id: 4,
    patient: 'Sarah Amara',
    patientAr: 'سارة عمارة',
    time: '15:00',
    date: 'today',
    status: 'confirmed',
    visitType: 'in-person',
    phone: '+213 XXX XX XX XX',
    email: 's.amara@email.dz',
    symptoms: 'Heart palpitations and dizziness',
    symptomsAr: 'خفقان القلب ودوخة',
    severity: 'severe',
    images: [],
    allergies: 'None known',
    currentMedications: 'None'
  },
  {
    id: 5,
    patient: 'Youcef Brahim',
    patientAr: 'يوسف براهيم',
    time: '09:00',
    date: 'tomorrow',
    status: 'confirmed',
    visitType: 'e-visit',
    phone: '+213 XXX XX XX XX',
    email: 'y.brahim@email.dz',
    symptoms: 'First consultation - general heart health assessment',
    symptomsAr: 'استشارة أولى - تقييم عام لصحة القلب',
    severity: 'mild',
    images: [
      { id: '4', name: 'blood_test.pdf', type: 'pdf' }
    ],
    allergies: 'Ibuprofen',
    currentMedications: 'Metformin 500mg'
  }
]

export default function DoctorDashboard() {
  const { t, language, dir } = useLanguage()
  const [appointments] = useState(mockAppointments)
  const [selectedPatient, setSelectedPatient] = useState<typeof mockAppointments[0] | null>(null)

  const todayAppointments = appointments.filter(apt => apt.date === 'today')
  const tomorrowAppointments = appointments.filter(apt => apt.date === 'tomorrow')
  const eVisitCount = todayAppointments.filter(apt => apt.visitType === 'e-visit').length

  const stats = [
    { 
      label: language === 'ar' ? 'مواعيد اليوم' : language === 'fr' ? "RDV aujourd'hui" : "Today's Appointments", 
      value: todayAppointments.length.toString(), 
      icon: Calendar, 
      color: 'text-primary' 
    },
    { 
      label: language === 'ar' ? 'استشارات عن بعد' : language === 'fr' ? 'Téléconsultations' : 'E-Visits Today', 
      value: eVisitCount.toString(), 
      icon: Video, 
      color: 'text-secondary' 
    },
    { 
      label: t('newPatients'), 
      value: '23', 
      icon: Users, 
      color: 'text-foreground' 
    },
    { 
      label: t('fillRate'), 
      value: '89%', 
      icon: TrendingUp, 
      color: 'text-primary' 
    }
  ]

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'mild':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          {language === 'ar' ? 'خفيف' : language === 'fr' ? 'Léger' : 'Mild'}
        </Badge>
      case 'moderate':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          {language === 'ar' ? 'متوسط' : language === 'fr' ? 'Modéré' : 'Moderate'}
        </Badge>
      case 'severe':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <AlertCircle className="h-3 w-3 me-1" />
          {language === 'ar' ? 'شديد' : language === 'fr' ? 'Sévère' : 'Severe'}
        </Badge>
      default:
        return null
    }
  }

  const AppointmentCard = ({ appointment }: { appointment: typeof mockAppointments[0] }) => (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    appointment.visitType === 'e-visit' ? 'bg-secondary/10' : 'bg-primary/10'
                  }`}>
                    {appointment.visitType === 'e-visit' ? (
                      <Video className="h-6 w-6 text-secondary" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {language === 'ar' ? appointment.patientAr : appointment.patient}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{appointment.time}</span>
                      <Badge variant={appointment.visitType === 'e-visit' ? 'secondary' : 'default'} className="ms-2">
                        {appointment.visitType === 'e-visit' ? (
                          <>
                            <Video className="h-3 w-3 me-1" />
                            {t('eVisit')}
                          </>
                        ) : (
                          <>
                            <Building className="h-3 w-3 me-1" />
                            {t('inPerson')}
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getSeverityBadge(appointment.severity)}
                <Badge 
                  variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                  className={appointment.status === 'confirmed' ? 'bg-primary' : ''}
                >
                  {appointment.status === 'confirmed' ? t('confirmed') : t('pending')}
                </Badge>
              </div>
            </div>

            {/* Symptoms Preview */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'الأعراض' : language === 'fr' ? 'Symptômes' : 'Symptoms'}:
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? appointment.symptomsAr : appointment.symptoms}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{appointment.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{appointment.email}</span>
              </div>
            </div>

            {/* Attached Images/Files */}
            {appointment.images.length > 0 && (
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {appointment.images.length} {language === 'ar' ? 'ملفات مرفقة' : language === 'fr' ? 'fichiers joints' : 'attached files'}
                </span>
                {appointment.images.map(img => (
                  <Badge key={img.id} variant="outline" className="text-xs">
                    {img.type === 'pdf' ? <FileText className="h-3 w-3 me-1" /> : <ImageIcon className="h-3 w-3 me-1" />}
                    {img.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:min-w-[200px]">
            {appointment.visitType === 'e-visit' && appointment.status === 'confirmed' && (
              <Button size="sm" className="w-full bg-secondary hover:bg-secondary/90">
                <Play className="me-2 h-4 w-4" />
                {t('startEVisit')}
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full bg-transparent" onClick={() => setSelectedPatient(appointment)}>
                  <Eye className="me-2 h-4 w-4" />
                  {t('viewPatientInfo')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    {language === 'ar' ? appointment.patientAr : appointment.patient}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('phone')}</p>
                      <p className="text-sm text-muted-foreground">{appointment.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('email')}</p>
                      <p className="text-sm text-muted-foreground">{appointment.email}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">{t('symptoms')}</p>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? appointment.symptomsAr : appointment.symptoms}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('allergies')}</p>
                      <p className="text-sm text-muted-foreground">{appointment.allergies}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('currentMedications')}</p>
                      <p className="text-sm text-muted-foreground">{appointment.currentMedications}</p>
                    </div>
                  </div>

                  {appointment.images.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">{t('patientImages')}</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {appointment.images.map(img => (
                          <div key={img.id} className="rounded-lg border p-3 text-center hover:bg-muted/50 cursor-pointer">
                            {img.type === 'pdf' ? (
                              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            ) : (
                              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            )}
                            <p className="text-xs text-muted-foreground truncate">{img.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" className="w-full bg-transparent">
              <Phone className="me-2 h-4 w-4" />
              {t('call')}
            </Button>
            {appointment.status === 'pending' && (
              <>
                <Button size="sm" className="w-full">
                  <CheckCircle className="me-2 h-4 w-4" />
                  {t('confirm')}
                </Button>
                <Button size="sm" variant="outline" className="w-full bg-transparent text-destructive hover:text-destructive">
                  <XCircle className="me-2 h-4 w-4" />
                  {t('cancel')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">{t('appName')}</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/doctor-dashboard/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard')}</h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'مرحباً د. أمينة بن علي' : language === 'fr' ? 'Bienvenue Dr. Amina Benali' : 'Welcome Dr. Amina Benali'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList>
            <TabsTrigger value="today">
              {t('today')} ({todayAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="tomorrow">
              {t('tomorrow')} ({tomorrowAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="calendar">
              {language === 'ar' ? 'التقويم' : language === 'fr' ? 'Calendrier' : 'Calendar'}
            </TabsTrigger>
          </TabsList>

          {/* Today's Appointments */}
          <TabsContent value="today" className="space-y-4">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {language === 'ar' ? 'لا توجد مواعيد اليوم' : language === 'fr' ? "Pas de rendez-vous aujourd'hui" : 'No appointments today'}
                  </h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tomorrow's Appointments */}
          <TabsContent value="tomorrow" className="space-y-4">
            {tomorrowAppointments.length > 0 ? (
              tomorrowAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {language === 'ar' ? 'لا توجد مواعيد غداً' : language === 'fr' ? 'Pas de rendez-vous demain' : 'No appointments tomorrow'}
                  </h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'عرض التقويم' : language === 'fr' ? 'Vue calendrier' : 'Calendar View'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex h-96 items-center justify-center rounded-lg bg-muted/30">
                  <div className="text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'عرض التقويم الكامل قريباً' : language === 'fr' ? 'Vue calendrier complète à venir' : 'Full calendar view coming soon'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/header'
import { useLanguage } from '@/lib/i18n/language-context'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from './loading' // Import the Loading component

import { 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  User,
  Pill,
  Package,
  Bell,
  Settings,
  LogOut,
  AlertCircle,
  Search,
  Timer,
  MapPin,
  Calendar,
  Banknote,
  CreditCard,
  Shield,
  Eye,
  Send
} from 'lucide-react'

// Mock prescriptions data
const mockPrescriptions = [
  {
    id: 'RX-001',
    patientName: 'Karim Benali',
    patientNameAr: 'كريم بن علي',
    patientPhone: '+213 XXX XX XX XX',
    doctorName: 'Dr. Amina Benali',
    doctorNameAr: 'د. أمينة بن علي',
    doctorSpecialty: 'Cardiology',
    doctorSpecialtyAr: 'طب القلب',
    receivedAt: '2025-01-18 09:30',
    status: 'pending',
    medications: [
      { name: 'Amlodipine', dosage: '5mg', quantity: 30, inStock: true, reimbursable: true },
      { name: 'Aspirin', dosage: '100mg', quantity: 30, inStock: true, reimbursable: true },
      { name: 'Atorvastatin', dosage: '20mg', quantity: 30, inStock: false, reimbursable: true }
    ],
    totalAmount: 2500,
    paymentMethod: 'cash',
    chifaCoverage: 80
  },
  {
    id: 'RX-002',
    patientName: 'Fatima Cherif',
    patientNameAr: 'فاطمة شريف',
    patientPhone: '+213 XXX XX XX XX',
    doctorName: 'Dr. Karim Mokrani',
    doctorNameAr: 'د. كريم مقراني',
    doctorSpecialty: 'General Medicine',
    doctorSpecialtyAr: 'طب عام',
    receivedAt: '2025-01-18 10:15',
    status: 'preparing',
    medications: [
      { name: 'Paracetamol', dosage: '500mg', quantity: 20, inStock: true, reimbursable: true },
      { name: 'Amoxicillin', dosage: '1g', quantity: 14, inStock: true, reimbursable: true }
    ],
    totalAmount: 1200,
    paymentMethod: 'cib',
    chifaCoverage: 80
  },
  {
    id: 'RX-003',
    patientName: 'Ahmed Mansouri',
    patientNameAr: 'أحمد منصوري',
    patientPhone: '+213 XXX XX XX XX',
    doctorName: 'Dr. Sarah Cherif',
    doctorNameAr: 'د. سارة شريف',
    doctorSpecialty: 'Pediatrics',
    doctorSpecialtyAr: 'طب الأطفال',
    receivedAt: '2025-01-18 08:45',
    status: 'ready',
    medications: [
      { name: 'Ibuprofene Sirop', dosage: '100mg/5ml', quantity: 1, inStock: true, reimbursable: true }
    ],
    totalAmount: 650,
    paymentMethod: 'edahabia',
    chifaCoverage: 80
  },
  {
    id: 'RX-004',
    patientName: 'Yasmine Hadj',
    patientNameAr: 'ياسمين حاج',
    patientPhone: '+213 XXX XX XX XX',
    doctorName: 'Dr. Amina Benali',
    doctorNameAr: 'د. أمينة بن علي',
    doctorSpecialty: 'Cardiology',
    doctorSpecialtyAr: 'طب القلب',
    receivedAt: '2025-01-17 16:30',
    status: 'dispensed',
    medications: [
      { name: 'Lisinopril', dosage: '10mg', quantity: 30, inStock: true, reimbursable: true },
      { name: 'Metformin', dosage: '500mg', quantity: 60, inStock: true, reimbursable: true }
    ],
    totalAmount: 1800,
    paymentMethod: 'cash',
    chifaCoverage: 80
  }
]

export default function PharmacyDashboard() {
  const { t, language, dir } = useLanguage()
  const searchParams = useSearchParams()
  const [prescriptions, setPrescriptions] = useState(mockPrescriptions)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRx, setSelectedRx] = useState<typeof mockPrescriptions[0] | null>(null)

  const pendingRx = prescriptions.filter(rx => rx.status === 'pending')
  const preparingRx = prescriptions.filter(rx => rx.status === 'preparing')
  const readyRx = prescriptions.filter(rx => rx.status === 'ready')
  const dispensedRx = prescriptions.filter(rx => rx.status === 'dispensed')

  const stats = [
    { 
      label: language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En attente' : 'Pending',
      value: pendingRx.length, 
      icon: Clock, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10'
    },
    { 
      label: language === 'ar' ? 'قيد التحضير' : language === 'fr' ? 'En préparation' : 'Preparing',
      value: preparingRx.length, 
      icon: Package, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: language === 'ar' ? 'جاهز للاستلام' : language === 'fr' ? 'Prêt' : 'Ready',
      value: readyRx.length, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: language === 'ar' ? 'تم الصرف اليوم' : language === 'fr' ? "Dispensé aujourd'hui" : 'Dispensed Today',
      value: dispensedRx.length, 
      icon: FileText, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="h-3 w-3 me-1" />
          {language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En attente' : 'Pending'}
        </Badge>
      case 'preparing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Package className="h-3 w-3 me-1" />
          {language === 'ar' ? 'قيد التحضير' : language === 'fr' ? 'En préparation' : 'Preparing'}
        </Badge>
      case 'ready':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 me-1" />
          {language === 'ar' ? 'جاهز' : language === 'fr' ? 'Prêt' : 'Ready'}
        </Badge>
      case 'dispensed':
        return <Badge variant="secondary">
          <CheckCircle className="h-3 w-3 me-1" />
          {language === 'ar' ? 'تم الصرف' : language === 'fr' ? 'Dispensé' : 'Dispensed'}
        </Badge>
      default:
        return null
    }
  }

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="outline"><Banknote className="h-3 w-3 me-1" />{t('cash')}</Badge>
      case 'cib':
        return <Badge variant="outline"><CreditCard className="h-3 w-3 me-1" />{t('cib')}</Badge>
      case 'edahabia':
        return <Badge variant="outline" className="bg-yellow-500/10">{t('edahabia')}</Badge>
      default:
        return null
    }
  }

  const updateStatus = (rxId: string, newStatus: string) => {
    setPrescriptions(prescriptions.map(rx => 
      rx.id === rxId ? { ...rx, status: newStatus } : rx
    ))
  }

  const notifyPatient = (rx: typeof mockPrescriptions[0]) => {
    // In production, this would send SMS/push notification
    alert(language === 'ar' ? `تم إشعار ${rx.patientNameAr}` : `Patient ${rx.patientName} notified`)
  }

  const PrescriptionCard = ({ rx }: { rx: typeof mockPrescriptions[0] }) => (
    <Card className={rx.status === 'pending' ? 'border-yellow-500/50' : ''}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">{rx.id}</span>
                {getStatusBadge(rx.status)}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {language === 'ar' ? rx.patientNameAr : rx.patientName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? rx.doctorNameAr : rx.doctorName} - {language === 'ar' ? rx.doctorSpecialtyAr : rx.doctorSpecialty}
              </p>
            </div>
            <div className="text-end">
              <p className="text-sm text-muted-foreground">{rx.receivedAt}</p>
              {getPaymentBadge(rx.paymentMethod)}
            </div>
          </div>

          {/* Medications */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            {rx.medications.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{med.name}</span>
                  <span className="text-muted-foreground">{med.dosage}</span>
                  <span className="text-muted-foreground">x{med.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  {med.reimbursable && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                      <Shield className="h-3 w-3 me-1" />
                      {t('reimbursable')}
                    </Badge>
                  )}
                  {med.inStock ? (
                    <Badge variant="outline" className="text-xs text-green-600">{t('inStock')}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-red-600">{t('outOfStock')}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'تغطية الشفاء' : 'Chifa Coverage'}: {rx.chifaCoverage}%
              </p>
              <p className="text-lg font-bold text-primary">
                {rx.totalAmount.toLocaleString()} DZD
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setSelectedRx(rx)}>
                    <Eye className="h-4 w-4 me-1" />
                    {t('view')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {language === 'ar' ? 'تفاصيل الوصفة' : 'Prescription Details'} - {rx.id}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedRx && (
                    <div className="space-y-4 mt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium">{language === 'ar' ? 'المريض' : 'Patient'}</p>
                          <p className="text-foreground">{language === 'ar' ? selectedRx.patientNameAr : selectedRx.patientName}</p>
                          <p className="text-sm text-muted-foreground">{selectedRx.patientPhone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{language === 'ar' ? 'الطبيب' : 'Doctor'}</p>
                          <p className="text-foreground">{language === 'ar' ? selectedRx.doctorNameAr : selectedRx.doctorName}</p>
                          <p className="text-sm text-muted-foreground">{language === 'ar' ? selectedRx.doctorSpecialtyAr : selectedRx.doctorSpecialty}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">{t('medications')}</p>
                        <div className="space-y-2">
                          {selectedRx.medications.map((med, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <p className="font-medium">{med.name}</p>
                                <p className="text-sm text-muted-foreground">{med.dosage} - {language === 'ar' ? 'الكمية' : 'Qty'}: {med.quantity}</p>
                              </div>
                              {!med.inStock && (
                                <Badge variant="destructive">{t('outOfStock')}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              {rx.status === 'pending' && (
                <Button size="sm" onClick={() => updateStatus(rx.id, 'preparing')}>
                  {t('prepareOrder')}
                </Button>
              )}
              {rx.status === 'preparing' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                  updateStatus(rx.id, 'ready')
                  notifyPatient(rx)
                }}>
                  <Bell className="h-4 w-4 me-1" />
                  {t('orderReady')}
                </Button>
              )}
              {rx.status === 'ready' && (
                <Button size="sm" onClick={() => updateStatus(rx.id, 'dispensed')}>
                  <CheckCircle className="h-4 w-4 me-1" />
                  {language === 'ar' ? 'تم الصرف' : 'Dispense'}
                </Button>
              )}
              <Button variant="outline" size="sm" className="bg-transparent">
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Suspense fallback={<Loading />}> {/* Wrap the main content in a Suspense boundary */}
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Pill className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <span className="text-xl font-semibold text-foreground">{t('appName')}</span>
                <span className="ms-2 text-sm text-muted-foreground">
                  {language === 'ar' ? 'الصيدلية' : 'Pharmacy'}
                </span>
              </div>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث عن وصفة...' : 'Search prescription...'}
                  className="ps-9 w-[200px] lg:w-[300px]"
                />
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">{t('pharmacyDashboard')}</h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'صيدلية النور - الجزائر العاصمة' : 'Pharmacie El Nour - Alger'}
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Prescription Queue */}
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
                {pendingRx.length > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs">
                    {pendingRx.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="preparing">
                {language === 'ar' ? 'قيد التحضير' : 'Preparing'} ({preparingRx.length})
              </TabsTrigger>
              <TabsTrigger value="ready">
                {language === 'ar' ? 'جاهز للاستلام' : 'Ready'} ({readyRx.length})
              </TabsTrigger>
              <TabsTrigger value="dispensed">
                {language === 'ar' ? 'تم الصرف' : 'Dispensed'} ({dispensedRx.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingRx.length > 0 ? (
                pendingRx.map(rx => <PrescriptionCard key={rx.id} rx={rx} />)
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد وصفات قيد الانتظار' : 'No pending prescriptions'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="preparing" className="space-y-4">
              {preparingRx.length > 0 ? (
                preparingRx.map(rx => <PrescriptionCard key={rx.id} rx={rx} />)
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد وصفات قيد التحضير' : 'No prescriptions being prepared'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ready" className="space-y-4">
              {readyRx.length > 0 ? (
                readyRx.map(rx => <PrescriptionCard key={rx.id} rx={rx} />)
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد وصفات جاهزة' : 'No prescriptions ready for pickup'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="dispensed" className="space-y-4">
              {dispensedRx.length > 0 ? (
                dispensedRx.map(rx => <PrescriptionCard key={rx.id} rx={rx} />)
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد وصفات تم صرفها اليوم' : 'No prescriptions dispensed today'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Suspense>
  )
}

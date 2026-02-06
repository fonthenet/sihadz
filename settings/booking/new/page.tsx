'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Header } from '@/components/header'
import { useLanguage } from '@/lib/i18n/language-context'
import { 
  ArrowRight, ArrowLeft, Video, Building, Upload, X, Check,
  Calendar, Clock, Stethoscope, User, FileText, MapPin, Star,
  Home, Search, Heart, Building2, Sparkles, Pill,
  FlaskConical, Ambulance, Navigation, File, CreditCard, QrCode, Copy
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { PaymentMethodSelector, type PaymentMethodType } from '@/components/payment/payment-method-selector'

// ==================== TYPES ====================
interface BusinessCategory {
  id: string
  name: { en: string; ar: string; fr: string }
  icon: any
  subcategories: { id: string; name: { en: string; ar: string; fr: string } }[]
}

interface Provider {
  id: string
  name: string
  nameAr: string
  specialty: string
  specialtyAr: string
  location: string
  wilaya: string
  city: string
  rating: number
  reviews: number
  price: number
  supportsEVisit: boolean
  supportsInPerson: boolean
  supportsHomeVisit: boolean
  isFavorite?: boolean
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  preview?: string
}

// ==================== DATA ====================
const businessCategories: BusinessCategory[] = [
  {
    id: 'doctors',
    name: { en: 'Doctors', ar: 'الأطباء', fr: 'Médecins' },
    icon: Stethoscope,
    subcategories: [
      { id: 'general', name: { en: 'General Practitioner', ar: 'طبيب عام', fr: 'Médecin Généraliste' } },
      { id: 'dentist', name: { en: 'Dentist', ar: 'طبيب أسنان', fr: 'Dentiste' } },
      { id: 'ent', name: { en: 'ENT (Ear, Nose, Throat)', ar: 'أنف وأذن وحنجرة', fr: 'ORL' } },
      { id: 'cardiologist', name: { en: 'Cardiologist', ar: 'طبيب قلب', fr: 'Cardiologue' } },
      { id: 'dermatologist', name: { en: 'Dermatologist', ar: 'طبيب جلدية', fr: 'Dermatologue' } },
      { id: 'gynecologist', name: { en: 'Gynecologist', ar: 'طبيب نساء وتوليد', fr: 'Gynécologue' } },
      { id: 'pediatrician', name: { en: 'Pediatrician', ar: 'طبيب أطفال', fr: 'Pédiatre' } },
      { id: 'ophthalmologist', name: { en: 'Ophthalmologist', ar: 'طبيب عيون', fr: 'Ophtalmologue' } },
      { id: 'orthopedic', name: { en: 'Orthopedic', ar: 'طبيب عظام', fr: 'Orthopédiste' } },
      { id: 'neurologist', name: { en: 'Neurologist', ar: 'طبيب أعصاب', fr: 'Neurologue' } },
      { id: 'psychiatrist', name: { en: 'Psychiatrist', ar: 'طبيب نفسي', fr: 'Psychiatre' } },
      { id: 'urologist', name: { en: 'Urologist', ar: 'طبيب مسالك بولية', fr: 'Urologue' } },
    ]
  },
  {
    id: 'health-clinics',
    name: { en: 'Health Clinics', ar: 'العيادات الصحية', fr: 'Cliniques de Santé' },
    icon: Building2,
    subcategories: [
      { id: 'general-clinic', name: { en: 'General Clinic', ar: 'عيادة عامة', fr: 'Clinique Générale' } },
      { id: 'dental-clinic', name: { en: 'Dental Clinic', ar: 'عيادة أسنان', fr: 'Clinique Dentaire' } },
      { id: 'eye-clinic', name: { en: 'Eye Clinic', ar: 'عيادة عيون', fr: 'Clinique Ophtalmologique' } },
      { id: 'womens-health', name: { en: 'Women\'s Health', ar: 'صحة المرأة', fr: 'Santé Féminine' } },
      { id: 'physical-therapy', name: { en: 'Physical Therapy', ar: 'علاج طبيعي', fr: 'Kinésithérapie' } },
    ]
  },
  {
    id: 'beauty-clinics',
    name: { en: 'Beauty & Aesthetic', ar: 'عيادات التجميل', fr: 'Esthétique' },
    icon: Sparkles,
    subcategories: [
      { id: 'cosmetic-surgery', name: { en: 'Cosmetic Surgery', ar: 'جراحة تجميلية', fr: 'Chirurgie Esthétique' } },
      { id: 'derma-aesthetic', name: { en: 'Derma Aesthetic', ar: 'تجميل الجلد', fr: 'Derma Esthétique' } },
      { id: 'laser-treatment', name: { en: 'Laser Treatment', ar: 'علاج بالليزر', fr: 'Traitement Laser' } },
      { id: 'hair-transplant', name: { en: 'Hair Transplant', ar: 'زراعة الشعر', fr: 'Greffe de Cheveux' } },
    ]
  },
  {
    id: 'laboratories',
    name: { en: 'Laboratories', ar: 'المخابر', fr: 'Laboratoires' },
    icon: FlaskConical,
    subcategories: [
      { id: 'blood-test', name: { en: 'Blood Tests', ar: 'تحاليل الدم', fr: 'Analyses de Sang' } },
      { id: 'radiology', name: { en: 'Radiology', ar: 'أشعة وتصوير', fr: 'Radiologie' } },
      { id: 'pathology', name: { en: 'Pathology', ar: 'علم الأمراض', fr: 'Pathologie' } },
    ]
  },
  {
    id: 'pharmacies',
    name: { en: 'Pharmacies', ar: 'الصيدليات', fr: 'Pharmacies' },
    icon: Pill,
    subcategories: [
      { id: 'pharmacy', name: { en: 'Pharmacy', ar: 'صيدلية', fr: 'Pharmacie' } },
    ]
  },
  {
    id: 'ambulance',
    name: { en: 'Ambulance', ar: 'الإسعاف', fr: 'Ambulance' },
    icon: Ambulance,
    subcategories: [
      { id: 'emergency', name: { en: 'Emergency Transport', ar: 'نقل طوارئ', fr: 'Transport d\'Urgence' } },
      { id: 'medical-transport', name: { en: 'Medical Transport', ar: 'نقل طبي', fr: 'Transport Médical' } },
    ]
  }
]

const wilayas = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Algiers',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
  'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane'
]

const popularSymptoms = [
  { id: 'headache', name: { en: 'Headache', ar: 'صداع', fr: 'Mal de tête' } },
  { id: 'fever', name: { en: 'Fever', ar: 'حمى', fr: 'Fièvre' } },
  { id: 'cough', name: { en: 'Cough', ar: 'سعال', fr: 'Toux' } },
  { id: 'fatigue', name: { en: 'Fatigue', ar: 'إرهاق', fr: 'Fatigue' } },
  { id: 'nausea', name: { en: 'Nausea', ar: 'غثيان', fr: 'Nausée' } },
  { id: 'back-pain', name: { en: 'Back Pain', ar: 'ألم الظهر', fr: 'Mal de dos' } },
  { id: 'chest-pain', name: { en: 'Chest Pain', ar: 'ألم الصدر', fr: 'Douleur thoracique' } },
  { id: 'dizziness', name: { en: 'Dizziness', ar: 'دوخة', fr: 'Vertiges' } },
  { id: 'shortness-breath', name: { en: 'Shortness of Breath', ar: 'ضيق التنفس', fr: 'Essoufflement' } },
  { id: 'sore-throat', name: { en: 'Sore Throat', ar: 'التهاب الحلق', fr: 'Mal de gorge' } },
  { id: 'stomach-pain', name: { en: 'Stomach Pain', ar: 'ألم المعدة', fr: 'Mal au ventre' } },
  { id: 'joint-pain', name: { en: 'Joint Pain', ar: 'ألم المفاصل', fr: 'Douleur articulaire' } },
]

const generateTwoWeeksDates = () => {
  const dates = []
  const today = new Date()
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNameAr: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
      dayNameFr: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNumber: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  return dates
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

// ==================== COMPONENT ====================
export default function NewAppointmentPage() {
  const { language, dir } = useLanguage()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 7
  
  // Step 1: Business Type
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Step 2: Visit Type
  const [visitType, setVisitType] = useState<'office' | 'home' | 'online'>('office')
  
  // Step 3: Location & Provider
  const [useAutoLocation, setUseAutoLocation] = useState(true)
  const [selectedWilaya, setSelectedWilaya] = useState('Algiers')
  const [selectedCity, setSelectedCity] = useState('')
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(false)
  
  // Step 4: Condition
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [customSymptoms, setCustomSymptoms] = useState('')
  const [severity, setSeverity] = useState([50])
  const [durationNumber, setDurationNumber] = useState(1)
  const [durationPeriod, setDurationPeriod] = useState<'days' | 'weeks' | 'months' | 'years'>('days')
  const [hasPreviousTreatment, setHasPreviousTreatment] = useState(false)
  const [previousTreatment, setPreviousTreatment] = useState('')
  const [hasAllergies, setHasAllergies] = useState(false)
  const [allergies, setAllergies] = useState('')
  const [hasMedications, setHasMedications] = useState(false)
  const [currentMedications, setCurrentMedications] = useState('')
  const [hasMedicalHistory, setHasMedicalHistory] = useState(false)
  const [medicalHistory, setMedicalHistory] = useState('')
  
  // Step 5: Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  
  // Step 6: Date & Time
  const [availableDates] = useState(generateTwoWeeksDates())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  // Step 7: Patient Info
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingNumber, setBookingNumber] = useState('')
  
  // Load user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', user.id)
          .single()
        if (profile) {
          if (profile.full_name) setPatientName(profile.full_name)
          if (profile.email) setPatientEmail(profile.email)
          if (profile.phone) setPatientPhone(profile.phone)
        }
      }
    }
    fetchProfile()
  }, [])
  
  // Load providers
  useEffect(() => {
    if (!selectedCategory) return
    
    setLoadingProviders(true)
    
    // Sample providers for demo
    setTimeout(() => {
      setProviders([
        {
          id: '1', name: 'Dr. Ahmed Benali', nameAr: 'د. أحمد بن علي',
          specialty: selectedSubcategory || 'General', specialtyAr: 'عام',
          location: `${selectedCity || 'Centre'}, ${selectedWilaya}`,
          wilaya: selectedWilaya, city: selectedCity || 'Centre',
          rating: 4.8, reviews: 124, price: 2500,
          supportsEVisit: true, supportsInPerson: true, supportsHomeVisit: true, isFavorite: false
        },
        {
          id: '2', name: 'Dr. Fatima Mansouri', nameAr: 'د. فاطمة منصوري',
          specialty: selectedSubcategory || 'General', specialtyAr: 'عام',
          location: `Hydra, ${selectedWilaya}`,
          wilaya: selectedWilaya, city: 'Hydra',
          rating: 4.9, reviews: 89, price: 3000,
          supportsEVisit: true, supportsInPerson: true, supportsHomeVisit: false, isFavorite: true
        },
        {
          id: '3', name: 'Dr. Karim Boudiaf', nameAr: 'د. كريم بوضياف',
          specialty: selectedSubcategory || 'General', specialtyAr: 'عام',
          location: `Bab El Oued, ${selectedWilaya}`,
          wilaya: selectedWilaya, city: 'Bab El Oued',
          rating: 4.6, reviews: 67, price: 2000,
          supportsEVisit: false, supportsInPerson: true, supportsHomeVisit: true, isFavorite: false
        }
      ])
      setLoadingProviders(false)
    }, 500)
  }, [selectedCategory, selectedSubcategory, selectedWilaya, selectedCity])
  
  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }
  
  const getSeverityInfo = (value: number) => {
    if (value < 33) return { label: { en: 'Mild', ar: 'خفيف', fr: 'Léger' }, color: 'bg-green-500' }
    if (value < 66) return { label: { en: 'Moderate', ar: 'متوسط', fr: 'Modéré' }, color: 'bg-orange-500' }
    return { label: { en: 'Severe', ar: 'شديد', fr: 'Sévère' }, color: 'bg-red-500' }
  }
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const id = Math.random().toString(36).substring(7)
      const fileObj: UploadedFile = { id, name: file.name, size: file.size, type: file.type }
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          fileObj.preview = e.target?.result as string
          setUploadedFiles(prev => [...prev, fileObj])
        }
        reader.readAsDataURL(file)
      } else {
        setUploadedFiles(prev => [...prev, fileObj])
      }
    })
  }
  
  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedCategory && selectedSubcategory
      case 2: return visitType
      case 3: return selectedProvider
      case 4: return true
      case 5: return true
      case 6: return selectedDate && selectedTime
      case 7: return patientName && patientPhone && agreeToTerms && selectedPaymentMethod
      default: return false
    }
  }
  
  const handleSubmit = async () => {
    if (!canProceed()) return
    setIsProcessing(true)
    
    try {
      const bookingNum = `DZ${Date.now().toString().slice(-8)}`
      // In real app, save to database here
      await new Promise(resolve => setTimeout(resolve, 1500))
      setBookingNumber(bookingNum)
      setBookingComplete(true)
    } catch (error) {
      console.error('Booking error:', error)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const selectedProviderData = providers.find(p => p.id === selectedProvider)
  const filteredProviders = providers.filter(p => {
    if (showFavorites && !p.isFavorite) return false
    if (visitType === 'home' && !p.supportsHomeVisit) return false
    if (visitType === 'online' && !p.supportsEVisit) return false
    return true
  })
  
  // ==================== BOOKING COMPLETE ====================
  if (bookingComplete) {
    return (
      <div className={`min-h-screen bg-background ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
        <Header />
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-green-600">
                  {language === 'ar' ? 'تم تأكيد الحجز!' : language === 'fr' ? 'Réservation Confirmée!' : 'Booking Confirmed!'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {language === 'ar' ? 'تم حجز موعدك بنجاح' : language === 'fr' ? 'Votre rendez-vous a été réservé' : 'Your appointment has been booked'}
                </p>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ar' ? 'رقم الحجز' : language === 'fr' ? 'Numéro de réservation' : 'Booking Number'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold">{bookingNumber}</span>
                  <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(bookingNumber)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                  <div className="w-32 h-32 bg-muted rounded flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              {selectedProviderData && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Stethoscope className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{language === 'ar' ? selectedProviderData.nameAr : selectedProviderData.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedProviderData.specialty}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedTime}</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProviderData.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex flex-col gap-3">
                <Button onClick={() => router.push('/dashboard/appointments')}>
                  {language === 'ar' ? 'عرض التفاصيل' : language === 'fr' ? 'Voir les détails' : 'View Details'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  {language === 'ar' ? 'العودة للوحة التحكم' : language === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // ==================== MAIN RENDER ====================
  return (
    <div className={`min-h-screen bg-background ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
      <Header />
      
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {language === 'ar' ? `الخطوة ${currentStep} من ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>
        
        {/* STEP 1: Business Type */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'اختر نوع الخدمة' : language === 'fr' ? 'Type de service' : 'Select Service Type'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'حدد الفئة والتخصص' : language === 'fr' ? 'Sélectionnez la catégorie' : 'Choose category and specialty'}
              </p>
            </div>
            
            <div className="relative">
              <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${dir === 'rtl' ? 'pr-10' : 'pl-10'}`}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {businessCategories.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.id
                return (
                  <Card 
                    key={cat.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/10 dark:bg-primary/20' : 'hover:border-primary/50'
                    }`}
                    onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(null) }}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`font-medium text-sm ${isSelected ? 'text-primary' : ''}`}>
                        {cat.name[language as keyof typeof cat.name]}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {selectedCategory && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === 'ar' ? 'اختر التخصص' : language === 'fr' ? 'Spécialité' : 'Select Specialty'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-2 gap-2">
                      {businessCategories
                        .find(c => c.id === selectedCategory)
                        ?.subcategories
                        .filter(sub => !searchQuery || 
                          sub.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sub.name.ar.includes(searchQuery))
                        .map((sub) => (
                          <Button
                            key={sub.id}
                            variant={selectedSubcategory === sub.id ? 'default' : 'outline'}
                            className={`justify-start h-auto py-3 ${selectedSubcategory !== sub.id ? 'bg-transparent' : ''}`}
                            onClick={() => setSelectedSubcategory(sub.id)}
                          >
                            {selectedSubcategory === sub.id && <Check className="h-4 w-4 mr-2" />}
                            <span className="text-sm">{sub.name[language as keyof typeof sub.name]}</span>
                          </Button>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* STEP 2: Visit Type */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'نوع الزيارة' : language === 'fr' ? 'Type de visite' : 'Type of Visit'}
              </h2>
            </div>
            
            <div className="grid gap-4">
              {[
                { id: 'office', icon: Building, label: { en: 'In Office', ar: 'في العيادة', fr: 'Au Cabinet' }, desc: { en: 'Visit the provider\'s office', ar: 'زيارة عيادة الطبيب', fr: 'Visitez le cabinet' } },
                { id: 'home', icon: Home, label: { en: 'Home Visit', ar: 'زيارة منزلية', fr: 'Visite à Domicile' }, desc: { en: 'Provider comes to you', ar: 'الطبيب يأتي إليك', fr: 'Le médecin vient chez vous' } },
                { id: 'online', icon: Video, label: { en: 'Online / Video', ar: 'عبر الإنترنت', fr: 'En Ligne' }, desc: { en: 'Video consultation', ar: 'استشارة فيديو', fr: 'Consultation vidéo' } }
              ].map((type) => {
                const Icon = type.icon
                const isSelected = visitType === type.id
                return (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary bg-primary/10 dark:bg-primary/20' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setVisitType(type.id as any)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-muted'}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{type.label[language as keyof typeof type.label]}</h3>
                          <p className="text-sm text-muted-foreground">{type.desc[language as keyof typeof type.desc]}</p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        
        {/* STEP 3: Location & Provider */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'اختر مقدم الخدمة' : language === 'fr' ? 'Choisissez le prestataire' : 'Select Provider'}
              </h2>
            </div>
            
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Button 
                    variant={useAutoLocation ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseAutoLocation(true)}
                    className="gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    {language === 'ar' ? 'موقعي' : 'Auto-locate'}
                  </Button>
                  <Button 
                    variant={!useAutoLocation ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseAutoLocation(false)}
                    className="gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    {language === 'ar' ? 'اختيار يدوي' : 'Manual'}
                  </Button>
                </div>
                
                {!useAutoLocation && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'الولاية' : 'Wilaya'}</Label>
                      <select 
                        className="w-full p-2 rounded-md border bg-background"
                        value={selectedWilaya}
                        onChange={(e) => setSelectedWilaya(e.target.value)}
                      >
                        {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'المدينة' : 'City'}</Label>
                      <Input 
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        placeholder={language === 'ar' ? 'المدينة' : 'City'}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex items-center gap-2">
              <Button
                variant={showFavorites ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFavorites(!showFavorites)}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
                {language === 'ar' ? 'المفضلة' : 'Favorites'}
              </Button>
            </div>
            
            {loadingProviders ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" className="text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProviders.map((provider) => {
                  const isSelected = selectedProvider === provider.id
                  return (
                    <Card 
                      key={provider.id}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{language === 'ar' ? provider.nameAr : provider.name}</h3>
                                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {provider.isFavorite && <Heart className="h-4 w-4 text-red-500 fill-current" />}
                                {isSelected && <Check className="h-5 w-5 text-primary" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                {provider.rating}
                              </span>
                              <span className="text-muted-foreground">({provider.reviews})</span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {provider.location}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex gap-1">
                                {provider.supportsInPerson && <Badge variant="secondary" className="text-xs"><Building className="h-3 w-3 mr-1" />Office</Badge>}
                                {provider.supportsHomeVisit && <Badge variant="secondary" className="text-xs"><Home className="h-3 w-3 mr-1" />Home</Badge>}
                                {provider.supportsEVisit && <Badge variant="secondary" className="text-xs"><Video className="h-3 w-3 mr-1" />Online</Badge>}
                              </div>
                              <span className="font-bold text-primary">{provider.price} DZD</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
        
        {/* STEP 4: Condition */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'صف حالتك' : language === 'fr' ? 'Décrivez votre condition' : 'Describe Your Condition'}
              </h2>
              <p className="text-muted-foreground">{language === 'ar' ? '(اختياري)' : '(Optional)'}</p>
            </div>
            
            {/* Symptoms */}
            <Card>
              <CardHeader><CardTitle className="text-lg">{language === 'ar' ? 'الأعراض' : 'Symptoms'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {popularSymptoms.map((s) => (
                    <Badge
                      key={s.id}
                      variant={selectedSymptoms.includes(s.id) ? 'default' : 'outline'}
                      className={`cursor-pointer py-2 px-3 ${!selectedSymptoms.includes(s.id) ? 'bg-transparent hover:bg-muted' : ''}`}
                      onClick={() => toggleSymptom(s.id)}
                    >
                      {selectedSymptoms.includes(s.id) && <Check className="h-3 w-3 mr-1" />}
                      {s.name[language as keyof typeof s.name]}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  placeholder={language === 'ar' ? 'أعراض أخرى...' : 'Other symptoms...'}
                  value={customSymptoms}
                  onChange={(e) => setCustomSymptoms(e.target.value)}
                  rows={2}
                />
              </CardContent>
            </Card>
            
            {/* Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{language === 'ar' ? 'الشدة' : 'Severity'}</span>
                  <Badge className={getSeverityInfo(severity[0]).color}>
                    {language === 'ar' ? getSeverityInfo(severity[0]).label.ar : language === 'fr' ? getSeverityInfo(severity[0]).label.fr : getSeverityInfo(severity[0]).label.en}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Slider value={severity} onValueChange={setSeverity} max={100} step={1} />
                <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                  <span className="text-green-500">{language === 'ar' ? 'خفيف' : 'Mild'}</span>
                  <span className="text-orange-500">{language === 'ar' ? 'متوسط' : 'Moderate'}</span>
                  <span className="text-red-500">{language === 'ar' ? 'شديد' : 'Severe'}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Duration */}
            <Card>
              <CardHeader><CardTitle className="text-lg">{language === 'ar' ? 'المدة' : 'Duration'}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input type="number" min="1" value={durationNumber} onChange={(e) => setDurationNumber(parseInt(e.target.value) || 1)} className="w-24" />
                  <select className="flex-1 p-2 rounded-md border bg-background" value={durationPeriod} onChange={(e) => setDurationPeriod(e.target.value as any)}>
                    <option value="days">{language === 'ar' ? 'أيام' : 'Days'}</option>
                    <option value="weeks">{language === 'ar' ? 'أسابيع' : 'Weeks'}</option>
                    <option value="months">{language === 'ar' ? 'أشهر' : 'Months'}</option>
                    <option value="years">{language === 'ar' ? 'سنوات' : 'Years'}</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            
            {/* Yes/No Questions */}
            {[
              { has: hasPreviousTreatment, setHas: setHasPreviousTreatment, value: previousTreatment, setValue: setPreviousTreatment, label: { en: 'Previous Treatment?', ar: 'علاج سابق؟' } },
              { has: hasAllergies, setHas: setHasAllergies, value: allergies, setValue: setAllergies, label: { en: 'Allergies?', ar: 'حساسية؟' } },
              { has: hasMedications, setHas: setHasMedications, value: currentMedications, setValue: setCurrentMedications, label: { en: 'Current Medications?', ar: 'أدوية حالية؟' } },
              { has: hasMedicalHistory, setHas: setHasMedicalHistory, value: medicalHistory, setValue: setMedicalHistory, label: { en: 'Medical History?', ar: 'تاريخ طبي؟' } },
            ].map((q, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Label>{q.label[language as keyof typeof q.label]}</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={q.has ? 'default' : 'outline'} onClick={() => q.setHas(true)}>
                        {language === 'ar' ? 'نعم' : 'Yes'}
                      </Button>
                      <Button size="sm" variant={!q.has ? 'default' : 'outline'} onClick={() => q.setHas(false)}>
                        {language === 'ar' ? 'لا' : 'No'}
                      </Button>
                    </div>
                  </div>
                  {q.has && <Textarea className="mt-3" value={q.value} onChange={(e) => q.setValue(e.target.value)} />}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* STEP 5: Upload Files */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'رفع الملفات' : 'Upload Files'}
              </h2>
              <p className="text-muted-foreground">{language === 'ar' ? '(اختياري)' : '(Optional)'}</p>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">{language === 'ar' ? 'انقر للرفع' : 'Click to upload'}</p>
                  <p className="text-sm text-muted-foreground mt-1">PNG, JPG, PDF up to 10MB</p>
                  <input type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
                </label>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        {file.preview ? (
                          <img src={file.preview} alt={file.name} className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                            <File className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* STEP 6: Date & Time */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'اختر التاريخ والوقت' : 'Select Date & Time'}
              </h2>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5" />{language === 'ar' ? 'التاريخ' : 'Date'}</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {availableDates.map((date) => (
                      <div
                        key={date.date}
                        className={`flex-shrink-0 w-20 p-3 rounded-lg cursor-pointer text-center transition-all ${
                          selectedDate === date.date ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'
                        }`}
                        onClick={() => setSelectedDate(date.date)}
                      >
                        <p className="text-xs opacity-80">{language === 'ar' ? date.dayNameAr : date.dayName}</p>
                        <p className="text-2xl font-bold">{date.dayNumber}</p>
                        <p className="text-xs opacity-80">{date.month}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {selectedDate && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" />{language === 'ar' ? 'الوقت' : 'Time'}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {timeSlots.map((time) => (
                      <Button key={time} variant={selectedTime === time ? 'default' : 'outline'} className={selectedTime !== time ? 'bg-transparent' : ''} onClick={() => setSelectedTime(time)}>
                        {time}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* STEP 7: Confirm */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}
              </h2>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" />{language === 'ar' ? 'معلومات المريض' : 'Patient Information'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الاسم' : 'Name'} *</Label>
                    <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الهاتف' : 'Phone'} *</Label>
                    <PhoneInput value={patientPhone} onChange={setPatientPhone} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'البريد' : 'Email'}</Label>
                  <Input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />{language === 'ar' ? 'ملخص الحجز' : 'Summary'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedProviderData && (
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <Stethoscope className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{language === 'ar' ? selectedProviderData.nameAr : selectedProviderData.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedProviderData.specialty}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedProviderData.location}</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'نوع الزيارة' : 'Visit Type'}</span><span className="font-medium capitalize">{visitType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</span><span className="font-medium">{selectedDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'الوقت' : 'Time'}</span><span className="font-medium">{selectedTime}</span></div>
                </div>
                {selectedProviderData && (
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-semibold">{language === 'ar' ? 'المجموع' : 'Total'}</span>
                    <span className="text-2xl font-bold text-primary">{selectedProviderData.price} DZD</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" />{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</CardTitle></CardHeader>
              <CardContent>
                <PaymentMethodSelector amount={selectedProviderData?.price || 2000} onPaymentMethodSelect={setSelectedPaymentMethod} onProceed={() => {}} isLoading={false} />
              </CardContent>
            </Card>
            
            <div className="flex items-start gap-3">
              <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(c) => setAgreeToTerms(c as boolean)} />
              <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                {language === 'ar' ? 'أوافق على الشروط والأحكام' : 'I agree to the terms and conditions'}
              </Label>
            </div>
            
            <Button className="w-full h-12 text-lg" disabled={!canProceed() || isProcessing} onClick={handleSubmit}>
              {isProcessing ? <><LoadingSpinner size="md" className="me-2" />{language === 'ar' ? 'جاري...' : 'Processing...'}</> : <><Check className="h-5 w-5 me-2" />{language === 'ar' ? 'تأكيد الحجز' : 'Confirm Appointment'}</>}
            </Button>
          </div>
        )}
        
        {/* Navigation */}
        {currentStep < 7 && (
          <div className={`flex items-center justify-between mt-8 pt-6 border-t ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="gap-2 bg-transparent">
              {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {language === 'ar' ? 'السابق' : 'Previous'}
            </Button>
            <Button onClick={() => setCurrentStep(p => p + 1)} disabled={!canProceed()} className="gap-2">
              {language === 'ar' ? 'التالي' : 'Next'}
              {dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

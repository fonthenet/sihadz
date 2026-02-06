'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { 
  ArrowRight, ArrowLeft, Video, Building, Upload, X, Check,
  Calendar as CalendarIcon, Clock, Stethoscope, User, FileText, MapPin, Star,
  Home, Search, Building2, Sparkles, Pill,
  FlaskConical, Navigation, File, CreditCard, QrCode, Copy,
  ExternalLink, Map, Download, ChevronDown, Users, Baby, UserCircle, Plus, Minus, Info
} from 'lucide-react'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import Link from 'next/link'
import { PaymentMethodSelector, type PaymentMethodType } from '@/components/payment/payment-method-selector'
import { PainSeverityBar } from '@/components/ui/pain-severity-bar'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy calendar component to reduce initial bundle
const CalendarSlotPicker = dynamic(
  () => import('@/components/booking/calendar-slot-picker').then(m => ({ default: m.CalendarSlotPicker })),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />
  }
)
import { FavoriteButton, useFavorites } from '@/components/ui/favorite-button'
import { WILAYAS, getWilayaName, getCityName, getWilayaByCode } from '@/lib/data/algeria-locations'
import { useLocationWithProfileFallback } from '@/hooks/use-location-with-profile-fallback'
import { formatDateAlgeria } from '@/lib/date-algeria'
import type { AlgeriaLang } from '@/lib/date-algeria'

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
  distance?: number // Distance in KM
  isOpen?: boolean // Whether provider is currently open
  lat?: number // Latitude for map
  lng?: number // Longitude for map
  openingHours?: { open: string; close: string } // Opening hours
  autoConfirmAppointments?: boolean // Appointments confirmed automatically vs subject to practice confirmation
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
    id: 'nurses',
    name: { en: 'Nurses', ar: 'الممرضون', fr: 'Infirmiers' },
    icon: Stethoscope,
    subcategories: [
      { id: 'general', name: { en: 'General Care', ar: 'رعاية عامة', fr: 'Soins Généraux' } },
      { id: 'home-care', name: { en: 'Home Care', ar: 'رعاية منزلية', fr: 'Soins à Domicile' } },
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
  }
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

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

const stepLabels: { en: string; fr: string; ar: string }[] = [
  { en: 'Symptoms', fr: 'Symptômes', ar: 'الأعراض' },
  { en: 'Doctor', fr: 'Médecin', ar: 'الطبيب' },
  { en: 'Schedule', fr: 'Planifier', ar: 'الموعد' },
]

// ==================== COMPONENT ====================
export default function NewAppointmentPage() {
  const { language, dir } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [authChecked, setAuthChecked] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3 // Steps: 1-Symptoms(AI), 2-Specialty+Provider (merged), 3-Schedule → confirm page
  const [isQuickFlow, setIsQuickFlow] = useState(false) // Single-page mode when doctor pre-selected

  // Step 2: Business Type (moved from step 1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Step 2: Visit Type (part of category selection)
  const [visitType, setVisitType] = useState<'office' | 'home' | 'online'>('office')

  // Step 3: Location & Provider (moved from step 2)
  const [useAutoLocation, setUseAutoLocation] = useState(true)
  const [selectedWilaya, setSelectedWilaya] = useState('16') // Algiers
  const [selectedCity, setSelectedCity] = useState('')
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const locLang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [providerDetailOpen, setProviderDetailOpen] = useState(false)
  const [providerForDetail, setProviderForDetail] = useState<Provider | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [filterOpenOnly, setFilterOpenOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'best' | 'distance' | 'rating' | 'open'>('best')
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState<string | null>(null)
  const favoritesType = selectedCategory === 'doctors' ? 'doctor' : undefined
  const { isFavorite, toggleFavorite: updateFavoriteState, favoriteIds } = useFavorites(favoritesType)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 36.7538, lng: 3.0588 })
  const selectedProviderRef = useRef<HTMLDivElement>(null)

  // Step 1: Condition & Symptoms (NEW FIRST STEP - AI-powered)
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
  const [conditionDescription, setConditionDescription] = useState('')

  // AI Symptom Analysis (Step 1)
  const [aiSymptomText, setAiSymptomText] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    symptoms: Array<{ name: string; duration: string; severity: string }>;
    suggestedSpecialty: string;
    urgencyLevel: string;
    followUpQuestions: string[];
    redFlags: string[];
  } | null>(null)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)

  // Step 5: Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [fileDescription, setFileDescription] = useState('')

  // Step 6: Date & Time
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType | null>('cash')

  // Booking for family member(s) - multi-select supported
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([])
  const [bookingForSelf, setBookingForSelf] = useState(true)

  // Require auth: redirect to login if not signed in (preserve current URL for redirect after login)
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const search = searchParams.toString()
        const redirectPath = pathname + (search ? `?${search}` : '')
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`)
        return
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [pathname, searchParams, router])

  // Handle provider selection from URL (home page, profile page, search, etc.)
  // Pre-select provider/category/visit type but always start wizard from step 1
  useEffect(() => {
    if (!authChecked) return
    
    const doctorId = searchParams.get('doctor')
    const nurseId = searchParams.get('nurse')
    const clinicId = searchParams.get('clinic')
    const providerId = doctorId || nurseId || clinicId
    const dateParam = searchParams.get('date')
    const timeParam = searchParams.get('time')
    const typeParam = searchParams.get('type')
    
    if (providerId) {
      // Auto-select category based on provider type from URL
      const category = doctorId ? 'doctors' : nurseId ? 'nurses' : clinicId ? 'health-clinics' : 'doctors'
      setSelectedCategory(category)
      setSelectedSubcategory('general')
      
      // Pre-select the provider (will be validated when providers load)
      setSelectedProvider(providerId)
      
      // Set visit type based on URL param
      if (typeParam === 'e-visit') {
        setVisitType('online')
      } else if (typeParam === 'home-visit') {
        setVisitType('home')
      } else {
        setVisitType('office')
      }
      
      // Set date and time if provided (e.g. from doctor profile page)
      if (dateParam) {
        // Normalize to YYYY-MM-DD
        const parsed = dateParam.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
        const norm = parsed
          ? `${parsed[1]}-${parsed[2].padStart(2, '0')}-${parsed[3].padStart(2, '0')}`
          : dateParam
        setSelectedDate(norm)
      }
      if (timeParam) {
        // Normalize to HH:mm (e.g. 14:00)
        const match = timeParam.match(/^(\d{1,2}):(\d{0,2})/)
        const norm = match
          ? `${String(parseInt(match[1], 10)).padStart(2, '0')}:${(match[2] || '00').padStart(2, '0')}`
          : timeParam
        setSelectedTime(norm)
      }
      
      // Always start wizard from step 1 (Symptoms) - user goes through full flow
      setCurrentStep(1)
      setIsQuickFlow(false)
    }
  }, [authChecked, searchParams])

  // Profile fallback for location (address, wilaya, city)
  const [profileLocation, setProfileLocation] = useState<{ address?: string; default_wilaya_code?: string; default_city_id?: string } | null>(null)

  // Load user profile
  useEffect(() => {
    if (!authChecked) return
    const fetchProfile = async () => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone, address, default_wilaya_code, default_city_id')
          .eq('id', user.id)
          .single()
        if (profile) {
          if (profile.default_wilaya_code) setSelectedWilaya(profile.default_wilaya_code)
          if (profile.default_city_id) setSelectedCity(profile.default_city_id)
          setProfileLocation({
            address: profile.address,
            default_wilaya_code: profile.default_wilaya_code,
            default_city_id: profile.default_city_id,
          })
        }
      }
    }
    fetchProfile()
  }, [authChecked])

  // Load family members for "booking for" selection
  useEffect(() => {
    if (!authChecked) return
    const fetchFamilyMembers = async () => {
      try {
        const res = await fetch('/api/family-members')
        if (res.ok) {
          const data = await res.json()
          setFamilyMembers(data.members || [])
        }
      } catch (e) {
        console.error('Failed to fetch family members:', e)
      }
    }
    fetchFamilyMembers()
  }, [authChecked])

  // Location: "Near me" = geolocation; on deny → fallback to profile address (wilaya/city)
  const {
    coords: locationCoords,
    usedGeolocation,
    isLocating,
    locationError,
    requestLocation,
    fallbackWilayaCode,
    fallbackCityId,
  } = useLocationWithProfileFallback(useAutoLocation, profileLocation)

  // Sync userLocation from hook (when Near me) or from manual wilaya (when Wilaya mode)
  useEffect(() => {
    if (useAutoLocation) {
      setUserLocation(locationCoords)
    } else {
      const w = getWilayaByCode(selectedWilaya)
      if (w?.coordinates) setUserLocation({ lat: w.coordinates.lat, lng: w.coordinates.lng })
      else setUserLocation({ lat: 36.7538, lng: 3.0588 })
    }
  }, [useAutoLocation, locationCoords, selectedWilaya])

  // When geolocation denied and we fallback to profile, sync wilaya/city picker
  useEffect(() => {
    if (useAutoLocation && locationError && fallbackWilayaCode) {
      setSelectedWilaya(fallbackWilayaCode)
      if (fallbackCityId) setSelectedCity(fallbackCityId)
    }
  }, [useAutoLocation, locationError, fallbackWilayaCode, fallbackCityId])

  // Auto-select subcategory if category has only one
  useEffect(() => {
    if (selectedCategory) {
      const category = businessCategories.find(c => c.id === selectedCategory)
      if (category && category.subcategories.length === 1) {
        setSelectedSubcategory(category.subcategories[0].id)
      }
      // Don't clear subcategory here for multiple subcategories - let onClick handler manage it
    } else {
      setSelectedSubcategory(null)
    }
  }, [selectedCategory])

  // Visit type: always default office. Doctors and nurses get all 3; others get office only.
  useEffect(() => {
    const supportsAllVisitTypes = selectedCategory === 'doctors' || selectedCategory === 'nurses'
    if (!supportsAllVisitTypes && selectedCategory != null && visitType !== 'office') {
      setVisitType('office')
    }
  }, [selectedCategory, visitType])

  // Keep selectedCity in sync with selected wilaya (clear if not in wilaya's cities)
  useEffect(() => {
    const cities = getWilayaByCode(selectedWilaya)?.cities ?? []
    if (selectedCity && !cities.some((c) => c.id === selectedCity)) setSelectedCity('')
  }, [selectedWilaya, selectedCity])

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Check if provider is currently open
  const isProviderOpen = (openingHours?: { open: string; close: string }): boolean => {
    if (!openingHours) return true // Assume open if no hours specified
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    const openTime = parseInt(openingHours.open.replace(':', ''))
    const closeTime = parseInt(openingHours.close.replace(':', ''))
    return currentTime >= openTime && currentTime <= closeTime
  }

  // Parse working_hours JSON to get open/close times
  const parseWorkingHours = (wh: any): { open: string; close: string } | undefined => {
    if (!wh || typeof wh !== 'object') return undefined
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
    const todayHours = wh[today] || wh.weekdays
    if (!todayHours || !todayHours.open || !todayHours.close) return undefined
    return { open: todayHours.open, close: todayHours.close }
  }

  // Smart ranking: score providers for best fit based on symptoms, distance, availability
  const computeMatchScore = (p: Provider, aiSpec?: string, urgency?: string): number => {
    let score = 0
    const pSpec = (p.specialty || '').toLowerCase().replace(/[\s_-]/g, '')
    const selSpec = (aiSpec || selectedSubcategory || '').toLowerCase().replace(/[\s_-]/g, '')
    
    // Specialty match (0–40): exact > partial > general (doctors)
    if (selSpec && selectedCategory === 'doctors') {
      const generalMatch = ['general', 'generalpractitioner', 'gp'].includes(pSpec)
      if (pSpec === selSpec) score += 40
      else if (pSpec.includes(selSpec) || selSpec.includes(pSpec)) score += 28
      else if (generalMatch) score += 12
    } else {
      score += 20
    }
    
    // Distance (0–35): closer = better
    const dist = p.distance ?? 999
    const distScore = Math.max(0, 35 - dist * 2)
    const urgencyBoost = urgency === 'urgent' ? 1.5 : 1
    score += distScore * urgencyBoost
    
    // Open now (0–20): urgency makes open more important
    if (p.isOpen) score += urgency === 'urgent' ? 20 : 15
    
    // Rating (0–15)
    score += Math.min(15, (p.rating || 0) * 2)
    
    // Favorite +5
    if (p.isFavorite) score += 5
    
    return score
  }

  // Apply sort and filter to provider list
  // recentDoctorIds: doctors patient has visited, ordered by most recent first (for "best" default sort)
  const applySortAndFilter = (list: Provider[], recentDoctorIds: string[] = []): Provider[] => {
    let result = [...list]
    if (filterOpenOnly) result = result.filter(p => p.isOpen)
    const recentIndex = (id: string) => {
      const i = recentDoctorIds.indexOf(id)
      return i === -1 ? Infinity : i
    }
    result.sort((a, b) => {
      if (sortBy === 'distance') return (a.distance ?? 999) - (b.distance ?? 999)
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'open') {
        if (a.isOpen && !b.isOpen) return -1
        if (!a.isOpen && b.isOpen) return 1
      }
      // best (default): recent visited > favorites > open > distance > rating
      const aRecent = recentIndex(a.id)
      const bRecent = recentIndex(b.id)
      if (aRecent !== bRecent) return aRecent - bRecent
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      if (a.isOpen && !b.isOpen) return -1
      if (!a.isOpen && b.isOpen) return 1
      if ((a.distance ?? 999) !== (b.distance ?? 999)) return (a.distance ?? 999) - (b.distance ?? 999)
      return b.rating - a.rating
    })
    return result
  }

  // Load providers from database or fallback to sample
  useEffect(() => {
    if (!selectedCategory) return
    
    setLoadingProviders(true)
    
    const loadProviders = async () => {
      const w = getWilayaByCode(selectedWilaya)
      const cityObj = selectedCity ? w?.cities.find((c) => c.id === selectedCity) : null
      const wilayaDisplay = w ? getWilayaName(w, locLang) : selectedWilaya
      const cityDisplay = cityObj ? getCityName(cityObj, locLang) : (language === 'ar' ? 'المركز' : 'Centre')
      const supabase = createBrowserClient()
      
      // Check if we have a provider ID from URL params
      const doctorIdFromUrl = searchParams.get('doctor')
      
      // Load only from database – no fake/sample providers
      if (selectedCategory === 'doctors') {
        // Fetch recent visited doctor IDs (most recent first) for default sorting
        let recentDoctorIds: string[] = []
        try {
          const apptRes = await fetch('/api/appointments/list?lang=en', { credentials: 'include', cache: 'no-store' })
          if (apptRes.ok) {
            const { appointments } = await apptRes.json()
            const seen = new Set<string>()
            for (const apt of appointments || []) {
              const id = apt?.rawData?.doctor_id ?? apt?.rawData?.professional_id
              if (id && !seen.has(id)) {
                seen.add(id)
                recentDoctorIds.push(id)
              }
            }
          }
        } catch (_) { /* ignore */ }

        // Load all active doctors (we'll auto-select the one from URL if provided)
        let pros: any[] = []
        let error: any = null

        // When doctor is pre-selected from URL, fetch that doctor first to ensure they're in the list
        if (doctorIdFromUrl) {
          const { data: singleDoctor, error: singleErr } = await supabase
            .from('professionals')
            .select('id, business_name, business_name_ar, email, specialties, specialty, specialty_ar, wilaya, commune, address_line1, latitude, longitude, rating, review_count, working_hours, is_active, status, supports_e_visit, supports_in_person, supports_home_visit, consultation_fee, e_visit_fee, auto_confirm_appointments')
            .eq('id', doctorIdFromUrl)
            .eq('type', 'doctor')
            .eq('is_active', true)
            .maybeSingle()
          if (!singleErr && singleDoctor) {
            pros = [singleDoctor]
          }
        }

        // Fetch main list (exclude pre-selected doctor if already fetched to avoid duplicates)
        const { data: mainPros, error: mainErr } = await supabase
          .from('professionals')
          .select('id, business_name, business_name_ar, email, specialties, specialty, specialty_ar, wilaya, commune, address_line1, latitude, longitude, rating, review_count, working_hours, is_active, status, supports_e_visit, supports_in_person, supports_home_visit, consultation_fee, e_visit_fee, auto_confirm_appointments')
          .eq('type', 'doctor')
          .eq('is_active', true)
          .limit(doctorIdFromUrl ? 99 : 100)
        
        if (!mainErr && mainPros && mainPros.length > 0) {
          const existingIds = new Set(pros.map((p: any) => p.id))
          for (const p of mainPros) {
            if (!existingIds.has(p.id)) {
              pros.push(p)
              existingIds.add(p.id)
            }
          }
        }
        error = mainErr

        console.log('[booking] Fetched doctors:', pros?.length, 'error:', error, 'doctorIdFromUrl:', doctorIdFromUrl)

        if (!error && pros && pros.length > 0) {
          const baseProviders: Provider[] = pros.map((p: any) => {
            const specialty = p.specialty || (Array.isArray(p.specialties) && p.specialties.length > 0 ? p.specialties[0] : 'General')
            return {
            id: p.id,
            name: p.business_name || 'Doctor',
            nameAr: p.business_name_ar || p.business_name || 'طبيب',
            specialty: specialty || selectedSubcategory || 'General',
            specialtyAr: p.specialty_ar || specialty || 'عام',
            location: [p.commune, p.wilaya].filter(Boolean).join(', ') || p.address_line1 || `${cityDisplay}, ${wilayaDisplay}`,
            wilaya: p.wilaya || wilayaDisplay,
            city: p.commune || (selectedCity ? cityDisplay : ''),
            rating: Number(p.rating) || 4.5,
            reviews: Number(p.review_count) || 0,
            price: Number(p.consultation_fee) || 2500,
            supportsEVisit: p.supports_e_visit ?? true,
            supportsInPerson: p.supports_in_person ?? true,
            supportsHomeVisit: p.supports_home_visit ?? false,
            isFavorite: isFavorite(p.id),
            lat: p.latitude ? Number(p.latitude) : 36.7538 + (Math.random() - 0.5) * 0.02,
            lng: p.longitude ? Number(p.longitude) : 3.0588 + (Math.random() - 0.5) * 0.02,
            openingHours: parseWorkingHours(p.working_hours),
            autoConfirmAppointments: !!(p as { auto_confirm_appointments?: boolean }).auto_confirm_appointments,
          }
          })

          const providersWithDistance = baseProviders.map(provider => {
            const distance = provider.lat && provider.lng
              ? calculateDistance(userLocation.lat, userLocation.lng, provider.lat, provider.lng)
              : 0
            const isOpen = isProviderOpen(provider.openingHours)
            return { ...provider, distance, isOpen }
          })

          // Default sort: recent visited first, then favorites, then rest
          let sortedProviders = applySortAndFilter(providersWithDistance, recentDoctorIds)
          
          if (doctorIdFromUrl) {
            const doctorProvider = sortedProviders.find(p => p.id === doctorIdFromUrl)
            if (doctorProvider) {
              // Move selected doctor to the top of the list for visibility
              sortedProviders = [
                doctorProvider,
                ...sortedProviders.filter(p => p.id !== doctorIdFromUrl)
              ]
            }
          }
          
          setProviders(sortedProviders)
        } else {
          setProviders([])
        }
        setLoadingProviders(false)
        return
      }

      // Nurses: load from professionals
      if (selectedCategory === 'nurses') {
        const nurseIdFromUrl = searchParams.get('nurse')
        let pros: any[] = []
        if (nurseIdFromUrl) {
          const { data: singleNurse, error: singleErr } = await supabase
            .from('professionals')
            .select('id, business_name, business_name_ar, email, specialty, specialty_ar, wilaya, commune, address_line1, latitude, longitude, rating, review_count, working_hours, is_active, status, supports_e_visit, supports_in_person, supports_home_visit, consultation_fee, e_visit_fee, auto_confirm_appointments')
            .eq('id', nurseIdFromUrl)
            .eq('type', 'nurse')
            .eq('is_active', true)
            .maybeSingle()
          if (!singleErr && singleNurse) pros = [singleNurse]
        }
        const { data: mainPros, error: mainErr } = await supabase
          .from('professionals')
          .select('id, business_name, business_name_ar, email, specialty, specialty_ar, wilaya, commune, address_line1, latitude, longitude, rating, review_count, working_hours, is_active, status, supports_e_visit, supports_in_person, supports_home_visit, consultation_fee, e_visit_fee, auto_confirm_appointments')
          .eq('type', 'nurse')
          .eq('is_active', true)
          .limit(nurseIdFromUrl ? 99 : 100)
        if (!mainErr && mainPros?.length) {
          const existingIds = new Set(pros.map((p: any) => p.id))
          for (const p of mainPros) {
            if (!existingIds.has(p.id)) { pros.push(p); existingIds.add(p.id) }
          }
        }
        if (pros.length > 0) {
          const baseProviders: Provider[] = pros.map((p: any) => {
            const specialty = p.specialty || 'General'
            return {
              id: p.id,
              name: p.business_name || 'Nurse',
              nameAr: p.business_name_ar || p.business_name || 'ممرض',
              specialty,
              specialtyAr: p.specialty_ar || specialty,
              location: [p.commune, p.wilaya].filter(Boolean).join(', ') || p.address_line1 || `${cityDisplay}, ${wilayaDisplay}`,
              wilaya: p.wilaya || wilayaDisplay,
              city: p.commune || (selectedCity ? cityDisplay : ''),
              rating: Number(p.rating) || 4.5,
              reviews: Number(p.review_count) || 0,
              price: Number(p.consultation_fee) || 2500,
              supportsEVisit: p.supports_e_visit ?? true,
              supportsInPerson: p.supports_in_person ?? true,
              supportsHomeVisit: p.supports_home_visit ?? false,
              isFavorite: false,
              lat: p.latitude ? Number(p.latitude) : 36.7538 + (Math.random() - 0.5) * 0.02,
              lng: p.longitude ? Number(p.longitude) : 3.0588 + (Math.random() - 0.5) * 0.02,
              openingHours: parseWorkingHours(p.working_hours),
              autoConfirmAppointments: !!(p as { auto_confirm_appointments?: boolean }).auto_confirm_appointments,
            }
          })
          const providersWithDistance = baseProviders.map(provider => {
            const distance = provider.lat && provider.lng ? calculateDistance(userLocation.lat, userLocation.lng, provider.lat, provider.lng) : 0
            const isOpen = isProviderOpen(provider.openingHours)
            return { ...provider, distance, isOpen }
          })
          let sorted = applySortAndFilter(providersWithDistance)
          if (nurseIdFromUrl) {
            const nurseProvider = sorted.find(p => p.id === nurseIdFromUrl)
            if (nurseProvider) sorted = [nurseProvider, ...sorted.filter(p => p.id !== nurseIdFromUrl)]
          }
          setProviders(sorted)
        } else {
          setProviders([])
        }
        setLoadingProviders(false)
        return
      }

      // Clinics, laboratories, pharmacies: load from professionals (no fake data)
      const typeByCategory: Record<string, string> = {
        'health-clinics': 'clinic',
        'beauty-clinics': 'clinic',
        'laboratories': 'laboratory',
        'pharmacies': 'pharmacy',
      }
      const proType = typeByCategory[selectedCategory]
      const clinicIdFromUrl = searchParams.get('clinic')
      if (proType) {
        let pros: any[] = []
        if (proType === 'clinic' && clinicIdFromUrl) {
          const { data: singleClinic, error: singleErr } = await supabase
            .from('professionals')
            .select('id, business_name, business_name_ar, email, specialties, wilaya, commune, address_line1, latitude, longitude, rating, review_count, working_hours, is_active, status')
            .eq('id', clinicIdFromUrl)
            .eq('type', 'clinic')
            .eq('is_active', true)
            .maybeSingle()
          if (!singleErr && singleClinic) pros = [singleClinic]
        }
        const { data: mainPros, error } = await supabase
          .from('professionals')
          .select('id, business_name, business_name_ar, email, specialties, wilaya, commune, address_line1, latitude, longitude, rating, review_count, working_hours, is_active, status')
          .eq('type', proType)
          .eq('is_active', true)
          .limit(clinicIdFromUrl ? 99 : 100)
        if (!error && mainPros?.length) {
          const existingIds = new Set(pros.map((p: any) => p.id))
          for (const p of mainPros) {
            if (!existingIds.has(p.id)) { pros.push(p); existingIds.add(p.id) }
          }
        }
        console.log('[booking] Fetched', proType + ':', pros?.length)
        if (pros.length > 0) {
          const baseProviders: Provider[] = pros.map((p: any) => {
            const specialty = Array.isArray(p.specialties) && p.specialties.length > 0 ? p.specialties[0] : ''
            return {
            id: p.id,
            name: p.business_name || 'Provider',
            nameAr: p.business_name_ar || p.business_name || 'مزود',
            specialty: specialty || selectedSubcategory || '',
            specialtyAr: specialty || '',
            location: [p.commune, p.wilaya].filter(Boolean).join(', ') || p.address_line1 || `${cityDisplay}, ${wilayaDisplay}`,
            wilaya: p.wilaya || wilayaDisplay,
            city: p.commune || (selectedCity ? cityDisplay : ''),
            rating: Number(p.rating) || 4.5,
            reviews: Number(p.review_count) || 0,
            price: 0,
            supportsEVisit: false,
            supportsInPerson: true,
            supportsHomeVisit: false,
            isFavorite: false,
            lat: p.latitude ? Number(p.latitude) : 36.7538 + (Math.random() - 0.5) * 0.02,
            lng: p.longitude ? Number(p.longitude) : 3.0588 + (Math.random() - 0.5) * 0.02,
            openingHours: parseWorkingHours(p.working_hours)
          }
          })
          const providersWithDistance = baseProviders.map(provider => {
            const distance = provider.lat && provider.lng
              ? calculateDistance(userLocation.lat, userLocation.lng, provider.lat, provider.lng)
              : 0
            const isOpen = isProviderOpen(provider.openingHours)
            return { ...provider, distance, isOpen }
          })
          let sorted = applySortAndFilter(providersWithDistance)
          if (clinicIdFromUrl) {
            const clinicProvider = sorted.find(p => p.id === clinicIdFromUrl)
            if (clinicProvider) sorted = [clinicProvider, ...sorted.filter(p => p.id !== clinicIdFromUrl)]
          }
          setProviders(sorted)
        } else {
          setProviders([])
        }
      } else {
        setProviders([])
      }
      setLoadingProviders(false)
    }

    loadProviders()
  }, [selectedCategory, selectedSubcategory, selectedWilaya, selectedCity, userLocation, sortBy, filterOpenOnly, language, searchParams, favoriteIds])

  // Auto-select provider from URL params when providers are loaded and we're on step 2
  useEffect(() => {
    const doctorIdFromUrl = searchParams.get('doctor')
    const nurseIdFromUrl = searchParams.get('nurse')
    const clinicIdFromUrl = searchParams.get('clinic')
    const providerIdFromUrl = doctorIdFromUrl || nurseIdFromUrl || clinicIdFromUrl
    if (providerIdFromUrl && currentStep === 2 && providers.length > 0 && !selectedProvider) {
      const provider = providers.find(p => p.id === providerIdFromUrl)
      if (provider) {
        setSelectedProvider(providerIdFromUrl)
        console.log('[booking] Auto-selected provider from URL:', provider.name)
      }
    }
  }, [currentStep, providers, searchParams, selectedProvider])

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  // Scroll to selected provider when it's auto-selected from URL
  useEffect(() => {
    if (currentStep === 2 && selectedProvider && selectedProviderRef.current) {
      setTimeout(() => {
        selectedProviderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [currentStep, selectedProvider])

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // AI Symptom Analysis
  const analyzeSymptoms = useCallback(async () => {
    if (!aiSymptomText.trim() || aiSymptomText.length < 10) return
    
    setAiAnalyzing(true)
    setShowAiSuggestions(false)
    
    try {
      const res = await fetch('/api/ai/extract-symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeText: aiSymptomText,
          language: language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en',
        }),
      })
      
      const data = await res.json()
      
      if (res.ok && data.success && data.data) {
        setAiSuggestions(data.data)
        setShowAiSuggestions(true)
        
        // Auto-populate condition description if empty
        if (!conditionDescription.trim()) {
          const symptomsText = data.data.symptoms
            ?.map((s: any) => {
              const suffix = [s.duration, s.severity].filter(Boolean).join(', ')
              return suffix ? `${s.name} (${suffix})` : s.name
            })
            .join(', ')
          if (symptomsText) {
            setConditionDescription(symptomsText)
          }
        }
        
        // Auto-select specialty based on AI suggestion
        if (data.data.suggestedSpecialty) {
          const specialty = data.data.suggestedSpecialty.toLowerCase().replace(/_/g, '')
          // Map AI specialty to our subcategory IDs
          const specialtyMap: Record<string, string> = {
            'generalpractice': 'general',
            'general': 'general',
            'cardiology': 'cardiologist',
            'neurology': 'neurologist',
            'dermatology': 'dermatologist',
            'orthopedics': 'orthopedic',
            'gastroenterology': 'general', // Map to general if not specific
            'pulmonology': 'general',
            'endocrinology': 'general',
            'psychiatry': 'psychiatrist',
            'ophthalmology': 'ophthalmologist',
            'ent': 'ent',
            'urology': 'urologist',
            'gynecology': 'gynecologist',
            'pediatrics': 'pediatrician',
          }
          const mappedSpecialty = specialtyMap[specialty] || 'general'
          setSelectedCategory('doctors')
          setSelectedSubcategory(mappedSpecialty)
          setVisitType(data.data.suggestedVisitType === 'online' ? 'online' : data.data.suggestedVisitType === 'home_visit' ? 'home' : 'office')
        }
      } else {
        console.warn('[AI] Analysis failed:', data.error)
      }
    } catch (err) {
      console.error('[AI] Analysis error:', err)
    } finally {
      setAiAnalyzing(false)
    }
  }, [aiSymptomText, language, conditionDescription, setSelectedCategory, setSelectedSubcategory, setVisitType])

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
      case 1: return true // Condition & Symptoms (optional, but AI enhances it)
      case 2: return selectedCategory && selectedSubcategory && visitType && selectedProvider // Specialty + Provider (merged)
      case 3: return selectedDate && selectedTime && (bookingForSelf || selectedFamilyMembers.length > 0) // Schedule — who + when
      default: return false
    }
  }

  // Redirect to confirm page to pay and persist (single source of truth for DB)
  const goToConfirm = () => {
    if (!selectedProvider || !selectedDate || !selectedTime) return
    const params = new URLSearchParams({
      doctor: selectedProvider,
      day: selectedDate,
      time: selectedTime,
      price: String(selectedProviderData?.price ?? 0),
      visitType,
    })
    // Build notes for doctor: condition + medical history + AI symptom data
    const noteParts: string[] = []
    if (conditionDescription?.trim() || customSymptoms?.trim()) {
      noteParts.push([conditionDescription?.trim(), customSymptoms?.trim()].filter(Boolean).join('\n'))
    }
    // Medical history (allergies, previous treatment, medications, chronic conditions)
    const medicalParts: string[] = []
    if (hasAllergies && allergies?.trim()) medicalParts.push(`Allergies: ${allergies.trim()}`)
    if (hasPreviousTreatment && previousTreatment?.trim()) medicalParts.push(`Previous treatment: ${previousTreatment.trim()}`)
    if (hasMedications && currentMedications?.trim()) medicalParts.push(`Current medications: ${currentMedications.trim()}`)
    if (hasMedicalHistory && medicalHistory?.trim()) medicalParts.push(`Medical history: ${medicalHistory.trim()}`)
    if (medicalParts.length) noteParts.push(medicalParts.join('\n'))
    // Family member context when booking for one or more family members
    if (!bookingForSelf && selectedFamilyMembers.length > 0) {
      const memberPartsAll: string[] = []
      selectedFamilyMembers.forEach((id) => {
        const member = familyMembers.find(m => m.id === id)
        if (member) {
          const memberParts: string[] = []
          memberParts.push(member.full_name)
          if (member.gender) memberParts.push(member.gender === 'male' ? 'Male' : 'Female')
          if (member.date_of_birth) {
            const dob = new Date(member.date_of_birth)
            const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365))
            memberParts.push(`${age} yrs`)
          }
          if (member.blood_type) memberParts.push(member.blood_type)
          if (member.allergies && Array.isArray(member.allergies) && member.allergies.length > 0) {
            const allergyList = member.allergies.map((a: any) => typeof a === 'string' ? a : a.name).join(', ')
            memberParts.push(`Allergies: ${allergyList}`)
          }
          if (memberParts.length) memberPartsAll.push('[Patient] ' + memberParts.join(' • '))
        }
      })
      if (memberPartsAll.length) noteParts.push(memberPartsAll.join('\n'))
    }
    if (aiSuggestions) {
      const aiParts: string[] = []
      if (aiSuggestions.symptoms?.length) {
        aiParts.push('AI Symptoms: ' + aiSuggestions.symptoms.map((s: any) => s.duration ? `${s.name} (${s.duration})` : s.name).join(', '))
      }
      if (aiSuggestions.suggestedSpecialty) aiParts.push(`Suggested specialty: ${aiSuggestions.suggestedSpecialty}`)
      if (aiSuggestions.urgencyLevel) aiParts.push(`Urgency: ${aiSuggestions.urgencyLevel}`)
      if (aiSuggestions.followUpQuestions?.length) {
        aiParts.push('Questions to consider: ' + aiSuggestions.followUpQuestions.slice(0, 3).join(' | '))
      }
      if (aiParts.length) noteParts.push('[AI] ' + aiParts.join('\n'))
    }
    if (noteParts.length) params.set('notes', noteParts.join('\n\n'))
    if (selectedProviderData?.name) params.set('doctorName', selectedProviderData.name)
    if (selectedProviderData?.specialty) params.set('doctorSpecialty', selectedProviderData.specialty)
    if (selectedPaymentMethod) params.set('method', selectedPaymentMethod)
    // Family member booking (supports multiple)
    if (!bookingForSelf && selectedFamilyMembers.length > 0) {
      params.set('familyMemberIds', selectedFamilyMembers.join(','))
      const names = selectedFamilyMembers.map(id => familyMembers.find(m => m.id === id)?.full_name).filter(Boolean)
      if (names.length) params.set('bookingForNames', names.join(','))
    }
    router.push(`/booking/confirm?${params.toString()}`)
  }

  const selectedProviderData = providers.find(p => p.id === selectedProvider)

  // Pre-filter by specialty, visit type, wilaya
  const filteredProviders = providers.filter(p => {
    if (showFavorites && !isFavorite(p.id)) return false
    if (visitType === 'home' && !p.supportsHomeVisit) return false
    if (visitType === 'online' && !p.supportsEVisit) return false
    if (visitType === 'office' && !p.supportsInPerson) return false
    // Filter by specialty (match selectedSubcategory)
    if (selectedSubcategory && (selectedCategory === 'doctors' || selectedCategory === 'nurses')) {
      const pSpec = (p.specialty || '').toLowerCase().replace(/[\s_-]/g, '')
      const selSpec = selectedSubcategory.toLowerCase().replace(/[\s_-]/g, '')
      const generalMatch = ['general', 'generalpractitioner', 'gp', 'medecingeneral'].includes(pSpec)
      if (selSpec === 'general') return true // General matches all
      if (generalMatch) return true // General practitioners match any specialty
      if (!pSpec.includes(selSpec) && !selSpec.includes(pSpec)) return false
    }
    // Filter by wilaya (when user selected a specific wilaya)
    if (selectedWilaya && !useAutoLocation) {
      const w = getWilayaByCode(selectedWilaya)
      const pWilaya = (p.wilaya || '').toString().toLowerCase()
      if (!pWilaya) return true // No provider wilaya = include
      const matchCode = pWilaya === selectedWilaya.toLowerCase()
      const matchName = w && (pWilaya.includes((w.nameEn || '').toLowerCase()) || pWilaya.includes((w.nameAr || '')))
      if (!matchCode && !matchName) return false
    }
    return true
  })

  // Smart ranking: when AI suggested specialty, sort by best fit (specialty match + distance + open + rating)
  const rankedProviders = useMemo(() => {
    const list = [...filteredProviders]
    if (aiSuggestions && selectedCategory === 'doctors') {
      list.sort((a, b) => {
        const scoreA = computeMatchScore(a, selectedSubcategory || undefined, aiSuggestions.urgencyLevel)
        const scoreB = computeMatchScore(b, selectedSubcategory || undefined, aiSuggestions.urgencyLevel)
        return scoreB - scoreA
      })
      return list
    }
    // Fallback: respect user's sort preference
    if (sortBy === 'distance') return list.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
    if (sortBy === 'rating') return list.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'open') return list.sort((a, b) => (a.isOpen ? 0 : 1) - (b.isOpen ? 0 : 1))
    return list
  }, [filteredProviders, aiSuggestions, selectedCategory, selectedSubcategory, sortBy])

  // Show loading until auth is checked (avoids flash before redirect to login)
  if (!authChecked) {
    return (
      <SectionLoading
        minHeight="min-h-screen"
        label={language === 'ar' ? 'جاري التحقق...' : language === 'fr' ? 'Vérification...' : 'Checking...'}
      />
    )
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className={`w-full min-h-screen bg-background ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
      <div className="w-full max-w-none mx-auto px-2 sm:px-3 pt-1 sm:pt-2 pb-8 sm:pb-12">
        {/* Compact step indicator: 1 — 2 — 3 with connector line */}
        <div className="mb-2">
          <div className="flex items-center justify-center gap-1 sm:gap-2" dir="ltr" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Step ${currentStep} of ${totalSteps}`}>
            {[1, 2, 3].map((stepNum) => {
              const isCurrent = currentStep === stepNum
              const isPast = currentStep > stepNum
              const langKey = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
              const labelText = stepLabels[stepNum - 1][langKey]
              const stepEl = (
                <>
                  <span
                    className={`flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background scale-110'
                        : isPast
                          ? 'bg-primary/20 text-primary dark:bg-primary/30'
                          : 'bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {isPast ? <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.5} /> : stepNum}
                  </span>
                  <span className="sr-only">{labelText}</span>
                </>
              )
              return (
                <React.Fragment key={stepNum}>
                  {stepNum > 1 && (
                    <div
                      className={`h-px w-4 sm:w-6 shrink-0 rounded-full transition-colors ${
                        isPast ? 'bg-primary/40' : 'bg-border'
                      }`}
                      aria-hidden
                    />
                  )}
                  {isPast ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(stepNum)}
                      className="flex items-center gap-1 rounded-md p-0.5 -m-0.5 hover:bg-primary/10 transition-colors touch-target"
                      aria-label={`${labelText} (completed)`}
                    >
                      {stepEl}
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-1"
                      {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
                    >
                      {stepEl}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-1">
            {stepLabels[currentStep - 1][language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en']}
          </p>
        </div>
        
        {/* QUICK FLOW: Single-page layout when doctor is pre-selected */}
        {isQuickFlow && selectedProvider && (
          <div className="space-y-4">
            {/* Header with provider info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-emerald-500/10 border border-primary/20 dark:border-emerald-400/20">
              <div className="h-10 w-10 rounded-full bg-primary/20 dark:bg-emerald-500/20 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-primary dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg">
                  {language === 'ar' ? 'حجز موعد مع' : language === 'fr' ? 'Réserver avec' : 'Book with'} {selectedProviderData?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedProviderData?.specialty} • {visitType === 'office' ? (language === 'ar' ? 'في العيادة' : 'In Office') : visitType === 'online' ? (language === 'ar' ? 'فيديو' : 'Video') : (language === 'ar' ? 'منزل' : 'Home')}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setIsQuickFlow(false); setCurrentStep(1) }}
                className="text-muted-foreground text-xs"
              >
                {language === 'ar' ? 'تغيير' : 'Change'}
              </Button>
            </div>
            
            {/* Who is this appointment for? */}
            <Card className="gap-4 py-4">
              <CardHeader className="py-3 pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {language === 'ar' ? 'لمن هذا الموعد؟' : language === 'fr' ? 'Pour qui est ce rendez-vous ?' : 'Who is this appointment for?'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setBookingForSelf(true); setSelectedFamilyMembers([]) }}
                    className={`inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border-2 transition-all min-h-[44px] touch-target ${
                      bookingForSelf ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>{language === 'ar' ? 'لنفسي' : language === 'fr' ? 'Pour moi' : 'Myself'}</span>
                  </button>
                  {familyMembers.map((member) => {
                    const isChild = member.relationship === 'child'
                    const isElderly = member.relationship === 'parent' || member.relationship === 'grandparent'
                    const Icon = isChild ? Baby : isElderly ? UserCircle : User
                    const isSelected = selectedFamilyMembers.includes(member.id)
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setBookingForSelf(false)
                          setSelectedFamilyMembers(prev =>
                            prev.includes(member.id) ? prev.filter(id => id !== member.id) : [...prev, member.id]
                          )
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border-2 transition-all min-h-[44px] touch-target ${
                          isSelected ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate max-w-[120px]">{member.full_name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        {isChild && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{language === 'ar' ? 'طفل' : 'Child'}</Badge>}
                      </button>
                    )
                  })}
                  <Link href="/family" className="inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all min-h-[44px] touch-target">
                    <Plus className="h-4 w-4" />
                    <span>{language === 'ar' ? 'إضافة فرد' : language === 'fr' ? 'Ajouter' : 'Add member'}</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card className="overflow-hidden">
              <CardContent className="pt-5">
                <CalendarSlotPicker
                  professionalId={selectedProvider}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={setSelectedDate}
                  onSelectTime={setSelectedTime}
                  slotDuration={30}
                  lang={language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'}
                  providerName={selectedProviderData?.name}
                  providerSpecialty={selectedProviderData?.specialty}
                />
              </CardContent>
            </Card>
            
            {/* Section 3: Summary + Action */}
            <Card className={selectedDate && selectedTime ? "border-primary/30 dark:border-emerald-400/30" : ""}>
              <CardContent className="p-4">
                {selectedDate && selectedTime ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">{language === 'ar' ? 'موعدك' : 'Your appointment'}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDate} • {selectedTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary dark:text-emerald-400">
                          {selectedProviderData?.price || 0} DZD
                        </p>
                      </div>
                    </div>
                    <div className={`flex gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Button 
                        variant="outline" 
                        onClick={() => { setIsQuickFlow(false); setCurrentStep(1) }}
                        className="gap-2"
                      >
                        {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                        {language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Back'}
                      </Button>
                      <Button onClick={goToConfirm} className="flex-1 gap-2" size="lg">
                        {language === 'ar' ? 'متابعة إلى الدفع' : language === 'fr' ? 'Continuer vers le paiement' : 'Continue to Payment'}
                        {dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Button 
                      variant="outline" 
                      onClick={() => { setIsQuickFlow(false); setCurrentStep(1) }}
                      className="gap-2"
                    >
                      {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                      {language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Back'}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'اختر التاريخ والوقت للمتابعة' : language === 'fr' ? 'Sélectionnez date et heure' : 'Select date & time to continue'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Regular step-by-step flow (hidden when quick flow is active) */}
        {!isQuickFlow && (
          <>
        {/* STEP 2: Business Type - Compact horizontal buttons with inline subcategories */}
        {currentStep === 2 && (
          <div className="space-y-2">
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {language === 'ar' ? 'اختر نوع الخدمة' : language === 'fr' ? 'Type de service' : 'Select Service Type'}
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {language === 'ar' ? 'حدد الفئة والتخصص' : language === 'fr' ? 'Sélectionnez la catégorie' : 'Choose category and specialty'}
              </p>
            </div>
            
            {/* Compact category buttons - click opens centered dialog for specialty selection */}
            <div className="flex flex-wrap gap-1">
              {businessCategories.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.id
                const hasMultipleSubs = cat.subcategories.length > 1
                const hasSingleSub = cat.subcategories.length === 1

                if (hasMultipleSubs) {
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id)
                        setSelectedSubcategory(null)
                        setSearchQuery('')
                        setCategoryPopoverOpen(cat.id)
                      }}
                      className={`
                        inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium touch-target
                        transition-all duration-200 border
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-background hover:bg-muted border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <Icon className={`h-3 w-3 shrink-0 ${isSelected ? '' : 'text-muted-foreground'}`} />
                      <span>{cat.name[language as keyof typeof cat.name]}</span>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                    </button>
                  )
                }

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      if (hasSingleSub) setSelectedSubcategory(cat.subcategories[0].id)
                    }}
                    className={`
                      inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium touch-target
                      transition-all duration-200 border
                      ${isSelected 
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                        : 'bg-background hover:bg-muted border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <Icon className={`h-3 w-3 shrink-0 ${isSelected ? '' : 'text-muted-foreground'}`} />
                    <span>{cat.name[language as keyof typeof cat.name]}</span>
                  </button>
                )
              })}
            </div>

            {/* Specialty selection dialog - centered, sidebar-style layout */}
            <Dialog
              open={categoryPopoverOpen !== null}
              onOpenChange={(open) => !open && setCategoryPopoverOpen(null)}
            >
              <DialogContent
                className="p-0 gap-0 overflow-hidden border-border/50 shadow-xl rounded-2xl w-auto max-w-[min(280px,95vw)] max-h-[85vh] flex flex-col bg-card/95 backdrop-blur"
                dir={dir}
                showCloseButton={true}
                size="sm"
                style={{ width: 260, maxWidth: '95vw', minHeight: 220 }}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {categoryPopoverOpen && (() => {
                  const cat = businessCategories.find(c => c.id === categoryPopoverOpen)
                  if (!cat) return null
                  const CatIcon = cat.icon
                  const filteredSubs = cat.subcategories.filter(sub =>
                    !searchQuery ||
                    sub.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    sub.name.ar.includes(searchQuery) ||
                    sub.name.fr.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  return (
                    <>
                      <DialogHeader className="p-3 pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md">
                            <CatIcon className="h-4 w-4" strokeWidth={2} />
                          </span>
                          <div>
                            <DialogTitle className="text-sm font-bold">
                              {cat.name[language as keyof typeof cat.name]}
                            </DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                              {language === 'ar' ? 'اختر التخصص' : language === 'fr' ? 'Choisissez la spécialité' : 'Choose your specialty'}
                            </DialogDescription>
                          </div>
                        </div>
                        <div className={`relative mt-2 ${dir === 'rtl' ? 'rtl' : ''}`}>
                          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground ${dir === 'rtl' ? 'right-2.5' : 'left-2.5'}`} />
                          <Input
                            placeholder={language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`h-8 text-xs rounded-lg border-border/50 ${dir === 'rtl' ? 'pr-8' : 'pl-8'}`}
                          />
                        </div>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-1.5">
                        <div className="flex flex-col gap-0.5">
                          {filteredSubs.map((sub) => {
                            const isSubSelected = selectedSubcategory === sub.id
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSubcategory(sub.id)
                                  setCategoryPopoverOpen(null)
                                }}
                                className={`
                                  flex items-center gap-2 w-full rounded-lg h-9 px-2.5 text-start text-sm transition-colors
                                  ${isSubSelected
                                    ? 'bg-primary/10 text-primary dark:bg-emerald-500/20 dark:text-emerald-400 font-medium'
                                    : 'hover:bg-muted/70 text-foreground'
                                  }
                                `}
                              >
                                {isSubSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary dark:text-emerald-400" />}
                                <span className="flex-1 truncate">{sub.name[language as keyof typeof sub.name]}</span>
                              </button>
                            )
                          })}
                          {filteredSubs.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                              {language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results found'}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </DialogContent>
            </Dialog>
            
            {/* Provider list - shown when specialty + visit type selected (merged) */}
            {selectedCategory && selectedSubcategory && (selectedCategory !== 'doctors' || visitType) && (
          <div className="space-y-1 pt-1 border-t mt-1">
            {!useAutoLocation && (
              <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-[10px]">
                        {language === 'ar' ? 'الولاية' : 'Wilaya'}
                      </Label>
                      <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={wilayaOpen}
                            className="w-full justify-between font-normal h-8 text-xs touch-target px-2"
                          >
                            <span className="truncate">
                              {selectedWilaya
                                ? getWilayaName(getWilayaByCode(selectedWilaya)!, locLang)
                                : language === 'ar' ? 'اختر الولاية' : language === 'fr' ? 'Choisir la wilaya' : 'Select wilaya'}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" avoidCollisions={false}>
                          <Command>
                            <CommandInput
                              placeholder={language === 'ar' ? 'بحث الولاية...' : language === 'fr' ? 'Rechercher wilaya...' : 'Search wilaya...'}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results'}
                              </CommandEmpty>
                              <CommandGroup heading={`${WILAYAS.length} ${language === 'ar' ? 'ولاية' : language === 'fr' ? 'wilayas' : 'wilayas'}`}>
                                {WILAYAS.map((w) => (
                                  <CommandItem
                                    key={w.code}
                                    value={`${w.code} ${getWilayaName(w, locLang)} ${w.nameAr}`}
onSelect={() => {
                                        setSelectedWilaya(w.code)
                                        setSelectedCity('')
                                        setWilayaOpen(false)
                                        setCityOpen(false)
                                      }}
                                    className="gap-2"
                                  >
                                    <span className="text-muted-foreground text-xs w-6 shrink-0">{w.code}</span>
                                    <span className="truncate">{getWilayaName(w, locLang)}</span>
                                    {selectedWilaya === w.code && <Check className="h-4 w-4 ms-auto shrink-0" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-[10px]">{language === 'ar' ? 'المدينة' : language === 'fr' ? 'Ville' : 'City'}</Label>
                      <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={cityOpen}
                            className="w-full justify-between font-normal h-8 text-xs touch-target px-2"
                            disabled={!selectedWilaya}
                          >
                            <span className="truncate">
                              {selectedCity
                                ? (() => {
                                    const c = getWilayaByCode(selectedWilaya)?.cities.find((x) => x.id === selectedCity)
                                    return c ? getCityName(c, locLang) : selectedCity
                                  })()
                                : language === 'ar' ? 'اختر المدينة' : language === 'fr' ? 'Choisir la ville' : 'Select city'}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" avoidCollisions={false}>
                          <Command>
                            <CommandInput
                              placeholder={language === 'ar' ? 'بحث المدينة...' : language === 'fr' ? 'Rechercher ville...' : 'Search city...'}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results'}
                              </CommandEmpty>
                              <CommandGroup>
                                {(getWilayaByCode(selectedWilaya)?.cities ?? []).map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.id} ${getCityName(c, locLang)} ${c.nameAr}`}
                                    onSelect={() => {
                                      setSelectedCity(c.id)
                                      setCityOpen(false)
                                    }}
                                    className="gap-2"
                                  >
                                    <span className="truncate">{getCityName(c, locLang)}</span>
                                    {selectedCity === c.id && <Check className="h-4 w-4 ms-auto shrink-0" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

            {/* Compact filter bar - Visit type + Location + Filters in one line */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Visit type (doctors only) */}
              {selectedCategory === 'doctors' && (
                <div className="inline-flex p-0.5 bg-muted rounded-md gap-0.5">
                    {[
                      { id: 'office' as const, icon: Building, label: { en: 'Office', ar: 'العيادة', fr: 'Cabinet' } },
                      { id: 'online' as const, icon: Video, label: { en: 'Video', ar: 'فيديو', fr: 'Vidéo' } },
                      { id: 'home' as const, icon: Home, label: { en: 'Home', ar: 'المنزل', fr: 'Domicile' } }
                    ].map((type) => {
                      const Icon = type.icon
                      const isSelected = visitType === type.id
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setVisitType(type.id)}
                          className={`
                            inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium touch-target
                            transition-all duration-200
                            ${isSelected 
                              ? 'bg-background text-foreground shadow-sm' 
                              : 'text-muted-foreground hover:text-foreground'
                            }
                          `}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span>{type.label[language as keyof typeof type.label]}</span>
                        </button>
                      )
                    })}
                  </div>
              )}
              {/* Location toggle */}
              <div className="inline-flex p-0.5 bg-muted rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    setUseAutoLocation(true)
                    if (useAutoLocation) requestLocation()
                  }}
                  disabled={isLocating}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all touch-target h-8 ${
                    useAutoLocation ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isLocating ? <LoadingSpinner size="sm" className="h-3 w-3" /> : <Navigation className="h-3 w-3" />}
                  {language === 'ar' ? 'موقعي' : language === 'fr' ? 'Ma position' : 'Near me'}
                </button>
                <button
                  type="button"
                  onClick={() => setUseAutoLocation(false)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all touch-target h-8 ${
                    !useAutoLocation ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  {language === 'ar' ? 'ولاية' : language === 'fr' ? 'Wilaya' : 'Wilaya'}
                </button>
              </div>
              
              {/* Filter buttons */}
              <button
                type="button"
                onClick={() => setShowFavorites(!showFavorites)}
                className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-all touch-target h-8 w-8 shrink-0 ${
                  showFavorites 
                    ? 'bg-amber-50 border-amber-300/50 text-amber-600 dark:bg-amber-950/30 dark:border-amber-500/30 dark:text-amber-400' 
                    : 'bg-background border-border text-muted-foreground hover:text-amber-500 hover:border-amber-300/50'
                }`}
                title={language === 'ar' ? 'المفضلة' : language === 'fr' ? 'Favoris' : 'Favorites'}
              >
                <Star className={`h-4 w-4 ${showFavorites ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]' : 'text-amber-500/70 hover:text-amber-500 dark:text-amber-400/60 dark:hover:text-amber-400'}`} />
              </button>
              
              <button
                type="button"
                onClick={() => setFilterOpenOnly(!filterOpenOnly)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all touch-target h-8 ${
                  filterOpenOnly 
                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' 
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                }`}
              >
                <Clock className="h-3 w-3" />
                {language === 'ar' ? 'مفتوح' : 'Open'}
              </button>
              
              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground touch-target"
              >
                <option value="best">{language === 'ar' ? 'الأفضل' : 'Best match'}</option>
                <option value="distance">{language === 'ar' ? 'الأقرب' : 'Nearest'}</option>
                <option value="rating">{language === 'ar' ? 'التقييم' : 'Top rated'}</option>
                <option value="open">{language === 'ar' ? 'مفتوح أولاً' : 'Open first'}</option>
              </select>
            </div>

            {useAutoLocation && locationError && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {language === 'ar'
                  ? 'تم استخدام عنوانك من الملف الشخصي (الولاية والمدينة)'
                  : language === 'fr'
                    ? 'Utilisation de votre adresse du profil (wilaya et ville)'
                    : 'Using your profile address (wilaya and city)'}
              </p>
            )}
            
            {aiSuggestions?.suggestedSpecialty && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {language === 'ar' 
                  ? 'مرتب حسب أفضل تطابق لأعراضك (تخصص + مسافة + متاح الآن)' 
                  : language === 'fr' 
                  ? 'Classé par meilleure correspondance à vos symptômes (spécialité + distance + ouvert)'
                  : 'Sorted by best fit for your symptoms (specialty + distance + open now)'}
              </p>
            )}
            
            {loadingProviders ? (
              <div className="flex items-center justify-center py-6">
                <LoadingSpinner size="lg" className="text-primary dark:text-emerald-400" />
              </div>
            ) : (
              <ScrollArea className="h-[min(340px,50vh)] sm:h-[min(380px,55vh)] pr-2 -mx-1 px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 p-1">
                  {rankedProviders.map((provider, idx) => {
                    const isSelected = selectedProvider === provider.id
                    const isTopMatch = aiSuggestions?.suggestedSpecialty && idx < 3
                    return (
                      <div
                        key={provider.id}
                        ref={isSelected ? selectedProviderRef : null}
                      >
                        <Card
                          className={`py-2 gap-0 cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-2 ring-primary dark:ring-emerald-400 bg-primary/5 dark:bg-emerald-500/10'
                              : 'hover:border-primary/50 dark:hover:border-emerald-400/50 hover:shadow-sm'
                          }`}
                          onClick={() => setSelectedProvider(provider.id)}
                        >
                          <CardContent className="p-2">
                            {/* Row 1: Avatar + Name + Badge | Favorite + Price */}
                            <div className="flex items-start gap-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Stethoscope className="h-2.5 w-2.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                                    <h3 className="font-semibold text-xs truncate">{language === 'ar' ? provider.nameAr : provider.name}</h3>
                                    {isTopMatch && (
                                      <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0 bg-primary/15 text-primary dark:bg-emerald-500/20 dark:text-emerald-400">
                                        {idx === 0 ? (language === 'ar' ? 'الأفضل' : language === 'fr' ? 'Meilleur' : 'Best') : `#${idx + 1}`}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                    <FavoriteButton
                                      professionalId={provider.id}
                                      initialFavorited={isFavorite(provider.id)}
                                      size="sm"
                                      onToggle={(newState) => updateFavoriteState(provider.id, newState)}
                                    />
                                    {isSelected && <Check className="h-3 w-3 text-primary dark:text-emerald-400" />}
                                    <span className="font-semibold text-[11px] text-primary dark:text-emerald-400">{provider.price} DZD</span>
                                  </div>
                                </div>
                                {/* Row 2: Specialty · Rating · Distance · Open · Visit icons · Details */}
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground flex-wrap">
                                  <span className="truncate">{provider.specialty}</span>
                                  <span className="shrink-0">·</span>
                                  <span className="flex items-center gap-0.5 shrink-0">
                                    <Star className="h-2.5 w-2.5 text-yellow-500 fill-current" />
                                    {provider.rating}
                                  </span>
                                  {provider.distance !== undefined && (
                                    <>
                                      <span className="shrink-0">·</span>
                                      <span className="shrink-0">{provider.distance.toFixed(1)} km</span>
                                    </>
                                  )}
                                  {provider.isOpen !== undefined && (
                                    <>
                                      <span className="shrink-0">·</span>
                                      <span className={`shrink-0 px-1 py-0 rounded ${
                                        provider.isOpen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                      }`}>
                                        {provider.isOpen ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
                                      </span>
                                    </>
                                  )}
                                  <div className="flex gap-0.5 items-center shrink-0 ms-auto">
                                    {provider.supportsInPerson && <Building className="h-2.5 w-2.5" title="Office" />}
                                    {provider.supportsHomeVisit && <Home className="h-2.5 w-2.5" title="Home" />}
                                    {provider.supportsEVisit && <Video className="h-2.5 w-2.5" title="Video" />}
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 text-[10px] hover:text-primary dark:hover:text-emerald-400 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setProviderForDetail(provider)
                                      setProviderDetailOpen(true)
                                    }}
                                  >
                                    {language === 'ar' ? 'التفاصيل' : language === 'fr' ? 'Détails' : 'Details'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
            )}
          </div>
        )}
        
        {/* STEP 1: Condition & Symptoms - AI-powered symptom analysis (NEW FIRST STEP) */}
        {currentStep === 1 && (
          <div className="space-y-2">
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {language === 'ar' ? 'ما الذي يزعجك؟' : language === 'fr' ? 'Qu\'est-ce qui vous préoccupe?' : "What's bothering you?"}
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {language === 'ar' ? 'صف أعراضك وسنساعدك في إيجاد الطبيب المناسب' : language === 'fr' ? 'Décrivez vos symptômes et nous vous guiderons vers le bon médecin' : "Describe your symptoms and we'll help you find the right doctor"}
              </p>
            </div>
            
            {/* AI Symptom Analysis Card */}
            <Card className="border-primary/30 bg-primary/5 py-1">
              <CardContent className="p-2 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <Label className="text-xs font-medium">
                    {language === 'ar' ? 'وصف أعراضك — سنحللها بالذكاء الاصطناعي' : language === 'fr' ? 'Décrivez vos symptômes — analyse IA' : 'Describe symptoms — AI analysis'}
                  </Label>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 font-medium bg-primary/10 text-primary border-primary/20 shrink-0">
                    AI
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Textarea
                    placeholder={language === 'ar' 
                      ? 'مثال: صداع من 3 أيام مع دوخة...' 
                      : language === 'fr' 
                      ? 'Ex: maux de tête depuis 3 jours...'
                      : 'e.g. headache for 3 days with dizziness...'}
                    value={aiSymptomText}
                    onChange={(e) => setAiSymptomText(e.target.value)}
                    rows={1}
                    className="flex-1 text-xs resize-none min-h-[2rem] py-1.5"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={analyzeSymptoms}
                    disabled={aiAnalyzing || aiSymptomText.length < 10}
                    className="shrink-0 h-8 px-2"
                  >
                    {aiAnalyzing ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1 hidden sm:inline text-xs">
                      {language === 'ar' ? 'تحليل' : language === 'fr' ? 'Analyser' : 'Analyze'}
                    </span>
                  </Button>
                </div>
                
                {/* AI Suggestions Display */}
                {showAiSuggestions && aiSuggestions && (
                  <div className="rounded-md border border-primary/20 bg-background p-2 space-y-2">
                    {/* Urgency + Specialty */}
                    <div className="space-y-1.5">
                      {aiSuggestions.urgencyLevel && (
                        <Badge variant={
                          aiSuggestions.urgencyLevel === 'urgent' ? 'destructive' :
                          aiSuggestions.urgencyLevel === 'soon' ? 'default' : 'secondary'
                        }>
                          {language === 'ar' 
                            ? (aiSuggestions.urgencyLevel === 'urgent' ? 'عاجل' : aiSuggestions.urgencyLevel === 'soon' ? 'قريباً' : 'روتيني')
                            : language === 'fr'
                            ? (aiSuggestions.urgencyLevel === 'urgent' ? 'Urgent' : aiSuggestions.urgencyLevel === 'soon' ? 'Bientôt' : 'Routine')
                            : aiSuggestions.urgencyLevel}
                        </Badge>
                      )}
                      {aiSuggestions.suggestedSpecialty && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'التخصص المقترح:' : language === 'fr' ? 'Spécialité suggérée:' : 'Suggested specialty:'}
                          </span>
                          <span className="text-sm font-semibold text-primary capitalize">
                            {aiSuggestions.suggestedSpecialty.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Extracted Symptoms */}
                    {aiSuggestions.symptoms && aiSuggestions.symptoms.length > 0 && (
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-xs font-medium mb-1 text-muted-foreground">
                          {language === 'ar' ? 'الأعراض المستخرجة:' : language === 'fr' ? 'Symptômes détectés:' : 'Detected symptoms:'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiSuggestions.symptoms.map((s, i) => {
                            const suffix = [s.duration, s.severity].filter(Boolean).join(', ')
                            return (
                              <Badge key={i} variant="outline" className="text-xs">
                                {s.name}{suffix ? ` (${suffix})` : ''}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Red Flags Warning */}
                    {aiSuggestions.redFlags && aiSuggestions.redFlags.length > 0 && (
                      <div className="rounded bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-700 dark:text-red-400">
                        <strong>{language === 'ar' ? 'تحذير:' : language === 'fr' ? 'Attention:' : 'Warning:'}</strong> {aiSuggestions.redFlags.join(', ')}
                      </div>
                    )}
                    
                    {/* Follow-up Questions */}
                    {aiSuggestions.followUpQuestions && aiSuggestions.followUpQuestions.length > 0 && (
                      <div className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
                        <p className="font-medium mb-1">
                          {language === 'ar' ? 'استعد لزيارتك — أسئلة قد يطرحها الطبيب:' : language === 'fr' ? 'Préparez-vous pour la visite — questions que le médecin pourrait poser:' : 'Prepare for your visit — questions the doctor might ask:'}
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {aiSuggestions.followUpQuestions.slice(0, 3).map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Quick Action Button */}
                    {aiSuggestions.suggestedSpecialty && (
                      <Button 
                        size="sm"
                        className="w-full mt-1.5 h-8 text-xs gap-1" 
                        onClick={() => setCurrentStep(2)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {language === 'ar' 
                          ? `المتابعة مع ${aiSuggestions.suggestedSpecialty}` 
                          : language === 'fr' 
                          ? `Continuer avec ${aiSuggestions.suggestedSpecialty}`
                          : `Continue with ${aiSuggestions.suggestedSpecialty}`}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Skip option */}
            {!showAiSuggestions && (
              <div className="text-center py-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCurrentStep(2)}
                  className="text-muted-foreground hover:text-foreground h-8 text-xs"
                >
                  {language === 'ar' ? 'تخطي واختر التخصص يدوياً' : language === 'fr' ? 'Passer et choisir la spécialité' : 'Skip and choose specialty manually'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
            
            {/* Refine & details — always open */}
            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {language === 'ar' ? 'أعراض إضافية وتفاصيل' : language === 'fr' ? 'Symptômes et détails' : 'Add symptoms & details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3 pt-0">
                {/* Symptoms — compact row, fewer chips when AI ran */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    {showAiSuggestions 
                      ? (language === 'ar' ? 'أضف أعراضاً إن وجدت' : language === 'fr' ? 'Ajoutez des symptômes si besoin' : 'Add symptoms if needed')
                      : (language === 'ar' ? 'اختر الأعراض' : language === 'fr' ? 'Sélectionnez les symptômes' : 'Select symptoms')}
                  </Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(showAiSuggestions ? popularSymptoms.slice(0, 6) : popularSymptoms).map((s) => {
                      const isSelected = selectedSymptoms.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSymptom(s.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all border ${
                            isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-transparent hover:border-primary/50'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                          {s.name[language as keyof typeof s.name]}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    placeholder={language === 'ar' ? 'أعراض أخرى...' : language === 'fr' ? 'Autres symptômes...' : 'Other symptoms...'}
                    value={customSymptoms}
                    onChange={(e) => setCustomSymptoms(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                
                {/* Severity + Duration — single compact row */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[160px]">
                    <PainSeverityBar
                      value={severity}
                      onValueChange={setSeverity}
                      max={100}
                      step={1}
                      language={language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'}
                      label={language === 'ar' ? 'الشدة' : language === 'fr' ? 'Gravité' : 'Severity'}
                      showLabel={true}
                    />
                  </div>
                  <div className="flex items-end gap-2 min-w-0 shrink-0">
                    <div className="min-w-0">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {language === 'ar' ? 'منذ' : language === 'fr' ? 'Depuis' : 'Duration'}
                      </Label>
                      <div className="flex items-center gap-1 min-w-0">
                        <div className="flex items-center rounded-md border border-input bg-background" dir="ltr">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-l-md rounded-r-none shrink-0"
                            onClick={() => setDurationNumber((n) => Math.max(1, n - 1))}
                            aria-label={language === 'ar' ? 'تقليل' : language === 'fr' ? 'Diminuer' : 'Decrease'}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="min-w-[2rem] px-2 text-sm font-medium tabular-nums text-center" aria-live="polite">
                            {durationNumber}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-r-md rounded-l-none shrink-0"
                            onClick={() => setDurationNumber((n) => Math.min(999, n + 1))}
                            aria-label={language === 'ar' ? 'زيادة' : language === 'fr' ? 'Augmenter' : 'Increase'}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <select className="h-9 sm:h-8 min-w-0 rounded-md border bg-background px-2 text-xs" value={durationPeriod} onChange={(e) => setDurationPeriod(e.target.value as any)}>
                          <option value="days">{language === 'ar' ? 'أيام' : 'Days'}</option>
                          <option value="weeks">{language === 'ar' ? 'أسابيع' : 'Weeks'}</option>
                          <option value="months">{language === 'ar' ? 'أشهر' : 'Months'}</option>
                          <option value="years">{language === 'ar' ? 'سنوات' : 'Years'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Medical history & files — always open */}
            <Card>
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {language === 'ar' ? 'التاريخ الطبي والملفات' : language === 'fr' ? 'Antécédents et fichiers' : 'Medical history & files'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-4">
                    {/* Medical history toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="prev-treatment" className="text-sm cursor-pointer">{language === 'ar' ? 'علاج سابق' : language === 'fr' ? 'Traitement antérieur' : 'Previous treatment'}</Label>
                        <Switch id="prev-treatment" checked={hasPreviousTreatment} onCheckedChange={setHasPreviousTreatment} />
                      </div>
                      {hasPreviousTreatment && <Textarea placeholder={language === 'ar' ? 'صف العلاج...' : 'Describe...'} value={previousTreatment} onChange={(e) => setPreviousTreatment(e.target.value)} rows={2} className="text-sm resize-none" />}
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allergies" className="text-sm cursor-pointer">{language === 'ar' ? 'حساسية' : language === 'fr' ? 'Allergies' : 'Allergies'}</Label>
                        <Switch id="allergies" checked={hasAllergies} onCheckedChange={setHasAllergies} />
                      </div>
                      {hasAllergies && <Textarea placeholder={language === 'ar' ? 'اذكر الحساسية...' : 'List allergies...'} value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={2} className="text-sm resize-none" />}
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="medications" className="text-sm cursor-pointer">{language === 'ar' ? 'أدوية حالية' : language === 'fr' ? 'Médicaments' : 'Current medications'}</Label>
                        <Switch id="medications" checked={hasMedications} onCheckedChange={setHasMedications} />
                      </div>
                      {hasMedications && <Textarea placeholder={language === 'ar' ? 'اذكر الأدوية...' : 'List medications...'} value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} rows={2} className="text-sm resize-none" />}
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="history" className="text-sm cursor-pointer">{language === 'ar' ? 'حالات مزمنة' : language === 'fr' ? 'Conditions chroniques' : 'Chronic conditions'}</Label>
                        <Switch id="history" checked={hasMedicalHistory} onCheckedChange={setHasMedicalHistory} />
                      </div>
                      {hasMedicalHistory && <Textarea placeholder={language === 'ar' ? 'صف التاريخ...' : 'Describe...'} value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} className="text-sm resize-none" />}
                    </div>
                    
                    {/* File upload */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">{language === 'ar' ? 'إرفاق ملفات' : language === 'fr' ? 'Joindre des fichiers' : 'Attach files'}</Label>
                      <label className="flex items-center justify-center gap-2 border border-dashed rounded-lg p-4 sm:p-3 min-h-[48px] cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors touch-target">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{language === 'ar' ? 'رفع صور أو مستندات' : 'Upload photos or documents'}</span>
                        <input type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
                      </label>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs">
                              {file.preview ? <img src={file.preview} alt="" className="h-5 w-5 rounded object-cover" /> : <File className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className="max-w-[100px] truncate">{file.name}</span>
                              <button type="button" onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* STEP 3: Schedule (Date & Time + Who) */}
        {currentStep === 3 && (
          <div className="space-y-2">
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {language === 'ar' ? 'اختر الموعد وأكمل البيانات' : language === 'fr' ? 'Choisissez la date et complétez' : 'Schedule & Confirm'}
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {language === 'ar' ? 'اختر لمن الموعد ثم التاريخ والوقت' : language === 'fr' ? 'Choisissez pour qui, puis date et heure' : 'Pick who, date, time, and enter your details'}
              </p>
            </div>
            
            {selectedProvider ? (
              <>
                {/* Who is this appointment for? - First so user picks who, then when */}
                <Card className="gap-2 py-2">
              <CardHeader className="py-2 pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {language === 'ar' ? 'لمن هذا الموعد؟' : language === 'fr' ? 'Pour qui est ce rendez-vous ?' : 'Who is this appointment for?'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex flex-wrap gap-2">
                  {/* Self option */}
                  <button
                    type="button"
                    onClick={() => {
                      setBookingForSelf(true)
                      setSelectedFamilyMembers([])
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border-2 transition-all min-h-[44px] touch-target ${
                      bookingForSelf
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>{language === 'ar' ? 'لنفسي' : language === 'fr' ? 'Pour moi' : 'Myself'}</span>
                  </button>
                  
                  {/* Family members */}
                  {familyMembers.map((member) => {
                    const isChild = member.relationship === 'child'
                    const isElderly = member.relationship === 'parent' || member.relationship === 'grandparent'
                    const Icon = isChild ? Baby : isElderly ? UserCircle : User
                    const isSelected = selectedFamilyMembers.includes(member.id)
                    
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setBookingForSelf(false)
                          setSelectedFamilyMembers(prev =>
                            prev.includes(member.id)
                              ? prev.filter(id => id !== member.id)
                              : [...prev, member.id]
                          )
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border-2 transition-all min-h-[44px] touch-target ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate max-w-[120px]">{member.full_name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        {isChild && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {language === 'ar' ? 'طفل' : 'Child'}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                  
                  {/* Add family member link */}
                  <Link
                    href="/family"
                    className="inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all min-h-[44px] touch-target"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{language === 'ar' ? 'إضافة فرد' : language === 'fr' ? 'Ajouter' : 'Add member'}</span>
                  </Link>
                </div>
                
                {/* Show selected family member info */}
                {!bookingForSelf && selectedFamilyMembers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {selectedFamilyMembers.map((memberId) => {
                      const member = familyMembers.find(m => m.id === memberId)
                      if (!member) return null
                      const dob = new Date(member.date_of_birth)
                      const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365))
                      return (
                        <div key={memberId} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {member.relationship === 'child' ? <Baby className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {age} {language === 'ar' ? 'سنة' : language === 'fr' ? 'ans' : 'years'} • {member.gender === 'male' ? (language === 'ar' ? 'ذكر' : language === 'fr' ? 'Homme' : 'Male') : (language === 'ar' ? 'أنثى' : language === 'fr' ? 'Femme' : 'Female')}
                              {member.blood_type && ` • ${member.blood_type}`}
                            </p>
                            {member.allergies && member.allergies.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  {language === 'ar' ? 'حساسية:' : 'Allergies:'}
                                </span>
                                {member.allergies.slice(0, 3).map((a: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:text-amber-400">
                                    {typeof a === 'string' ? a : a.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
                </Card>

                {/* Date & Time */}
                <Card className="rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 gap-2 py-2">
                  <CardContent className="pt-2 pb-2 px-3 sm:px-4">
                    <CalendarSlotPicker
                      professionalId={selectedProvider}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onSelectDate={setSelectedDate}
                      onSelectTime={setSelectedTime}
                      slotDuration={30}
                      lang={language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'}
                      providerName={selectedProviderData?.name}
                      providerSpecialty={selectedProviderData?.specialty}
                      compact
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 text-center py-6">
                {language === 'ar' ? 'يرجى اختيار مقدم الخدمة أولاً' : language === 'fr' ? 'Veuillez d\'abord sélectionner un prestataire' : 'Please select a provider first'}
              </p>
            )}
          </div>
        )}
        
        
        {/* Navigation - steps 1 to 3, then go directly to confirm page */}
        {currentStep <= 3 && (
          <div className={`flex items-center justify-between gap-2 mt-2 pt-2 pb-1 border-t ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="gap-2 bg-transparent min-h-[48px] touch-target">
              {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {language === 'ar' ? 'السابق' : language === 'fr' ? 'Précédent' : 'Previous'}
            </Button>
            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(p => p + 1)} disabled={!canProceed()} className="gap-2 min-h-[48px] touch-target">
                {language === 'ar' ? 'التالي' : language === 'fr' ? 'Suivant' : 'Next'}
                {dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            ) : (
              <Button onClick={goToConfirm} disabled={!canProceed()} className="gap-2 min-h-[48px] touch-target">
                {language === 'ar' ? 'متابعة للتأكيد' : language === 'fr' ? 'Continuer' : 'Continue to Confirm'}
                {dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )}
          </>
        )}
        
        {/* Provider detail dialog */}
        <Dialog open={providerDetailOpen} onOpenChange={setProviderDetailOpen}>
          <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
            {providerForDetail && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl">
                        {language === 'ar' ? providerForDetail.nameAr : providerForDetail.name}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        {providerForDetail.specialty}
                        {providerForDetail.specialtyAr && language === 'ar' && ` • ${providerForDetail.specialtyAr}`}
                      </DialogDescription>
                    </div>
                    <FavoriteButton
                      professionalId={providerForDetail.id}
                      initialFavorited={isFavorite(providerForDetail.id)}
                      size="sm"
                      onToggle={(newState) => updateFavoriteState(providerForDetail.id, newState)}
                    />
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 pt-2">
                  {/* Rating & reviews */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-semibold">{providerForDetail.rating}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {providerForDetail.reviews} {language === 'ar' ? 'تقييم' : language === 'fr' ? 'avis' : 'reviews'}
                    </span>
                    {providerForDetail.distance !== undefined && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {providerForDetail.distance.toFixed(1)} km
                      </span>
                    )}
                    {providerForDetail.isOpen !== undefined && (
                      <Badge variant={providerForDetail.isOpen ? 'default' : 'secondary'} className="text-xs">
                        {providerForDetail.isOpen 
                          ? (language === 'ar' ? 'مفتوح الآن' : language === 'fr' ? 'Ouvert' : 'Open now')
                          : (language === 'ar' ? 'مغلق' : language === 'fr' ? 'Fermé' : 'Closed')}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Location */}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {language === 'ar' ? 'الموقع' : language === 'fr' ? 'Adresse' : 'Location'}
                    </p>
                    <p className="text-sm">{providerForDetail.location || `${providerForDetail.city}, ${providerForDetail.wilaya}`}</p>
                  </div>
                  
                  {/* Visit options */}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {language === 'ar' ? 'خيارات الزيارة' : language === 'fr' ? 'Options de visite' : 'Visit options'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {providerForDetail.supportsInPerson && (
                        <Badge variant="outline" className="gap-1">
                          <Building className="h-3 w-3" />
                          {language === 'ar' ? 'العيادة' : language === 'fr' ? 'Cabinet' : 'In office'}
                        </Badge>
                      )}
                      {providerForDetail.supportsEVisit && (
                        <Badge variant="outline" className="gap-1">
                          <Video className="h-3 w-3" />
                          {language === 'ar' ? 'فيديو' : language === 'fr' ? 'Vidéo' : 'Video call'}
                        </Badge>
                      )}
                      {providerForDetail.supportsHomeVisit && (
                        <Badge variant="outline" className="gap-1">
                          <Home className="h-3 w-3" />
                          {language === 'ar' ? 'زيارة منزلية' : language === 'fr' ? 'Domicile' : 'Home visit'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'سعر الاستشارة' : language === 'fr' ? 'Consultation' : 'Consultation fee'}
                    </span>
                    <span className="text-lg font-bold text-primary">{providerForDetail.price} DZD</span>
                  </div>
                </div>
                
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setProviderDetailOpen(false)}>
                    {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProvider(providerForDetail.id)
                      setProviderDetailOpen(false)
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'اختيار' : language === 'fr' ? 'Choisir' : 'Select'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

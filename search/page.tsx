'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'
import { useLocation } from '@/hooks/use-location'
import { algeriaWilayas, getWilayaName, getCityName, type Wilaya, type City } from '@/lib/data/algeria-locations'
import { Calendar, MapPin, Search, Star, Stethoscope, ArrowLeft, ArrowRight, Clock, Video, Building, Filter, Navigation, ChevronDown, Check, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Suspense } from 'react'
import Loading from './loading'

// Doctor type for search results
interface SearchDoctor {
  id: string
  name: string
  nameAr: string
  specialty: string
  specialtyAr: string
  specialtyFr: string
  specialtyKey: string
  wilayaCode: string
  cityId: string
  location: string
  locationAr: string
  address: string
  addressAr: string
  rating: number
  reviews: number
  experience: number
  price: number
  availability: string
  opensAt?: string
  closesAt?: string
  isOpen?: boolean
  nextAvailable: string
  nextAvailableAr: string
  nextAvailableFr: string
  supportsEVisit: boolean
  supportsInPerson: boolean
}

const specialties = [
  { key: 'all', en: 'All Specialties', fr: 'Toutes les spécialités', ar: 'جميع التخصصات' },
  { key: 'cardiology', en: 'Cardiologist', fr: 'Cardiologue', ar: 'طب القلب' },
  { key: 'dentistry', en: 'Dentist', fr: 'Dentiste', ar: 'طب الأسنان' },
  { key: 'dermatology', en: 'Dermatologist', fr: 'Dermatologue', ar: 'الأمراض الجلدية' },
  { key: 'gynecology', en: 'Gynecologist', fr: 'Gynécologue', ar: 'أمراض النساء' },
  { key: 'ophthalmology', en: 'Ophthalmologist', fr: 'Ophtalmologue', ar: 'طب العيون' },
  { key: 'pediatrics', en: 'Pediatrician', fr: 'Pédiatre', ar: 'طب الأطفال' },
  { key: 'general', en: 'General Practitioner', fr: 'Généraliste', ar: 'الطب العام' },
  { key: 'ent', en: 'ENT Specialist', fr: 'ORL', ar: 'أنف أذن حنجرة' },
  { key: 'psychiatry', en: 'Psychiatrist', fr: 'Psychiatre', ar: 'الطب النفسي' }
]

export default function SearchPage() {
  const { t, language, dir } = useLanguage()
  
  const ArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowIcon className="h-4 w-4" />
          {t('backToHome')}
        </Link>

        <Suspense fallback={<Loading />}>
          <SearchContent />
        </Suspense>
      </div>
      
      <Footer />
    </div>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const { t, language, dir } = useLanguage()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || 'all')
  const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'e-visit' | 'in-person'>(
    (searchParams.get('type') as 'all' | 'e-visit' | 'in-person') || 'all'
  )
  
  // Doctors from database
  const [doctors, setDoctors] = useState<SearchDoctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  
  // Location state
  const {
    isDetecting,
    detectedWilaya,
    selectedWilaya,
    selectedCity,
    detectLocation,
    selectWilaya,
    selectCity,
    clearSelection,
  } = useLocation()
  
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [useAutoLocation, setUseAutoLocation] = useState(false)

  // Fetch doctors from database
  useEffect(() => {
    const fetchDoctors = async () => {
      const supabase = createBrowserClient()
      
      const { data: doctorsData, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
      
      if (error) {
        setLoadingDoctors(false)
        return
      }
      
      if (doctorsData && doctorsData.length > 0) {
        const doctorIds = doctorsData.map(d => d.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', doctorIds)
        
        const profilesMap = new Map((profiles || []).map(p => [p.id, p]))
        
        const transformedDoctors: SearchDoctor[] = doctorsData.map(d => {
          const profile = profilesMap.get(d.user_id)
          const specialtyKey = (d.specialty || 'general').toLowerCase().replace(/\s+/g, '-')
          
          // Parse working hours from database with Algeria timezone
          const workingHours = d.working_hours || {}
          
          // Get current time in Algeria (UTC+1)
          const nowUTC = new Date()
          const algeriaTime = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }))
          const currentDay = algeriaTime.getDay() // 0 = Sunday, 1 = Monday, etc.
          const currentTime = algeriaTime.toTimeString().slice(0, 5) // "HH:MM"
          
          const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDay]
          const todayHours = workingHours[dayKey]
          
          // Check if open today AND current time is within hours
          let isOpen = false
          let opensAt = '08:00'
          let closesAt = '18:00'
          
          if (todayHours && todayHours.open && todayHours.close) {
            opensAt = todayHours.open
            closesAt = todayHours.close
            // Compare times (HH:MM format)
            isOpen = currentTime >= opensAt && currentTime <= closesAt
          }
          
          return {
            id: d.id,
            name: profile?.full_name || 'Doctor',
            nameAr: profile?.full_name || 'طبيب',
            specialty: d.specialty || 'General Medicine',
            specialtyAr: d.specialty_ar || 'طب عام',
            specialtyFr: d.specialty_fr || d.specialty || 'Médecine Générale',
            specialtyKey: specialtyKey === 'general-medicine' ? 'general' : specialtyKey,
            wilayaCode: d.wilaya_code || '16',
            cityId: d.city?.toLowerCase().replace(/\s+/g, '-') || 'algiers',
            location: d.city || 'Algiers',
            locationAr: d.city || 'الجزائر',
            address: d.clinic_address || '',
            addressAr: d.clinic_address || '',
            rating: d.rating || 4.5,
            reviews: d.review_count || 0,
            experience: d.experience_years || 5,
            price: d.consultation_fee || 2000,
            availability: isOpen ? 'today' : 'unavailable',
            opensAt,
            closesAt,
            isOpen,
            nextAvailable: 'Today 14:00',
            nextAvailableAr: 'اليوم 14:00',
            nextAvailableFr: "Aujourd'hui 14:00",
            supportsEVisit: d.supports_e_visit || false,
            supportsInPerson: d.supports_in_person || true
          }
        })
        
        setDoctors(transformedDoctors)
      }
      setLoadingDoctors(false)
    }
    
    fetchDoctors()
  }, [])

  // Auto-detect location on mount if URL param suggests it
  useEffect(() => {
    const locationParam = searchParams.get('location')
    if (locationParam === 'auto') {
      setUseAutoLocation(true)
      detectLocation()
    } else if (locationParam) {
      const wilaya = algeriaWilayas.find(w => 
        w.code === locationParam || 
        w.nameEn.toLowerCase() === locationParam.toLowerCase() ||
        w.nameFr.toLowerCase() === locationParam.toLowerCase()
      )
      if (wilaya) selectWilaya(wilaya)
    }
  }, [searchParams, detectLocation, selectWilaya])

  // Use detected location when auto-detect is enabled
  useEffect(() => {
    if (useAutoLocation && detectedWilaya && !selectedWilaya) {
      selectWilaya(detectedWilaya)
    }
  }, [useAutoLocation, detectedWilaya, selectedWilaya, selectWilaya])

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = searchTerm === '' || 
        doctor.name.toLowerCase().includes(searchLower) ||
        doctor.nameAr.includes(searchTerm) ||
        doctor.specialty.toLowerCase().includes(searchLower) ||
        doctor.specialtyAr.includes(searchTerm)
      
      const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialtyKey === selectedSpecialty
      
      // Location filtering
      const matchesWilaya = !selectedWilaya || doctor.wilayaCode === selectedWilaya.code
      const matchesCity = !selectedCity || doctor.cityId === selectedCity.id
      
      // Visit type filtering - when 'all', show all doctors regardless of visit type
      const matchesVisitType = visitTypeFilter === 'all' || 
        (visitTypeFilter === 'e-visit' && doctor.supportsEVisit) ||
        (visitTypeFilter === 'in-person' && doctor.supportsInPerson)
      
      return matchesSearch && matchesSpecialty && matchesWilaya && matchesCity && matchesVisitType
    })
  }, [searchTerm, selectedSpecialty, selectedWilaya, selectedCity, visitTypeFilter, doctors])

  const getSpecialtyLabel = (spec: typeof specialties[0]) => {
    return language === 'ar' ? spec.ar : language === 'fr' ? spec.fr : spec.en
  }

  const getAvailabilityLabel = (doctor: SearchDoctor) => {
    switch (doctor.availability) {
      case 'today':
        return language === 'ar' ? 'متاح اليوم' : language === 'fr' ? "Disponible aujourd'hui" : 'Available today'
      case 'tomorrow':
        return language === 'ar' ? 'متاح غداً' : language === 'fr' ? 'Disponible demain' : 'Available tomorrow'
      default:
        return language === 'ar' ? 'متاح هذا الأسبوع' : language === 'fr' ? 'Disponible cette semaine' : 'Available this week'
    }
  }

  const labels = {
    ar: {
      detectLocation: 'تحديد موقعي',
      detecting: 'جاري التحديد...',
      nearYou: 'قريب منك',
      allWilayas: 'جميع الولايات',
      selectWilaya: 'اختر الولاية',
      selectCity: 'اختر البلدية',
      searchWilaya: 'ابحث عن ولاية...',
      noResults: 'لا توجد نتائج',
      clear: 'مسح',
    },
    fr: {
      detectLocation: 'Détecter ma position',
      detecting: 'Détection...',
      nearYou: 'Près de vous',
      allWilayas: 'Toutes les wilayas',
      selectWilaya: 'Sélectionner la wilaya',
      selectCity: 'Sélectionner la commune',
      searchWilaya: 'Rechercher une wilaya...',
      noResults: 'Aucun résultat',
      clear: 'Effacer',
    },
    en: {
      detectLocation: 'Detect my location',
      detecting: 'Detecting...',
      nearYou: 'Near you',
      allWilayas: 'All Wilayas',
      selectWilaya: 'Select Wilaya',
      selectCity: 'Select City',
      searchWilaya: 'Search wilaya...',
      noResults: 'No results',
      clear: 'Clear',
    },
  }

  const l = labels[language]

  const handleDetectLocation = async () => {
    setUseAutoLocation(true)
    await detectLocation()
  }

  const handleClearLocation = () => {
    setUseAutoLocation(false)
    clearSelection()
  }

  return (
    <>
      {/* Visit Type Tabs */}
      <div className="mb-6">
        <Tabs value={visitTypeFilter} onValueChange={(v) => setVisitTypeFilter(v as 'all' | 'e-visit' | 'in-person')}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">
              {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="in-person" className="gap-2">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">{t('inPerson')}</span>
            </TabsTrigger>
            <TabsTrigger value="e-visit" className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">{t('eVisit')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder={t('searchPlaceholder')}
                className="ps-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Specialty selector */}
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder={t('allSpecialties')} />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty.key} value={specialty.key}>
                    {getSpecialtyLabel(specialty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Wilaya selector with auto-detect */}
            <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between gap-2 bg-transparent">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedWilaya 
                      ? `${selectedWilaya.code} - ${getWilayaName(selectedWilaya, language)}`
                      : l.selectWilaya
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={l.searchWilaya} />
                  <CommandList>
                    <CommandEmpty>{l.noResults}</CommandEmpty>
                    <CommandGroup>
                      {/* Auto-detect option */}
                      <CommandItem
                        onSelect={handleDetectLocation}
                        className="gap-2"
                      >
                        {isDetecting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        <span>{isDetecting ? l.detecting : l.detectLocation}</span>
                        {detectedWilaya && (
                          <Badge variant="secondary" className="ms-auto">
                            {l.nearYou}
                          </Badge>
                        )}
                      </CommandItem>
                      {/* All wilayas option */}
                      <CommandItem
                        onSelect={() => {
                          clearSelection()
                          setWilayaOpen(false)
                        }}
                        className="gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>{l.allWilayas}</span>
                        {!selectedWilaya && (
                          <Check className="h-4 w-4 ms-auto shrink-0" />
                        )}
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading={l.allWilayas}>
                      <ScrollArea className="h-[200px]">
                        {algeriaWilayas.map((wilaya) => (
                          <CommandItem
                            key={wilaya.code}
                            value={`${wilaya.code} ${getWilayaName(wilaya, language)}`}
                            onSelect={() => {
                              selectWilaya(wilaya)
                              setWilayaOpen(false)
                            }}
                            className="gap-2"
                          >
                            <span className="text-muted-foreground text-xs w-6 shrink-0">
                              {wilaya.code}
                            </span>
                            <span className="truncate">{getWilayaName(wilaya, language)}</span>
                            {selectedWilaya?.code === wilaya.code && (
                              <Check className="h-4 w-4 ms-auto shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* City selector (only if wilaya is selected) */}
            {selectedWilaya ? (
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between gap-2 bg-transparent">
                    <span className="truncate">
                      {selectedCity 
                        ? getCityName(selectedCity, language)
                        : l.selectCity
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={l.selectCity} />
                    <CommandList>
                      <CommandEmpty>{l.noResults}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            selectCity(null)
                            setCityOpen(false)
                          }}
                          className="gap-2"
                        >
                          <span>{language === 'ar' ? 'جميع البلديات' : language === 'fr' ? 'Toutes les communes' : 'All Cities'}</span>
                          {!selectedCity && (
                            <Check className="h-4 w-4 ms-auto" />
                          )}
                        </CommandItem>
                        {selectedWilaya.cities.map((city) => (
                          <CommandItem
                            key={city.id}
                            value={getCityName(city, language)}
                            onSelect={() => {
                              selectCity(city)
                              setCityOpen(false)
                            }}
                            className="gap-2"
                          >
                            <span>{getCityName(city, language)}</span>
                            {selectedCity?.id === city.id && (
                              <Check className="h-4 w-4 ms-auto shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Button variant="outline" className="justify-between gap-2 bg-transparent" disabled>
                <span className="text-muted-foreground">{l.selectCity}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            )}
          </div>

          {/* Active filters */}
          {(selectedWilaya || selectedCity) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {selectedWilaya && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {getWilayaName(selectedWilaya, language)}
                  {detectedWilaya?.code === selectedWilaya.code && (
                    <span className="text-xs opacity-70">({l.nearYou})</span>
                  )}
                </Badge>
              )}
              {selectedCity && (
                <Badge variant="secondary" className="gap-1">
                  {getCityName(selectedCity, language)}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleClearLocation} className="h-6 px-2 text-xs">
                <X className="h-3 w-3 me-1" />
                {l.clear}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {filteredDoctors.length} {t('doctorsFound')}
        </h1>
        <p className="text-muted-foreground">
          {selectedSpecialty !== 'all' && `${getSpecialtyLabel(specialties.find(s => s.key === selectedSpecialty)!)} • `}
          {selectedWilaya && `${getWilayaName(selectedWilaya, language)}`}
          {selectedCity && ` - ${getCityName(selectedCity, language)}`}
        </p>
      </div>

      {/* Doctor Cards */}
      <div className="grid gap-6">
        {filteredDoctors.map((doctor) => {
          const doctorWilaya = algeriaWilayas.find(w => w.code === doctor.wilayaCode)
          const doctorCity = doctorWilaya?.cities.find(c => c.id === doctor.cityId)
          
          return (
            <Card key={doctor.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-[200px_1fr_auto] gap-6 p-6">
                  {/* Doctor Image */}
                  <div className="flex justify-center md:justify-start">
                    <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                      <Stethoscope className="h-16 w-16 text-primary" />
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {language === 'ar' ? doctor.nameAr : doctor.name}
                      </h3>
                      <p className="text-muted-foreground">
                        {language === 'ar' ? doctor.specialtyAr : language === 'fr' ? doctor.specialtyFr : doctor.specialty}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-foreground">{doctor.rating}</span>
                        <span className="text-sm text-muted-foreground">({doctor.reviews} {t('reviews')})</span>
                      </div>
                      <Badge variant="secondary">
                        {doctor.experience} {t('years')} {t('experience')}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>
                          {doctorWilaya && getWilayaName(doctorWilaya, language)}
                          {doctorCity && ` - ${getCityName(doctorCity, language)}`}
                        </span>
                      </div>
                      {/* Clear availability display with working hours */}
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${doctor.isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Clock className={`h-4 w-4 shrink-0 ${doctor.isOpen ? 'text-green-600' : 'text-red-600'}`} />
                        <span className={`font-medium text-sm ${doctor.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                          {doctor.isOpen 
                            ? `${language === 'ar' ? 'مفتوح اليوم' : 'Open today'} ${doctor.opensAt} - ${doctor.closesAt}`
                            : `${language === 'ar' ? 'مغلق اليوم' : 'Closed today'}`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {doctor.supportsEVisit && (
                        <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                          <Video className="h-3 w-3 me-1" />
                          {t('eVisit')}
                        </Badge>
                      )}
                      {doctor.supportsInPerson && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <Building className="h-3 w-3 me-1" />
                          {t('inPerson')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Booking Section */}
                  <div className="flex flex-col items-center justify-between gap-4 border-t pt-4 md:border-s md:border-t-0 md:ps-6 md:pt-0">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">{t('consultation')}</div>
                      <div className="text-2xl font-bold text-primary">{doctor.price} DZD</div>
                    </div>

                    <div className="flex w-full flex-col gap-2">
                      <Link 
                        href={`/booking/new?doctor=${doctor.id}${searchParams.get('type') ? `&visitType=${searchParams.get('type')}` : ''}`} 
                        className="w-full"
                      >
                        <Button className="w-full">
                          <Calendar className="me-2 h-4 w-4" />
                          {t('bookAppointment')}
                        </Button>
                      </Link>
                      <Link href={`/doctors/${doctor.id}`} className="w-full">
                        <Button variant="outline" className="w-full bg-transparent">
                          {t('viewProfile')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredDoctors.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">{t('noResults')}</h3>
            <p className="text-muted-foreground">
              {t('tryDifferentSearch')}
            </p>
            {selectedWilaya && (
              <Button variant="link" onClick={handleClearLocation} className="mt-4">
                {l.clear} {language === 'ar' ? 'الموقع' : language === 'fr' ? 'la localisation' : 'location'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

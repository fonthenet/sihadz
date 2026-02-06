'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'
import { useLocation } from '@/hooks/use-location'
import { WILAYAS, algeriaWilayas, getWilayaName } from '@/lib/data/algeria-locations'
import {
  Search,
  Stethoscope,
  Video,
  Building,
  Navigation,
  X,
  MapPin,
  Clock,
  Heart,
} from 'lucide-react'
import { useFavorites } from '@/components/ui/favorite-button'
import {
  ProfessionalCard,
  ProfessionalCardSkeleton,
  ListingPageHeader,
  ListingEmptyState,
  type ProfessionalCardData,
} from '@/components/listing'
import Loading from './loading'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface DoctorData {
  id: string
  name: string
  nameAr: string
  specialty: string
  specialtyAr: string
  specialtyFr: string
  specialtyKey: string
  wilayaCode: string
  location: string
  locationAr: string
  rating: number
  reviews: number
  experience: number
  price: number
  isOpen: boolean
  opensAt: string
  closesAt: string
  supportsEVisit: boolean
  supportsInPerson: boolean
  avatarUrl?: string | null
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
  { key: 'psychiatry', en: 'Psychiatrist', fr: 'Psychiatre', ar: 'الطب النفسي' },
]

export default function SearchPage() {
  const { t, language, dir } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<><Header /><div className="container mx-auto px-4 py-6"><Loading /></div></>}>
        <SearchContent />
      </Suspense>

      <Footer />
    </div>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language, dir } = useLanguage()

  // State from URL
  const qFromUrl = searchParams.get('q') || ''
  const specialtyFromUrl = searchParams.get('specialty') || 'all'
  const wilayaFromUrl = searchParams.get('location') || 'all'
  const visitTypeFromUrl = (searchParams.get('type') as 'all' | 'e-visit' | 'in-person') || 'all'
  const professionalTypeFromUrl = searchParams.get('professionalType') || 'doctor'

  const [searchTerm, setSearchTerm] = useState(qFromUrl)
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialtyFromUrl)
  const [selectedWilaya, setSelectedWilaya] = useState(wilayaFromUrl)
  const [visitTypeFilter, setVisitTypeFilter] = useState(visitTypeFromUrl)
  const [professionalType, setProfessionalType] = useState(professionalTypeFromUrl || 'doctor')
  const [doctors, setDoctors] = useState<DoctorData[]>([])
  const [loading, setLoading] = useState(true)

  const { isDetecting, detectedWilaya, detectLocation } = useLocation()
  const pendingNearMeRef = useRef(false)
  const { isFavorite, toggleFavorite: updateFavoriteState } = useFavorites('doctor')

  // Sync from URL on change
  useEffect(() => {
    setSearchTerm(qFromUrl)
  }, [qFromUrl])

  // Sync professionalType from URL
  useEffect(() => {
    setProfessionalType(professionalTypeFromUrl || 'doctor')
  }, [professionalTypeFromUrl])

  // Fetch professionals (doctors or nurses)
  useEffect(() => {
    async function fetchDoctors() {
      const params = new URLSearchParams()
      if (qFromUrl) params.set('q', qFromUrl)
      if (wilayaFromUrl && wilayaFromUrl !== 'all') params.set('location', wilayaFromUrl)
      if (professionalTypeFromUrl) params.set('professionalType', professionalTypeFromUrl)

      const res = await fetch(`/api/search?${params.toString()}`)
      const { professionals } = await res.json().catch(() => ({ professionals: [] }))

      const supabase = createBrowserClient()
      const authIds = (professionals || []).map((p: any) => p.auth_user_id).filter(Boolean)
      const avatarMap: Record<string, string> = {}
      if (authIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', authIds)
        ;(profiles || []).forEach((p: any) => {
          if (p.avatar_url) avatarMap[p.id] = p.avatar_url
        })
      }

      // Calculate open/closed
      const nowUTC = new Date()
      const algeriaTime = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }))
      const currentDay = algeriaTime.getDay()
      const currentTime = algeriaTime.toTimeString().slice(0, 5)
      const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDay]

      const transformed: DoctorData[] = (professionals || [])
        .filter((p: any) => !professionalTypeFromUrl || p.type === professionalTypeFromUrl)
        .map((p: any) => {
          const workingHours = p.working_hours || {}
          const todayHours = workingHours[dayKey]
          let isOpen = false
          let opensAt = '08:00'
          let closesAt = '18:00'

          if (todayHours?.open && todayHours?.close) {
            opensAt = todayHours.open
            closesAt = todayHours.close
            isOpen = currentTime >= opensAt && currentTime <= closesAt
          }

          const specialty = Array.isArray(p.specialties) && p.specialties[0] ? p.specialties[0] : 'General Medicine'
          const specialtyKey = specialty.toLowerCase().replace(/\s+/g, '-')

          return {
            id: p.id,
            name: p.business_name || 'Doctor',
            nameAr: p.business_name_ar || p.business_name || 'طبيب',
            specialty,
            specialtyAr: specialty,
            specialtyFr: specialty,
            specialtyKey: specialtyKey === 'general-medicine' ? 'general' : specialtyKey,
            wilayaCode: (() => {
              const raw = (p.wilaya || '').trim()
              if (!raw) return '16'
              if (/^\d{1,2}$/.test(raw)) return raw.padStart(2, '0')
              const w = algeriaWilayas.find(
                (x) =>
                  x.nameFr.toLowerCase() === raw.toLowerCase() ||
                  x.nameEn.toLowerCase() === raw.toLowerCase() ||
                  x.nameAr === raw
              )
              return w ? w.code : raw
            })(),
            location: [p.commune, p.wilaya].filter(Boolean).join(', ') || 'Algiers',
            locationAr: [p.commune, p.wilaya].filter(Boolean).join(', ') || 'الجزائر',
            rating: Number(p.rating) || 4.5,
            reviews: Number(p.review_count) || 0,
            experience: 5,
            price: 2000,
            isOpen,
            opensAt,
            closesAt,
            supportsEVisit: true,
            supportsInPerson: true,
            avatarUrl: p.auth_user_id ? avatarMap[p.auth_user_id] ?? null : null,
          }
        })

      setDoctors(transformed)
      setLoading(false)
    }

    fetchDoctors()
  }, [qFromUrl, wilayaFromUrl, professionalTypeFromUrl])

  // Update URL
  const updateUrl = useCallback(
    (updates: { q?: string; specialty?: string; location?: string; type?: string; professionalType?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      router.replace(`/search?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  // Debounced search
  useEffect(() => {
    if (searchTerm === qFromUrl) return
    const t = setTimeout(() => {
      updateUrl({ q: searchTerm })
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm, qFromUrl, updateUrl])

  // Handle location detection (triggered by "Near Me" in dropdown)
  const handleDetectLocation = async () => {
    pendingNearMeRef.current = true
    setSelectedWilaya('near-me') // show "Near Me" / "Detecting..." in dropdown
    await detectLocation()
  }

  // Sync detected wilaya when "Near Me" was selected
  useEffect(() => {
    if (!pendingNearMeRef.current || isDetecting) return
    if (detectedWilaya) {
      setSelectedWilaya(detectedWilaya.code)
      updateUrl({ location: detectedWilaya.code })
    } else {
      setSelectedWilaya('all')
      updateUrl({ location: 'all' })
    }
    pendingNearMeRef.current = false
  }, [isDetecting, detectedWilaya, updateUrl])

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (selectedSpecialty !== 'all' && doc.specialtyKey !== selectedSpecialty) return false
      if (selectedWilaya !== 'all' && selectedWilaya !== 'near-me' && doc.wilayaCode !== selectedWilaya) return false
      if (visitTypeFilter === 'e-visit' && !doc.supportsEVisit) return false
      if (visitTypeFilter === 'in-person' && !doc.supportsInPerson) return false
      return true
    })
  }, [doctors, selectedSpecialty, selectedWilaya, visitTypeFilter])

  // Convert to card data
  const toCardData = (doc: DoctorData): ProfessionalCardData => ({
    id: doc.id,
    type: (professionalType === 'nurse' ? 'nurse' : 'doctor') as 'doctor' | 'nurse',
    name: doc.name,
    nameAr: doc.nameAr,
    subtitle: language === 'ar' ? doc.specialtyAr : language === 'fr' ? doc.specialtyFr : doc.specialty,
    subtitleAr: doc.specialtyAr,
    location: doc.location,
    locationAr: doc.locationAr,
    rating: doc.rating,
    reviewCount: doc.reviews,
    isOpen: doc.isOpen,
    opensAt: doc.opensAt,
    closesAt: doc.closesAt,
    avatarUrl: doc.avatarUrl,
    supportsEVisit: doc.supportsEVisit,
    supportsInPerson: doc.supportsInPerson,
    price: doc.price,
    experience: doc.experience,
  })

  const getSpecialtyLabel = (spec: (typeof specialties)[0]) => {
    return language === 'ar' ? spec.ar : language === 'fr' ? spec.fr : spec.en
  }

  const hasActiveFilters =
    selectedSpecialty !== 'all' || selectedWilaya !== 'all' || visitTypeFilter !== 'all' || searchTerm.trim()

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedSpecialty('all')
    setSelectedWilaya('all')
    setVisitTypeFilter('all')
    router.replace('/search', { scroll: false })
  }

  const labels = {
    ar: {
      doctor: {
        title: 'البحث عن طبيب',
        subtitle: 'ابحث عن أفضل الأطباء في الجزائر',
        noResults: 'لم يتم العثور على أطباء',
        results: 'طبيب',
        search: 'ابحث عن طبيب أو تخصص...',
      },
      nurse: {
        title: 'البحث عن ممرض',
        subtitle: 'ابحث عن ممرضين في الجزائر',
        noResults: 'لم يتم العثور على ممرضين',
        results: 'ممرض',
        search: 'ابحث عن ممرض أو تخصص...',
      },
      allWilayas: 'جميع الولايات',
      allTypes: 'الكل',
      inPerson: 'في العيادة',
      eVisit: 'عن بعد',
      eVisitShort: 'فيديو',
      noResultsDesc: 'جرب تغيير معايير البحث',
      nearMe: 'بالقرب مني',
      detecting: 'جاري الكشف...',
      clear: 'مسح',
    },
    fr: {
      doctor: {
        title: 'Rechercher un médecin',
        subtitle: 'Trouvez les meilleurs médecins en Algérie',
        noResults: 'Aucun médecin trouvé',
        results: 'médecins',
        search: 'Rechercher un médecin ou une spécialité...',
      },
      nurse: {
        title: 'Rechercher un infirmier',
        subtitle: 'Trouvez des infirmiers en Algérie',
        noResults: 'Aucun infirmier trouvé',
        results: 'infirmiers',
        search: 'Rechercher un infirmier...',
      },
      allWilayas: 'Toutes les wilayas',
      allTypes: 'Tous',
      inPerson: 'En cabinet',
      eVisit: 'Téléconsultation',
      eVisitShort: 'Vidéo',
      noResultsDesc: 'Essayez de modifier vos critères',
      nearMe: 'Près de moi',
      detecting: 'Détection...',
      clear: 'Effacer',
    },
    en: {
      doctor: {
        title: 'Find a Doctor',
        subtitle: 'Search for the best doctors in Algeria',
        noResults: 'No doctors found',
        results: 'doctors',
        search: 'Search for a doctor or specialty...',
      },
      nurse: {
        title: 'Find a Nurse',
        subtitle: 'Search for nurses in Algeria',
        noResults: 'No nurses found',
        results: 'nurses',
        search: 'Search for a nurse...',
      },
      allWilayas: 'All Wilayas',
      allTypes: 'All',
      inPerson: 'In-Person',
      eVisit: 'Video Consult',
      eVisitShort: 'Video',
      noResultsDesc: 'Try adjusting your search criteria',
      nearMe: 'Near Me',
      detecting: 'Detecting...',
      clear: 'Clear',
    },
  }

  const langLabels = labels[language] || labels.en
  const typeKey = professionalType === 'nurse' ? 'nurse' : 'doctor'
  const l = { ...langLabels, ...langLabels[typeKey] }

  return (
    <>
      <Header
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={l.search}
        selectedWilaya={selectedWilaya}
        onWilayaChange={(v) => {
          if (v === 'near-me') {
            handleDetectLocation()
            return
          }
          setSelectedWilaya(v)
          updateUrl({ location: v })
        }}
        isLocating={isDetecting}
        onDetectLocation={handleDetectLocation}
      />
      <main className="container mx-auto px-4 py-6">
      <ListingPageHeader title={l.title} subtitle={l.subtitle} icon={professionalType === 'nurse' ? <Heart className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />} />

      {/* Wilaya - hidden on mobile (location in header search bar) */}
      <div className="hidden md:flex flex-wrap items-center gap-2 mb-4">
        <Select
          value={selectedWilaya}
          onValueChange={(v) => {
            if (v === 'near-me') {
              handleDetectLocation()
              return
            }
            setSelectedWilaya(v)
            updateUrl({ location: v })
          }}
          disabled={isDetecting}
        >
          <SelectTrigger className="h-9 w-[260px] sm:w-[280px] shrink-0 bg-muted/30 border-0 text-sm">
            <MapPin className="h-3.5 w-3.5 me-1.5 text-muted-foreground shrink-0" />
            {isDetecting && selectedWilaya === 'near-me' ? (
              <span className="flex items-center gap-1.5">
                <LoadingSpinner size="sm" className="h-3.5 w-3.5" />
                {l.detecting}
              </span>
            ) : (
              <SelectValue placeholder={l.allWilayas} />
            )}
          </SelectTrigger>
          <SelectContent side="bottom" avoidCollisions={false}>
            <SelectItem value="all">{l.allWilayas}</SelectItem>
            <SelectItem value="near-me" className="gap-2">
              <Navigation className="h-3.5 w-3.5" />
              {l.nearMe}
            </SelectItem>
            {WILAYAS.map((w) => (
              <SelectItem key={w.code} value={w.code}>
                {language === 'ar' ? w.nameAr : w.nameFr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters - single row, fits on mobile */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-row flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-1 -mx-1">
          {/* Specialty */}
          <Select
            value={selectedSpecialty}
            onValueChange={(v) => {
              setSelectedSpecialty(v)
              updateUrl({ specialty: v })
            }}
          >
            <SelectTrigger className="h-8 flex-1 min-w-[120px] max-w-[200px] sm:w-[160px] sm:max-w-none bg-muted/30 border-0 text-xs sm:text-sm">
              <SelectValue placeholder={getSpecialtyLabel(specialties[0])} />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((spec) => (
                <SelectItem key={spec.key} value={spec.key}>
                  {getSpecialtyLabel(spec)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Visit type - inline pills */}
          <div className="inline-flex gap-1 rounded-lg bg-muted/30 p-0.5 shrink-0">
            {(['all', 'in-person', 'e-visit'] as const).map((type) => (
              <Button
                key={type}
                variant={visitTypeFilter === type ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setVisitTypeFilter(type)
                  updateUrl({ type })
                }}
                className="h-7 px-2 text-xs whitespace-nowrap"
              >
                {type === 'in-person' && <Building className="h-3 w-3 me-1 shrink-0" />}
                {type === 'e-visit' && <Video className="h-3 w-3 me-1 shrink-0" />}
                {type === 'all' ? l.allTypes : type === 'in-person' ? l.inPerson : (
                  <>
                    <span className="sm:hidden">{l.eVisitShort ?? l.eVisit}</span>
                    <span className="hidden sm:inline">{l.eVisit}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Results count + Clear */}
        <div className="flex items-center justify-between text-sm">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredDoctors.length}</span> {l.results}
          </p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 me-1" />
              {l.clear}
            </Button>
          )}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProfessionalCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <ListingEmptyState
          icon={<Search className="h-8 w-8 text-muted-foreground" />}
          title={l.noResults}
          description={l.noResultsDesc}
          action={
            <Button variant="outline" onClick={clearFilters}>
              {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDoctors.map((doc, i) => (
            <ProfessionalCard
              key={doc.id}
              data={toCardData(doc)}
              isFavorite={isFavorite(doc.id)}
              onFavoriteToggle={updateFavoriteState}
              variant={i % 2 === 1 ? 'alt' : 'default'}
            />
          ))}
        </div>
      )}
      </main>
    </>
  )
}

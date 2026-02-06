'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'
import { WILAYAS, getWilayaByCode } from '@/lib/data/algeria-locations'
import { createBrowserClient } from '@/lib/supabase/client'
import { useFavorites } from '@/components/ui/favorite-button'
import {
  ProfessionalCard,
  ProfessionalCardSkeleton,
  ListingFilters,
  ListingPageHeader,
  ListingEmptyState,
  type ProfessionalCardData,
} from '@/components/listing'
import { Button } from '@/components/ui/button'
import { Heart, Search } from 'lucide-react'

interface NurseData {
  id: string
  name: string
  nameAr: string
  address: string
  wilayaCode: string
  phone: string
  isOpen: boolean
  opensAt: string
  closesAt: string
  rating: number
  reviewCount: number
  specialty: string
  avatarUrl?: string | null
}

export default function NursesPage() {
  const { language } = useLanguage()
  const [nurses, setNurses] = useState<NurseData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [profileLocation, setProfileLocation] = useState<{ default_wilaya_code?: string } | null>(null)
  const { isFavorite, toggleFavorite: updateFavoriteState } = useFavorites('nurse')

  // Fetch user profile for location fallback
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('default_wilaya_code').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data?.default_wilaya_code) setProfileLocation(data)
        })
      }
    })
  }, [])

  // Fetch nurses
  useEffect(() => {
    async function fetchNurses() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('type', 'nurse')
        .eq('is_active', true)

      if (error || !data) {
        setLoading(false)
        return
      }

      // Fetch avatars
      const authIds = data.map((p: any) => p.auth_user_id).filter(Boolean)
      const avatarMap: Record<string, string> = {}
      if (authIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', authIds)
        ;(profiles || []).forEach((p: any) => {
          if (p.avatar_url) avatarMap[p.id] = p.avatar_url
        })
      }

      // Calculate open/closed status
      const nowUTC = new Date()
      const algeriaTime = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }))
      const currentDay = algeriaTime.getDay()
      const currentTime = algeriaTime.toTimeString().slice(0, 5)
      const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDay]

      const transformed: NurseData[] = data.map((p: any) => {
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

        const specialty = Array.isArray(p.specialties) && p.specialties[0] ? p.specialties[0] : p.specialty || 'Nursing'

        return {
          id: p.id,
          name: p.business_name || 'Nurse',
          nameAr: p.business_name_ar || p.business_name || 'ممرض',
          address: [p.address_line1, p.commune, p.wilaya].filter(Boolean).join(', ') || '',
          wilayaCode: p.wilaya || '16',
          phone: p.phone || '',
          isOpen,
          opensAt,
          closesAt,
          rating: p.rating || 4.5,
          reviewCount: p.review_count || 0,
          specialty,
          avatarUrl: p.auth_user_id ? avatarMap[p.auth_user_id] ?? null : null,
        }
      })

      setNurses(transformed)
      setLoading(false)
    }

    fetchNurses()
  }, [])

  // Detect location
  const detectLocation = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setIsLocating(false)
        },
        () => {
          if (profileLocation?.default_wilaya_code) {
            setSelectedWilaya(profileLocation.default_wilaya_code)
          }
          setIsLocating(false)
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      )
    } else {
      if (profileLocation?.default_wilaya_code) {
        setSelectedWilaya(profileLocation.default_wilaya_code)
      }
      setIsLocating(false)
    }
  }

  // Filter nurses
  const filteredNurses = nurses.filter((nurse) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!nurse.name.toLowerCase().includes(query) && !nurse.nameAr.includes(searchQuery) && !nurse.specialty.toLowerCase().includes(query)) {
        return false
      }
    }
    if (selectedWilaya !== 'all' && selectedWilaya !== 'near-me' && nurse.wilayaCode !== selectedWilaya) return false
    if (filterOpen && !nurse.isOpen) return false
    return true
  })

  // Convert to card data
  const toCardData = (nurse: NurseData): ProfessionalCardData => ({
    id: nurse.id,
    type: 'nurse',
    name: nurse.name,
    nameAr: nurse.nameAr,
    subtitle: nurse.specialty,
    location: nurse.address,
    locationAr: nurse.address,
    rating: nurse.rating,
    reviewCount: nurse.reviewCount,
    isOpen: nurse.isOpen,
    opensAt: nurse.opensAt,
    closesAt: nurse.closesAt,
    avatarUrl: nurse.avatarUrl,
    supportsEVisit: true,
    supportsInPerson: true,
    price: 1500,
  })

  const labels = {
    ar: {
      title: 'الممرضون',
      subtitle: 'ابحث عن ممرض أو ممرضة قريبة منك',
      noResults: 'لم يتم العثور على ممرضين',
      noResultsDesc: 'جرب تغيير معايير البحث',
      results: 'ممرض',
    },
    fr: {
      title: 'Infirmiers',
      subtitle: 'Trouvez un infirmier ou une infirmière près de chez vous',
      noResults: 'Aucun infirmier trouvé',
      noResultsDesc: 'Essayez de modifier vos critères de recherche',
      results: 'infirmiers',
    },
    en: {
      title: 'Nurses',
      subtitle: 'Find a nurse near you',
      noResults: 'No nurses found',
      noResultsDesc: 'Try adjusting your search criteria',
      results: 'nurses',
    },
  }

  const l = labels[language] || labels.en

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...'}
        selectedWilaya={selectedWilaya}
        onWilayaChange={setSelectedWilaya}
        isLocating={isLocating}
        onDetectLocation={detectLocation}
      />

      <main className="container mx-auto px-4 py-6">
        <ListingPageHeader
          title={l.title}
          subtitle={l.subtitle}
          icon={<Heart className="h-5 w-5" />}
        />

        {/* Filters */}
        <ListingFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedWilaya={selectedWilaya}
          onWilayaChange={setSelectedWilaya}
          showOpenFilter
          filterOpen={filterOpen}
          onOpenFilterChange={setFilterOpen}
          isLocating={isLocating}
          onDetectLocation={detectLocation}
          searchInHeader
          hideLocationOnMobile
          resultCount={filteredNurses.length}
          resultLabel={l.results}
          className="mb-6"
        />

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProfessionalCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredNurses.length === 0 ? (
          <ListingEmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground" />}
            title={l.noResults}
            description={l.noResultsDesc}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedWilaya('all')
                  setFilterOpen(false)
                }}
              >
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNurses.map((nurse, i) => (
              <ProfessionalCard
                key={nurse.id}
                data={toCardData(nurse)}
                isFavorite={isFavorite(nurse.id)}
                onFavoriteToggle={updateFavoriteState}
                variant={i % 2 === 1 ? 'alt' : 'default'}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

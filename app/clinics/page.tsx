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
import { Building2, Search } from 'lucide-react'

interface ClinicData {
  id: string
  name: string
  nameAr: string
  address: string
  wilayaCode: string
  phone: string
  email: string
  isOpen: boolean
  opensAt: string
  closesAt: string
  rating: number
  reviewCount: number
  specialties: string[]
  avatarUrl?: string | null
}

export default function ClinicsPage() {
  const { language } = useLanguage()
  const [clinics, setClinics] = useState<ClinicData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [profileLocation, setProfileLocation] = useState<{ default_wilaya_code?: string } | null>(null)
  const { isFavorite, toggleFavorite: updateFavoriteState } = useFavorites('clinic')

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

  // Fetch clinics
  useEffect(() => {
    async function fetchClinics() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('type', 'clinic')
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

      const transformed: ClinicData[] = data.map((p: any) => {
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

        return {
          id: p.id,
          name: p.business_name || 'Clinic',
          nameAr: p.business_name_ar || p.business_name || 'عيادة',
          address: [p.address_line1, p.commune, p.wilaya].filter(Boolean).join(', ') || '',
          wilayaCode: p.wilaya || '16',
          phone: p.phone || '',
          email: p.email || '',
          isOpen,
          opensAt,
          closesAt,
          rating: p.rating || 4.5,
          reviewCount: p.review_count || 0,
          specialties: p.specialties || [],
          avatarUrl: p.auth_user_id ? avatarMap[p.auth_user_id] ?? null : null,
        }
      })

      setClinics(transformed)
      setLoading(false)
    }

    fetchClinics()
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

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!clinic.name.toLowerCase().includes(query) && !clinic.nameAr.includes(searchQuery)) {
        return false
      }
    }
    if (selectedWilaya !== 'all' && clinic.wilayaCode !== selectedWilaya) return false
    if (filterOpen && !clinic.isOpen) return false
    return true
  })

  // Convert to card data
  const toCardData = (clinic: ClinicData): ProfessionalCardData => ({
    id: clinic.id,
    type: 'clinic',
    name: clinic.name,
    nameAr: clinic.nameAr,
    subtitle: clinic.specialties.length > 0 ? clinic.specialties.slice(0, 2).join(', ') : undefined,
    location: clinic.address,
    locationAr: clinic.address,
    rating: clinic.rating,
    reviewCount: clinic.reviewCount,
    isOpen: clinic.isOpen,
    opensAt: clinic.opensAt,
    closesAt: clinic.closesAt,
    avatarUrl: clinic.avatarUrl,
    specialties: clinic.specialties,
  })

  const labels = {
    ar: {
      title: 'العيادات',
      subtitle: 'ابحث عن عيادة قريبة منك',
      noResults: 'لم يتم العثور على عيادات',
      noResultsDesc: 'جرب تغيير معايير البحث',
      results: 'عيادة',
    },
    fr: {
      title: 'Cliniques',
      subtitle: 'Trouvez une clinique près de chez vous',
      noResults: 'Aucune clinique trouvée',
      noResultsDesc: 'Essayez de modifier vos critères de recherche',
      results: 'cliniques',
    },
    en: {
      title: 'Clinics',
      subtitle: 'Find a clinic near you',
      noResults: 'No clinics found',
      noResultsDesc: 'Try adjusting your search criteria',
      results: 'clinics',
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
          icon={<Building2 className="h-5 w-5" />}
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
          resultCount={filteredClinics.length}
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
        ) : filteredClinics.length === 0 ? (
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
            {filteredClinics.map((clinic, i) => (
              <ProfessionalCard
                key={clinic.id}
                data={toCardData(clinic)}
                isFavorite={isFavorite(clinic.id)}
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

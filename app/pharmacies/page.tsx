'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pill, Moon, Search } from 'lucide-react'

interface PharmacyData {
  id: string
  name: string
  nameAr: string
  address: string
  wilayaCode: string
  phone: string
  isOpen: boolean
  isOnDuty: boolean
  opensAt: string
  closesAt: string
  rating: number
  reviewCount: number
  hasDelivery: boolean
  is24h: boolean
  avatarUrl?: string | null
}

export default function PharmaciesPage() {
  const { t, language } = useLanguage()
  const [pharmacies, setPharmacies] = useState<PharmacyData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterOnDuty, setFilterOnDuty] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [profileLocation, setProfileLocation] = useState<{ default_wilaya_code?: string } | null>(null)
  const { isFavorite, toggleFavorite: updateFavoriteState } = useFavorites('pharmacy')

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

  // Fetch pharmacies
  useEffect(() => {
    async function fetchPharmacies() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('type', 'pharmacy')
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

      const transformed: PharmacyData[] = data.map((p: any) => {
        const workingHours = p.working_hours || {}
        const todayHours = workingHours[dayKey]
        let isOpen = false
        let opensAt = '08:00'
        let closesAt = '20:00'

        if (todayHours?.open && todayHours?.close) {
          opensAt = todayHours.open
          closesAt = todayHours.close
          isOpen = currentTime >= opensAt && currentTime <= closesAt
        }

        return {
          id: p.id,
          name: p.business_name || 'Pharmacy',
          nameAr: p.business_name_ar || p.business_name || 'صيدلية',
          address: [p.address_line1, p.commune, p.wilaya].filter(Boolean).join(', ') || '',
          wilayaCode: p.wilaya || '16',
          phone: p.phone || '',
          isOpen,
          isOnDuty: p.is_on_duty || false,
          opensAt,
          closesAt,
          rating: p.rating || 4.5,
          reviewCount: p.review_count || 0,
          hasDelivery: p.has_delivery || false,
          is24h: p.is_24h || false,
          avatarUrl: p.auth_user_id ? avatarMap[p.auth_user_id] ?? null : null,
        }
      })

      setPharmacies(transformed)
      setLoading(false)
    }

    fetchPharmacies()
  }, [])

  // Detect location
  const detectLocation = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // In a real app, would reverse geocode to find wilaya
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

  // Filter pharmacies
  const filteredPharmacies = pharmacies.filter((ph) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!ph.name.toLowerCase().includes(query) && !ph.nameAr.includes(searchQuery)) {
        return false
      }
    }
    if (selectedWilaya !== 'all' && ph.wilayaCode !== selectedWilaya) return false
    if (filterOpen && !ph.isOpen) return false
    if (filterOnDuty && !ph.isOnDuty) return false
    return true
  })

  const onDutyCount = pharmacies.filter((ph) => ph.isOnDuty).length

  // Convert to card data
  const toCardData = (ph: PharmacyData): ProfessionalCardData => ({
    id: ph.id,
    type: 'pharmacy',
    name: ph.name,
    nameAr: ph.nameAr,
    location: ph.address,
    locationAr: ph.address,
    rating: ph.rating,
    reviewCount: ph.reviewCount,
    isOpen: ph.isOpen,
    opensAt: ph.opensAt,
    closesAt: ph.closesAt,
    avatarUrl: ph.avatarUrl,
    isOnDuty: ph.isOnDuty,
    hasDelivery: ph.hasDelivery,
    is24h: ph.is24h,
  })

  const labels = {
    ar: {
      title: 'الصيدليات',
      subtitle: 'ابحث عن أقرب صيدلية إليك',
      onDutyAlert: 'صيدليات الحراسة',
      onDutyCount: 'صيدلية حراسة متاحة',
      showOnDuty: 'عرض الحراسة فقط',
      showAll: 'عرض الكل',
      noResults: 'لم يتم العثور على صيدليات',
      noResultsDesc: 'جرب تغيير معايير البحث',
      results: 'صيدلية',
    },
    fr: {
      title: 'Pharmacies',
      subtitle: 'Trouvez la pharmacie la plus proche',
      onDutyAlert: 'Pharmacies de garde',
      onDutyCount: 'pharmacies de garde disponibles',
      showOnDuty: 'Garde uniquement',
      showAll: 'Afficher tout',
      noResults: 'Aucune pharmacie trouvée',
      noResultsDesc: 'Essayez de modifier vos critères de recherche',
      results: 'pharmacies',
    },
    en: {
      title: 'Pharmacies',
      subtitle: 'Find the nearest pharmacy',
      onDutyAlert: 'On-Duty Pharmacies',
      onDutyCount: 'on-duty pharmacies available',
      showOnDuty: 'On-Duty Only',
      showAll: 'Show All',
      noResults: 'No pharmacies found',
      noResultsDesc: 'Try adjusting your search criteria',
      results: 'pharmacies',
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
          icon={<Pill className="h-5 w-5" />}
        />

        {/* On-Duty Alert */}
        {onDutyCount > 0 && (
          <div className="mb-6 flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Moon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">{l.onDutyAlert}</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {onDutyCount} {l.onDutyCount}
                </p>
              </div>
            </div>
            <Button
              variant={filterOnDuty ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterOnDuty(!filterOnDuty)}
              className={filterOnDuty ? '' : 'bg-white dark:bg-background'}
            >
              {filterOnDuty ? l.showAll : l.showOnDuty}
            </Button>
          </div>
        )}

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
          resultCount={filteredPharmacies.length}
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
        ) : filteredPharmacies.length === 0 ? (
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
                  setFilterOnDuty(false)
                }}
              >
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPharmacies.map((ph, i) => (
              <ProfessionalCard
                key={ph.id}
                data={toCardData(ph)}
                isFavorite={isFavorite(ph.id)}
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

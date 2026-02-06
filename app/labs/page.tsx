'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { useFavorites } from '@/components/ui/favorite-button'
import { useLocation } from '@/hooks/use-location'
import {
  ProfessionalCard,
  ProfessionalCardSkeleton,
  ListingFilters,
  ListingPageHeader,
  ListingEmptyState,
  type ProfessionalCardData,
} from '@/components/listing'
import { Button } from '@/components/ui/button'
import { FlaskConical, Search } from 'lucide-react'

interface LabData {
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
  hasHomeCollection: boolean
  avatarUrl?: string | null
}

export default function LaboratoriesPage() {
  const { language } = useLanguage()
  const [laboratories, setLaboratories] = useState<LabData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const { isFavorite, toggleFavorite: updateFavoriteState } = useFavorites('laboratory')
  const { isDetecting, detectLocation } = useLocation()

  // Fetch laboratories
  useEffect(() => {
    async function fetchLabs() {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('type', 'laboratory')
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

      const transformed: LabData[] = data.map((p: any) => {
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
          name: p.business_name || 'Laboratory',
          nameAr: p.business_name_ar || p.business_name || 'مختبر',
          address: [p.address_line1, p.commune, p.wilaya].filter(Boolean).join(', ') || '',
          wilayaCode: p.wilaya || '16',
          phone: p.phone || '',
          email: p.email || '',
          isOpen,
          opensAt,
          closesAt,
          rating: p.rating || 4.5,
          reviewCount: p.review_count || 0,
          hasHomeCollection: p.has_home_collection || false,
          avatarUrl: p.auth_user_id ? avatarMap[p.auth_user_id] ?? null : null,
        }
      })

      setLaboratories(transformed)
      setLoading(false)
    }

    fetchLabs()
  }, [])

  // Handle location detection
  const handleDetectLocation = async () => {
    const wilaya = await detectLocation()
    if (wilaya) {
      setSelectedWilaya(wilaya.code)
    }
  }

  // Filter laboratories
  const filteredLabs = laboratories.filter((lab) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!lab.name.toLowerCase().includes(query) && !lab.nameAr.includes(searchQuery)) {
        return false
      }
    }
    if (selectedWilaya !== 'all' && lab.wilayaCode !== selectedWilaya) return false
    if (filterOpen && !lab.isOpen) return false
    return true
  })

  // Convert to card data
  const toCardData = (lab: LabData): ProfessionalCardData => ({
    id: lab.id,
    type: 'laboratory',
    name: lab.name,
    nameAr: lab.nameAr,
    location: lab.address,
    locationAr: lab.address,
    rating: lab.rating,
    reviewCount: lab.reviewCount,
    isOpen: lab.isOpen,
    opensAt: lab.opensAt,
    closesAt: lab.closesAt,
    avatarUrl: lab.avatarUrl,
    hasHomeCollection: lab.hasHomeCollection,
  })

  const labels = {
    ar: {
      title: 'المختبرات',
      subtitle: 'ابحث عن مختبر قريب منك',
      noResults: 'لم يتم العثور على مختبرات',
      noResultsDesc: 'جرب تغيير معايير البحث',
      results: 'مختبر',
    },
    fr: {
      title: 'Laboratoires',
      subtitle: 'Trouvez un laboratoire près de chez vous',
      noResults: 'Aucun laboratoire trouvé',
      noResultsDesc: 'Essayez de modifier vos critères de recherche',
      results: 'laboratoires',
    },
    en: {
      title: 'Laboratories',
      subtitle: 'Find a laboratory near you',
      noResults: 'No laboratories found',
      noResultsDesc: 'Try adjusting your search criteria',
      results: 'laboratories',
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
        isLocating={isDetecting}
        onDetectLocation={handleDetectLocation}
      />

      <main className="container mx-auto px-4 py-6">
        <ListingPageHeader
          title={l.title}
          subtitle={l.subtitle}
          icon={<FlaskConical className="h-5 w-5" />}
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
          isLocating={isDetecting}
          onDetectLocation={handleDetectLocation}
          searchInHeader
          hideLocationOnMobile
          additionalFilters={
            <div className="flex gap-1 rounded-lg bg-muted/30 p-0.5 w-fit">
              <span className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md bg-background shadow-sm border border-transparent">
                {l.title}
              </span>
            </div>
          }
          resultCount={filteredLabs.length}
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
        ) : filteredLabs.length === 0 ? (
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
            {filteredLabs.map((lab, i) => (
              <ProfessionalCard
                key={lab.id}
                data={toCardData(lab)}
                isFavorite={isFavorite(lab.id)}
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

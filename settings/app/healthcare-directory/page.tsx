'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Bed,
  Stethoscope,
  Filter,
  Navigation,
  Hospital,
  Heart,
  Shield,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { 
  HEALTHCARE_FACILITIES, 
  FACILITY_TYPES, 
  MEDICAL_SPECIALTIES,
  getFacilitiesByWilaya,
  getFacilitiesByType,
  searchFacilities,
  getEmergencyFacilities,
  type HealthcareFacility,
  type FacilityType
} from '@/lib/data/healthcare-facilities'
import { WILAYAS } from '@/lib/data/algeria-locations'
import { useSearchParams } from 'next/navigation'
import { openGoogleMapsDirections } from '@/lib/maps'
import Loading from './loading'

export default function HealthcareDirectoryPage() {
  const { t, language, dir } = useLanguage()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all')
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false)
  const [showPublicOnly, setShowPublicOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const filteredFacilities = useMemo(() => {
    let results = [...HEALTHCARE_FACILITIES]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(f => 
        f.name[language].toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query) ||
        f.specialties?.some(s => MEDICAL_SPECIALTIES[s as keyof typeof MEDICAL_SPECIALTIES]?.[language]?.toLowerCase().includes(query))
      )
    }

    // Wilaya filter
    if (selectedWilaya !== 'all') {
      results = results.filter(f => f.wilayaCode === selectedWilaya)
    }

    // Type filter
    if (selectedType !== 'all') {
      results = results.filter(f => f.type === selectedType)
    }

    // Specialty filter
    if (selectedSpecialty !== 'all') {
      results = results.filter(f => f.specialties?.includes(selectedSpecialty))
    }

    // Emergency filter
    if (showEmergencyOnly) {
      results = results.filter(f => f.emergencyServices)
    }

    // Public only filter
    if (showPublicOnly) {
      results = results.filter(f => f.isPublic)
    }

    return results
  }, [searchQuery, selectedWilaya, selectedType, selectedSpecialty, showEmergencyOnly, showPublicOnly, language])

  const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage)
  const paginatedFacilities = filteredFacilities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const stats = useMemo(() => ({
    total: HEALTHCARE_FACILITIES.length,
    chu: HEALTHCARE_FACILITIES.filter(f => f.type === 'chu').length,
    eph: HEALTHCARE_FACILITIES.filter(f => f.type === 'eph').length,
    clinics: HEALTHCARE_FACILITIES.filter(f => f.type === 'clinic').length,
    emergency: HEALTHCARE_FACILITIES.filter(f => f.emergencyServices).length,
  }), [])

  const getTypeIcon = (type: FacilityType) => {
    switch (type) {
      case 'chu': return <Hospital className="h-5 w-5" />
      case 'cac': return <Heart className="h-5 w-5" />
      case 'ehs': return <Shield className="h-5 w-5" />
      default: return <Building2 className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: FacilityType) => {
    switch (type) {
      case 'chu': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'cac': return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'ehs': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'clinic': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getWilayaName = (code: string) => {
    const wilaya = WILAYAS.find(w => w.code === code)
    return wilaya ? wilaya.name[language] : code
  }

  const labels = {
    ar: {
      title: 'دليل المستشفيات والعيادات',
      subtitle: 'ابحث عن أفضل المرافق الصحية في الجزائر',
      search: 'ابحث عن مستشفى أو عيادة...',
      allWilayas: 'كل الولايات',
      allTypes: 'كل الأنواع',
      allSpecialties: 'كل التخصصات',
      emergencyOnly: 'طوارئ فقط',
      publicOnly: 'عمومي فقط',
      filters: 'التصفية',
      results: 'نتيجة',
      beds: 'سرير',
      emergency: 'طوارئ 24/7',
      directions: 'الاتجاهات',
      call: 'اتصل',
      viewDetails: 'عرض التفاصيل',
      stats: {
        total: 'إجمالي المرافق',
        chu: 'مستشفيات جامعية',
        eph: 'مستشفيات عمومية',
        clinics: 'عيادات خاصة',
        emergency: 'خدمات طوارئ'
      },
      noResults: 'لم يتم العثور على نتائج',
      tryDifferent: 'جرب البحث بكلمات مختلفة أو غير التصفية',
      specialties: 'التخصصات',
      page: 'صفحة',
      of: 'من'
    },
    fr: {
      title: 'Annuaire des Hôpitaux et Cliniques',
      subtitle: 'Trouvez les meilleurs établissements de santé en Algérie',
      search: 'Rechercher un hôpital ou une clinique...',
      allWilayas: 'Toutes les Wilayas',
      allTypes: 'Tous les Types',
      allSpecialties: 'Toutes les Spécialités',
      emergencyOnly: 'Urgences uniquement',
      publicOnly: 'Public uniquement',
      filters: 'Filtres',
      results: 'résultats',
      beds: 'lits',
      emergency: 'Urgences 24/7',
      directions: 'Itinéraire',
      call: 'Appeler',
      viewDetails: 'Voir détails',
      stats: {
        total: 'Total établissements',
        chu: 'CHU',
        eph: 'Hôpitaux publics',
        clinics: 'Cliniques privées',
        emergency: 'Services d\'urgence'
      },
      noResults: 'Aucun résultat trouvé',
      tryDifferent: 'Essayez avec d\'autres mots-clés ou modifiez les filtres',
      specialties: 'Spécialités',
      page: 'Page',
      of: 'sur'
    },
    en: {
      title: 'Hospitals & Clinics Directory',
      subtitle: 'Find the best healthcare facilities in Algeria',
      search: 'Search for a hospital or clinic...',
      allWilayas: 'All Wilayas',
      allTypes: 'All Types',
      allSpecialties: 'All Specialties',
      emergencyOnly: 'Emergency only',
      publicOnly: 'Public only',
      filters: 'Filters',
      results: 'results',
      beds: 'beds',
      emergency: 'Emergency 24/7',
      directions: 'Directions',
      call: 'Call',
      viewDetails: 'View Details',
      stats: {
        total: 'Total Facilities',
        chu: 'University Hospitals',
        eph: 'Public Hospitals',
        clinics: 'Private Clinics',
        emergency: 'Emergency Services'
      },
      noResults: 'No results found',
      tryDifferent: 'Try different keywords or change filters',
      specialties: 'Specialties',
      page: 'Page',
      of: 'of'
    }
  }

  const l = labels[language]

  return (
    <div className={`min-h-screen bg-background ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{l.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{l.subtitle}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">{l.stats.total}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-600">{stats.chu}</div>
              <div className="text-xs text-muted-foreground">{l.stats.chu}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-purple-600">{stats.eph}</div>
              <div className="text-xs text-muted-foreground">{l.stats.eph}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{stats.clinics}</div>
              <div className="text-xs text-muted-foreground">{l.stats.clinics}</div>
            </CardContent>
          </Card>
          <Card className="text-center col-span-2 md:col-span-1">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-red-600">{stats.emergency}</div>
              <div className="text-xs text-muted-foreground">{l.stats.emergency}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <Input
                type="text"
                placeholder={l.search}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className={`${dir === 'rtl' ? 'pr-10 text-right' : 'pl-10'} h-12`}
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Select value={selectedWilaya} onValueChange={(v) => { setSelectedWilaya(v); setCurrentPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder={l.allWilayas} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l.allWilayas}</SelectItem>
                  {WILAYAS.map(w => (
                    <SelectItem key={w.code} value={w.code}>
                      {w.code} - {w.name[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setCurrentPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder={l.allTypes} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l.allTypes}</SelectItem>
                  {Object.entries(FACILITY_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSpecialty} onValueChange={(v) => { setSelectedSpecialty(v); setCurrentPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder={l.allSpecialties} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l.allSpecialties}</SelectItem>
                  {Object.entries(MEDICAL_SPECIALTIES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant={showEmergencyOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setShowEmergencyOnly(!showEmergencyOnly); setCurrentPage(1) }}
                  className={`flex-1 ${showEmergencyOnly ? '' : 'bg-transparent'}`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span className="hidden sm:inline ms-1">{l.emergencyOnly}</span>
                </Button>
                <Button
                  variant={showPublicOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setShowPublicOnly(!showPublicOnly); setCurrentPage(1) }}
                  className={`flex-1 ${showPublicOnly ? '' : 'bg-transparent'}`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline ms-1">{l.publicOnly}</span>
                </Button>
              </div>
            </div>

            {/* Results Count */}
            <div className={`text-sm text-muted-foreground ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              {filteredFacilities.length} {l.results}
            </div>
          </CardContent>
        </Card>

        {/* Results Grid */}
        {paginatedFacilities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {paginatedFacilities.map(facility => (
                <Card key={facility.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-2 rounded-lg ${getTypeColor(facility.type)}`}>
                        {getTypeIcon(facility.type)}
                      </div>
                      <div className={`flex-1 min-w-0 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        <CardTitle className="text-base line-clamp-2">{facility.name[language]}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {FACILITY_TYPES[facility.type][language]}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Location */}
                    <div className={`flex items-center gap-2 text-sm text-muted-foreground mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{facility.city}, {getWilayaName(facility.wilayaCode)}</span>
                    </div>

                    {/* Beds */}
                    {facility.beds && (
                      <div className={`flex items-center gap-2 text-sm text-muted-foreground mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Bed className="h-4 w-4 flex-shrink-0" />
                        <span>{facility.beds} {l.beds}</span>
                      </div>
                    )}

                    {/* Rating */}
                    {facility.rating && (
                      <div className={`flex items-center gap-2 text-sm mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{facility.rating}</span>
                        <span className="text-muted-foreground">({facility.reviewCount})</span>
                      </div>
                    )}

                    {/* Tags */}
                    <div className={`flex flex-wrap gap-2 mb-4 ${dir === 'rtl' ? 'justify-end' : 'justify-start'}`}>
                      {facility.emergencyServices && (
                        <Badge variant="destructive" className="text-xs">
                          {l.emergency}
                        </Badge>
                      )}
                      {facility.isPublic ? (
                        <Badge variant="secondary" className="text-xs">
                          {language === 'ar' ? 'عمومي' : language === 'fr' ? 'Public' : 'Public'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {language === 'ar' ? 'خاص' : language === 'fr' ? 'Privé' : 'Private'}
                        </Badge>
                      )}
                    </div>

                    {/* Specialties Preview */}
                    {facility.specialties && facility.specialties.length > 0 && (
                      <div className={`text-xs text-muted-foreground mb-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        <span className="font-medium">{l.specialties}: </span>
                        {facility.specialties.slice(0, 3).map(s => 
                          MEDICAL_SPECIALTIES[s as keyof typeof MEDICAL_SPECIALTIES]?.[language]
                        ).join(', ')}
                        {facility.specialties.length > 3 && ` +${facility.specialties.length - 3}`}
                      </div>
                    )}

                    {/* Actions */}
                    <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      {facility.phone && facility.phone[0] && (
                        <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent">
                          <a href={`tel:${facility.phone[0]}`}>
                            <Phone className="h-4 w-4" />
                            <span className="ms-1">{l.call}</span>
                          </a>
                        </Button>
                      )}
                      {(facility.coordinates || facility.city || facility.address) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-transparent"
                          onClick={() => openGoogleMapsDirections({
                            lat: facility.coordinates?.lat,
                            lng: facility.coordinates?.lng,
                            address: facility.address?.[language] || facility.address?.fr || facility.address?.ar || [facility.name[language], facility.city, getWilayaName(facility.wilayaCode)].filter(Boolean).join(', ') || undefined,
                          })}
                        >
                          <Navigation className="h-4 w-4" />
                          <span className="ms-1">{l.directions}</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-transparent"
                >
                  {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {l.page} {currentPage} {l.of} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-transparent"
                >
                  {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{l.noResults}</h3>
              <p className="text-muted-foreground">{l.tryDifferent}</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}

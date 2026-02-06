'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/header'
import { useLanguage } from '@/lib/i18n/language-context'
import { WILAYAS, type Wilaya } from '@/lib/data/algeria-locations'
import { 
  Pill,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Star,
  Heart,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sun,
  Moon,
  ExternalLink
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { openGoogleMapsDirections } from '@/lib/maps'
import { useSearchParams } from 'next/navigation'
import Loading from './loading'
import { createBrowserClient } from '@/lib/supabase/client'

interface Pharmacy {
  id: string
  name: string
  nameAr: string
  address: string
  addressAr: string
  wilayaCode: string
  phone: string
  isOpen: boolean
  isOnDuty: boolean
  openUntil: string
  opensAt: string
  rating: number
  reviewCount: number
  distance: number
  lat: number
  lng: number
  isFavorite: boolean
  services: string[]
  hasDelivery: boolean
  is24h: boolean
}

export default function PharmacyFinderPage() {
  const { t, language, dir } = useLanguage()
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState<string>('all')
  const [filterOnDuty, setFilterOnDuty] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const searchParams = useSearchParams()

  // Fetch pharmacies from database
  useEffect(() => {
    async function fetchPharmacies() {
      const supabase = createBrowserClient()
      
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('type', 'pharmacy')
        .eq('is_active', true)
      
      if (error) {
        setLoading(false)
        return
      }
      
      if (data) {
        const transformedPharmacies: Pharmacy[] = data.map(p => {
          // Parse working hours from database with Algeria timezone
          const workingHours = p.working_hours || {}
          
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
          let closesAt = '20:00'
          
          if (todayHours && todayHours.open && todayHours.close) {
            opensAt = todayHours.open
            closesAt = todayHours.close
            // Compare times (HH:MM format)
            isOpen = currentTime >= opensAt && currentTime <= closesAt
          }
          
          return {
            id: p.id,
            name: p.business_name || 'Pharmacy',
            nameAr: p.business_name_ar || p.business_name || 'صيدلية',
            address: p.address_line1 || '',
            addressAr: p.address_line1 || '',
            wilayaCode: p.wilaya || '16',
            phone: p.phone || '',
            isOpen,
            isOnDuty: p.is_on_duty || false,
            openUntil: closesAt,
            opensAt,
            rating: p.rating || 4.5,
            reviewCount: p.review_count || 0,
            distance: 0,
            lat: 36.7538,
            lng: 3.0588,
            isFavorite: false,
            services: ['prescription'],
            hasDelivery: p.has_delivery || false,
            is24h: p.is_24h || false
          }
        })
        setPharmacies(transformedPharmacies)
      }
      setLoading(false)
    }
    
    fetchPharmacies()
  }, [])

  const detectLocation = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setIsLocating(false)
          // In production, would recalculate distances based on user location
        },
        () => {
          setIsLocating(false)
          alert(language === 'ar' ? 'تعذر تحديد موقعك' : 'Could not detect your location')
        }
      )
    }
  }

  const getDirections = (pharmacy: Pharmacy) => {
    openGoogleMapsDirections({
      lat: pharmacy.lat,
      lng: pharmacy.lng,
      address: pharmacy.address,
    })
  }

  const toggleFavorite = async (id: string) => {
    // Check if user is authenticated
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first')
      return
    }
    
    setPharmacies(pharmacies.map(ph => 
      ph.id === id ? { ...ph, isFavorite: !ph.isFavorite } : ph
    ))
  }

  const filteredPharmacies = pharmacies.filter(ph => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = ph.name.toLowerCase().includes(query) || ph.nameAr.includes(searchQuery)
      const matchesAddress = ph.address.toLowerCase().includes(query) || ph.addressAr.includes(searchQuery)
      if (!matchesName && !matchesAddress) return false
    }
    if (selectedWilaya !== 'all' && ph.wilayaCode !== selectedWilaya) return false
    if (filterOnDuty && !ph.isOnDuty) return false
    if (filterOpen && !ph.isOpen) return false
    return true
  }).sort((a, b) => {
    // Sort by distance only, keep favorites in place
    return a.distance - b.distance
  })

  const onDutyPharmacies = pharmacies.filter(ph => ph.isOnDuty)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('findPharmacy')}</h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'ابحث عن أقرب صيدلية إليك' : language === 'fr' ? 'Trouvez la pharmacie la plus proche' : 'Find the nearest pharmacy'}
          </p>
        </div>

        {/* On-Duty Alert */}
        {onDutyPharmacies.length > 0 && (
          <Card className="mb-6 border-secondary bg-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                  <Moon className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{t('pharmacyOnDuty')}</p>
                  <p className="text-sm text-muted-foreground">
                    {onDutyPharmacies.length} {language === 'ar' ? 'صيدلية حراسة متاحة' : language === 'fr' ? 'pharmacies de garde disponibles' : 'on-duty pharmacies available'}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setFilterOnDuty(!filterOnDuty)}>
                  {filterOnDuty ? (language === 'ar' ? 'عرض الكل' : 'Show All') : (language === 'ar' ? 'عرض الحراسة فقط' : 'Show On-Duty Only')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث عن صيدلية...' : language === 'fr' ? 'Rechercher une pharmacie...' : 'Search for a pharmacy...'}
                  className="ps-9"
                />
              </div>

              <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder={t('wilaya')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCities')}</SelectItem>
                  {WILAYAS.map(w => (
                    <SelectItem key={w.code} value={w.code}>
                      {language === 'ar' ? w.nameAr : w.nameFr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={filterOpen ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={!filterOpen ? 'bg-transparent' : ''}
                >
                  <Sun className="h-4 w-4 me-1" />
                  {t('openNow')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="bg-transparent"
                >
                  {isLocating ? (
                    <LoadingSpinner size="sm" className="me-1" />
                  ) : (
                    <Navigation className="h-4 w-4 me-1" />
                  )}
                  {language === 'ar' ? 'موقعي' : 'Near Me'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground">
            {filteredPharmacies.length} {language === 'ar' ? 'صيدلية' : language === 'fr' ? 'pharmacies' : 'pharmacies'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPharmacies.map(pharmacy => (
            <Card key={pharmacy.id} className="hover:shadow-lg transition-shadow overflow-hidden border">
              <CardContent className="p-0">
                {/* Header with icon - Blue/White theme with orange accent for on-duty */}
                <div className={`p-4 flex items-center gap-4 ${pharmacy.isOnDuty ? 'bg-orange-50' : 'bg-blue-50'}`}>
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${pharmacy.isOnDuty ? 'bg-orange-100' : 'bg-primary/10'}`}>
                    <Pill className={`h-7 w-7 ${pharmacy.isOnDuty ? 'text-orange-600' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {language === 'ar' ? pharmacy.nameAr : pharmacy.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{pharmacy.rating}</span>
                        <span className="text-sm text-muted-foreground">({pharmacy.reviewCount})</span>
                      </div>
                      {pharmacy.isOnDuty && (
                        <Badge className="bg-orange-600 text-white text-xs">
                          <Moon className="h-3 w-3 mr-1" />
                          {t('pharmacyOnDuty')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleFavorite(pharmacy.id)}
                  >
                    <Heart className={`h-5 w-5 ${pharmacy.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  {/* Location */}
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {language === 'ar' ? pharmacy.addressAr : pharmacy.address}
                    </span>
                  </div>

                  {/* Hours - Clear availability display */}
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${pharmacy.isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                    <Clock className={`h-4 w-4 ${pharmacy.isOpen ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`font-medium text-sm ${pharmacy.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                      {pharmacy.isOpen 
                        ? `${language === 'ar' ? 'مفتوح اليوم' : 'Open today'} ${pharmacy.opensAt} - ${pharmacy.openUntil}`
                        : `${language === 'ar' ? 'مغلق اليوم' : 'Closed today'}`
                      }
                    </span>
                  </div>

                  {/* Service Badges */}
                  <div className="flex flex-wrap gap-2">
                    {pharmacy.hasDelivery && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {language === 'ar' ? 'توصيل' : 'Delivery'}
                      </Badge>
                    )}
                    {pharmacy.is24h && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {language === 'ar' ? '24 ساعة' : '24 Hours'}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/pharmacies/${pharmacy.id}`} className="flex-1">
                      <Button className="w-full" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => getDirections(pharmacy)}
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-transparent"
                      asChild
                    >
                      <a href={`tel:${pharmacy.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPharmacies.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Pill className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('noResults')}</h3>
              <p className="text-muted-foreground">{t('tryDifferentSearch')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

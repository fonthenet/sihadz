'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'
import { WILAYAS } from '@/lib/data/algeria-locations'
import { 
  Building2,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Star,
  Heart,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  Stethoscope,
  Users
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { openGoogleMapsDirections } from '@/lib/maps'
import { createBrowserClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from './loading'

interface Clinic {
  id: string
  name: string
  nameAr: string
  address: string
  addressAr: string
  wilayaCode: string
  phone: string
  email: string
  isOpen: boolean
  openUntil: string
  opensAt: string
  rating: number
  reviewCount: number
  distance: number
  lat: number
  lng: number
  isFavorite: boolean
  specialties: string[]
  licenseNumber: string
}

export default function ClinicsPage() {
  const { t, language } = useLanguage()
  const searchParams = useSearchParams()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState<string>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    async function fetchClinics() {
      const supabase = createBrowserClient()
      
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('is_active', true)
      
      if (error) {
        setLoading(false)
        return
      }
      
      if (data) {
        const transformedClinics: Clinic[] = data.map(c => {
          // Parse working hours from database with Algeria timezone
          const workingHours = c.working_hours || {}
          
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
            id: c.id,
            name: c.name || 'Clinic',
            nameAr: c.name_ar || 'عيادة',
            address: c.address || '',
            addressAr: c.address_ar || '',
            wilayaCode: c.wilaya_code || '16',
            phone: c.phone || '',
            email: c.email || '',
            isOpen,
            openUntil: closesAt,
            opensAt,
            rating: c.rating || 4.5,
            reviewCount: c.review_count || 0,
            distance: 0,
            lat: c.latitude || 36.7538,
            lng: c.longitude || 3.0588,
            isFavorite: false,
            specialties: c.specialties || ['general_medicine'],
            licenseNumber: c.license_number || ''
          }
        })
        setClinics(transformedClinics)
      }
      setLoading(false)
    }
    
    fetchClinics()
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
        },
        () => {
          setIsLocating(false)
          alert(language === 'ar' ? 'تعذر تحديد موقعك' : 'Could not detect your location')
        }
      )
    }
  }

  const getDirections = (clinic: Clinic) => {
    openGoogleMapsDirections({
      lat: clinic.lat,
      lng: clinic.lng,
      address: clinic.address,
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
    
    setClinics(clinics.map(clinic => 
      clinic.id === id ? { ...clinic, isFavorite: !clinic.isFavorite } : clinic
    ))
  }

  const filteredClinics = clinics.filter(clinic => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = clinic.name.toLowerCase().includes(query) || clinic.nameAr.includes(searchQuery)
      const matchesAddress = clinic.address.toLowerCase().includes(query)
      if (!matchesName && !matchesAddress) return false
    }
    if (selectedWilaya !== 'all' && clinic.wilayaCode !== selectedWilaya) return false
    if (filterOpen && !clinic.isOpen) return false
    return true
  }).sort((a, b) => {
    // Sort by distance only, keep favorites in place
    return a.distance - b.distance
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'العيادات الطبية' : language === 'fr' ? 'Cliniques Médicales' : 'Medical Clinics'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'ابحث عن أقرب عيادة إليك' : language === 'fr' ? 'Trouvez la clinique la plus proche' : 'Find the nearest medical clinic'}
          </p>
        </div>

        {/* Search and Filters */}
        <Suspense fallback={<Loading />}>
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن عيادة...' : language === 'fr' ? 'Rechercher une clinique...' : 'Search for a clinic...'}
                    className="ps-9"
                  />
                </div>

                <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder={language === 'ar' ? 'الولاية' : 'Wilaya'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الولايات' : 'All Wilayas'}</SelectItem>
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
                    <Clock className="h-4 w-4 me-1" />
                    {language === 'ar' ? 'مفتوح الآن' : 'Open Now'}
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
                    {language === 'ar' ? 'بالقرب مني' : 'Near Me'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Suspense>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground">
            {filteredClinics.length} {language === 'ar' ? 'عيادة' : language === 'fr' ? 'cliniques' : 'clinics'}
          </p>
        </div>

        {/* Results Grid */}
        {filteredClinics.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لم يتم العثور على عيادات' : 'No clinics found'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClinics.map(clinic => (
              <Card key={clinic.id} className="hover:shadow-lg transition-shadow overflow-hidden border">
                <CardContent className="p-0">
                  {/* Header with icon - Blue/White theme */}
                  <div className="bg-blue-50 p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-foreground truncate">
                        {language === 'ar' ? clinic.nameAr : clinic.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{clinic.rating}</span>
                          <span className="text-sm text-muted-foreground">({clinic.reviewCount})</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleFavorite(clinic.id)}
                    >
                      <Heart className={`h-5 w-5 ${clinic.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Location */}
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {language === 'ar' ? clinic.addressAr : clinic.address}
                      </span>
                    </div>

                    {/* Hours - Clear availability display */}
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${clinic.isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                      <Clock className={`h-4 w-4 ${clinic.isOpen ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-medium text-sm ${clinic.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                        {clinic.isOpen 
                          ? `${language === 'ar' ? 'مفتوح اليوم' : 'Open today'} ${clinic.opensAt} - ${clinic.openUntil}`
                          : `${language === 'ar' ? 'مغلق اليوم' : 'Closed today'}`
                        }
                      </span>
                    </div>

                    {/* Service Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <Stethoscope className="h-3 w-3 mr-1" />
                        {language === 'ar' ? 'الطب العام' : 'General'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/clinics/${clinic.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => getDirections(clinic)}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a href={`tel:${clinic.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

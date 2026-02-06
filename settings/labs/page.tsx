'use client'

import Link from "next/link"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FlaskConical, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Star,
  Navigation,
  Heart,
  ExternalLink
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useLanguage } from '@/lib/i18n/language-context'
import { useLocation } from '@/hooks/use-location'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { algeriaWilayas } from '@/lib/data/algeria-locations'
import { useSearchParams } from 'next/navigation'
import { openGoogleMapsDirections } from '@/lib/maps'

interface Laboratory {
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
  isFavorite: boolean
  hasHomeCollection: boolean
  testTypes?: string[]
}

export default function LaboratoriesPage() {
  const { language } = useLanguage()
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState<string>('all')
  const [openFilter, setOpenFilter] = useState<string>('all')
  const [favorites, setFavorites] = useState<string[]>([])
  
  const { isDetecting, detectedWilaya, detectLocation } = useLocation()
  const searchParams = useSearchParams()

  // Fetch laboratories from database
  useEffect(() => {
    async function fetchLaboratories() {
      const supabase = createBrowserClient()
      
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('type', 'laboratory')
        .eq('is_active', true)
      
      if (error) {
        setLoading(false)
        return
      }
      
      if (data) {
        const transformedLabs: Laboratory[] = data.map(lab => {
          // Parse working hours from database with Algeria timezone
          const workingHours = lab.working_hours || {}
          
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
            id: lab.id,
            name: lab.business_name || 'Laboratory',
            nameAr: lab.business_name_ar || lab.business_name || 'مختبر',
            address: lab.address_line1 || '',
            addressAr: lab.address_line1 || '',
            wilayaCode: lab.wilaya || '16',
            phone: lab.phone || '',
            email: lab.email || '',
            isOpen,
            openUntil: closesAt,
            opensAt,
            rating: lab.rating || 4.5,
            reviewCount: lab.review_count || 0,
            isFavorite: favorites.includes(lab.id),
            hasHomeCollection: false,
            testTypes: lab.test_types || [],
            latitude: lab.latitude,
            longitude: lab.longitude
          }
        })
        setLaboratories(transformedLabs)
      }
      setLoading(false)
    }

    fetchLaboratories()
  }, [favorites])

  // Filter laboratories
  const filteredLabs = laboratories.filter(lab => {
    const matchesSearch = !searchQuery || 
      lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.address.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesWilaya = selectedWilaya === 'all' || lab.wilayaCode === selectedWilaya
    
    const matchesOpen = openFilter === 'all' || 
      (openFilter === 'open' && lab.isOpen) ||
      (openFilter === 'closed' && !lab.isOpen)
    
    return matchesSearch && matchesWilaya && matchesOpen
  })

  const handleAutoDetect = async () => {
    await detectLocation()
    if (detectedWilaya) {
      setSelectedWilaya(detectedWilaya)
    }
  }

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id))
    } else {
      setFavorites([...favorites, id])
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-teal-100">
                <FlaskConical className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {language === 'ar' ? 'المختبرات الطبية' : language === 'fr' ? 'Laboratoires Médicaux' : 'Medical Laboratories'}
                </h1>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'ابحث عن مختبرات طبية موثوقة بالقرب منك' : language === 'fr' ? 'Trouvez des laboratoires médicaux de confiance près de chez vous' : 'Find trusted medical laboratories near you'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{filteredLabs.length} {language === 'ar' ? 'مختبر' : language === 'fr' ? 'laboratoires' : 'laboratories'}</span>
              <span>•</span>
              <span>{filteredLabs.filter(l => l.hasHomeCollection).length} {language === 'ar' ? 'خدمة منزلية' : language === 'fr' ? 'collecte à domicile' : 'home collection'}</span>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={language === 'ar' ? 'ابحث عن مختبر...' : language === 'fr' ? 'Rechercher un laboratoire...' : 'Search laboratory...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Wilaya Filter with Auto-detect */}
                <div className="relative">
                  <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'كل الولايات' : language === 'fr' ? 'Toutes les wilayas' : 'All wilayas'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'كل الولايات' : language === 'fr' ? 'Toutes les wilayas' : 'All wilayas'}
                      </SelectItem>
                      {algeriaWilayas.map((wilaya) => (
                        <SelectItem key={wilaya.code} value={wilaya.code}>
                          {wilaya.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="absolute -top-8 right-0 h-6 px-2 text-xs"
                  >
                    {isDetecting ? (
                      <>
                        <LoadingSpinner size="sm" className="me-1" />
                        {language === 'ar' ? 'جاري الكشف...' : language === 'fr' ? 'Détection...' : 'Detecting...'}
                      </>
                    ) : (
                      <>
                        <Navigation className="mr-1 h-3 w-3" />
                        {language === 'ar' ? 'موقعي' : language === 'fr' ? 'Ma position' : 'My location'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Open/Closed Filter */}
                <Select value={openFilter} onValueChange={setOpenFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
                    </SelectItem>
                    <SelectItem value="open">
                      {language === 'ar' ? 'مفتوح الآن' : language === 'fr' ? 'Ouvert maintenant' : 'Open now'}
                    </SelectItem>
                    <SelectItem value="closed">
                      {language === 'ar' ? 'مغلق' : language === 'fr' ? 'Fermé' : 'Closed'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Laboratories List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" className="text-primary" />
            </div>
          ) : filteredLabs.length === 0 ? (
            <Card>
              <CardContent className="p-16 text-center">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لم يتم العثور على مختبرات' : language === 'fr' ? 'Aucun laboratoire trouvé' : 'No laboratories found'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLabs.map((lab) => (
                <Card key={lab.id} className="hover:shadow-lg transition-shadow overflow-hidden border">
                  <CardContent className="p-0">
                    {/* Header with icon - Blue/White theme */}
                    <div className="bg-blue-50 p-4 flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FlaskConical className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground truncate">
                          {language === 'ar' ? lab.nameAr : lab.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{lab.rating}</span>
                            <span className="text-sm text-muted-foreground">({lab.reviewCount})</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => toggleFavorite(lab.id)}
                      >
                        <Heart className={`h-5 w-5 ${lab.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Location */}
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {language === 'ar' ? lab.addressAr : lab.address}
                        </span>
                      </div>

                      {/* Hours - Clear availability display */}
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${lab.isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Clock className={`h-4 w-4 ${lab.isOpen ? 'text-green-600' : 'text-red-600'}`} />
                        <span className={`font-medium text-sm ${lab.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                          {lab.isOpen 
                            ? `${language === 'ar' ? 'مفتوح اليوم' : 'Open today'} ${lab.opensAt} - ${lab.openUntil}`
                            : `${language === 'ar' ? 'مغلق اليوم' : 'Closed today'}`
                          }
                        </span>
                      </div>

                      {/* Service Badges */}
                      <div className="flex flex-wrap gap-2">
                        {lab.hasHomeCollection && (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            {language === 'ar' ? 'خدمة منزلية' : 'Home Collection'}
                          </Badge>
                        )}
                        <Badge className="bg-teal-600 text-white text-xs">
                          {language === 'ar' ? 'معتمد' : 'Certified'}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Link href={`/labs/${lab.id}`} className="flex-1">
                          <Button className="w-full" size="sm">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openGoogleMapsDirections({
  lat: lab.latitude,
  lng: lab.longitude,
  address: lab.address || [lab.name, lab.wilayaCode].filter(Boolean).join(', ') || undefined,
})}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <a href={`tel:${lab.phone}`}>
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
      </main>
      <Footer />
    </>
  )
}

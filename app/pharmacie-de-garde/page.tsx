'use client'

import React, { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Pill, 
  MapPin, 
  Clock, 
  Phone,
  Navigation,
  Search,
  Moon,
  Sun,
  Calendar,
  AlertCircle,
  CheckCircle,
  Star,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { useSearchParams, Suspense } from 'next/navigation'
import { openGoogleMapsDirections } from '@/lib/maps'

interface Pharmacy {
  id: string
  name: string
  address: string
  wilaya: string
  phone: string
  distance?: number
  isOpen: boolean
  schedule: {
    day: string
    night: string
  }
  rating?: number
  coordinates?: {
    lat: number
    lng: number
  }
}

const wilayas = [
  'الجزائر العاصمة', 'وهران', 'قسنطينة', 'عنابة', 'سطيف', 'باتنة', 
  'بجاية', 'تيزي وزو', 'البليدة', 'الشلف', 'تلمسان', 'بسكرة'
]

const mockPharmacies: Pharmacy[] = [
  {
    id: '1',
    name: 'صيدلية النور',
    address: 'شارع ديدوش مراد، رقم 45',
    wilaya: 'الجزائر العاصمة',
    phone: '021 23 45 67',
    distance: 0.5,
    isOpen: true,
    schedule: { day: '08:00 - 20:00', night: '20:00 - 08:00' },
    rating: 4.8
  },
  {
    id: '2',
    name: 'صيدلية الشفاء',
    address: 'حي المقاومة، بلوك 12',
    wilaya: 'الجزائر العاصمة',
    phone: '021 34 56 78',
    distance: 1.2,
    isOpen: true,
    schedule: { day: '08:00 - 20:00', night: '20:00 - 08:00' },
    rating: 4.5
  },
  {
    id: '3',
    name: 'صيدلية الأمل',
    address: 'شارع العربي بن مهيدي، رقم 78',
    wilaya: 'الجزائر العاصمة',
    phone: '021 45 67 89',
    distance: 2.0,
    isOpen: true,
    schedule: { day: '08:00 - 20:00', night: '20:00 - 08:00' },
    rating: 4.2
  },
  {
    id: '4',
    name: 'صيدلية الحياة',
    address: 'حي باب الزوار، شارع الحرية',
    wilaya: 'الجزائر العاصمة',
    phone: '021 56 78 90',
    distance: 3.5,
    isOpen: true,
    schedule: { day: '08:00 - 20:00', night: '20:00 - 08:00' },
    rating: 4.6
  },
]

export default function PharmacieDeGardePage() {
  const { language, dir } = useLanguage()
  const [selectedWilaya, setSelectedWilaya] = useState('الجزائر العاصمة')
  const [searchQuery, setSearchQuery] = useState('')
  const [isNightMode, setIsNightMode] = useState(false)
  const searchParams = useSearchParams()

  const texts = {
    ar: {
      title: 'صيدليات الحراسة',
      subtitle: 'اعثر على الصيدليات المفتوحة الآن بالقرب منك',
      searchPlaceholder: 'ابحث عن صيدلية...',
      selectWilaya: 'اختر الولاية',
      dayShift: 'المناوبة النهارية',
      nightShift: 'المناوبة الليلية',
      open: 'مفتوح الآن',
      closed: 'مغلق',
      km: 'كم',
      call: 'اتصال',
      directions: 'الاتجاهات',
      schedule: 'أوقات العمل',
      dayHours: 'نهاري',
      nightHours: 'ليلي',
      nearYou: 'بالقرب منك',
      allPharmacies: 'جميع صيدليات الحراسة',
      todayDate: 'تاريخ اليوم',
      pharmaciesOnDuty: 'صيدلية في الخدمة',
      emergencyInfo: 'معلومات الطوارئ',
      emergencyNumber: 'رقم الطوارئ',
      samu: 'الإسعاف',
      protection: 'الحماية المدنية',
      rating: 'التقييم',
      noResults: 'لا توجد نتائج',
      tryDifferent: 'جرب ولاية مختلفة أو غير مصطلح البحث',
    },
    fr: {
      title: 'Pharmacies de Garde',
      subtitle: 'Trouvez les pharmacies ouvertes près de chez vous',
      searchPlaceholder: 'Rechercher une pharmacie...',
      selectWilaya: 'Sélectionner la wilaya',
      dayShift: 'Garde de jour',
      nightShift: 'Garde de nuit',
      open: 'Ouvert maintenant',
      closed: 'Fermé',
      km: 'km',
      call: 'Appeler',
      directions: 'Itinéraire',
      schedule: 'Horaires',
      dayHours: 'Jour',
      nightHours: 'Nuit',
      nearYou: 'Près de vous',
      allPharmacies: 'Toutes les pharmacies de garde',
      todayDate: 'Date du jour',
      pharmaciesOnDuty: 'pharmacies de garde',
      emergencyInfo: 'Informations d\'urgence',
      emergencyNumber: 'Numéro d\'urgence',
      samu: 'SAMU',
      protection: 'Protection civile',
      rating: 'Note',
      noResults: 'Aucun résultat',
      tryDifferent: 'Essayez une autre wilaya ou modifiez votre recherche',
    },
    en: {
      title: 'On-Duty Pharmacies',
      subtitle: 'Find pharmacies open near you right now',
      searchPlaceholder: 'Search for a pharmacy...',
      selectWilaya: 'Select wilaya',
      dayShift: 'Day Shift',
      nightShift: 'Night Shift',
      open: 'Open Now',
      closed: 'Closed',
      km: 'km',
      call: 'Call',
      directions: 'Directions',
      schedule: 'Schedule',
      dayHours: 'Day',
      nightHours: 'Night',
      nearYou: 'Near You',
      allPharmacies: 'All On-Duty Pharmacies',
      todayDate: 'Today\'s Date',
      pharmaciesOnDuty: 'pharmacies on duty',
      emergencyInfo: 'Emergency Information',
      emergencyNumber: 'Emergency Number',
      samu: 'SAMU',
      protection: 'Civil Protection',
      rating: 'Rating',
      noResults: 'No results',
      tryDifferent: 'Try a different wilaya or change your search',
    }
  }

  const txt = texts[language]

  const currentDate = new Date().toLocaleDateString(
    language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  )

  const currentHour = new Date().getHours()
  const isNight = currentHour >= 20 || currentHour < 8

  const filteredPharmacies = mockPharmacies.filter(pharmacy => {
    if (searchQuery && !pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className={`text-center mb-8`}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${isNight ? 'bg-indigo-100' : 'bg-green-100'}`}>
                {isNight ? (
                  <Moon className={`h-8 w-8 ${isNight ? 'text-indigo-600' : 'text-green-600'}`} />
                ) : (
                  <Sun className={`h-8 w-8 ${isNight ? 'text-indigo-600' : 'text-green-600'}`} />
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground">{txt.title}</h1>
            </div>
            <p className="text-muted-foreground text-lg">{txt.subtitle}</p>
            <div className={`flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Calendar className="h-4 w-4" />
              <span>{currentDate}</span>
              <span>•</span>
              <Badge variant={isNight ? "secondary" : "default"} className="gap-1">
                {isNight ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                {isNight ? txt.nightShift : txt.dayShift}
              </Badge>
            </div>
          </div>

          {/* Emergency Info Banner */}
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="py-4">
              <div className={`flex items-center justify-between flex-wrap gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">{txt.emergencyInfo}</span>
                </div>
                <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Phone className="h-4 w-4 text-red-600" />
                    <span className="text-red-800">{txt.samu}: <strong>115</strong></span>
                  </div>
                  <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Phone className="h-4 w-4 text-red-600" />
                    <span className="text-red-800">{txt.protection}: <strong>14</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className={`flex gap-4 mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={txt.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${dir === 'rtl' ? 'pr-10 text-right' : 'pl-10'}`}
              />
            </div>
            <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
              <SelectTrigger className="w-[260px] sm:w-[280px] shrink-0">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={txt.selectWilaya} />
              </SelectTrigger>
              <SelectContent side="bottom" avoidCollisions={false}>
                {wilayas.map((wilaya) => (
                  <SelectItem key={wilaya} value={wilaya}>{wilaya}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Pill className="h-5 w-5 text-green-600" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.allPharmacies}</p>
                    <p className="text-2xl font-bold">{filteredPharmacies.length} {txt.pharmaciesOnDuty}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.nearYou}</p>
                    <p className="text-2xl font-bold">{filteredPharmacies.filter(p => p.distance && p.distance < 2).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={isNight ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-lg ${isNight ? 'bg-indigo-200' : 'bg-amber-200'}`}>
                    {isNight ? (
                      <Moon className={`h-5 w-5 ${isNight ? 'text-indigo-600' : 'text-amber-600'}`} />
                    ) : (
                      <Sun className={`h-5 w-5 ${isNight ? 'text-indigo-600' : 'text-amber-600'}`} />
                    )}
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.schedule}</p>
                    <p className="text-lg font-bold">{isNight ? txt.nightShift : txt.dayShift}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pharmacy List */}
          {filteredPharmacies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">{txt.noResults}</p>
                <p className="text-muted-foreground">{txt.tryDifferent}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPharmacies.map((pharmacy) => (
                <Card key={pharmacy.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className={`flex items-start justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Pill className="h-6 w-6 text-green-600" />
                        </div>
                        <div className={dir === 'rtl' ? 'text-right' : ''}>
                          <h3 className="font-semibold text-lg">{pharmacy.name}</h3>
                          <div className={`flex items-center gap-2 text-sm text-muted-foreground ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                            <MapPin className="h-3 w-3" />
                            <span>{pharmacy.address}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {txt.open}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-4">
                      <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span dir="ltr">{pharmacy.phone}</span>
                      </div>
                      {pharmacy.distance && (
                        <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <span>{pharmacy.distance} {txt.km}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-4 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <div className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Sun className="h-4 w-4 text-amber-500" />
                          <span>{txt.dayHours}: {pharmacy.schedule.day}</span>
                        </div>
                        <div className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Moon className="h-4 w-4 text-indigo-500" />
                          <span>{txt.nightHours}: {pharmacy.schedule.night}</span>
                        </div>
                      </div>
                      {pharmacy.rating && (
                        <div className={`flex items-center gap-1 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{pharmacy.rating}</span>
                          <span className="text-muted-foreground">({txt.rating})</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={`flex gap-2 pt-4 border-t ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Button 
                        className={`flex-1 gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                        onClick={() => window.open(`tel:${pharmacy.phone.replace(/\s/g, '')}`)}
                      >
                        <Phone className="h-4 w-4" />
                        {txt.call}
                      </Button>
                      <Button 
                        variant="outline" 
                        className={`flex-1 gap-2 bg-transparent ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                        onClick={() => openGoogleMapsDirections({
  lat: pharmacy.coordinates?.lat,
  lng: pharmacy.coordinates?.lng,
  address: [pharmacy.name, pharmacy.address].filter(Boolean).join(', ') || undefined,
})}
                      >
                        <Navigation className="h-4 w-4" />
                        {txt.directions}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export function Loading() {
  return null
}

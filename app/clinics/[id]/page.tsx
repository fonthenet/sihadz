'use client'

import { use, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { 
  MapPin, Phone, Clock, Star, Navigation, 
  CheckCircle, ExternalLink, ArrowLeft, Calendar
} from 'lucide-react'
import { FavoriteButton, useFavorites } from '@/components/ui/favorite-button'
import { ProfileServicesSection } from '@/components/profile/profile-services-section'
import { SectionLoading } from '@/components/ui/page-loading'
import { openGoogleMapsDirections } from '@/lib/maps'
import Link from 'next/link'

export default function ClinicDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const { language, dir } = useLanguage()
  const [clinic, setClinic] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { isFavorite } = useFavorites('clinic')

  useEffect(() => {
    if (!id) return

    const fetchClinic = async () => {
      const supabase = createBrowserClient()
      // Fetch from professionals (unified table) - clinics list uses professional IDs
      const { data: prof, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .eq('type', 'clinic')
        .single()

      if (prof) {
        const wh = prof.working_hours || {}
        const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
        const today = wh[dayKey]
        const opensAt = today?.open || '08:00'
        const closesAt = today?.close || '18:00'
        setClinic({
          id: prof.id,
          name: prof.business_name || 'Clinic',
          name_ar: prof.business_name_ar || prof.business_name || 'عيادة',
          address: [prof.address_line1, prof.commune, prof.wilaya].filter(Boolean).join(', ') || '',
          address_ar: [prof.address_line1, prof.commune, prof.wilaya].filter(Boolean).join('، ') || '',
          phone: prof.phone || '',
          email: prof.email || '',
          latitude: prof.latitude,
          longitude: prof.longitude,
          rating: prof.rating ?? 0,
          review_count: prof.review_count ?? 0,
          specialties: prof.specialties || prof.available_specialties || ['General Medicine'],
          description: null,
          opensAt,
          closesAt,
        })
      }
      setLoading(false)
    }

    fetchClinic()
  }, [id])

  const handleDirections = () => {
    openGoogleMapsDirections({
      lat: clinic?.latitude,
      lng: clinic?.longitude,
      address: clinic?.address,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <SectionLoading minHeight="min-h-[300px]" label={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
        </div>
        <Footer />
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">{language === 'ar' ? 'العيادة غير موجودة' : 'Clinic not found'}</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link href="/clinics" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {language === 'ar' ? 'العودة للعيادات' : 'Back to Clinics'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {language === 'ar' ? clinic.name_ar : clinic.name}
                      </h1>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{clinic.rating || 4.5}</span>
                        <span className="text-muted-foreground">({clinic.review_count || 0} {language === 'ar' ? 'تقييم' : 'reviews'})</span>
                      </div>
                    </div>
                    <FavoriteButton
                      professionalId={id}
                      initialFavorited={isFavorite(id)}
                      size="lg"
                    />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{language === 'ar' ? clinic.address_ar : clinic.address}</span>
                    </div>
                    {clinic.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <a href={`tel:${clinic.phone}`} className="hover:text-primary">{clinic.phone}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{clinic.opensAt} - {clinic.closesAt}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h3 className="font-semibold">{language === 'ar' ? 'التخصصات' : 'Specialties'}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(clinic.specialties || ['General Medicine']).map((spec: string, i: number) => (
                        <Badge key={i} variant="outline">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ProfileServicesSection professionalId={id} />

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{language === 'ar' ? 'عن العيادة' : 'About'}</h2>
                <p className="text-muted-foreground">
                  {clinic.description || (language === 'ar' 
                    ? 'عيادة متخصصة توفر خدمات طبية عالية الجودة للمرضى.'
                    : 'A specialized clinic providing high-quality medical services to patients.'
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <div>
                  <Button className="w-full mb-3" asChild>
                    <Link href={`/booking/new?clinic=${id}`}>
                      <Calendar className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'احجز موعد' : 'Book Appointment'}
                    </Link>
                  </Button>
                  <h3 className="font-semibold mb-3">{language === 'ar' ? 'اتصل بنا' : 'Contact'}</h3>
                  {clinic.phone && (
                    <Button variant="outline" className="w-full mb-2" asChild>
                      <a href={`tel:${clinic.phone}`}>
                        <Phone className="h-4 w-4 me-2" />
                        {language === 'ar' ? 'اتصل' : 'Call'}
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleDirections}>
                    <Navigation className="h-4 w-4 me-2" />
                    {language === 'ar' ? 'الاتجاهات' : 'Directions'}
                  </Button>
                </div>

                {clinic.email && (
                  <div>
                    <h3 className="font-semibold mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</h3>
                    <p className="text-sm text-muted-foreground break-all">{clinic.email}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">{language === 'ar' ? 'ساعات العمل' : 'Hours'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'اليوم' : 'Today'}: {clinic.opensAt} - {clinic.closesAt}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

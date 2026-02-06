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
  CheckCircle, ExternalLink, ArrowLeft, Pill, Store
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FavoriteButton, useFavorites } from '@/components/ui/favorite-button'
import { ProfileServicesSection } from '@/components/profile/profile-services-section'
import { SectionLoading } from '@/components/ui/page-loading'
import { openGoogleMapsDirections } from '@/lib/maps'
import Link from 'next/link'

export default function PharmacyDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const { language, dir } = useLanguage()
  const [pharmacy, setPharmacy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { isFavorite } = useFavorites('pharmacy')

  useEffect(() => {
    if (!id) return

    const fetchPharmacy = async () => {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .eq('type', 'pharmacy')
        .maybeSingle()

      if (data) {
        let avatarUrl: string | null = null
        if (data.auth_user_id) {
          const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', data.auth_user_id).maybeSingle()
          avatarUrl = prof?.avatar_url ?? null
        }
        setPharmacy({ ...data, avatarUrl })
      }
      setLoading(false)
    }

    fetchPharmacy()
  }, [id])

  const handleDirections = () => {
    openGoogleMapsDirections({
      lat: pharmacy?.latitude,
      lng: pharmacy?.longitude,
      addressParts: [pharmacy?.address_line1, pharmacy?.address_line2, pharmacy?.commune, pharmacy?.wilaya],
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

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">{language === 'ar' ? 'الصيدلية غير موجودة' : 'Pharmacy not found'}</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link href="/pharmacies" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {language === 'ar' ? 'العودة للصيدليات' : 'Back to Pharmacies'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <Avatar className="h-20 w-20 rounded-full shrink-0 ring-2 ring-primary/20">
                      <AvatarImage src={pharmacy.avatarUrl || undefined} alt="" className="object-cover" />
                      <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                        <Pill className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {language === 'ar' ? (pharmacy.business_name_ar || pharmacy.business_name) : pharmacy.business_name}
                      </h1>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{pharmacy.rating || 4.5}</span>
                        <span className="text-muted-foreground">({pharmacy.review_count || 0} {language === 'ar' ? 'تقييم' : 'reviews'})</span>
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
                      <span>{pharmacy.address_line1 || pharmacy.address_line2 || 'N/A'}{pharmacy.commune ? `, ${pharmacy.commune}` : ''}{pharmacy.wilaya ? `, ${pharmacy.wilaya}` : ''}</span>
                    </div>
                    {pharmacy.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <a href={`tel:${pharmacy.phone}`} className="hover:text-primary">{pharmacy.phone}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>08:00 - 20:00</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h3 className="font-semibold">{language === 'ar' ? 'الخدمات' : 'Services'}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <Pill className="h-3 w-3 me-1" />
                        {language === 'ar' ? 'صرف الأدوية' : 'Prescription Fill'}
                      </Badge>
                      {pharmacy.has_delivery && (
                        <Badge variant="outline">{language === 'ar' ? 'توصيل' : 'Delivery'}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ProfileServicesSection professionalId={id} />

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{language === 'ar' ? 'عن الصيدلية' : 'About'}</h2>
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'صيدلية موثوقة توفر الأدوية والخدمات الصيدلانية المتميزة.'
                    : 'A trusted pharmacy providing quality medications and pharmaceutical services.'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">{language === 'ar' ? 'اتصل بنا' : 'Contact'}</h3>
                  <Button className="w-full mb-2" asChild>
                    <a href={`tel:${pharmacy.phone}`}>
                      <Phone className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'اتصل' : 'Call'}
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleDirections}>
                    <Navigation className="h-4 w-4 me-2" />
                    {language === 'ar' ? 'الاتجاهات' : 'Directions'}
                  </Button>
                  <Button variant="outline" className="w-full mt-2 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" asChild>
                    <Link href={`/pharmacies/${id}/shop`}>
                      <Store className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'تسوق الآن' : language === 'fr' ? 'Boutique en ligne' : 'Shop Online'}
                    </Link>
                  </Button>
                </div>

                {pharmacy.email && (
                  <div>
                    <h3 className="font-semibold mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</h3>
                    <p className="text-sm text-muted-foreground break-all">{pharmacy.email}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">{language === 'ar' ? 'ساعات العمل' : 'Hours'}</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>{language === 'ar' ? 'الأحد - الخميس: 08:00 - 20:00' : 'Sun - Thu: 08:00 - 20:00'}</li>
                    <li>{language === 'ar' ? 'الجمعة - السبت: 10:00 - 20:00' : 'Fri - Sat: 10:00 - 20:00'}</li>
                  </ul>
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

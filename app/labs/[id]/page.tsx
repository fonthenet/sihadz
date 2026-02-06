'use client'

import { use, useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { 
  MapPin, Phone, Clock, Star, Navigation, 
  CheckCircle, ExternalLink, ArrowLeft, FlaskConical
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FavoriteButton, useFavorites } from '@/components/ui/favorite-button'
import { ProfileServicesSection } from '@/components/profile/profile-services-section'
import { SectionLoading } from '@/components/ui/page-loading'
import { openGoogleMapsDirections } from '@/lib/maps'
import Link from 'next/link'

export default function LabDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const { language, dir } = useLanguage()
  const [lab, setLab] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { isFavorite } = useFavorites('laboratory')

  useEffect(() => {
    if (!id) return

    const fetchLab = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .eq('type', 'laboratory')
        .maybeSingle()

      if (data) {
        let avatarUrl: string | null = null
        if (data.auth_user_id) {
          const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', data.auth_user_id).maybeSingle()
          avatarUrl = prof?.avatar_url ?? null
        }
        setLab({ ...data, avatarUrl })
      }
      setLoading(false)
    }

    fetchLab()
  }, [id])

  const handleDirections = () => {
    openGoogleMapsDirections({
      lat: lab?.latitude,
      lng: lab?.longitude,
      addressParts: [lab?.address_line1, lab?.address_line2, lab?.commune, lab?.wilaya],
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

  if (!lab) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">{language === 'ar' ? 'المختبر غير موجود' : 'Laboratory not found'}</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link href="/labs" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {language === 'ar' ? 'العودة للمختبرات' : 'Back to Laboratories'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <Avatar className="h-20 w-20 rounded-full shrink-0 ring-2 ring-primary/20">
                      <AvatarImage src={lab.avatarUrl || undefined} alt="" className="object-cover" />
                      <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                        <FlaskConical className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {language === 'ar' ? (lab.business_name_ar || lab.business_name) : lab.business_name}
                      </h1>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{lab.rating || 4.5}</span>
                        <span className="text-muted-foreground">({lab.review_count || 0} {language === 'ar' ? 'تقييم' : 'reviews'})</span>
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
                      <span>{lab.address_line1 || lab.address_line2 || 'N/A'}{lab.commune ? `, ${lab.commune}` : ''}{lab.wilaya ? `, ${lab.wilaya}` : ''}</span>
                    </div>
                    {lab.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <a href={`tel:${lab.phone}`} className="hover:text-primary">{lab.phone}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>08:00 - 18:00</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h3 className="font-semibold">{language === 'ar' ? 'الخدمات' : 'Services'}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <FlaskConical className="h-3 w-3 me-1" />
                        {language === 'ar' ? 'التحاليل الطبية' : 'Medical Tests'}
                      </Badge>
                      {lab.home_sample_collection && (
                        <Badge variant="outline">{language === 'ar' ? 'عينات من المنزل' : 'Home Collection'}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ProfileServicesSection professionalId={id} />

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{language === 'ar' ? 'عن المختبر' : 'About'}</h2>
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'مختبر متخصص يوفر التحاليل الطبية بأعلى مستويات الدقة والجودة.'
                    : 'A specialized laboratory providing medical tests with highest standards of accuracy and quality.'
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
                    <a href={`tel:${lab.phone}`}>
                      <Phone className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'اتصل' : 'Call'}
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleDirections}>
                    <Navigation className="h-4 w-4 me-2" />
                    {language === 'ar' ? 'الاتجاهات' : 'Directions'}
                  </Button>
                </div>

                {lab.email && (
                  <div>
                    <h3 className="font-semibold mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</h3>
                    <p className="text-sm text-muted-foreground break-all">{lab.email}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">{language === 'ar' ? 'ساعات العمل' : 'Hours'}</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>{language === 'ar' ? 'الأحد - الخميس: 08:00 - 18:00' : 'Sun - Thu: 08:00 - 18:00'}</li>
                    <li>{language === 'ar' ? 'الجمعة - السبت: 09:00 - 16:00' : 'Fri - Sat: 09:00 - 16:00'}</li>
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

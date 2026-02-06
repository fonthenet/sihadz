'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/lib/i18n/language-context'
import { Stethoscope } from 'lucide-react'

export interface ProfileService {
  id: string
  service_name: string
  service_description: string | null
  name_ar: string | null
  description_ar: string | null
  price: number | null
  duration: number | null
  image_url: string | null
  image_urls: string[] | null
}

interface ProfileServicesSectionProps {
  professionalId: string
  className?: string
}

const labels = {
  en: { title: 'Services', noServices: 'No services listed.' },
  fr: { title: 'Services', noServices: 'Aucun service listé.' },
  ar: { title: 'الخدمات', noServices: 'لا توجد خدمات.' },
}

export function ProfileServicesSection({ professionalId, className }: ProfileServicesSectionProps) {
  const { language } = useLanguage()
  const l = labels[language] || labels.en
  const [services, setServices] = useState<ProfileService[]>([])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase
      .from('professional_services')
      .select('id, service_name, service_description, name_ar, description_ar, price, duration, image_url, image_urls')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => setServices((data as ProfileService[]) || []))
  }, [professionalId])

  if (services.length === 0) return null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{l.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => {
            const name = language === 'ar' && s.name_ar ? s.name_ar : s.service_name
            const desc = language === 'ar' && s.description_ar ? s.description_ar : s.service_description
            return (
              <div
                key={s.id}
                className="flex gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                    <Stethoscope className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    {name}
                  </p>
                  {desc && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                      {desc}
                    </p>
                  )}
                  {s.price != null && (
                    <p className="text-sm font-medium text-primary mt-1">{s.price} DZD</p>
                  )}
                  {s.duration != null && (
                    <p className="text-xs text-muted-foreground">
                      ~{s.duration} {language === 'ar' ? 'دقيقة' : language === 'fr' ? 'min' : 'min'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

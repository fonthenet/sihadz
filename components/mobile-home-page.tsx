'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Video, Building, ArrowRight, ArrowLeft, Users, Calendar, MapPin } from 'lucide-react'
import { Header } from '@/components/header'
import { HeroSearchBar } from '@/components/hero-search-bar'
import { useLanguage } from '@/lib/i18n/language-context'

interface MobileHomePageProps {
  stats: { doctors: number; appointments: number } | null
}

export function MobileHomePage({ stats }: MobileHomePageProps) {
  const { t, language, dir } = useLanguage()
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <div className="min-h-screen max-h-[100dvh] flex flex-col bg-background">
      <Header variant="mobile-home" />

      <main className="flex-1 flex flex-col px-4 py-4 pb-safe overflow-y-auto min-h-0">
        {/* Top: Search + Visit type */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="shrink-0 w-full">
            <HeroSearchBar />
          </div>

          {/* Visit type - two buttons side by side */}
          <div className="flex gap-3 shrink-0">
            <Link href="/search?type=in-person" className="flex-1">
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary/40 bg-primary/10 py-4 px-3 active:scale-[0.98] active:bg-primary/20 transition-all">
                <Building className="h-6 w-6 text-primary shrink-0" />
                <span className="text-base font-bold text-primary">{t('inPerson')}</span>
              </div>
            </Link>
            <Link href="/search?type=e-visit" className="flex-1">
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-secondary/40 bg-secondary/10 py-4 px-3 active:scale-[0.98] active:bg-secondary/20 transition-all">
                <Video className="h-6 w-6 text-secondary shrink-0" />
                <span className="text-base font-bold text-secondary">{t('eVisit')}</span>
              </div>
            </Link>
          </div>

          {/* Stats – Doctors, Appointments, Wilayas, Instant Booking */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4 shrink-0">
            <Link href="/search?specialty=all&professionalType=doctor" className="flex items-center gap-2 active:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground leading-tight">{stats ? stats.doctors : '–'}</div>
                <div className="text-sm text-muted-foreground">{t('doctors')}</div>
              </div>
            </Link>
            <Link href="/booking/new" className="flex items-center gap-2 active:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 shrink-0">
                <Calendar className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground leading-tight">{stats ? stats.appointments : '–'}</div>
                <div className="text-sm text-muted-foreground">{t('appointments')}</div>
              </div>
            </Link>
            <Link href="/search" className="flex items-center gap-2 active:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                <MapPin className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground leading-tight">58</div>
                <div className="text-sm text-muted-foreground">{language === 'ar' ? 'ولاية' : language === 'fr' ? 'Wilayas' : 'Wilayas'}</div>
              </div>
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="shrink-0 pt-4 pb-4">
          <h2 className="text-base font-bold text-foreground mb-3 text-center">{t('howItWorks')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground mb-2">1</div>
              <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight">{t('step1Title')}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">{t('step1Desc')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground mb-2">2</div>
              <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight">{t('step2Title')}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">{t('step2Desc')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground mb-2">3</div>
              <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight">{t('step3Title')}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">{t('step3Desc')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground mb-2">4</div>
              <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight">{t('step4Title')}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">{t('step4Desc')}</p>
            </div>
          </div>
        </div>

        {/* Bottom: CTA + Footer */}
        <div className="flex flex-col gap-4 shrink-0 pt-4 border-t border-border/50 mt-auto">
          <Link href="/booking/new" className="block w-full">
            <Button
              size="lg"
              className="w-full h-12 text-lg font-semibold gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
            >
              {t('startNow')}
              <ArrowIcon className="h-5 w-5" />
            </Button>
          </Link>

        </div>
      </main>
    </div>
  )
}

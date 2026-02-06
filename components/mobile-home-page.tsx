'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, Users, Calendar, MapPin } from 'lucide-react'
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
    <>
      <div className="min-h-screen max-h-[100dvh] flex flex-col bg-background">
        <Header variant="mobile-home" />

        <main className="flex-1 flex flex-col px-4 pt-10 pb-4 pb-safe overflow-y-auto min-h-0">
          {/* Top: Search + Visit type */}
          <div className="flex flex-col gap-4 min-h-0">
            <div className="shrink-0 w-full">
              <HeroSearchBar />
            </div>

            {/* Stats – Doctors, Appointments, Wilayas, Instant Booking – hidden on mobile */}
            <div className="hidden flex-wrap items-center justify-center gap-3 sm:gap-4 pt-10 shrink-0">
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
          <div className="shrink-0 pt-10 pb-4">
            <h2 className="text-sm font-bold text-foreground mb-2 text-center">{t('howItWorks')}</h2>
            <div className="grid grid-cols-2 gap-2 pt-10 pb-10">
              <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground mb-1">1</div>
                <h3 className="text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step1Title')}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t('step1Desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground mb-1">2</div>
                <h3 className="text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step2Title')}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t('step2Desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground mb-1">3</div>
                <h3 className="text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step3Title')}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t('step3Desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground mb-1">4</div>
                <h3 className="text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step4Title')}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{t('step4Desc')}</p>
              </div>
            </div>
          </div>

          <Link href="/booking/new" className="block w-full shrink-0">
            <Button
              size="lg"
              className="w-full h-12 text-lg font-semibold gap-5 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
            >
              {t('startNow')}
              <ArrowIcon className="h-5 w-5" />
            </Button>
          </Link>
        </main>
      </div>
    </>
  )
}

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
      <div className="min-h-screen max-h-[100dvh] flex flex-col bg-background w-full min-w-0">
        <Header variant="mobile-home" />

        <main className="flex-1 flex flex-col px-3 min-[375px]:px-4 min-[428px]:px-5 pt-6 min-[375px]:pt-8 min-[428px]:pt-10 pb-4 pb-safe overflow-y-auto min-h-0 w-full min-w-0">
          {/* Top: Search + Visit type */}
          <div className="flex flex-col gap-4 min-h-0 w-full min-w-0">
            <div className="shrink-0 w-full min-w-0">
              <HeroSearchBar />
            </div>

            {/* Stats – Doctors, Appointments, Wilayas – visible on wider mobile (375px+) */}
            <div className="hidden min-[375px]:flex flex-wrap items-center justify-center gap-3 min-[428px]:gap-4 pt-6 min-[428px]:pt-10 shrink-0">
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

          {/* How it works - responsive for 320px, 375px, 390px, 428px */}
          <div className="shrink-0 pt-6 min-[375px]:pt-8 min-[428px]:pt-10 pb-4 w-full min-w-0">
            <h2 className="text-xs min-[375px]:text-sm font-bold text-foreground mb-2 text-center">{t('howItWorks')}</h2>
            <div className="grid grid-cols-2 gap-1.5 min-[375px]:gap-2 pt-6 min-[428px]:pt-10 pb-8 min-[428px]:pb-10 px-2 min-[375px]:px-4 min-[428px]:px-6 mt-2">
              <div className="flex flex-col items-center text-center p-2 min-[375px]:p-2.5 rounded-lg bg-muted/50 min-w-0">
                <div className="flex h-5 w-5 min-[375px]:h-6 min-[375px]:w-6 items-center justify-center rounded-full bg-primary text-[10px] min-[375px]:text-xs font-bold text-primary-foreground mb-1 shrink-0">1</div>
                <h3 className="text-[11px] min-[375px]:text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step1Title')}</h3>
                <p className="text-[10px] min-[375px]:text-[11px] text-muted-foreground line-clamp-2 leading-tight">{t('step1Desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center p-2 min-[375px]:p-2.5 rounded-lg bg-muted/50 min-w-0">
                <div className="flex h-5 w-5 min-[375px]:h-6 min-[375px]:w-6 items-center justify-center rounded-full bg-secondary text-[10px] min-[375px]:text-xs font-bold text-secondary-foreground mb-1 shrink-0">2</div>
                <h3 className="text-[11px] min-[375px]:text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step2Title')}</h3>
                <p className="text-[10px] min-[375px]:text-[11px] text-muted-foreground line-clamp-2 leading-tight">{t('step2Desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center p-2 min-[375px]:p-2.5 rounded-lg bg-muted/50 min-w-0">
                <div className="flex h-5 w-5 min-[375px]:h-6 min-[375px]:w-6 items-center justify-center rounded-full bg-secondary text-[10px] min-[375px]:text-xs font-bold text-secondary-foreground mb-1 shrink-0">3</div>
                <h3 className="text-[11px] min-[375px]:text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step3Title')}</h3>
                <p className="text-[10px] min-[375px]:text-[11px] text-muted-foreground line-clamp-2 leading-tight">{t('step3Desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center p-2 min-[375px]:p-2.5 rounded-lg bg-muted/50 min-w-0">
                <div className="flex h-5 w-5 min-[375px]:h-6 min-[375px]:w-6 items-center justify-center rounded-full bg-primary text-[10px] min-[375px]:text-xs font-bold text-primary-foreground mb-1 shrink-0">4</div>
                <h3 className="text-[11px] min-[375px]:text-xs font-semibold text-foreground mb-0.5 leading-tight">{t('step4Title')}</h3>
                <p className="text-[10px] min-[375px]:text-[11px] text-muted-foreground line-clamp-2 leading-tight">{t('step4Desc')}</p>
              </div>
            </div>
          </div>

          <Link href="/booking/new" className="block w-full shrink-0 min-w-0">
            <Button
              size="lg"
              className="w-full min-w-0 h-11 min-[375px]:h-12 text-base min-[375px]:text-lg font-semibold gap-2 min-[375px]:gap-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
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

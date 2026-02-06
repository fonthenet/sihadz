'use client'

import React from "react";
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Search, Stethoscope, Users, CheckCircle, ArrowRight, ArrowLeft, Heart, Shield, Star, Video, Building, Navigation, Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { HeroSearchBar } from '@/components/hero-search-bar'
import { MobileHomePage } from '@/components/mobile-home-page'
import { useLanguage } from '@/lib/i18n/language-context'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBrowserClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const { t, language, dir } = useLanguage()
  const router = useRouter()
  // Safely create Supabase client - handle errors gracefully
  const supabase = useMemo(() => {
    try {
      return createBrowserClient()
    } catch (error) {
      console.error('[LandingPage] Failed to create Supabase client:', error)
      return null as any
    }
  }, [])
  const [stats, setStats] = useState<{ doctors: number; appointments: number } | null>(null)

  useEffect(() => {
    if (!supabase) return // Skip if Supabase client not available
    
    const load = async () => {
      try {
        const sb = supabase || createBrowserClient()
        const [docRes, aptRes] = await Promise.all([
          sb.from('professionals').select('id', { count: 'exact', head: true }).eq('type', 'doctor').eq('is_active', true).eq('is_verified', true),
          sb.from('appointments').select('id', { count: 'exact', head: true }).neq('status', 'cancelled'),
        ])
        setStats({
          doctors: docRes.count ?? 0,
          appointments: aptRes.count ?? 0,
        })
      } catch (error) {
        console.error('[LandingPage] Failed to load stats:', error)
        // Set default stats on error
        setStats({ doctors: 0, appointments: 0 })
      }
    }
    load()
  }, [supabase])

  // Patient login states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Check for password reset code in URL and redirect
  React.useEffect(() => {
    const checkForResetCode = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code) {
        console.log('[v0] Password reset code detected, redirecting...')
        router.push(`/auth/reset-password?code=${code}`)
      }
    }
    
    checkForResetCode()
  }, [router])

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setLoginError(language === 'ar' ? 'خدمة غير متاحة حالياً' : 
                   language === 'fr' ? 'Service non disponible' : 
                   'Service unavailable')
      return
    }
    
    setIsLoggingIn(true)
    setLoginError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (signInError) {
        setLoginError(language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 
                     language === 'fr' ? 'Email ou mot de passe incorrect' : 
                     'Invalid email or password')
        setIsLoggingIn(false)
        return
      }

      if (data.user) {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setLoginError(language === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 
                   language === 'fr' ? 'Une erreur est survenue. Réessayez.' : 
                   'An error occurred. Please try again.')
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized layout (< 768px) */}
      <div className="md:hidden">
        <MobileHomePage stats={stats} />
      </div>

      {/* Desktop layout (>= 768px) */}
      <div className="hidden md:block">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-10 sm:py-16 md:py-24">
        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
          <h1 className="text-balance text-3xl sm:text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl max-w-4xl">
            {t('heroTitle')}
          </h1>
          <p className="text-pretty text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
            {t('heroSubtitle')}
          </p>

          {/* Search Bar with Location - unified bar, autocomplete, location priority */}
          <HeroSearchBar />

          {/* Visit Type Badges - flex-nowrap keeps them side by side on mobile */}
          <div className="flex flex-nowrap justify-center gap-3 sm:gap-6">
            <Link href="/search?type=in-person" className="shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-medium text-primary transition-colors hover:bg-primary/10">
                <Building className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
                {t('inPerson')}
              </div>
            </Link>
            <Link href="/search?type=e-visit" className="shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-secondary/20 bg-secondary/5 px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-medium text-secondary transition-colors hover:bg-secondary/10">
                <Video className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
                {t('eVisit')}
              </div>
            </Link>
          </div>

          {/* Stats – real counts from DB */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4">
            <Link href="/search?specialty=all&professionalType=doctor" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stats ? stats.doctors : '–'}</div>
                <div className="text-base text-muted-foreground">{t('doctors')}</div>
              </div>
            </Link>
            <Link href="/booking/new" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stats ? stats.appointments : '–'}</div>
                <div className="text-base text-muted-foreground">{t('appointments')}</div>
              </div>
            </Link>
            <Link href="/search" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">58</div>
                <div className="text-base text-muted-foreground">{language === 'ar' ? 'ولاية' : language === 'fr' ? 'Wilayas' : 'Wilayas'}</div>
              </div>
            </Link>
            <Link href="/booking/new" className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-base font-medium text-foreground hover:opacity-80 transition-opacity">
              <CheckCircle className="h-4 w-4" />
              {t('instantBooking')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/30 py-10 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 sm:mb-12 text-center">
<h2 className="text-balance text-3xl sm:text-4xl font-bold text-foreground md:text-5xl">
            {t('whyChooseUs')}
          </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{t('booking247')}</h3>
                <p className="text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('booking247Desc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                  <Navigation className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="mb-1.5 text-xl font-semibold text-foreground">
                  {language === 'ar' ? 'تحديد الموقع تلقائياً' : language === 'fr' ? 'Géolocalisation automatique' : 'Auto Location Detection'}
                </h3>
                <p className="text-pretty text-base text-muted-foreground leading-relaxed">
                  {language === 'ar' ? 'اعثر على الأطباء القريبين منك بنقرة واحدة' : language === 'fr' ? 'Trouvez les médecins près de chez vous en un clic' : 'Find doctors near you with a single click'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="mb-1.5 text-xl font-semibold text-foreground">{t('secureData')}</h3>
                <p className="text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('secureDataDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-xl font-semibold text-foreground">{t('advancedSearch')}</h3>
                <p className="text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('advancedSearchDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="mb-1.5 text-xl font-semibold text-foreground">{t('verifiedDoctors')}</h3>
                <p className="text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('verifiedDoctorsDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="mb-1.5 text-xl font-semibold text-foreground">{t('nationalCoverage')}</h3>
                <p className="text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('nationalCoverageDesc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* E-Visit Section */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
              <CardContent className="p-5">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20">
                  <Video className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{t('eVisit')}</h3>
                <p className="mb-4 text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('eVisitDesc')}
                </p>
                <Link href="/search?type=e-visit">
                  <Button variant="secondary" className="gap-2">
                    {t('startNow')}
                    <ArrowIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-5">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{t('inPerson')}</h3>
                <p className="mb-4 text-pretty text-base text-muted-foreground leading-relaxed">
                  {t('inPersonDesc')}
                </p>
                <Link href="/search?type=in-person">
                  <Button className="gap-2">
                    {t('findDoctor')}
                    <ArrowIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6 text-center">
            <h2 className="text-balance text-3xl font-bold text-foreground md:text-5xl">
              {t('howItWorks')}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step1Title')}</h3>
              <p className="text-pretty text-base text-muted-foreground">
                {t('step1Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xl font-bold text-secondary-foreground">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step2Title')}</h3>
              <p className="text-pretty text-base text-muted-foreground">
                {t('step2Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl font-bold text-foreground">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step3Title')}</h3>
              <p className="text-pretty text-base text-muted-foreground">
                {t('step3Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                4
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step4Title')}</h3>
              <p className="text-pretty text-base text-muted-foreground">
                {t('step4Desc')}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/booking/new">
              <Button size="lg" className="gap-2">
                {t('startNow')}
                <ArrowIcon className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-primary py-10 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            {t('areYouDoctor')}
          </h2>
          <p className="mt-2 text-pretty text-base opacity-90">
            {t('joinUs')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/professional/auth/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                {t('doctorSignup')}
                <ArrowIcon className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  )
}

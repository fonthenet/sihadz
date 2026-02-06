'use client'

import React from "react"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar, Clock, MapPin, Search, Stethoscope, Users, CheckCircle, ArrowRight, ArrowLeft, Heart, Shield, Star, Video, Building, Navigation, ChevronDown, Check, Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useLanguage } from '@/lib/i18n/language-context'
import { useLocation } from '@/hooks/use-location'
import { algeriaWilayas, getWilayaName, type Wilaya } from '@/lib/data/algeria-locations'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBrowserClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const { t, language, dir } = useLanguage()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [wilayaOpen, setWilayaOpen] = useState(false)
  
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
  
  const {
    isDetecting,
    detectedWilaya,
    selectedWilaya,
    detectLocation,
    selectWilaya,
    clearSelection,
  } = useLocation()
  
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedWilaya) params.set('location', selectedWilaya.code)
    router.push(`/search?${params.toString()}`)
  }

  const handleAutoDetect = async () => {
    await detectLocation()
  }

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const labels = {
    ar: {
      detectLocation: 'تحديد موقعي تلقائياً',
      detecting: 'جاري التحديد...',
      nearYou: 'قريب منك',
      allWilayas: 'جميع الولايات',
      selectWilaya: 'اختر الولاية',
      searchWilaya: 'ابحث عن ولاية...',
      noResults: 'لا توجد نتائج',
      wilayas58: '58 ولاية',
    },
    fr: {
      detectLocation: 'Détecter ma position',
      detecting: 'Détection...',
      nearYou: 'Près de vous',
      allWilayas: 'Toutes les wilayas',
      selectWilaya: 'Sélectionner la wilaya',
      searchWilaya: 'Rechercher une wilaya...',
      noResults: 'Aucun résultat',
      wilayas58: '58 wilayas',
    },
    en: {
      detectLocation: 'Detect my location',
      detecting: 'Detecting...',
      nearYou: 'Near you',
      allWilayas: 'All Wilayas',
      selectWilaya: 'Select Wilaya',
      searchWilaya: 'Search wilaya...',
      noResults: 'No results',
      wilayas58: '58 wilayas',
    },
  }

  const l = labels[language]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl max-w-4xl">
            {t('heroTitle')}
          </h1>
          <p className="text-pretty text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {t('heroSubtitle')}
          </p>

          {/* Search Bar with Location */}
          <Card className="p-2 w-full max-w-4xl">
            <div className="flex flex-col gap-2">
              {/* Search input */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder={t('searchPlaceholder')}
                    className="border-0 ps-10 focus-visible:ring-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                
                {/* Wilaya selector */}
                <Popover open={wilayaOpen} onOpenChange={setWilayaOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="justify-between gap-2 min-w-[200px]">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {selectedWilaya 
                          ? getWilayaName(selectedWilaya, language)
                          : l.selectWilaya
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={l.searchWilaya} />
                      <CommandList>
                        <CommandEmpty>{l.noResults}</CommandEmpty>
                        <CommandGroup>
                          {/* Auto-detect option */}
                          <CommandItem
                            onSelect={handleAutoDetect}
                            className="gap-2"
                          >
                            {isDetecting ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Navigation className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-medium">{isDetecting ? l.detecting : l.detectLocation}</span>
                            {detectedWilaya && (
                              <Badge variant="secondary" className="ms-auto">
                                {getWilayaName(detectedWilaya, language)}
                              </Badge>
                            )}
                          </CommandItem>
                          {/* All wilayas option */}
                          <CommandItem
                            onSelect={() => {
                              clearSelection()
                              setWilayaOpen(false)
                            }}
                            className="gap-2"
                          >
                            <MapPin className="h-4 w-4" />
                            <span>{l.allWilayas}</span>
                            {!selectedWilaya && (
                              <Check className="h-4 w-4 ms-auto" />
                            )}
                          </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading={l.wilayas58}>
                          <ScrollArea className="h-[200px]">
                            {algeriaWilayas.map((wilaya) => (
                              <CommandItem
                                key={wilaya.code}
                                value={`${wilaya.code} ${getWilayaName(wilaya, language)}`}
                                onSelect={() => {
                                  selectWilaya(wilaya)
                                  setWilayaOpen(false)
                                }}
                                className="gap-2"
                              >
                                <span className="text-muted-foreground text-xs w-6 shrink-0">
                                  {wilaya.code}
                                </span>
                                <span className="truncate">{getWilayaName(wilaya, language)}</span>
                                {selectedWilaya?.code === wilaya.code && (
                                  <Check className="h-4 w-4 ms-auto shrink-0" />
                                )}
                              </CommandItem>
                            ))}
                          </ScrollArea>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <Button onClick={handleSearch} className="w-full sm:w-auto">
                  {t('searchButton')}
                  <ArrowIcon className="ms-2 h-4 w-4" />
                </Button>
              </div>

              {/* Quick location badge */}
              {selectedWilaya && (
                <div className="flex items-center gap-2 px-2">
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {getWilayaName(selectedWilaya, language)}
                    {detectedWilaya?.code === selectedWilaya.code && (
                      <span className="text-xs opacity-70">({l.nearYou})</span>
                    )}
                  </Badge>
                  <button 
                    onClick={() => clearSelection()}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {language === 'ar' ? 'مسح' : language === 'fr' ? 'Effacer' : 'Clear'}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Visit Type Badges */}
          <div className="flex flex-wrap gap-3">
            <Link href="/search?type=in-person">
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                <Building className="h-4 w-4" />
                {t('inPerson')}
              </div>
            </Link>
            <Link href="/search?type=e-visit">
              <div className="flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary/10">
                <Video className="h-4 w-4" />
                {t('eVisit')}
              </div>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">1,200+</div>
                <div className="text-sm text-muted-foreground">{t('doctors')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">50,000+</div>
                <div className="text-sm text-muted-foreground">{t('appointments')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">58</div>
                <div className="text-sm text-muted-foreground">{language === 'ar' ? 'ولاية' : language === 'fr' ? 'Wilayas' : 'Wilayas'}</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              <CheckCircle className="h-4 w-4" />
              {t('instantBooking')}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
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
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {t('booking247Desc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Navigation className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {language === 'ar' ? 'تحديد الموقع تلقائياً' : language === 'fr' ? 'Géolocalisation automatique' : 'Auto Location Detection'}
                </h3>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {language === 'ar' ? 'اعثر على الأطباء القريبين منك بنقرة واحدة' : language === 'fr' ? 'Trouvez les médecins près de chez vous en un clic' : 'Find doctors near you with a single click'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{t('secureData')}</h3>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {t('secureDataDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{t('advancedSearch')}</h3>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {t('advancedSearchDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{t('verifiedDoctors')}</h3>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {t('verifiedDoctorsDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{t('nationalCoverage')}</h3>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {t('nationalCoverageDesc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* E-Visit Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="overflow-hidden border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
              <CardContent className="p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-secondary/20">
                  <Video className="h-7 w-7 text-secondary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-foreground">{t('eVisit')}</h3>
                <p className="mb-6 text-pretty text-muted-foreground leading-relaxed">
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
              <CardContent className="p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20">
                  <Building className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-foreground">{t('inPerson')}</h3>
                <p className="mb-6 text-pretty text-muted-foreground leading-relaxed">
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
      <section id="how-it-works" className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
              {t('howItWorks')}
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step1Title')}</h3>
              <p className="text-pretty text-muted-foreground">
                {t('step1Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step2Title')}</h3>
              <p className="text-pretty text-muted-foreground">
                {t('step2Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step3Title')}</h3>
              <p className="text-pretty text-muted-foreground">
                {t('step3Desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                4
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{t('step4Title')}</h3>
              <p className="text-pretty text-muted-foreground">
                {t('step4Desc')}
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
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
      <section className="border-t bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            {t('areYouDoctor')}
          </h2>
          <p className="mt-4 text-pretty text-lg opacity-90">
            {t('joinUs')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register/doctor">
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
  )
}

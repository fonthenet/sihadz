'use client'

import React from "react"

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Stethoscope, 
  Menu, 
  X, 
  Search, 
  Building, 
  Video, 
  FileText, 
  Pill,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Calendar,
  Mail,
  Lock,
  FlaskConical,
  Heart,
  Type,
  Home,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLanguage } from '@/lib/i18n/language-context'
import { useFontSize } from '@/contexts/font-size-context'
import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { PresenceStatusSelector } from '@/components/presence-status'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SearchWithLocation } from '@/components/search-with-location'
import { cn } from '@/lib/utils'

interface HeaderProps {
  showNav?: boolean
  /** Mobile home: hide top bar (pro login/join), add provider shortcuts in main bar */
  variant?: 'default' | 'mobile-home'
  /** Search in header (listing pages: doctors, pharmacies, clinics, labs, nurses) */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Location filters - when provided, mobile shows search+location in one bar */
  selectedWilaya?: string
  onWilayaChange?: (value: string) => void
  selectedCityId?: string | null
  onCityChange?: (cityId: string | null, cityName: string) => void
  isLocating?: boolean
  onDetectLocation?: () => void
}

export function Header({
  showNav = true,
  variant = 'default',
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  selectedWilaya = 'all',
  onWilayaChange,
  selectedCityId = null,
  onCityChange,
  isLocating = false,
  onDetectLocation,
}: HeaderProps) {
  const { t, language, dir } = useLanguage()
  const { user, profile, loading: authLoading } = useAuth()
  const { level, cycleLevel } = useFontSize()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createBrowserClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (!error) {
      window.location.href = '/dashboard'
    } else {
      setIsLoggingIn(false)
      alert(language === 'ar' ? 'خطأ في تسجيل الدخول' : language === 'fr' ? 'Erreur de connexion' : 'Login failed')
    }
  }

  const labels = {
    ar: {
      services: 'خدماتنا',
      findDoctor: 'البحث عن طبيب',
      eConsultation: 'استشارة عن بعد',
      pharmacies: 'الصيدليات',
      prescriptions: 'الوصفات الطبية',
      forDoctors: 'للأطباء',
      forPharmacies: 'للصيدليات',
      joinAsDoctor: 'انضم كطبيب',
      joinAsPharmacy: 'انضم كصيدلية',
      doctorDashboard: 'لوحة تحكم الطبيب',
      pharmacyDashboard: 'لوحة تحكم الصيدلية',
    },
    fr: {
      services: 'Nos services',
      findDoctor: 'Trouver un médecin',
      eConsultation: 'Téléconsultation',
      pharmacies: 'Pharmacies',
      prescriptions: 'Ordonnances',
      forDoctors: 'Pour les médecins',
      forPharmacies: 'Pour les pharmacies',
      joinAsDoctor: 'Rejoindre en tant que médecin',
      joinAsPharmacy: 'Rejoindre en tant que pharmacie',
      doctorDashboard: 'Tableau de bord médecin',
      pharmacyDashboard: 'Tableau de bord pharmacie',
    },
    en: {
      services: 'Our Services',
      findDoctor: 'Find a Doctor',
      eConsultation: 'E-Consultation',
      pharmacies: 'Pharmacies',
      prescriptions: 'Prescriptions',
      forDoctors: 'For Doctors',
      forPharmacies: 'For Pharmacies',
      joinAsDoctor: 'Join as Doctor',
      joinAsPharmacy: 'Join as Pharmacy',
      doctorDashboard: 'Doctor Dashboard',
      pharmacyDashboard: 'Pharmacy Dashboard',
    },
  }

  const l = labels[language]
  
  const hideTopBar = variant === 'mobile-home'

  return (
    <header className="sticky top-0 z-50 mx-2 rounded-xl overflow-hidden border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Top Bar - hidden on mobile home */}
      {!hideTopBar && (
      <div className="border-b border-border/50 bg-muted/30 shrink-0">
        <div className="container mx-auto flex h-10 items-center justify-between px-3 sm:px-4 text-xs gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
            {/* Mobile menu button - in top bar */}
            {showNav && variant !== 'mobile-home' && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 shrink-0"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? (language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close') : (language === 'ar' ? 'القائمة' : language === 'fr' ? 'Menu' : 'Menu')}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            )}
            {authLoading ? (
              <span className="text-xs text-muted-foreground flex items-center gap-2 min-w-0">
                <LoadingSpinner size="sm" className="h-3 w-3 shrink-0" />
                <span className="truncate opacity-70">{language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}</span>
              </span>
            ) : user ? (
              <span className="text-xs text-muted-foreground flex items-center gap-2 sm:gap-3 min-w-0 truncate">
                <span className="truncate">
                {language === 'ar'
                  ? `مسجل الدخول كـ ${
                      profile?.user_type === 'doctor'
                        ? 'طبيب'
                        : profile?.user_type === 'pharmacy'
                        ? 'صيدلي'
                        : profile?.user_type === 'laboratory'
                        ? 'مختبر'
                        : profile?.user_type === 'clinic'
                        ? 'عيادة'
                        : profile?.user_type === 'nurse'
                        ? 'ممرض'
                        : profile?.user_type === 'admin' || profile?.user_type === 'super_admin'
                        ? 'مسؤول'
                        : profile?.user_type === 'professional'
                        ? 'مهني'
                        : 'مريض'
                    }`
                  : language === 'fr'
                  ? `Connect�� en tant que ${
                      profile?.user_type === 'doctor'
                        ? 'médecin'
                        : profile?.user_type === 'pharmacy'
                        ? 'pharmacie'
                        : profile?.user_type === 'laboratory'
                        ? 'laboratoire'
                        : profile?.user_type === 'clinic'
                        ? 'clinique'
                        : profile?.user_type === 'nurse'
                        ? 'infirmier'
                        : profile?.user_type === 'admin' || profile?.user_type === 'super_admin'
                        ? 'administrateur'
                        : profile?.user_type === 'professional'
                        ? 'professionnel'
                        : 'patient'
                    }`
                  : `Logged in as ${
                      profile?.user_type === 'doctor'
                        ? 'Doctor'
                        : profile?.user_type === 'pharmacy'
                        ? 'Pharmacy'
                        : profile?.user_type === 'laboratory'
                        ? 'Laboratory'
                        : profile?.user_type === 'clinic'
                        ? 'Clinic'
                        : profile?.user_type === 'nurse'
                        ? 'Nurse'
                        : profile?.user_type === 'admin' || profile?.user_type === 'super_admin'
                        ? 'Admin'
                        : profile?.user_type === 'professional'
                        ? 'Professional'
                        : 'Patient'
                    }`}
                </span>
                {['doctor', 'pharmacy', 'laboratory', 'clinic', 'nurse', 'professional'].includes(profile?.user_type || '') && (
                  <Link href="/professional/dashboard" className="text-primary hover:underline font-medium">
                    {language === 'ar' ? 'لوحة المهنيين' : language === 'fr' ? 'Tableau de bord pro' : 'Professional Dashboard'}
                  </Link>
                )}
              </span>
            ) : (
              <>
                <Link
                  href="/professional/auth/login"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {language === 'ar'
                    ? 'دخول المهنيين'
                    : language === 'fr'
                    ? 'Connexion professionnelle'
                    : 'Professional Login'}
                </Link>
                <Link
                  href="/professional/auth/signup"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {language === 'ar'
                    ? 'انضم كمهني'
                    : language === 'fr'
                    ? 'Rejoindre en tant que professionnel'
                    : 'Join as Professional'}
                </Link>
              </>
            )}
          </div>
          
          {/* Patient Login Form - Hide when auth loading, user logged in, or on professional routes */}
          {!authLoading && !user && !pathname?.startsWith('/professional') && (
            <form onSubmit={handlePatientLogin} className="hidden lg:flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {language === 'ar' ? 'تسجيل دخول المريض:' : language === 'fr' ? 'Connexion patient:' : 'Patient Login:'}
              </span>
              <div className="relative">
                <Mail className="absolute start-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={language === 'ar' ? 'البريد' : language === 'fr' ? 'Email' : 'Email'}
                  className="h-7 w-48 text-xs ps-7 pe-2 py-0"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoggingIn}
                />
              </div>
              <div className="relative">
                <Lock className="absolute start-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={language === 'ar' ? 'كلمة المرور' : language === 'fr' ? 'Mot de passe' : 'Password'}
                  className="h-7 w-28 text-xs ps-7 pe-2 py-0"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={isLoggingIn}
                />
              </div>
              <Button type="submit" size="sm" className="h-7 px-3 text-xs" disabled={isLoggingIn}>
                {isLoggingIn ? <LoadingSpinner size="sm" className="h-3 w-3" /> : (language === 'ar' ? 'دخول' : language === 'fr' ? 'Entrer' : 'Login')}
              </Button>
              <Link href="/auth/signup" className="text-primary hover:underline text-xs">
                {language === 'ar' ? 'تسجيل' : language === 'fr' ? 'Inscription' : 'Sign up'}
              </Link>
            </form>
          )}
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      )}

      {/* Main Header */}
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 gap-2 min-w-0">
        {/* Logo (hidden on mobile except main welcome page) */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 sm:gap-3 min-w-0 shrink-0',
            pathname && pathname !== '/' && 'hidden sm:flex'
          )}
        >
          <Image
            src="/siha-dz-logo.png"
            alt="Siha DZ"
            width={180}
            height={120}
            className="h-16 sm:h-20 w-auto object-contain [filter:drop-shadow(0_0_0px_transparent)]"
            style={{ backgroundColor: 'transparent', mixBlendMode: 'multiply' }}
            priority
          />
        </Link>
        {/* Mobile: home button when logo is hidden (one-tap back to home) */}
        {pathname && pathname !== '/' && variant !== 'mobile-home' && (
          <Link
            href="/"
            className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
            aria-label={language === 'ar' ? 'الرئيسية' : language === 'fr' ? 'Accueil' : 'Home'}
          >
            <Home className="h-5 w-5" />
          </Link>
        )}

        {/* Search in header (listing pages) */}
        {onSearchChange && variant !== 'mobile-home' && (
          <>
            {/* Mobile: search + location in one bar (when location props provided) */}
            {onWilayaChange && (
              <div className="md:hidden flex-1 min-w-0 -mx-3 sm:-mx-4">
                <SearchWithLocation
                  searchValue={searchValue}
                  onSearchChange={onSearchChange}
                  searchPlaceholder={searchPlaceholder}
                  selectedWilaya={selectedWilaya}
                  onWilayaChange={onWilayaChange}
                  selectedCityId={selectedCityId}
                  onCityChange={onCityChange}
                  isLocating={isLocating}
                  onDetectLocation={onDetectLocation}
                />
              </div>
            )}
            {/* Desktop: plain search. Mobile: plain search when no location props */}
            <div className={cn(
              'relative flex-1 max-w-md mx-2 sm:mx-4 min-w-0',
              onWilayaChange ? 'hidden md:block' : ''
            )}>
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={searchPlaceholder ?? (language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...')}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 ps-9 text-sm bg-background"
              />
            </div>
          </>
        )}

        {/* Desktop Navigation */}
        {showNav && variant !== 'mobile-home' && (
          <nav className="hidden items-center gap-1 lg:flex">
            {/* Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-sm font-medium" suppressHydrationWarning>
                  {l.services}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={dir === 'rtl' ? 'end' : 'start'} className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/search?type=in-person" className="flex items-center gap-3 cursor-pointer">
                    <Building className="h-4 w-4 text-primary" />
                    <span>{l.findDoctor}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/search?type=e-visit" className="flex items-center gap-3 cursor-pointer">
                    <Video className="h-4 w-4 text-secondary" />
                    <span>{l.eConsultation}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/search?specialty=all&professionalType=doctor" className="flex items-center gap-3 cursor-pointer">
                    <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'ar' ? 'الأطباء' : language === 'fr' ? 'Médecins' : 'Doctors'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/clinics" className="flex items-center gap-3 cursor-pointer">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'ar' ? 'العيادات' : language === 'fr' ? 'Cliniques' : 'Clinics'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/labs" className="flex items-center gap-3 cursor-pointer">
                    <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'ar' ? 'المختبرات' : language === 'fr' ? 'Laboratoires' : 'Labs'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/nurses" className="flex items-center gap-3 cursor-pointer">
                    <Heart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'ar' ? 'الممرضون' : language === 'fr' ? 'Infirmiers' : 'Nurses'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pharmacies" className="flex items-center gap-3 cursor-pointer">
                    <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{l.pharmacies}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/prescriptions" className="flex items-center gap-3 cursor-pointer">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{l.prescriptions}</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/search">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                {t('search')}
              </Button>
            </Link>

            <Link href="/search?specialty=all&professionalType=doctor">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4" />
                {language === 'ar' ? 'الأطباء' : language === 'fr' ? 'Médecins' : 'Doctors'}
              </Button>
            </Link>

            <Link href="/clinics">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Building className="h-4 w-4" />
                {language === 'ar' ? 'العيادات' : language === 'fr' ? 'Cliniques' : 'Clinics'}
              </Button>
            </Link>

            <Link href="/labs">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <FlaskConical className="h-4 w-4" />
                {language === 'ar' ? 'المختبرات' : language === 'fr' ? 'Laboratoires' : 'Labs'}
              </Button>
            </Link>

            <Link href="/nurses">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Heart className="h-4 w-4" />
                {language === 'ar' ? 'الممرضون' : language === 'fr' ? 'Infirmiers' : 'Nurses'}
              </Button>
            </Link>

            <Link href="/pharmacies">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Pill className="h-4 w-4" />
                {l.pharmacies}
              </Button>
            </Link>
          </nav>
        )}

        {/* Auth Buttons / User Menu - on mobile-home, show theme + language before hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          {variant === 'mobile-home' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={cycleLevel}
                title={language === 'ar' ? `حجم الخط: ${level === 1 ? 'عادي' : level === 2 ? 'كبير' : 'أكبر'}` : language === 'fr' ? `Taille: ${level === 1 ? 'Normal' : level === 2 ? 'Grand' : 'Très grand'}` : `Font: ${level === 1 ? 'Normal' : level === 2 ? 'Large' : 'Larger'}`}
                aria-label={language === 'ar' ? 'تكبير النص' : language === 'fr' ? 'Agrandir le texte' : 'Increase font size'}
              >
                <Type className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? (language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close') : (language === 'ar' ? 'القائمة' : language === 'fr' ? 'Menu' : 'Menu')}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </>
          )}
          {authLoading ? (
            <div className="hidden items-center gap-2 sm:flex">
              <LoadingSpinner size="sm" className="h-4 w-4" />
            </div>
          ) : user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <PresenceStatusSelector
                userId={user.id}
                displayName={((profile?.full_name || '').trim() || (profile?.business_name || '').trim() || '').trim() || (language === 'ar' ? 'حساب' : language === 'fr' ? 'Compte' : 'Account')}
                avatarUrl={profile?.avatar_url}
                hideDot
                extraMenuItems={
                  <>
                    {['doctor', 'pharmacy', 'laboratory', 'clinic', 'professional'].includes(profile?.user_type || '') ? (
                      <DropdownMenuItem asChild>
                        <Link href="/professional/dashboard" className="flex items-center gap-3 cursor-pointer">
                          <Stethoscope className="h-4 w-4" />
                          <span>{language === 'ar' ? 'لوحة المهنيين' : language === 'fr' ? 'Tableau de bord pro' : 'Professional Dashboard'}</span>
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
                            <LayoutDashboard className="h-4 w-4" />
                            <span>{language === 'ar' ? 'لوحة التحكم' : language === 'fr' ? 'Tableau de bord' : 'Dashboard'}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/appointments" className="flex items-center gap-3 cursor-pointer">
                            <Calendar className="h-4 w-4" />
                            <span>{language === 'ar' ? 'مواعيدي' : language === 'fr' ? 'Mes rendez-vous' : 'My Appointments'}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/prescriptions" className="flex items-center gap-3 cursor-pointer">
                            <FileText className="h-4 w-4" />
                            <span>{language === 'ar' ? 'وصفاتي' : language === 'fr' ? 'Mes ordonnances' : 'My Prescriptions'}</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive bg-destructive/10 focus:bg-destructive/15 cursor-pointer [&[data-highlighted]]:bg-destructive/15">
                      <LogOut className="h-4 w-4 mr-3" />
                      <span>{language === 'ar' ? 'تسجيل الخروج' : language === 'fr' ? 'Se déconnecter' : 'Sign Out'}</span>
                    </DropdownMenuItem>
                  </>
                }
              />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-medium">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-semibold shadow-sm">
                  {t('register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Shortcuts bar - below main header when variant is mobile-home */}
      {variant === 'mobile-home' && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-3 py-2.5">
            <Link href="/search" className="flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px] active:bg-muted transition-colors shrink-0">
              <Search className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{t('search')}</span>
            </Link>
            <Link href="/search?specialty=all&professionalType=doctor" className="flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px] active:bg-muted transition-colors shrink-0">
              <Stethoscope className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{language === 'ar' ? 'أطباء' : language === 'fr' ? 'Médecins' : 'Doctors'}</span>
            </Link>
            <Link href="/clinics" className="flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px] active:bg-muted transition-colors shrink-0">
              <Building className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{language === 'ar' ? 'عيادات' : language === 'fr' ? 'Cliniques' : 'Clinics'}</span>
            </Link>
            <Link href="/labs" className="flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px] active:bg-muted transition-colors shrink-0">
              <FlaskConical className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{language === 'ar' ? 'مختبرات' : language === 'fr' ? 'Labs' : 'Labs'}</span>
            </Link>
            <Link href="/nurses" className="flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px] active:bg-muted transition-colors shrink-0">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{language === 'ar' ? 'ممرضون' : language === 'fr' ? 'Infirmiers' : 'Nurses'}</span>
            </Link>
            <Link href="/pharmacies" className="flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px] active:bg-muted transition-colors shrink-0">
              <Pill className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">{language === 'ar' ? 'صيدليات' : language === 'fr' ? 'Pharmacies' : 'Pharmacies'}</span>
            </Link>
          </div>
        </div>
      )}
      
      {/* Mobile Menu - Glass Sheet with rounded edges (mobile + desktop, all variants) */}
      {showNav && (variant === 'mobile-home' || variant === 'default') && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent 
            side={dir === 'rtl' ? 'right' : 'left'}
            overlayClassName="bg-black/40 backdrop-blur-sm"
            className={cn(
              "mobile-menu-sheet w-[85%] max-w-sm p-0 [&>button]:hidden overflow-hidden",
              "bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60",
              "border border-border/50 shadow-xl",
              "top-2 bottom-2 data-[state=open]:duration-300 data-[state=closed]:duration-200",
              dir === 'rtl' ? "rounded-s-2xl rounded-e-none" : "rounded-e-2xl rounded-s-none"
            )}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex h-full flex-col overflow-y-auto p-4">
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-1">
                {/* Services Section */}
            <div className="pb-3 mb-3 border-b">
              <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">{l.services}</p>
              <Link 
                href="/search?specialty=all&professionalType=doctor" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Stethoscope className="h-4 w-4 text-primary" />
                <span className="text-base font-medium">{language === 'ar' ? 'الأطباء' : language === 'fr' ? 'Médecins' : 'Doctors'}</span>
              </Link>
              <Link 
                href="/search?type=in-person" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building className="h-4 w-4 text-primary" />
                <span className="text-base font-medium">{l.findDoctor}</span>
              </Link>
              <Link 
                href="/search?type=e-visit" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Video className="h-4 w-4 text-secondary" />
                <span className="text-base font-medium">{l.eConsultation}</span>
              </Link>
              <Link 
                href="/clinics" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-base font-medium">{language === 'ar' ? 'العيادات' : language === 'fr' ? 'Cliniques' : 'Clinics'}</span>
              </Link>
              <Link 
                href="/labs" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-base font-medium">{language === 'ar' ? 'المختبرات' : language === 'fr' ? 'Laboratoires' : 'Labs'}</span>
              </Link>
              <Link 
                href="/nurses" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Heart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-base font-medium">{language === 'ar' ? 'الممرضون' : language === 'fr' ? 'Infirmiers' : 'Nurses'}</span>
              </Link>
              <Link 
                href="/pharmacies" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-base font-medium">{l.pharmacies}</span>
              </Link>
            </div>

            {/* Professional Section - hide when auth loading or logged in */}
            {!authLoading && !user && (
              <div className="pb-3 mb-3 border-b">
                <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">
                  {language === 'ar' ? 'للمهنيين' : language === 'fr' ? 'Professionnels' : 'Professionals'}
                </p>
                <Link 
                  href="/professional/auth/login" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium">
                    {language === 'ar' ? 'دخول المهنيين' : language === 'fr' ? 'Connexion professionnelle' : 'Professional Login'}
                  </span>
                </Link>
                <Link 
                  href="/professional/auth/signup" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium">
                    {language === 'ar' ? 'انضم كمهني' : language === 'fr' ? 'Rejoindre en tant que professionnel' : 'Join as Professional'}
                  </span>
                </Link>
              </div>
            )}

            {/* Auth Buttons / User Menu */}
            {authLoading ? (
              <div className="pt-2 border-t flex items-center gap-2 px-3 py-3">
                <LoadingSpinner size="sm" className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">{language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}</span>
              </div>
            ) : user ? (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-muted">
                  <PresenceStatusSelector userId={user.id} className="shrink-0" hideDot />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{((profile?.full_name || '').trim() || (profile?.business_name || '').trim() || '').trim() || (language === 'ar' ? 'حساب' : language === 'fr' ? 'Compte' : 'Account')}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                {['doctor', 'pharmacy', 'laboratory', 'clinic', 'professional'].includes(profile?.user_type || '') ? (
                  <Link 
                    href="/professional/dashboard" 
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{language === 'ar' ? 'لوحة المهنيين' : language === 'fr' ? 'Tableau de bord pro' : 'Professional Dashboard'}</span>
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/dashboard" 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{language === 'ar' ? 'لوحة التحكم' : language === 'fr' ? 'Tableau de bord' : 'Dashboard'}</span>
                    </Link>
                    <Link 
                      href="/dashboard/appointments" 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{language === 'ar' ? 'مواعيدي' : language === 'fr' ? 'Mes rendez-vous' : 'My Appointments'}</span>
                    </Link>
                  </>
                )}
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">{language === 'ar' ? 'تسجيل الخروج' : language === 'fr' ? 'Se déconnecter' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full bg-transparent font-medium">
                    {t('login')}
                  </Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full font-semibold">
                    {t('register')}
                  </Button>
                </Link>
              </div>
            )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  )
}

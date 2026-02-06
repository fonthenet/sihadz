'use client'

import React from "react"

import Link from 'next/link'
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
  FlaskConical // Import FlaskConical here
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLanguage } from '@/lib/i18n/language-context'
import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { AppLogo } from '@/components/app-logo'

interface HeaderProps {
  showNav?: boolean
}

export function Header({ showNav = true }: HeaderProps) {
  const { t, language, dir } = useLanguage()
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
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
  
  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Top Bar */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto flex h-10 items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-4">
            <Link href="/professional/auth/login" className="text-muted-foreground hover:text-primary transition-colors">
              {language === 'ar' ? 'دخول المهنيين' : language === 'fr' ? 'Connexion professionnelle' : 'Professional Login'}
            </Link>
            <Link href="/professional/auth/signup" className="text-muted-foreground hover:text-primary transition-colors">
              {language === 'ar' ? 'انضم كمهني' : language === 'fr' ? 'Rejoindre en tant que professionnel' : 'Join as Professional'}
            </Link>
          </div>
          
          {/* Patient Login Form - Only show if not logged in */}
          {!user && (
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
                {isLoggingIn ? <LoadingSpinner size="sm" /> : (language === 'ar' ? 'دخول' : language === 'fr' ? 'Entrer' : 'Login')}
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

      {/* Main Header */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <AppLogo size="lg" className="shrink-0" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground leading-tight">{t('appName')}</span>
            <span className="text-[10px] text-muted-foreground leading-none hidden sm:block">
              {language === 'ar' ? 'منصة الرعاية الصحية' : language === 'fr' ? 'Plateforme de santé' : 'Healthcare Platform'}
            </span>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        {showNav && (
          <nav className="hidden items-center gap-1 lg:flex">
            {/* Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-sm font-medium">
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
                  <Link href="/search?specialty=all" className="flex items-center gap-3 cursor-pointer">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    <span>{language === 'ar' ? 'الأطباء' : language === 'fr' ? 'Médecins' : 'Doctors'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/clinics" className="flex items-center gap-3 cursor-pointer">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span>{language === 'ar' ? 'العيادات' : language === 'fr' ? 'Cliniques' : 'Clinics'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/labs" className="flex items-center gap-3 cursor-pointer">
                    <FlaskConical className="h-4 w-4 text-teal-600" />
                    <span>{language === 'ar' ? 'المختبرات' : language === 'fr' ? 'Laboratoires' : 'Labs'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pharmacies" className="flex items-center gap-3 cursor-pointer">
                    <Pill className="h-4 w-4 text-green-600" />
                    <span>{l.pharmacies}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/prescriptions" className="flex items-center gap-3 cursor-pointer">
                    <FileText className="h-4 w-4 text-amber-600" />
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

            <Link href="/search?specialty=all">
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

            <Link href="/pharmacies">
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Pill className="h-4 w-4" />
                {l.pharmacies}
              </Button>
            </Link>
          </nav>
        )}

        {/* Auth Buttons / User Menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'} className="w-56">
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-3" />
                    <span>{language === 'ar' ? 'تسجيل الخروج' : language === 'fr' ? 'Se déconnecter' : 'Sign Out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-card p-4 lg:hidden">
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground">
              {language === 'ar' ? 'الإعدادات' : language === 'fr' ? 'Paramètres' : 'Settings'}
            </p>
            <ThemeToggle />
          </div>
          <nav className="flex flex-col gap-1">
            {/* Services Section */}
            <div className="pb-3 mb-3 border-b">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">{l.services}</p>
              <Link 
                href="/search?type=in-person" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{l.findDoctor}</span>
              </Link>
              <Link 
                href="/search?type=e-visit" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Video className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium">{l.eConsultation}</span>
              </Link>
              <Link 
                href="/clinics" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">{language === 'ar' ? 'العيادات' : language === 'fr' ? 'Cliniques' : 'Clinics'}</span>
              </Link>
              <Link 
                href="/labs" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FlaskConical className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium">{language === 'ar' ? 'المختبرات' : language === 'fr' ? 'Laboratoires' : 'Labs'}</span>
              </Link>
              <Link 
                href="/pharmacies" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Pill className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{l.pharmacies}</span>
              </Link>
            </div>

            {/* Professional Section */}
            <div className="pb-3 mb-3 border-b">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                {language === 'ar' ? 'للمهنيين' : language === 'fr' ? 'Professionnels' : 'Professionals'}
              </p>
              <Link 
                href="/professional/auth/login" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'دخول المهنيين' : language === 'fr' ? 'Connexion professionnelle' : 'Professional Login'}
                </span>
              </Link>
              <Link 
                href="/professional/auth/signup" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Stethoscope className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'انضم كمهني' : language === 'fr' ? 'Rejoindre en tant que professionnel' : 'Join as Professional'}
                </span>
              </Link>
            </div>

            {/* Auth Buttons / User Menu */}
            {user ? (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-muted">
                  <User className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{profile?.full_name || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
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
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-destructive"
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
      )}
    </header>
  )
}

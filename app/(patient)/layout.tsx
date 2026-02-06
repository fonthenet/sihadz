'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { LoadingSpinner } from '@/components/ui/page-loading'
import {
  Home,
  LayoutDashboard,
  X,
  Calendar,
  FileText,
  FolderHeart,
  MessageCircle,
  Wallet,
  Settings as SettingsIcon,
  Plus,
  Users,
  Brain,
  Type,
} from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'
import { useFontSize } from '@/contexts/font-size-context'
import { WeatherWidget } from '@/components/weather-widget'
import { NotificationCenter } from '@/components/notification-center'
import { LiveNotificationToast } from '@/components/live-notification-toast'
import { getWilayaByCode, getCityName } from '@/lib/data/algeria-locations'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASSES } from '@/lib/dashboard-layout'
import { OfflineSyncUserIdProvider } from '@/contexts/offline-sync-user-context'

function buildFallbackAddress(p?: {
  address?: string | null
  default_wilaya_code?: string | null
  default_city_id?: string | null
} | null): string | null {
  if (!p) return null
  const parts: string[] = []
  if (p.address?.trim()) parts.push(p.address.trim())
  if (p.default_wilaya_code) {
    const wilaya = getWilayaByCode(p.default_wilaya_code)
    if (wilaya) {
      const city = wilaya.cities.find((c) => c.id === p.default_city_id)
      if (city) parts.push(getCityName(city, 'en'))
      parts.push(wilaya.nameEn)
    }
  }
  return parts.length ? parts.join(', ') : null
}

interface PatientSidebarProps {
  userName: string | null
  fallbackAddress: string | null
  userId: string | null
}

function PatientSidebar({ userName, fallbackAddress, userId }: PatientSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { language } = useLanguage()
  const { isMobile, setOpenMobile } = useSidebar()
  const { level, cycleLevel } = useFontSize()

  const t = (en: string, fr: string, ar: string) =>
    language === 'ar' ? ar : language === 'fr' ? fr : en

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const closeMobile = () => isMobile && setOpenMobile(false)

  const handleSignOut = async () => {
    closeMobile()
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleNewAppointment = () => {
    closeMobile()
    router.push('/booking/new')
  }

  return (
    <Sidebar
      variant="inset"
      collapsible="offcanvas"
      glass
      className={cn(
        'sticky top-0 h-svh min-h-svh flex-shrink-0',
            SIDEBAR_WIDTH_CLASSES,
        'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        'border border-border/50 shadow-xl rounded-2xl overflow-hidden'
      )}
    >
      <SidebarHeader className={cn('p-3 md:p-4 gap-2 md:gap-3 min-w-0', isMobile ? 'pb-1' : 'pb-2 md:pb-3')}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-3 min-w-0 group shrink-0 flex-1" title={userName || t('Dashboard', 'Tableau de bord', 'لوحة التحكم')}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-200 text-sm font-semibold">
              {userName ? userName.charAt(0).toUpperCase() : <Home className="h-4 w-4" strokeWidth={2.25} />}
            </span>
            <span className="text-sm font-bold truncate">{userName || 'DZDOC'}</span>
          </Link>
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -me-1" onClick={() => setOpenMobile(false)} aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="min-w-0 overflow-hidden shrink-0">
          <WeatherWidget className="w-full text-sm font-medium min-w-0 max-w-full truncate" fallbackAddress={fallbackAddress} variant={isMobile ? 'compact' : 'minimal'} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-1">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('Overview', "Vue d'ensemble", 'نظرة عامة')}>
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('Overview', "Vue d'ensemble", 'نظرة عامة')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/appointments')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/appointments" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('My Appointments', 'Mes rendez-vous', 'مواعيدي')}>
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('My Appointments', 'Mes rendez-vous', 'مواعيدي')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/prescriptions')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/prescriptions" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('Prescriptions & Lab Tests', 'Ordonnances et analyses', 'الوصفات والتحاليل')}>
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('Prescriptions & Lab Tests', 'Ordonnances et analyses', 'الوصفات والتحاليل')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/documents')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/documents" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('Documents', 'Documents', 'الملفات')}>
                    <FolderHeart className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('Documents', 'Documents', 'الملفات')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/health-advisor')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/health-advisor" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('AI Health Advisor', 'Conseiller Santé IA', 'مستشار الصحة')}>
                    <Brain className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('AI Health Advisor', 'Conseiller Santé IA', 'مستشار الصحة')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/messages')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/messages" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('Messages', 'Messages', 'الرسائل')}>
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('Messages', 'Messages', 'الرسائل')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/wallet')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/wallet" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('Wallet', 'Portefeuille', 'المحفظة')}>
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('Wallet', 'Portefeuille', 'المحفظة')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/family')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/family" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('My Family', 'Ma Famille', 'عائلتي')}>
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('My Family', 'Ma Famille', 'عائلتي')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/settings')} className="rounded-xl h-10 px-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary dark:data-[active=true]:text-emerald-400 hover:bg-muted/70">
                  <Link href="/dashboard/settings" onClick={closeMobile} className="flex items-center justify-start gap-3 w-full" title={t('Settings', 'Paramètres', 'الإعدادات')}>
                    <SettingsIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('Settings', 'Paramètres', 'الإعدادات')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn('p-3 space-y-1.5 border-t border-border/50', isMobile && 'pt-4 mt-2')}>
        <Button
          className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm text-sm"
          onClick={handleNewAppointment}
          title={t('New Appointment', 'Nouveau RDV', 'موعد جديد')}
        >
          <Plus className="h-4 w-4 shrink-0 me-2" />
          <span>{t('New Appointment', 'Nouveau RDV', 'موعد جديد')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 rounded-xl justify-center gap-2 text-sm font-medium"
          onClick={cycleLevel}
          title={language === 'ar' ? `حجم الخط: ${level === 1 ? 'عادي' : level === 2 ? 'كبير' : 'أكبر'}` : language === 'fr' ? `Taille du texte: ${level === 1 ? 'Normal' : level === 2 ? 'Grand' : 'Très grand'}` : `Font size: ${level === 1 ? 'Normal' : level === 2 ? 'Large' : 'Larger'}`}
          aria-label={language === 'ar' ? 'تكبير النص' : language === 'fr' ? 'Agrandir le texte' : 'Increase font size'}
        >
          <Type className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {language === 'ar' ? (level === 1 ? 'عادي' : level === 2 ? 'كبير' : 'أكبر') : language === 'fr' ? (level === 1 ? 'Normal' : level === 2 ? 'Grand' : 'Très grand') : (level === 1 ? 'Normal' : level === 2 ? 'Large' : 'Larger')}
          </span>
        </Button>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            className="flex-1 h-8 rounded-xl justify-center gap-1.5 text-sm font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            asChild
            title={t('Home', 'Accueil', 'الرئيسية')}
          >
            <Link href="/" onClick={closeMobile}>
              <Home className="h-4 w-4 shrink-0" />
              <span>{t('Home', 'Accueil', 'الرئيسية')}</span>
            </Link>
          </Button>
          <SignOutButton
            onClick={handleSignOut}
            label={t('Sign Out', 'Déconnexion', 'تسجيل الخروج')}
            title={t('Sign Out', 'Déconnexion', 'تسجيل الخروج')}
            className="flex-1"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function PatientLayoutInner({
  children,
  userName,
  fallbackAddress,
  userId,
}: {
  children: React.ReactNode
  userName: string | null
  fallbackAddress: string | null
  userId: string | null
}) {
  const { language } = useLanguage()
  const pathname = usePathname()
  const { level, cycleLevel } = useFontSize()

  // Scroll to top when navigating to a new page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  
  // Pages that render their own full-height content (no wrapper needed)
  const isFullHeightPage = pathname?.includes('/messages') || pathname?.includes('/chat')

  return (
    <>
      <div className="flex min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <PatientSidebar userName={userName} fallbackAddress={fallbackAddress} userId={userId} />
      </div>
      <LiveNotificationToast userId={userId} />
      <main className="flex-1 w-full min-w-0 max-w-none px-2 py-4 sm:px-4 sm:py-6 md:px-4 lg:px-6 xl:px-6">
        {/* Top bar: notifications on far right upper corner (mobile + desktop) */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 -mx-2 sm:-mx-4 md:-mx-4 lg:-mx-6 xl:-mx-6 sm:px-4 md:px-4 lg:px-6 xl:px-6">
          <div className="md:hidden flex items-center gap-2 min-w-0 flex-1">
            <SidebarTrigger className="h-9 w-9 shrink-0" aria-label="Open menu" />
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white text-sm font-semibold">
                {userName ? userName.charAt(0).toUpperCase() : <Home className="h-4 w-4" strokeWidth={2.25} />}
              </span>
              <span className="text-sm font-bold truncate">{userName || 'DZDOC'}</span>
            </Link>
          </div>
          <div className="flex items-center justify-end gap-2 min-w-0 ms-auto">
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
            <NotificationCenter userId={userId} compact />
          </div>
        </div>
        {isFullHeightPage ? (
          children
        ) : (
          <div className="min-h-full bg-slate-50 dark:bg-slate-950 rounded-lg py-4 sm:py-6 px-0">
            {children}
          </div>
        )}
      </main>
    </>
  )
}

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [fallbackAddress, setFallbackAddress] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isProfessionalRedirect, setIsProfessionalRedirect] = useState(false)

  // Redirect professionals to their dashboard – run before any patient UI
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user?.id) return
      // 1. Check professionals table (source of truth)
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (professional) {
        setIsProfessionalRedirect(true)
        router.replace('/professional/dashboard')
        return
      }
      // 2. Fetch profile (for redirect check + layout data)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, full_name, address, default_wilaya_code, default_city_id')
        .eq('id', user.id)
        .maybeSingle()
      const profTypes = ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'professional']
      if (profile?.user_type && profTypes.includes(profile.user_type)) {
        setIsProfessionalRedirect(true)
        router.replace('/professional/dashboard')
        return
      }
      setUserId(user.id)
      if (profile) {
        setFallbackAddress(buildFallbackAddress(profile))
        if (profile.full_name) setUserName(profile.full_name)
      }
    })
  }, [router])

  useEffect(() => {
    if (!userId) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('profile-address')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        const row = payload.new as { full_name?: string; address?: string; default_wilaya_code?: string; default_city_id?: string }
        setFallbackAddress(buildFallbackAddress(row))
        if (row.full_name) setUserName(row.full_name)
      })
      .subscribe()
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { full_name?: string; address?: string; default_wilaya_code?: string; default_city_id?: string } | undefined
      if (detail) {
        setFallbackAddress(buildFallbackAddress(detail))
        if (detail.full_name) setUserName(detail.full_name)
      }
    }
    window.addEventListener('profile-updated', onProfileUpdated)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('profile-updated', onProfileUpdated)
    }
  }, [userId])

  if (isProfessionalRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoadingSpinner size="lg" />
          <span className="text-sm">Redirecting...</span>
        </div>
      </div>
    )
  }

  return (
    <OfflineSyncUserIdProvider userId={userId}>
    <SidebarProvider defaultOpen={true}>
      <PatientLayoutInner userName={userName} fallbackAddress={fallbackAddress} userId={userId}>
        {children}
      </PatientLayoutInner>
    </SidebarProvider>
    </OfflineSyncUserIdProvider>
  )
}

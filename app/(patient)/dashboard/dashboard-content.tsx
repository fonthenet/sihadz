'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/language-context'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { usePatientAppointments } from '@/hooks/use-patient-appointments'
import { createBrowserClient } from '@/lib/supabase/client'
import { ChevronRight, ChevronLeft, Calendar, Plus, FileText, Pill, MessageCircle, FolderHeart, Wallet, Sparkles, ArrowUpDown, FlaskConical } from 'lucide-react'
import { SectionLoading } from '@/components/ui/page-loading'
import { VitalCard, type PatientVitals } from '@/components/dashboard/vital-card'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'
import { formatDateAlgeria } from '@/lib/date-algeria'
import { AppointmentCard } from '@/components/dashboard/appointment-card'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAppointmentStatusLabel as getStatusLabel } from '@/lib/appointment-status'
import type { StatusLanguage } from '@/lib/appointment-status'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function PatientDashboard() {
  const { t, language, dir } = useLanguage()
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = useMemo(() => createBrowserClient(), [])

  const { unifiedItems, upcomingItems, loading, refetch } = usePatientAppointments(
    user?.id,
    language
  )

  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true)
  const [labRequestsCount, setLabRequestsCount] = useState(0)
  const [labRequestsLoading, setLabRequestsLoading] = useState(true)
  const [vitals, setVitals] = useState<PatientVitals | null>(null)
  const [vitalsLoading, setVitalsLoading] = useState(true)

  const loadVitals = useCallback(async () => {
    if (!user?.id) {
      setVitalsLoading(false)
      return
    }
    setVitalsLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications, date_of_birth, gender')
      .eq('id', user.id)
      .maybeSingle()
    setVitals(data || null)
    setVitalsLoading(false)
  }, [user?.id, supabase])

  useEffect(() => {
    loadVitals()
  }, [loadVitals])

  useEffect(() => {
    async function loadPrescriptions() {
      if (!user?.id) {
        setPrescriptionsLoading(false)
        return
      }
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setPrescriptions(data || [])
      setPrescriptionsLoading(false)
    }
    loadPrescriptions()
  }, [user?.id, supabase])

  useEffect(() => {
    async function loadLabRequestsCount() {
      if (!user?.id) {
        setLabRequestsLoading(false)
        return
      }
      const { count } = await supabase
        .from('lab_test_requests')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
      setLabRequestsCount(count ?? 0)
      setLabRequestsLoading(false)
    }
    loadLabRequestsCount()
  }, [user?.id, supabase])

  useAutoRefresh(refetch, 60_000, { enabled: !!user })

  useEffect(() => {
    async function checkUserRole() {
      if (!user?.id) return
      const { data: professionalData } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (professionalData) {
        router.push('/professional/dashboard')
      }
    }
    checkUserRole()
  }, [user, supabase, router])

  useEffect(() => {
    if (searchParams.get('from') === 'pro-login') {
      const msg = language === 'ar'
        ? 'تم توجيهك إلى لوحة تحكم المريض. استخدم تسجيل دخول المريض في المرة القادمة.'
        : language === 'fr'
          ? 'Vous avez été redirigé vers le tableau de bord patient. Utilisez la connexion patient la prochaine fois.'
          : 'You were redirected to your patient dashboard. Use the patient login next time.'
      toast({ title: msg, variant: 'default' })
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router, toast, language])

  const activePrescriptions = prescriptions.filter(rx => rx.status === 'ready')
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    const name = profile?.full_name?.split(' ')[0] || ''
    if (language === 'ar') {
      if (hour < 12) return name ? `صباح الخير، ${name}` : 'صباح الخير'
      if (hour < 18) return name ? `مساء الخير، ${name}` : 'مساء الخير'
      return name ? `مساء النور، ${name}` : 'مساء النور'
    }
    if (language === 'fr') {
      if (hour < 12) return name ? `Bonjour, ${name}` : 'Bonjour'
      if (hour < 18) return name ? `Bon après-midi, ${name}` : 'Bon après-midi'
      return name ? `Bonsoir, ${name}` : 'Bonsoir'
    }
    if (hour < 12) return name ? `Good morning, ${name}` : 'Good morning'
    if (hour < 18) return name ? `Good afternoon, ${name}` : 'Good afternoon'
    return name ? `Good evening, ${name}` : 'Good evening'
  }, [profile?.full_name, language])

  const langStatus: StatusLanguage = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  const getAppointmentStatusLabel = (status: string | undefined, pharmacyName?: string | null) =>
    getStatusLabel(status, pharmacyName ?? null, langStatus)
  const typeIcons: Record<string, any> = {
    appointment: Calendar,
    prescription: Pill,
    lab_request: FileText,
    referral: FileText,
  }

  const handleJoinVideoCall = (appointmentId: string) => {
    window.open(`/video-call/${appointmentId}`, '_blank')
  }
  const handleWhatsAppCall = (phone: string) => window.open(`https://wa.me/${phone}`, '_blank')
  const handlePhoneCall = (phone: string) => { window.location.href = `tel:${phone}` }
  const ArrowIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  if (authLoading || loading) {
    return (
      <DashboardPageWrapper maxWidth="xl" showHeader={false}>
        <SectionLoading
          minHeight="min-h-[280px]"
          label={language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}
        />
      </DashboardPageWrapper>
    )
  }

  return (
    <DashboardPageWrapper maxWidth="xl" showHeader={false}>
      {/* Hero / Welcome - responsive for 320px-428px */}
      <section className="relative overflow-hidden rounded-none min-[375px]:rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 dark:from-primary/30 dark:via-primary/20 dark:to-primary/10 border border-primary/25 shadow-sm shadow-primary/5 dark:shadow-primary/10 p-4 min-[375px]:p-5 md:p-6">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/15 dark:bg-primary/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative space-y-0.5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {language === 'ar' ? 'نظرة عامة' : language === 'fr' ? 'Vue d\'ensemble' : 'Overview'}
            </span>
          </div>
          <h1 className="text-lg min-[375px]:text-xl md:text-2xl font-bold tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            {language === 'ar'
              ? 'ملخص صحتك ومواعيدك في مكان واحد'
              : language === 'fr'
                ? 'Votre santé et vos rendez-vous en un coup d\'œil'
                : 'Your health and appointments at a glance'}
          </p>
        </div>
      </section>

      {/* Vital Card */}
      <section>
        <VitalCard
          vitals={vitals}
          loading={vitalsLoading}
          language={language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'}
          userId={user?.id}
          onSaved={loadVitals}
        />
      </section>

      {/* Quick Stats - responsive for 320px-428px */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-[375px]:gap-3">
        <Link href="/dashboard/appointments" className="group">
          <Card className="rounded-none sm:rounded-xl h-full border-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-3 min-[375px]:p-4 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-9 w-9 min-[375px]:h-11 min-[375px]:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Calendar className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl min-[375px]:text-2xl font-bold tabular-nums">{upcomingItems.length}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {language === 'ar' ? 'القادم' : language === 'fr' ? 'À venir' : 'Upcoming'}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/prescriptions" className="group">
          <Card className="rounded-none sm:rounded-xl h-full hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-3 min-[375px]:p-4 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-9 w-9 min-[375px]:h-11 min-[375px]:w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 group-hover:bg-amber-500/15 transition-colors">
                <Pill className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl min-[375px]:text-2xl font-bold tabular-nums">{activePrescriptions.length}</p>
                <p className="text-xs text-muted-foreground truncate">{t('prescriptions')}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/messages" className="group">
          <Card className="rounded-none sm:rounded-xl h-full hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-3 min-[375px]:p-4 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-9 w-9 min-[375px]:h-11 min-[375px]:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
                <MessageCircle className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {language === 'ar' ? 'الرسائل' : language === 'fr' ? 'Messages' : 'Messages'}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/prescriptions?tab=labtests" className="group">
          <Card className="rounded-none sm:rounded-xl h-full hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-3 min-[375px]:p-4 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-9 w-9 min-[375px]:h-11 min-[375px]:w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 group-hover:bg-violet-500/15 transition-colors">
                <FlaskConical className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl min-[375px]:text-2xl font-bold tabular-nums">
                  {labRequestsLoading ? '–' : labRequestsCount}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {language === 'ar' ? 'التحاليل' : language === 'fr' ? 'Analyses' : 'Lab Tests'}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* My Appointments — merged upcoming + all */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-1.5 min-w-0 text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors cursor-pointer"
            >
              <h2 className="text-lg min-[375px]:text-xl font-semibold tracking-tight min-w-0">
                {language === 'ar' ? 'مواعيدي' : language === 'fr' ? 'Mes Rendez-vous' : 'My Appointments'}
              </h2>
              <ArrowIcon className="h-4 w-4 shrink-0 opacity-70" />
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {language === 'ar' ? 'ترتيب' : language === 'fr' ? 'Trier' : 'Sort'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>
                    {language === 'ar' ? 'ترتيب وتجميع' : language === 'fr' ? 'Trier & grouper' : 'Sort & group'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments?sort=date-desc&group=category">
                        {language === 'ar' ? 'التاريخ (الأحدث)' : language === 'fr' ? 'Date (récent)' : 'Date (newest)'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments?sort=date-asc&group=category">
                        {language === 'ar' ? 'التاريخ (الأقدم)' : language === 'fr' ? 'Date (ancien)' : 'Date (oldest)'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments?sort=status&group=category">
                        {language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments?group=category">
                        {language === 'ar' ? 'تجميع بالفئة' : language === 'fr' ? 'Grouper par catégorie' : 'Group by category'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments?group=date">
                        {language === 'ar' ? 'تجميع بالتاريخ' : language === 'fr' ? 'Grouper par date' : 'Group by date'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments?group=none">
                        {language === 'ar' ? 'بدون تجميع' : language === 'fr' ? 'Sans regroupement' : 'No grouping'}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0">
            {language === 'ar'
              ? 'المواعيد والتذاكر والوصفات والمختبر'
              : language === 'fr'
                ? 'Rendez-vous, tickets, ordonnances et labo'
                : 'Appointments, tickets, prescriptions & lab'}
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="h-auto min-h-9 min-[375px]:min-h-10 p-1 rounded-lg min-[375px]:rounded-xl bg-muted/50 border flex flex-wrap sm:inline-flex w-full sm:w-fit gap-1">
            <TabsTrigger
              value="upcoming"
              className="gap-2 text-sm rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              {language === 'ar' ? 'القادم' : language === 'fr' ? 'À venir' : 'Upcoming'}
              {upcomingItems.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{upcomingItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="gap-2 text-sm rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'الكل' : language === 'fr' ? 'Historique' : 'History'}
              {unifiedItems.length > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-xs">{unifiedItems.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingItems.length === 0 ? (
              <Card className="rounded-none sm:rounded-xl overflow-hidden border-2 border-dashed">
                <CardContent className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="rounded-2xl">
                        <Calendar className="h-10 w-10 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle className="text-lg">
                        {language === 'ar' ? 'لا توجد مواعيد قادمة' : language === 'fr' ? 'Aucun rendez-vous à venir' : 'No upcoming appointments'}
                      </EmptyTitle>
                      <EmptyDescription>
                        {language === 'ar' ? 'احجز موعدك الأول مع طبيبك' : language === 'fr' ? 'Réservez votre premier rendez-vous' : 'Book your first appointment with a doctor'}
                      </EmptyDescription>
                    </EmptyHeader>
                    <Link href="/booking/new" className="mt-6 inline-block">
                      <Button size="lg" className="rounded-xl">
                        {language === 'ar' ? 'احجز موعداً' : language === 'fr' ? 'Réserver' : 'Book appointment'}
                      </Button>
                    </Link>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingItems.slice(0, 5).map((item) => (
                  <AppointmentCard
                    key={item.id}
                    item={item}
                    language={language}
                    dir={dir}
                    langStatus={langStatus}
                    getStatusLabel={getAppointmentStatusLabel}
                    typeIcons={typeIcons}
                    isUpcoming
                    onJoinVideo={handleJoinVideoCall}
                    onPhoneCall={handlePhoneCall}
                    onWhatsApp={handleWhatsAppCall}
                  />
                ))}
                {upcomingItems.length > 5 && (
                  <Link href="/dashboard/appointments" className="block">
                    <Button variant="ghost" className="w-full rounded-xl">
                      {language === 'ar' ? `عرض ${upcomingItems.length - 5} المزيد` : language === 'fr' ? `Voir ${upcomingItems.length - 5} de plus` : `View ${upcomingItems.length - 5} more`}
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {unifiedItems.length === 0 ? (
              <Card className="rounded-none sm:rounded-xl overflow-hidden border-2 border-dashed">
                <CardContent className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="rounded-2xl">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle className="text-lg">
                        {language === 'ar' ? 'لا توجد مواعيد أو تذاكر' : language === 'fr' ? 'Aucun rendez-vous ni ticket' : 'No appointments or tickets'}
                      </EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {unifiedItems.slice(0, 5).map((item) => (
                  <AppointmentCard
                    key={item.id}
                    item={item}
                    language={language}
                    dir={dir}
                    langStatus={langStatus}
                    getStatusLabel={getAppointmentStatusLabel}
                    typeIcons={typeIcons}
                    isUpcoming={item.status === 'confirmed' || item.status === 'pending'}
                    onJoinVideo={handleJoinVideoCall}
                    onPhoneCall={handlePhoneCall}
                    onWhatsApp={handleWhatsAppCall}
                  />
                ))}
                {unifiedItems.length > 5 && (
                  <Link href="/dashboard/appointments" className="block">
                    <Button variant="ghost" className="w-full rounded-xl">
                      {language === 'ar' ? `عرض الكل (${unifiedItems.length})` : language === 'fr' ? `Tout voir (${unifiedItems.length})` : `View all (${unifiedItems.length})`}
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Quick Links - responsive for 320px-428px */}
      <section className="grid gap-3 min-[375px]:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/prescriptions">
          <Card className="rounded-none sm:rounded-xl group h-full overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-4 min-[375px]:p-5 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t('prescriptions')}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {language === 'ar' ? 'عرض وإدارة الوصفات' : language === 'fr' ? 'Voir et gérer les ordonnances' : 'View and manage prescriptions'}
                </p>
              </div>
              <ArrowIcon className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/documents">
          <Card className="rounded-none sm:rounded-xl group h-full overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-4 min-[375px]:p-5 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 group-hover:bg-secondary/15 transition-colors">
                <FolderHeart className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t('documents')}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {language === 'ar' ? 'مستنداتك وملفاتك' : language === 'fr' ? 'Vos documents et dossiers' : 'Your documents and files'}
                </p>
              </div>
              <ArrowIcon className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/wallet">
          <Card className="rounded-none sm:rounded-xl group h-full overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-4 min-[375px]:p-5 flex items-center gap-3 min-[375px]:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
                <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{language === 'ar' ? 'المحفظة' : language === 'fr' ? 'Portefeuille' : 'Wallet'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {language === 'ar' ? 'المحفظة والمدفوعات' : language === 'fr' ? 'Portefeuille et paiements' : 'Wallet and payments'}
                </p>
              </div>
              <ArrowIcon className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </section>
    </DashboardPageWrapper>
  )
}

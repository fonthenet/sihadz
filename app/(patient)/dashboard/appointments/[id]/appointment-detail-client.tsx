'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSmartBack } from '@/hooks/use-smart-back'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, Clock, MapPin, Video, Building2,
  Phone, FileText, Pill, TestTube, Stethoscope, AlertCircle, UserPlus, Brain, CalendarPlus, Paperclip
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { PrescriptionWorkflow } from '@/components/prescription-workflow'
import { LabTestWorkflow } from '@/components/lab-test-workflow'
import { ReferralWorkflow } from '@/components/referral-workflow'
import { VisitDocumentsAttach } from '@/components/visit-documents-attach'
import { useLanguage } from '@/lib/i18n/language-context'
import { parseDateOnlyAsLocal, formatDateAlgeria } from '@/lib/date-algeria'
import type { AlgeriaLang } from '@/lib/date-algeria'
import {
  getAppointmentStatusLabel,
  getDisplayStatus,
  getPharmacyName,
  getStatusBadgeClassName,
} from '@/lib/appointment-status'
import type { StatusLanguage } from '@/lib/appointment-status'

interface AppointmentDetailClientProps {
  id: string
  prescriptionParam?: string | null
  labRequestParam?: string | null
}

export default function AppointmentDetailClient({ id, prescriptionParam, labRequestParam }: AppointmentDetailClientProps) {
  const router = useRouter()
  const goBack = useSmartBack('/dashboard/appointments')
  const { language, dir } = useLanguage()
  const defaultTab = labRequestParam ? 'lab-tests' : (prescriptionParam ? 'prescriptions' : 'prescriptions')
  const [appointment, setAppointment] = useState<any>(null)
  const [linkedTicket, setLinkedTicket] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])
  const [pharmacyNameFromPrescription, setPharmacyNameFromPrescription] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [sharedAiAnalysis, setSharedAiAnalysis] = useState<any>(null)

  const loadAppointment = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: appt, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !appt) {
      console.error('Error loading appointment:', error)
      return
    }

    if (appt.doctor_id) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', appt.doctor_id)
        .single()

      const { data: doctorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, email')
        .eq('id', appt.doctor_id)
        .single()

      appt.doctor = doctor
      appt.doctor_profile = doctorProfile
    }

    if (appt.patient_id) {
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, email')
        .eq('id', appt.patient_id)
        .single()

      appt.patient = patientProfile
    }

    setAppointment(appt)

    const { data: ticketData } = await supabase
      .from('healthcare_tickets')
      .select('id, status, metadata')
      .eq('appointment_id', id)
      .eq('patient_id', user.id)
      .maybeSingle()
    setLinkedTicket(ticketData ?? null)

    const { data: presc } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })

    setPrescriptions(presc || [])

    const firstPrescWithPharmacy = (presc || []).find((p: any) => p.pharmacy_id)
    if (firstPrescWithPharmacy?.pharmacy_id) {
      const { data: ph } = await supabase
        .from('professionals')
        .select('business_name')
        .eq('id', firstPrescWithPharmacy.pharmacy_id)
        .maybeSingle()
      setPharmacyNameFromPrescription(ph?.business_name ?? null)
    } else {
      setPharmacyNameFromPrescription(null)
    }

    const { data: labReq } = await supabase
      .from('lab_test_requests')
      .select(`
        *,
        items:lab_test_items(
          id,
          result_value,
          result_unit,
          reference_range,
          result_status,
          lab_notes,
          test_type:lab_test_types(id, name, name_ar, category)
        )
      `)
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })

    setLabRequests(labReq || [])

    // Fetch referrals linked to this visit (originating_appointment_id)
    const { data: refData, error: refErr } = await supabase
      .from('referrals')
      .select('*, referred_to_doctor:referred_to_doctor_id(id, business_name, specialty, wilaya, phone)')
      .eq('originating_appointment_id', id)
      .order('created_at', { ascending: false })
    if (!refErr) setReferrals(refData || [])

    // Fetch shared AI analysis (doctor may have shared visit analysis with patient)
    try {
      const aiRes = await fetch(`/api/analyze-patient/patient?appointmentId=${id}`)
      if (aiRes.ok) {
        const aiData = await aiRes.json()
        if (aiData.analysis) setSharedAiAnalysis(aiData.analysis)
        else setSharedAiAnalysis(null)
      } else setSharedAiAnalysis(null)
    } catch {
      setSharedAiAnalysis(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAppointment()
  }, [id])

  useEffect(() => {
    if (!id) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`patient-appointment-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prescriptions',
        filter: `appointment_id=eq.${id}`,
      }, () => { loadAppointment() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_test_requests',
        filter: `appointment_id=eq.${id}`,
      }, () => { loadAppointment() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'patient_ai_analyses',
        filter: `appointment_id=eq.${id}`,
      }, () => { loadAppointment() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleCancel = async () => {
    setCancelling(true)
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
    setCancelling(false)
    setCancelDialogOpen(false)
    if (!error) {
      setAppointment((prev: any) => prev ? { ...prev, status: 'cancelled' } : null)
      setTimeout(() => goBack(), 500)
    } else {
      alert(language === 'ar' ? 'فشل في إلغاء الموعد' : language === 'fr' ? 'Échec de l\'annulation' : 'Failed to cancel')
    }
  }

  const langStatus: StatusLanguage = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  const lang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  const statusItem = appointment ? {
    status: appointment.status,
    ticket_status: linkedTicket?.status,
    pharmacy_name: linkedTicket?.metadata?.pharmacy_name ?? pharmacyNameFromPrescription,
    rawData: linkedTicket,
  } : null
  const displayStatus = statusItem ? getDisplayStatus(statusItem) : ''
  const pharmacyName = statusItem ? getPharmacyName(statusItem) : null
  const statusLabel = statusItem ? getAppointmentStatusLabel(displayStatus, pharmacyName, langStatus) : '—'

  const isVideo = appointment?.visit_type === 'video' || appointment?.visit_type === 'e-visit'

  if (loading) {
    return (
      <div className="w-full py-4 sm:py-6 px-4 sm:px-6">
        <div className="flex flex-col gap-8">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="w-full py-4 sm:py-6 px-4 sm:px-6 flex items-center justify-center min-h-[50vh]">
        <Empty className="rounded-2xl border-2 border-dashed bg-muted/20 py-12 px-8">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="rounded-xl mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle className="text-lg">{language === 'ar' ? 'الموعد غير موجود' : language === 'fr' ? 'Rendez-vous introuvable' : 'Appointment not found'}</EmptyTitle>
            <EmptyDescription>{language === 'ar' ? 'قد يكون الرابط خاطئاً أو تم حذف الموعد' : language === 'fr' ? 'Le lien peut être incorrect ou le rendez-vous a été supprimé' : 'The link may be wrong or the appointment was deleted'}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="default" className="mt-6 rounded-xl" onClick={() => router.push('/dashboard/appointments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'العودة' : language === 'fr' ? 'Retour' : 'Go back'}
          </Button>
        </Empty>
      </div>
    )
  }

  const doctor = appointment.doctor
  const doctorProfile = appointment.doctor_profile
  const patient = appointment.patient
  const doctorName = appointment.doctor_display_name || doctorProfile?.full_name || doctor?.full_name || 'Doctor'
  const formattedDate = formatDateAlgeria(parseDateOnlyAsLocal(appointment.appointment_date) ?? new Date(0), lang as AlgeriaLang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="w-full" dir={dir}>
      <div className="flex flex-col gap-6 md:gap-8 py-4 sm:py-6 md:py-8 lg:py-10 px-0">
        {/* Header — compact */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={goBack} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                {language === 'ar' ? 'تفاصيل الموعد' : language === 'fr' ? 'Détails du rendez-vous' : 'Appointment details'}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">{formattedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Badge className={cn('text-xs px-2.5 py-1 rounded-lg', getStatusBadgeClassName(displayStatus))}>
              {statusLabel}
            </Badge>
            {(appointment.doctor_id ?? appointment.professional_id) && (
              <Button size="sm" className="rounded-xl h-9 px-4 text-xs" asChild>
                <Link href={`/booking/new?doctor=${appointment.doctor_id ?? appointment.professional_id}`}>
                  <CalendarPlus className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'إعادة الحجز مع نفس الطبيب' : language === 'fr' ? 'Revoir ce médecin' : 'Rebook with same doctor'}
                </Link>
              </Button>
            )}
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Button variant="destructive" size="sm" className="rounded-xl h-9 px-4 text-xs" onClick={() => setCancelDialogOpen(true)}>
                {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
            )}
          </div>
        </header>

        {/* Doctor & appointment info — full card, mobile-optimized */}
        <div className="rounded-none sm:rounded-xl border bg-card p-4 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8">
            {/* Doctor — compact on mobile */}
            <div className="flex flex-wrap items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-xl sm:rounded-2xl border shrink-0">
                <AvatarImage src={doctorProfile?.avatar_url || '/placeholder.svg'} />
                <AvatarFallback className="rounded-xl sm:rounded-2xl bg-primary/10 text-primary text-lg sm:text-xl">
                  <Stethoscope className="h-6 w-6 sm:h-8 sm:w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                {(appointment.doctor_id ?? appointment.professional_id) ? (
                  <Link
                    href={`/doctors/${appointment.doctor_id ?? appointment.professional_id}`}
                    className="inline-block text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors cursor-pointer w-fit"
                  >
                    <h2 className="text-base sm:text-lg font-semibold truncate">{doctorName}</h2>
                  </Link>
                ) : (
                  <h2 className="text-base sm:text-lg font-semibold truncate">{doctorName}</h2>
                )}
                <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1">{appointment.doctor_specialty || doctor?.specialty || 'Medical Professional'}</p>
                {(doctor?.address || doctor?.city) && (
                  <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 truncate">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">{doctor?.address || doctor?.city}</span>
                  </p>
                )}
                {doctorProfile?.phone && (
                  <a href={`tel:${doctorProfile.phone}`} className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 hover:text-primary transition-colors">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span dir="ltr">{doctorProfile.phone}</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-muted/50 border min-w-0 shrink-0">
                {isVideo ? <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> : <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />}
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{language === 'ar' ? 'النوع' : language === 'fr' ? 'Type' : 'Type'}</p>
                  <p className="text-sm sm:text-base font-semibold truncate">
                    {isVideo
                      ? (language === 'ar' ? 'فيديو' : language === 'fr' ? 'Téléconsultation' : 'Video')
                      : (language === 'ar' ? 'حضوري' : language === 'fr' ? 'En personne' : 'In-person')}
                  </p>
                </div>
              </div>
            </div>

            {/* Date / Time — 2-col grid on mobile, flex on desktop */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-muted/50 border min-w-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}</p>
                  <p className="text-sm sm:text-base font-semibold truncate">{formatDateAlgeria(parseDateOnlyAsLocal(appointment.appointment_date) ?? new Date(0), lang as AlgeriaLang)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-muted/50 border min-w-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{language === 'ar' ? 'الوقت' : language === 'fr' ? 'Heure' : 'Time'}</p>
                  <p className="text-sm sm:text-base font-semibold" dir="ltr">{(appointment.appointment_time || '').substring(0, 5)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor note — sticky note style */}
          {((appointment.doctor_note_for_patient ?? '') || '').trim() && (
            <div className="mt-4 sm:mt-6 rounded-lg border-amber-200/80 dark:border-amber-700/50 bg-amber-50/90 dark:bg-amber-950/30 shadow-sm shadow-amber-200/30 dark:shadow-amber-900/20 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                {language === 'ar' ? 'ملاحظة الطبيب' : language === 'fr' ? 'Note du médecin' : 'Doctor note'}
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">{(appointment.doctor_note_for_patient ?? '').trim()}</p>
            </div>
          )}
        </div>

        {/* Shared AI Visit Summary (when doctor has shared) */}
        {sharedAiAnalysis && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="p-4 md:p-6 border-b bg-violet-50/50 dark:bg-violet-950/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-600" />
                {language === 'ar' ? 'ملخص الزيارة (تحليل ذكي)' : language === 'fr' ? 'Résumé de visite (analyse IA)' : 'Visit summary (AI analysis)'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'شارك طبيبك هذا الملخص معك للمراجعة' : language === 'fr' ? 'Votre médecin a partagé ce résumé avec vous' : 'Your doctor shared this summary with you'}
              </p>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {sharedAiAnalysis.differential_diagnosis && sharedAiAnalysis.differential_diagnosis.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    {language === 'ar' ? 'تشخيص تفريقي' : language === 'fr' ? 'Diagnostic différentiel' : 'Differential diagnosis'}
                  </p>
                  <ul className="space-y-1.5">
                    {sharedAiAnalysis.differential_diagnosis.map((d: any, i: number) => (
                      <li key={i} className="text-sm">
                        <strong>{d.condition}</strong> ({d.likelihood}): {d.rationale}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sharedAiAnalysis.treatment_suggestions && sharedAiAnalysis.treatment_suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    {language === 'ar' ? 'اقتراحات علاجية' : language === 'fr' ? 'Suggestions de traitement' : 'Treatment suggestions'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {sharedAiAnalysis.treatment_suggestions.map((t: any, i: number) => (
                      <li key={i}><span className="text-muted-foreground">[{t.category}]</span> {t.suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sharedAiAnalysis.follow_up_recommendations && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    {language === 'ar' ? 'المتابعة' : language === 'fr' ? 'Suivi' : 'Follow-up'}
                  </p>
                  <p className="text-sm">{sharedAiAnalysis.follow_up_recommendations}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground italic">
                {language === 'ar' ? 'هذا ملخص مساعد. استشر طبيبك دائماً للحصول على المشورة الطبية.' : language === 'fr' ? 'Ceci est un résumé d\'aide. Consultez toujours votre médecin pour des conseils médicaux.' : 'This is an assistive summary. Always consult your doctor for medical advice.'}
              </p>
            </div>
          </div>
        )}

        {/* Prescriptions, Lab tests & Referrals — compact tabs */}
        <section>
          <h2 className="text-base font-semibold mb-4">
            {language === 'ar' ? 'الوصفات والتحاليل والإحالات' : language === 'fr' ? 'Ordonnances, analyses et orientations' : 'Prescriptions, lab tests & referrals'}
          </h2>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className={cn(
                'h-11 p-1 rounded-none border-b bg-muted/20 w-full',
                referrals.length > 0 ? 'grid grid-cols-4' : 'grid grid-cols-3'
              )}>
                <TabsTrigger
                  value="prescriptions"
                  className="gap-2 text-sm rounded-lg text-muted-foreground data-[state=active]:bg-sky-500/10 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300"
                >
                  <Pill className="h-4 w-4 shrink-0" />
                  {language === 'ar' ? 'الوصفات' : language === 'fr' ? 'Ordonnances' : 'Prescriptions'}
                  {prescriptions.length > 0 && <Badge variant="secondary" className="text-xs">{prescriptions.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger
                  value="lab-tests"
                  className="gap-2 text-sm rounded-lg text-muted-foreground data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300"
                >
                  <TestTube className="h-4 w-4 shrink-0" />
                  {language === 'ar' ? 'التحاليل' : language === 'fr' ? 'Analyses' : 'Lab tests'}
                  {labRequests.length > 0 && <Badge variant="secondary" className="text-xs">{labRequests.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="gap-2 text-sm rounded-lg text-muted-foreground data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-700 dark:data-[state=active]:text-slate-300"
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  {language === 'ar' ? 'المستندات' : language === 'fr' ? 'Documents' : 'Documents'}
                </TabsTrigger>
                {referrals.length > 0 && (
                  <TabsTrigger
                    value="referrals"
                    className="gap-2 text-sm rounded-lg text-muted-foreground data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    {language === 'ar' ? 'الإحالات' : language === 'fr' ? 'Orientations' : 'Referrals'}
                    <Badge variant="secondary" className="text-xs">{referrals.length}</Badge>
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="min-h-[200px]">
                <TabsContent value="prescriptions" className="m-0 p-4 md:p-5 focus-visible:outline-none focus-visible:ring-0">
                  {prescriptions.length === 0 ? (
                    <Empty className="py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="rounded-xl mb-3">
                          <Pill className="h-8 w-8 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle className="text-base">{language === 'ar' ? 'لا توجد وصفات' : language === 'fr' ? 'Aucune ordonnance' : 'No prescriptions'}</EmptyTitle>
                        <EmptyDescription>{language === 'ar' ? 'لم يكتب الطبيب وصفة لهذا الموعد' : language === 'fr' ? 'Aucune ordonnance pour ce rendez-vous' : 'No prescriptions for this appointment'}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      {prescriptions.map((prescription, idx) => (
                        <div key={prescription.id} className={cn(
                          'rounded-xl border overflow-hidden',
                          idx % 2 === 0 ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200/40 dark:border-sky-800/30' : 'bg-sky-50/30 dark:bg-sky-950/10 border-sky-200/30 dark:border-sky-800/20'
                        )}>
                          <PrescriptionWorkflow
                            prescription={prescription}
                            userRole="patient"
                            patientId={patient?.id}
                            onUpdate={loadAppointment}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="lab-tests" className="m-0 p-4 md:p-5 focus-visible:outline-none focus-visible:ring-0">
                  {labRequests.length === 0 ? (
                    <Empty className="py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="rounded-xl mb-3">
                          <TestTube className="h-8 w-8 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle className="text-base">{language === 'ar' ? 'لا توجد تحاليل' : language === 'fr' ? 'Aucune analyse' : 'No lab tests'}</EmptyTitle>
                        <EmptyDescription>{language === 'ar' ? 'لم يطلب الطبيب تحاليل لهذا الموعد' : language === 'fr' ? 'Aucune analyse demandée pour ce rendez-vous' : 'No lab tests requested for this appointment'}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      {labRequests.map((labRequest, idx) => (
                        <div key={labRequest.id} className={cn(
                          'rounded-xl border overflow-hidden',
                          idx % 2 === 0 ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/40 dark:border-violet-800/30' : 'bg-violet-50/30 dark:bg-violet-950/10 border-violet-200/30 dark:border-violet-800/20'
                        )}>
                          <LabTestWorkflow
                            labRequest={labRequest}
                            userRole="patient"
                            patientId={patient?.id}
                            onUpdate={loadAppointment}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {referrals.length > 0 && (
                  <TabsContent value="referrals" className="m-0 p-4 md:p-5 focus-visible:outline-none focus-visible:ring-0">
                    <div className="space-y-3">
                      {referrals.map((referral, idx) => (
                        <div key={referral.id} className={cn(
                          'rounded-xl border overflow-hidden',
                          idx % 2 === 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/40 dark:border-amber-800/30' : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/30 dark:border-amber-800/20'
                        )}>
                          <ReferralWorkflow
                            referral={referral}
                            language={language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
                <TabsContent value="documents" className="m-0 p-4 md:p-5 focus-visible:outline-none focus-visible:ring-0">
                  <VisitDocumentsAttach appointmentId={id} viewerType="patient" />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </section>
      </div>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'إلغاء الموعد' : language === 'fr' ? 'Annuler le rendez-vous' : 'Cancel appointment'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' ? 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.' : language === 'fr' ? 'Êtes-vous sûr ? Cette action ne peut pas être annulée.' : 'Are you sure? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Go back'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={cancelling}>
              {cancelling ? (language === 'ar' ? 'جاري...' : language === 'fr' ? 'En cours...' : 'Cancelling...') : (language === 'ar' ? 'نعم، إلغاء' : language === 'fr' ? 'Oui, annuler' : 'Yes, cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

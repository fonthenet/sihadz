'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoCard } from '@/components/ui/info-card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  Baby,
  Heart,
  Syringe,
  Scale,
  Ruler,
  AlertTriangle,
  Users,
  FileText,
  Pill,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { parseDateOnlyAsLocal } from '@/lib/date-algeria'
import ReferralSelector from '../../components/referral-selector'
import ClinicalOrdersPanel from '../../components/clinical-orders-panel'
import { AiPatientAnalysisCard } from '../../components/ai-patient-analysis-card'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { getStatusBadgeClassName } from '@/lib/status-colors'

export interface DoctorAppointmentDetailsClientProps {
  id: string
  searchParams?: Record<string, string | string[] | undefined>
}

export default function DoctorAppointmentDetailsClient({ id, searchParams: resolvedSearchParams }: DoctorAppointmentDetailsClientProps) {
  const prescriptionId = resolvedSearchParams?.prescription
  const labRequestId = resolvedSearchParams?.labRequest
  const initialPrescriptionId = typeof prescriptionId === 'string' ? prescriptionId : null
  const initialLabRequestId = typeof labRequestId === 'string' ? labRequestId : null
  const router = useRouter()
  const { toast } = useToast()
  const [appointment, setAppointment] = useState<any>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [referralSelectorOpen, setReferralSelectorOpen] = useState(false)
  const [visitNoteForPatient, setVisitNoteForPatient] = useState<string>('')
  const [savingVisitNote, setSavingVisitNote] = useState(false)
  const [noteSavedSuccess, setNoteSavedSuccess] = useState(false)
  const [familyContext, setFamilyContext] = useState<any>(null)
  const [loadingFamilyContext, setLoadingFamilyContext] = useState(false)
  const [patientInfoOpen, setPatientInfoOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    loadProfessional()
    loadAppointment()
  }, [id])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = () => setPatientInfoOpen(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const loadProfessional = async () => {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (prof) setProfessionalId(prof.id)
  }

  const loadAppointment = async () => {
    const supabase = createBrowserClient()

    // First get the appointment
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      setLoading(false)
      return
    }

    // Try to get patient profile (may be null due to RLS)
    let patientData = null
    if (data.patient_id) {
      const { data: patient } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, date_of_birth, gender, blood_type, height_cm, weight_kg, allergies, chronic_conditions, current_medications')
        .eq('id', data.patient_id)
        .maybeSingle()
      patientData = patient
    }

    let displayName = patientData?.full_name || data.guest_name || data.patient_name || null
    let displayEmail = patientData?.email || data.guest_email || data.patient_email || null
    let displayPhone = patientData?.phone || data.guest_phone || data.patient_phone || null

    // Always fetch patient vitals via API when patient_id exists (RLS blocks direct profile read for doctors)
    // This ensures blood type, age, gender, allergies, etc. are available for the doctor
    let apiPatient: Record<string, unknown> | null = null
    if (data.patient_id) {
      try {
        const res = await fetch(`/api/appointments/${id}/patient-display`)
        if (res.ok) {
          const info = await res.json()
          displayName = info.full_name || displayName
          displayEmail = info.email ?? displayEmail
          displayPhone = info.phone ?? displayPhone
          apiPatient = {
            full_name: info.full_name,
            email: info.email,
            phone: info.phone,
            date_of_birth: info.date_of_birth ?? null,
            gender: info.gender ?? null,
            blood_type: info.blood_type ?? null,
            height_cm: info.height_cm ?? null,
            weight_kg: info.weight_kg ?? null,
            allergies: info.allergies ?? null,
            chronic_conditions: info.chronic_conditions ?? null,
            current_medications: info.current_medications ?? null,
          }
        }
      } catch (_) {}
    }

    const mergedPatient = patientData
      ? { ...patientData, ...apiPatient }
      : apiPatient

    setAppointment({
      ...data,
      patient: mergedPatient,
      patient_display_name: displayName || 'Patient',
      patient_display_email: displayEmail,
      patient_display_phone: displayPhone
    })
    setVisitNoteForPatient(data.doctor_note_for_patient ?? '')
    setLoading(false)

    // Always fetch family context - API checks appointment + ticket metadata fallback
    setLoadingFamilyContext(true)
    try {
      const res = await fetch(`/api/appointments/${id}/family-context`)
      if (res.ok) {
        const ctx = await res.json()
        if (ctx.hasFamilyMember && (ctx.familyMembers?.length > 0 || ctx.familyMember)) {
          setFamilyContext(ctx)
        }
      }
    } catch (e) {
      console.error('Failed to fetch family context:', e)
    } finally {
      setLoadingFamilyContext(false)
    }
  }

  const saveVisitNoteForPatient = async () => {
    setSavingVisitNote(true)
    const value = visitNoteForPatient.trim() || null
    try {
      const res = await fetch(`/api/appointments/${id}/visit-note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_note_for_patient: value }),
      })
      if (res.ok) {
        setAppointment((prev: any) => prev ? { ...prev, doctor_note_for_patient: value } : prev)
        setNoteSavedSuccess(true)
        toast({
          title: '✓ Note Saved',
          description: 'The patient will see this note on their appointment and ticket views.',
        })
        return
      }
      const errData = await res.json().catch(() => ({}))
      const errMsg = errData?.error || res.statusText || 'Update failed'
      toast({
        title: 'Failed to save note',
        description: errMsg,
        variant: 'destructive',
      })
    } catch (e) {
      console.error('[saveVisitNoteForPatient]', e)
      toast({
        title: 'Failed to save note',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSavingVisitNote(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading(true)
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setAppointment({ ...appointment, status: newStatus })
      // When visit is marked completed, set linked tickets to visit_completed
      if (newStatus === 'completed') {
        await supabase
          .from('healthcare_tickets')
          .update({ status: 'visit_completed', updated_at: new Date().toISOString() })
          .eq('appointment_id', id)
      }
    } else {
      alert('Failed to update appointment status')
    }
    setActionLoading(false)
  }

  const handleReferralSelect = async (provider: any) => {
    const targetName = provider.business_name || provider.name || 'Doctor'
    const reason = prompt('Reason for referral (optional):', 'Follow-up / specialized consultation')?.trim() || 'Follow-up / specialized consultation'
    if (!professionalId || !appointment?.patient_id) {
      toast({ title: 'Error', description: 'Missing doctor or patient info.', variant: 'destructive' })
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referringDoctorId: professionalId,
          patientId: appointment.patient_id,
          patientName: familyContext?.familyMember?.full_name || appointment.patient_display_name || appointment.patient?.full_name,
          patientPhone: appointment.patient_display_phone || appointment.patient?.phone,
          familyMemberId: appointment.family_member_id || null,
          appointmentId: id,
          referredToDoctorId: provider.id,
          referredToSpecialty: provider.specialty || provider.specialization || 'Specialist',
          reason,
          originatingAppointmentId: id,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create referral')
      }
      toast({
        title: 'Referral Created',
        description: `Patient referred to ${targetName}. They will see it on their appointment.`,
      })
      loadAppointment()
    } catch (e: any) {
      toast({
        title: 'Failed to create referral',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }
    const label = labels[status] ?? status
    const className = getStatusBadgeClassName(status, 'solid')
    return <Badge className={className}>{label}</Badge>
  }

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center min-h-[320px]">
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="w-full py-8 px-4 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Appointment not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="w-full py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 px-4 sm:px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Appointment Details</h1>
          <p className="text-muted-foreground text-sm">
            {(parseDateOnlyAsLocal(appointment.appointment_date) ?? new Date(0)).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        {getStatusBadge(appointment.status)}
      </div>

      {/* Patient Information - all vitals in one section */}
      <Card className="mb-6 mx-0 border-teal-200/80 dark:border-teal-900/40 rounded-none sm:rounded-xl">
        <Collapsible open={patientInfoOpen} onOpenChange={setPatientInfoOpen}>
          <CardHeader className="py-3 px-4 border-b">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-teal-800 dark:text-teal-200 text-sm font-semibold">
                    <User className="h-4 w-4 shrink-0" />
                    Patient Information
                  </CardTitle>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-2 truncate">
                    {appointment.patient_display_name || appointment.patient?.full_name || appointment.guest_name || appointment.patient_name || '—'}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0">
                  {patientInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
        <CardContent className="pt-4 px-4 pb-4 space-y-4">
          {(appointment.patient_allergies ?? appointment.patient?.allergies) && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <strong className="block mb-1">Allergies</strong>
                <span className="text-sm">{appointment.patient_allergies ?? appointment.patient?.allergies}</span>
              </AlertDescription>
            </Alert>
          )}
          {/* Mobile: stacked key-value list */}
          <div className="md:hidden space-y-0 divide-y divide-slate-200 dark:divide-slate-700">
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Full Name</span>
              <span className="font-medium text-sm text-end break-words flex items-center justify-end gap-1.5">
                <User className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                {appointment.patient_display_name || appointment.patient?.full_name || appointment.guest_name || appointment.patient_name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Phone</span>
              <span className="font-medium text-sm text-end break-words flex items-center justify-end gap-1.5">
                <Phone className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                {appointment.patient_display_phone ?? appointment.patient?.phone ?? appointment.guest_phone ?? appointment.patient_phone ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Gender</span>
              <span className="font-medium text-sm text-right capitalize">
                {((appointment.patient_gender ?? appointment.patient?.gender) || 'N/A').toString().replace(/^\w/, (c: string) => c.toUpperCase())}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Email</span>
              <span className="font-medium text-sm text-end break-words flex items-center justify-end gap-1.5">
                <Mail className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                {appointment.patient_display_email ?? appointment.patient?.email ?? appointment.guest_email ?? appointment.patient_email ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Age</span>
              <span className="font-medium text-sm text-right">
                {(appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth)
                  ? `${Math.floor((Date.now() - new Date((appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth) as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Blood Type</span>
              <span className="font-medium text-sm text-end flex items-center justify-end gap-1.5">
                <Syringe className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                {appointment.patient_blood_type ?? appointment.patient?.blood_type ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Height</span>
              <span className="font-medium text-sm text-end flex items-center justify-end gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                {(appointment.patient_height_cm ?? appointment.patient?.height_cm) != null ? `${appointment.patient_height_cm ?? appointment.patient?.height_cm} cm` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-3 py-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider shrink-0">Weight</span>
              <span className="font-medium text-sm text-end flex items-center justify-end gap-1.5">
                <Scale className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                {(appointment.patient_weight_kg ?? appointment.patient?.weight_kg) != null ? `${appointment.patient_weight_kg ?? appointment.patient?.weight_kg} kg` : '—'}
              </span>
            </div>
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Full Name</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Phone</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Gender</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Email</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Age</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Blood Type</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Height</TableHead>
                  <TableHead className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider py-2">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-sm py-2 whitespace-normal break-words">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      {appointment.patient_display_name || appointment.patient?.full_name || appointment.guest_name || appointment.patient_name || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2 whitespace-normal break-words">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      {appointment.patient_display_phone ?? appointment.patient?.phone ?? appointment.guest_phone ?? appointment.patient_phone ?? 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2 capitalize">
                    {((appointment.patient_gender ?? appointment.patient?.gender) || 'N/A').toString().replace(/^\w/, (c: string) => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2 whitespace-normal break-words">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      {appointment.patient_display_email ?? appointment.patient?.email ?? appointment.guest_email ?? appointment.patient_email ?? 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2">
                    {(appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth)
                      ? `${Math.floor((Date.now() - new Date((appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth) as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2">
                    <span className="flex items-center gap-1.5">
                      <Syringe className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      {appointment.patient_blood_type ?? appointment.patient?.blood_type ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2">
                    <span className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      {(appointment.patient_height_cm ?? appointment.patient?.height_cm) != null ? `${appointment.patient_height_cm ?? appointment.patient?.height_cm} cm` : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2">
                    <span className="flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      {(appointment.patient_weight_kg ?? appointment.patient?.weight_kg) != null ? `${appointment.patient_weight_kg ?? appointment.patient?.weight_kg} kg` : '—'}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {((appointment.patient_chronic_conditions ?? appointment.patient?.chronic_conditions) || (appointment.patient_current_medications ?? appointment.patient?.current_medications)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              {(appointment.patient_chronic_conditions ?? appointment.patient?.chronic_conditions) && (
                <div>
                  <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">Chronic Conditions</p>
                  <p className="text-sm">{appointment.patient_chronic_conditions ?? appointment.patient?.chronic_conditions}</p>
                </div>
              )}
              {(appointment.patient_current_medications ?? appointment.patient?.current_medications) && (
                <div>
                  <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Pill className="h-3 w-3" />
                    Current Medications
                  </p>
                  <p className="text-sm">{appointment.patient_current_medications ?? appointment.patient?.current_medications}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Family Member(s) Context - Compact */}
      {familyContext?.hasFamilyMember && (familyContext?.familyMembers?.length > 0 || familyContext?.familyMember) && (
        <>
          {(familyContext.familyMembers?.length > 1
            ? familyContext.familyMembers
            : [{ familyMember: familyContext.familyMember, allergies: familyContext.allergies || [], allergiesFromProfile: familyContext.allergiesFromProfile || [], recentVaccinations: familyContext.recentVaccinations || [], recentGrowth: familyContext.recentGrowth }]
          ).map((ctx: any, idx: number) => {
            const fm = ctx.familyMember
            if (!fm) return null
            return (
        <Card key={fm.id || idx} className="mb-6 rounded-none sm:rounded-xl border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-amber-100/60 dark:border-amber-900/30">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-semibold">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                {fm.relationship === 'child' ? (
                  <Baby className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              {fm.full_name}
              <Badge variant="secondary" className="text-xs">{fm.relationship || 'Family'}</Badge>
              {familyContext.familyMembers?.length > 1 && (
                <Badge variant="outline" className="text-xs">{idx + 1} of {familyContext.familyMembers.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 px-4 pb-4">
            {/* Allergy Warning - Prominent */}
            {(ctx.allergies?.length > 0 || ctx.allergiesFromProfile?.length > 0) && (
              <Alert className="border-red-300 bg-red-50 text-red-800">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="ml-2">
                  <strong className="block mb-1">Allergies Warning</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(ctx.allergies || []).map((a: any, i: number) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        {a.allergen_name} ({a.severity})
                      </Badge>
                    ))}
                    {(ctx.allergiesFromProfile || []).map((a: any, i: number) => (
                      <Badge key={`p-${i}`} variant="outline" className="text-xs border-red-300 text-red-700">
                        {typeof a === 'string' ? a : a.name}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Info - Compact grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Age</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {fm.age?.years} yrs
                  {fm.age?.isInfant && ` (${fm.age?.months} mo)`}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Gender</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 capitalize">{fm.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Blood Type</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{fm.blood_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">CHIFA</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{fm.chifa_number || 'N/A'}</p>
              </div>
            </div>

            {/* Measurements for children */}
            {(fm.height_cm || fm.weight_kg) && (
              <div className="flex gap-2">
                {fm.height_cm && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Ruler className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium">{fm.height_cm} cm</span>
                  </div>
                )}
                {fm.weight_kg && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Scale className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium">{fm.weight_kg} kg</span>
                  </div>
                )}
              </div>
            )}

            {/* Chronic Conditions */}
            {(Array.isArray(fm.chronic_conditions) ? fm.chronic_conditions.length > 0 : fm.chronic_conditions) && (
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Chronic Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(fm.chronic_conditions) ? fm.chronic_conditions : []).map((c: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{typeof c === 'string' ? c : c.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes from Parent */}
            {fm.notes_for_doctor && (
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <FileText className="h-3 w-3" /> Notes from Parent
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{fm.notes_for_doctor}</p>
              </div>
            )}

            {/* Special Needs */}
            {fm.special_needs && (
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Special Needs</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{fm.special_needs}</p>
              </div>
            )}

            {/* Recent Vaccinations */}
            {ctx.recentVaccinations?.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Syringe className="h-3 w-3" /> Recent Vaccinations
                </p>
                <div className="flex flex-wrap gap-1">
                  {ctx.recentVaccinations.map((v: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{v.vaccine?.name || v.vaccine?.code} ({v.administered_date})</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
            )
          })}
        </>
      )}

      {/* Loading state for family context */}
      {loadingFamilyContext && (
        <Card className="mb-6 rounded-none sm:rounded-xl border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 flex items-center justify-center gap-2 text-amber-600">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Loading family member context...</span>
          </CardContent>
        </Card>
      )}

      {/* Appointment Details - Compact */}
      <InfoCard
        title="Appointment Details"
        icon={Calendar}
        accent="slate"
        className="mb-6"
        cols={3}
        items={[
          { label: 'Date', value: (parseDateOnlyAsLocal(appointment.appointment_date) ?? new Date(0)).toLocaleDateString(), icon: Calendar },
          { label: 'Time', value: (appointment.appointment_time || '').substring(0, 5), icon: Clock },
          { label: 'Visit Type', value: (appointment.visit_type || '').replace(/^\w/, c => c.toUpperCase()) },
          ...(appointment.consultation_fee != null ? [{ label: 'Fee', value: `${appointment.consultation_fee} DZD` }] : []),
        ]}
      >
        {appointment.notes && appointment.notes !== (appointment.doctor_note_for_patient ?? '') && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Patient notes (from booking)</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{appointment.notes}</p>
          </div>
        )}
      </InfoCard>

      {appointment.symptoms && (
        <Card className="mb-6 rounded-none sm:rounded-xl">
          <CardContent className="pt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Symptoms</p>
              <p className="text-sm font-medium">{appointment.symptoms}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Patient Analysis - Premium feature */}
      {professionalId && (
        <div className="mb-6">
          <AiPatientAnalysisCard
            appointment={{
              id,
              patient_display_name: appointment.patient_display_name || appointment.patient?.full_name,
              patient: {
                ...appointment.patient,
                date_of_birth: appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth,
                gender: appointment.patient_gender ?? appointment.patient?.gender,
                blood_type: appointment.patient_blood_type ?? appointment.patient?.blood_type,
                allergies: appointment.patient_allergies ?? appointment.patient?.allergies,
                chronic_conditions: appointment.patient_chronic_conditions ?? appointment.patient?.chronic_conditions,
                current_medications: appointment.patient_current_medications ?? appointment.patient?.current_medications,
                height_cm: appointment.patient_height_cm ?? appointment.patient?.height_cm,
                weight_kg: appointment.patient_weight_kg ?? appointment.patient?.weight_kg,
              },
              notes: appointment.notes,
              symptoms: appointment.symptoms,
              allergies: familyContext?.hasFamilyMember
                ? (familyContext.allergies || [])
                    .map((a: { allergen_name?: string; allergen?: string; severity?: string }) => [a.allergen_name || a.allergen, a.severity].filter(Boolean).join(' - '))
                    .filter(Boolean)
                    .join('; ') || (Array.isArray(familyContext.allergiesFromProfile) ? familyContext.allergiesFromProfile.join(', ') : familyContext.allergiesFromProfile) || null
                : appointment.patient?.allergies ?? null,
            }}
            doctorId={professionalId}
          />
        </div>
      )}

      {/* Clinical Orders Panel - Prescriptions & Lab Tests (Primary workflow section) */}
      {professionalId && appointment.patient_id && (
        <ClinicalOrdersPanel
          appointmentId={id}
          doctorId={professionalId}
          appointmentDoctorId={appointment.doctor_id}
          patientId={appointment.patient_id}
          familyMemberId={appointment.family_member_id || null}
          familyMembers={(() => {
            const patientAge = (appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth)
              ? Math.floor((Date.now() - new Date((appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth) as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : undefined
            const patientName = appointment.patient_display_name || appointment.patient?.full_name || 'Patient'
            const patientAllergies = appointment.patient_allergies ?? appointment.patient?.allergies
            const items: { id: string | null; full_name: string; age_years?: number; relationship?: string; allergies?: string }[] = []
            if (familyContext?.familyMembers?.length) {
              items.push({ id: null, full_name: patientName, age_years: patientAge, relationship: 'Self', allergies: patientAllergies ?? undefined })
              for (const ctx of familyContext.familyMembers) {
                const fm = ctx.familyMember
                if (!fm) continue
                const allergyStrs = [
                  ...(ctx.allergies || []).map((a: any) => a.allergen_name || a.allergen),
                  ...(ctx.allergiesFromProfile || []).map((a: any) => (typeof a === 'string' ? a : a.name)),
                ].filter(Boolean)
                items.push({
                  id: fm.id,
                  full_name: fm.full_name || 'Family member',
                  age_years: fm.age?.years,
                  relationship: fm.relationship || 'Family',
                  allergies: allergyStrs.length ? allergyStrs.join(', ') : undefined,
                })
              }
            } else if (familyContext?.familyMember) {
              const fm = familyContext.familyMember
              const allergyStrs = [
                ...(familyContext.allergies || []).map((a: any) => a.allergen_name || a.allergen),
                ...(familyContext.allergiesFromProfile || []).map((a: any) => (typeof a === 'string' ? a : a.name)),
              ].filter(Boolean)
              items.push({ id: null, full_name: patientName, age_years: patientAge, relationship: 'Self', allergies: patientAllergies ?? undefined })
              items.push({
                id: fm.id,
                full_name: fm.full_name || 'Family member',
                age_years: fm.age?.years,
                relationship: fm.relationship || 'Family',
                allergies: allergyStrs.length ? allergyStrs.join(', ') : undefined,
              })
            } else {
              items.push({ id: null, full_name: patientName, age_years: patientAge, relationship: 'Self', allergies: patientAllergies ?? undefined })
            }
            return items
          })()}
          familyMemberAllergies={
            familyContext?.hasFamilyMember
              ? [
                  ...(familyContext.allergies || []).map((a: any) => ({ name: a.allergen_name, severity: a.severity })),
                  ...(familyContext.allergiesFromProfile || []).map((a: any) => ({
                    name: typeof a === 'string' ? a : a.name,
                    severity: typeof a === 'string' ? undefined : a.severity,
                  })),
                ]
              : undefined
          }
          visitContext={{
            symptoms: appointment.symptoms,
            notes: appointment.notes && appointment.notes !== (appointment.doctor_note_for_patient ?? '') ? appointment.notes : undefined,
            visitSummary: appointment.notes && appointment.notes !== (appointment.doctor_note_for_patient ?? '') ? appointment.notes : undefined,
            patientAge: (appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth)
              ? Math.floor((Date.now() - new Date((appointment.patient_date_of_birth ?? appointment.patient?.date_of_birth) as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : undefined,
            patientGender: appointment.patient_gender ?? appointment.patient?.gender,
            allergies: familyContext?.hasFamilyMember
              ? (familyContext.allergies || [])
                  .map((a: any) => a.allergen_name || a.allergen)
                  .filter(Boolean)
                  .join('; ') || (Array.isArray(familyContext.allergiesFromProfile) ? familyContext.allergiesFromProfile.join(', ') : familyContext.allergiesFromProfile) || undefined
              : appointment.patient_allergies ?? appointment.patient?.allergies,
            chronicConditions: appointment.patient_chronic_conditions ?? appointment.patient?.chronic_conditions,
            currentMedications: appointment.patient_current_medications ?? appointment.patient?.current_medications,
          }}
          initialPrescriptionId={initialPrescriptionId}
          initialLabRequestId={initialLabRequestId}
        />
      )}

      {/* Note for patient (visible only to them) — sticky note style */}
      <Card className="mb-6 rounded-none sm:rounded-xl border-amber-200/80 dark:border-amber-700/50 bg-amber-50/90 dark:bg-amber-950/30 shadow-sm shadow-amber-200/30 dark:shadow-amber-900/20 gap-0">
        <CardHeader className="py-1.5 px-3 sm:px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Note for patient (visible only to them)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-2.5 pt-0">
          <div className="relative">
            <Textarea
              placeholder="e.g. Follow-up in 2 weeks. Avoid strenuous exercise. Take medications as prescribed."
              value={visitNoteForPatient}
              onChange={(e) => {
                setVisitNoteForPatient(e.target.value)
                setNoteSavedSuccess(false)
              }}
              rows={3}
              className={`resize-y text-sm min-h-[72px] py-2 px-3 bg-white/70 dark:bg-slate-900/30 border-amber-300/60 dark:border-amber-600/40 focus:bg-white dark:focus:bg-slate-900/50 transition-all duration-300 ${
                noteSavedSuccess
                  ? 'border-green-500/60 bg-green-50/50 dark:bg-green-950/20 dark:border-green-500/40'
                  : ''
              }`}
            />
            {savingVisitNote && (
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                <LoadingSpinner size="sm" />
                Saving...
              </div>
            )}
          </div>
          <Button
            size="sm"
            onClick={saveVisitNoteForPatient}
            disabled={savingVisitNote}
            className={`mt-2 h-8 text-xs transition-all duration-300 ${
              noteSavedSuccess
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {savingVisitNote ? (
              <>
                <LoadingSpinner size="sm" className="me-1.5" />
                Saving...
              </>
            ) : noteSavedSuccess ? (
              <>
                <CheckCircle className="me-1.5 h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              'Save note for patient'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="rounded-none sm:rounded-xl">
        <CardHeader>
          <CardTitle>Manage Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setReferralSelectorOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Refer to Another Doctor
          </Button>

          {appointment.status === 'pending' && (
            <Button
              className="w-full"
              onClick={() => handleStatusUpdate('confirmed')}
              disabled={actionLoading}
            >
              {actionLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Confirm Appointment
            </Button>
          )}

          {appointment.status === 'confirmed' && (
            <Button
              className="w-full"
              onClick={() => handleStatusUpdate('completed')}
              disabled={actionLoading}
            >
              {actionLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Mark as Completed
            </Button>
          )}

          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (confirm('Are you sure you want to cancel this appointment?')) {
                  handleStatusUpdate('cancelled')
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <XCircle className="mr-2 h-4 w-4" />}
              Cancel Appointment
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => router.back()}
          >
            Back to Appointments
          </Button>
        </CardContent>
      </Card>

      <ReferralSelector
        open={referralSelectorOpen}
        onClose={() => setReferralSelectorOpen(false)}
        onSelect={(target) => {
          setReferralSelectorOpen(false)
          handleReferralSelect(target)
        }}
        patientId={appointment.patient_id}
      />
    </div>
  )
}

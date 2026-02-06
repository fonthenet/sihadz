'use client'

import React, { useState, useEffect } from "react"
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, MapPin, Stethoscope, CheckCircle, User, Mail, Phone, ArrowLeft, QrCode, Info, Lock, AlertTriangle, XCircle, Check } from 'lucide-react'
import { FullPageLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { PaymentMethodSelector, type PaymentMethod } from '@/components/payment/payment-method-selector'
import { PaymentErrorAlert } from '@/components/payment/payment-error-alert'
import { parseApiError, validateBookingDateTime, type PaymentError } from '@/lib/payment/validation'
import { useLanguage } from '@/lib/i18n/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'

const confirmLabels = {
  en: {
    pageTitle: 'Confirm your appointment',
    pageSubtitle: 'Complete the information to confirm your appointment',
    yourInfo: 'Your information',
    patientName: 'Patient',
    appointmentFor: 'Appointment for',
    appointmentDetails: 'Appointment details',
    parentGuardian: 'Parent/Guardian',
    yourContact: 'Your contact (for confirmations)',
    yourContactHint: 'Used for SMS and email confirmations',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    notesOptional: 'Notes (optional)',
    notesPlaceholder: 'Briefly describe the reason for your consultation...',
    vitalInfo: 'Health information (for the doctor)',
    dateOfBirth: 'Date of birth',
    gender: 'Gender',
    bloodType: 'Blood type',
    allergies: 'Allergies',
    allergiesPlaceholder: 'e.g. Penicillin, pollen...',
    chronicConditions: 'Chronic conditions (optional)',
    currentMedications: 'Current medications (optional)',
    processing: 'Processing...',
    confirmAppointment: 'Confirm appointment',
    continueToPayment: 'Continue to payment',
    summary: 'Summary',
    doctor: 'Doctor',
    date: 'Date',
    time: 'Time',
    address: 'Address',
    consultation: 'Consultation',
    redirectPayment: 'You will be redirected to the secure payment gateway',
    appointmentConfirmed: 'Appointment confirmed!',
    confirmationMessage: 'Your appointment has been confirmed. You will receive a confirmation by email and SMS.',
    ticketNumber: 'Ticket number',
    keepToTrack: 'Keep this number to track your appointment',
    viewMyAppointments: 'View my appointments',
    backToHome: 'Back to home',
    backToChangeDate: 'Back to change date',
    confirmationNumber: 'Confirmation number',
    qrForDoctor: 'Show this QR code to the doctor to confirm your arrival',
    depositRequired: 'Deposit required',
    depositNote: 'A deposit is required to confirm your booking. This amount will be deducted from your final bill.',
    refundPolicy: 'Refund Policy',
    refund48h: '48h+ before: 100% refund',
    refund24h: '24-48h before: 50% refund',
    refundLess24h: 'Less than 24h: No refund',
    providerCancelRefund: 'Provider cancellation: Always 100% refund',
  },
  fr: {
    pageTitle: 'Confirmer votre rendez-vous',
    pageSubtitle: 'Complétez les informations pour confirmer votre rendez-vous',
    yourInfo: 'Vos informations',
    patientName: 'Patient',
    appointmentFor: 'Rendez-vous pour',
    appointmentDetails: 'Détails du rendez-vous',
    parentGuardian: 'Parent/Tuteur',
    yourContact: 'Votre contact (pour les confirmations)',
    yourContactHint: 'Pour les SMS et e-mails de confirmation',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    notesOptional: 'Notes (optionnel)',
    notesPlaceholder: 'Décrivez brièvement le motif de votre consultation...',
    vitalInfo: 'Informations de santé (pour le médecin)',
    dateOfBirth: 'Date de naissance',
    gender: 'Genre',
    bloodType: 'Groupe sanguin',
    allergies: 'Allergies',
    allergiesPlaceholder: 'ex. Pénicilline, pollen...',
    chronicConditions: 'Maladies chroniques (optionnel)',
    currentMedications: 'Médicaments actuels (optionnel)',
    processing: 'Traitement...',
    confirmAppointment: 'Confirmer le rendez-vous',
    continueToPayment: 'Continuer vers le paiement',
    summary: 'Récapitulatif',
    doctor: 'Médecin',
    date: 'Date',
    time: 'Heure',
    address: 'Adresse',
    consultation: 'Consultation',
    redirectPayment: 'Vous serez redirigé vers la passerelle de paiement sécurisée',
    appointmentConfirmed: 'Rendez-vous confirmé!',
    confirmationMessage: 'Votre rendez-vous a été confirmé. Vous recevrez une confirmation par e-mail et SMS.',
    ticketNumber: 'Numéro de ticket',
    keepToTrack: 'Conservez ce numéro pour suivre votre rendez-vous',
    viewMyAppointments: 'Voir mes rendez-vous',
    backToHome: "Retour à l'accueil",
    backToChangeDate: 'Retour modifier la date',
    confirmationNumber: 'Numéro de confirmation',
    qrForDoctor: 'Montrez ce QR code au médecin pour confirmer votre arrivée',
    depositRequired: 'Dépôt requis',
    depositNote: 'Un dépôt est requis pour confirmer votre réservation. Ce montant sera déduit de votre facture finale.',
    refundPolicy: 'Politique de remboursement',
    refund48h: 'Plus de 48h : Remboursement 100%',
    refund24h: '24-48h : Remboursement 50%',
    refundLess24h: 'Moins de 24h : Pas de remboursement',
    providerCancelRefund: 'Annulation par le prestataire : Toujours 100%',
  },
  ar: {
    pageTitle: 'تأكيد موعدك',
    pageSubtitle: 'أكمل المعلومات لتأكيد موعدك',
    yourInfo: 'معلوماتك',
    patientName: 'المريض',
    appointmentFor: 'الموعد لـ',
    appointmentDetails: 'تفاصيل الموعد',
    parentGuardian: 'ولي الأمر',
    yourContact: 'جهة الاتصال (للتأكيدات)',
    yourContactHint: 'للرسائل القصيرة والبريد الإلكتروني',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    notesOptional: 'ملاحظات (اختياري)',
    notesPlaceholder: 'اشرح بإيجاز سبب الاستشارة...',
    vitalInfo: 'المعلومات الصحية (للطبيب)',
    dateOfBirth: 'تاريخ الميلاد',
    gender: 'الجنس',
    bloodType: 'فصيلة الدم',
    allergies: 'الحساسية',
    allergiesPlaceholder: 'مثال: البنسلين، حبوب اللقاح...',
    chronicConditions: 'الأمراض المزمنة (اختياري)',
    currentMedications: 'الأدوية الحالية (اختياري)',
    processing: 'جاري المعالجة...',
    confirmAppointment: 'تأكيد الموعد',
    continueToPayment: 'المتابعة للدفع',
    summary: 'الملخص',
    doctor: 'الطبيب',
    date: 'التاريخ',
    time: 'الوقت',
    address: 'العنوان',
    consultation: 'الاستشارة',
    redirectPayment: 'سيتم توجيهك إلى بوابة الدفع الآمنة',
    appointmentConfirmed: 'تم تأكيد الموعد!',
    confirmationMessage: 'تم تأكيد موعدك بنجاح. سوف تتلقى رسالة تأكيد عبر البريد الإلكتروني والرسائل القصيرة',
    ticketNumber: 'رقم التذكرة',
    keepToTrack: 'احتفظ بهذا الرقم لمتابعة موعدك',
    viewMyAppointments: 'عرض مواعيدي',
    backToHome: 'العودة للرئيسية',
    backToChangeDate: 'العودة لتغيير التاريخ',
    confirmationNumber: 'رقم التأكيد',
    qrForDoctor: 'اعرض رمز QR هذا للطبيب لتأكيد وصولك',
    depositRequired: 'العربون مطلوب',
    depositNote: 'العربون مطلوب لتأكيد حجزك. سيتم خصم هذا المبلغ من فاتورتك النهائية.',
    refundPolicy: 'سياسة الاسترداد',
    refund48h: 'أكثر من 48 ساعة: استرداد 100%',
    refund24h: '24-48 ساعة: استرداد 50%',
    refundLess24h: 'أقل من 24 ساعة: لا استرداد',
    providerCancelRefund: 'إلغاء مقدم الخدمة: استرداد 100% دائماً',
  },
} as const

function BookingConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { language } = useLanguage()
  const lang = (language === 'en' || language === 'fr' || language === 'ar' ? language : 'en') as 'en' | 'fr' | 'ar'
  const t = confirmLabels[lang]
  const doctorId = searchParams.get('doctor')
  const day = searchParams.get('day')
  const time = searchParams.get('time')
  const price = searchParams.get('price') || '3000'
  const visitTypeParam = searchParams.get('visitType') || 'office'
  const notesParam = searchParams.get('notes') || ''
  const doctorNameParam = searchParams.get('doctorName') || ''
  const doctorSpecialtyParam = searchParams.get('doctorSpecialty') || ''
  const doctorName = doctorNameParam || 'Dr. Amina Benali'
  const doctorSpecialty = doctorSpecialtyParam || 'Cardiologue'
  const visitTypeApi = visitTypeParam === 'office' ? 'in-person' : visitTypeParam === 'home' ? 'home-visit' : 'e-visit'

  const nameParam = searchParams.get('name') || ''
  const phoneParam = searchParams.get('phone') || ''
  const emailParam = searchParams.get('email') || ''
  const methodParam = searchParams.get('method') || ''
  // Support both single (legacy) and multiple family members
  const familyMemberIdsParam = searchParams.get('familyMemberIds') || searchParams.get('familyMemberId') || ''
  const familyMemberIds = familyMemberIdsParam ? familyMemberIdsParam.split(',').map(id => id.trim()).filter(Boolean) : []
  const bookingForNamesParam = searchParams.get('bookingForNames') || searchParams.get('bookingForName') || ''
  const bookingForNames = bookingForNamesParam ? bookingForNamesParam.split(',').map(n => n.trim()).filter(Boolean) : []
  const bookingForName = bookingForNames[0] || null

  const validPaymentMethods: PaymentMethod[] = ['edahabia', 'cib', 'flexy', 'mobilis', 'ooredoo', 'cash', 'wallet']
  const initialPaymentMethod = validPaymentMethods.includes(methodParam as PaymentMethod) ? (methodParam as PaymentMethod) : 'cash'

  const nameParts = nameParam.trim().split(/\s+/).filter(Boolean)

  const [formData, setFormData] = useState({
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    patientFullName: bookingForName || '',
    email: emailParam || '',
    phone: phoneParam || '',
    notes: '',
    userId: null as string | null
  })
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [pendingTopUp, setPendingTopUp] = useState(0)
  const [bookingError, setBookingError] = useState<PaymentError | null>(null)
  const [profileVitals, setProfileVitals] = useState<{ date_of_birth?: string; gender?: string; blood_type?: string; allergies?: string; chronic_conditions?: string; current_medications?: string; height_cm?: number; weight_kg?: number } | null>(null)
  const [familyMemberVitalsMap, setFamilyMemberVitalsMap] = useState<Record<string, { full_name?: string; date_of_birth?: string; gender?: string; blood_type?: string; allergies?: string; chronic_conditions?: string; current_medications?: string; height_cm?: number; weight_kg?: number }>>({})

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      setAuthChecked(true)
      if (u) {
        setUser(u)
        const base = { userId: u.id as string, ...(notesParam ? { notes: notesParam } : {}) }
        const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, gender, date_of_birth, blood_type, allergies, chronic_conditions, current_medications, height_cm, weight_kg').eq('id', u.id).maybeSingle()
        if (profile && (profile.date_of_birth || profile.gender || profile.blood_type || profile.allergies)) {
          setProfileVitals({
            date_of_birth: profile.date_of_birth ?? undefined,
            gender: profile.gender ?? undefined,
            blood_type: profile.blood_type ?? undefined,
            allergies: profile.allergies ?? undefined,
            chronic_conditions: profile.chronic_conditions ?? undefined,
            current_medications: profile.current_medications ?? undefined,
            height_cm: profile.height_cm ?? undefined,
            weight_kg: profile.weight_kg ?? undefined,
          })
        }
        // When booking for family member(s), fetch their health info so it transfers to the doctor
        if (familyMemberIds.length > 0) {
          const toStr = (v: unknown) => (Array.isArray(v) ? v.map((x: any) => (x?.name ?? x)).filter(Boolean).join(', ') : (v as string) ?? undefined)
          const map: Record<string, { date_of_birth?: string; gender?: string; blood_type?: string; allergies?: string; chronic_conditions?: string; current_medications?: string; height_cm?: number; weight_kg?: number }> = {}
          Promise.all(familyMemberIds.map(id => fetch(`/api/family-members/${id}`).then(r => r.ok ? r.json() : null)))
            .then((results) => {
              results.forEach((d, i) => {
                const id = familyMemberIds[i]
                const m = d?.member
                if (id && m && (m.date_of_birth || m.gender || m.blood_type || m.allergies || m.chronic_conditions || m.current_medications || m.height_cm || m.weight_kg)) {
                  map[id] = {
                    full_name: m.full_name ?? undefined,
                    date_of_birth: m.date_of_birth ?? undefined,
                    gender: m.gender ?? undefined,
                    blood_type: m.blood_type ?? undefined,
                    allergies: toStr(m.allergies) ?? undefined,
                    chronic_conditions: toStr(m.chronic_conditions) ?? undefined,
                    current_medications: toStr(m.current_medications) ?? undefined,
                    height_cm: m.height_cm ?? undefined,
                    weight_kg: m.weight_kg ?? undefined,
                  }
                }
              })
              setFamilyMemberVitalsMap(map)
            })
            .catch(() => setFamilyMemberVitalsMap({}))
        } else {
          setFamilyMemberVitalsMap({})
        }
        const parts = (profile?.full_name || '').trim().split(/\s+/).filter(Boolean)
        setFormData((prev) => ({
          ...prev,
          ...base,
          firstName: nameParam ? nameParts[0] || prev.firstName : (parts[0] || prev.firstName),
          lastName: nameParam ? nameParts.slice(1).join(' ') || prev.lastName : (parts.slice(1).join(' ') || prev.lastName),
          patientFullName: bookingForName ? (prev.patientFullName || bookingForNames.join(', ')) : prev.patientFullName,
          email: emailParam || profile?.email || prev.email,
          phone: phoneParam || profile?.phone || prev.phone,
        }))
        // Fetch wallet balance
        fetch('/api/wallet')
          .then((r) => r.ok ? r.json() : null)
          .then((d) => d?.wallet != null ? setWalletBalance(Number(d.wallet.balance)) : setWalletBalance(null))
          .catch(() => setWalletBalance(null))
        
        // Fetch pending top-ups
        fetch('/api/wallet/my-top-up-requests')
          .then((r) => r.ok ? r.json() : null)
          .then((d) => {
            const pending = (d?.requests || []).filter((r: any) => r.status === 'pending')
            const totalPending = pending.reduce((sum: number, r: any) => sum + Number(r.amount_dzd || 0), 0)
            setPendingTopUp(totalPending)
          })
          .catch(() => setPendingTopUp(0))
      }
    })
  }, [notesParam, familyMemberIds.join(',')])

  // Generate QR code for doctor to scan and confirm arrival (when we have a ticket number)
  useEffect(() => {
    if (!ticketNumber) {
      setQrCodeUrl(null)
      return
    }
    const payload = JSON.stringify({ type: 'dzdoc-arrival', ticket: ticketNumber })
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toDataURL(payload, { width: 280, margin: 2 }).then(setQrCodeUrl).catch(() => setQrCodeUrl(null))
    }).catch(() => setQrCodeUrl(null))
  }, [ticketNumber])

  const depositAmount = parseInt(price, 10)
  const hasInsufficientBalance = selectedPaymentMethod === 'wallet' && walletBalance != null && walletBalance < depositAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingError(null)
    setIsProcessing(true)

    // Validate date/time hasn't passed
    if (day && time) {
      const dateError = validateBookingDateTime(day, time)
      if (dateError) {
        setBookingError(dateError)
        setIsProcessing(false)
        return
      }
    }

    // Notes are for manual entry only; vitals (gender, allergies, etc.) go via patient_vitals / family_member_vitals
    const notesForDoctor = formData.notes?.trim() || ''

    try {
      const queueUserId = user?.id ?? formData.userId
      const appointmentPayload = {
        patient_name: (bookingForName ? (formData.patientFullName?.trim() || bookingForName) : `${formData.firstName} ${formData.lastName}`).trim(),
        patient_email: formData.email,
        patient_phone: formData.phone,
        patient_id: user?.id ?? formData.userId,
        doctor_id: doctorId,
        doctor_name: doctorName,
        doctor_specialty: doctorSpecialty,
        appointment_date: day,
        appointment_time: time,
        notes: notesForDoctor,
        payment_amount: price,
        visit_type: visitTypeApi,
        create_ticket: true,
        family_member_ids: familyMemberIds,
        family_member_id: familyMemberIds[0] || null,
        booking_for_name: formData.patientFullName?.trim() || bookingForNames.join(', ') || bookingForName,
        family_member_vitals: familyMemberIds.length > 0 ? familyMemberVitalsMap : undefined,
        patient_vitals: familyMemberIds.length === 0 ? (profileVitals ?? undefined) : undefined,
      }

      // Offline: queue for sync when back online (applies to wallet and cash)
      if (!isOnline() && queueUserId) {
        const type = selectedPaymentMethod === 'wallet' ? 'appointment_create_with_wallet' : 'appointment_create'
        const payload = selectedPaymentMethod === 'wallet'
          ? { ...appointmentPayload, payment_amount: price }
          : { ...appointmentPayload, payment_method: 'cash', payment_amount: price }
        await addToSyncQueue(queueUserId, { type, payload }, type === 'appointment_create_with_wallet' ? 'Appointment (wallet)' : 'Appointment booking')
        setTicketNumber(`PENDING-${Date.now()}`)
        setIsSubmitted(true)
        window.dispatchEvent(new CustomEvent('offline-sync-queued'))
        setIsProcessing(false)
        return
      }

      // If wallet payment, create appointment and deduct from wallet (must be logged in; balance already checked)
      if (selectedPaymentMethod === 'wallet') {
        if (!user) {
          setBookingError(parseApiError({ message: 'You must be logged in to pay with wallet.' }, 'BOOKING_REQUIRES_AUTH'))
          setIsProcessing(false)
          return
        }
        if (hasInsufficientBalance) {
          setBookingError({
            ...parseApiError({ message: 'Insufficient balance' }, 'WALLET_INSUFFICIENT_BALANCE'),
            details: { 
              required: depositAmount, 
              available: walletBalance || 0, 
              difference: depositAmount - (walletBalance || 0) 
            }
          })
          setIsProcessing(false)
          return
        }
        const response = await fetch('/api/appointments/create-with-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name: (bookingForName ? (formData.patientFullName?.trim() || bookingForName) : `${formData.firstName} ${formData.lastName}`).trim(),
            patient_email: formData.email,
            patient_phone: formData.phone,
            patient_id: user.id,
            doctor_id: doctorId,
            doctor_name: doctorName,
            doctor_specialty: doctorSpecialty,
            appointment_date: day,
            appointment_time: time,
            notes: notesForDoctor,
            payment_amount: price,
            visit_type: visitTypeApi,
            create_ticket: true,
            family_member_ids: familyMemberIds,
            family_member_id: familyMemberIds[0] || null,
            booking_for_name: formData.patientFullName?.trim() || bookingForNames.join(', ') || bookingForName,
            family_member_vitals: familyMemberIds.length > 0 ? familyMemberVitalsMap : undefined,
            patient_vitals: familyMemberIds.length === 0 ? (profileVitals ?? undefined) : undefined,
          }),
        })
        const data = await response.json()
        if (data.success && data.ticket_number) {
          setTicketNumber(data.ticket_number)
        } else if (data.error) {
          setBookingError(parseApiError(data))
          return
        } else {
          throw new Error(data.error || 'Booking failed')
        }
        setIsSubmitted(true)
        return
      }

      // If cash payment, create appointment and ticket
      if (selectedPaymentMethod === 'cash') {
        const response = await fetch('/api/appointments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name: (bookingForName ? (formData.patientFullName?.trim() || bookingForName) : `${formData.firstName} ${formData.lastName}`).trim(),
            patient_email: formData.email,
            patient_phone: formData.phone,
            patient_id: formData.userId,
            doctor_id: doctorId,
            doctor_name: doctorName,
            doctor_specialty: doctorSpecialty,
            appointment_date: day,
            appointment_time: time,
            notes: notesForDoctor,
            payment_method: 'cash',
            payment_amount: price,
            visit_type: visitTypeApi,
            create_ticket: true,
            family_member_ids: familyMemberIds,
            family_member_id: familyMemberIds[0] || null,
            booking_for_name: formData.patientFullName?.trim() || bookingForNames.join(', ') || bookingForName,
            family_member_vitals: familyMemberIds.length > 0 ? familyMemberVitalsMap : undefined,
            patient_vitals: familyMemberIds.length === 0 ? (profileVitals ?? undefined) : undefined,
          }),
        })
        const data = await response.json()
        if (!data.success) {
          console.error('[confirm] Appointment creation failed:', data.error)
          setBookingError(parseApiError(data))
          return
        }
        if (data.ticket_number) {
          setTicketNumber(data.ticket_number)
        }
        setIsSubmitted(true)
        return
      }

      // For online payments (edahabia, cib, etc.), create Chargily checkout
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(price),
          paymentMethod: selectedPaymentMethod,
          appointmentId: `APT-${Date.now()}`, // Generate temporary ID
          patientName: (bookingForName ? (formData.patientFullName?.trim() || bookingForName) : `${formData.firstName} ${formData.lastName}`).trim(),
          patientEmail: formData.email,
          patientPhone: formData.phone,
          description: `Appointment with Dr. - ${day} at ${time}`,
          locale: language === 'ar' ? 'ar' : 'fr'
        })
      })

      const data = await response.json()

      if (data.checkoutUrl) {
        // Redirect to Chargily payment page
        window.location.href = data.checkoutUrl
      } else {
        throw new Error(data.error || 'Failed to create checkout')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      // Check if it's a network error
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
        setBookingError(parseApiError(error, 'NETWORK_ERROR'))
      } else {
        setBookingError(parseApiError(error, 'SYSTEM_ERROR'))
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading while checking auth
  if (!authChecked) {
    return <FullPageLoading />
  }

  // Main rule: no booking without sign-in — show sign-in required when not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto flex h-12 sm:h-14 items-center justify-between px-2 sm:px-3 gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold text-foreground">Siha DZ</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-2 sm:px-3 py-4">
          <div className="mx-auto max-w-sm">
            <Card className="border border-primary/20">
              <CardContent className="p-4 text-center">
                <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <h1 className="mb-1 text-base font-bold text-foreground">
                  {language === 'ar' ? 'تسجيل الدخول مطلوب' : language === 'fr' ? 'Connexion requise' : 'Sign in required'}
                </h1>
                <p className="mb-3 text-xs text-muted-foreground">
                  {language === 'ar'
                    ? 'لا يمكن حجز موعد دون تسجيل الدخول أو إنشاء حساب.'
                    : language === 'fr'
                      ? 'Vous devez vous connecter ou créer un compte pour réserver un rendez-vous.'
                      : 'You must sign in or sign up to book an appointment.'}
                </p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/login" className="block">
                    <Button size="sm" className="w-full h-10 touch-target">
                      {language === 'ar' ? 'تسجيل الدخول' : language === 'fr' ? 'Se connecter' : 'Sign in'}
                    </Button>
                  </Link>
                  <Link href="/register" className="block">
                    <Button size="sm" variant="outline" className="w-full h-10 touch-target">
                      {language === 'ar' ? 'إنشاء حساب' : language === 'fr' ? 'Créer un compte' : 'Sign up'}
                    </Button>
                  </Link>
                  <Link href="/" className="block">
                    <Button size="sm" variant="ghost" className="w-full h-9 text-muted-foreground touch-target">
                      {language === 'ar' ? 'العودة للرئيسية' : language === 'fr' ? 'Retour à l\'accueil' : 'Back to home'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto flex h-12 sm:h-14 items-center justify-between px-2 sm:px-3 gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold text-foreground">Siha DZ</span>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-2 sm:px-3 py-4">
          <div className="mx-auto max-w-lg">
            <Card className="border border-primary/20">
              <CardContent className="p-4 sm:p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>

                <h1 className="mb-1.5 text-lg font-bold text-foreground">
                  {t.appointmentConfirmed}
                </h1>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t.confirmationMessage}
                </p>

                {ticketNumber && (
                  <div className="mb-3 p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{t.ticketNumber}</p>
                    <p className="text-lg font-mono font-bold text-primary">{ticketNumber}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.keepToTrack}</p>
                  </div>
                )}

                {ticketNumber && (
                  <div className="mb-3 flex flex-col items-center gap-1.5">
                    <p className="text-[10px] text-muted-foreground text-center max-w-xs">{t.qrForDoctor}</p>
                    <div className="bg-white p-2 rounded-lg border border-border">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR code for arrival confirmation" className="w-[140px] h-[140px]" />
                      ) : (
                        <div className="w-[140px] h-[140px] flex items-center justify-center bg-muted rounded">
                          <QrCode className="h-10 w-10 text-muted-foreground animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-3 rounded-lg bg-muted/30 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" />{t.doctor}</span>
                    <span className="font-medium text-foreground">{doctorName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" />{t.date}</span>
                    <span className="font-medium text-foreground">{day}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" />{t.time}</span>
                    <span className="font-medium text-foreground">{time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" />{t.address}</span>
                    <span className="font-medium text-foreground text-right text-xs">Rue Didouche Mourad, Alger</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Link href="/dashboard" className="block">
                    <Button size="sm" className="w-full h-10 touch-target">
                      {t.viewMyAppointments}
                    </Button>
                  </Link>
                  <Link href="/" className="block">
                    <Button size="sm" variant="outline" className="w-full h-10 bg-transparent touch-target">
                      {t.backToHome}
                    </Button>
                  </Link>
                </div>

                <p className="mt-3 text-[10px] text-muted-foreground">
                  {t.confirmationNumber}: <span className="font-mono font-semibold">RDV-2024-{Math.floor(Math.random() * 10000)}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-12 sm:h-14 items-center justify-between px-2 sm:px-3 gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground">Siha DZ</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-4 pb-6 sm:pb-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 sm:mb-3">
            <Link 
              href={doctorId ? `/booking/new?doctor=${doctorId}` : '/booking/new'}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 items-center touch-target py-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {t.backToChangeDate}
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {t.pageTitle}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.pageSubtitle}</p>
          </div>

          <div className="space-y-3 lg:max-w-2xl">
            {/* Form */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-3 sm:px-4 pb-0">
                <CardTitle className="text-sm font-semibold">
                  {bookingForName ? t.appointmentDetails : t.yourInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-3 sm:pt-1">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-2.5">
                  {bookingForName ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="patientFullName" className="text-xs">{t.patientName}</Label>
                        <Input
                          id="patientFullName"
                          required
                          className="h-9 text-sm"
                          value={formData.patientFullName}
                          onChange={(e) => setFormData({ ...formData, patientFullName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.parentGuardian}</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            id="parentFirstName"
                            required
                            placeholder={t.firstName}
                            className="h-9 text-sm"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          />
                          <Input
                            id="parentLastName"
                            required
                            placeholder={t.lastName}
                            className="h-9 text-sm"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t.yourContactHint}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="email" className="text-xs">{t.email}</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            required
                            className="h-9 text-sm"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="phone" className="text-xs">{t.phone}</Label>
                          <PhoneInput 
                            id="phone"
                            required
                            value={formData.phone}
                            onChange={(value) => setFormData({...formData, phone: value})}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="firstName" className="text-xs">{t.firstName}</Label>
                          <Input 
                            id="firstName" 
                            required
                            className="h-9 text-sm"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="lastName" className="text-xs">{t.lastName}</Label>
                          <Input 
                            id="lastName" 
                            required
                            className="h-9 text-sm"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="email" className="text-xs">{t.email}</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            required
                            className="h-9 text-sm"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor="phone" className="text-xs">{t.phone}</Label>
                          <PhoneInput 
                            id="phone"
                            required
                            value={formData.phone}
                            onChange={(value) => setFormData({...formData, phone: value})}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Patient information - fixed read-only vital fields (from profile or family member) */}
                  {(() => {
                    if (familyMemberIds.length > 0) {
                      return (
                        <div className="space-y-2">
                          {familyMemberIds.map((id) => {
                            const vitals = familyMemberVitalsMap[id]
                            const name = vitals?.full_name ?? bookingForNames[familyMemberIds.indexOf(id)] ?? `Patient ${familyMemberIds.indexOf(id) + 1}`
                            const hasVitals = vitals && (vitals.date_of_birth || vitals.gender || vitals.blood_type || vitals.allergies || vitals.chronic_conditions || vitals.current_medications || vitals.height_cm != null || vitals.weight_kg != null)
                            if (!hasVitals) return null
                            return (
                              <div key={id} className="rounded-md border border-muted bg-muted/30 p-2 space-y-1.5">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t.vitalInfo} — {name}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm [&>div:nth-child(odd)]:justify-self-start [&>div:nth-child(even)]:justify-self-end">
                                  {vitals.date_of_birth && (
                                    <div className="whitespace-nowrap">
                                      <span className="text-muted-foreground">{t.dateOfBirth}: </span>
                                      <span className="font-medium">{new Date(vitals.date_of_birth).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                                      <span className="text-muted-foreground ms-1">
                                        ({Math.floor((Date.now() - new Date(vitals.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} {lang === 'ar' ? 'سنة' : lang === 'fr' ? 'ans' : 'yrs'})
                                      </span>
                                    </div>
                                  )}
                                  {vitals.gender && (
                                    <div>
                                      <span className="text-muted-foreground">{t.gender}: </span>
                                      <span className="font-medium">{vitals.gender === 'male' ? (lang === 'ar' ? 'ذكر' : lang === 'fr' ? 'Homme' : 'Male') : (lang === 'ar' ? 'أنثى' : lang === 'fr' ? 'Femme' : 'Female')}</span>
                                    </div>
                                  )}
                                  {vitals.blood_type && (
                                    <div>
                                      <span className="text-muted-foreground">{t.bloodType}: </span>
                                      <span className="font-medium">{vitals.blood_type}</span>
                                    </div>
                                  )}
                                  {vitals.height_cm != null && (
                                    <div>
                                      <span className="text-muted-foreground">Height: </span>
                                      <span className="font-medium">{vitals.height_cm} cm</span>
                                    </div>
                                  )}
                                  {vitals.weight_kg != null && (
                                    <div>
                                      <span className="text-muted-foreground">Weight: </span>
                                      <span className="font-medium">{vitals.weight_kg} kg</span>
                                    </div>
                                  )}
                                </div>
                                {vitals.allergies && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t.allergies}: </span>
                                    <span className="text-sm font-medium">{vitals.allergies}</span>
                                  </div>
                                )}
                                {vitals.chronic_conditions && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t.chronicConditions}: </span>
                                    <span className="text-sm font-medium">{vitals.chronic_conditions}</span>
                                  </div>
                                )}
                                {vitals.current_medications && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t.currentMedications}: </span>
                                    <span className="text-sm font-medium">{vitals.current_medications}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                    const vitals = profileVitals
                    const hasVitals = vitals && (vitals.date_of_birth || vitals.gender || vitals.blood_type || vitals.allergies || vitals.chronic_conditions || vitals.current_medications || vitals.height_cm != null || vitals.weight_kg != null)
                    if (!hasVitals) return null
                    return (
                      <div className="rounded-md border border-muted bg-muted/30 p-2 space-y-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t.vitalInfo}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm [&>div:nth-child(odd)]:justify-self-start [&>div:nth-child(even)]:justify-self-end">
                          {vitals.date_of_birth && (
                            <div className="whitespace-nowrap">
                              <span className="text-muted-foreground">{t.dateOfBirth}: </span>
                              <span className="font-medium">{new Date(vitals.date_of_birth).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                              <span className="text-muted-foreground ms-1">
                                ({Math.floor((Date.now() - new Date(vitals.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} {lang === 'ar' ? 'سنة' : lang === 'fr' ? 'ans' : 'yrs'})
                              </span>
                            </div>
                          )}
                          {vitals.gender && (
                            <div>
                              <span className="text-muted-foreground">{t.gender}: </span>
                              <span className="font-medium">{vitals.gender === 'male' ? (lang === 'ar' ? 'ذكر' : lang === 'fr' ? 'Homme' : 'Male') : (lang === 'ar' ? 'أنثى' : lang === 'fr' ? 'Femme' : 'Female')}</span>
                            </div>
                          )}
                          {vitals.blood_type && (
                            <div>
                              <span className="text-muted-foreground">{t.bloodType}: </span>
                              <span className="font-medium">{vitals.blood_type}</span>
                            </div>
                          )}
                          {vitals.height_cm != null && (
                            <div>
                              <span className="text-muted-foreground">Height: </span>
                              <span className="font-medium">{vitals.height_cm} cm</span>
                            </div>
                          )}
                          {vitals.weight_kg != null && (
                            <div>
                              <span className="text-muted-foreground">Weight: </span>
                              <span className="font-medium">{vitals.weight_kg} kg</span>
                            </div>
                          )}
                        </div>
                        {vitals.allergies && (
                          <div>
                            <span className="text-muted-foreground text-xs">{t.allergies}: </span>
                            <span className="text-sm font-medium">{vitals.allergies}</span>
                          </div>
                        )}
                        {vitals.chronic_conditions && (
                          <div>
                            <span className="text-muted-foreground text-xs">{t.chronicConditions}: </span>
                            <span className="text-sm font-medium">{vitals.chronic_conditions}</span>
                          </div>
                        )}
                        {vitals.current_medications && (
                          <div>
                            <span className="text-muted-foreground text-xs">{t.currentMedications}: </span>
                            <span className="text-sm font-medium">{vitals.current_medications}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-xs">{t.notesOptional}</Label>
                    <Textarea 
                      id="notes" 
                      placeholder={t.notesPlaceholder}
                      rows={1}
                      className="text-sm resize-none min-h-[2.25rem]"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onMethodChange={setSelectedPaymentMethod}
                    onPaymentMethodSelect={setSelectedPaymentMethod}
                    amount={depositAmount}
                    walletBalance={walletBalance}
                    isLoggedIn={!!user}
                    hideSubmitButton
                    pendingTopUpAmount={pendingTopUp}
                  />

                  {/* Deposit & Refund Policy Info - compact */}
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 sm:p-2 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-xs text-blue-800 dark:text-blue-200">{t.depositRequired}: {depositAmount.toLocaleString()} DZD</p>
                        <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">{t.depositNote}</p>
                      </div>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-700 pt-1.5">
                      <p className="font-medium text-[10px] text-blue-800 dark:text-blue-200 flex items-center gap-1">
                        <Info className="h-2.5 w-2.5" />
                        {t.refundPolicy}
                      </p>
                      <ul className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5 space-y-0.5">
                        <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-green-600 shrink-0" /> {t.refund48h}</li>
                        <li className="flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" /> {t.refund24h}</li>
                        <li className="flex items-center gap-1"><span className="text-red-500 text-[10px]">✕</span> {t.refundLess24h}</li>
                        <li className="flex items-center gap-1 text-blue-600"><CheckCircle className="h-2.5 w-2.5 shrink-0" /> {t.providerCancelRefund}</li>
                      </ul>
                    </div>
                  </div>

                  {/* Booking Error Alert */}
                  {bookingError && (
                    <PaymentErrorAlert 
                      error={bookingError} 
                      onDismiss={() => setBookingError(null)}
                      onAction={() => {
                        if (bookingError.action?.type === 'retry') {
                          setBookingError(null)
                        }
                        if (bookingError.code === 'BOOKING_DATE_PASSED' && doctorId) {
                          router.push(`/booking/new?doctor=${doctorId}`)
                        }
                      }}
                    />
                  )}

                  {/* Summary - right before confirm */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-2.5 sm:p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">{t.summary}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-1">
                      <div>
                        <div className="text-[10px] text-muted-foreground">{t.patientName}</div>
                        <div className="font-medium text-xs text-foreground truncate">
                          {(bookingForName ? formData.patientFullName : `${formData.firstName} ${formData.lastName}`).trim() || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">{t.doctor}</div>
                        <div className="font-medium text-xs text-foreground truncate">{doctorName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{doctorSpecialty}</div>
                      </div>
                    </div>
                    {bookingForName && (
                      <div>
                        <div className="text-[10px] text-muted-foreground">{t.parentGuardian}</div>
                        <div className="font-medium text-xs text-foreground">
                          {[formData.firstName, formData.lastName].filter(Boolean).join(' ') || '—'}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{day}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">Rue Didouche Mourad, Alger</span>
                      </div>
                    </div>
                    <div className="border-t border-primary/20 pt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{t.consultation}</span>
                      <span className="text-sm font-bold text-primary">{parseInt(price).toLocaleString()} DZD</span>
                    </div>
                    {selectedPaymentMethod !== 'cash' && selectedPaymentMethod !== 'wallet' && (
                      <p className="text-[10px] text-muted-foreground">{t.redirectPayment}</p>
                    )}
                  </div>

                  <Button type="submit" size="sm" className="w-full h-10 text-sm touch-target" disabled={isProcessing || hasInsufficientBalance || !!bookingError}>
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="me-2 h-3.5 w-3.5" />
                        {t.processing}
                      </>
                    ) : selectedPaymentMethod === 'cash' || selectedPaymentMethod === 'wallet' ? (
                      t.confirmAppointment
                    ) : (
                      t.continueToPayment
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return null
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BookingConfirmContent />
    </Suspense>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Calendar,
  Video,
  Building,
  CheckCircle,
  MessageSquare,
  CalendarCheck,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { FavoriteButton, useFavorites } from '@/components/ui/favorite-button'
import { SectionLoading } from '@/components/ui/page-loading'
import { CalendarSlotPicker } from '@/components/booking/calendar-slot-picker'
import { ProfileServicesSection } from '@/components/profile/profile-services-section'

const labels = {
  ar: {
    bookAppointment: 'حجز موعد',
    bookEVisit: 'حجز استشارة عن بعد',
    workingHours: 'ساعات العمل',
    reviews: 'التقييمات',
    verified: 'طبيب موثق',
    selectDate: 'اختر التاريخ',
    selectTime: 'اختر الوقت',
    today: 'اليوم',
    tomorrow: 'غداً',
    morning: 'صباحاً',
    afternoon: 'مساءً',
    continueBooking: 'متابعة الحجز',
    callClinic: 'اتصل',
    writeReview: 'اكتب تقييم',
    dzd: 'د.ج',
    inPerson: 'حضوري',
    eVisit: 'عن بعد',
    loading: 'جاري التحميل...',
    notFound: 'الطبيب غير موجود',
    appointmentsAutoConfirmed: 'المواعيد مؤكدة تلقائياً',
    appointmentsSubjectToConfirmation: 'المواعيد تخضع لتأكيد العيادة',
  },
  fr: {
    bookAppointment: 'Prendre rendez-vous',
    bookEVisit: 'Réserver téléconsultation',
    workingHours: 'Horaires',
    reviews: 'Avis',
    verified: 'Médecin vérifié',
    selectDate: 'Choisir la date',
    selectTime: 'Choisir l\'heure',
    today: 'Aujourd\'hui',
    tomorrow: 'Demain',
    morning: 'Matin',
    afternoon: 'Après-midi',
    continueBooking: 'Continuer',
    callClinic: 'Appeler',
    writeReview: 'Écrire un avis',
    dzd: 'DA',
    inPerson: 'En cabinet',
    eVisit: 'Téléconsultation',
    loading: 'Chargement...',
    notFound: 'Médecin introuvable',
    noDescription: 'Aucune description.',
    appointmentsAutoConfirmed: 'Rendez-vous confirmés automatiquement',
    appointmentsSubjectToConfirmation: 'Rendez-vous sous réserve de confirmation',
  },
  en: {
    bookAppointment: 'Book Appointment',
    bookEVisit: 'Book E-Visit',
    workingHours: 'Working Hours',
    reviews: 'Reviews',
    verified: 'Verified Doctor',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    today: 'Today',
    tomorrow: 'Tomorrow',
    morning: 'Morning',
    afternoon: 'Afternoon',
    continueBooking: 'Continue Booking',
    callClinic: 'Call',
    writeReview: 'Write Review',
    dzd: 'DZD',
    inPerson: 'In-Person',
    eVisit: 'E-Visit',
    loading: 'Loading...',
    notFound: 'Doctor not found',
    appointmentsAutoConfirmed: 'Appointments confirmed automatically',
    appointmentsSubjectToConfirmation: 'Appointments subject to practice confirmation',
  },
}

function parseWorkingHours(wh: unknown): string[] {
  if (!wh || typeof wh !== 'object') return []
  const o = wh as Record<string, unknown>
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  const out: string[] = []
  for (const d of days) {
    const v = o[d] as { open?: string; close?: string; isOpen?: boolean } | undefined
    if (v && typeof v.open === 'string' && typeof v.close === 'string') {
      const label = d.charAt(0).toUpperCase() + d.slice(1)
      out.push(`${label}: ${v.open} – ${v.close}`)
    }
  }
  return out.length ? out : []
}

export default function DoctorProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const { language: lang, dir } = useLanguage()
  const l = labels[lang] || labels.en

  const [doctor, setDoctor] = useState<{
    id: string
    name: string
    nameAr: string
    specialty: string
    specialtyAr: string
    location: string
    rating: number
    reviews: number
    price: number
    eVisitPrice?: number
    phone?: string
    workingHours: string[]
    supportsEVisit: boolean
    canBook?: boolean
    autoConfirmAppointments?: boolean
    avatarUrl?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const { isFavorite } = useFavorites('doctor')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    const load = async () => {
      const supabase = createBrowserClient()

      const { data: pro, error: proErr } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .eq('type', 'doctor')
        .maybeSingle()

      if (!proErr && pro) {
        const wh = parseWorkingHours(pro.working_hours)
        let avatarUrl: string | null = null
        if (pro.auth_user_id) {
          const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', pro.auth_user_id).maybeSingle()
          avatarUrl = prof?.avatar_url ?? null
        }
        setDoctor({
          id: pro.id,
          name: (pro.business_name as string) || 'Doctor',
          nameAr: (pro.business_name_ar as string) || (pro.business_name as string) || 'طبيب',
          specialty: (pro.specialty as string) || 'General',
          specialtyAr: (pro.specialty_ar as string) || (pro.specialty as string) || 'عام',
          location: [pro.commune, pro.wilaya].filter(Boolean).join(', ') || (pro.address as string) || '',
          rating: Number(pro.rating) || 4.5,
          reviews: Number(pro.review_count) || 0,
          price: Number(pro.consultation_fee) || 2500,
          eVisitPrice: pro.consultation_fee ? Math.floor(Number(pro.consultation_fee) * 0.75) : undefined,
          phone: (pro.phone as string) || undefined,
          workingHours: wh,
          supportsEVisit: true,
          canBook: true,
          autoConfirmAppointments: !!(pro as { auto_confirm_appointments?: boolean }).auto_confirm_appointments,
          avatarUrl,
        })
        setLoading(false)
        return
      }

      const { data: doc } = await supabase
        .from('doctors')
        .select('id, user_id, clinic_name, clinic_name_ar, specialty, specialty_ar, city, clinic_address, consultation_fee, e_visit_fee, clinic_phone')
        .eq('id', id)
        .maybeSingle()

      if (doc) {
        // Booking must use professionals.id (appointments.doctor_id FK). Resolve professional by auth_user_id.
        let bookingId: string | null = null
        let avatarUrl: string | null = null
        if (doc.user_id) {
          const [proRes, profRes] = await Promise.all([
            supabase.from('professionals').select('id').eq('auth_user_id', doc.user_id).eq('type', 'doctor').maybeSingle(),
            supabase.from('profiles').select('avatar_url').eq('id', doc.user_id).maybeSingle(),
          ])
          if (proRes.data?.id) bookingId = proRes.data.id
          avatarUrl = profRes.data?.avatar_url ?? null
        }
        const loc = [doc.clinic_address, doc.city].filter(Boolean).join(', ')
        setDoctor({
          id: bookingId ?? doc.id,
          name: (doc.clinic_name as string) || 'Doctor',
          nameAr: (doc.clinic_name_ar as string) || (doc.clinic_name as string) || 'طبيب',
          specialty: (doc.specialty as string) || 'General',
          specialtyAr: (doc.specialty_ar as string) || (doc.specialty as string) || 'عام',
          location: loc,
          rating: 4.5,
          reviews: 0,
          price: Number(doc.consultation_fee) || 2500,
          eVisitPrice: doc.e_visit_fee ? Number(doc.e_visit_fee) : undefined,
          phone: doc.clinic_phone as string | undefined,
          workingHours: [],
          supportsEVisit: !!doc.e_visit_fee,
          canBook: !!bookingId,
          autoConfirmAppointments: false,
          avatarUrl,
        })
      }

      setLoading(false)
    }

    load()
  }, [id])

  const displayName = lang === 'ar' ? doctor?.nameAr : doctor?.name
  const displaySpecialty = lang === 'ar' ? doctor?.specialtyAr : doctor?.specialty

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={dir}>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <SectionLoading minHeight="min-h-[300px]" label={l.loading} />
        </main>
        <Footer />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={dir}>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <p className="text-muted-foreground">{l.notFound}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/search">{lang === 'ar' ? 'البحث عن أطباء' : lang === 'fr' ? 'Rechercher des médecins' : 'Search doctors'}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-4xl mx-auto">
          {/* Left: doctor card + tabs (wider column) */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="shrink-0">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <Avatar className="h-24 w-24 rounded-full ring-2 ring-primary/20 shrink-0">
                    <AvatarImage src={doctor.avatarUrl || undefined} alt="" className="object-cover" />
                    <AvatarFallback className="rounded-full text-2xl bg-primary/10 text-primary">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-xl font-bold truncate">{displayName}</h1>
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0">
                            <CheckCircle className="h-3 w-3 me-1" />
                            {l.verified}
                          </Badge>
                        </div>
                        <p className="text-base text-primary mt-0.5">{displaySpecialty}</p>
                      </div>
                      <FavoriteButton
                        professionalId={doctor.id}
                        initialFavorited={isFavorite(doctor.id)}
                        size="default"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-base font-medium">{doctor.rating}</span>
                      <span className="text-sm text-muted-foreground">({doctor.reviews})</span>
                    </div>
                    {doctor.location && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground truncate">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{doctor.location}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-sm px-2.5 py-1">
                        <Building className="h-3.5 w-3.5 me-1" />
                        {doctor.price.toLocaleString()} {l.dzd}
                      </Badge>
                      {doctor.supportsEVisit && doctor.eVisitPrice != null && (
                        <Badge variant="outline" className="text-sm px-2.5 py-1 border-primary text-primary">
                          <Video className="h-3.5 w-3.5 me-1" />
                          {doctor.eVisitPrice.toLocaleString()} {l.dzd}
                        </Badge>
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                      <CalendarCheck className="h-4 w-4 shrink-0" />
                      {doctor.autoConfirmAppointments ? l.appointmentsAutoConfirmed : l.appointmentsSubjectToConfirmation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ProfileServicesSection professionalId={doctor.id} className="shrink-0" />

            <div className="shrink-0">
              <Card className="mt-3">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {l.workingHours}
                  </h3>
                  {doctor.workingHours.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {doctor.workingHours.map((hours, idx) => (
                        <li key={idx}>{hours}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'غير متوفر' : lang === 'fr' ? 'Non disponible' : 'Not specified'}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: calendar & booking */}
          <div className="lg:col-span-6 flex flex-col items-center">
          <Card className="w-full max-w-xl">
            <CardHeader className="pb-0 py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {l.bookAppointment}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 px-4 pb-4 overflow-hidden">
              {doctor.canBook !== false ? (
                <CalendarSlotPicker
                  professionalId={doctor.id}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={setSelectedDate}
                  onSelectTime={setSelectedTime}
                  slotDuration={30}
                  minDaysAhead={0}
                  maxDaysAhead={60}
                  lang={lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'}
                  providerName={displayName}
                  providerSpecialty={displaySpecialty}
                  className="w-full min-w-0"
                  compact
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {lang === 'ar' ? 'لحجز موعد، اتصل بالعيادة' : lang === 'fr' ? 'Pour réserver, contactez le cabinet' : 'To book, please contact the practice'}
                </p>
              )}

              <div className="space-y-2 pt-3 border-t">
                {doctor.canBook !== false ? (
                  <>
                    <Button asChild className="w-full" disabled={!selectedDate || !selectedTime}>
                      <Link href={`/booking/new?doctor=${doctor.id}&date=${selectedDate}&time=${selectedTime}&type=in-person`}>
                        <Building className="h-4 w-4 me-2" />
                        {l.bookAppointment}
                      </Link>
                    </Button>
                    {doctor.supportsEVisit && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary/10 bg-transparent"
                        disabled={!selectedDate || !selectedTime}
                      >
                        <Link href={`/booking/new?doctor=${doctor.id}&date=${selectedDate}&time=${selectedTime}&type=e-visit`}>
                          <Video className="h-4 w-4 me-2" />
                          {l.bookEVisit}
                        </Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    {lang === 'ar' ? 'لحجز موعد، اتصل بالطبيب' : lang === 'fr' ? 'Pour réserver, contactez le cabinet' : 'To book, please contact the practice'}
                  </p>
                )}
                {doctor.phone && (
                  <Button variant="ghost" className="w-full" asChild>
                    <a href={`tel:${doctor.phone}`}>
                      <Phone className="h-4 w-4 me-2" />
                      {l.callClinic}
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

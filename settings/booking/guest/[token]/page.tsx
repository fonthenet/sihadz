'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/header'
import { useLanguage } from '@/lib/i18n/language-context'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Video,
  Building,
  Copy,
  Share2,
  Stethoscope,
  FileText,
  MessageCircle,
  XCircle
} from 'lucide-react'
import Loading from './loading'

interface GuestAppointment {
  id: string
  guest_token: string
  guest_name: string
  guest_email: string
  guest_phone: string
  doctor_id: string
  appointment_date: string
  appointment_time: string
  visit_type: string
  status: string
  symptoms: string
  consultation_fee: number
  payment_status: string
  payment_method: string
  created_at: string
  doctor?: {
    id: string
    specialty: string
    specialty_ar: string
    clinic_address: string
    clinic_phone: string
    user_id: string
  }
  doctor_profile?: {
    full_name: string
  }
}

export default function GuestTrackingPage(props: { params: Promise<{ token: string }> }) {
  const { t, language, dir } = useLanguage()
  const { token } = use(props.params)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [appointment, setAppointment] = useState<GuestAppointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const isSuccessRedirect = searchParams.get('success') === 'true'
  
  useEffect(() => {
    const fetchAppointment = async () => {
      const supabase = createBrowserClient()
      
      // Fetch appointment by guest token
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('guest_token', token)
        .eq('is_guest_booking', true)
        .single()
      
      if (appointmentError || !appointmentData) {
        setError(language === 'ar' ? 'لم يتم العثور على الموعد' : 'Appointment not found')
        setLoading(false)
        return
      }
      
      // Fetch doctor info
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id, specialty, specialty_ar, clinic_address, clinic_phone, user_id')
        .eq('id', appointmentData.doctor_id)
        .single()
      
      // Fetch doctor's profile name
      let doctorProfile = null
      if (doctorData?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', doctorData.user_id)
          .single()
        doctorProfile = profileData
      }
      
      setAppointment({
        ...appointmentData,
        doctor: doctorData,
        doctor_profile: doctorProfile
      })
      setLoading(false)
    }
    
    if (token) {
      fetchAppointment()
    }
  }, [token, language])
  
  const copyLink = () => {
    const url = `${window.location.origin}/booking/guest/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const shareLink = () => {
    const url = `${window.location.origin}/booking/guest/${token}`
    if (navigator.share) {
      navigator.share({
        title: language === 'ar' ? 'تفاصيل موعدي' : 'My Appointment Details',
        url: url
      })
    } else {
      copyLink()
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700">{language === 'ar' ? 'مؤكد' : 'Confirmed'}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">{language === 'ar' ? 'ملغي' : 'Cancelled'}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  if (loading) {
    return <Loading />
  }
  
  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={false} />
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-red-900">
                {language === 'ar' ? 'الموعد غير موجود' : 'Appointment Not Found'}
              </h2>
              <p className="mt-2 text-red-700">
                {language === 'ar' 
                  ? 'لم نتمكن من العثور على موعد بهذا الرابط. يرجى التحقق من الرابط والمحاولة مرة أخرى.'
                  : 'We couldn\'t find an appointment with this link. Please check the link and try again.'}
              </p>
              <Button className="mt-6" onClick={() => router.push('/')}>
                {language === 'ar' ? 'العودة للرئيسية' : 'Go to Home'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header showNav={false} />
      
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Success Message */}
        {isSuccessRedirect && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    {language === 'ar' ? 'تم حجز موعدك بنجاح!' : 'Your appointment has been booked!'}
                  </h3>
                  <p className="text-sm text-green-700">
                    {language === 'ar' 
                      ? 'احفظ هذا الرابط لتتبع موعدك والوصول إلى جميع التفاصيل.'
                      : 'Save this link to track your appointment and access all details.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Visit Number Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'ar' ? 'رقم الزيارة' : 'Visit Number'}
              </p>
              <h1 className="text-3xl font-bold text-primary tracking-wider">
                {`VIS-${appointment.id.substring(0, 8).toUpperCase()}`}
              </h1>
              <div className="mt-4 flex items-center justify-center gap-2">
                {getStatusBadge(appointment.status)}
              </div>
              
              {/* Share/Copy Link */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied 
                    ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') 
                    : (language === 'ar' ? 'نسخ الرابط' : 'Copy Link')}
                </Button>
                <Button variant="outline" size="sm" onClick={shareLink}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'مشاركة' : 'Share'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Doctor Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الطبيب' : 'Doctor Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {appointment.doctor_profile?.full_name || (language === 'ar' ? 'طبيب' : 'Doctor')}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' ? appointment.doctor?.specialty_ar : appointment.doctor?.specialty}
                </p>
                {appointment.doctor?.clinic_address && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{appointment.doctor.clinic_address}</span>
                  </div>
                )}
                {appointment.doctor?.clinic_phone && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${appointment.doctor.clinic_phone}`} className="text-primary hover:underline">
                      {appointment.doctor.clinic_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Appointment Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'تفاصيل الموعد' : 'Appointment Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </p>
                  <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'الوقت' : 'Time'}
                  </p>
                  <p className="font-medium">{appointment.appointment_time}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {appointment.visit_type === 'e-visit' ? (
                <Video className="h-5 w-5 text-primary" />
              ) : (
                <Building className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'نوع الزيارة' : 'Visit Type'}
                </p>
                <p className="font-medium">
                  {appointment.visit_type === 'e-visit' 
                    ? (language === 'ar' ? 'زيارة إلكترونية' : 'E-Visit / Video Consultation')
                    : (language === 'ar' ? 'زيارة شخصية' : 'In-Person Visit')}
                </p>
              </div>
            </div>
            
            {appointment.symptoms && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'الأعراض' : 'Symptoms'}
                  </p>
                </div>
                <p className="text-sm">{appointment.symptoms}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Payment Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الدفع' : 'Payment Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'رسوم الاستشارة' : 'Consultation Fee'}
                </p>
                <p className="text-2xl font-bold text-primary">{appointment.consultation_fee} DZD</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'حالة الدفع' : 'Payment Status'}
                </p>
                <Badge className={appointment.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {appointment.payment_status === 'paid' 
                    ? (language === 'ar' ? 'مدفوع' : 'Paid')
                    : (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {language === 'ar' ? 'طريقة الدفع:' : 'Payment Method:'} {appointment.payment_method === 'cash' ? (language === 'ar' ? 'نقداً' : 'Cash') : (language === 'ar' ? 'بطاقة' : 'Card')}
            </p>
          </CardContent>
        </Card>
        
        {/* Your Contact Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {language === 'ar' ? 'معلومات الاتصال' : 'Your Contact Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.guest_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.guest_email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.guest_phone}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Create Account CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {language === 'ar' ? 'أنشئ حساباً للحصول على المزيد' : 'Create an Account for More'}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'ar' 
                  ? 'أنشئ حساباً مجانياً للوصول إلى سجلاتك الطبية، وحجز المواعيد بشكل أسرع، وربط جميع مواعيدك السابقة.'
                  : 'Create a free account to access your medical records, book appointments faster, and link all your previous appointments.'}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={() => router.push(`/signup?email=${encodeURIComponent(appointment.guest_email)}`)}>
                  {language === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  {language === 'ar' ? 'العودة للرئيسية' : 'Go to Home'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

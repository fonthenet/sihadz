'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoCard } from '@/components/ui/info-card'
import { useLanguage } from '@/lib/i18n/language-context'
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  Video, 
  Building,
  Download,
  Share2,
  CalendarPlus,
  ArrowRight,
  ArrowLeft,
  Stethoscope,
  Phone
} from 'lucide-react'
import { Suspense } from 'react'
import Loading from './loading'
import { QRCodeDisplay } from '@/components/qr-code-display'

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BookingSuccess />
    </Suspense>
  )
}

function BookingSuccess() {
  const { t, language, dir } = useLanguage()
  const searchParams = useSearchParams()
  
  const confirmationCode = searchParams.get('code') || 'DZ000000'
  const doctorName = searchParams.get('doctor') || 'Doctor'
  const doctorId = searchParams.get('doctorId')
  const date = searchParams.get('date') || ''
  const time = searchParams.get('time') || ''
  const visitType = searchParams.get('type') || 'in-person'
  
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <div className="w-full">
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-16">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('bookingConfirmed')}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تم تأكيد موعدك مع ${doctorName}` 
              : language === 'fr'
              ? `Votre rendez-vous avec ${doctorName} est confirmé`
              : `Your appointment with ${doctorName} is confirmed`}
          </p>
        </div>

        {/* Confirmation Code and QR Code */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Confirmation Code */}
              <div className="text-center flex-1">
                <p className="text-sm text-muted-foreground mb-2">{t('confirmationCode')}</p>
                <p className="text-3xl font-mono font-bold text-primary tracking-wider">
                  {confirmationCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'ar' 
                    ? 'احتفظ بهذا الرمز للرجوع إليه' 
                    : language === 'fr'
                    ? 'Conservez ce code pour référence'
                    : 'Keep this code for your reference'}
                </p>
              </div>
              
              {/* QR Code */}
              <div className="flex-1 flex justify-center">
                <QRCodeDisplay 
                  value={JSON.stringify({
                    type: 'appointment',
                    code: confirmationCode,
                    doctor: doctorName,
                    date: date,
                    time: time,
                    visitType: visitType
                  })}
                  size={180}
                  showDownload={false}
                  downloadFileName={`appointment-${confirmationCode}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details - Compact */}
        <InfoCard
          title={t('appointmentDetails')}
          icon={Stethoscope}
          accent="slate"
          className="mb-6"
          items={[
            { label: language === 'ar' ? 'الطبيب' : language === 'fr' ? 'Médecin' : 'Doctor', value: doctorName, icon: Stethoscope },
            { label: language === 'ar' ? 'نوع الزيارة' : language === 'fr' ? 'Type de visite' : 'Visit Type', value: visitType === 'e-visit' ? t('eVisit') : t('inPerson'), icon: visitType === 'e-visit' ? Video : Building },
            { label: language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date', value: date, icon: Calendar },
            { label: language === 'ar' ? 'الوقت' : language === 'fr' ? 'Heure' : 'Time', value: time, icon: Clock },
          ]}
        />
        {visitType === 'e-visit' && (
          <div className="mb-6 p-3 rounded-xl bg-secondary/10 text-center">
            <Video className="h-6 w-6 mx-auto mb-1.5 text-secondary" />
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'ستتلقى رابط الاستشارة عبر البريد الإلكتروني والرسائل القصيرة قبل الموعد' : 
               language === 'fr' ? 'Vous recevrez le lien de consultation par email et SMS avant le rendez-vous' :
               'You will receive the consultation link via email and SMS before the appointment'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <CalendarPlus className="h-4 w-4" />
            {t('addToCalendar')}
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 bg-transparent"
            onClick={async () => {
              // Generate QR code and download as image with appointment details
              const QRCode = (await import('qrcode')).default
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              
              // Set canvas size for full confirmation
              canvas.width = 800
              canvas.height = 1000
              
              if (ctx) {
                // White background
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                
                // Title
                ctx.fillStyle = '#000000'
                ctx.font = 'bold 32px Arial'
                ctx.textAlign = 'center'
                ctx.fillText('Appointment Confirmed', 400, 60)
                
                // Confirmation code
                ctx.font = 'bold 48px monospace'
                ctx.fillStyle = '#10b981'
                ctx.fillText(confirmationCode, 400, 130)
                
                // Details
                ctx.font = '20px Arial'
                ctx.fillStyle = '#000000'
                ctx.textAlign = 'left'
                ctx.fillText(`Doctor: ${doctorName}`, 100, 200)
                ctx.fillText(`Date: ${date}`, 100, 240)
                ctx.fillText(`Time: ${time}`, 100, 280)
                ctx.fillText(`Type: ${visitType === 'e-visit' ? 'E-Visit' : 'In-Person'}`, 100, 320)
                
                // Generate QR code
                const qrDataUrl = await QRCode.toDataURL(JSON.stringify({
                  type: 'appointment',
                  code: confirmationCode,
                  doctor: doctorName,
                  date: date,
                  time: time
                }), { width: 400 })
                
                const qrImage = new Image()
                qrImage.onload = () => {
                  ctx.drawImage(qrImage, 200, 400, 400, 400)
                  
                  // Download
                  const link = document.createElement('a')
                  link.download = `appointment-confirmation-${confirmationCode}.png`
                  link.href = canvas.toDataURL()
                  link.click()
                }
                qrImage.src = qrDataUrl
              }
            }}
          >
            <Download className="h-4 w-4" />
            {language === 'ar' ? 'تحميل التأكيد' : language === 'fr' ? 'Télécharger' : 'Download'}
          </Button>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto gap-2">
              {t('viewAppointments')}
              <ArrowIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full sm:w-auto">
              {t('backToHome')}
            </Button>
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {language === 'ar' ? 'هل تحتاج إلى مساعدة؟' : language === 'fr' ? 'Besoin d\'aide?' : 'Need help?'}
          </p>
          <Button variant="link" className="gap-2">
            <Phone className="h-4 w-4" />
            {language === 'ar' ? 'اتصل بالدعم' : language === 'fr' ? 'Contacter le support' : 'Contact Support'}
          </Button>
        </div>
      </div>
    </div>
  )
}

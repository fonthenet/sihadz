'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, Home } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import Loading from './loading'

const labels = {
  en: {
    title: 'Payment Successful!',
    description: 'Your payment has been processed successfully.',
    appointmentConfirmed: 'Your appointment has been confirmed.',
    checkEmail: 'A confirmation email has been sent to your registered email address.',
    whatNext: 'What\'s Next?',
    viewAppointments: 'View My Appointments',
    backHome: 'Back to Home',
    processing: 'Verifying payment...',
    transactionId: 'Transaction ID',
  },
  ar: {
    title: 'تم الدفع بنجاح!',
    description: 'تمت معالجة دفعتك بنجاح.',
    appointmentConfirmed: 'تم تأكيد موعدك.',
    checkEmail: 'تم إرسال بريد إلكتروني للتأكيد إلى عنوان بريدك الإلكتروني المسجل.',
    whatNext: 'ماذا بعد؟',
    viewAppointments: 'عرض مواعيدي',
    backHome: 'العودة للرئيسية',
    processing: 'جاري التحقق من الدفع...',
    transactionId: 'رقم المعاملة',
  },
  fr: {
    title: 'Paiement réussi!',
    description: 'Votre paiement a été traité avec succès.',
    appointmentConfirmed: 'Votre rendez-vous a été confirmé.',
    checkEmail: 'Un email de confirmation a été envoyé à votre adresse email.',
    whatNext: 'Quelle est la suite?',
    viewAppointments: 'Voir mes rendez-vous',
    backHome: 'Retour à l\'accueil',
    processing: 'Vérification du paiement...',
    transactionId: 'ID de transaction',
  },
}

export default function PaymentSuccessPage() {
  const { language, dir } = useLanguage()
  const l = labels[language] || labels.en
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate verification delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={dir}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">{l.title}</CardTitle>
          <CardDescription>{l.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm">{l.appointmentConfirmed}</p>
            <p className="text-xs text-muted-foreground">{l.checkEmail}</p>
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                {l.transactionId}: <code className="bg-muted px-1 rounded">{sessionId}</code>
              </p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3">{l.whatNext}</h3>
            <div className="space-y-2">
              <Link href="/dashboard/appointments" className="block">
                <Button variant="default" className="w-full justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  {l.viewAppointments}
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Home className="h-4 w-4" />
                  {l.backHome}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

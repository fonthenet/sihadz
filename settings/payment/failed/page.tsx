'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'

const labels = {
  en: {
    title: 'Payment Failed',
    description: 'We couldn\'t process your payment. Please try again.',
    reasons: 'This could happen due to:',
    reason1: 'Insufficient balance',
    reason2: 'Card declined by bank',
    reason3: 'Network connection issue',
    reason4: 'Session expired',
    tryAgain: 'Try Again',
    backHome: 'Back to Home',
    contactSupport: 'Contact Support',
  },
  ar: {
    title: 'فشل الدفع',
    description: 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.',
    reasons: 'قد يحدث هذا بسبب:',
    reason1: 'رصيد غير كافٍ',
    reason2: 'رفض البطاقة من البنك',
    reason3: 'مشكلة في الاتصال بالشبكة',
    reason4: 'انتهت صلاحية الجلسة',
    tryAgain: 'حاول مرة أخرى',
    backHome: 'العودة للرئيسية',
    contactSupport: 'اتصل بالدعم',
  },
  fr: {
    title: 'Échec du paiement',
    description: 'Nous n\'avons pas pu traiter votre paiement. Veuillez réessayer.',
    reasons: 'Cela peut arriver à cause de:',
    reason1: 'Solde insuffisant',
    reason2: 'Carte refusée par la banque',
    reason3: 'Problème de connexion réseau',
    reason4: 'Session expirée',
    tryAgain: 'Réessayer',
    backHome: 'Retour à l\'accueil',
    contactSupport: 'Contacter le support',
  },
}

export default function PaymentFailedPage() {
  const { language, dir } = useLanguage()
  const l = labels[language] || labels.en

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={dir}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">{l.title}</CardTitle>
          <CardDescription>{l.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">{l.reasons}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{l.reason1}</li>
              <li>{l.reason2}</li>
              <li>{l.reason3}</li>
              <li>{l.reason4}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button 
              variant="default" 
              className="w-full justify-center gap-2"
              onClick={() => window.history.back()}
            >
              <RefreshCw className="h-4 w-4" />
              {l.tryAgain}
            </Button>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full justify-center gap-2 bg-transparent">
                <Home className="h-4 w-4" />
                {l.backHome}
              </Button>
            </Link>
            <Link href="/contact" className="block">
              <Button variant="ghost" className="w-full justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {l.contactSupport}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

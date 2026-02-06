'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { PaymentForm } from '@/components/payment-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight,
  ArrowLeft,
  Shield,
  CheckCircle,
  Lock
} from 'lucide-react'

function PaymentContent() {
  const { t, dir } = useLanguage()
  const searchParams = useSearchParams()
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight
  
  const type = searchParams.get('type') || 'consultation'
  const amount = Number(searchParams.get('amount')) || 3000
  const doctorName = searchParams.get('doctor') || 'Dr. Amina Ben Ali'
  const appointmentDate = searchParams.get('date') || '2024-02-20'
  
  const [paymentComplete, setPaymentComplete] = useState(false)

  const getPaymentTitle = () => {
    switch (type) {
      case 'consultation': return t('paymentForConsultation')
      case 'evisit': return t('paymentForEVisit')
      case 'medication': return t('paymentForMedication')
      case 'subscription': return t('paymentForSubscription')
      default: return t('payment')
    }
  }

  const handlePaymentSuccess = (method: string, transactionId?: string) => {
    setPaymentComplete(true)
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex flex-col" dir={dir}>
        <Header />
        <main className="flex-1 bg-muted/30 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t('paymentSuccessful')}</h2>
              <p className="text-muted-foreground mb-6">{t('paymentConfirmation')}</p>
              
              <div className="bg-muted p-4 rounded-lg mb-6 text-start">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">{t('amount')}</span>
                  <span className="font-semibold">{amount.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">{t('transactionId')}</span>
                  <span className="font-mono text-sm">TXN-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('date')}</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link href="/dashboard">
                  <Button className="w-full">{t('goToDashboard')}</Button>
                </Link>
                <Button variant="outline" className="w-full bg-transparent">
                  {t('downloadReceipt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      <Header />
      
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/dashboard" className="hover:text-primary">{t('dashboard')}</Link>
            <ArrowIcon className="h-4 w-4" />
            <span className="text-foreground">{t('payment')}</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{getPaymentTitle()}</CardTitle>
                  <CardDescription>{t('selectPaymentMethod')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentForm
                    amount={amount}
                    description={`${type} - ${doctorName}`}
                    onSuccess={handlePaymentSuccess}
                    showCashOption={true}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('orderSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('service')}</span>
                      <span>{getPaymentTitle()}</span>
                    </div>
                    {type === 'consultation' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('doctor')}</span>
                          <span>{doctorName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('date')}</span>
                          <span>{new Date(appointmentDate).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold">
                      <span>{t('total')}</span>
                      <span className="text-primary">{amount.toLocaleString()} DZD</span>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 text-sm">
                      <Shield className="h-4 w-4" />
                      <span>{t('chifaEligible')}</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">{t('chifaReimbursement')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Badge */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{t('securePayment')}</p>
                      <p className="text-xs text-muted-foreground">{t('encryptedConnection')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline">CIB</Badge>
                    <Badge variant="outline">Edahabia</Badge>
                    <Badge variant="outline">{t('cash')}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentContent />
    </Suspense>
  )
}

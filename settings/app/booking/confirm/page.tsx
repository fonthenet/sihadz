'use client'

import React, { useState } from "react"
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, MapPin, Stethoscope, CheckCircle, User, Mail, Phone } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { PaymentMethodSelector, type PaymentMethod } from '@/components/payment/payment-method-selector'
import { useLanguage } from '@/lib/i18n/language-context'

function BookingConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { language } = useLanguage()
  const doctorId = searchParams.get('doctor')
  const day = searchParams.get('day')
  const time = searchParams.get('time')
  const price = searchParams.get('price') || '3000'
  const doctorName = 'Dr. Amina Benali' // Declare doctorName variable

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    userId: null as string | null
  })
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // If cash payment, create appointment and ticket
      if (selectedPaymentMethod === 'cash') {
        // Create both appointment record AND ticket
        const response = await fetch('/api/appointments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name: `${formData.firstName} ${formData.lastName}`,
            patient_email: formData.email,
            patient_phone: formData.phone,
            patient_id: formData.userId,
            doctor_id: doctorId,
            appointment_date: day,
            appointment_time: time,
            notes: formData.notes,
            payment_method: 'cash',
            payment_amount: price,
            visit_type: 'in-person',
            create_ticket: true // Signal to create ticket as well
          })
        })

        const data = await response.json()
        if (data.success && data.ticket_number) {
          setTicketNumber(data.ticket_number)
        }
        
        setIsSubmitted(true)
        return
      }

      // For online payments, create Chargily checkout
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(price),
          paymentMethod: selectedPaymentMethod,
          appointmentId: `APT-${Date.now()}`, // Generate temporary ID
          patientName: `${formData.firstName} ${formData.lastName}`,
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
    } catch (error) {
      console.error('Payment error:', error)
      alert(language === 'ar' ? 'خطأ في الدفع' : 'Erreur de paiement')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">DZDoc</span>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>

                <h1 className="mb-3 text-3xl font-bold text-foreground">
                  Rendez-vous confirmé!
                </h1>
                <p className="mb-8 text-balance text-lg text-muted-foreground">
                  تم تأكيد موعدك بنجاح. سوف تتلقى رسالة تأكيد عبر البريد الإلكتروني والرسائل القصيرة
                </p>

                {ticketNumber && (
                  <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Ticket Number / رقم التذكرة</p>
                    <p className="text-2xl font-mono font-bold text-primary">{ticketNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">Keep this number to track your appointment</p>
                  </div>
                )}

                <Card className="mb-8 bg-muted/30">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-5 w-5" />
                        <span>Médecin</span>
                      </div>
                      <span className="font-semibold text-foreground">Dr. Amina Benali</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                        <span>Date</span>
                      </div>
                      <span className="font-semibold text-foreground">{day}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-5 w-5" />
                        <span>Heure</span>
                      </div>
                      <span className="font-semibold text-foreground">{time}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                        <span>Adresse</span>
                      </div>
                      <span className="text-right font-semibold text-foreground">
                        Rue Didouche Mourad, Alger
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button size="lg" className="w-full">
                      Voir mes rendez-vous
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button size="lg" variant="outline" className="w-full bg-transparent">
                      Retour à l&apos;accueil
                    </Button>
                  </Link>
                </div>

                <p className="mt-6 text-sm text-muted-foreground">
                  Numéro de confirmation: <span className="font-mono font-semibold">RDV-2024-{Math.floor(Math.random() * 10000)}</span>
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
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">DZDoc</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Confirmer votre rendez-vous</h1>
            <p className="text-muted-foreground">أكمل المعلومات لتأكيد موعدك</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>Vos informations</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input 
                        id="firstName" 
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input 
                        id="lastName" 
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <PhoneInput 
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(value) => setFormData({...formData, phone: value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Décrivez brièvement le motif de votre consultation..."
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onMethodChange={setSelectedPaymentMethod}
                    amount={parseInt(price)}
                  />

                  <Button type="submit" size="lg" className="w-full" disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="me-2" />
                        {language === 'ar' ? 'جاري المعالجة...' : 'Traitement...'}
                      </>
                    ) : selectedPaymentMethod === 'cash' ? (
                      language === 'ar' ? 'تأكيد الموعد' : 'Confirmer le rendez-vous'
                    ) : (
                      language === 'ar' ? 'المتابعة للدفع' : 'Continuer vers le paiement'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Médecin</div>
                  <div className="font-semibold text-foreground">Dr. Amina Benali</div>
                  <div className="text-sm text-muted-foreground">Cardiologue</div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{day}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{time}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Rue Didouche Mourad, Alger</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Consultation</span>
                    <span className="text-xl font-bold text-primary">{parseInt(price).toLocaleString()} DZD</span>
                  </div>
                  {selectedPaymentMethod !== 'cash' && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? 'سيتم توجيهك إلى بوابة الدفع الآمنة'
                        : 'Vous serez redirigé vers la passerelle de paiement sécurisée'}
                    </p>
                  )}
                </div>
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

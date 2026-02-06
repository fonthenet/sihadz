'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Banknote, Shield, CheckCircle, Smartphone, CreditCard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useLanguage } from '@/lib/i18n/language-context'

export type PaymentMethodType = 'edahabia' | 'cib' | 'flexy' | 'mobilis' | 'ooredoo' | 'cash'
export type PaymentMethod = PaymentMethodType // Alias for backward compatibility

interface PaymentMethodSelectorProps {
  amount: number // in DZD
  discount?: number // Chifa discount
  onPaymentMethodSelect: (method: PaymentMethodType) => void
  onProceed: () => void
  isLoading?: boolean
  hasChifaCard?: boolean
}

const labels = {
  en: {
    selectPayment: 'Select Payment Method',
    selectPaymentDesc: 'Choose how you want to pay for your appointment',
    edahabia: 'EDAHABIA / Baridi Mob',
    edahabiaDesc: 'Pay with Algerie Poste card or Baridi Mob app',
    cib: 'CIB Bank Card',
    cibDesc: 'Pay with any Algerian bank card (SATIM)',
    flexy: 'Flexy (Djezzy)',
    flexyDesc: 'Pay with Djezzy mobile credit',
    mobilis: 'Mobilis',
    mobilisDesc: 'Pay with Mobilis mobile credit',
    ooredoo: 'Ooredoo',
    ooredooDesc: 'Pay with Ooredoo mobile credit',
    cash: 'Cash at Clinic',
    cashDesc: 'Pay in person when you arrive for your appointment',
    total: 'Total',
    chifaDiscount: 'Chifa Discount',
    youPay: 'You Pay',
    securePayment: 'Secure payment powered by Chargily',
    proceed: 'Proceed to Payment',
    payAtClinic: 'Confirm Appointment',
    popular: 'Popular',
    recommended: 'Recommended',
  },
  ar: {
    selectPayment: 'اختر طريقة الدفع',
    selectPaymentDesc: 'اختر كيف تريد الدفع مقابل موعدك',
    edahabia: 'الذهبية / بريدي موب',
    edahabiaDesc: 'ادفع ببطاقة بريد الجزائر أو تطبيق بريدي موب',
    cib: 'بطاقة CIB البنكية',
    cibDesc: 'ادفع بأي بطاقة بنكية جزائرية (ساتيم)',
    flexy: 'فليكسي (جازي)',
    flexyDesc: 'ادفع برصيد جازي',
    mobilis: 'موبيليس',
    mobilisDesc: 'ادفع برصيد موبيليس',
    ooredoo: 'أوريدو',
    ooredooDesc: 'ادفع برصيد أوريدو',
    cash: 'نقداً في العيادة',
    cashDesc: 'ادفع شخصياً عند وصولك لموعدك',
    total: 'المجموع',
    chifaDiscount: 'خصم الشفاء',
    youPay: 'تدفع',
    securePayment: 'دفع آمن مدعوم من Chargily',
    proceed: 'المتابعة للدفع',
    payAtClinic: 'تأكيد الموعد',
    popular: 'شائع',
    recommended: 'موصى به',
  },
  fr: {
    selectPayment: 'Sélectionnez le mode de paiement',
    selectPaymentDesc: 'Choisissez comment vous souhaitez payer votre rendez-vous',
    edahabia: 'EDAHABIA / Baridi Mob',
    edahabiaDesc: 'Payez avec la carte Algérie Poste ou l\'app Baridi Mob',
    cib: 'Carte bancaire CIB',
    cibDesc: 'Payez avec n\'importe quelle carte bancaire algérienne (SATIM)',
    flexy: 'Flexy (Djezzy)',
    flexyDesc: 'Payez avec crédit mobile Djezzy',
    mobilis: 'Mobilis',
    mobilisDesc: 'Payez avec crédit mobile Mobilis',
    ooredoo: 'Ooredoo',
    ooredooDesc: 'Payez avec crédit mobile Ooredoo',
    cash: 'Espèces à la clinique',
    cashDesc: 'Payez en personne à votre arrivée',
    total: 'Total',
    chifaDiscount: 'Réduction Chifa',
    youPay: 'Vous payez',
    securePayment: 'Paiement sécurisé par Chargily',
    proceed: 'Procéder au paiement',
    payAtClinic: 'Confirmer le rendez-vous',
    popular: 'Populaire',
    recommended: 'Recommandé',
  },
}

export function PaymentMethodSelector({
  amount,
  discount = 0,
  onPaymentMethodSelect,
  onProceed,
  isLoading = false,
  hasChifaCard = false,
}: PaymentMethodSelectorProps) {
  const { language, dir } = useLanguage()
  const l = labels[language] || labels.en
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('edahabia')

  const finalAmount = amount - discount

  const handleMethodChange = (value: string) => {
    const method = value as PaymentMethodType
    setSelectedMethod(method)
    onPaymentMethodSelect(method)
  }

  const paymentMethods = [
    {
      id: 'edahabia',
      name: l.edahabia,
      description: l.edahabiaDesc,
      icon: <Image src="/payment-logos/edahabia.jpg" alt="EDAHABIA" width={24} height={24} className="rounded" />,
      badge: l.popular,
      badgeColor: 'bg-yellow-100 text-yellow-800',
    },
    {
      id: 'cib',
      name: l.cib,
      description: l.cibDesc,
      icon: <Image src="/payment-logos/cib.jpg" alt="CIB" width={24} height={24} className="rounded" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'flexy',
      name: l.flexy,
      description: l.flexyDesc,
      icon: <Image src="/payment-logos/djezzy.jpg" alt="Djezzy" width={24} height={24} className="rounded" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'mobilis',
      name: l.mobilis,
      description: l.mobilisDesc,
      icon: <Image src="/payment-logos/mobilis.jpg" alt="Mobilis" width={24} height={24} className="rounded" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'ooredoo',
      name: l.ooredoo,
      description: l.ooredooDesc,
      icon: <Image src="/payment-logos/ooredoo.jpg" alt="Ooredoo" width={24} height={24} className="rounded" />,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'cash',
      name: l.cash,
      description: l.cashDesc,
      icon: <Banknote className="h-6 w-6 text-green-600" />,
      badge: l.recommended,
      badgeColor: 'bg-green-100 text-green-800',
    },
  ]

  return (
    <Card dir={dir}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {l.selectPayment}
        </CardTitle>
        <CardDescription>{l.selectPaymentDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Methods */}
        <RadioGroup
          value={selectedMethod}
          onValueChange={handleMethodChange}
          className="space-y-3"
        >
          {paymentMethods.map((method) => (
            <div key={method.id}>
              <Label
                htmlFor={method.id}
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value={method.id} id={method.id} />
                <div className="flex-shrink-0">{method.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.name}</span>
                    {method.badge && (
                      <Badge variant="secondary" className={`text-xs ${method.badgeColor}`}>
                        {method.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Price Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{l.total}</span>
            <span>{amount.toLocaleString()} DZD</span>
          </div>
          {discount > 0 && hasChifaCard && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {l.chifaDiscount}
              </span>
              <span>-{discount.toLocaleString()} DZD</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>{l.youPay}</span>
            <span className="text-primary">{finalAmount.toLocaleString()} DZD</span>
          </div>
        </div>

        {/* Security Badge */}
        {selectedMethod !== 'cash' && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{l.securePayment}</span>
          </div>
        )}

        {/* Confirm Button */}
        <Button
          onClick={() => {
            console.log('[v0] Payment button clicked, method:', selectedMethod)
            onProceed()
          }}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="me-2" />
              {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
            </>
          ) : selectedMethod === 'cash' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {l.payAtClinic}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {l.proceed}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

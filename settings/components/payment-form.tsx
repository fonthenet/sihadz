'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CreditCard,
  Banknote,
  Wallet,
  Shield,
  CheckCircle,
  Lock,
  AlertCircle,
  Receipt,
  Download
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { CardInput } from '@/components/payment/card-input'

export type PaymentMethod = 'cash' | 'cib' | 'edahabia'

export interface PaymentDetails {
  method: PaymentMethod
  amount: number
  currency: 'DZD'
  description: string
  transactionId?: string
  status: 'pending' | 'processing' | 'success' | 'failed'
}

interface PaymentItem {
  label: string
  labelAr: string
  labelFr: string
  amount: number
  isDiscount?: boolean
}

interface PaymentFormProps {
  items: PaymentItem[]
  onPaymentComplete: (payment: PaymentDetails) => void
  onPayLater?: () => void
  allowCash?: boolean
  allowPayLater?: boolean
}

export function PaymentForm({
  items,
  onPaymentComplete,
  onPayLater,
  allowCash = true,
  allowPayLater = false
}: PaymentFormProps) {
  const { t, language, dir } = useLanguage()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [transactionId, setTransactionId] = useState<string | null>(null)

  // Card form state
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholderName, setCardholderName] = useState('')

  const subtotal = items.filter(i => !i.isDiscount).reduce((sum, item) => sum + item.amount, 0)
  const discounts = items.filter(i => i.isDiscount).reduce((sum, item) => sum + item.amount, 0)
  const total = subtotal - discounts

  const getItemLabel = (item: PaymentItem) => {
    switch (language) {
      case 'ar': return item.labelAr
      case 'fr': return item.labelFr
      default: return item.label
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : value
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    setPaymentStatus('processing')

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulate success (in production, this would call Chargily API)
    const txnId = 'TXN-' + Date.now().toString(36).toUpperCase()
    setTransactionId(txnId)
    setPaymentStatus('success')
    setIsProcessing(false)

    onPaymentComplete({
      method: paymentMethod,
      amount: total,
      currency: 'DZD',
      description: items.map(i => getItemLabel(i)).join(', '),
      transactionId: txnId,
      status: 'success'
    })
  }

  const handleCashPayment = () => {
    const txnId = 'CASH-' + Date.now().toString(36).toUpperCase()
    setTransactionId(txnId)
    setPaymentStatus('success')

    onPaymentComplete({
      method: 'cash',
      amount: total,
      currency: 'DZD',
      description: items.map(i => getItemLabel(i)).join(', '),
      transactionId: txnId,
      status: 'success'
    })
  }

  if (paymentStatus === 'success') {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">{t('paymentSuccessful')}</h3>
          <p className="mb-4 text-muted-foreground">
            {paymentMethod === 'cash' 
              ? (language === 'ar' ? 'يرجى الدفع نقداً عند الزيارة' : language === 'fr' ? 'Veuillez payer en espèces lors de la visite' : 'Please pay cash at the visit')
              : (language === 'ar' ? 'تم معالجة دفعتك بنجاح' : language === 'fr' ? 'Votre paiement a été traité avec succès' : 'Your payment has been processed successfully')
            }
          </p>
          
          <div className="mx-auto max-w-sm rounded-lg bg-muted/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('transactionId')}</span>
              <span className="font-mono text-sm font-semibold">{transactionId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('totalAmount')}</span>
              <span className="font-semibold text-primary">{total.toLocaleString()} DZD</span>
            </div>
          </div>

          <Button className="mt-6 bg-transparent" variant="outline">
            <Download className="me-2 h-4 w-4" />
            {t('downloadReceipt')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {language === 'ar' ? 'ملخص الطلب' : language === 'fr' ? 'Résumé de la commande' : 'Order Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className={`text-sm ${item.isDiscount ? 'text-green-600' : 'text-foreground'}`}>
                {getItemLabel(item)}
              </span>
              <span className={`font-medium ${item.isDiscount ? 'text-green-600' : 'text-foreground'}`}>
                {item.isDiscount ? '-' : ''}{item.amount.toLocaleString()} DZD
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-foreground">{t('totalAmount')}</span>
            <span className="text-xl font-bold text-primary">{total.toLocaleString()} DZD</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectPaymentMethod')}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'اختر طريقة الدفع المفضلة لديك' : language === 'fr' ? 'Choisissez votre mode de paiement préféré' : 'Choose your preferred payment method'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            {/* Cash Option */}
            {allowCash && (
              <div 
                className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                <RadioGroupItem value="cash" id="cash" className="mt-1 flex-shrink-0" />
                <div className="flex-1 text-start">
                  <div className="flex items-center gap-3 mb-1">
                    <Banknote className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <Label htmlFor="cash" className="text-base font-semibold cursor-pointer">
                      {t('cash')}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('cashOnVisit')}</p>
                </div>
              </div>
            )}

            {/* CIB Card Option */}
            <div 
              className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                paymentMethod === 'cib' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setPaymentMethod('cib')}
            >
              <RadioGroupItem value="cib" id="cib" className="mt-1 flex-shrink-0" />
              <div className="flex-1 text-start">
                <div className="flex items-center gap-3 mb-1">
                  <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <Label htmlFor="cib" className="text-base font-semibold cursor-pointer">
                    {t('cib')}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {language === 'ar' ? 'موصى به' : 'Recommended'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t('cibDesc')}</p>
              </div>
            </div>

            {/* Edahabia Card Option */}
            <div 
              className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                paymentMethod === 'edahabia' ? 'border-secondary bg-secondary/5' : 'border-border hover:border-secondary/50'
              }`}
              onClick={() => setPaymentMethod('edahabia')}
            >
              <RadioGroupItem value="edahabia" id="edahabia" className="mt-1 flex-shrink-0" />
              <div className="flex-1 text-start">
                <div className="flex items-center gap-3 mb-1">
                  <Wallet className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <Label htmlFor="edahabia" className="text-base font-semibold cursor-pointer">
                    {t('edahabia')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">{t('edahabiaDesc')}</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Card Details Form (for CIB and Edahabia) */}
      {(paymentMethod === 'cib' || paymentMethod === 'edahabia') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              {language === 'ar' ? 'تفاصيل البطاقة' : language === 'fr' ? 'Détails de la carte' : 'Card Details'}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {language === 'ar' ? 'معاملة آمنة ومشفرة' : language === 'fr' ? 'Transaction sécurisée et cryptée' : 'Secure and encrypted transaction'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardInput
              value={cardNumber}
              onChange={setCardNumber}
              label={language === 'ar' ? 'رقم البطاقة' : language === 'fr' ? 'Numéro de carte' : 'Card Number'}
              placeholder="XXXX XXXX XXXX XXXX"
              selectedPaymentMethod={paymentMethod}
              onPaymentMethodSuggestion={(method) => setPaymentMethod(method)}
              language={language}
            />

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم حامل البطاقة' : language === 'fr' ? 'Nom du titulaire' : 'Cardholder Name'}</Label>
              <Input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder={language === 'ar' ? 'الاسم كما يظهر على البطاقة' : 'Name as shown on card'}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ الانتهاء' : language === 'fr' ? 'Date d\'expiration' : 'Expiry Date'}</Label>
                <Input
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>CVV</Label>
                <Input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="XXX"
                  maxLength={3}
                  type="password"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {paymentMethod === 'cash' ? (
          <Button onClick={handleCashPayment} className="flex-1" size="lg">
            <CheckCircle className="me-2 h-5 w-5" />
            {language === 'ar' ? 'تأكيد الدفع نقداً' : language === 'fr' ? 'Confirmer paiement en espèces' : 'Confirm Cash Payment'}
          </Button>
        ) : (
          <Button 
            onClick={handlePayment} 
            className="flex-1" 
            size="lg"
            disabled={isProcessing || !cardNumber || !expiryDate || !cvv || !cardholderName}
          >
            {isProcessing ? (
              <>
                <LoadingSpinner size="md" className="me-2" />
                {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
              </>
            ) : (
              <>
                <Lock className="me-2 h-5 w-5" />
                {t('payNow')} - {total.toLocaleString()} DZD
              </>
            )}
          </Button>
        )}

        {allowPayLater && onPayLater && (
          <Button variant="outline" onClick={onPayLater} className="flex-1 bg-transparent" size="lg">
            {t('payLater')}
          </Button>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>
          {language === 'ar' ? 'مدعوم من Chargily Pay - معاملات آمنة 100%' : 
           language === 'fr' ? 'Propulsé par Chargily Pay - Transactions 100% sécurisées' :
           'Powered by Chargily Pay - 100% Secure Transactions'}
        </span>
      </div>
    </div>
  )
}

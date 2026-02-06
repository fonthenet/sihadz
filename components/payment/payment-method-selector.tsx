'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Banknote, Shield, CheckCircle, Smartphone, CreditCard, Wallet, AlertTriangle, Clock, LogIn, Info, Lock } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useLanguage } from '@/lib/i18n/language-context'
import { InsufficientBalanceWarning, PendingTopUpNotice } from './payment-error-alert'

export type PaymentMethodType = 'edahabia' | 'cib' | 'flexy' | 'mobilis' | 'ooredoo' | 'cash' | 'wallet'
export type PaymentMethod = PaymentMethodType // Alias for backward compatibility

interface PaymentMethodSelectorProps {
  amount: number // in DZD
  discount?: number // Chifa discount
  onPaymentMethodSelect: (method: PaymentMethodType) => void
  onProceed?: () => void
  isLoading?: boolean
  disabled?: boolean // e.g. when form (name, phone) incomplete
  hasChifaCard?: boolean
  /** Controlled mode: pass to control selected method from parent */
  selectedMethod?: PaymentMethodType
  onMethodChange?: (method: PaymentMethodType) => void
  /** Show Wallet option when user is logged in; balance used to show "Insufficient balance" when needed */
  walletBalance?: number | null
  isLoggedIn?: boolean
  /** When true, do not render the internal submit/proceed button (parent provides its own) */
  hideSubmitButton?: boolean
  /** Pending top-up amount (if any) */
  pendingTopUpAmount?: number
  /** Frozen deposits amount */
  frozenDeposits?: number
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
    wallet: 'Pay from Wallet',
    walletDesc: 'Deduct deposit from your wallet balance',
    walletBalance: 'Balance',
    insufficientBalance: 'Insufficient balance',
    total: 'Total',
    chifaDiscount: 'Chifa Discount',
    youPay: 'You Pay',
    securePayment: 'Secure payment powered by Chargily',
    proceed: 'Proceed to Payment',
    payAtClinic: 'Confirm Appointment',
    popular: 'Popular',
    recommended: 'Recommended',
    loginRequired: 'Sign in required',
    loginToUseWallet: 'Sign in to use wallet payment',
    signIn: 'Sign in',
    depositInfo: 'This is a deposit to confirm your booking. It will be deducted from your final bill.',
    walletEmpty: 'Your wallet is empty',
    frozenDeposits: 'Frozen in deposits',
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
    loginRequired: 'تسجيل الدخول مطلوب',
    loginToUseWallet: 'سجل الدخول لاستخدام المحفظة',
    signIn: 'تسجيل الدخول',
    depositInfo: 'هذا عربون لتأكيد حجزك. سيتم خصمه من فاتورتك النهائية.',
    walletEmpty: 'محفظتك فارغة',
    frozenDeposits: 'مجمد في العربونات',
    wallet: 'الدفع من المحفظة',
    walletDesc: 'خصم العربون من رصيد محفظتك',
    walletBalance: 'الرصيد',
    insufficientBalance: 'رصيد غير كافٍ',
  },
  fr: {
    selectPayment: 'Sélectionnez le mode de paiement',
    selectPaymentDesc: 'Choisissez comment vous souhaitez payer votre rendez-vous',
    edahabia: 'EDAHABIA / Baridi Mob',
    edahabiaDesc: 'Eddahabia, Visa, Mastercard — détection automatique',
    cib: 'Carte bancaire CIB',
    cibDesc: 'Visa, Mastercard (SATIM) — détection automatique',
    flexy: 'Flexy (Djezzy)',
    flexyDesc: 'Payez avec crédit mobile Djezzy',
    mobilis: 'Mobilis',
    mobilisDesc: 'Payez avec crédit mobile Mobilis',
    ooredoo: 'Ooredoo',
    ooredooDesc: 'Payez avec crédit mobile Ooredoo',
    cash: 'Espèces à la clinique',
    cashDesc: 'Payez en personne à votre arrivée',
    wallet: 'Payer depuis la portefeuille',
    walletDesc: 'Prélèvement du dépôt sur votre solde',
    walletBalance: 'Solde',
    insufficientBalance: 'Solde insuffisant',
    total: 'Total',
    chifaDiscount: 'Réduction Chifa',
    youPay: 'Vous payez',
    securePayment: 'Paiement sécurisé par Chargily',
    proceed: 'Procéder au paiement',
    payAtClinic: 'Confirmer le rendez-vous',
    popular: 'Populaire',
    recommended: 'Recommandé',
    loginRequired: 'Connexion requise',
    loginToUseWallet: 'Connectez-vous pour utiliser le portefeuille',
    signIn: 'Se connecter',
    depositInfo: 'Ceci est un dépôt pour confirmer votre réservation. Il sera déduit de votre facture finale.',
    walletEmpty: 'Votre portefeuille est vide',
    frozenDeposits: 'Gelé en dépôts',
  },
}

export function PaymentMethodSelector({
  amount,
  discount = 0,
  onPaymentMethodSelect,
  onProceed,
  isLoading = false,
  disabled = false,
  hasChifaCard = false,
  selectedMethod: selectedMethodProp,
  onMethodChange,
  walletBalance = null,
  isLoggedIn = false,
  hideSubmitButton = false,
  pendingTopUpAmount = 0,
  frozenDeposits = 0,
}: PaymentMethodSelectorProps) {
  const { language, dir } = useLanguage()
  const l = labels[language] || labels.en
  const [internalMethod, setInternalMethod] = useState<PaymentMethodType>('cash')
  const selectedMethod = selectedMethodProp ?? internalMethod
  const setSelectedMethod = (method: PaymentMethodType) => {
    if (selectedMethodProp === undefined) setInternalMethod(method)
    onPaymentMethodSelect(method)
    onMethodChange?.(method)
  }

  const finalAmount = amount - discount
  const hasInsufficientBalance = selectedMethod === 'wallet' && walletBalance != null && walletBalance < finalAmount
  const walletIsEmpty = walletBalance !== null && walletBalance === 0
  const availableBalance = walletBalance ?? 0
  const difference = finalAmount - availableBalance

  const handleMethodChange = (value: string) => {
    setSelectedMethod(value as PaymentMethodType)
  }

  const paymentMethods = [
    {
      id: 'cash',
      name: l.cash,
      description: l.cashDesc,
      icon: <Banknote className="h-6 w-6 text-green-600" />,
      badge: l.recommended,
      badgeColor: 'bg-green-100 text-green-800',
    },
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
    ...(isLoggedIn
      ? [
          {
            id: 'wallet' as const,
            name: `${l.wallet}${walletBalance != null ? ` (${l.walletBalance}: ${walletBalance.toLocaleString()} DZD)` : ''}`,
            description: hasInsufficientBalance 
              ? `${l.insufficientBalance} — ${l.walletBalance}: ${availableBalance.toLocaleString()} DZD`
              : walletIsEmpty 
                ? l.walletEmpty
                : l.walletDesc,
            icon: <Wallet className={`h-6 w-6 ${hasInsufficientBalance || walletIsEmpty ? 'text-amber-500' : 'text-primary'}`} />,
            badge: hasInsufficientBalance ? l.insufficientBalance : null,
            badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
            disabled: walletIsEmpty,
          },
        ]
      : []),
  ]

  return (
    <Card dir={dir}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          {l.selectPayment}
        </CardTitle>
        <CardDescription className="text-sm">{l.selectPaymentDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Methods — compact grid */}
        <RadioGroup
          value={selectedMethod}
          onValueChange={handleMethodChange}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {paymentMethods.filter((m) => !m.hidden).map((method) => (
            <div key={method.id}>
              <Label
                htmlFor={method.id}
                className={`flex items-center gap-3 py-3 px-4 border rounded-lg cursor-pointer transition-all ${
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value={method.id} id={method.id} className="shrink-0" />
                <div className="flex-shrink-0 size-9 flex items-center justify-center [&>svg]:size-5 [&>img]:size-7 [&>img]:rounded">{method.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">{method.name}</span>
                    {method.badge && (
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${method.badgeColor}`}>
                        {method.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 break-words">{method.description}</p>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Price Summary */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
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
          <div className="flex justify-between font-semibold text-base pt-1.5 border-t mt-1.5">
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

        {/* Pending top-up notice */}
        {pendingTopUpAmount > 0 && (
          <PendingTopUpNotice pendingAmount={pendingTopUpAmount} />
        )}

        {/* Insufficient balance warning with top-up prompt */}
        {selectedMethod === 'wallet' && hasInsufficientBalance && !walletIsEmpty && (
          <InsufficientBalanceWarning required={finalAmount} available={availableBalance} />
        )}

        {/* Empty wallet warning */}
        {selectedMethod === 'wallet' && walletIsEmpty && (
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-200 dark:bg-amber-800 p-2">
                <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">{l.walletEmpty}</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {language === 'ar' ? 'أضف رصيداً لمحفظتك للدفع بها' 
                    : language === 'fr' ? 'Ajoutez des fonds à votre portefeuille pour payer'
                    : 'Add funds to your wallet to pay with it'}
                </p>
                <Link href="/dashboard/wallet" className="mt-3 inline-block">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                    <Wallet className="h-4 w-4" />
                    {language === 'ar' ? 'شحن الآن' : language === 'fr' ? 'Recharger' : 'Top up now'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Login required for wallet */}
        {!isLoggedIn && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
            <div className="flex items-start gap-3">
              <LogIn className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">{l.loginRequired}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{l.loginToUseWallet}</p>
                <Link href="/login" className="mt-2 inline-block">
                  <Button size="sm" variant="outline" className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-100">
                    <LogIn className="h-4 w-4" />
                    {l.signIn}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Deposit info */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{l.depositInfo}</span>
        </div>

        {/* Confirm Button - single full-width confirm; light neon green in dark mode only */}
        {!hideSubmitButton && (
          <Button
            type={onProceed ? 'button' : 'submit'}
            onClick={onProceed ?? undefined}
            disabled={isLoading || disabled || hasInsufficientBalance}
            className="w-full h-10 text-sm dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-white dark:border-emerald-500"
            size="default"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
              </>
            ) : selectedMethod === 'cash' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {l.payAtClinic}
              </>
            ) : selectedMethod === 'wallet' ? (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                {l.payAtClinic}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {l.proceed}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

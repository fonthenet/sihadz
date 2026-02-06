'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  detectCardType,
  formatCardNumber as formatCard,
  type DetectedCardType,
  type CardDetectionResult,
} from '@/lib/payment/card-detection'
import { CreditCard } from 'lucide-react'

const CARD_LABELS: Record<string, { en: string; fr: string; ar: string }> = {
  cardEddahabia: { en: 'Eddahabia', fr: 'Eddahabia', ar: 'الذهبية' },
  cardCibVisa: { en: 'CIB Visa', fr: 'CIB Visa', ar: 'CIB فيزا' },
  cardCibMastercard: { en: 'CIB Mastercard', fr: 'CIB Mastercard', ar: 'CIB ماستركارد' },
  cardVisa: { en: 'Visa', fr: 'Visa', ar: 'فيزا' },
  cardMastercard: { en: 'Mastercard', fr: 'Mastercard', ar: 'ماستركارد' },
  cardAmex: { en: 'American Express', fr: 'American Express', ar: 'أمريكان إكسبريس' },
  cardDiscover: { en: 'Discover', fr: 'Discover', ar: 'ديسكفر' },
  cardUnknown: { en: 'Card', fr: 'Carte', ar: 'بطاقة' },
}

export interface CardInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  /** Current payment method - if mismatch, show suggestion */
  selectedPaymentMethod?: 'cib' | 'edahabia'
  onPaymentMethodSuggestion?: (method: 'cib' | 'edahabia') => void
  language?: 'en' | 'fr' | 'ar'
  id?: string
  className?: string
}

export function CardInput({
  value,
  onChange,
  label,
  placeholder = 'XXXX XXXX XXXX XXXX',
  selectedPaymentMethod,
  onPaymentMethodSuggestion,
  language = 'en',
  id = 'card-number',
  className,
}: CardInputProps) {
  const detection = useMemo(() => detectCardType(value), [value])
  const formatted = useMemo(() => formatCard(value), [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const formatted = formatCard(raw)
    onChange(formatted)
  }

  const labelText = CARD_LABELS[detection.labelKey]?.[language] ?? CARD_LABELS.cardUnknown[language]
  const showSuggestion =
    onPaymentMethodSuggestion &&
    selectedPaymentMethod &&
    detection.suggestedPaymentMethod &&
    detection.suggestedPaymentMethod !== selectedPaymentMethod &&
    detection.isAlgerianCompatible

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {label && (
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
        )}
        {detection.type !== 'unknown' && (
          <CardTypeBadge detection={detection} language={language} />
        )}
      </div>
      <div className="relative">
        <Input
          id={id}
          value={formatted}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={19}
          dir="ltr"
          className="pr-10 font-mono tracking-wider"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <CardTypeIcon type={detection.type} />
        </div>
      </div>
      {showSuggestion && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          {language === 'ar'
            ? `بطاقة ${labelText} — استخدم طريقة الدفع المناسبة`
            : language === 'fr'
            ? `Carte ${labelText} détectée — utilisez le mode de paiement approprié`
            : `${labelText} card detected — use the matching payment method`}
          {' '}
          <button
            type="button"
            onClick={() => onPaymentMethodSuggestion?.(detection.suggestedPaymentMethod!)}
            className="underline font-medium hover:no-underline"
          >
            {detection.suggestedPaymentMethod === 'edahabia'
              ? (language === 'ar' ? 'الذهبية' : language === 'fr' ? 'Eddahabia' : 'Eddahabia')
              : (language === 'ar' ? 'CIB' : 'CIB')}
          </button>
        </p>
      )}
    </div>
  )
}

function CardTypeBadge({ detection, language }: { detection: CardDetectionResult; language: string }) {
  const label = CARD_LABELS[detection.labelKey]?.[language as keyof typeof CARD_LABELS.cardEddahabia] ?? detection.labelKey
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] px-1.5 py-0 ${
        detection.type === 'eddahabia'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
          : detection.type.startsWith('cib_')
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </Badge>
  )
}

function CardTypeIcon({ type }: { type: DetectedCardType }) {
  if (type === 'eddahabia') {
    return (
      <Image src="/payment-logos/edahabia.jpg" alt="Eddahabia" width={24} height={24} className="rounded" />
    )
  }
  if (type === 'cib_visa' || type === 'cib_mastercard') {
    return (
      <Image src="/payment-logos/cib.jpg" alt="CIB" width={24} height={24} className="rounded" />
    )
  }
  return <CreditCard className="h-5 w-5" />
}

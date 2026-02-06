'use client'

import { AlertCircle, AlertTriangle, Info, Wallet, LogIn, RefreshCw, MessageCircle, ArrowRight, Clock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/language-context'
import { PaymentError, formatPaymentError } from '@/lib/payment/validation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PaymentErrorAlertProps {
  error: PaymentError
  onAction?: () => void
  onDismiss?: () => void
  className?: string
  compact?: boolean
}

export function PaymentErrorAlert({ 
  error, 
  onAction, 
  onDismiss,
  className,
  compact = false
}: PaymentErrorAlertProps) {
  const { language } = useLanguage()
  const lang = (language === 'en' || language === 'fr' || language === 'ar' ? language : 'en') as 'en' | 'fr' | 'ar'
  
  const message = formatPaymentError(error, lang)
  
  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
    }
  }
  
  const getActionIcon = () => {
    if (!error.action) return null
    switch (error.action.type) {
      case 'login':
        return <LogIn className="h-4 w-4" />
      case 'topup':
        return <Wallet className="h-4 w-4" />
      case 'retry':
        return <RefreshCw className="h-4 w-4" />
      case 'contact':
        return <MessageCircle className="h-4 w-4" />
      case 'wait':
        return <Clock className="h-4 w-4" />
      default:
        return <ArrowRight className="h-4 w-4" />
    }
  }
  
  const getActionHref = () => {
    if (!error.action) return null
    switch (error.action.type) {
      case 'login':
        return '/login'
      case 'topup':
        return '/dashboard/wallet'
      case 'contact':
        return '/contact'
      default:
        return null
    }
  }
  
  const variantClasses = {
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200'
  }
  
  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        variantClasses[error.severity],
        className
      )}>
        {getIcon()}
        <span className="flex-1">{message}</span>
        {error.action && (
          getActionHref() ? (
            <Link href={getActionHref()!}>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                {getActionIcon()}
                <span className="ml-1">{error.action.label[lang]}</span>
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAction}>
              {getActionIcon()}
              <span className="ml-1">{error.action.label[lang]}</span>
            </Button>
          )
        )}
      </div>
    )
  }
  
  return (
    <Alert className={cn(variantClasses[error.severity], className)}>
      {getIcon()}
      <AlertTitle className="font-medium">
        {error.severity === 'error' 
          ? (lang === 'ar' ? 'خطأ' : lang === 'fr' ? 'Erreur' : 'Error')
          : error.severity === 'warning'
            ? (lang === 'ar' ? 'تنبيه' : lang === 'fr' ? 'Attention' : 'Warning')
            : (lang === 'ar' ? 'معلومة' : lang === 'fr' ? 'Information' : 'Info')
        }
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        
        {error.details && (error.details.required || error.details.available !== undefined) && (
          <div className="mt-2 text-sm opacity-90">
            {error.details.required && (
              <p>{lang === 'ar' ? 'المطلوب' : lang === 'fr' ? 'Requis' : 'Required'}: {error.details.required.toLocaleString()} DZD</p>
            )}
            {error.details.available !== undefined && (
              <p>{lang === 'ar' ? 'المتاح' : lang === 'fr' ? 'Disponible' : 'Available'}: {error.details.available.toLocaleString()} DZD</p>
            )}
            {error.details.difference && (
              <p className="font-medium">{lang === 'ar' ? 'الفرق' : lang === 'fr' ? 'Différence' : 'Difference'}: {error.details.difference.toLocaleString()} DZD</p>
            )}
          </div>
        )}
        
        {error.action && (
          <div className="mt-3">
            {getActionHref() ? (
              <Link href={getActionHref()!}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  {getActionIcon()}
                  {error.action.label[lang]}
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onAction}>
                {getActionIcon()}
                {error.action.label[lang]}
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Inline insufficient balance warning
 */
interface InsufficientBalanceWarningProps {
  required: number
  available: number
  className?: string
}

export function InsufficientBalanceWarning({ required, available, className }: InsufficientBalanceWarningProps) {
  const { language } = useLanguage()
  const lang = (language === 'en' || language === 'fr' || language === 'ar' ? language : 'en') as 'en' | 'fr' | 'ar'
  const difference = required - available
  
  const labels = {
    en: {
      insufficientBalance: 'Insufficient wallet balance',
      youNeed: 'You need',
      moreToBook: 'more to complete this booking',
      currentBalance: 'Current balance',
      required: 'Required deposit',
      topUpNow: 'Top up now'
    },
    fr: {
      insufficientBalance: 'Solde insuffisant',
      youNeed: 'Il vous manque',
      moreToBook: 'pour finaliser cette réservation',
      currentBalance: 'Solde actuel',
      required: 'Dépôt requis',
      topUpNow: 'Recharger maintenant'
    },
    ar: {
      insufficientBalance: 'رصيد غير كافٍ',
      youNeed: 'تحتاج',
      moreToBook: 'لإتمام هذا الحجز',
      currentBalance: 'الرصيد الحالي',
      required: 'العربون المطلوب',
      topUpNow: 'شحن الآن'
    }
  }
  
  const t = labels[lang]
  
  return (
    <div className={cn(
      'rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-200 dark:bg-amber-800 p-2">
          <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200">{t.insufficientBalance}</h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {t.youNeed} <strong>{difference.toLocaleString()} DZD</strong> {t.moreToBook}
          </p>
          
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-amber-100 dark:bg-amber-900/50 rounded px-2 py-1">
              <span className="text-amber-600 dark:text-amber-400">{t.currentBalance}:</span>
              <span className="font-medium text-amber-800 dark:text-amber-200 ml-1">{available.toLocaleString()} DZD</span>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/50 rounded px-2 py-1">
              <span className="text-amber-600 dark:text-amber-400">{t.required}:</span>
              <span className="font-medium text-amber-800 dark:text-amber-200 ml-1">{required.toLocaleString()} DZD</span>
            </div>
          </div>
          
          <Link href="/dashboard/wallet" className="mt-3 inline-block">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
              <Wallet className="h-4 w-4" />
              {t.topUpNow}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Pending top-up notice
 */
interface PendingTopUpNoticeProps {
  pendingAmount: number
  className?: string
}

export function PendingTopUpNotice({ pendingAmount, className }: PendingTopUpNoticeProps) {
  const { language } = useLanguage()
  const lang = (language === 'en' || language === 'fr' || language === 'ar' ? language : 'en') as 'en' | 'fr' | 'ar'
  
  const labels = {
    en: {
      pendingTopUp: 'Pending top-up',
      youHave: 'You have a pending top-up of',
      waitingApproval: 'waiting for approval. This will be added to your balance once approved.',
      checkStatus: 'Check status'
    },
    fr: {
      pendingTopUp: 'Rechargement en attente',
      youHave: 'Vous avez un rechargement en attente de',
      waitingApproval: 'en attente d\'approbation. Ce montant sera ajouté à votre solde une fois approuvé.',
      checkStatus: 'Vérifier le statut'
    },
    ar: {
      pendingTopUp: 'شحن قيد الانتظار',
      youHave: 'لديك طلب شحن بمبلغ',
      waitingApproval: 'في انتظار الموافقة. سيتم إضافته لرصيدك بعد الموافقة.',
      checkStatus: 'التحقق من الحالة'
    }
  }
  
  const t = labels[lang]
  
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3',
      className
    )}>
      <Clock className="h-5 w-5 text-blue-600 shrink-0 animate-pulse" />
      <div className="flex-1 text-sm">
        <span className="font-medium text-blue-800 dark:text-blue-200">{t.pendingTopUp}: </span>
        <span className="text-blue-700 dark:text-blue-300">
          {t.youHave} <strong>{pendingAmount.toLocaleString()} DZD</strong> {t.waitingApproval}
        </span>
      </div>
      <Link href="/dashboard/wallet">
        <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100">
          {t.checkStatus}
        </Button>
      </Link>
    </div>
  )
}

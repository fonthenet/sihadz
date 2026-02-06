'use client'

import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/language-context'

/**
 * Payment notification messages for all scenarios
 */
const messages = {
  // Wallet notifications
  topUpRequested: {
    en: { title: 'Top-up Request Sent', description: 'Your request has been submitted. It will be processed soon.' },
    fr: { title: 'Demande de rechargement envoyée', description: 'Votre demande a été soumise. Elle sera traitée prochainement.' },
    ar: { title: 'تم إرسال طلب الشحن', description: 'تم إرسال طلبك. سيتم معالجته قريباً.' }
  },
  topUpApproved: {
    en: { title: 'Top-up Approved!', description: 'Your wallet has been credited with {amount} DZD.' },
    fr: { title: 'Rechargement approuvé!', description: 'Votre portefeuille a été crédité de {amount} DZD.' },
    ar: { title: 'تمت الموافقة على الشحن!', description: 'تمت إضافة {amount} دج لمحفظتك.' }
  },
  topUpRejected: {
    en: { title: 'Top-up Rejected', description: 'Your top-up request was not approved. Please check details.' },
    fr: { title: 'Rechargement refusé', description: 'Votre demande de rechargement n\'a pas été approuvée.' },
    ar: { title: 'تم رفض طلب الشحن', description: 'لم تتم الموافقة على طلب الشحن. يرجى التحقق من التفاصيل.' }
  },

  // Booking notifications
  bookingConfirmed: {
    en: { title: 'Booking Confirmed!', description: 'Your appointment has been confirmed. Ticket: {ticket}' },
    fr: { title: 'Réservation confirmée!', description: 'Votre rendez-vous a été confirmé. Ticket: {ticket}' },
    ar: { title: 'تم تأكيد الحجز!', description: 'تم تأكيد موعدك. رقم التذكرة: {ticket}' }
  },
  bookingCancelled: {
    en: { title: 'Booking Cancelled', description: 'Your appointment has been cancelled.' },
    fr: { title: 'Réservation annulée', description: 'Votre rendez-vous a été annulé.' },
    ar: { title: 'تم إلغاء الحجز', description: 'تم إلغاء موعدك.' }
  },
  bookingFailed: {
    en: { title: 'Booking Failed', description: 'Could not complete your booking. Please try again.' },
    fr: { title: 'Échec de la réservation', description: 'Impossible de finaliser votre réservation. Veuillez réessayer.' },
    ar: { title: 'فشل الحجز', description: 'تعذر إتمام حجزك. يرجى المحاولة مرة أخرى.' }
  },

  // Deposit notifications
  depositPaid: {
    en: { title: 'Deposit Paid', description: '{amount} DZD deposit has been deducted from your wallet.' },
    fr: { title: 'Dépôt payé', description: 'Un dépôt de {amount} DZD a été prélevé de votre portefeuille.' },
    ar: { title: 'تم دفع العربون', description: 'تم خصم {amount} دج من محفظتك.' }
  },
  depositFrozen: {
    en: { title: 'Deposit Frozen', description: '{amount} DZD is held for your upcoming appointment.' },
    fr: { title: 'Dépôt gelé', description: '{amount} DZD sont réservés pour votre rendez-vous.' },
    ar: { title: 'العربون مجمد', description: 'تم حجز {amount} دج لموعدك القادم.' }
  },

  // Refund notifications
  fullRefund: {
    en: { title: 'Full Refund', description: '{amount} DZD has been refunded to your wallet (100%).' },
    fr: { title: 'Remboursement total', description: '{amount} DZD ont été remboursés sur votre portefeuille (100%).' },
    ar: { title: 'استرداد كامل', description: 'تم استرداد {amount} دج لمحفظتك (100%).' }
  },
  partialRefund: {
    en: { title: 'Partial Refund', description: '{amount} DZD has been refunded (50%). {forfeit} DZD was forfeited due to late cancellation.' },
    fr: { title: 'Remboursement partiel', description: '{amount} DZD ont été remboursés (50%). {forfeit} DZD perdus pour annulation tardive.' },
    ar: { title: 'استرداد جزئي', description: 'تم استرداد {amount} دج (50%). تمت مصادرة {forfeit} دج بسبب الإلغاء المتأخر.' }
  },
  noRefund: {
    en: { title: 'No Refund', description: 'Cancellation within 24 hours. Your {amount} DZD deposit has been forfeited.' },
    fr: { title: 'Pas de remboursement', description: 'Annulation dans les 24h. Votre dépôt de {amount} DZD a été perdu.' },
    ar: { title: 'لا استرداد', description: 'إلغاء خلال 24 ساعة. تمت مصادرة العربون {amount} دج.' }
  },
  providerRefund: {
    en: { title: 'Full Refund', description: 'Provider cancelled. {amount} DZD has been refunded to your wallet.' },
    fr: { title: 'Remboursement total', description: 'Annulation par le prestataire. {amount} DZD ont été remboursés.' },
    ar: { title: 'استرداد كامل', description: 'ألغى مقدم الخدمة. تم استرداد {amount} دج لمحفظتك.' }
  },

  // Payment notifications
  paymentSuccess: {
    en: { title: 'Payment Successful', description: 'Your payment of {amount} DZD has been processed.' },
    fr: { title: 'Paiement réussi', description: 'Votre paiement de {amount} DZD a été traité.' },
    ar: { title: 'تم الدفع بنجاح', description: 'تمت معالجة دفعتك بمبلغ {amount} دج.' }
  },
  paymentFailed: {
    en: { title: 'Payment Failed', description: 'Your payment could not be processed. Please try again.' },
    fr: { title: 'Échec du paiement', description: 'Votre paiement n\'a pas pu être traité. Veuillez réessayer.' },
    ar: { title: 'فشل الدفع', description: 'تعذر معالجة دفعتك. يرجى المحاولة مرة أخرى.' }
  },

  // Balance notifications
  lowBalance: {
    en: { title: 'Low Balance', description: 'Your wallet balance is low ({balance} DZD). Consider topping up.' },
    fr: { title: 'Solde faible', description: 'Votre solde est faible ({balance} DZD). Pensez à recharger.' },
    ar: { title: 'رصيد منخفض', description: 'رصيد محفظتك منخفض ({balance} دج). فكر في الشحن.' }
  },
  insufficientBalance: {
    en: { title: 'Insufficient Balance', description: 'You need {difference} DZD more. Please top up your wallet.' },
    fr: { title: 'Solde insuffisant', description: 'Il vous manque {difference} DZD. Veuillez recharger.' },
    ar: { title: 'رصيد غير كافٍ', description: 'تحتاج {difference} دج إضافية. يرجى شحن المحفظة.' }
  },

  // Error notifications
  networkError: {
    en: { title: 'Connection Error', description: 'Please check your internet connection and try again.' },
    fr: { title: 'Erreur de connexion', description: 'Vérifiez votre connexion internet et réessayez.' },
    ar: { title: 'خطأ في الاتصال', description: 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.' }
  },
  sessionExpired: {
    en: { title: 'Session Expired', description: 'Please sign in again to continue.' },
    fr: { title: 'Session expirée', description: 'Veuillez vous reconnecter pour continuer.' },
    ar: { title: 'انتهت الجلسة', description: 'يرجى تسجيل الدخول مرة أخرى للمتابعة.' }
  }
}

type NotificationType = keyof typeof messages

/**
 * Hook for showing payment-related notifications
 */
export function usePaymentNotifications() {
  const { toast } = useToast()
  const { language } = useLanguage()
  const lang = (language === 'en' || language === 'fr' || language === 'ar' ? language : 'en') as 'en' | 'fr' | 'ar'

  const notify = (
    type: NotificationType,
    variant: 'default' | 'destructive' = 'default',
    params: Record<string, string | number> = {}
  ) => {
    const msg = messages[type][lang]
    let title = msg.title
    let description = msg.description

    // Replace placeholders
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      title = title.replace(placeholder, String(value))
      description = description.replace(placeholder, String(value))
    })

    toast({
      title,
      description,
      variant
    })
  }

  return {
    // Wallet
    notifyTopUpRequested: () => notify('topUpRequested'),
    notifyTopUpApproved: (amount: number) => notify('topUpApproved', 'default', { amount: amount.toLocaleString() }),
    notifyTopUpRejected: () => notify('topUpRejected', 'destructive'),

    // Booking
    notifyBookingConfirmed: (ticket: string) => notify('bookingConfirmed', 'default', { ticket }),
    notifyBookingCancelled: () => notify('bookingCancelled'),
    notifyBookingFailed: () => notify('bookingFailed', 'destructive'),

    // Deposit
    notifyDepositPaid: (amount: number) => notify('depositPaid', 'default', { amount: amount.toLocaleString() }),
    notifyDepositFrozen: (amount: number) => notify('depositFrozen', 'default', { amount: amount.toLocaleString() }),

    // Refund
    notifyFullRefund: (amount: number) => notify('fullRefund', 'default', { amount: amount.toLocaleString() }),
    notifyPartialRefund: (amount: number, forfeit: number) => 
      notify('partialRefund', 'default', { amount: amount.toLocaleString(), forfeit: forfeit.toLocaleString() }),
    notifyNoRefund: (amount: number) => notify('noRefund', 'destructive', { amount: amount.toLocaleString() }),
    notifyProviderRefund: (amount: number) => notify('providerRefund', 'default', { amount: amount.toLocaleString() }),

    // Payment
    notifyPaymentSuccess: (amount: number) => notify('paymentSuccess', 'default', { amount: amount.toLocaleString() }),
    notifyPaymentFailed: () => notify('paymentFailed', 'destructive'),

    // Balance
    notifyLowBalance: (balance: number) => notify('lowBalance', 'default', { balance: balance.toLocaleString() }),
    notifyInsufficientBalance: (difference: number) => 
      notify('insufficientBalance', 'destructive', { difference: difference.toLocaleString() }),

    // Errors
    notifyNetworkError: () => notify('networkError', 'destructive'),
    notifySessionExpired: () => notify('sessionExpired', 'destructive'),

    // Generic
    notify
  }
}

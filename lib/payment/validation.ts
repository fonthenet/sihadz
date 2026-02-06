/**
 * Payment Validation & Error Handling
 * Covers all payment scenarios with clear error messages
 */

export type PaymentErrorCode =
  // Wallet errors
  | 'WALLET_NOT_FOUND'
  | 'WALLET_ZERO_BALANCE'
  | 'WALLET_INSUFFICIENT_BALANCE'
  | 'WALLET_FROZEN'
  | 'WALLET_SUSPENDED'
  // Deposit errors
  | 'DEPOSIT_BELOW_MINIMUM'
  | 'DEPOSIT_ABOVE_MAXIMUM'
  | 'DEPOSIT_ALREADY_PAID'
  | 'DEPOSIT_NOT_FOUND'
  | 'DEPOSIT_ALREADY_REFUNDED'
  | 'DEPOSIT_FORFEITED'
  // Top-up errors
  | 'TOPUP_PENDING'
  | 'TOPUP_REJECTED'
  | 'TOPUP_MINIMUM_AMOUNT'
  // Booking errors
  | 'BOOKING_REQUIRES_AUTH'
  | 'BOOKING_REQUIRES_DEPOSIT'
  | 'BOOKING_SLOT_TAKEN'
  | 'BOOKING_PROVIDER_UNAVAILABLE'
  | 'BOOKING_DATE_PASSED'
  | 'BOOKING_DUPLICATE'
  // Refund errors
  | 'REFUND_NOT_ELIGIBLE'
  | 'REFUND_ALREADY_PROCESSED'
  | 'REFUND_LATE_CANCELLATION'
  // System errors
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'RATE_LIMITED'
  | 'SYSTEM_ERROR'

export interface PaymentError {
  code: PaymentErrorCode
  message: {
    en: string
    fr: string
    ar: string
  }
  severity: 'error' | 'warning' | 'info'
  action?: {
    type: 'login' | 'topup' | 'retry' | 'contact' | 'choose_other' | 'wait'
    label: { en: string; fr: string; ar: string }
  }
  details?: {
    required?: number
    available?: number
    difference?: number
    pendingAmount?: number
    minimumAmount?: number
    maximumAmount?: number
  }
}

export const PAYMENT_ERRORS: Record<PaymentErrorCode, PaymentError> = {
  // Wallet errors
  WALLET_NOT_FOUND: {
    code: 'WALLET_NOT_FOUND',
    message: {
      en: 'No wallet found. Please create an account to use wallet payments.',
      fr: 'Aucun portefeuille trouvé. Veuillez créer un compte pour utiliser les paiements par portefeuille.',
      ar: 'لم يتم العثور على محفظة. يرجى إنشاء حساب لاستخدام المحفظة للدفع.'
    },
    severity: 'error',
    action: { type: 'login', label: { en: 'Sign up', fr: 'S\'inscrire', ar: 'التسجيل' } }
  },
  WALLET_ZERO_BALANCE: {
    code: 'WALLET_ZERO_BALANCE',
    message: {
      en: 'Your wallet is empty. Please add funds to continue.',
      fr: 'Votre portefeuille est vide. Veuillez ajouter des fonds pour continuer.',
      ar: 'محفظتك فارغة. يرجى إضافة رصيد للمتابعة.'
    },
    severity: 'warning',
    action: { type: 'topup', label: { en: 'Add funds', fr: 'Ajouter des fonds', ar: 'إضافة رصيد' } }
  },
  WALLET_INSUFFICIENT_BALANCE: {
    code: 'WALLET_INSUFFICIENT_BALANCE',
    message: {
      en: 'Insufficient balance. You need {difference} DZD more to complete this booking.',
      fr: 'Solde insuffisant. Il vous manque {difference} DZD pour finaliser cette réservation.',
      ar: 'رصيد غير كافٍ. تحتاج {difference} دج إضافية لإتمام هذا الحجز.'
    },
    severity: 'warning',
    action: { type: 'topup', label: { en: 'Top up now', fr: 'Recharger maintenant', ar: 'شحن الآن' } }
  },
  WALLET_FROZEN: {
    code: 'WALLET_FROZEN',
    message: {
      en: 'Your wallet is temporarily frozen. Please contact support.',
      fr: 'Votre portefeuille est temporairement gelé. Veuillez contacter le support.',
      ar: 'محفظتك مجمدة مؤقتاً. يرجى الاتصال بالدعم.'
    },
    severity: 'error',
    action: { type: 'contact', label: { en: 'Contact support', fr: 'Contacter le support', ar: 'اتصل بالدعم' } }
  },
  WALLET_SUSPENDED: {
    code: 'WALLET_SUSPENDED',
    message: {
      en: 'Your wallet has been suspended. Please contact support for assistance.',
      fr: 'Votre portefeuille a été suspendu. Veuillez contacter le support pour assistance.',
      ar: 'تم تعليق محفظتك. يرجى الاتصال بالدعم للمساعدة.'
    },
    severity: 'error',
    action: { type: 'contact', label: { en: 'Contact support', fr: 'Contacter le support', ar: 'اتصل بالدعم' } }
  },

  // Deposit errors
  DEPOSIT_BELOW_MINIMUM: {
    code: 'DEPOSIT_BELOW_MINIMUM',
    message: {
      en: 'Deposit amount is below the minimum of {minimumAmount} DZD.',
      fr: 'Le montant du dépôt est inférieur au minimum de {minimumAmount} DZD.',
      ar: 'مبلغ العربون أقل من الحد الأدنى {minimumAmount} دج.'
    },
    severity: 'error'
  },
  DEPOSIT_ABOVE_MAXIMUM: {
    code: 'DEPOSIT_ABOVE_MAXIMUM',
    message: {
      en: 'Deposit amount exceeds the maximum of {maximumAmount} DZD.',
      fr: 'Le montant du dépôt dépasse le maximum de {maximumAmount} DZD.',
      ar: 'مبلغ العربون يتجاوز الحد الأقصى {maximumAmount} دج.'
    },
    severity: 'error'
  },
  DEPOSIT_ALREADY_PAID: {
    code: 'DEPOSIT_ALREADY_PAID',
    message: {
      en: 'A deposit has already been paid for this appointment.',
      fr: 'Un dépôt a déjà été payé pour ce rendez-vous.',
      ar: 'تم دفع العربون لهذا الموعد بالفعل.'
    },
    severity: 'info'
  },
  DEPOSIT_NOT_FOUND: {
    code: 'DEPOSIT_NOT_FOUND',
    message: {
      en: 'No deposit found for this appointment.',
      fr: 'Aucun dépôt trouvé pour ce rendez-vous.',
      ar: 'لم يتم العثور على عربون لهذا الموعد.'
    },
    severity: 'warning'
  },
  DEPOSIT_ALREADY_REFUNDED: {
    code: 'DEPOSIT_ALREADY_REFUNDED',
    message: {
      en: 'This deposit has already been refunded.',
      fr: 'Ce dépôt a déjà été remboursé.',
      ar: 'تم استرداد هذا العربون بالفعل.'
    },
    severity: 'info'
  },
  DEPOSIT_FORFEITED: {
    code: 'DEPOSIT_FORFEITED',
    message: {
      en: 'This deposit was forfeited due to late cancellation or no-show.',
      fr: 'Ce dépôt a été perdu en raison d\'une annulation tardive ou d\'une absence.',
      ar: 'تم مصادرة هذا العربون بسبب الإلغاء المتأخر أو عدم الحضور.'
    },
    severity: 'warning'
  },

  // Top-up errors
  TOPUP_PENDING: {
    code: 'TOPUP_PENDING',
    message: {
      en: 'You have a pending top-up request of {pendingAmount} DZD. It will be processed soon.',
      fr: 'Vous avez une demande de rechargement en attente de {pendingAmount} DZD. Elle sera traitée prochainement.',
      ar: 'لديك طلب شحن قيد الانتظار بمبلغ {pendingAmount} دج. سيتم معالجته قريباً.'
    },
    severity: 'info',
    action: { type: 'wait', label: { en: 'Check status', fr: 'Vérifier le statut', ar: 'التحقق من الحالة' } }
  },
  TOPUP_REJECTED: {
    code: 'TOPUP_REJECTED',
    message: {
      en: 'Your recent top-up request was rejected. Please check the details and try again.',
      fr: 'Votre dernière demande de rechargement a été rejetée. Veuillez vérifier les détails et réessayer.',
      ar: 'تم رفض طلب الشحن الأخير. يرجى التحقق من التفاصيل والمحاولة مرة أخرى.'
    },
    severity: 'warning',
    action: { type: 'topup', label: { en: 'Try again', fr: 'Réessayer', ar: 'حاول مرة أخرى' } }
  },
  TOPUP_MINIMUM_AMOUNT: {
    code: 'TOPUP_MINIMUM_AMOUNT',
    message: {
      en: 'Minimum top-up amount is {minimumAmount} DZD.',
      fr: 'Le montant minimum de rechargement est de {minimumAmount} DZD.',
      ar: 'الحد الأدنى للشحن هو {minimumAmount} دج.'
    },
    severity: 'error'
  },

  // Booking errors
  BOOKING_REQUIRES_AUTH: {
    code: 'BOOKING_REQUIRES_AUTH',
    message: {
      en: 'Please sign in or create an account to book an appointment.',
      fr: 'Veuillez vous connecter ou créer un compte pour réserver un rendez-vous.',
      ar: 'يرجى تسجيل الدخول أو إنشاء حساب لحجز موعد.'
    },
    severity: 'warning',
    action: { type: 'login', label: { en: 'Sign in', fr: 'Se connecter', ar: 'تسجيل الدخول' } }
  },
  BOOKING_REQUIRES_DEPOSIT: {
    code: 'BOOKING_REQUIRES_DEPOSIT',
    message: {
      en: 'A deposit of {required} DZD is required to confirm your booking.',
      fr: 'Un dépôt de {required} DZD est requis pour confirmer votre réservation.',
      ar: 'مطلوب عربون بقيمة {required} دج لتأكيد حجزك.'
    },
    severity: 'info'
  },
  BOOKING_SLOT_TAKEN: {
    code: 'BOOKING_SLOT_TAKEN',
    message: {
      en: 'This time slot is no longer available. Please choose another time.',
      fr: 'Ce créneau n\'est plus disponible. Veuillez choisir un autre horaire.',
      ar: 'هذا الموعد لم يعد متاحاً. يرجى اختيار وقت آخر.'
    },
    severity: 'error',
    action: { type: 'choose_other', label: { en: 'Choose another time', fr: 'Choisir un autre horaire', ar: 'اختر وقتاً آخر' } }
  },
  BOOKING_PROVIDER_UNAVAILABLE: {
    code: 'BOOKING_PROVIDER_UNAVAILABLE',
    message: {
      en: 'This provider is not available on the selected date. Please choose another date.',
      fr: 'Ce prestataire n\'est pas disponible à la date sélectionnée. Veuillez choisir une autre date.',
      ar: 'مقدم الخدمة غير متاح في التاريخ المحدد. يرجى اختيار تاريخ آخر.'
    },
    severity: 'error',
    action: { type: 'choose_other', label: { en: 'Choose another date', fr: 'Choisir une autre date', ar: 'اختر تاريخاً آخر' } }
  },
  BOOKING_DATE_PASSED: {
    code: 'BOOKING_DATE_PASSED',
    message: {
      en: 'The selected date/time has already passed. Please choose a future date.',
      fr: 'La date/heure sélectionnée est déjà passée. Veuillez choisir une date future.',
      ar: 'التاريخ/الوقت المحدد قد مضى. يرجى اختيار تاريخ مستقبلي.'
    },
    severity: 'error',
    action: { type: 'choose_other', label: { en: 'Choose new date', fr: 'Choisir nouvelle date', ar: 'اختر تاريخاً جديداً' } }
  },
  BOOKING_DUPLICATE: {
    code: 'BOOKING_DUPLICATE',
    message: {
      en: 'You already have a booking for this time slot.',
      fr: 'Vous avez déjà une réservation pour ce créneau.',
      ar: 'لديك حجز بالفعل لهذا الموعد.'
    },
    severity: 'warning'
  },

  // Refund errors
  REFUND_NOT_ELIGIBLE: {
    code: 'REFUND_NOT_ELIGIBLE',
    message: {
      en: 'This booking is not eligible for a refund.',
      fr: 'Cette réservation n\'est pas éligible au remboursement.',
      ar: 'هذا الحجز غير مؤهل للاسترداد.'
    },
    severity: 'warning'
  },
  REFUND_ALREADY_PROCESSED: {
    code: 'REFUND_ALREADY_PROCESSED',
    message: {
      en: 'A refund has already been processed for this booking.',
      fr: 'Un remboursement a déjà été effectué pour cette réservation.',
      ar: 'تم معالجة استرداد لهذا الحجز بالفعل.'
    },
    severity: 'info'
  },
  REFUND_LATE_CANCELLATION: {
    code: 'REFUND_LATE_CANCELLATION',
    message: {
      en: 'Cancellation within 24 hours of the appointment. No refund will be issued.',
      fr: 'Annulation dans les 24 heures précédant le rendez-vous. Aucun remboursement ne sera effectué.',
      ar: 'الإلغاء خلال 24 ساعة من الموعد. لن يتم إصدار استرداد.'
    },
    severity: 'warning'
  },

  // System errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: {
      en: 'Connection error. Please check your internet and try again.',
      fr: 'Erreur de connexion. Veuillez vérifier votre internet et réessayer.',
      ar: 'خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.'
    },
    severity: 'error',
    action: { type: 'retry', label: { en: 'Try again', fr: 'Réessayer', ar: 'حاول مرة أخرى' } }
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: {
      en: 'Your session has expired. Please sign in again.',
      fr: 'Votre session a expiré. Veuillez vous reconnecter.',
      ar: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.'
    },
    severity: 'warning',
    action: { type: 'login', label: { en: 'Sign in', fr: 'Se connecter', ar: 'تسجيل الدخول' } }
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: {
      en: 'Too many requests. Please wait a moment before trying again.',
      fr: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      ar: 'طلبات كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى.'
    },
    severity: 'warning',
    action: { type: 'wait', label: { en: 'Wait', fr: 'Patienter', ar: 'انتظر' } }
  },
  SYSTEM_ERROR: {
    code: 'SYSTEM_ERROR',
    message: {
      en: 'An unexpected error occurred. Please try again or contact support.',
      fr: 'Une erreur inattendue s\'est produite. Veuillez réessayer ou contacter le support.',
      ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.'
    },
    severity: 'error',
    action: { type: 'contact', label: { en: 'Contact support', fr: 'Contacter le support', ar: 'اتصل بالدعم' } }
  }
}

/**
 * Format error message with dynamic values
 */
export function formatPaymentError(
  error: PaymentError,
  lang: 'en' | 'fr' | 'ar' = 'en'
): string {
  let message = error.message[lang]
  
  if (error.details) {
    Object.entries(error.details).forEach(([key, value]) => {
      if (value !== undefined) {
        message = message.replace(`{${key}}`, value.toLocaleString())
      }
    })
  }
  
  return message
}

/**
 * Validate wallet payment eligibility
 */
export function validateWalletPayment(
  walletBalance: number | null,
  depositAmount: number,
  isLoggedIn: boolean
): PaymentError | null {
  if (!isLoggedIn) {
    return PAYMENT_ERRORS.BOOKING_REQUIRES_AUTH
  }
  
  if (walletBalance === null) {
    return PAYMENT_ERRORS.WALLET_NOT_FOUND
  }
  
  if (walletBalance === 0) {
    return {
      ...PAYMENT_ERRORS.WALLET_ZERO_BALANCE,
      details: { required: depositAmount, available: 0, difference: depositAmount }
    }
  }
  
  if (walletBalance < depositAmount) {
    const difference = depositAmount - walletBalance
    return {
      ...PAYMENT_ERRORS.WALLET_INSUFFICIENT_BALANCE,
      details: { required: depositAmount, available: walletBalance, difference }
    }
  }
  
  return null
}

/**
 * Calculate refund info based on cancellation time
 */
export function calculateRefundInfo(
  appointmentDateTime: Date,
  depositAmount: number,
  cancelledBy: 'patient' | 'provider' | 'system' = 'patient'
): {
  percentage: number
  amount: number
  forfeit: number
  message: { en: string; fr: string; ar: string }
} {
  // Provider cancellation = always 100%
  if (cancelledBy === 'provider' || cancelledBy === 'system') {
    return {
      percentage: 100,
      amount: depositAmount,
      forfeit: 0,
      message: {
        en: 'Full refund - Provider cancellation',
        fr: 'Remboursement total - Annulation par le prestataire',
        ar: 'استرداد كامل - إلغاء مقدم الخدمة'
      }
    }
  }
  
  const now = new Date()
  const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (hoursUntil >= 48) {
    return {
      percentage: 100,
      amount: depositAmount,
      forfeit: 0,
      message: {
        en: 'Full refund (48h+ notice)',
        fr: 'Remboursement total (plus de 48h)',
        ar: 'استرداد كامل (أكثر من 48 ساعة)'
      }
    }
  }
  
  if (hoursUntil >= 24) {
    const refund = depositAmount * 0.5
    return {
      percentage: 50,
      amount: refund,
      forfeit: depositAmount - refund,
      message: {
        en: 'Partial refund 50% (24-48h notice)',
        fr: 'Remboursement partiel 50% (24-48h)',
        ar: 'استرداد جزئي 50% (24-48 ساعة)'
      }
    }
  }
  
  return {
    percentage: 0,
    amount: 0,
    forfeit: depositAmount,
    message: {
      en: 'No refund (less than 24h notice)',
      fr: 'Pas de remboursement (moins de 24h)',
      ar: 'لا استرداد (أقل من 24 ساعة)'
    }
  }
}

/**
 * Validate booking date/time - uses local time to avoid timezone false positives.
 */
export function validateBookingDateTime(
  appointmentDate: string,
  appointmentTime: string
): PaymentError | null {
  if (!appointmentDate || !appointmentTime) return null

  // Parse date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss) as local time
  const [y, m, d] = appointmentDate.split('-').map(Number)
  const timePart = appointmentTime.trim().slice(0, 8) // "10:00" or "10:00:00"
  const [h, min, sec = 0] = timePart.split(':').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h) || isNaN(min)) return null

  const appointmentDateTime = new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, sec || 0, 0)
  const now = new Date()
  // Require at least 2 minutes in future (buffer for clock skew / submission delay)
  const minFutureMs = 2 * 60 * 1000
  if (appointmentDateTime.getTime() - now.getTime() < minFutureMs) {
    return PAYMENT_ERRORS.BOOKING_DATE_PASSED
  }
  return null
}

/**
 * Parse API error response to PaymentError
 */
export function parseApiError(
  error: any,
  defaultCode: PaymentErrorCode = 'SYSTEM_ERROR'
): PaymentError {
  const message = error?.message || error?.error || ''
  
  // Map common error messages to specific codes
  if (message.includes('Insufficient balance')) {
    return PAYMENT_ERRORS.WALLET_INSUFFICIENT_BALANCE
  }
  if (message.includes('already exists') || message.includes('duplicate')) {
    return PAYMENT_ERRORS.BOOKING_DUPLICATE
  }
  if (message.includes('not available') && message.includes('date')) {
    return PAYMENT_ERRORS.BOOKING_PROVIDER_UNAVAILABLE
  }
  if (message.includes('not available') && message.includes('time')) {
    return PAYMENT_ERRORS.BOOKING_SLOT_TAKEN
  }
  if (message.includes('login') || message.includes('logged in') || message.includes('Unauthorized')) {
    return PAYMENT_ERRORS.BOOKING_REQUIRES_AUTH
  }
  if (message.includes('network') || message.includes('fetch')) {
    return PAYMENT_ERRORS.NETWORK_ERROR
  }
  if (message.includes('session') || message.includes('expired')) {
    return PAYMENT_ERRORS.SESSION_EXPIRED
  }
  
  // Return default with original message
  return {
    ...PAYMENT_ERRORS[defaultCode],
    message: {
      en: message || PAYMENT_ERRORS[defaultCode].message.en,
      fr: message || PAYMENT_ERRORS[defaultCode].message.fr,
      ar: message || PAYMENT_ERRORS[defaultCode].message.ar
    }
  }
}

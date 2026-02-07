'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Stethoscope, MapPin, Phone, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusBadgeClassName } from '@/lib/status-colors'

export interface Referral {
  id: string
  referral_number?: string
  referred_to_doctor_id?: string
  referred_to_clinic_id?: string
  referred_to_specialty?: string
  reason?: string
  reason_ar?: string
  status?: string
  urgency?: string
  created_at?: string
  referred_to_doctor?: { business_name?: string; specialty?: string; wilaya?: string; phone?: string }
  referred_to_clinic?: { business_name?: string; wilaya?: string; phone?: string }
}

interface ReferralWorkflowProps {
  referral: Referral
  language?: string
  className?: string
}

const STATUS_LABELS: Record<string, { en: string; fr: string; ar: string }> = {
  pending: { en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' },
  accepted: { en: 'Accepted', fr: 'Accepté', ar: 'مقبول' },
  declined: { en: 'Declined', fr: 'Refusé', ar: 'مرفوض' },
  completed: { en: 'Completed', fr: 'Terminé', ar: 'مكتمل' },
  expired: { en: 'Expired', fr: 'Expiré', ar: 'منتهي' },
}

const URGENCY_LABELS: Record<string, { en: string; fr: string; ar: string }> = {
  routine: { en: 'Routine', fr: 'Routine', ar: 'عادي' },
  urgent: { en: 'Urgent', fr: 'Urgent', ar: 'عاجل' },
  emergency: { en: 'Emergency', fr: 'Urgence', ar: 'طوارئ' },
}

export function ReferralWorkflow({ referral, language = 'en', className }: ReferralWorkflowProps) {
  const isClinic = !!referral.referred_to_clinic_id || !!referral.referred_to_clinic
  const target = isClinic ? referral.referred_to_clinic : referral.referred_to_doctor
  const name = target?.business_name || (language === 'ar' ? 'طبيب / عيادة' : language === 'fr' ? 'Médecin / Clinique' : 'Doctor / Clinic')
  const specialty = referral.referred_to_specialty || (referral.referred_to_doctor as any)?.specialty
  const reason = language === 'ar' ? (referral.reason_ar || referral.reason) : referral.reason
  const status = referral.status || 'pending'
  const urgency = referral.urgency || 'routine'
  const statusLabel = STATUS_LABELS[status]?.[language as keyof typeof STATUS_LABELS.en] || status
  const urgencyLabel = URGENCY_LABELS[urgency]?.[language as keyof typeof URGENCY_LABELS.en] || urgency

  const statusClassName = getStatusBadgeClassName(status, 'outline')
  const urgencyColors: Record<string, string> = {
    routine: 'bg-muted text-muted-foreground',
    urgent: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    emergency: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }

  return (
    <Card className={cn('rounded-2xl border overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
            )}
          >
            {isClinic ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <Stethoscope className="h-6 w-6" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-base truncate">{name}</h3>
              {referral.referral_number && (
                <span className="text-xs text-muted-foreground font-mono">#{referral.referral_number}</span>
              )}
              <Badge variant="outline" className={cn('text-xs', statusClassName)}>
                {statusLabel}
              </Badge>
              {urgency !== 'routine' && (
                <Badge variant="outline" className={cn('text-xs', urgencyColors[urgency])}>
                  {urgencyLabel}
                </Badge>
              )}
            </div>
            {specialty && (
              <p className="text-sm text-muted-foreground">{specialty}</p>
            )}
            {reason && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-foreground">{reason}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {(target as any)?.wilaya && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {(target as any).wilaya}
                </span>
              )}
              {(target as any)?.phone && (
                <a
                  href={`tel:${(target as any).phone}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  dir="ltr"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {(target as any).phone}
                </a>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center text-muted-foreground">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

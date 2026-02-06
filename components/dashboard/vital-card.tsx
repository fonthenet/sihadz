'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Heart, Droplet, Ruler, Scale, AlertTriangle, Pill, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PatientVitals {
  blood_type?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  allergies?: string | string[] | null
  chronic_conditions?: string | null
  current_medications?: string | null
  date_of_birth?: string | null
  gender?: string | null
}

interface VitalCardProps {
  vitals: PatientVitals | null
  loading?: boolean
  language: 'ar' | 'fr' | 'en'
}

const labels = {
  ar: {
    title: 'المعلومات الحيوية',
    subtitle: 'تُنقل تلقائياً مع زياراتك وطلباتك',
    bloodType: 'فصيلة الدم',
    height: 'الطول',
    weight: 'الوزن',
    allergies: 'الحساسية',
    chronicConditions: 'أمراض مزمنة',
    currentMedications: 'الأدوية الحالية',
    notRecorded: 'غير مسجّل',
  },
  fr: {
    title: 'Informations vitales',
    subtitle: 'Transférées automatiquement avec vos visites et demandes',
    bloodType: 'Groupe sanguin',
    height: 'Taille',
    weight: 'Poids',
    allergies: 'Allergies',
    chronicConditions: 'Affections chroniques',
    currentMedications: 'Médicaments actuels',
    notRecorded: 'Non renseigné',
  },
  en: {
    title: 'Vital Information',
    subtitle: 'Automatically transferred with your visits and requests',
    bloodType: 'Blood Type',
    height: 'Height',
    weight: 'Weight',
    allergies: 'Allergies',
    chronicConditions: 'Chronic Conditions',
    currentMedications: 'Current Medications',
    notRecorded: 'Not recorded',
  },
}

function formatAllergies(val: string | string[] | null | undefined): string {
  if (!val) return ''
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

export function VitalCard({ vitals, loading, language }: VitalCardProps) {
  const l = labels[language]

  const hasAny =
    vitals &&
    (vitals.blood_type ||
      vitals.height_cm != null ||
      vitals.weight_kg != null ||
      formatAllergies(vitals.allergies) ||
      vitals.chronic_conditions ||
      vitals.current_medications)

  if (loading) {
    return (
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 dark:from-primary/25 dark:via-primary/15 dark:to-primary/10">
        <CardContent className="pt-2 px-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-primary/20" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200 pt-0 pb-2',
        hasAny
          ? 'border-primary/25 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 dark:from-primary/25 dark:via-primary/15 dark:to-primary/10 hover:border-primary/40 hover:shadow-md shadow-sm shadow-primary/5'
          : 'border-dashed border-primary/35 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 hover:border-primary/45'
      )}
    >
      <CardContent className="pt-2 px-4 pb-2 sm:px-5 sm:pb-2">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl',
              hasAny ? 'bg-primary/15' : 'bg-primary/10'
            )}
          >
            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base">{l.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{l.subtitle}</p>
          </div>
        </div>

        {hasAny ? (
          <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            {vitals?.blood_type && (
              <VitalItem
                icon={Droplet}
                label={l.bloodType}
                value={vitals.blood_type}
                className="text-red-600 dark:text-red-400"
              />
            )}
            {vitals?.height_cm != null && (
              <VitalItem
                icon={Ruler}
                label={l.height}
                value={`${vitals.height_cm} cm`}
              />
            )}
            {vitals?.weight_kg != null && (
              <VitalItem
                icon={Scale}
                label={l.weight}
                value={`${vitals.weight_kg} kg`}
              />
            )}
            {formatAllergies(vitals?.allergies) && (
              <VitalItem
                icon={AlertTriangle}
                label={l.allergies}
                value={formatAllergies(vitals.allergies)}
                className="text-amber-600 dark:text-amber-400"
                fullWidth
              />
            )}
            {vitals?.chronic_conditions && (
              <VitalItem
                icon={FileText}
                label={l.chronicConditions}
                value={vitals.chronic_conditions}
              />
            )}
            {vitals?.current_medications && (
              <VitalItem
                icon={Pill}
                label={l.currentMedications}
                value={vitals.current_medications}
              />
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{l.notRecorded}</p>
        )}
      </CardContent>
    </Card>
  )
}

function VitalItem({
  icon: Icon,
  label,
  value,
  className,
  fullWidth,
}: {
  icon: typeof Heart
  label: string
  value: string
  className?: string
  fullWidth?: boolean
}) {
  if (fullWidth) {
    return (
      <div className="flex gap-3 rounded-lg border border-border/60 bg-background/50 p-3 col-span-2 sm:col-span-1 sm:min-w-full sm:w-full">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-4 w-4', className)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-medium truncate" title={value}>
            {value}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2 min-w-0 sm:min-w-[100px] sm:max-w-[160px] shrink-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className={cn('h-3.5 w-3.5', className)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
        <p className="text-xs font-medium truncate leading-tight" title={value}>
          {value}
        </p>
      </div>
    </div>
  )
}

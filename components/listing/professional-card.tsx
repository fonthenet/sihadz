'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FavoriteButton } from '@/components/ui/favorite-button'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  MapPin,
  Star,
  Clock,
  Phone,
  Stethoscope,
  Pill,
  FlaskConical,
  Building2,
  Video,
  Building,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProfessionalType = 'doctor' | 'nurse' | 'pharmacy' | 'laboratory' | 'clinic' | 'pharma_supplier' | 'equipment_supplier'

export interface ProfessionalCardData {
  id: string
  type: ProfessionalType
  name: string
  nameAr?: string
  subtitle?: string // specialty for doctors, services for others
  subtitleAr?: string
  location: string
  locationAr?: string
  rating: number
  reviewCount: number
  isOpen?: boolean
  opensAt?: string
  closesAt?: string
  phone?: string
  avatarUrl?: string | null
  // Doctor-specific
  supportsEVisit?: boolean
  supportsInPerson?: boolean
  price?: number
  experience?: number
  // Pharmacy-specific
  isOnDuty?: boolean
  hasDelivery?: boolean
  is24h?: boolean
  // Lab-specific
  hasHomeCollection?: boolean
  // Clinic-specific
  specialties?: string[]
  // General
  verified?: boolean
  badges?: string[]
}

interface ProfessionalCardProps {
  data: ProfessionalCardData
  isFavorite?: boolean
  onFavoriteToggle?: (id: string, newState: boolean) => void
  className?: string
  /** When true, use light grey background for alternating rows */
  variant?: 'default' | 'alt'
}

const typeIcons: Record<ProfessionalType, typeof Stethoscope> = {
  doctor: Stethoscope,
  nurse: Stethoscope,
  pharmacy: Pill,
  laboratory: FlaskConical,
  clinic: Building2,
}

const typeColors: Record<ProfessionalType, string> = {
  doctor: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400',
  nurse: 'from-teal-500/20 to-cyan-500/20 text-teal-600 dark:text-teal-400',
  pharmacy: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400',
  laboratory: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400',
  clinic: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400',
}

const getProfileHref = (type: ProfessionalType, id: string): string => {
  switch (type) {
    case 'doctor': return `/doctors/${id}`
    case 'nurse': return `/nurses/${id}`
    case 'pharmacy': return `/pharmacies/${id}`
    case 'laboratory': return `/labs/${id}`
    case 'clinic': return `/clinics/${id}`
  }
}

const getBookingHref = (type: ProfessionalType, id: string): string | null => {
  if (type === 'doctor') return `/booking/new?doctor=${id}`
  if (type === 'nurse') return `/booking/new?nurse=${id}`
  if (type === 'clinic') return `/booking/new?clinic=${id}`
  return null
}

export function ProfessionalCard({ data, isFavorite = false, onFavoriteToggle, className, variant = 'default' }: ProfessionalCardProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const TypeIcon = typeIcons[data.type]
  const profileHref = getProfileHref(data.type, data.id)
  const bookingHref = getBookingHref(data.type, data.id)

  const displayName = language === 'ar' && data.nameAr ? data.nameAr : data.name
  const displaySubtitle = language === 'ar' && data.subtitleAr ? data.subtitleAr : data.subtitle
  const displayLocation = language === 'ar' && data.locationAr ? data.locationAr : data.location

  const labels = {
    ar: {
      openNow: 'مفتوح الآن',
      closed: 'مغلق',
      onDuty: 'نوبة',
      delivery: 'توصيل',
      h24: '24 ساعة',
      homeCollection: 'جمع منزلي',
      eVisit: 'استشارة عن بعد',
      inPerson: 'في العيادة',
      book: 'احجز موعد',
      viewProfile: 'عرض الملف',
      verified: 'موثق',
      reviews: 'تقييم',
      yrs: 'سنة',
    },
    fr: {
      openNow: 'Ouvert',
      closed: 'Fermé',
      onDuty: 'De garde',
      delivery: 'Livraison',
      h24: '24h',
      homeCollection: 'À domicile',
      eVisit: 'Téléconsultation',
      inPerson: 'En cabinet',
      book: 'Réserver',
      verified: 'Vérifié',
      reviews: 'avis',
      yrs: 'ans',
    },
    en: {
      openNow: 'Open',
      closed: 'Closed',
      onDuty: 'On Duty',
      delivery: 'Delivery',
      h24: '24h',
      homeCollection: 'Home Collection',
      eVisit: 'Video Consult',
      inPerson: 'In-Person',
      book: 'Book Now',
      verified: 'Verified',
      reviews: 'reviews',
      yrs: 'yrs',
    },
  }

  const l = labels[language] || labels.en

  return (
    <Link href={profileHref} className="block group min-w-0">
      <div
        className={cn(
          'relative border border-border/60 rounded-xl p-3 sm:p-4 transition-all duration-200 overflow-hidden',
          variant === 'alt' ? 'bg-slate-100/90 dark:bg-slate-800/50 sm:bg-card sm:dark:bg-card' : 'bg-card',
          'hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
          'hover:-translate-y-0.5',
          className
        )}
      >
        {/* Top row: Avatar + Info */}
        <div className="flex gap-3.5">
          {/* Avatar */}
          <div className="shrink-0">
            <Avatar className="h-12 w-12 rounded-xl ring-1 ring-border/50">
              <AvatarImage src={data.avatarUrl || undefined} alt="" className="object-cover" />
              <AvatarFallback className={cn('rounded-xl bg-gradient-to-br', typeColors[data.type])}>
                <TypeIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {displayName}
                </h3>
                {displaySubtitle && (
                  <p className="text-sm text-muted-foreground truncate">{displaySubtitle}</p>
                )}
              </div>
              {onFavoriteToggle && (
                <div onClick={(e) => e.preventDefault()}>
                  <FavoriteButton
                    professionalId={data.id}
                    initialFavorited={isFavorite}
                    size="sm"
                    onToggle={(newState) => onFavoriteToggle(data.id, newState)}
                  />
                </div>
              )}
            </div>

            {/* Rating + Location */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">{data.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({data.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground min-w-0 overflow-hidden">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{displayLocation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 overflow-hidden">
          {/* Open/Closed status */}
          {data.isOpen !== undefined && (
            <Badge
              variant="secondary"
              className={cn(
                'text-xs font-medium px-2 py-0.5',
                data.isOpen
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full me-1.5', data.isOpen ? 'bg-green-500' : 'bg-red-500')} />
              {data.isOpen ? l.openNow : l.closed}
            </Badge>
          )}

          {/* Doctor badges */}
          {data.type === 'doctor' && (
            <>
              {data.supportsEVisit && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-secondary/10 border-secondary/30">
                  <Video className="h-3 w-3 me-1" />
                  {l.eVisit}
                </Badge>
              )}
              {data.supportsInPerson && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-primary/10 border-primary/30">
                  <Building className="h-3 w-3 me-1" />
                  {l.inPerson}
                </Badge>
              )}
              {data.experience && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {data.experience} {l.yrs}
                </Badge>
              )}
            </>
          )}

          {/* Pharmacy badges */}
          {data.type === 'pharmacy' && (
            <>
              {data.isOnDuty && (
                <Badge className="text-xs px-2 py-0.5 bg-amber-500 hover:bg-amber-500">
                  {l.onDuty}
                </Badge>
              )}
              {data.is24h && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  <Clock className="h-3 w-3 me-1" />
                  {l.h24}
                </Badge>
              )}
              {data.hasDelivery && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {l.delivery}
                </Badge>
              )}
            </>
          )}

          {/* Lab badges */}
          {data.type === 'laboratory' && data.hasHomeCollection && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {l.homeCollection}
            </Badge>
          )}

          {/* Verified badge */}
          {data.verified && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 text-primary border-primary/30">
              <CheckCircle className="h-3 w-3 me-1" />
              {l.verified}
            </Badge>
          )}
        </div>

        {/* Bottom row: Price + Actions */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 min-w-0">
          {/* Price (doctors) or Hours */}
          <div className="text-sm">
            {(data.type === 'doctor' || data.type === 'nurse') && data.price ? (
              <span className="font-semibold text-primary">{data.price} DZD</span>
            ) : data.opensAt && data.closesAt ? (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {data.opensAt} - {data.closesAt}
              </span>
            ) : null}
          </div>

          {/* Actions */}
          {bookingHref && (
            <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                className="h-9 sm:h-8 px-2.5 sm:px-3 text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(bookingHref)
                }}
              >
                <Calendar className="h-3.5 w-3.5 me-1" />
                {l.book}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// Skeleton for loading state
export function ProfessionalCardSkeleton() {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 animate-pulse">
      <div className="flex gap-3.5">
        <div className="h-14 w-14 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-1/2 bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </div>
      <div className="flex gap-1.5 mt-3">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-20 bg-muted rounded-full" />
      </div>
      <div className="flex justify-between mt-3.5 pt-3 border-t border-border/50">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-8 w-24 bg-muted rounded-md" />
      </div>
    </div>
  )
}

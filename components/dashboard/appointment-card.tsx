'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseDateOnlyAsLocal, formatDateAlgeria } from '@/lib/date-algeria'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, Clock, MapPin, Video, Phone, MessageCircle, CalendarClock, MoreVertical, Pill, CalendarPlus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getDisplayStatus,
  getPharmacyName,
  getStatusBadgeClassName,
} from '@/lib/appointment-status'
import type { StatusLanguage } from '@/lib/appointment-status'

interface AppointmentCardProps {
  item: any
  language: string
  dir: 'ltr' | 'rtl'
  langStatus: StatusLanguage
  getStatusLabel: (status: string, pharmacyName?: string | null) => string
  typeIcons: Record<string, any>
  isUpcoming?: boolean
  onJoinVideo?: (id: string) => void
  onPhoneCall?: (phone: string) => void
  onWhatsApp?: (phone: string) => void
  onReschedule?: (item: any) => void
  onCancel?: (id: string) => void
  variant?: 'compact' | 'full'
  /** For list striping - pass when index % 2 === 1 */
  stripe?: boolean
}

export function AppointmentCard({
  item,
  language,
  dir,
  langStatus,
  getStatusLabel,
  typeIcons,
  isUpcoming = false,
  onJoinVideo,
  onPhoneCall,
  onWhatsApp,
  onReschedule,
  onCancel,
  variant = 'full',
  stripe = false,
}: AppointmentCardProps) {
  const router = useRouter()
  const isStandalone = item.isStandaloneTicket
  const displayStatus = getDisplayStatus(item)
  const pharmacyName = getPharmacyName(item)
  const statusLabel = getStatusLabel(displayStatus, pharmacyName)
  const Icon = isStandalone ? (typeIcons[item.ticket_type] ?? Calendar) : (item.type === 'video' ? Video : Calendar)
  const doctorName = language === 'ar' ? item.doctorNameAr : item.doctorName
  const specialty = language === 'ar' ? item.specialtyAr : item.specialty
  const dateStr = language === 'ar' ? item.dateAr : item.date
  const locationStr = language === 'ar' ? item.locationAr : item.location

  const baseAppointmentHref = !isStandalone
    ? `/dashboard/appointments/${item.id}`
    : item.rawData?.appointment_id
      ? `/dashboard/appointments/${item.rawData.appointment_id}`
      : null
  const labRequestId = isStandalone && item.rawData?.lab_request_id ? item.rawData.lab_request_id : null
  const viewHref = baseAppointmentHref
    ? (labRequestId ? `${baseAppointmentHref}?labRequest=${labRequestId}` : baseAppointmentHref)
    : `/dashboard/tickets${item.ticket_id ? `?ticket=${item.ticket_id}` : ''}`

  const providerId = item.doctor_id ?? item.professional_id ?? item.rawData?.doctor_id ?? item.rawData?.professional_id
  const canRebook = !isStandalone && !!providerId
  const rebookHref = canRebook ? `/booking/new?doctor=${providerId}` : null

  const aptDate = item.appointment_date ? parseDateOnlyAsLocal(item.appointment_date) : null
  const dayLabel = aptDate
    ? formatDateAlgeria(aptDate, language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en', { weekday: 'long' })
    : '—'
  const dayNum = aptDate ? aptDate.getDate() : '—'

  const ticketNum = item.ticket_number || item.rawData?.ticket_number
  const headerTitle = [doctorName, ticketNum ? `#${ticketNum}` : null, statusLabel].filter(Boolean).join(' ')

  const actionsBlock = (
    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
      {isUpcoming && !isStandalone && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg touch-manipulation">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'} className="w-48">
            {item.type === 'video' && onJoinVideo && (
              <DropdownMenuItem onClick={() => onJoinVideo(item.id)}>
                <Video className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'انضم' : language === 'fr' ? 'Rejoindre' : 'Join meeting'}
              </DropdownMenuItem>
            )}
            {item.doctorPhone && (
              <>
                <DropdownMenuItem onClick={() => onPhoneCall?.(item.doctorPhone)}>
                  <Phone className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'اتصال' : language === 'fr' ? 'Appel' : 'Phone'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onWhatsApp?.(item.doctorPhone)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </DropdownMenuItem>
              </>
            )}
            {onReschedule && (
              <DropdownMenuItem onClick={() => onReschedule(item)}>
                <CalendarClock className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تغيير الموعد' : language === 'fr' ? 'Reporter' : 'Reschedule'}
              </DropdownMenuItem>
            )}
            {onCancel && (
              <DropdownMenuItem
                onClick={() => onCancel(item.id)}
                className="text-destructive focus:text-destructive"
              >
                {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {(!isUpcoming || isStandalone) && canRebook && rebookHref && (
        <Button
          size="sm"
          className="h-9 sm:h-8 rounded-lg text-xs px-3 touch-manipulation"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            router.push(rebookHref!)
          }}
        >
          <CalendarPlus className="h-3.5 w-3.5 me-1" />
          {language === 'ar' ? 'إعادة الحجز' : language === 'fr' ? 'Revoir' : 'Rebook'}
        </Button>
      )}
    </div>
  )

  if (variant === 'compact') {
    return (
      <Link
        href={viewHref}
        className={cn(
          'group flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 active:scale-[0.99] transition-colors cursor-pointer touch-manipulation min-h-[72px]',
          item.status === 'cancelled' && 'opacity-75',
          stripe && 'bg-slate-50/80 dark:bg-slate-800/30'
        )}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{doctorName}{ticketNum && <span className="text-muted-foreground font-mono ms-1 text-sm">#{ticketNum}</span>}</h3>
          <p className="text-sm text-muted-foreground truncate">{specialty}</p>
        </div>
        {actionsBlock}
      </Link>
    )
  }

  /* ─── Mobile: Completely different layout ─── */
  const mobileCard = (
    <div className="flex flex-col sm:hidden rounded-2xl">
      {/* Top: Date & time bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl bg-primary/5 dark:bg-primary/10 border-b border-primary/10">
        <Calendar className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">
          {dateStr}
          {item.time && <span className="text-primary ms-1">· {item.time}</span>}
        </span>
      </div>
      {/* Body */}
      <div className="flex gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight" title={headerTitle}>
            {doctorName}
            {ticketNum && <span className="text-muted-foreground font-mono text-sm ms-1">#{ticketNum}</span>}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{specialty}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs px-2 py-0.5 rounded-md font-medium', getStatusBadgeClassName(displayStatus))}>
              {statusLabel}
            </Badge>
            {!isStandalone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                {item.type === 'video' ? <Video className="h-3.5 w-3.5 shrink-0" /> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
                {locationStr}
              </span>
            )}
            {pharmacyName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <Pill className="h-3.5 w-3.5 shrink-0" />
                {pharmacyName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-between shrink-0">
          {actionsBlock}
          <ChevronRight className="h-5 w-5 text-muted-foreground mt-auto" />
        </div>
      </div>
    </div>
  )

  /* ─── Desktop: Original horizontal layout ─── */
  const dateBlock = (
    <div className="flex flex-col items-center justify-center shrink-0 rounded-xl min-w-[88px] py-2 px-3 bg-primary/5 dark:bg-primary/10 border border-primary/20">
      <span className="text-xs font-medium text-muted-foreground tracking-wide text-center uppercase">{dayLabel}</span>
      <span className="text-xl font-bold leading-tight tabular-nums">{dayNum}</span>
      {item.time && <span className="text-sm font-semibold text-primary mt-0.5">{item.time}</span>}
    </div>
  )

  const desktopCard = (
    <div className="hidden sm:flex w-full min-w-0 gap-4 sm:gap-6 p-5 sm:p-6">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1" title={headerTitle}>
            <h3 className="font-semibold text-base md:text-lg truncate">
              {doctorName}
              {ticketNum && <span className="text-muted-foreground font-normal font-mono ms-1.5 text-sm md:text-base">#{ticketNum}</span>}
            </h3>
            <Badge variant="outline" className={cn('text-xs px-2 py-0.5 rounded-md font-medium shrink-0', getStatusBadgeClassName(displayStatus))}>
              {statusLabel}
            </Badge>
          </div>
          {actionsBlock}
        </div>
        <p className="text-sm text-muted-foreground truncate">{specialty}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
          {item.date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 shrink-0" />{dateStr}</span>}
          {item.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 shrink-0" />{item.time}</span>}
          {!isStandalone && (
            <span className="flex items-center gap-1 truncate max-w-[180px]">
              {item.type === 'video' ? <Video className="h-3.5 w-3.5 shrink-0" /> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
              {locationStr}
            </span>
          )}
          {pharmacyName && <span className="flex items-center gap-1 truncate max-w-[160px]"><Pill className="h-3.5 w-3.5 shrink-0" />{pharmacyName}</span>}
        </div>
      </div>
      <div className="shrink-0 self-center">{dateBlock}</div>
    </div>
  )

  return (
    <Link
      href={viewHref}
      className={cn(
        'block rounded-2xl border bg-card transition-all hover:shadow-md active:scale-[0.99] cursor-pointer touch-manipulation overflow-hidden',
        item.status === 'cancelled' && 'opacity-80 bg-muted/20 border-destructive/20',
        stripe && 'bg-slate-50/80 dark:bg-slate-800/30'
      )}
    >
      {mobileCard}
      {desktopCard}
    </Link>
  )
}

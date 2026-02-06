'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { DayButton } from 'react-day-picker'
import { arDZ } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

// Slot cache to avoid refetching same date/professional combination
const SLOT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
interface CachedSlots {
  slots: { time: string; endTime: string; available: boolean }[]
  message?: string
  timestamp: number
}
const slotCache = new Map<string, CachedSlots>()

/** Day button with blue selected state for appointment calendar */
function AppointmentDayButton(props: React.ComponentProps<typeof DayButton>) {
  const { day, modifiers, ...rest } = props
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={isSelected}
      className={cn(
        'rounded-md font-normal size-auto w-full min-w-(--cell-size) h-[var(--cell-height,var(--cell-size))]',
        isSelected
          ? 'bg-blue-500 text-white hover:bg-blue-600 hover:text-white'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        modifiers.disabled && 'text-slate-300 dark:text-slate-500 text-xs line-through opacity-70 cursor-not-allowed',
        modifiers.outside && 'text-slate-300 dark:text-slate-500 text-xs line-through opacity-60'
      )}
      disabled={modifiers.disabled}
      {...rest}
    />
  )
}

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

interface CalendarSlotPickerProps {
  professionalId: string
  selectedDate: string | null
  selectedTime: string | null
  onSelectDate: (date: string | null) => void
  onSelectTime: (time: string | null) => void
  slotDuration?: number
  minDaysAhead?: number
  maxDaysAhead?: number
  lang?: 'en' | 'fr' | 'ar'
  providerName?: string
  providerSpecialty?: string
  className?: string
  /** Use smaller cells and spacing (e.g. for doctor profile sidebar) */
  compact?: boolean
}

const labels = {
  en: {
    chooseDateAndTime: 'Choose date and time:',
    appointmentDetails: 'Appointment details:',
    noSlots: 'No available slots',
    tryDifferentDate: 'Please select a different date',
    loading: 'Loading times...',
  },
  fr: {
    chooseDateAndTime: 'Choisir date et heure :',
    appointmentDetails: 'Détails du rendez-vous :',
    noSlots: 'Aucun créneau disponible',
    tryDifferentDate: 'Veuillez choisir une autre date',
    loading: 'Chargement des horaires...',
  },
  ar: {
    chooseDateAndTime: 'اختر التاريخ والوقت:',
    appointmentDetails: 'تفاصيل الموعد:',
    noSlots: 'لا توجد مواعيد متاحة',
    tryDifferentDate: 'يرجى اختيار تاريخ آخر',
    loading: 'جاري تحميل المواعيد...',
  },
}

function formatSlotTime(time: string, endTime: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':')
    return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`
  }
  return `${fmt(time)}-${fmt(endTime)}`
}

function formatDisplayDate(isoDate: string, lang: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  // Algeria: ar-DZ and fr-DZ use Gregorian calendar (same as Europe)
  return d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CalendarSlotPicker({
  professionalId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  slotDuration = 30,
  minDaysAhead = 0,
  maxDaysAhead = 60,
  lang = 'en',
  providerName,
  providerSpecialty,
  className,
  compact = false,
}: CalendarSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduleInfo, setScheduleInfo] = useState<{ message?: string }>({})
  const t = labels[lang]

  const fetchSlots = useCallback(async () => {
    if (!professionalId || !selectedDate) return
    
    // Check cache first
    const cacheKey = `${professionalId}-${selectedDate}-${slotDuration}`
    const cached = slotCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SLOT_CACHE_TTL) {
      setSlots(cached.slots)
      setScheduleInfo({ message: cached.message })
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(
        `/api/professionals/${professionalId}/slots?date=${selectedDate}&duration=${slotDuration}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      const slots = data.slots || []
      setSlots(slots)
      // Show API message, or config error for 503 (helps diagnose production env issues)
      const msg = data.message ?? (res.status === 503 ? data.error : undefined)
      setScheduleInfo({ message: msg })
      
      // Don't cache errors
      if (res.ok) {
        slotCache.set(cacheKey, {
          slots,
          message: data.message,
          timestamp: Date.now()
        })
      }
    } catch {
      setSlots([])
      setScheduleInfo({ message: undefined })
    } finally {
      setLoading(false)
    }
  }, [professionalId, selectedDate, slotDuration])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  useEffect(() => {
    if (!selectedDate) onSelectTime(null)
  }, [selectedDate, onSelectTime])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + minDaysAhead)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + maxDaysAhead)

  const now = new Date()
  const todayStr =
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0')

  const isPastSlot = (slot: TimeSlot): boolean => {
    if (selectedDate !== todayStr) return false
    const [h, m] = slot.time.split(':').map(Number)
    const slotTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m || 0,
      0,
      0
    )
    return slotTime.getTime() <= now.getTime()
  }

  const effectiveSlots = slots.map((s) => ({
    ...s,
    available: s.available && !isPastSlot(s),
  }))

  const hasNoSlots = scheduleInfo.message || effectiveSlots.filter((s) => s.available).length === 0

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onSelectDate(null)
      onSelectTime(null)
      return
    }
    // Use local date parts (DayPicker uses local tz). Append noon to avoid DST edge cases.
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    onSelectDate(iso)
    onSelectTime(null)
  }

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      {/* Title */}
      <h2 className={cn(
        'font-bold text-slate-800 dark:text-slate-100 text-center',
        compact ? 'text-sm' : 'text-base sm:text-lg'
      )}>
        {t.chooseDateAndTime}
      </h2>

      {/* Calendar - month caption, blue selected, strikethrough disabled */}
      <div className="flex justify-center w-full min-w-0 overflow-hidden">
        <Calendar
          mode="single"
          selected={
            selectedDate
              ? (() => {
                  const [y, m, d] = selectedDate.split('-').map(Number)
                  return new Date(y, m - 1, d)
                })()
              : undefined
          }
          defaultMonth={
            selectedDate
              ? (() => {
                  const [y, m] = selectedDate.split('-').map(Number)
                  return new Date(y, m - 1, 1)
                })()
              : undefined
          }
          onSelect={handleDateSelect}
          disabled={{
            before: minDate,
            after: maxDate,
          }}
          modifiers={{ weekend: { dayOfWeek: [0, 6] } }}
          modifiersClassNames={{
            weekend: 'text-slate-300 dark:text-slate-500 text-xs line-through',
            selected: '[&_button]:!bg-blue-500 [&_button]:!text-white [&_button]:hover:!bg-blue-600',
          }}
          locale={lang === 'ar' ? arDZ : undefined}
          formatters={{
            formatWeekdayName: (date) => {
              // Algeria: ar-DZ uses Gregorian calendar (same months/year as Europe)
              const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-US'
              return date.toLocaleDateString(locale, {
                weekday: lang === 'ar' ? 'long' : 'short',
              })
            },
          }}
          classNames={{
            caption_label: compact ? 'text-slate-800 dark:text-slate-100 font-bold text-xs' : 'text-slate-800 dark:text-slate-100 font-bold text-base sm:text-lg',
            weekday: compact ? 'text-slate-600 dark:text-slate-400 text-[0.6rem] font-medium min-w-0 break-words leading-tight' : 'text-slate-600 dark:text-slate-400 text-[0.7rem] sm:text-sm font-medium min-w-0 break-words leading-tight',
            button_previous: 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100',
            button_next: 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100',
            disabled: 'text-slate-300 dark:text-slate-500 text-xs line-through opacity-70',
            outside: 'text-slate-300 dark:text-slate-500 text-xs line-through opacity-60',
          }}
          components={{ DayButton: AppointmentDayButton }}
          startMonth={minDate}
          endMonth={maxDate}
          className={cn(
            'rounded-xl w-fit min-w-0',
            compact
              ? '[--cell-size:1.75rem] [--cell-height:1.75rem] p-2'
              : '[--cell-size:2rem] [--cell-height:2rem] sm:[--cell-size:2.25rem] sm:[--cell-height:2.25rem] md:[--cell-size:2.5rem] md:[--cell-height:2.5rem] rounded-[20px]'
          )}
        />
      </div>

      {/* Time slots - 3-column grid, 08:00-08:30 format */}
      {selectedDate && professionalId && (
        <div className={cn('flex flex-col items-center', compact ? 'space-y-2' : 'space-y-3')}>
          {loading ? (
            <div className={cn('grid gap-1.5 w-fit', compact ? 'grid-cols-3' : 'grid-cols-3 gap-2')}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <Skeleton key={i} className={cn('rounded-lg', compact ? 'h-8' : 'h-11 rounded-xl')} />
              ))}
            </div>
          ) : hasNoSlots ? (
            <div className={cn(
              'rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-center w-fit min-w-[12rem]',
              compact ? 'py-3 px-3' : 'rounded-xl py-6 px-4'
            )}>
              <AlertCircle className={cn('mx-auto text-slate-400', compact ? 'h-6 w-6 mb-1' : 'h-8 w-8 mb-2')} />
              <p className={cn('font-medium text-slate-600 dark:text-slate-400', compact ? 'text-xs' : 'text-sm')}>
                {scheduleInfo.message || t.noSlots}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t.tryDifferentDate}</p>
            </div>
          ) : (
            <div className={cn(
              'grid gap-1 w-fit',
              compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 gap-2'
            )}>
              {effectiveSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => slot.available && onSelectTime(slot.time)}
                  className={cn(
                    'rounded-lg text-sm font-medium transition-all px-2',
                    compact ? 'h-7 text-[0.65rem]' : 'h-11 rounded-xl px-3',
                    slot.available
                      ? selectedTime === slot.time
                        ? 'border-2 border-blue-500 text-slate-800 dark:text-slate-100 bg-blue-50 dark:bg-blue-950/30'
                        : 'border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500'
                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
                  )}
                >
                  {formatSlotTime(slot.time, slot.endTime)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointment details - summary section */}
      {(selectedDate || selectedTime || providerName) && (
        <div className={cn('space-y-1 border-t border-slate-200 dark:border-slate-700', compact ? 'pt-1.5' : 'pt-3')}>
          <h3 className={cn('font-bold text-slate-800 dark:text-slate-100', compact ? 'text-xs' : 'text-base sm:text-lg')}>
            {t.appointmentDetails}
          </h3>
          <div className={cn('text-slate-600 dark:text-slate-400 space-y-1', compact ? 'text-xs' : 'text-sm')}>
            {providerName && (
              <p>
                {providerSpecialty ? `${providerSpecialty} - ` : ''}
                {providerName}
              </p>
            )}
            {selectedDate && <p>{formatDisplayDate(selectedDate, lang)}</p>}
            {selectedTime && (() => {
              const slot = effectiveSlots.find((s) => s.time === selectedTime)
              const endTime = slot?.endTime
                || (() => {
                    const [h, m] = selectedTime.split(':').map(Number)
                    const end = new Date(0, 0, 0, h, m + slotDuration, 0)
                    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
                  })()
              return <p>{formatSlotTime(selectedTime, endTime)}</p>
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

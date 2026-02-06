'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Clock, ChevronLeft, ChevronRight, Calendar, AlertCircle, Sun, Sunset, Moon } from 'lucide-react'

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

interface AppointmentDateTimePickerProps {
  professionalId: string
  selectedDate: string | null
  selectedTime: string | null
  onSelectDate: (date: string | null) => void
  onSelectTime: (time: string | null) => void
  slotDuration?: number
  minDaysAhead?: number
  maxDaysAhead?: number
  lang?: 'en' | 'fr' | 'ar'
}

const labels = {
  en: {
    selectDate: 'Select date',
    selectTime: 'Select time',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    noSlots: 'No available slots',
    tryDifferentDate: 'Please select a different date',
    loading: 'Loading times...',
    closed: 'Closed',
    slotsAvailable: 'slots available',
  },
  fr: {
    selectDate: 'Choisir la date',
    selectTime: 'Choisir l\'heure',
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soir',
    noSlots: 'Aucun créneau disponible',
    tryDifferentDate: 'Veuillez choisir une autre date',
    loading: 'Chargement des horaires...',
    closed: 'Fermé',
    slotsAvailable: 'créneaux disponibles',
  },
  ar: {
    selectDate: 'اختر التاريخ',
    selectTime: 'اختر الوقت',
    morning: 'صباحاً',
    afternoon: 'مساءً',
    evening: 'ليلاً',
    noSlots: 'لا توجد مواعيد متاحة',
    tryDifferentDate: 'يرجى اختيار تاريخ آخر',
    loading: 'جاري تحميل المواعيد...',
    closed: 'مغلق',
    slotsAvailable: 'مواعيد متاحة',
  },
}

const dayNames = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  fr: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
}

export function AppointmentDateTimePicker({
  professionalId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  slotDuration = 30,
  minDaysAhead = 1,
  maxDaysAhead = 60,
  lang = 'en',
}: AppointmentDateTimePickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduleInfo, setScheduleInfo] = useState<{ dayOfWeek?: string; openTime?: string; closeTime?: string; message?: string }>({})
  const [weekOffset, setWeekOffset] = useState(0)
  const t = labels[lang]

  const fetchSlots = useCallback(async () => {
    if (!professionalId || !selectedDate) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/professionals/${professionalId}/slots?date=${selectedDate}&duration=${slotDuration}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setSlots(data.slots || [])
      setScheduleInfo({
        dayOfWeek: data.dayOfWeek,
        openTime: data.openTime,
        closeTime: data.closeTime,
        message: data.message,
      })
    } catch {
      setSlots([])
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

  const weekStart = new Date(minDate)
  weekStart.setDate(weekStart.getDate() + weekOffset * 7)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const dayDate = new Date(iso + 'T12:00:00')
    const isPast = dayDate < minDate
    const isFuture = dayDate > maxDate
    const isDisabled = isPast || isFuture
    return {
      iso,
      dayNum: d.getDate(),
      dayName: dayNames[lang][d.getDay()],
      month: d.toLocaleDateString(lang, { month: 'short' }),
      isDisabled,
      isSelected: selectedDate === iso,
    }
  })

  const morningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) < 12)
  const afternoonSlots = slots.filter(s => {
    const h = parseInt(s.time.split(':')[0])
    return h >= 12 && h < 17
  })
  const eveningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) >= 17)

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM')
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${min} ${ampm}`
  }

  const availableCount = slots.filter(s => s.available).length
  const hasNoSlots = scheduleInfo.message || slots.length === 0 || availableCount === 0

  const renderTimeGroup = (title: string, groupSlots: TimeSlot[], Icon: React.ElementType) => {
    if (groupSlots.length === 0) return null
    const available = groupSlots.filter(s => s.available)
    if (available.length === 0) return null
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4 text-amber-500" />
          {title}
        </div>
        <div className="flex flex-wrap gap-2">
          {groupSlots.map(slot => (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              onClick={() => slot.available && onSelectTime(slot.time)}
              className={cn(
                'h-11 min-w-[4.5rem] rounded-full px-4 text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2',
                slot.available
                  ? selectedTime === slot.time
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30 scale-105'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-900/50'
                  : 'bg-muted/50 text-muted-foreground cursor-not-allowed line-through opacity-60'
              )}
            >
              {formatTime(slot.time)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Date selection - round pills */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-teal-600" />
          {t.selectDate}
        </h4>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 shrink-0 border-teal-200 hover:bg-teal-50 hover:border-teal-300 dark:border-teal-800 dark:hover:bg-teal-950/50"
            onClick={() => setWeekOffset(o => o - 1)}
            disabled={weekOffset <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {weekDates.map(({ iso, dayNum, dayName, month, isDisabled, isSelected }) => (
              <button
                key={iso}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelectDate(iso)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[3.25rem] h-16 rounded-2xl px-2 py-2 transition-all duration-200 shrink-0',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2',
                  isDisabled && 'opacity-40 cursor-not-allowed',
                  !isDisabled && !isSelected && 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
                  !isDisabled && isSelected && 'bg-teal-600 text-white shadow-lg shadow-teal-500/30 scale-105'
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">{dayName}</span>
                <span className="text-lg font-bold leading-none mt-0.5">{dayNum}</span>
                <span className="text-[10px] opacity-80">{month}</span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 shrink-0 border-teal-200 hover:bg-teal-50 hover:border-teal-300 dark:border-teal-800 dark:hover:bg-teal-950/50"
            onClick={() => setWeekOffset(o => o + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Time selection - only when date selected and provider has slots */}
      {selectedDate && professionalId && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-teal-600" />
            {t.selectTime}
            {scheduleInfo.openTime && scheduleInfo.closeTime && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({scheduleInfo.openTime} – {scheduleInfo.closeTime})
              </span>
            )}
          </h4>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <div className="h-5 w-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
              <span className="text-sm">{t.loading}</span>
            </div>
          ) : hasNoSlots ? (
            <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 py-8 px-6 text-center">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {scheduleInfo.message || t.noSlots}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{t.tryDifferentDate}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {renderTimeGroup(t.morning, morningSlots, Sun)}
              {renderTimeGroup(t.afternoon, afternoonSlots, Sunset)}
              {renderTimeGroup(t.evening, eveningSlots, Moon)}
              <div className="pt-2 text-xs text-muted-foreground">
                {availableCount} {t.slotsAvailable}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

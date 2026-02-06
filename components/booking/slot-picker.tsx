'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Clock, ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react'

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
}

interface SlotPickerProps {
  professionalId: string
  selectedDate: string
  selectedTime?: string
  onSelectTime: (time: string) => void
  slotDuration?: number
  className?: string
}

export function SlotPicker({
  professionalId,
  selectedDate,
  selectedTime,
  onSelectTime,
  slotDuration = 30,
  className
}: SlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleInfo, setScheduleInfo] = useState<{
    dayOfWeek?: string
    openTime?: string
    closeTime?: string
    message?: string
  }>({})

  const fetchSlots = useCallback(async () => {
    if (!professionalId || !selectedDate) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(
        `/api/professionals/${professionalId}/slots?date=${selectedDate}&duration=${slotDuration}`,
        { cache: 'no-store' }
      )
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch slots')
      }
      
      const data = await res.json()
      setSlots(data.slots || [])
      setScheduleInfo({
        dayOfWeek: data.dayOfWeek,
        openTime: data.openTime,
        closeTime: data.closeTime,
        message: data.message
      })
    } catch (err: any) {
      setError(err.message)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [professionalId, selectedDate, slotDuration])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  // Clear selectedTime if it became a past slot (e.g. user kept page open and time passed)
  const nowForEffect = new Date()
  const todayStrForEffect = `${nowForEffect.getFullYear()}-${String(nowForEffect.getMonth() + 1).padStart(2, '0')}-${String(nowForEffect.getDate()).padStart(2, '0')}`
  const isSelectedTimePast = selectedDate === todayStrForEffect && selectedTime && (() => {
    const [h, m] = (selectedTime || '').split(':').map(Number)
    const slotTime = new Date()
    slotTime.setHours(h || 0, m || 0, 0, 0)
    return slotTime.getTime() <= Date.now()
  })()
  useEffect(() => {
    if (isSelectedTimePast && selectedTime) {
      onSelectTime('')
    }
  }, [isSelectedTimePast, selectedTime, onSelectTime])

  // Filter out past slots when selected date is today
  const now = new Date()
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  const isPastSlot = (slot: TimeSlot): boolean => {
    if (selectedDate !== todayStr) return false
    const [h, m] = slot.time.split(':').map(Number)
    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m || 0, 0, 0)
    return slotTime.getTime() <= now.getTime()
  }
  const effectiveSlots = slots.map(s => ({
    ...s,
    available: s.available && !isPastSlot(s)
  }))

  // Group slots by time period
  const morningSlots = effectiveSlots.filter(s => {
    const hour = parseInt(s.time.split(':')[0])
    return hour < 12
  })
  const afternoonSlots = effectiveSlots.filter(s => {
    const hour = parseInt(s.time.split(':')[0])
    return hour >= 12 && hour < 17
  })
  const eveningSlots = effectiveSlots.filter(s => {
    const hour = parseInt(s.time.split(':')[0])
    return hour >= 17
  })

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${min} ${ampm}`
  }

  const availableCount = effectiveSlots.filter(s => s.available).length

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-pulse" />
          Loading available times...
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-red-200 bg-red-50 p-4", className)}>
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Error loading slots</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchSlots}>
          Try again
        </Button>
      </div>
    )
  }

  if (scheduleInfo.message || availableCount === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed p-6 text-center", className)}>
        <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="font-medium text-muted-foreground">
          {scheduleInfo.message || 'No available slots'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Please select a different date
        </p>
      </div>
    )
  }

  const renderSlotGroup = (title: string, groupSlots: TimeSlot[]) => {
    if (groupSlots.length === 0) return null
    
    const availableInGroup = groupSlots.filter(s => s.available).length
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {availableInGroup} available
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {groupSlots.map(slot => (
            <Button
              key={slot.time}
              variant={selectedTime === slot.time ? 'default' : 'outline'}
              size="sm"
              disabled={!slot.available}
              onClick={() => onSelectTime(slot.time)}
              className={cn(
                "h-10 text-sm",
                !slot.available && "opacity-50 cursor-not-allowed line-through",
                selectedTime === slot.time && "ring-2 ring-primary"
              )}
            >
              {formatTime(slot.time)}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground capitalize">
            {scheduleInfo.dayOfWeek}
          </span>
          {scheduleInfo.openTime && scheduleInfo.closeTime && (
            <Badge variant="secondary" className="text-xs">
              {scheduleInfo.openTime} - {scheduleInfo.closeTime}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {availableCount} slots available
        </Badge>
      </div>

      {/* Slots by time period */}
      <div className="space-y-4">
        {renderSlotGroup('Morning', morningSlots)}
        {renderSlotGroup('Afternoon', afternoonSlots)}
        {renderSlotGroup('Evening', eveningSlots)}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary" />
          Selected
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border" />
          Available
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted opacity-50" />
          Unavailable
        </div>
      </div>
    </div>
  )
}

// Date picker with availability preview
interface DateSlotPickerProps {
  professionalId: string
  onSelectDateTime: (date: string, time: string) => void
  slotDuration?: number
  minDate?: string
  maxDaysAhead?: number
}

export function DateSlotPicker({
  professionalId,
  onSelectDateTime,
  slotDuration = 30,
  minDate,
  maxDaysAhead = 30
}: DateSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(today.setDate(diff))
  })

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    if (selectedDate) {
      onSelectDateTime(selectedDate, time)
    }
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return {
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
      isToday: date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
    }
  })

  const prevWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const nextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  const monthYear = currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Date selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Date
          </h3>
          <span className="text-sm text-muted-foreground">{monthYear}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 grid grid-cols-7 gap-1">
            {weekDates.map(day => (
              <Button
                key={day.date}
                variant={selectedDate === day.date ? 'default' : 'outline'}
                size="sm"
                disabled={day.isPast}
                onClick={() => handleDateSelect(day.date)}
                className={cn(
                  "h-16 flex flex-col items-center justify-center p-1",
                  day.isToday && "ring-2 ring-primary ring-offset-1",
                  day.isPast && "opacity-50"
                )}
              >
                <span className="text-xs text-muted-foreground">{day.dayName}</span>
                <span className="text-lg font-semibold">{day.dayNumber}</span>
                <span className="text-xs text-muted-foreground">{day.month}</span>
              </Button>
            ))}
          </div>
          
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Select Time
          </h3>
          <SlotPicker
            professionalId={professionalId}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectTime={handleTimeSelect}
            slotDuration={slotDuration}
          />
        </div>
      )}
    </div>
  )
}

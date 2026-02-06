'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Star, Moon, Flag
} from 'lucide-react'
import { 
  getAccurateHolidaysForYear, 
  getHolidaysForMonth,
  isRamadan,
  getRamadanForYear,
  DEFAULT_RAMADAN_SCHEDULE,
  type Holiday 
} from '@/lib/data/algeria-holidays'

interface DayInfo {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
  isOpen: boolean
  hasTimeOff: boolean
  isHoliday: boolean
  holiday?: Holiday
  isRamadan: boolean
  appointmentCount: number
  availableSlots: number
}

interface AvailabilityCalendarProps {
  professional: any
  onDateSelect?: (date: string) => void
}

export function AvailabilityCalendar({ professional, onDateSelect }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [days, setDays] = useState<DayInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [appointments, setAppointments] = useState<Record<string, number>>({})
  const [timeOffs, setTimeOffs] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [daySlots, setDaySlots] = useState<any>(null)
  const [showHolidays, setShowHolidays] = useState(true)
  const [autoCloseOnHolidays, setAutoCloseOnHolidays] = useState(true)
  const [useRamadanSchedule, setUseRamadanSchedule] = useState(true)
  const [disabledHolidays, setDisabledHolidays] = useState<string[]>([])
  const [customRamadanHours, setCustomRamadanHours] = useState<Record<string, { open: string; close: string; isOpen: boolean }> | null>(null)

  // Load holiday settings from API
  useEffect(() => {
    if (!professional?.id) return
    fetch(`/api/professionals/${professional.id}/holiday-settings`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setUseRamadanSchedule(data.settings.use_ramadan_schedule ?? true)
          setAutoCloseOnHolidays(data.settings.auto_close_on_holidays ?? true)
          setDisabledHolidays(data.settings.disabled_holidays || [])
          if (data.settings.ramadan_hours) {
            setCustomRamadanHours(data.settings.ramadan_hours)
          }
        }
      })
      .catch(err => console.error('Failed to load holiday settings:', err))
  }, [professional?.id])

  // Check if current month has Ramadan days
  const monthHasRamadan = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (isRamadan(d)) return true
    }
    return false
  }, [currentMonth])

  // Get working hours from professional
  const workingHours = professional?.working_hours as Record<string, { isOpen: boolean; open: string; close: string }> | null
  const unavailableDates = (professional?.unavailable_dates as string[]) || []

  // Get holidays for the current view (may span 2 years for month boundaries)
  const holidays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Get holidays for current year and adjacent months' years
    const holidayMap = new Map<string, Holiday>()
    
    const years = new Set([year])
    if (month === 0) years.add(year - 1)
    if (month === 11) years.add(year + 1)
    
    for (const y of years) {
      for (const h of getAccurateHolidaysForYear(y)) {
        holidayMap.set(h.date, h)
      }
    }
    
    return holidayMap
  }, [currentMonth])

  // Generate calendar days
  const generateDays = useCallback(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay() || 7 // Monday = 1
    const daysInMonth = lastDay.getDate()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const result: DayInfo[] = []
    
    // Add days from previous month
    const prevMonth = new Date(year, month, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = startDay - 1; i > 0; i--) {
      const dayNum = prevMonthDays - i + 1
      const date = new Date(year, month - 1, dayNum)
      const dateStr = date.toISOString().split('T')[0]
      const holiday = holidays.get(dateStr)
      
      result.push({
        date: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
        isPast: date < today,
        isOpen: false,
        hasTimeOff: false,
        isHoliday: !!holiday,
        holiday,
        isRamadan: isRamadan(dateStr),
        appointmentCount: 0,
        availableSlots: 0
      })
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const holiday = holidays.get(dateStr)
      const dayIsRamadan = isRamadan(dateStr)
      
      // Use Ramadan schedule if enabled and day is in Ramadan
      const ramadanSchedule = customRamadanHours || DEFAULT_RAMADAN_SCHEDULE
      const effectiveSchedule = (useRamadanSchedule && dayIsRamadan) 
        ? ramadanSchedule[dayOfWeek] 
        : workingHours?.[dayOfWeek]
      
      // Check if closed due to holiday (if auto-close is enabled and holiday is not disabled)
      const isHolidayDisabled = holiday && disabledHolidays.includes(holiday.name)
      const isHolidayClosed = showHolidays && autoCloseOnHolidays && holiday?.isPublicHoliday && !isHolidayDisabled
      
      const isOpen = effectiveSchedule?.isOpen && 
        !unavailableDates.includes(dateStr) && 
        !timeOffs.includes(dateStr) &&
        !isHolidayClosed
      
      result.push({
        date: dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        isOpen,
        hasTimeOff: unavailableDates.includes(dateStr) || timeOffs.includes(dateStr),
        isHoliday: !!holiday,
        isRamadan: dayIsRamadan,
        holiday,
        appointmentCount: appointments[dateStr] || 0,
        availableSlots: 0 // Will be calculated on click
      })
    }
    
    // Add days from next month to complete the grid
    const remaining = 42 - result.length // 6 rows x 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      const dateStr = date.toISOString().split('T')[0]
      const holiday = holidays.get(dateStr)
      
      result.push({
        date: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        isPast: false,
        isOpen: false,
        hasTimeOff: false,
        isHoliday: !!holiday,
        holiday,
        isRamadan: isRamadan(dateStr),
        appointmentCount: 0,
        availableSlots: 0
      })
    }
    
    setDays(result)
  }, [currentMonth, workingHours, unavailableDates, timeOffs, appointments, holidays, showHolidays, autoCloseOnHolidays, useRamadanSchedule, disabledHolidays, customRamadanHours])

  // Fetch appointments for the month
  const fetchAppointments = useCallback(async () => {
    if (!professional?.id) return
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    
    try {
      const res = await fetch(
        `/api/appointments?professional_id=${professional.id}&start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include', cache: 'no-store' }
      )
      
      if (res.ok) {
        const data = await res.json()
        const counts: Record<string, number> = {}
        
        for (const apt of data.appointments || []) {
          if (apt.status !== 'cancelled' && apt.status !== 'rejected') {
            const date = apt.appointment_date
            counts[date] = (counts[date] || 0) + 1
          }
        }
        
        setAppointments(counts)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }, [professional?.id, currentMonth])

  // Fetch time-off for the month
  const fetchTimeOffs = useCallback(async () => {
    if (!professional?.id) return
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    
    try {
      const res = await fetch(
        `/api/professionals/${professional.id}/time-off?status=approved&start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include', cache: 'no-store' }
      )
      
      if (res.ok) {
        const data = await res.json()
        const dates: string[] = []
        
        for (const req of data.requests || []) {
          if (req.all_day) {
            const start = new Date(req.start_date)
            const end = new Date(req.end_date)
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              dates.push(d.toISOString().split('T')[0])
            }
          }
        }
        
        setTimeOffs(dates)
      }
    } catch (error) {
      console.error('Error fetching time-off:', error)
    }
  }, [professional?.id, currentMonth])

  // Fetch slots for selected date
  const fetchDaySlots = useCallback(async (date: string) => {
    if (!professional?.id) return
    
    try {
      const res = await fetch(
        `/api/professionals/${professional.id}/slots?date=${date}&show_all=true`,
        { cache: 'no-store' }
      )
      
      if (res.ok) {
        const data = await res.json()
        setDaySlots(data)
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
    }
  }, [professional?.id])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchAppointments(), fetchTimeOffs()]).then(() => {
      setLoading(false)
    })
  }, [fetchAppointments, fetchTimeOffs])

  useEffect(() => {
    generateDays()
  }, [generateDays])

  useEffect(() => {
    if (selectedDate) {
      fetchDaySlots(selectedDate)
    } else {
      setDaySlots(null)
    }
  }, [selectedDate, fetchDaySlots])

  const handleDateClick = (day: DayInfo) => {
    if (day.isPast || !day.isCurrentMonth) return
    setSelectedDate(day.date)
    onDateSelect?.(day.date)
  }

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Availability Calendar
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Calendar settings */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-holidays"
                    checked={showHolidays}
                    onCheckedChange={setShowHolidays}
                  />
                  <Label htmlFor="show-holidays" className="text-xs">Holidays</Label>
                </div>
                {showHolidays && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-close"
                      checked={autoCloseOnHolidays}
                      onCheckedChange={setAutoCloseOnHolidays}
                    />
                    <Label htmlFor="auto-close" className="text-xs">Close on Holidays</Label>
                  </div>
                )}
                {monthHasRamadan && (
                  <div className="flex items-center gap-2 border-l pl-4">
                    <Switch
                      id="ramadan-schedule"
                      checked={useRamadanSchedule}
                      onCheckedChange={setUseRamadanSchedule}
                    />
                    <Label htmlFor="ramadan-schedule" className="text-xs flex items-center gap-1">
                      <Moon className="h-3 w-3" />
                      Ramadan Hours
                    </Label>
                  </div>
                )}
              </div>
              {/* Month navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium w-40 text-center">{monthName}</span>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Week headers */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid - fixed aspect for uniform day cell sizes */}
              <TooltipProvider>
              <div className="grid grid-cols-7 gap-1 [&>button]:aspect-square [&>button]:min-h-0">
                {days.map((day, i) => {
                  const isHolidayDay = showHolidays && day.isHoliday && day.holiday
                  const holidayTooltip = isHolidayDay ? `${day.holiday?.nameFr || day.holiday?.name}` : null
                  
                  const dayButton = (
                    <button
                      key={i}
                      onClick={() => handleDateClick(day)}
                      disabled={day.isPast || !day.isCurrentMonth}
                      className={cn(
                        "relative h-16 rounded-lg border p-1 text-left transition-colors",
                        day.isCurrentMonth ? "bg-background" : "bg-muted/30",
                        day.isToday && "ring-2 ring-primary",
                        day.isPast && "opacity-50 cursor-not-allowed",
                        !day.isPast && day.isCurrentMonth && "hover:border-primary cursor-pointer",
                        selectedDate === day.date && "border-primary bg-primary/5",
                        day.hasTimeOff && "bg-red-50 dark:bg-red-950/20",
                        isHolidayDay && day.holiday?.type === 'islamic' && "bg-emerald-50 dark:bg-emerald-950/20",
                        isHolidayDay && day.holiday?.type === 'national' && "bg-amber-50 dark:bg-amber-950/20",
                        day.isRamadan && useRamadanSchedule && !isHolidayDay && !day.hasTimeOff && "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
                        !day.isOpen && day.isCurrentMonth && !day.hasTimeOff && !isHolidayDay && !day.isRamadan && "bg-gray-50 dark:bg-gray-900/20"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className={cn(
                          "text-sm font-medium",
                          !day.isCurrentMonth && "text-muted-foreground",
                          day.isToday && "text-primary"
                        )}>
                          {day.dayNumber}
                        </span>
                        {isHolidayDay && (
                          <span className={cn(
                            "text-xs",
                            day.holiday?.type === 'islamic' ? "text-emerald-600" : "text-amber-600"
                          )}>
                            {day.holiday?.type === 'islamic' ? <Moon className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    
                    {/* Status indicators */}
                      {day.isCurrentMonth && (
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          {day.hasTimeOff ? (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              Off
                            </Badge>
                          ) : isHolidayDay ? (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] px-1 py-0",
                                day.holiday?.type === 'islamic' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              )}
                            >
                              {day.holiday?.type === 'islamic' ? 'Eid' : 'Fête'}
                            </Badge>
                          ) : !day.isOpen ? (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Closed
                            </Badge>
                          ) : null}
                          
                          {day.appointmentCount > 0 && (
                            <Badge variant="default" className="text-[10px] px-1 py-0 ml-auto">
                              {day.appointmentCount}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  )
                  
                  // Wrap with tooltip if holiday
                  if (holidayTooltip && day.isCurrentMonth) {
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          {dayButton}
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-medium">{day.holiday?.nameFr}</p>
                            {day.holiday?.nameAr && <p className="text-xs text-muted-foreground">{day.holiday?.nameAr}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }
                  
                  return dayButton
                })}
              </div>
              </TooltipProvider>
              
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded border-2 border-primary" />
                  Today
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                  Time Off
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                  Closed
                </div>
                {showHolidays && (
                  <>
                    <div className="flex items-center gap-1">
                      <Flag className="h-3 w-3 text-amber-600" />
                      National
                    </div>
                    <div className="flex items-center gap-1">
                      <Moon className="h-3 w-3 text-emerald-600" />
                      Islamic
                    </div>
                  </>
                )}
                {monthHasRamadan && useRamadanSchedule && (
                  <div className="flex items-center gap-1 border-l pl-2">
                    <div className="w-3 h-3 rounded bg-purple-100 dark:bg-purple-900/30" />
                    Ramadan
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Badge variant="default" className="text-[10px] px-1 py-0">3</Badge>
                  Appointments
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day details */}
      {selectedDate && daySlots && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {daySlots.message ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{daySlots.message}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {daySlots.openTime} - {daySlots.closeTime}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {daySlots.availableSlots} of {daySlots.totalSlots} slots available
                  </span>
                </div>
                
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                  {daySlots.slots?.map((slot: any) => (
                    <div
                      key={slot.time}
                      className={cn(
                        "text-center py-2 px-1 rounded text-xs font-medium",
                        slot.available 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 line-through"
                      )}
                    >
                      {slot.time}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Available
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    Booked/Blocked
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

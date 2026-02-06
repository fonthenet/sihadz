'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar,
  Clock,
  Save,
  Coffee,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Schedule {
  id?: string
  dayOfWeek: number
  startTime: string | null
  endTime: string | null
  isDayOff: boolean
  breakStart: string | null
  breakEnd: string | null
  notes: string | null
}

interface Employee {
  id: string
  display_name: string
  username: string
}

interface ScheduleEditorProps {
  professional: {
    id: string
  }
  employee: Employee
  onClose: () => void
}

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
]

export function ScheduleEditor({ professional, employee, onClose }: ScheduleEditorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])

  // Initialize with all 7 days
  const initializeSchedules = useCallback((existingSchedules: any[]) => {
    const scheduleMap = new Map(existingSchedules.map((s) => [s.day_of_week, s]))
    
    return DAYS.map((day) => {
      const existing = scheduleMap.get(day.value)
      if (existing) {
        return {
          id: existing.id,
          dayOfWeek: existing.day_of_week,
          startTime: existing.start_time,
          endTime: existing.end_time,
          isDayOff: existing.is_day_off,
          breakStart: existing.break_start,
          breakEnd: existing.break_end,
          notes: existing.notes,
        }
      }
      // Default: work day with standard hours
      return {
        dayOfWeek: day.value,
        startTime: '09:00',
        endTime: '17:00',
        isDayOff: day.value === 5 || day.value === 6, // Fri & Sat off by default (Algeria)
        breakStart: null,
        breakEnd: null,
        notes: null,
      }
    })
  }, [])

  const loadSchedules = useCallback(async () => {
    if (!professional?.id || !employee?.id) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/professionals/${professional.id}/schedules?employeeId=${employee.id}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const { schedules: data } = await res.json()
        setSchedules(initializeSchedules(data || []))
      } else {
        setSchedules(initializeSchedules([]))
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
      setSchedules(initializeSchedules([]))
    } finally {
      setLoading(false)
    }
  }, [professional?.id, employee?.id, initializeSchedules])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const updateSchedule = (dayOfWeek: number, updates: Partial<Schedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...updates } : s))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/professionals/${professional.id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employeeId: employee.id,
          schedules: schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.isDayOff ? null : s.startTime,
            endTime: s.isDayOff ? null : s.endTime,
            isDayOff: s.isDayOff,
            breakStart: s.breakStart,
            breakEnd: s.breakEnd,
            notes: s.notes,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to save schedule', variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Schedule saved successfully' })
      onClose()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save schedule', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const applyToAllWorkdays = (schedule: Schedule) => {
    setSchedules((prev) =>
      prev.map((s) =>
        !s.isDayOff && s.dayOfWeek !== schedule.dayOfWeek
          ? {
              ...s,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              breakStart: schedule.breakStart,
              breakEnd: schedule.breakEnd,
            }
          : s
      )
    )
    toast({ title: 'Applied', description: 'Schedule applied to all work days' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Weekly Schedule</h3>
          <p className="text-sm text-muted-foreground">
            Set working hours for {employee.display_name}
          </p>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-3">
        {schedules.map((schedule) => {
          const day = DAYS.find((d) => d.value === schedule.dayOfWeek)!
          return (
            <div
              key={schedule.dayOfWeek}
              className={cn(
                'p-4 border rounded-lg transition-colors',
                schedule.isDayOff ? 'bg-muted/50' : 'bg-card'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Day Name */}
                <div className="w-24 flex-shrink-0">
                  <p className="font-medium">{day.label}</p>
                </div>

                {/* Day Off Toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!schedule.isDayOff}
                    onCheckedChange={(checked) =>
                      updateSchedule(schedule.dayOfWeek, { isDayOff: !checked })
                    }
                  />
                  <span className="text-sm text-muted-foreground w-16">
                    {schedule.isDayOff ? 'Day off' : 'Working'}
                  </span>
                </div>

                {/* Time Selectors */}
                {!schedule.isDayOff && (
                  <>
                    <div className="flex items-center gap-2">
                      <Select
                        value={schedule.startTime || '09:00'}
                        onValueChange={(v) => updateSchedule(schedule.dayOfWeek, { startTime: v })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">to</span>
                      <Select
                        value={schedule.endTime || '17:00'}
                        onValueChange={(v) => updateSchedule(schedule.dayOfWeek, { endTime: v })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Break Time */}
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={schedule.breakStart || '__none__'}
                        onValueChange={(v) =>
                          updateSchedule(schedule.dayOfWeek, {
                            breakStart: v === '__none__' ? null : v,
                            breakEnd: v === '__none__' ? null : schedule.breakEnd || '13:30',
                          })
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Break" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No break</SelectItem>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {schedule.breakStart && (
                        <>
                          <span className="text-muted-foreground">-</span>
                          <Select
                            value={schedule.breakEnd || '13:30'}
                            onValueChange={(v) =>
                              updateSchedule(schedule.dayOfWeek, { breakEnd: v })
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>

                    {/* Apply to All Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => applyToAllWorkdays(schedule)}
                    >
                      Apply to all
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <LoadingSpinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Schedule
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Wrapper dialog component for use in employee list
interface ScheduleEditorDialogProps {
  professional: { id: string }
  employee: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleEditorDialog({
  professional,
  employee,
  open,
  onOpenChange,
}: ScheduleEditorDialogProps) {
  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Employee Schedule
          </DialogTitle>
          <DialogDescription>
            Configure weekly working hours for {employee.display_name}
          </DialogDescription>
        </DialogHeader>

        <ScheduleEditor
          professional={professional}
          employee={employee}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

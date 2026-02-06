'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, CalendarDays, XCircle, Plus, Save, Moon, Flag, Star } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { 
  getAccurateHolidaysForYear, 
  getRamadanForYear, 
  DEFAULT_RAMADAN_SCHEDULE,
  type Holiday 
} from '@/lib/data/algeria-holidays'

interface PracticeScheduleSettingsProps {
  professional: any
  onUpdate: () => void
}

export default function PracticeScheduleSettings({ professional, onUpdate }: PracticeScheduleSettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [acceptingPatients, setAcceptingPatients] = useState(true)
  const [autoConfirmAppointments, setAutoConfirmAppointments] = useState(false)
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; isOpen: boolean }>>({})
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [useRamadanSchedule, setUseRamadanSchedule] = useState(true)
  const [autoCloseOnHolidays, setAutoCloseOnHolidays] = useState(true)
  const [ramadanHours, setRamadanHours] = useState<Record<string, { open: string; close: string; isOpen: boolean }>>(DEFAULT_RAMADAN_SCHEDULE)
  const [ramadanStartOverride, setRamadanStartOverride] = useState('')
  const [ramadanEndOverride, setRamadanEndOverride] = useState('')
  const [disabledHolidays, setDisabledHolidays] = useState<string[]>([])
  const [savingHolidays, setSavingHolidays] = useState(false)
  
  // Get holidays for current and next year
  const currentYear = new Date().getFullYear()
  const holidays = [...getAccurateHolidaysForYear(currentYear), ...getAccurateHolidaysForYear(currentYear + 1)]
    .filter(h => new Date(h.date) >= new Date())
    .slice(0, 15) // Show next 15 holidays
  const ramadan = getRamadanForYear(currentYear) || getRamadanForYear(currentYear + 1)

  // Load holiday settings
  useEffect(() => {
    if (!professional?.id) return
    fetch(`/api/professionals/${professional.id}/holiday-settings`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setUseRamadanSchedule(data.settings.use_ramadan_schedule ?? true)
          setAutoCloseOnHolidays(data.settings.auto_close_on_holidays ?? true)
          if (data.settings.ramadan_hours) setRamadanHours(data.settings.ramadan_hours)
          setRamadanStartOverride(data.settings.ramadan_start_override || '')
          setRamadanEndOverride(data.settings.ramadan_end_override || '')
          setDisabledHolidays(data.settings.disabled_holidays || [])
        }
      })
      .catch(err => console.error('Failed to load holiday settings:', err))
  }, [professional?.id])

  // Save holiday settings
  const saveHolidaySettings = async () => {
    if (!professional?.id) return
    setSavingHolidays(true)
    try {
      const res = await fetch(`/api/professionals/${professional.id}/holiday-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          use_ramadan_schedule: useRamadanSchedule,
          ramadan_hours: ramadanHours,
          ramadan_start_override: ramadanStartOverride || null,
          ramadan_end_override: ramadanEndOverride || null,
          auto_close_on_holidays: autoCloseOnHolidays,
          disabled_holidays: disabledHolidays
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Saved', description: 'Holiday settings updated' })
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSavingHolidays(false)
    }
  }

  const toggleHoliday = (holidayName: string) => {
    setDisabledHolidays(prev => 
      prev.includes(holidayName) 
        ? prev.filter(h => h !== holidayName)
        : [...prev, holidayName]
    )
  }

  useEffect(() => {
    if (professional?.is_active !== undefined) setAcceptingPatients(!!professional.is_active)
  }, [professional?.is_active])

  useEffect(() => {
    if (professional?.auto_confirm_appointments !== undefined) setAutoConfirmAppointments(!!professional.auto_confirm_appointments)
  }, [professional?.auto_confirm_appointments])

  useEffect(() => {
    if (professional?.working_hours && typeof professional.working_hours === 'object') {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
      const wh: Record<string, { open: string; close: string; isOpen: boolean }> = {}
      days.forEach(d => {
        const v = (professional.working_hours as Record<string, { open?: string; close?: string; isOpen?: boolean }>)[d]
        wh[d] = v && typeof v.open === 'string' && typeof v.close === 'string'
          ? { open: v.open, close: v.close, isOpen: v.isOpen !== false }
          : { open: '09:00', close: '17:00', isOpen: true }
      })
      setWorkingHours(wh)
    }
    if (Array.isArray(professional?.unavailable_dates)) {
      setUnavailableDates(professional.unavailable_dates.filter((d: unknown) => typeof d === 'string'))
    } else {
      setUnavailableDates([])
    }
  }, [professional?.working_hours, professional?.unavailable_dates])

  const handleAcceptingPatientsChange = useCallback(async (checked: boolean) => {
    setAcceptingPatients(checked)
    if (!professional?.id) return
    const supabase = createBrowserClient()
    const { error } = await supabase.from('professionals').update({ is_active: checked }).eq('id', professional.id)
    if (error) {
      setAcceptingPatients(!checked)
      toast({ title: 'Error', description: 'Could not update availability.', variant: 'destructive' })
    } else {
      toast({ title: checked ? 'Accepting patients' : 'Not accepting new patients' })
      onUpdate()
    }
  }, [professional?.id, toast, onUpdate])

  const handleAutoConfirmChange = useCallback(async (checked: boolean) => {
    setAutoConfirmAppointments(checked)
    if (!professional?.id) return
    try {
      const res = await fetch('/api/professional/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_confirm_appointments: checked }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAutoConfirmAppointments(!checked)
        toast({ title: 'Error', description: data?.error || 'Could not update setting.', variant: 'destructive' })
        return
      }
      toast({ title: checked ? 'Auto-confirm on' : 'Manual confirm' })
      onUpdate()
    } catch {
      setAutoConfirmAppointments(!checked)
      toast({ title: 'Error', description: 'Could not update setting.', variant: 'destructive' })
    }
  }, [professional?.id, toast, onUpdate])

  const saveWorkScheduleAndHolidays = useCallback(async () => {
    if (!professional?.id) return
    setSaving(true)
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('professionals')
      .update({
        working_hours: Object.keys(workingHours).length ? workingHours : professional.working_hours ?? {},
        unavailable_dates: unavailableDates,
      })
      .eq('id', professional.id)
    setSaving(false)
    if (error) {
      toast({ title: 'Error', description: error.message || 'Could not save settings.', variant: 'destructive' })
    } else {
      toast({ title: 'Saved', description: 'Work schedule and holidays updated.' })
      onUpdate()
    }
  }, [professional?.id, professional?.working_hours, workingHours, unavailableDates, toast, onUpdate])

  const proType = professional?.type || 'doctor'
  const labels = {
    doctor: {
      acceptTitle: 'Accept New Patients',
      acceptDesc: 'Allow new patients to book appointments. Turn on and set work schedule below to be bookable.',
      autoConfirmTitle: 'Auto-confirm appointments',
      autoConfirmDesc: 'When on, new bookings are confirmed automatically. When off, you must confirm each appointment manually.',
    },
    pharmacy: {
      acceptTitle: 'Accept prescriptions & orders',
      acceptDesc: 'Show as available for prescription fulfillment and online orders. Turn on and set work schedule below.',
      autoConfirmTitle: 'Auto-confirm orders',
      autoConfirmDesc: 'When on, new orders are confirmed automatically. When off, you must confirm each order manually.',
    },
    laboratory: {
      acceptTitle: 'Accept lab requests',
      acceptDesc: 'Accept new lab test requests. Turn on and set work schedule below to be bookable.',
      autoConfirmTitle: 'Auto-confirm requests',
      autoConfirmDesc: 'When on, new lab requests are confirmed automatically. When off, you must confirm each request manually.',
    },
    clinic: {
      acceptTitle: 'Accept new patients',
      acceptDesc: 'Allow new patients to book appointments. Turn on and set work schedule below to be bookable.',
      autoConfirmTitle: 'Auto-confirm appointments',
      autoConfirmDesc: 'When on, new bookings are confirmed automatically. When off, you must confirm each appointment manually.',
    },
    ambulance: {
      acceptTitle: 'Accept service requests',
      acceptDesc: 'Show as available for ambulance bookings. Turn on and set work schedule below.',
      autoConfirmTitle: 'Auto-confirm requests',
      autoConfirmDesc: 'When on, new requests are confirmed automatically. When off, you must confirm each request manually.',
    },
  }
  const l = labels[proType as keyof typeof labels] || labels.doctor

  return (
    <div className="space-y-6">
      {/* Practice preferences — all business types */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Preferences</CardTitle>
          <CardDescription>Control availability and booking behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">{l.acceptTitle}</Label>
              <p className="text-sm text-muted-foreground">{l.acceptDesc}</p>
            </div>
            <Switch checked={acceptingPatients} onCheckedChange={handleAcceptingPatientsChange} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">{l.autoConfirmTitle}</Label>
              <p className="text-sm text-muted-foreground">{l.autoConfirmDesc}</p>
            </div>
            <Switch checked={autoConfirmAppointments} onCheckedChange={handleAutoConfirmChange} />
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule & Holidays — single card with tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Schedule & Availability
          </CardTitle>
          <CardDescription>Set your weekly hours and block dates when you're unavailable. Customers and patients see this when booking.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
              <TabsTrigger value="schedule" className="gap-2">
                <Clock className="h-4 w-4" />
                Work Schedule
              </TabsTrigger>
              <TabsTrigger value="algeria-holidays" className="gap-2">
                <Star className="h-4 w-4" />
                Algeria Holidays
              </TabsTrigger>
              <TabsTrigger value="holidays" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Time Off
                {unavailableDates.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {unavailableDates.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-0 space-y-4">
              <div className="rounded-lg border overflow-hidden min-w-[520px]">
                <table className="w-full text-sm table-fixed" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left font-semibold p-4 w-[140px]">Day</th>
                      <th className="text-left font-semibold p-4 w-[100px]">Open</th>
                      <th className="text-left font-semibold p-4 w-[100px]">Close</th>
                      <th className="text-left font-semibold p-4 w-[120px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day, i) => {
                      const label = day.charAt(0).toUpperCase() + day.slice(1)
                      const val = workingHours[day] ?? { open: '09:00', close: '17:00', isOpen: true }
                      return (
                        <tr
                          key={day}
                          className={cn(
                            'border-b last:border-0 transition-colors hover:bg-muted/20',
                            i % 2 === 1 && 'bg-muted/10'
                          )}
                        >
                          <td className="p-4 font-medium">{label}</td>
                          <td className="p-4">
                            <Input
                              type="time"
                              className="h-9 w-24"
                              value={val.open}
                              disabled={!val.isOpen}
                              onChange={e =>
                                setWorkingHours(prev => ({ ...prev, [day]: { ...val, open: e.target.value } }))
                              }
                            />
                          </td>
                          <td className="p-4">
                            <Input
                              type="time"
                              className="h-9 w-24"
                              value={val.close}
                              disabled={!val.isOpen}
                              onChange={e =>
                                setWorkingHours(prev => ({ ...prev, [day]: { ...val, close: e.target.value } }))
                              }
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={val.isOpen}
                                onCheckedChange={checked =>
                                  setWorkingHours(prev => ({ ...prev, [day]: { ...val, isOpen: checked } }))
                                }
                              />
                              <span className={cn('text-xs font-medium', val.isOpen ? 'text-emerald-600' : 'text-muted-foreground')}>
                                {val.isOpen ? 'Open' : 'Closed'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveWorkScheduleAndHolidays} disabled={saving}>
                  {saving ? <LoadingSpinner size="sm" className="me-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save schedule
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="algeria-holidays" className="mt-0 space-y-6">
              {/* Ramadan Schedule */}
              <div className="rounded-lg border p-4 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Ramadan Schedule</h4>
                      <p className="text-xs text-muted-foreground">
                        Default: {ramadan ? `${new Date(ramadan.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${new Date(ramadan.end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={useRamadanSchedule} 
                      onCheckedChange={setUseRamadanSchedule}
                    />
                    <Label className="text-sm">Enable</Label>
                  </div>
                </div>
                
                {useRamadanSchedule && (
                  <div className="space-y-4">
                    {/* Custom Ramadan dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Override Start Date</Label>
                        <Input 
                          type="date" 
                          value={ramadanStartOverride}
                          onChange={e => setRamadanStartOverride(e.target.value)}
                          placeholder={ramadan?.start}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Override End Date</Label>
                        <Input 
                          type="date" 
                          value={ramadanEndOverride}
                          onChange={e => setRamadanEndOverride(e.target.value)}
                          placeholder={ramadan?.end}
                          className="h-9"
                        />
                      </div>
                    </div>
                    
                    {/* Ramadan working hours - all 7 days */}
                    <div>
                      <Label className="text-xs mb-2 block">Ramadan Working Hours (All Week)</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const).map(day => (
                          <div key={day} className="bg-white dark:bg-slate-800 rounded p-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize text-xs">{day.slice(0, 3)}</span>
                              <Switch
                                checked={ramadanHours[day]?.isOpen !== false}
                                onCheckedChange={checked => setRamadanHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], isOpen: checked }
                                }))}
                                className="scale-75"
                              />
                            </div>
                            {ramadanHours[day]?.isOpen !== false && (
                              <div className="space-y-1">
                                <Input
                                  type="time"
                                  value={ramadanHours[day]?.open || '09:00'}
                                  onChange={e => setRamadanHours(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], open: e.target.value }
                                  }))}
                                  className="h-7 text-xs p-1"
                                />
                                <Input
                                  type="time"
                                  value={ramadanHours[day]?.close || '15:00'}
                                  onChange={e => setRamadanHours(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], close: e.target.value }
                                  }))}
                                  className="h-7 text-xs p-1"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-close on holidays */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-amber-600" />
                  <div>
                    <h4 className="font-medium">Auto-close on Public Holidays</h4>
                    <p className="text-xs text-muted-foreground">Automatically mark as closed on enabled holidays below</p>
                  </div>
                </div>
                <Switch 
                  checked={autoCloseOnHolidays} 
                  onCheckedChange={setAutoCloseOnHolidays}
                />
              </div>

              {/* Upcoming Holidays List with toggles */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Algerian Holidays</h4>
                    <p className="text-xs text-muted-foreground">Toggle holidays you observe. Disabled = open that day.</p>
                  </div>
                </div>
                <div className="divide-y max-h-80 overflow-y-auto">
                  {holidays.map((holiday, i) => {
                    const isDisabled = disabledHolidays.includes(holiday.name)
                    return (
                      <div key={i} className={cn(
                        "flex items-center justify-between p-3 hover:bg-muted/30 transition-colors",
                        isDisabled && "opacity-50"
                      )}>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={!isDisabled}
                            onCheckedChange={() => toggleHoliday(holiday.name)}
                          />
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            holiday.type === 'islamic' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {holiday.type === 'islamic' ? <Moon className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className={cn("font-medium text-sm", isDisabled && "line-through")}>{holiday.nameFr}</p>
                            <p className="text-xs text-muted-foreground">{holiday.nameAr}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(holiday.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {holiday.type === 'islamic' ? 'Islamique' : 'National'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button onClick={saveHolidaySettings} disabled={savingHolidays}>
                  {savingHolidays ? <LoadingSpinner size="sm" className="me-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Holiday Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="holidays" className="mt-0 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="new-holiday-date" className="text-xs text-muted-foreground mb-1.5 block">Add a date</Label>
                  <Input
                    id="new-holiday-date"
                    type="date"
                    className="h-10"
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return
                      const el = document.getElementById('new-holiday-date') as HTMLInputElement
                      const v = el?.value
                      if (v && !unavailableDates.includes(v)) {
                        setUnavailableDates(prev => [...prev, v].sort())
                        el.value = ''
                      }
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2"
                    onClick={() => {
                      const el = document.getElementById('new-holiday-date') as HTMLInputElement
                      const v = el?.value
                      if (v && !unavailableDates.includes(v)) {
                        setUnavailableDates(prev => [...prev, v].sort())
                        el.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add date
                  </Button>
                </div>
              </div>

              {unavailableDates.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 border-b">
                    <p className="text-sm font-medium">Blocked dates ({unavailableDates.length})</p>
                    <p className="text-xs text-muted-foreground">Click × to remove a date</p>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {unavailableDates.map(d => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium"
                      >
                        {new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        <button
                          type="button"
                          className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                          onClick={() => setUnavailableDates(prev => prev.filter(x => x !== d))}
                          aria-label={`Remove ${d}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No blocked dates</p>
                  <p className="text-xs text-muted-foreground mt-1">Add holidays or time off above. These dates won't be available for booking.</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={saveWorkScheduleAndHolidays} disabled={saving} variant="outline">
                  {saving ? <LoadingSpinner size="sm" className="me-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save holidays
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

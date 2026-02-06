'use client'

import React, { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Syringe, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const t = {
  en: {
    title: 'Vaccinations',
    back: 'Back to Family',
    loading: 'Loading...',
    summary: 'Vaccination summary',
    completed: 'Completed',
    overdue: 'Overdue',
    due: 'Due',
    recordVaccine: 'Record vaccination',
    administeredDate: 'Date administered',
    doseNumber: 'Dose number',
    lotNumber: 'Lot number (optional)',
    vaccine: 'Vaccine',
    selectVaccine: 'Select vaccine',
    save: 'Save',
    cancel: 'Cancel',
    schedule: 'Schedule',
    received: 'Received',
    notYet: 'Not yet',
    mandatory: 'Mandatory',
    free: 'Free',
  },
  fr: {
    title: 'Vaccinations',
    back: 'Retour à la famille',
    loading: 'Chargement...',
    summary: 'Résumé des vaccinations',
    completed: 'Complété',
    overdue: 'En retard',
    due: 'À faire',
    recordVaccine: 'Enregistrer une vaccination',
    administeredDate: 'Date d\'administration',
    doseNumber: 'Numéro de dose',
    lotNumber: 'Numéro de lot (optionnel)',
    vaccine: 'Vaccin',
    selectVaccine: 'Choisir un vaccin',
    save: 'Enregistrer',
    cancel: 'Annuler',
    schedule: 'Calendrier',
    received: 'Reçu',
    notYet: 'Pas encore',
    mandatory: 'Obligatoire',
    free: 'Gratuit',
  },
  ar: {
    title: 'التطعيمات',
    back: 'العودة للعائلة',
    loading: 'جاري التحميل...',
    summary: 'ملخص التطعيمات',
    completed: 'مكتمل',
    overdue: 'متأخر',
    due: 'مطلوب',
    recordVaccine: 'تسجيل تطعيم',
    administeredDate: 'تاريخ الإعطاء',
    doseNumber: 'رقم الجرعة',
    lotNumber: 'رقم الدفعة (اختياري)',
    vaccine: 'اللقاح',
    selectVaccine: 'اختر اللقاح',
    save: 'حفظ',
    cancel: 'إلغاء',
    schedule: 'الجدول',
    received: 'تم',
    notYet: 'لم بعد',
    mandatory: 'إلزامي',
    free: 'مجاني',
  },
}

export default function FamilyVaccinationsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()
  const labels = t[language as keyof typeof t] || t.en

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formVaccineId, setFormVaccineId] = useState<string>('')
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formDose, setFormDose] = useState('1')
  const [formLot, setFormLot] = useState('')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [memberRes, vaxRes] = await Promise.all([
          fetch(`/api/family-members/${id}`),
          fetch(`/api/family-members/${id}/vaccinations`),
        ])
        if (!memberRes.ok) {
          if (memberRes.status === 404) {
            router.replace('/family')
            return
          }
          throw new Error('Failed to load member')
        }
        const memberData = await memberRes.json()
        setMember(memberData)

        if (vaxRes.ok) {
          const vaxData = await vaxRes.json()
          setRecords(vaxData.records || [])
          setSchedule(vaxData.schedule || [])
          setSummary(vaxData.summary || null)
        }
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
        router.replace('/family')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router, toast])

  const handleRecordVaccine = async () => {
    if (!formVaccineId || !formDate) return
    setSaving(true)
    try {
      const res = await fetch(`/api/family-members/${id}/vaccinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccine_id: formVaccineId,
          administered_date: formDate,
          dose_number: parseInt(formDose, 10),
          lot_number: formLot || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      toast({ title: labels.completed, description: 'Vaccination recorded.' })
      setAddDialogOpen(false)
      setFormVaccineId('')
      setFormDate(format(new Date(), 'yyyy-MM-dd'))
      setFormDose('1')
      setFormLot('')
      const vaxRes = await fetch(`/api/family-members/${id}/vaccinations`)
      if (vaxRes.ok) {
        const vaxData = await vaxRes.json()
        setRecords(vaxData.records || [])
        setSchedule(vaxData.schedule || [])
        setSummary(vaxData.summary || null)
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const pendingVaccines = schedule?.filter((s: any) => s.vaccine && !s.received) || []
  const receivedIds = new Set(records.map((r: any) => r.vaccine_id))

  if (loading) {
    return <SectionLoading minHeight="min-h-[200px]" label={labels.loading} />
  }

  if (!member) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/family">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Syringe className="h-6 w-6 text-primary" />
                {labels.title} – {member.full_name}
              </h1>
              <p className="text-muted-foreground text-sm">{labels.schedule}</p>
            </div>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {labels.recordVaccine}
          </Button>
        </div>

        {summary && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{labels.summary}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>{summary.completed} / {summary.mandatoryTotal} {labels.mandatory}</span>
                </div>
                {summary.overdueCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {summary.overdueCount} {labels.overdue}
                  </Badge>
                )}
                {summary.dueCount > 0 && summary.overdueCount === 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {summary.dueCount} {labels.due}
                  </Badge>
                )}
              </div>
              <Progress value={summary.completionPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {schedule.map((item: any) => {
            const vaccine = item.vaccine
            if (!vaccine) return null
            const received = item.received || receivedIds.has(vaccine.id)
            const record = records.find((r: any) => r.vaccine_id === vaccine.id)

            return (
              <Card key={vaccine.id} className={received ? 'border-green-200 dark:border-green-900/50' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{vaccine.name || vaccine.code}</p>
                        {vaccine.is_mandatory && (
                          <Badge variant="outline" className="text-xs">{labels.mandatory}</Badge>
                        )}
                        {vaccine.is_free && (
                          <Badge variant="secondary" className="text-xs">{labels.free}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {vaccine.recommended_age}
                        {vaccine.disease_prevention && ` • ${vaccine.disease_prevention}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {received ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {labels.received}
                          {record?.administered_date && (
                            <span className="ml-1">
                              ({format(new Date(record.administered_date), 'dd/MM/yyyy', { locale: fr })})
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {item.status === 'overdue' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {labels.notYet}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.recordVaccine}</DialogTitle>
            <DialogDescription>{member.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{labels.vaccine} *</Label>
              <Select value={formVaccineId} onValueChange={setFormVaccineId}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.selectVaccine} />
                </SelectTrigger>
                <SelectContent>
                  {pendingVaccines
                    .filter((s: any) => s.vaccine?.id)
                    .map((s: any) => (
                      <SelectItem key={s.vaccine.id} value={s.vaccine.id}>
                        {s.vaccine?.name || s.vaccine?.code} – {s.vaccine?.recommended_age || ''}
                      </SelectItem>
                    ))}
                  {pendingVaccines.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      All vaccines recorded
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{labels.administeredDate} *</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{labels.doseNumber}</Label>
              <Select value={formDose} onValueChange={setFormDose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>Dose {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{labels.lotNumber}</Label>
              <Input
                value={formLot}
                onChange={(e) => setFormLot(e.target.value)}
                placeholder="e.g. ABC123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {labels.cancel}
            </Button>
            <Button
              onClick={handleRecordVaccine}
              disabled={!formVaccineId || saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

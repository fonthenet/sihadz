'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Brain,
  Sparkles,
  AlertTriangle,
  Stethoscope,
  Activity,
  Thermometer,
  Scale,
  Heart,
  FileText,
  ChevronDown,
  ChevronUp,
  Share2,
  Edit3,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface AppointmentData {
  id: string
  patient_display_name?: string
  patient?: { full_name?: string; date_of_birth?: string; gender?: string }
  notes?: string
  symptoms?: string
  allergies?: string | null
}

interface AiPatientAnalysisCardProps {
  appointment: AppointmentData
  doctorId: string
}

interface AnalysisResult {
  differential_diagnosis?: { condition: string; likelihood: string; rationale: string }[]
  suggested_workup?: (string | Record<string, unknown>)[]
  treatment_suggestions?: { category: string; suggestion: string }[]
  red_flags?: string[]
  follow_up_recommendations?: string
  clinical_pearls?: string[]
  raw?: string
}

/** Normalize AI output that may return objects instead of strings (e.g. suggested_workup as [{ "Test name": "desc" }]) */
function toDisplayString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const parts = Object.entries(obj).map(([k, v]) => (v != null && v !== '' ? `${k}: ${String(v)}` : k))
    return parts.join(' • ')
  }
  return String(value)
}

export function AiPatientAnalysisCard({ appointment, doctorId }: AiPatientAnalysisCardProps) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [allergies, setAllergies] = useState('')
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('')
  const [physicalExam, setPhysicalExam] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    respiratoryRate: '',
  })
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [sharedWithPatient, setSharedWithPatient] = useState(false)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [existingLoaded, setExistingLoaded] = useState(false)
  const [showEditContext, setShowEditContext] = useState(false)

  // Pre-fill from appointment
  useEffect(() => {
    const notes = appointment.notes || appointment.symptoms || ''
    setChiefComplaint(notes)
    if (appointment.allergies) setAllergies(typeof appointment.allergies === 'string' ? appointment.allergies : '')
  }, [appointment.notes, appointment.symptoms, appointment.allergies])

  // Load existing analysis if any
  useEffect(() => {
    if (!appointment.id || existingLoaded) return
    const load = async () => {
      try {
        const res = await fetch(`/api/analyze-patient?appointmentId=${appointment.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.analysis) {
            setAnalysis(data.analysis)
            setSharedWithPatient(data.sharedWithPatient ?? false)
            if (data.inputData) {
              setChiefComplaint(data.inputData.chiefComplaint || '')
              setAllergies(data.inputData.allergies || '')
              setHistoryOfPresentIllness(data.inputData.historyOfPresentIllness || '')
              setPhysicalExam(data.inputData.physicalExam || '')
              setClinicalNotes(data.inputData.clinicalNotes || '')
              if (data.inputData.vitals) setVitals((v) => ({ ...v, ...data.inputData.vitals }))
            }
          }
        }
      } catch {
        // No existing analysis
      } finally {
        setExistingLoaded(true)
      }
    }
    load()
  }, [appointment.id, existingLoaded])

  const handleGenerate = async () => {
    if (!chiefComplaint?.trim()) {
      toast({ title: 'Chief complaint required', description: 'Please enter the reason for visit.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/analyze-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          inputData: {
            chiefComplaint: chiefComplaint.trim(),
            historyOfPresentIllness: historyOfPresentIllness.trim() || undefined,
            vitals: {
              bloodPressure: vitals.bloodPressure.trim() || undefined,
              heartRate: vitals.heartRate.trim() || undefined,
              temperature: vitals.temperature.trim() || undefined,
              weight: vitals.weight.trim() || undefined,
              respiratoryRate: vitals.respiratoryRate.trim() || undefined,
            },
            physicalExam: physicalExam.trim() || undefined,
            clinicalNotes: clinicalNotes.trim() || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate analysis')
      setAnalysis(data.analysis)
      setExpanded(true)
      toast({ title: 'Analysis generated', description: 'Review the AI suggestions below.' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to generate analysis.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleShareToggle = async (checked: boolean) => {
    try {
      const res = await fetch('/api/analyze-patient', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id, sharedWithPatient: checked }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSharedWithPatient(checked)
      toast({ title: checked ? 'Shared with patient' : 'Unshared from patient' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const hasAnalysis = !!analysis

  return (
    <Card className="border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50/50 via-white to-cyan-50/30 dark:from-violet-950/20 dark:via-background dark:to-cyan-950/10">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
              <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Patient Analysis
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-200">
                  Premium
                </Badge>
              </CardTitle>
              <CardDescription>
                Clinical decision support: differential diagnosis, treatment suggestions, and follow-up
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* When analysis exists: Show inline + Share toggle + Re-analyze button */}
          {hasAnalysis && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-violet-300 dark:border-violet-700"
                    onClick={handleGenerate}
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="sm" className="me-2" /> : <Brain className="h-4 w-4 me-2" />}
                    {loading ? 'Analyzing...' : 'Analyze Again'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditContext((v) => !v)}
                    className="text-muted-foreground"
                  >
                    <Edit3 className="h-4 w-4 me-1.5" />
                    {showEditContext ? 'Hide' : 'Edit notes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const notes = appointment.notes || appointment.symptoms || ''
                      setChiefComplaint(notes)
                      if (appointment.allergies) setAllergies(typeof appointment.allergies === 'string' ? appointment.allergies : '')
                      setShowEditContext(true)
                      toast({ title: 'Context reset', description: 'Restored from visit. Edit and click Analyze Again.' })
                    }}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3 me-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="share-ai" className="text-sm cursor-pointer">Share with patient</Label>
                  </div>
                  <Switch
                    id="share-ai"
                    checked={sharedWithPatient}
                    onCheckedChange={handleShareToggle}
                  />
                </div>
              </div>

              {/* Editable context for re-analysis */}
              {showEditContext && (
                <div className="rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10 p-4 space-y-4">
                  <p className="text-sm font-medium text-violet-800 dark:text-violet-200">Edit notes before re-analyzing</p>
                  <div>
                    <Label htmlFor="chief-edit">Chief complaint / Reason for visit *</Label>
                    <Textarea
                      id="chief-edit"
                      placeholder="e.g. Headache for 3 days, worsening in the morning"
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      rows={2}
                      className="mt-1.5 bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="allergies-edit">Allergies</Label>
                    <Input
                      id="allergies-edit"
                      placeholder="e.g. Penicillin, Sulfa"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="mt-1.5 bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hpi-edit">History of present illness</Label>
                    <Textarea
                      id="hpi-edit"
                      placeholder="Onset, duration, associated symptoms"
                      value={historyOfPresentIllness}
                      onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                      rows={2}
                      className="mt-1.5 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Vital signs</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <Label htmlFor="bp-edit" className="text-xs text-muted-foreground">BP</Label>
                        <Input id="bp-edit" placeholder="120/80" value={vitals.bloodPressure} onChange={(e) => setVitals((v) => ({ ...v, bloodPressure: e.target.value }))} className="h-9 mt-0.5 bg-background" />
                      </div>
                      <div>
                        <Label htmlFor="hr-edit" className="text-xs text-muted-foreground">HR</Label>
                        <Input id="hr-edit" placeholder="72" value={vitals.heartRate} onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value }))} className="h-9 mt-0.5 bg-background" />
                      </div>
                      <div>
                        <Label htmlFor="temp-edit" className="text-xs text-muted-foreground">Temp</Label>
                        <Input id="temp-edit" placeholder="37" value={vitals.temperature} onChange={(e) => setVitals((v) => ({ ...v, temperature: e.target.value }))} className="h-9 mt-0.5 bg-background" />
                      </div>
                      <div>
                        <Label htmlFor="weight-edit" className="text-xs text-muted-foreground">Weight</Label>
                        <Input id="weight-edit" placeholder="70" value={vitals.weight} onChange={(e) => setVitals((v) => ({ ...v, weight: e.target.value }))} className="h-9 mt-0.5 bg-background" />
                      </div>
                      <div>
                        <Label htmlFor="rr-edit" className="text-xs text-muted-foreground">RR</Label>
                        <Input id="rr-edit" placeholder="16" value={vitals.respiratoryRate} onChange={(e) => setVitals((v) => ({ ...v, respiratoryRate: e.target.value }))} className="h-9 mt-0.5 bg-background" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="exam-edit">Physical exam findings</Label>
                    <Textarea id="exam-edit" placeholder="General appearance, relevant systems" value={physicalExam} onChange={(e) => setPhysicalExam(e.target.value)} rows={2} className="mt-1.5 bg-background" />
                  </div>
                  <div>
                    <Label htmlFor="notes-edit">Clinical observations</Label>
                    <Textarea id="notes-edit" placeholder="Additional notes, impressions" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={2} className="mt-1.5 bg-background" />
                  </div>
                </div>
              )}

              {/* Analysis results shown directly on card */}
              <div className="rounded-xl border border-violet-200/50 dark:border-violet-800/30 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-4">
                {analysis.provider && (
                  <div className="flex justify-end">
                    <Badge variant="outline" className="text-xs bg-violet-100 dark:bg-violet-900/50 border-violet-300 dark:border-violet-700">
                      {analysis.provider}
                    </Badge>
                  </div>
                )}
                {analysis.raw && !analysis.differential_diagnosis && (
                  <pre className="text-sm whitespace-pre-wrap">{analysis.raw}</pre>
                )}
                {analysis.differential_diagnosis && analysis.differential_diagnosis.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Differential diagnosis</p>
                    <ul className="space-y-2">
                      {analysis.differential_diagnosis.map((d, i) => (
                        <li key={i} className="flex flex-wrap gap-2 items-start">
                          <Badge variant={d.likelihood === 'high' ? 'default' : 'secondary'}>{toDisplayString(d.condition)}</Badge>
                          <span className="text-muted-foreground text-sm">({toDisplayString(d.likelihood)})</span>
                          <span className="text-sm">{toDisplayString(d.rationale)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.suggested_workup && (() => {
                  const workup = analysis.suggested_workup
                  const items = Array.isArray(workup)
                    ? workup
                    : Object.entries(workup as Record<string, unknown>).map(([k, v]) => (v != null && v !== '' ? `${k}: ${String(v)}` : k))
                  return items.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Suggested workup</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-sm">
                        {items.map((w, i) => (
                          <li key={i}>{toDisplayString(w)}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}
                {analysis.treatment_suggestions && analysis.treatment_suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Treatment suggestions</p>
                    <ul className="space-y-1.5">
                      {analysis.treatment_suggestions.map((t, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <Badge variant="outline">{toDisplayString(t.category)}</Badge>
                          <span>{toDisplayString(t.suggestion)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.red_flags && analysis.red_flags.length > 0 && (
                  <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-1">Red flags</p>
                      <ul className="list-disc pl-5 text-sm">
                        {analysis.red_flags.map((r, i) => <li key={i}>{toDisplayString(r)}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {analysis.follow_up_recommendations && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Follow-up</p>
                    <p className="text-sm">{toDisplayString(analysis.follow_up_recommendations)}</p>
                  </div>
                )}
                {analysis.clinical_pearls && analysis.clinical_pearls.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Clinical pearls</p>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {analysis.clinical_pearls.map((p, i) => <li key={i}>{toDisplayString(p)}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic">
                  AI-generated suggestions. Clinical decisions remain the responsibility of the treating physician.
                </p>
              </div>
            </div>
          )}

          {/* Patient summary (read-only) */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Patient Summary</p>
            <p className="text-sm">
              <strong>{appointment.patient_display_name || appointment.patient?.full_name || 'Patient'}</strong>
              {appointment.patient?.gender && (
                <span className="text-muted-foreground"> • {appointment.patient.gender}</span>
              )}
              {appointment.patient?.date_of_birth && (
                <span className="text-muted-foreground">
                  {' '}• {Math.floor((Date.now() - new Date(appointment.patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs
                </span>
              )}
            </p>
          </div>

          {/* Clinical data form — only when no analysis yet */}
          {!hasAnalysis && <div className="space-y-4">
            <div>
              <Label htmlFor="chief">Chief complaint / Reason for visit *</Label>
              <Textarea
                id="chief"
                placeholder="e.g. Headache for 3 days, worsening in the morning"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies (from profile, editable)</Label>
              <Input
                id="allergies"
                placeholder="e.g. Penicillin, Sulfa, Latex"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="hpi">History of present illness</Label>
              <Textarea
                id="hpi"
                placeholder="Onset, duration, associated symptoms, aggravating/relieving factors"
                value={historyOfPresentIllness}
                onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>

            {/* Vitals - compact grid */}
            <div>
              <Label className="mb-2 block">Vital signs (optional)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <Label htmlFor="bp" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" /> BP
                  </Label>
                  <Input
                    id="bp"
                    placeholder="120/80"
                    value={vitals.bloodPressure}
                    onChange={(e) => setVitals((v) => ({ ...v, bloodPressure: e.target.value }))}
                    className="h-9 mt-0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="hr" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Heart className="h-3 w-3" /> HR
                  </Label>
                  <Input
                    id="hr"
                    placeholder="72"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value }))}
                    className="h-9 mt-0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="temp" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Thermometer className="h-3 w-3" /> Temp
                  </Label>
                  <Input
                    id="temp"
                    placeholder="37"
                    value={vitals.temperature}
                    onChange={(e) => setVitals((v) => ({ ...v, temperature: e.target.value }))}
                    className="h-9 mt-0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="weight" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Scale className="h-3 w-3" /> Weight
                  </Label>
                  <Input
                    id="weight"
                    placeholder="70"
                    value={vitals.weight}
                    onChange={(e) => setVitals((v) => ({ ...v, weight: e.target.value }))}
                    className="h-9 mt-0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="rr" className="text-xs text-muted-foreground">RR</Label>
                  <Input
                    id="rr"
                    placeholder="16"
                    value={vitals.respiratoryRate}
                    onChange={(e) => setVitals((v) => ({ ...v, respiratoryRate: e.target.value }))}
                    className="h-9 mt-0.5"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="exam" className="flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4" />
                Physical exam findings
              </Label>
              <Textarea
                id="exam"
                placeholder="General appearance, relevant systems examination"
                value={physicalExam}
                onChange={(e) => setPhysicalExam(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Clinical observations
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional notes, impressions"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
          </div>}

          {!hasAnalysis && (
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-11 bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="me-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 me-2" />
                Analyze
              </>
            )}
          </Button>
          )}

          {/* AI Analysis Dialog — full view when "View AI Analysis" clicked */}
          <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-600" />
                  AI Patient Analysis
                </DialogTitle>
                <DialogDescription>Clinical decision support. Review and share with patient if appropriate.</DialogDescription>
              </DialogHeader>
              {analysis && (
                <div className="space-y-4 pt-2">
                  {analysis.raw && !analysis.differential_diagnosis && (
                    <pre className="text-sm whitespace-pre-wrap">{analysis.raw}</pre>
                  )}
                  {analysis.differential_diagnosis && analysis.differential_diagnosis.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Differential diagnosis</p>
                      <ul className="space-y-2">
                        {analysis.differential_diagnosis.map((d, i) => (
                          <li key={i} className="flex flex-wrap gap-2 items-start">
                            <Badge variant={d.likelihood === 'high' ? 'default' : 'secondary'}>{toDisplayString(d.condition)}</Badge>
                            <span className="text-muted-foreground text-sm">({toDisplayString(d.likelihood)})</span>
                            <span className="text-sm">{toDisplayString(d.rationale)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.suggested_workup && (() => {
                    const workup = analysis.suggested_workup
                    const items = Array.isArray(workup)
                      ? workup
                      : Object.entries(workup as Record<string, unknown>).map(([k, v]) => (v != null && v !== '' ? `${k}: ${String(v)}` : k))
                    return items.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Suggested workup</p>
                        <ul className="list-disc pl-5 space-y-0.5 text-sm">
                          {items.map((w, i) => (
                            <li key={i}>{toDisplayString(w)}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  })()}
                  {analysis.treatment_suggestions && analysis.treatment_suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Treatment suggestions</p>
                      <ul className="space-y-1.5">
                        {analysis.treatment_suggestions.map((t, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <Badge variant="outline">{toDisplayString(t.category)}</Badge>
                            <span>{toDisplayString(t.suggestion)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.red_flags && analysis.red_flags.length > 0 && (
                    <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-1">Red flags</p>
                        <ul className="list-disc pl-5 text-sm">
                          {analysis.red_flags.map((r, i) => <li key={i}>{toDisplayString(r)}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  {analysis.follow_up_recommendations && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Follow-up</p>
                      <p className="text-sm">{toDisplayString(analysis.follow_up_recommendations)}</p>
                    </div>
                  )}
                  {analysis.clinical_pearls && analysis.clinical_pearls.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Clinical pearls</p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {analysis.clinical_pearls.map((p, i) => <li key={i}>{toDisplayString(p)}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    AI-generated suggestions. Clinical decisions remain the responsibility of the treating physician.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  )
}

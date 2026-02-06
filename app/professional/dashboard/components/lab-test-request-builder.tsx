'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  AlertCircle,
  X,
  Sparkles,
  Brain,
  RotateCcw
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import LabTestSearch from './lab-test-search'

/** Visit context from same ticket for AI lab test suggestions */
export interface LabTestVisitContext {
  symptoms?: string
  notes?: string
  visitSummary?: string
  patientAge?: number
  patientGender?: string
  allergies?: string
  chronicConditions?: string
  currentMedications?: string
}

/** Option for "Lab request for:" selector */
interface FamilyMemberOption {
  id: string | null
  full_name: string
  age_years?: number
  relationship?: string
  allergies?: string
}

interface LabTestRequestBuilderProps {
  threadId: string
  ticketId?: string
  appointmentId: string
  doctorId: string
  patientId?: string
  laboratoryId?: string
  /** List of patients (Self + family members). When length > 1, show "For:" selector. */
  familyMembers?: FamilyMemberOption[]
  /** Pre-select this member when opening. */
  defaultFamilyMemberId?: string | null
  /** When editing, the lab request's family_member_id. */
  initialFamilyMemberId?: string | null
  onLabRequestCreated?: (labRequestId: string) => void
  /** Visit context from same ticket for AI suggestions (symptoms, notes, patient info) */
  visitContext?: LabTestVisitContext
  /** For editing an existing lab request */
  editMode?: boolean
  editLabRequestId?: string
  initialDiagnosis?: string
  initialClinicalNotes?: string
  initialPriority?: 'normal' | 'urgent'
  initialSelectedTests?: string[] // test type IDs
  onLabRequestUpdated?: () => void
}

interface SelectedTest {
  id: string
  name: string
  name_ar?: string
  category?: string
  code?: string
  rationale?: string
}

export default function LabTestRequestBuilder({
  threadId,
  ticketId,
  appointmentId,
  doctorId,
  patientId,
  laboratoryId,
  familyMembers,
  defaultFamilyMemberId,
  initialFamilyMemberId,
  visitContext,
  onLabRequestCreated,
  editMode = false,
  editLabRequestId,
  initialDiagnosis = '',
  initialClinicalNotes = '',
  initialPriority = 'normal',
  initialSelectedTests = [],
  onLabRequestUpdated,
}: LabTestRequestBuilderProps) {
  const supabase = createBrowserClient()
  const { toast } = useToast()
  
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis)
  /** Which family member this lab request is for (null = Self). */
  const [selectedForMemberId, setSelectedForMemberId] = useState<string | null>(
    editMode ? (initialFamilyMemberId ?? null) : (defaultFamilyMemberId ?? (familyMembers?.length === 1 ? familyMembers[0].id : null))
  )
  const [clinicalNotes, setClinicalNotes] = useState(initialClinicalNotes)
  const [priority, setPriority] = useState<'normal' | 'urgent'>(initialPriority)
  const [showTestSearch, setShowTestSearch] = useState(false)
  const [appointmentData, setAppointmentData] = useState<any>(null)
  const [initialTestsLoaded, setInitialTestsLoaded] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{ tests: SelectedTest[]; summary?: string; provider?: string } | null>(null)
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false)
  /** Editable context for AI – user can edit, append, or change before re-analyzing. Starts empty. */
  const [aiContextText, setAiContextText] = useState('')

  // Load appointment data to get patient_id and visit context (excludes doctor_note_for_patient)
  useEffect(() => {
    if (appointmentId) {
      supabase
        .from('appointments')
        .select('patient_id, symptoms, notes, doctor_note_for_patient')
        .eq('id', appointmentId)
        .single()
        .then(({ data }) => {
          if (data) setAppointmentData(data)
        })
    }
  }, [appointmentId, supabase])

  // Patient notes only (exclude doctor_note_for_patient - that is a message to patient, not clinical context)
  const getPatientNotes = (apt: { notes?: string; doctor_note_for_patient?: string } | null) => {
    if (!apt?.notes) return undefined
    const docNote = apt.doctor_note_for_patient ?? ''
    return apt.notes !== docNote ? apt.notes : undefined
  }

  // AI context textarea starts empty. Use "Reset to visit data" to fill from symptoms + patient notes (never doctor_note_for_patient).

  // Reset AI context to visit data (symptoms + patient notes only, never doctor_note_for_patient)
  const resetAiContextToVisit = async () => {
    const ctx = await getVisitContext()
    const parts: string[] = []
    if (ctx.symptoms) parts.push(`Symptoms: ${ctx.symptoms}`)
    const patientNotes = ctx.notes ?? ctx.visitSummary
    if (patientNotes) parts.push(`Notes: ${patientNotes}`)
    setAiContextText(parts.join('\n\n'))
    toast({ title: 'Context reset', description: 'Restored from visit data. Edit and click AI Suggest again.' })
  }

  // Fetch visit context when not provided (for AI Suggest)
  // Excludes doctor_note_for_patient - only patient notes from booking.
  const getVisitContext = async (): Promise<LabTestVisitContext> => {
    const ctx: LabTestVisitContext = {}
    if (visitContext) {
      Object.assign(ctx, visitContext)
    }
    if (appointmentData?.symptoms) ctx.symptoms = appointmentData.symptoms
    const patientNotes = getPatientNotes(appointmentData)
    if (patientNotes) {
      ctx.notes = patientNotes
      ctx.visitSummary = patientNotes
    }
    // Override with selected family member's data when applicable (for multi-family AI suggestions)
    if (familyMembers && selectedForMemberId !== undefined) {
      const member = familyMembers.find((m) => (m.id ?? 'self') === (selectedForMemberId ?? 'self'))
      if (member) {
        if (member.age_years != null) ctx.patientAge = member.age_years
        if (member.allergies) ctx.allergies = member.allergies
      }
    }
    // Fallback: fetch from patient-display API when patient-specific data missing
    if (ctx.patientAge == null && ctx.allergies == null && (patientId || appointmentData?.patient_id)) {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/patient-display`)
        if (res.ok) {
          const info = await res.json()
          if (ctx.patientAge == null && info.date_of_birth) {
            const dob = new Date(info.date_of_birth)
            ctx.patientAge = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          }
          if (ctx.patientGender == null && info.gender) ctx.patientGender = info.gender
          if (ctx.allergies == null && info.allergies) ctx.allergies = info.allergies
          if (ctx.chronicConditions == null && info.chronic_conditions) ctx.chronicConditions = info.chronic_conditions
          if (ctx.currentMedications == null && info.current_medications) ctx.currentMedications = info.current_medications
        }
      } catch {
        // ignore
      }
    }
    return ctx
  }

  // AI Suggest lab tests based on visit context
  const getAiSuggestions = async () => {
    if (!diagnosis?.trim() && !clinicalNotes?.trim() && !aiContextText?.trim()) {
      toast({ title: 'Context required', description: 'Enter diagnosis, clinical notes, or visit context to get AI suggestions', variant: 'destructive' })
      return
    }
    setLoadingAiSuggestions(true)
    setAiSuggestions(null)
    try {
      const ctx = await getVisitContext()
      // Use editable aiContextText for symptoms/visitSummary when user has edited; else fall back to auto context
      const symptomsOrOverride = aiContextText.trim() || ctx.symptoms
      const visitSummaryOrOverride = aiContextText.trim() || ctx.visitSummary || ctx.notes
      const res = await fetch('/api/lab-test-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis,
          symptoms: symptomsOrOverride,
          clinicalNotes,
          visitSummary: visitSummaryOrOverride,
          patientAge: ctx.patientAge,
          patientGender: ctx.patientGender,
          allergies: ctx.allergies,
          chronicConditions: ctx.chronicConditions,
          currentMedications: ctx.currentMedications,
        }),
      })
      const data = await res.json()
      if (res.ok && data.tests?.length) {
        setAiSuggestions({
          tests: data.tests.map((t: any) => ({
            id: t.id,
            name: t.name,
            name_ar: t.name_ar,
            category: t.category,
            code: t.code,
            rationale: t.rationale,
          })),
          summary: data.summary,
          provider: data.provider,
        })
      } else {
        toast({ title: 'AI Error', description: data.error || 'No suggestions generated', variant: 'destructive' })
      }
    } catch (err: unknown) {
      const e = err as Error
      toast({ title: 'Error', description: e.message || 'Failed to get suggestions', variant: 'destructive' })
    } finally {
      setLoadingAiSuggestions(false)
    }
  }

  const addAiSuggestion = (test: SelectedTest) => {
    if (!selectedTests.some((t) => t.id === test.id)) {
      setSelectedTests((prev) => [...prev, test])
    }
  }

  const addAllAiSuggestions = () => {
    if (!aiSuggestions?.tests) return
    const toAdd = aiSuggestions.tests.filter((t) => !selectedTests.some((s) => s.id === t.id))
    setSelectedTests((prev) => [...prev, ...toAdd])
  }

  // Load initial tests in edit mode
  useEffect(() => {
    if (editMode && initialSelectedTests.length > 0 && !initialTestsLoaded) {
      supabase
        .from('lab_test_types')
        .select('id, name, name_ar, category, code')
        .in('id', initialSelectedTests)
        .then(({ data }) => {
          if (data) {
            setSelectedTests(data.map(t => ({
              id: t.id,
              name: t.name,
              name_ar: t.name_ar,
              category: t.category,
              code: t.code,
            })))
          }
          setInitialTestsLoaded(true)
        })
    }
  }, [editMode, initialSelectedTests, initialTestsLoaded, supabase])

  const handleTestSelect = (tests: any[]) => {
    setSelectedTests(tests.map(t => ({
      id: t.id,
      name: t.name,
      name_ar: t.name_ar,
      category: t.category,
      code: t.code,
    })))
    setShowTestSearch(false)
  }

  const removeTest = (index: number) => {
    setSelectedTests(selectedTests.filter((_, i) => i !== index))
  }

  const saveLabRequest = async () => {
    if (selectedTests.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one lab test', variant: 'destructive' })
      return
    }

    if (!diagnosis.trim()) {
      toast({ title: 'Error', description: 'Please enter a diagnosis', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // Verify doctor exists in professionals table
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id, type')
        .eq('id', doctorId)
        .single()

      if (profError || !professional) {
        console.error('Error fetching professional:', profError)
        throw new Error('Doctor not found. Please ensure you are logged in as a valid doctor.')
      }

      if (professional.type !== 'doctor') {
        throw new Error('You must be logged in as a doctor to create lab requests.')
      }

      const actualPatientId = patientId || appointmentData?.patient_id || null
      if (!actualPatientId) {
        throw new Error('Patient ID is required. Please ensure the appointment has a patient.')
      }

      let labRequest: { id: string } | null = null

      if (editMode && editLabRequestId) {
        // Update existing lab request via API (bypasses RLS on lab_test_items)
        const response = await fetch(`/api/lab-requests/${editLabRequestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diagnosis,
            clinicalNotes,
            priority,
            familyMemberId: selectedForMemberId ?? undefined,
            testTypeIds: selectedTests.map(t => t.id),
          }),
          credentials: 'include',
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update lab request')
        }

        labRequest = { id: editLabRequestId }
      } else {
        // Create lab request via API
        const response = await fetch('/api/lab-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: actualPatientId,
            appointmentId,
            familyMemberId: selectedForMemberId || null,
            testTypeIds: selectedTests.map(t => t.id),
            diagnosis,
            clinicalNotes,
            priority,
            laboratoryId: laboratoryId || null,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          const errMsg = result.error || 'Failed to create lab request'
          const isForeignKeyError = typeof errMsg === 'string' && (errMsg.includes('foreign key') || errMsg.includes('doctor_id_fkey'))
          throw new Error(isForeignKeyError 
            ? `${errMsg}. Run scripts/054-fix-lab-requests-doctor-fk.sql in Supabase SQL Editor to fix the foreign key constraint.`
            : errMsg)
        }

        labRequest = result.labRequest

        if (!labRequest) {
          throw new Error('Lab request was not created')
        }
      }

      // Link lab request to ticket (for patient view) but don't mark as sent yet - only for new requests
      if (ticketId && !editMode) {
        await supabase
          .from('healthcare_tickets')
          .update({
            lab_request_id: labRequest.id,
            updated_at: new Date().toISOString(),
            // Don't change status - keep as 'created' or current status until sent to lab
          })
          .eq('id', ticketId)
      }

      // Update thread metadata with lab_request_id (for reference) - only if threadId is provided and not edit mode
      if (threadId && !editMode) {
        await supabase
          .from('chat_threads')
          .update({ metadata: { lab_request_id: labRequest.id } })
          .eq('id', threadId)

        // Send system message that lab request was created (not sent yet)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('chat_messages').insert({
          thread_id: threadId,
          sender_id: user?.id,
          message_type: 'system',
          content: `Lab request created with ${selectedTests.length} test(s). You can print it or send it to a laboratory.`,
        })
      }

      if (editMode) {
        toast({ 
          title: 'Lab request updated', 
          description: 'Changes have been saved.' 
        })
        if (onLabRequestUpdated) {
          onLabRequestUpdated()
        }
      } else {
        toast({ 
          title: 'Lab request created', 
          description: 'Lab request saved. You can print it or send it to a laboratory.' 
        })
        if (onLabRequestCreated) {
          onLabRequestCreated(labRequest.id)
        }
      }

      // Reset form
      setSelectedTests([])
      setDiagnosis('')
      setClinicalNotes('')
      setPriority('normal')
    } catch (error: any) {
      console.error('Save lab request error:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Failed to save lab request'
      toast({ 
        title: 'Error', 
        description: errorMessage.includes('foreign key') 
          ? 'Doctor or laboratory not found. Please try again.' 
          : errorMessage, 
        variant: 'destructive' 
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Test Request Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lab request for: (when multiple patients in visit) */}
          {familyMembers && (familyMembers.filter((m) => m.id != null).length > 1) && (
            <div className="space-y-2">
              <Label>Lab request for *</Label>
              <Select
                value={selectedForMemberId ?? 'self'}
                onValueChange={(v) => setSelectedForMemberId(v === 'self' ? null : v)}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((m) => (
                    <SelectItem key={m.id ?? 'self'} value={m.id ?? 'self'}>
                      {m.full_name}
                      {m.age_years != null && ` (${m.age_years} yrs)`}
                      {m.relationship && ` — ${m.relationship}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Diagnosis & Clinical Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Diagnosis *</Label>
              <Input
                placeholder="Enter diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: 'normal' | 'urgent') => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Clinical Notes</Label>
            <Textarea
              placeholder="Additional clinical information for the laboratory..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Editable context for AI – edit, append, or change before re-analyzing */}
          <div className="space-y-2 rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-violet-600" />
                Context for AI analysis
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAiContextToVisit}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3 me-1" />
                Reset to visit data
              </Button>
            </div>
            <Textarea
              placeholder="Symptoms and notes from the visit (pre-filled from ticket). Edit, append, or change before clicking AI Suggest again."
              value={aiContextText}
              onChange={(e) => setAiContextText(e.target.value)}
              rows={3}
              className="bg-background"
            />
          </div>

          <Separator />

          {/* Lab Tests Selection */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Selected Lab Tests ({selectedTests.length})</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={getAiSuggestions}
                  disabled={loadingAiSuggestions || (!diagnosis?.trim() && !clinicalNotes?.trim() && !aiContextText?.trim())}
                >
                  {loadingAiSuggestions ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline ms-1.5">AI Suggest</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTestSearch(true)}>
                  <Plus className="h-4 w-4 me-1" />
                  Add Tests
                </Button>
              </div>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions?.tests && aiSuggestions.tests.length > 0 && (
              <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                      <Brain className="h-4 w-4" />
                      <span className="text-sm font-medium">AI Suggestions</span>
                      {aiSuggestions.provider && (
                        <Badge variant="outline" className="text-xs">{aiSuggestions.provider}</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAiSuggestions(null)} className="h-6 w-6 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {aiSuggestions.summary && (
                    <p className="text-xs text-muted-foreground">{aiSuggestions.summary}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions.tests.map((t) => (
                      <Badge
                        key={t.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-violet-200 dark:hover:bg-violet-800 py-1.5 px-2 gap-1"
                        onClick={() => addAiSuggestion(t)}
                      >
                        {t.name}
                        {t.code && <span className="text-[10px] opacity-80">({t.code})</span>}
                        <Plus className="h-3 w-3" />
                      </Badge>
                    ))}
                    <Button size="sm" variant="secondary" onClick={addAllAiSuggestions} className="h-7 text-xs">
                      Add all
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No lab tests selected yet. Click "Add Tests" to select tests.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {selectedTests.map((test, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{test.name}</p>
                            {test.name_ar && (
                              <span className="text-sm text-muted-foreground">({test.name_ar})</span>
                            )}
                          </div>
                          {test.category && (
                            <Badge variant="secondary" className="text-xs">{test.category}</Badge>
                          )}
                          {test.code && (
                            <Badge variant="outline" className="text-xs ml-2">Code: {test.code}</Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTest(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Save Button */}
          <Button 
            onClick={saveLabRequest} 
            disabled={saving || selectedTests.length === 0 || !diagnosis.trim()}
            className="w-full"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4 mr-2" />
                Create Lab Request
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lab Test Search Dialog */}
      <LabTestSearch
        open={showTestSearch}
        onClose={() => setShowTestSearch(false)}
        onSelectMultiple={handleTestSelect}
        selectedTests={selectedTests}
      />
    </div>
  )
}

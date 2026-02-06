'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Plus, 
  Trash2, 
  Pill, 
  CheckCircle, 
  AlertCircle,
  X,
  Edit,
  Save,
  Brain,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

interface Medication {
  id: string
  commercial_name: string
  commercial_name_ar?: string
  dci_name?: string
  dci_name_ar?: string
  form: string
  form_ar?: string
  dosage: string
  manufacturer?: string
  is_chifa_listed: boolean
  reimbursement_rate: number
  reimbursement_category?: string
  therapeutic_class?: string
  is_controlled: boolean
  requires_prescription: boolean
  prix_public?: number
  tarif_reference?: number
}

interface PrescriptionMedication {
  medication_id?: string
  medication_name: string
  medication_name_ar?: string
  dci_name?: string
  form: string
  dosage: string // e.g., "500mg", "1 tablet"
  quantity: number // Total quantity (e.g., 20 tablets)
  frequency: string // e.g., "twice daily", "every 8 hours", "3 times a day"
  duration: string // e.g., "7 days", "2 weeks", "until finished"
  route: string // e.g., "oral", "topical", "injection"
  instructions: string // Additional instructions
  reimbursement_rate?: number
  is_chifa_listed?: boolean
  price?: number
}

/** Option for "Prescription for:" selector */
interface FamilyMemberOption {
  id: string | null
  full_name: string
  age_years?: number
  relationship?: string
  allergies?: string
}

interface PrescriptionBuilderProps {
  threadId: string
  ticketId?: string
  appointmentId: string
  doctorId: string
  patientId?: string
  pharmacyId?: string
  /** List of patients (Self + family members). When length > 1, show "For:" selector. */
  familyMembers?: FamilyMemberOption[]
  /** Pre-select this member when opening (e.g. when only one option). */
  defaultFamilyMemberId?: string | null
  /** When editing, the prescription's family_member_id. */
  initialFamilyMemberId?: string | null
  onPrescriptionCreated?: (prescriptionId: string) => void
  /** For editing an existing prescription */
  editMode?: boolean
  editPrescriptionId?: string
  initialDiagnosis?: string
  initialNotes?: string
  initialMedications?: PrescriptionMedication[]
  onPrescriptionUpdated?: () => void
}

export default function PrescriptionBuilder({
  threadId,
  ticketId,
  appointmentId,
  doctorId,
  patientId,
  pharmacyId,
  familyMembers,
  defaultFamilyMemberId,
  initialFamilyMemberId,
  onPrescriptionCreated,
  editMode = false,
  editPrescriptionId,
  initialDiagnosis = '',
  initialNotes = '',
  initialMedications = [],
  onPrescriptionUpdated,
}: PrescriptionBuilderProps) {
  const supabase = createBrowserClient()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSource, setSearchSource] = useState<'all' | 'pharmacy' | 'doctor'>('all')
  const [medications, setMedications] = useState<Medication[]>([])
  const [pharmacyInventory, setPharmacyInventory] = useState<Medication[]>([])
  const [nationalSearchResults, setNationalSearchResults] = useState<Medication[]>([])
  const [nationalSearchLoading, setNationalSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [prescriptionMeds, setPrescriptionMeds] = useState<PrescriptionMedication[]>(initialMedications)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis)
  const [notes, setNotes] = useState(initialNotes)
  const [appointmentData, setAppointmentData] = useState<any>(null)
  /** Which medication row is expanded (full form). Null = all shown as one-line. */
  const [expandedMedIndex, setExpandedMedIndex] = useState<number | null>(null)
  /** Which family member this prescription is for (null = Self). */
  const [selectedForMemberId, setSelectedForMemberId] = useState<string | null>(
    editMode ? (initialFamilyMemberId ?? null) : (defaultFamilyMemberId ?? (familyMembers?.length === 1 ? familyMembers[0].id : null))
  )
  
  // AI Features
  const [interactions, setInteractions] = useState<any[]>([])
  const [checkingInteractions, setCheckingInteractions] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false)

  // Load appointment data to get patient_id
  useEffect(() => {
    if (appointmentId) {
      loadAppointmentData()
    }
  }, [appointmentId])

  // Load medications (master list)
  useEffect(() => {
    loadMedications()
    if (pharmacyId) {
      loadPharmacyInventory()
    }
  }, [pharmacyId])

  const loadAppointmentData = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('id', appointmentId)
      .single()
    if (data) setAppointmentData(data)
  }

  const loadMedications = async () => {
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('is_available', true)
      .order('commercial_name')
      .limit(500)
    if (data) setMedications(data)
  }

  const loadPharmacyInventory = async () => {
    // For now, use medications table. Later can add pharmacy-specific inventory table
    // that links pharmacy_id + medication_id + stock_quantity
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('is_available', true)
      .order('commercial_name')
      .limit(500)
    if (data) setPharmacyInventory(data)
  }

  // National DB search (5,100+ Algerian medications): debounced, alphabetical when first letter
  const fetchNationalMedications = useCallback(async (q: string) => {
    if (!q.trim()) {
      setNationalSearchResults([])
      return
    }
    setNationalSearchLoading(true)
    try {
      const res = await fetch(`/api/medications/search?q=${encodeURIComponent(q.trim())}&limit=50`)
      const json = await res.json()
      if (res.ok && Array.isArray(json.data)) {
        setNationalSearchResults(json.data)
      } else {
        console.warn('[PrescriptionBuilder] National search error:', json.error)
        setNationalSearchResults([])
      }
    } catch (err) {
      console.error('[PrescriptionBuilder] National search fetch error:', err)
      setNationalSearchResults([])
    } finally {
      setNationalSearchLoading(false)
    }
  }, [])

  // Trigger national search when source is 'all' and query changes (debounced)
  useEffect(() => {
    if (searchSource !== 'all') {
      setNationalSearchResults([])
      return
    }
    const q = searchQuery.trim()
    if (!q) {
      setNationalSearchResults([])
      return
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      fetchNationalMedications(q)
      searchDebounceRef.current = null
    }, 280)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery, searchSource, fetchNationalMedications])

  // Search medications: "all" = national DB (API); "pharmacy" / "doctor" = local list
  const filteredMedications = useMemo(() => {
    if (!searchQuery.trim()) return []
    if (searchSource === 'all') {
      return nationalSearchResults
    }
    const q = searchQuery.toLowerCase()
    const source = searchSource === 'pharmacy' && pharmacyId ? pharmacyInventory : medications
    return source.filter((m) =>
      m.commercial_name?.toLowerCase().includes(q) ||
      m.dci_name?.toLowerCase().includes(q) ||
      m.commercial_name_ar?.toLowerCase().includes(q) ||
      m.therapeutic_class?.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [searchQuery, searchSource, nationalSearchResults, medications, pharmacyInventory, pharmacyId])

  // Check drug interactions
  const checkInteractions = async (meds: PrescriptionMedication[]) => {
    if (meds.length < 2) {
      setInteractions([])
      return
    }
    setCheckingInteractions(true)
    try {
      const res = await fetch('/api/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: meds.map(m => ({
            dci_name: m.dci_name || m.medication_name,
            medication_name: m.medication_name
          }))
        })
      })
      const data = await res.json()
      if (res.ok && data.interactions) {
        setInteractions(data.interactions)
      }
    } catch (err) {
      console.warn('Failed to check interactions:', err)
    } finally {
      setCheckingInteractions(false)
    }
  }

  // Get AI prescription suggestions
  const getAiSuggestions = async () => {
    if (!diagnosis?.trim()) {
      toast({ title: 'Diagnosis required', description: 'Enter a diagnosis to get AI suggestions', variant: 'destructive' })
      return
    }
    setLoadingAiSuggestions(true)
    try {
      const res = await fetch('/api/prescription-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis,
          symptoms: notes,
          currentMedications: prescriptionMeds.map(m => m.medication_name)
        })
      })
      const data = await res.json()
      if (res.ok) {
        setAiSuggestions(data)
      } else {
        toast({ title: 'AI Error', description: data.error || 'Failed to get suggestions', variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoadingAiSuggestions(false)
    }
  }

  // Add medication from AI suggestion
  const addAiSuggestion = (suggestion: any) => {
    const newMed: PrescriptionMedication = {
      medication_name: suggestion.medication_name,
      dci_name: suggestion.dci_name,
      form: suggestion.form || '',
      dosage: suggestion.dosage || '',
      quantity: 1,
      frequency: suggestion.frequency || 'as prescribed',
      duration: suggestion.duration || '',
      route: suggestion.route || 'oral',
      instructions: suggestion.instructions || '',
      is_chifa_listed: suggestion.chifa_eligible
    }
    const nextIndex = prescriptionMeds.length
    setPrescriptionMeds(prev => [...prev, newMed])
    setExpandedMedIndex(nextIndex)
    // Check interactions after adding
    checkInteractions([...prescriptionMeds, newMed])
  }

  const addMedication = (med: Medication) => {
    const newMed: PrescriptionMedication = {
      medication_id: med.id,
      medication_name: med.commercial_name,
      medication_name_ar: med.commercial_name_ar,
      dci_name: med.dci_name,
      form: med.form,
      dosage: med.dosage || '1',
      quantity: 1,
      frequency: 'twice daily',
      duration: '7 days',
      route: med.form.includes('tablet') || med.form.includes('capsule') || med.form.includes('comprimé') || med.form.includes('gélule') ? 'oral' : 
             med.form.includes('cream') || med.form.includes('ointment') || med.form.includes('crème') ? 'topical' :
             med.form.includes('injection') || med.form.includes('injection') ? 'injection' : 'oral',
      instructions: '',
      reimbursement_rate: med.reimbursement_rate,
      is_chifa_listed: med.is_chifa_listed,
      price: med.prix_public,
    }
    const nextIndex = prescriptionMeds.length
    const updatedMeds = [...prescriptionMeds, newMed]
    setPrescriptionMeds(updatedMeds)
    setSearchQuery('')
    setExpandedMedIndex(nextIndex)
    // Check interactions after adding
    checkInteractions(updatedMeds)
  }

  const addCustomMedication = () => {
    const newMed: PrescriptionMedication = {
      medication_name: '',
      form: '',
      dosage: '',
      quantity: 1,
      frequency: '',
      duration: '',
      route: 'oral',
      instructions: '',
    }
    const nextIndex = prescriptionMeds.length
    setPrescriptionMeds([...prescriptionMeds, newMed])
    setExpandedMedIndex(nextIndex)
  }

  const collapseMedication = (index: number) => {
    setExpandedMedIndex(null)
  }

  const expandMedication = (index: number) => {
    setExpandedMedIndex(index)
  }

  const updateMedication = (index: number, field: keyof PrescriptionMedication, value: string | number) => {
    const updated = [...prescriptionMeds]
    updated[index] = { ...updated[index], [field]: value }
    setPrescriptionMeds(updated)
  }

  const removeMedication = (index: number) => {
    const updatedMeds = prescriptionMeds.filter((_, i) => i !== index)
    setPrescriptionMeds(updatedMeds)
    if (expandedMedIndex === index) setExpandedMedIndex(null)
    else if (expandedMedIndex !== null && expandedMedIndex > index) setExpandedMedIndex(expandedMedIndex - 1)
    // Recheck interactions
    checkInteractions(updatedMeds)
  }

  const savePrescription = async () => {
    if (prescriptionMeds.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one medication', variant: 'destructive' })
      return
    }

    // Validate all medications have required fields
    const invalid = prescriptionMeds.some((m) => !m.medication_name || !m.dosage || !m.frequency || !m.duration)
    if (invalid) {
      toast({ title: 'Error', description: 'Please fill all required fields for each medication', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // Verify doctor exists in professionals table (prescriptions now references professionals.id directly)
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
        throw new Error('You must be logged in as a doctor to create prescriptions.')
      }

      // Use professional.id directly (foreign key now references professionals)
      const actualDoctorId = doctorId
      const actualPatientId = patientId || appointmentData?.patient_id
      
      // Validate patient_id is present (required field)
      if (!actualPatientId) {
        throw new Error('Patient ID is required. This appointment may not have a registered patient.')
      }

      let prescription: { id: string } | null = null
      let error: any = null

      if (editMode && editPrescriptionId) {
        // Update existing prescription
        const { data, error: updateError } = await supabase
          .from('prescriptions')
          .update({
            diagnosis,
            notes,
            medications: prescriptionMeds,
            family_member_id: selectedForMemberId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editPrescriptionId)
          .select('id')
          .single()
        prescription = data
        error = updateError
      } else {
        // Create prescription via API (ensures RX-DDMMYY-Random number)
        const res = await fetch('/api/prescriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            patientId: actualPatientId,
            appointmentId: appointmentId || null,
            familyMemberId: selectedForMemberId || null,
            diagnosis,
            medications: prescriptionMeds,
            notes: notes || '',
            validDays: 30,
          }),
        })
        const result = await res.json()
        if (!res.ok) {
          error = { message: result.error || 'Failed to create prescription' }
        } else {
          prescription = result.prescription ? { id: result.prescription.id } : null
        }
      }

      if (error) {
        console.error('Prescription save error:', error)
        const errorMessage = error.message || error.details || error.code || JSON.stringify(error)
        throw new Error(`Failed to save prescription: ${errorMessage}`)
      }

      if (!prescription) {
        throw new Error('Prescription was not saved')
      }

      // Link prescription to ticket (for patient view) but don't mark as sent yet
      if (ticketId) {
        await supabase
          .from('healthcare_tickets')
          .update({
            prescription_id: prescription.id,
            updated_at: new Date().toISOString(),
            // Don't change status - keep as 'created' or current status until sent to pharmacy
          })
          .eq('id', ticketId)
      }

      // Update thread metadata with prescription_id (for reference) - only if threadId is provided and not in edit mode
      if (threadId && !editMode) {
        await supabase
          .from('chat_threads')
          .update({ metadata: { prescription_id: prescription.id } })
          .eq('id', threadId)

        // Send system message that prescription was created (not sent yet)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('chat_messages').insert({
          thread_id: threadId,
          sender_id: user?.id,
          message_type: 'system',
          content: `Prescription created with ${prescriptionMeds.length} medication(s). You can print it or send it to a pharmacy.`,
        })
      }

      if (editMode) {
        toast({ 
          title: 'Prescription updated', 
          description: 'Changes have been saved.' 
        })
        if (onPrescriptionUpdated) {
          onPrescriptionUpdated()
        }
      } else {
        toast({ 
          title: 'Prescription created', 
          description: 'Prescription saved. You can print it or send it to a pharmacy.' 
        })
        if (onPrescriptionCreated) {
          onPrescriptionCreated(prescription.id)
        }
      }
    } catch (error: any) {
      console.error('Save prescription error:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Failed to save prescription'
      toast({ 
        title: 'Error', 
        description: errorMessage.includes('foreign key') 
          ? 'Doctor or pharmacy not found. Please try again.' 
          : errorMessage, 
        variant: 'destructive' 
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-hidden">
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="px-0 pt-0 space-y-4">
          {/* Prescription for: (when 2+ family members in visit; single family member = no selector) */}
          {familyMembers && (familyMembers.filter((m) => m.id != null).length > 1) && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Prescription for *</Label>
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
          {/* Diagnosis & Notes - single row on desktop to use horizontal space */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Diagnosis *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getAiSuggestions}
                  disabled={loadingAiSuggestions || !diagnosis?.trim()}
                  className="h-9 shrink-0"
                  title="Get AI medication suggestions"
                >
                  {loadingAiSuggestions ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline ml-1.5">AI Suggest</span>
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Note for patient (visible only to them)</Label>
              <Textarea
                placeholder="Message for the patient; only they will see this."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-y min-h-[4.5rem] text-sm"
              />
            </div>
          </div>

          {/* AI Suggestions */}
          {aiSuggestions?.suggestions?.length > 0 && (
            <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm font-medium">AI Suggestions</span>
                  {aiSuggestions.provider && (
                    <Badge variant="outline" className="text-xs">{aiSuggestions.provider}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAiSuggestions(null)} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid gap-2">
                {aiSuggestions.suggestions.slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 bg-background rounded border text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.medication_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.dci_name} • {s.form} {s.dosage} • {s.frequency}
                        {s.chifa_eligible && <Badge variant="secondary" className="ml-1 text-xs">CNAS</Badge>}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addAiSuggestion(s)} className="shrink-0 h-7">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
              {aiSuggestions.warnings?.length > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  {aiSuggestions.warnings.join('; ')}
                </div>
              )}
            </div>
          )}

          {/* Drug Interaction Warnings */}
          {interactions.length > 0 && (
            <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Drug Interactions Detected</p>
                <ul className="space-y-1 text-sm">
                  {interactions.map((int, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge 
                        variant={int.severity === 'contraindicated' || int.severity === 'major' ? 'destructive' : 'secondary'}
                        className="shrink-0 text-xs"
                      >
                        {int.severity}
                      </Badge>
                      <span>
                        <strong>{int.drug1}</strong> + <strong>{int.drug2}</strong>: {int.description}
                        {int.management && <span className="text-muted-foreground ml-1">({int.management})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {checkingInteractions && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" className="h-3 w-3" />
              Checking drug interactions...
            </div>
          )}

          <Separator className="my-3" />

          {/* Medication Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Medications</Label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder={searchSource === 'all' ? "Search by name, DCI, class, manufacturer — e.g. dol 500, paracétamol (5,100+ meds)" : "Search by name, DCI, or therapeutic class..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 pr-9"
                />
                {searchSource === 'all' && nationalSearchLoading && (
                  <LoadingSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              {pharmacyId && (
                <Select value={searchSource} onValueChange={(v: any) => setSearchSource(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Medications</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy Inventory</SelectItem>
                    <SelectItem value="doctor">My Medications</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Search Results */}
            {searchQuery.trim() && filteredMedications.length > 0 && (
              <Card className="mt-2">
                <CardContent className="p-2">
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {filteredMedications.map((med) => (
                        <div
                          key={med.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => addMedication(med)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{med.commercial_name}</p>
                            {med.dci_name && (
                              <p className="text-xs text-muted-foreground truncate">DCI: {med.dci_name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {med.form && <Badge variant="outline" className="text-xs">{med.form}</Badge>}
                              {med.dosage && <Badge variant="outline" className="text-xs">{med.dosage}</Badge>}
                              {med.is_chifa_listed && (
                                <Badge className="text-xs bg-green-500">
                                  CNAS {med.reimbursement_rate}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator className="my-3" />

          {/* Prescription List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Prescription Medications ({prescriptionMeds.length})</Label>
              <Button size="sm" variant="outline" onClick={addCustomMedication}>
                <Plus className="h-4 w-4 mr-1" />
                Add Custom
              </Button>
            </div>

            {prescriptionMeds.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 px-4 text-center text-muted-foreground">
                  <Pill className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No medications yet. Search above or click Add Custom.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 min-w-0">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/40 rounded-t-md">
                  <span>Medication</span>
                  <span className="text-center">Dosage</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Frequency</span>
                  <span className="text-center">Duration</span>
                  <span className="w-20 text-right">Actions</span>
                </div>
                {prescriptionMeds.map((med, index) => (
                  <div key={index} className="min-w-0">
                    {expandedMedIndex === index ? (
                      <Card className="overflow-hidden min-w-0 border-primary/30">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex-1 min-w-0 space-y-3 overflow-hidden">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-sm font-medium">Medication Name *</Label>
                                <Input
                                  value={med.medication_name}
                                  onChange={(e) => updateMedication(index, 'medication_name', e.target.value)}
                                  placeholder="e.g., Paracetamol 500mg"
                                  className="h-9 w-full"
                                />
                              </div>
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-sm font-medium">Form</Label>
                                <Select
                                  value={med.form}
                                  onValueChange={(v) => updateMedication(index, 'form', v)}
                                >
                                  <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Form" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="tablet">Tablet</SelectItem>
                                    <SelectItem value="capsule">Capsule</SelectItem>
                                    <SelectItem value="syrup">Syrup</SelectItem>
                                    <SelectItem value="injection">Injection</SelectItem>
                                    <SelectItem value="cream">Cream</SelectItem>
                                    <SelectItem value="ointment">Ointment</SelectItem>
                                    <SelectItem value="drops">Drops</SelectItem>
                                    <SelectItem value="spray">Spray</SelectItem>
                                    <SelectItem value="suppository">Suppository</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Row 2: Dosage, Quantity, Frequency, Duration */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-sm font-medium">Dosage *</Label>
                                <Input
                                  value={med.dosage}
                                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                  placeholder="e.g., 500mg"
                                  className="h-9 w-full"
                                />
                              </div>
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-sm font-medium">Qty *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={med.quantity}
                                  onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-9 w-full"
                                />
                              </div>
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-sm font-medium">Frequency *</Label>
                                <Select
                                  value={med.frequency}
                                  onValueChange={(v) => updateMedication(index, 'frequency', v)}
                                >
                                  <SelectTrigger className="h-9 w-full min-w-0">
                                    <SelectValue placeholder="Frequency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="once daily">Once daily</SelectItem>
                                    <SelectItem value="twice daily">Twice daily (BID)</SelectItem>
                                    <SelectItem value="three times daily">Three times daily (TID)</SelectItem>
                                    <SelectItem value="four times daily">Four times daily (QID)</SelectItem>
                                    <SelectItem value="every 6 hours">Every 6 hours</SelectItem>
                                    <SelectItem value="every 8 hours">Every 8 hours</SelectItem>
                                    <SelectItem value="every 12 hours">Every 12 hours</SelectItem>
                                    <SelectItem value="as needed">As needed (PRN)</SelectItem>
                                    <SelectItem value="before meals">Before meals</SelectItem>
                                    <SelectItem value="after meals">After meals</SelectItem>
                                    <SelectItem value="at bedtime">At bedtime</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-sm font-medium">Duration *</Label>
                                <Select
                                  value={med.duration}
                                  onValueChange={(v) => updateMedication(index, 'duration', v)}
                                >
                                  <SelectTrigger className="h-9 w-full min-w-0">
                                    <SelectValue placeholder="Duration" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="3 days">3 days</SelectItem>
                                    <SelectItem value="5 days">5 days</SelectItem>
                                    <SelectItem value="7 days">7 days</SelectItem>
                                    <SelectItem value="10 days">10 days</SelectItem>
                                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                                    <SelectItem value="3 weeks">3 weeks</SelectItem>
                                    <SelectItem value="1 month">1 month</SelectItem>
                                    <SelectItem value="until finished">Until finished</SelectItem>
                                    <SelectItem value="as needed">As needed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Row 3: Route only - fixed width so Instructions gets full row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end min-w-0">
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Route</Label>
                                <Select
                                  value={med.route}
                                  onValueChange={(v) => updateMedication(index, 'route', v)}
                                >
                                  <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Route" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="oral">Oral</SelectItem>
                                    <SelectItem value="topical">Topical</SelectItem>
                                    <SelectItem value="injection">Injection</SelectItem>
                                    <SelectItem value="inhalation">Inhalation</SelectItem>
                                    <SelectItem value="nasal">Nasal</SelectItem>
                                    <SelectItem value="ophthalmic">Ophthalmic</SelectItem>
                                    <SelectItem value="otic">Otic</SelectItem>
                                    <SelectItem value="rectal">Rectal</SelectItem>
                                    <SelectItem value="vaginal">Vaginal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5 min-w-0 w-full">
                                <Label className="text-sm font-medium">Instructions</Label>
                                <Input
                                  value={med.instructions}
                                  onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                                  placeholder="e.g., Take with food, Avoid alcohol"
                                  className="h-9 w-full min-w-0"
                                />
                              </div>
                            </div>

                            {med.is_chifa_listed && (
                              <Badge variant="outline" className="text-xs">
                                CNAS {med.reimbursement_rate}% reimbursable
                              </Badge>
                            )}
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <Button size="sm" variant="default" onClick={() => collapseMedication(index)} className="gap-1.5" title="Save as one line">
                                  <Save className="h-4 w-4" />
                                  Save
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => removeMedication(index)} className="h-9 w-9 text-destructive" aria-label="Remove medication">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-center px-3 py-2 border rounded-md bg-card hover:bg-muted/30 transition-colors min-w-0">
                        <span className="font-medium truncate text-sm" title={med.medication_name}>{med.medication_name || '—'}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[4rem] text-center">{med.dosage || '—'}</span>
                        <span className="text-xs text-center">{med.quantity}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[5rem] text-center">{med.frequency ? med.frequency.replace(/ \(.*\)/, '') : '—'}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[4rem] text-center">{med.duration || '—'}</span>
                        <div className="flex items-center justify-end gap-0.5 w-20">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => expandMedication(index)} aria-label="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMedication(index)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-3" />

          {/* Actions - inside scroll so they're reachable */}
          <div className="flex flex-wrap justify-end gap-2 pt-2 pb-2">
            <Button variant="outline" onClick={() => setPrescriptionMeds([])} disabled={prescriptionMeds.length === 0}>
              Clear All
            </Button>
            <Button onClick={savePrescription} disabled={saving || prescriptionMeds.length === 0} className="min-w-[140px] shrink-0">
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : editMode ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Prescription
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

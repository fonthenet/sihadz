'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, Plus, Trash2, Search, Pill, Clock, Calendar, 
  Download, Printer, Send, CheckCircle, AlertCircle,
  FileSignature, Star, History
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'

interface Medication {
  id: string
  commercial_name: string
  dci_name: string
  dosage: string
  form: string
  reimbursement_rate: number
  is_chifa_listed: boolean
}

interface PrescriptionItem {
  medication_id?: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  reimbursement_rate?: number
}

interface PrescriptionTemplate {
  id: string
  name: string
  name_ar?: string
  default_medications: PrescriptionItem[]
}

interface PrescriptionWriterProps {
  doctorId: string
  patientId?: string
  patientName?: string
  appointmentId?: string
  onComplete?: (prescriptionId: string) => void
}

export function PrescriptionWriter({ 
  doctorId, 
  patientId, 
  patientName,
  appointmentId,
  onComplete 
}: PrescriptionWriterProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([])
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Medication[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  const supabase = createBrowserClient()

  // Load medications and templates
  useEffect(() => {
    async function loadData() {
      const [medsResult, templatesResult] = await Promise.all([
        supabase.from('medications').select('*').eq('is_available', true).limit(100),
        supabase.from('prescription_templates').select('*').or(`doctor_id.eq.${doctorId},is_default.eq.true`)
      ])

      if (medsResult.data) setMedications(medsResult.data)
      if (templatesResult.data) setTemplates(templatesResult.data)
    }
    loadData()
  }, [doctorId, supabase])

  // Search medications
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const filtered = medications.filter(med => 
      med.commercial_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.dci_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setSearchResults(filtered.slice(0, 10))
  }, [searchQuery, medications])

  const addMedicationToPrescription = (medication: Medication) => {
    const newItem: PrescriptionItem = {
      medication_id: medication.id,
      medication_name: `${medication.commercial_name} ${medication.dosage}`,
      dosage: '1 ' + (medication.form === 'comprimé' ? 'tablet' : medication.form === 'gélule' ? 'capsule' : medication.form),
      frequency: 'twice daily',
      duration: '7 days',
      reimbursement_rate: medication.reimbursement_rate
    }
    setPrescriptionItems([...prescriptionItems, newItem])
    setSearchQuery('')
    setSearchResults([])
  }

  const addCustomMedication = () => {
    const newItem: PrescriptionItem = {
      medication_name: '',
      dosage: '',
      frequency: '',
      duration: ''
    }
    setPrescriptionItems([...prescriptionItems, newItem])
  }

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const updated = [...prescriptionItems]
    updated[index] = { ...updated[index], [field]: value }
    setPrescriptionItems(updated)
  }

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index))
  }

  const applyTemplate = (template: PrescriptionTemplate) => {
    if (template.default_medications) {
      setPrescriptionItems(template.default_medications as PrescriptionItem[])
    }
    setShowTemplateDialog(false)
  }

  const savePrescription = async (action: 'save' | 'print' | 'send') => {
    if (prescriptionItems.length === 0) return

    setIsSaving(true)
    try {
      const prescriptionData = {
        doctor_id: doctorId,
        patient_id: patientId,
        appointment_id: appointmentId,
        diagnosis,
        notes,
        medications: prescriptionItems,
        status: action === 'send' ? 'sent' : 'active',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .insert(prescriptionData)
        .select()
        .single()

      if (error) throw error

      if (action === 'print') {
        // Generate PDF and print
        window.print()
      }

      if (onComplete && data) {
        onComplete(data.id)
      }
    } catch (error) {
      console.error('Failed to save prescription:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getReimbursementBadge = (rate?: number) => {
    if (rate === undefined) return null
    if (rate === 100) return <Badge className="bg-green-500">100% CNAS</Badge>
    if (rate === 80) return <Badge className="bg-blue-500">80% CNAS</Badge>
    if (rate === 60) return <Badge className="bg-yellow-500">60% CNAS</Badge>
    return <Badge variant="secondary">Non remboursé</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header with Patient Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Write Prescription
              </CardTitle>
              {patientName && (
                <CardDescription>Patient: {patientName}</CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <History className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </DialogTrigger>
                <DialogContent size="lg" style={{width: '560px'}}>
                  <DialogHeader>
                    <DialogTitle>Prescription Templates</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {templates.map(template => (
                        <Card 
                          key={template.id} 
                          className="cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => applyTemplate(template)}
                        >
                          <CardContent className="p-4">
                            <div className="font-medium">{template.name}</div>
                            {template.name_ar && (
                              <div className="text-sm text-muted-foreground">{template.name_ar}</div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Diagnosis */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diagnosis / Reason</Label>
              <Input
                placeholder="e.g., Upper respiratory tract infection"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medication Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Chifa medications (e.g., Doliprane, Augmentin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <Card className="absolute z-10 w-full mt-1 shadow-lg">
                <ScrollArea className="max-h-[300px]">
                  {searchResults.map(med => (
                    <div
                      key={med.id}
                      className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between border-b last:border-0"
                      onClick={() => addMedicationToPrescription(med)}
                    >
                      <div>
                        <div className="font-medium">{med.commercial_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {med.dci_name} - {med.dosage} ({med.form})
                        </div>
                      </div>
                      {getReimbursementBadge(med.reimbursement_rate)}
                    </div>
                  ))}
                </ScrollArea>
              </Card>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={addCustomMedication} className="bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Medication
            </Button>
          </div>

          <Separator />

          {/* Prescription Items */}
          <div className="space-y-4">
            {prescriptionItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Search and add medications to the prescription
              </div>
            ) : (
              prescriptionItems.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Medication name"
                          value={item.medication_name}
                          onChange={(e) => updatePrescriptionItem(index, 'medication_name', e.target.value)}
                          className="flex-1"
                        />
                        {getReimbursementBadge(item.reimbursement_rate)}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Dosage</Label>
                          <Input
                            placeholder="e.g., 1 tablet"
                            value={item.dosage}
                            onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Frequency</Label>
                          <Select 
                            value={item.frequency}
                            onValueChange={(v) => updatePrescriptionItem(index, 'frequency', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="once daily">Once daily</SelectItem>
                              <SelectItem value="twice daily">Twice daily</SelectItem>
                              <SelectItem value="three times daily">Three times daily</SelectItem>
                              <SelectItem value="four times daily">Four times daily</SelectItem>
                              <SelectItem value="every 8 hours">Every 8 hours</SelectItem>
                              <SelectItem value="every 6 hours">Every 6 hours</SelectItem>
                              <SelectItem value="as needed">As needed</SelectItem>
                              <SelectItem value="before meals">Before meals</SelectItem>
                              <SelectItem value="after meals">After meals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Select
                            value={item.duration}
                            onValueChange={(v) => updatePrescriptionItem(index, 'duration', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3 days">3 days</SelectItem>
                              <SelectItem value="5 days">5 days</SelectItem>
                              <SelectItem value="7 days">7 days</SelectItem>
                              <SelectItem value="10 days">10 days</SelectItem>
                              <SelectItem value="14 days">14 days</SelectItem>
                              <SelectItem value="1 month">1 month</SelectItem>
                              <SelectItem value="3 months">3 months</SelectItem>
                              <SelectItem value="continuous">Continuous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Special Instructions (optional)</Label>
                        <Input
                          placeholder="e.g., Take with food"
                          value={item.instructions || ''}
                          onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removePrescriptionItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes / Instructions</Label>
            <Textarea
              placeholder="Any additional instructions for the patient..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {prescriptionItems.length} medication(s)
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => savePrescription('save')}
              disabled={isSaving || prescriptionItems.length === 0}
              className="bg-transparent"
            >
              {isSaving ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Save Draft
            </Button>
            <Button 
              variant="outline"
              onClick={() => savePrescription('print')}
              disabled={isSaving || prescriptionItems.length === 0}
              className="bg-transparent"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              onClick={() => savePrescription('send')}
              disabled={isSaving || prescriptionItems.length === 0 || !patientId}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Patient
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

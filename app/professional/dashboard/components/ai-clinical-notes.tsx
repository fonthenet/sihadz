'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Brain,
  Copy,
  Check,
  Edit,
  Save,
  Sparkles,
  FileText,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface AIClinicalNotesProps {
  appointmentId?: string
  patientName?: string
  visitReason?: string
  vitalSigns?: {
    bloodPressure?: string
    heartRate?: string
    temperature?: string
    weight?: string
    height?: string
  }
  onSaveNote?: (note: ClinicalNote) => void
}

interface ClinicalNote {
  chiefComplaint: string
  historyOfPresentIllness: string
  reviewOfSystems: string
  assessment: string
  plan: string
  icdSuggestions: Array<{ code: string; description: string }>
}

export default function AIClinicalNotes({
  appointmentId,
  patientName,
  visitReason,
  vitalSigns,
  onSaveNote,
}: AIClinicalNotesProps) {
  const { toast } = useToast()
  
  // Input state
  const [keywords, setKeywords] = useState('')
  const [existingNotes, setExistingNotes] = useState('')
  
  // AI state
  const [loading, setLoading] = useState(false)
  const [generatedNote, setGeneratedNote] = useState<ClinicalNote | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedNote, setEditedNote] = useState<ClinicalNote | null>(null)
  const [copied, setCopied] = useState(false)
  const [aiProvider, setAiProvider] = useState('')
  
  const generateNote = useCallback(async () => {
    if (!keywords.trim() || keywords.length < 10) {
      toast({
        title: 'More details needed',
        description: 'Please enter at least 10 characters of clinical keywords.',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)
    setGeneratedNote(null)
    setEditedNote(null)
    
    try {
      const res = await fetch('/api/ai/draft-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          existingNotes,
          visitReason,
          vitalSigns,
          appointmentId,
          language: 'en', // Clinical notes typically in English
        }),
      })
      
      const data = await res.json()
      
      if (res.ok && data.success && data.data) {
        setGeneratedNote(data.data)
        setEditedNote(data.data)
        setAiProvider(data.metadata?.provider || '')
      } else {
        toast({
          title: 'Generation failed',
          description: data.error || 'Failed to generate clinical note',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect to AI service',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [keywords, existingNotes, visitReason, vitalSigns, appointmentId, toast])
  
  const copyToClipboard = useCallback(() => {
    if (!editedNote) return
    
    const noteText = `
CHIEF COMPLAINT:
${editedNote.chiefComplaint}

HISTORY OF PRESENT ILLNESS:
${editedNote.historyOfPresentIllness}

REVIEW OF SYSTEMS:
${editedNote.reviewOfSystems}

ASSESSMENT:
${editedNote.assessment}

PLAN:
${editedNote.plan}

${editedNote.icdSuggestions?.length > 0 ? `ICD-10 CODES: ${editedNote.icdSuggestions.map(s => s.code).join(', ')}` : ''}
    `.trim()
    
    navigator.clipboard.writeText(noteText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    toast({ title: 'Copied to clipboard' })
  }, [editedNote, toast])
  
  const saveNote = useCallback(() => {
    if (!editedNote) return
    
    if (onSaveNote) {
      onSaveNote(editedNote)
    }
    
    toast({ title: 'Note saved' })
    setEditMode(false)
  }, [editedNote, onSaveNote, toast])
  
  const updateNoteField = (field: keyof ClinicalNote, value: any) => {
    if (!editedNote) return
    setEditedNote({ ...editedNote, [field]: value })
  }

  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              AI Clinical Notes
              {aiProvider && (
                <Badge variant="outline" className="text-xs font-normal">
                  {aiProvider}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Generate structured clinical notes from keywords
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Clinical Keywords *</Label>
            <Textarea
              placeholder="e.g., 35M, cough 5 days, productive, no fever, smoker, lungs clear, possible bronchitis"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter key findings, symptoms, and observations. The AI will expand into a structured note.
            </p>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Existing Notes (optional)</Label>
            <Textarea
              placeholder="Any existing notes to incorporate..."
              value={existingNotes}
              onChange={(e) => setExistingNotes(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          
          {/* Vital Signs Display */}
          {vitalSigns && Object.values(vitalSigns).some(Boolean) && (
            <div className="flex flex-wrap gap-2">
              {vitalSigns.bloodPressure && (
                <Badge variant="outline" className="text-xs">BP: {vitalSigns.bloodPressure}</Badge>
              )}
              {vitalSigns.heartRate && (
                <Badge variant="outline" className="text-xs">HR: {vitalSigns.heartRate}</Badge>
              )}
              {vitalSigns.temperature && (
                <Badge variant="outline" className="text-xs">Temp: {vitalSigns.temperature}</Badge>
              )}
              {vitalSigns.weight && (
                <Badge variant="outline" className="text-xs">Wt: {vitalSigns.weight}</Badge>
              )}
            </div>
          )}
          
          <Button 
            onClick={generateNote} 
            disabled={loading || keywords.length < 10}
            className="w-full"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Clinical Note
              </>
            )}
          </Button>
        </div>
        
        {/* Generated Note Display */}
        {generatedNote && editedNote && (
          <>
            <Separator />
            
            <div className="space-y-3">
              {/* Disclaimer */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>AI-generated draft. Review and modify before saving to patient record.</span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant={editMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {editMode ? 'Editing' : 'Edit'}
                </Button>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {editMode && (
                  <Button size="sm" onClick={saveNote}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                )}
              </div>
              
              {/* Note Sections */}
              <ScrollArea className="h-[400px] rounded-lg border p-4">
                <div className="space-y-4">
                  {/* Chief Complaint */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Chief Complaint</Label>
                    {editMode ? (
                      <Input
                        value={editedNote.chiefComplaint}
                        onChange={(e) => updateNoteField('chiefComplaint', e.target.value)}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-sm">{editedNote.chiefComplaint}</p>
                    )}
                  </div>
                  
                  {/* HPI */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">History of Present Illness</Label>
                    {editMode ? (
                      <Textarea
                        value={editedNote.historyOfPresentIllness}
                        onChange={(e) => updateNoteField('historyOfPresentIllness', e.target.value)}
                        rows={4}
                        className="text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{editedNote.historyOfPresentIllness}</p>
                    )}
                  </div>
                  
                  {/* ROS */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Review of Systems</Label>
                    {editMode ? (
                      <Textarea
                        value={editedNote.reviewOfSystems}
                        onChange={(e) => updateNoteField('reviewOfSystems', e.target.value)}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{editedNote.reviewOfSystems}</p>
                    )}
                  </div>
                  
                  {/* Assessment */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Assessment</Label>
                    {editMode ? (
                      <Textarea
                        value={editedNote.assessment}
                        onChange={(e) => updateNoteField('assessment', e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{editedNote.assessment}</p>
                    )}
                  </div>
                  
                  {/* Plan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Plan</Label>
                    {editMode ? (
                      <Textarea
                        value={editedNote.plan}
                        onChange={(e) => updateNoteField('plan', e.target.value)}
                        rows={4}
                        className="text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{editedNote.plan}</p>
                    )}
                  </div>
                  
                  {/* ICD Suggestions */}
                  {editedNote.icdSuggestions && editedNote.icdSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">Suggested ICD-10 Codes</Label>
                      <div className="flex flex-wrap gap-2">
                        {editedNote.icdSuggestions.map((icd, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <ClipboardList className="h-3 w-3 mr-1" />
                            {icd.code}: {icd.description}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TestTube, Send, CreditCard, Banknote, MapPin, Clock, CheckCircle, 
  AlertCircle, Building2, Phone, Star, Navigation, FileText, Download, QrCode,
  XCircle, RefreshCw, Brain, Printer, TrendingUp, TrendingDown, Minus, ChevronDown, FileDown
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { QRCodeDisplay } from './qr-code-display'
import { LabRequestDocumentsAttach } from '@/components/lab-request-documents-attach'

// Lab test status flow
export const LAB_TEST_STATUS = {
  CREATED: 'created',
  PENDING: 'pending',
  SENT_TO_LAB: 'sent_to_lab',
  PAID: 'paid',
  SAMPLE_COLLECTED: 'sample_collected',
  PROCESSING: 'processing',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  DENIED: 'denied'
} as const

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PAID_ONLINE: 'paid_online',
  PAID_CASH: 'paid_cash'
} as const

interface LabTestRequest {
  id: string
  status: string
  payment_status: string
  payment_method?: string
  laboratory_id?: string
  laboratory?: any
  laboratory_name?: string
  doctor_id?: string
  doctor_name?: string
  test_types?: string[]
  clinical_notes?: string
  diagnosis?: string
  priority?: string
  total_amount?: number
  created_at: string
  sent_to_lab_at?: string
  fulfilled_at?: string
  result_pdf_url?: string
  result_notes?: string
  doctor?: any
  patient?: any
  items?: Array<{
    id: string
    result_value?: string
    result_unit?: string
    reference_range?: string
    result_status?: string
    lab_notes?: string
    test_type?: { id: string; name?: string; name_ar?: string; category?: string }
  }>
  lab_fulfillment?: Array<{
    item_id: string
    result_value?: string
    result_unit?: string
    reference_range?: string
    result_status?: string
    status?: string
    failed_reason?: string
    lab_notes?: string
  }>
  ai_analysis_cache?: any
  ai_analysis_cached_at?: string
}

interface LabTestWorkflowProps {
  labRequest: LabTestRequest
  userRole: 'patient' | 'doctor' | 'laboratory'
  patientId?: string
  onUpdate?: () => void
  open?: boolean  // For dialog mode (doctor dashboard)
  onClose?: () => void  // For dialog mode
}

export function LabTestWorkflow({ labRequest, userRole, patientId, onUpdate, open, onClose }: LabTestWorkflowProps) {
  const { toast } = useToast()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedLab, setSelectedLab] = useState<any>(labRequest.laboratory || null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [laboratories, setLaboratories] = useState<any[]>([])
  const [loadingLabs, setLoadingLabs] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patientFavoriteLab, setPatientFavoriteLab] = useState<any>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(labRequest.ai_analysis_cache ?? null)
  const [isAiExplaining, setIsAiExplaining] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [showAiResultsDialog, setShowAiResultsDialog] = useState(false)
  const [labWorkflowTab, setLabWorkflowTab] = useState<'overview' | 'documents'>('overview')

  // Sync cached analysis when labRequest updates (e.g. after refetch)
  useEffect(() => {
    if (labRequest.ai_analysis_cache) setAiAnalysis(labRequest.ai_analysis_cache)
  }, [labRequest.ai_analysis_cache])

  const hasStoredAnalysis = !!(labRequest.ai_analysis_cache ?? aiAnalysis)

  const getResultStatusInfo = (status: string | undefined, failed?: boolean) => {
    if (failed) return { label: 'Failed', color: 'text-red-600', bg: 'bg-red-500/10', icon: XCircle }
    switch (status) {
      case 'normal': return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle }
      case 'high': return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-500/10', icon: TrendingUp }
      case 'low': return { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-500/10', icon: TrendingDown }
      case 'critical': return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-500/10', icon: AlertCircle }
      default: return { label: status || '—', color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Minus }
    }
  }

  const handleAiExplain = async () => {
    const items = labRequest.items || []
    const fulfillmentMap = new Map((labRequest.lab_fulfillment || []).map((f: any) => [f.item_id, f]))
    const resultsWithValues = items
      .map((item: any) => {
        const f = fulfillmentMap.get(item.id)
        const val = item.result_value ?? f?.result_value
        if (val == null) return null
        const ref = (item.reference_range ?? f?.reference_range) || ''
        const match = ref.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
        const min = match?.[1] ? parseFloat(match[1]) : undefined
        const max = match?.[2] ? parseFloat(match[2]) : undefined
        const numVal = parseFloat(String(val))
        const status = item.result_status ?? f?.result_status ?? (min != null && max != null
          ? (numVal < min ? 'low' : numVal > max ? 'high' : 'normal')
          : 'normal')
        const name = item.test_type?.name || item.test_type?.name_ar || 'Test'
        const unit = (item.result_unit ?? f?.result_unit) || ''
        return {
          test_name: name,
          value: numVal,
          unit,
          normal_min: min,
          normal_max: max,
          reference_range: ref || undefined,
          status,
        }
      })
      .filter(Boolean)
    if (resultsWithValues.length === 0) {
      toast({ title: 'No result values to analyze', variant: 'destructive' })
      return
    }
    setIsAiExplaining(true)
    setAiAnalysis(null)
    try {
      const res = await fetch('/api/analyze-lab-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labRequestId: labRequest.id,
          labResults: resultsWithValues.map((r: any) => ({
            test_name: r.test_name,
            value: r.value,
            unit: r.unit,
            normal_min: r.normal_min,
            normal_max: r.normal_max,
            reference_range: r.reference_range,
            status: r.status,
          })),
          patientInfo: { age: undefined, gender: undefined },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyze')
      setAiAnalysis(data.analysis)
      // Show results directly on card (not in dialog)
      onUpdate?.()
    } catch (e: any) {
      toast({ title: 'AI analysis failed', description: e?.message, variant: 'destructive' })
    } finally {
      setIsAiExplaining(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const { openPdfLabRequest, getLabRequestPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const labTemplate = labRequest.laboratory ? { labName: labRequest.laboratory.business_name } : {}
      const ok = await openPdfLabRequest(labRequest, null, { labReportTemplate: labTemplate })
      if (!ok) openPrintWindow(getLabRequestPrintHtml(labRequest, null, { labReportTemplate: labTemplate }), 'Lab Results')
      toast({ title: 'Opening PDF...' })
    } catch (e) {
      console.error('[LabTestWorkflow] PDF error:', e)
      toast({ title: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const loadLaboratories = async () => {
    setLoadingLabs(true)
    const supabase = createBrowserClient()
    
    // Get patient's profile for favorite lab and location
    if (patientId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, favorite_laboratory:favorite_laboratory_id(id, business_name, wilaya, commune, address, phone)')
        .eq('id', patientId)
        .single()
      
      if (profile?.favorite_laboratory) {
        setPatientFavoriteLab(profile.favorite_laboratory)
      }
    }

    // Get laboratories
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('professional_type', 'laboratory')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(20)

    if (data) {
      setLaboratories(data)
    }
    setLoadingLabs(false)
  }

  const handleSendToLab = async () => {
    if (!selectedLab) {
      toast({ title: 'Please select a laboratory', variant: 'destructive' })
      return
    }
    setShowSendDialog(false)
    setShowPaymentDialog(true)
  }

  const handleConfirmPayment = async () => {
    setIsSubmitting(true)
    const supabase = createBrowserClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const updateData: any = {
        laboratory_id: selectedLab.id,
        status: LAB_TEST_STATUS.SENT_TO_LAB,
        payment_method: paymentMethod,
        sent_to_lab_at: new Date().toISOString(),
        sent_by_user_id: user?.id
      }

      if (paymentMethod === 'cash') {
        updateData.payment_status = PAYMENT_STATUS.UNPAID
      } else {
        // For online payment, redirect to payment gateway
        // For now, simulate successful payment
        updateData.payment_status = PAYMENT_STATUS.PAID_ONLINE
      }

      const { error } = await supabase
        .from('lab_test_requests')
        .update(updateData)
        .eq('id', labRequest.id)

      if (error) throw error

      // Create notification for laboratory
      await supabase.from('notifications').insert({
        user_id: selectedLab.auth_user_id,
        title: 'New Lab Test Request',
        message: `A new lab test request has been received${paymentMethod === 'online' ? ' (Paid Online)' : ' (Cash on Visit)'}`,
        type: 'lab_request',
        data: { lab_request_id: labRequest.id }
      })

      toast({ title: 'Lab test request sent successfully!' })
      setShowPaymentDialog(false)
      onUpdate?.()
      onClose?.()  // Close dialog mode if active
    } catch (error: any) {
      toast({ title: 'Error sending lab request', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle resending a denied lab request
  const handleResend = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/lab-requests/${labRequest.id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to prepare resend')
      }
      
      toast({ title: 'Ready to resend', description: 'Select a different laboratory to send this request.' })
      onUpdate?.()
      // Open lab selector
      loadLaboratories()
      setShowSendDialog(true)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = () => {
    const status = labRequest.status
    const paymentStatus = labRequest.payment_status

    switch (status) {
      case LAB_TEST_STATUS.CREATED:
      case LAB_TEST_STATUS.PENDING:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>
      case LAB_TEST_STATUS.SENT_TO_LAB:
        if (paymentStatus === PAYMENT_STATUS.PAID_ONLINE) {
          return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Sent to Lab (Paid)</Badge>
        }
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Sent to Lab (Unpaid)</Badge>
      case LAB_TEST_STATUS.SAMPLE_COLLECTED:
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Sample Collected</Badge>
      case LAB_TEST_STATUS.PROCESSING:
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">Processing</Badge>
      case LAB_TEST_STATUS.FULFILLED:
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Results Ready</Badge>
      case LAB_TEST_STATUS.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>
      case LAB_TEST_STATUS.DENIED:
        return <Badge variant="destructive">Denied by Lab</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPriorityBadge = () => {
    switch (labRequest.priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>
      case 'stat':
        return <Badge variant="destructive" className="text-xs animate-pulse">STAT</Badge>
      default:
        return null
    }
  }

  const canSendToLab = (labRequest.status === LAB_TEST_STATUS.CREATED || labRequest.status === LAB_TEST_STATUS.PENDING) && 
    (userRole === 'patient' || userRole === 'doctor')
  const isDenied = labRequest.status === LAB_TEST_STATUS.DENIED
  const canResend = isDenied && userRole === 'doctor'

  // If open is provided, we're in dialog mode (doctor dashboard after creating lab request)
  const isDialogMode = open !== undefined
  
  // For dialog mode, auto-show the send dialog when opened
  useEffect(() => {
    if (isDialogMode && open && canSendToLab) {
      setShowSendDialog(true)
      loadLaboratories()
    }
  }, [open, isDialogMode, canSendToLab])

  // Handle close when in dialog mode
  const handleCloseAll = () => {
    setShowSendDialog(false)
    setShowPaymentDialog(false)
    onClose?.()
  }

  // Render dialogs only
  const renderDialogs = () => (
    <>
      {/* Select Laboratory Dialog */}
      <Dialog open={showSendDialog} onOpenChange={(isOpen) => {
        setShowSendDialog(isOpen)
        if (!isOpen && isDialogMode) onClose?.()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Laboratory</DialogTitle>
            <DialogDescription>
              Choose a laboratory for your tests
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 p-1">
              {/* Favorite Laboratory */}
              {patientFavoriteLab && (
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLab?.id === patientFavoriteLab.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedLab(patientFavoriteLab)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-sm">Your Favorite</span>
                  </div>
                  <p className="font-medium">{patientFavoriteLab.business_name}</p>
                  <p className="text-xs text-muted-foreground">{patientFavoriteLab.address}</p>
                </div>
              )}

              <Separator className="my-2" />
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Navigation className="h-4 w-4" />
                <span>Nearby Laboratories</span>
              </div>

              {loadingLabs ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                laboratories.map((lab) => (
                  <div 
                    key={lab.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLab?.id === lab.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedLab(lab)}
                  >
                    <p className="font-medium">{lab.business_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{lab.address || `${lab.wilaya}, ${lab.commune}`}</span>
                    </div>
                    {lab.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{lab.phone}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSendDialog(false)
              if (isDialogMode) onClose?.()
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendToLab} disabled={!selectedLab}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(isOpen) => {
        setShowPaymentDialog(isOpen)
        if (!isOpen && isDialogMode) onClose?.()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              How would you like to pay for the lab tests?
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'online')}>
            <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${
              paymentMethod === 'cash' ? 'border-primary bg-primary/5' : ''
            }`} onClick={() => setPaymentMethod('cash')}>
              <RadioGroupItem value="cash" id="lab-cash" />
              <Label htmlFor="lab-cash" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Pay Cash at Laboratory</p>
                  <p className="text-sm text-muted-foreground">Pay when you visit for sample collection</p>
                </div>
              </Label>
            </div>

            <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${
              paymentMethod === 'online' ? 'border-primary bg-primary/5' : ''
            }`} onClick={() => setPaymentMethod('online')}>
              <RadioGroupItem value="online" id="lab-online" />
              <Label htmlFor="lab-online" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Pay Online</p>
                  <p className="text-sm text-muted-foreground">Pay now with card or mobile payment</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {labRequest.total_amount && labRequest.total_amount > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold">DZD {labRequest.total_amount}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Back
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner size="sm" className="me-2" />}
              {paymentMethod === 'cash' ? 'Confirm & Send' : 'Proceed to Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Lab Test QR Code</DialogTitle>
            <DialogDescription>Scan to view lab test details</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <QRCodeDisplay
              value={JSON.stringify({
                type: 'lab_test',
                id: labRequest.id,
                doctor_name: labRequest.doctor_name,
                laboratory_name: labRequest.laboratory_name,
                tests: labRequest.test_types?.length || 0,
                status: labRequest.status
              })}
              size={160}
              downloadFileName={`lab-test-${labRequest.id}`}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Explanation Dialog - hidden until "View results" clicked */}
      <Dialog open={showAiResultsDialog} onOpenChange={setShowAiResultsDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Explanation
            </DialogTitle>
            <DialogDescription>Educational summary of your lab results. Always consult your doctor for medical advice.</DialogDescription>
          </DialogHeader>
          {aiAnalysis && (
            <div className="space-y-3 text-sm pt-2">
              {typeof aiAnalysis === 'object' ? (
                <>
                  {aiAnalysis.summary && <p>{aiAnalysis.summary}</p>}
                  {aiAnalysis.findings?.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {aiAnalysis.findings.map((f: any, i: number) => (
                        <li key={i}>
                          <strong>{f.test}</strong> ({f.status}): {f.explanation}
                        </li>
                      ))}
                    </ul>
                  )}
                  {aiAnalysis.recommendations?.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Recommendations:</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {aiAnalysis.recommendations.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalysis.disclaimer && (
                    <p className="text-xs text-muted-foreground italic mt-2">{aiAnalysis.disclaimer}</p>
                  )}
                </>
              ) : (
                <p>{String(aiAnalysis)}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )

  // If in dialog mode, only render dialogs
  if (isDialogMode) {
    return renderDialogs()
  }

  return (
    <>
      <Card className="overflow-hidden gap-3 py-3 w-full min-w-0">
      <CardHeader className="p-4 pt-3 pb-3 border-b space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <TestTube className="h-5 w-5 shrink-0 text-primary" />
              <CardTitle className="text-lg">Lab Test Request</CardTitle>
              {getPriorityBadge()}
              {labRequest.diagnosis && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-xs" title={labRequest.diagnosis}>— {labRequest.diagnosis}</span>
              )}
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-4">
          {/* Tabs: Overview | Documents */}
          {labRequest.id && (
            <div className="flex gap-1 border-b pb-3 -mx-1 px-1">
              <Button
                variant={labWorkflowTab === 'overview' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setLabWorkflowTab('overview')}
              >
                Overview
              </Button>
              <Button
                variant={labWorkflowTab === 'documents' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setLabWorkflowTab('documents')}
              >
                <FileText className="h-4 w-4 me-1" />
                Documents
              </Button>
            </div>
          )}
          {labWorkflowTab === 'overview' && (
          <>
          {/* Test Types List */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Requested Tests</Label>
            <div className="flex flex-wrap gap-2">
              {(labRequest.items?.length ? labRequest.items.map((item: any) => item.test_type?.name || item.test_type?.name_ar || 'Test') : labRequest.test_types || []).map((test: string, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {test}
                </Badge>
              ))}
            </div>
          </div>

          {/* Clinical Notes */}
          {labRequest.clinical_notes && (
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Clinical Notes</Label>
              <p className="text-sm text-muted-foreground">{labRequest.clinical_notes}</p>
            </div>
          )}

          {/* Laboratory Info (if assigned) */}
          {labRequest.laboratory && (
            <div className="flex items-start gap-2 text-sm min-w-0">
              <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="break-words">{labRequest.laboratory.business_name} — {labRequest.laboratory.address || `${labRequest.laboratory.commune || ''} ${labRequest.laboratory.wilaya || ''}`.trim()}</span>
            </div>
          )}

          {/* Results Section — full table like doctor sees + AI + PDF */}
          {labRequest.status === LAB_TEST_STATUS.FULFILLED && (() => {
            const items = labRequest.items || []
            const fulfillmentMap = new Map((labRequest.lab_fulfillment || []).map((f: any) => [f.item_id, f]))
            const hasResults = items.some((item: any) => item.result_value ?? fulfillmentMap.get(item.id)?.result_value)

            return (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="text-sm font-medium">Test Results</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {hasResults && (
                      <Button size="sm" variant="outline" onClick={handleAiExplain} disabled={isAiExplaining} className="h-8 px-3">
                        {isAiExplaining ? <LoadingSpinner size="sm" /> : <Brain className="h-4 w-4" />}
                        <span className="ml-1.5">{isAiExplaining ? 'Analyzing...' : 'Analyze'}</span>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 px-3">
                          <Download className="h-4 w-4 me-2" />
                          PDF
                          <ChevronDown className="h-3.5 w-3.5 ms-1 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDownloadPdf}>
                          <FileDown className="h-4 w-4 me-2" />
                          Download PDF
                        </DropdownMenuItem>
                        {labRequest.result_pdf_url && (
                          <DropdownMenuItem asChild>
                            <a href={labRequest.result_pdf_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 me-2" />
                              Open PDF
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="outline" onClick={() => setShowQrDialog(true)} className="h-8 px-3">
                      <QrCode className="h-4 w-4 me-2" />
                      QR
                    </Button>
                  </div>
                </div>

                {hasResults ? (
                  <div className="rounded-xl border overflow-x-auto overflow-y-visible">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium">Test</th>
                          <th className="px-4 py-3 text-center font-medium">Result</th>
                          <th className="px-4 py-3 text-center font-medium">Unit</th>
                          <th className="px-4 py-3 text-center font-medium">Ref. Range</th>
                          <th className="px-4 py-3 text-center font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: any) => {
                          const f = fulfillmentMap.get(item.id)
                          const val = item.result_value ?? f?.result_value
                          const unit = item.result_unit ?? f?.result_unit
                          const ref = item.reference_range ?? f?.reference_range
                          const status = item.result_status ?? f?.result_status
                          const failed = (f?.status || item.result_status) === 'failed'
                          const name = item.test_type?.name || item.test_type?.name_ar || '—'
                          const statusInfo = getResultStatusInfo(status, failed)
                          const StatusIcon = statusInfo.icon
                          return (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-3 font-medium">{name}</td>
                              <td className="px-4 py-3 text-center">{failed ? <span className="text-destructive">Failed</span> : (val ?? '—')}</td>
                              <td className="px-4 py-3 text-center text-muted-foreground">{unit || '—'}</td>
                              <td className="px-4 py-3 text-center text-muted-foreground">{ref || '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${statusInfo.bg} ${statusInfo.color}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusInfo.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-2 border border-green-500/30 bg-green-500/5 rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Results Available</span>
                    </div>
                    {labRequest.result_pdf_url && (
                      <Button size="sm" variant="outline" className="mt-2" asChild>
                        <a href={labRequest.result_pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 me-2" />
                          Download PDF
                        </a>
                      </Button>
                    )}
                    {labRequest.result_notes && (
                      <p className="text-sm text-muted-foreground mt-2">{labRequest.result_notes}</p>
                    )}
                  </div>
                )}

                {labRequest.result_notes && hasResults && (
                  <p className="text-sm text-muted-foreground">{labRequest.result_notes}</p>
                )}

                {/* AI Analysis - shown directly on card */}
                {aiAnalysis && (
                  <div className="rounded-xl border border-violet-200/50 dark:border-violet-800/30 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                        <Brain className="h-5 w-5" />
                        <span className="font-medium">AI Explanation</span>
                      </div>
                      {aiAnalysis.provider && (
                        <Badge variant="outline" className="text-xs bg-violet-100 dark:bg-violet-900/50 border-violet-300 dark:border-violet-700">
                          {aiAnalysis.provider}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      {typeof aiAnalysis === 'object' ? (
                        <>
                          {aiAnalysis.summary && <p>{aiAnalysis.summary}</p>}
                          {aiAnalysis.findings?.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1">
                              {aiAnalysis.findings.map((f: any, i: number) => (
                                <li key={i}>
                                  <strong>{f.test}</strong> ({f.status}): {f.explanation}
                                </li>
                              ))}
                            </ul>
                          )}
                          {aiAnalysis.recommendations?.length > 0 && (
                            <div>
                              <p className="font-medium mb-1">Recommendations:</p>
                              <ul className="list-disc pl-5 space-y-0.5">
                                {aiAnalysis.recommendations.map((r: string, i: number) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {aiAnalysis.disclaimer && (
                            <p className="text-xs text-muted-foreground italic mt-2">{aiAnalysis.disclaimer}</p>
                          )}
                        </>
                      ) : (
                        <p>{String(aiAnalysis)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })(          )}

          {/* QR — when not fulfilled, no PDF; show button here */}
          {labRequest.status !== LAB_TEST_STATUS.FULFILLED && (
            <div className="border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowQrDialog(true)} className="h-8 px-3">
                <QrCode className="h-4 w-4 me-2" />
                QR
              </Button>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Timeline</Label>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Requested: {new Date(labRequest.created_at).toLocaleString()}</span>
              </div>
              {labRequest.sent_to_lab_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Send className="h-3 w-3" />
                  <span>Sent: {new Date(labRequest.sent_to_lab_at).toLocaleString()}</span>
                </div>
              )}
              {labRequest.fulfilled_at && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Completed: {new Date(labRequest.fulfilled_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {canSendToLab && (
            <Button 
              className="w-full h-9" 
              onClick={() => {
                loadLaboratories()
                setShowSendDialog(true)
              }}
            >
              <Send className="h-4 w-4 me-2" />
              Send to Laboratory
            </Button>
          )}

        {labRequest.status === LAB_TEST_STATUS.FULFILLED && (
          <Alert className="border-green-500/30 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Your lab test results are ready! Download the PDF above.
            </AlertDescription>
          </Alert>
        )}

        {/* Denied Alert */}
        {isDenied && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {userRole === 'patient' 
                  ? 'This lab request was denied by the laboratory. Your doctor can send it to a different lab.'
                  : 'This lab request was denied by the laboratory. You can send it to a different lab.'}
              </span>
              {canResend && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-2 shrink-0"
                  onClick={handleResend}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoadingSpinner size="sm" className="mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Send to Another
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
          </>
          )}
          {labWorkflowTab === 'documents' && labRequest.id && (
            <LabRequestDocumentsAttach
              labRequestId={labRequest.id}
              viewerType={userRole === 'patient' ? 'patient' : 'doctor'}
            />
          )}
        </CardContent>
      </Card>

      {renderDialogs()}
    </>
  )
}

export default LabTestWorkflow

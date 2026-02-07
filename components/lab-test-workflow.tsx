'use client'

import { useState, useEffect, useRef } from 'react'
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
  XCircle, RefreshCw, Brain, Printer, TrendingUp, TrendingDown, Minus, ChevronDown, FileDown, Maximize2,
  Table2, LayoutGrid
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { QRCodeDisplay } from './qr-code-display'
import { LabRequestDocumentsAttach } from '@/components/lab-request-documents-attach'
import { getStatusBadgeClassName } from '@/lib/status-colors'

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
  const [showAiAnalysisDialog, setShowAiAnalysisDialog] = useState(false)
  const [labWorkflowTab, setLabWorkflowTab] = useState<'overview' | 'documents'>('overview')
  const [resultsViewMode, setResultsViewMode] = useState<'cards' | 'table'>('cards')
  const [showAllResultsPopup, setShowAllResultsPopup] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [pdfViewerLoading, setPdfViewerLoading] = useState(false)
  const pdfViewerRevokeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setShowAllResultsPopup(false)
  }, [labRequest.id])

  // Sync cached analysis when labRequest updates (e.g. after refetch)
  useEffect(() => {
    if (labRequest.ai_analysis_cache) setAiAnalysis(labRequest.ai_analysis_cache)
  }, [labRequest.ai_analysis_cache])

  const hasStoredAnalysis = !!(labRequest.ai_analysis_cache ?? aiAnalysis)

  const getResultStatusInfo = (status: string | undefined, failed?: boolean) => {
    if (failed) return { label: 'Failed', color: 'text-violet-600', bg: 'bg-violet-500/10', icon: XCircle }
    switch (status) {
      case 'normal': return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle }
      case 'high': return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-500/10', icon: TrendingUp }
      case 'low': return { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-500/10', icon: TrendingDown }
      case 'critical': return { label: 'Critical', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: AlertCircle }
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
      onUpdate?.()
      setShowAiAnalysisDialog(true)
    } catch (e: any) {
      toast({ title: 'AI analysis failed', description: e?.message, variant: 'destructive' })
    } finally {
      setIsAiExplaining(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const { downloadLabRequestPdf, getLabRequestPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const labTemplate = labRequest.laboratory ? { labName: labRequest.laboratory.business_name } : {}
      const ok = await downloadLabRequestPdf(labRequest, null, { labReportTemplate: labTemplate })
      if (!ok) {
        openPrintWindow(getLabRequestPrintHtml(labRequest, null, { labReportTemplate: labTemplate }), 'Lab Results')
        toast({ title: 'Opening print view...' })
      } else {
        toast({ title: 'PDF downloaded' })
      }
    } catch (e) {
      console.error('[LabTestWorkflow] PDF error:', e)
      toast({ title: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handleViewPdf = async () => {
    if (labRequest.result_pdf_url) {
      pdfViewerRevokeRef.current = null
      setPdfViewerUrl(labRequest.result_pdf_url)
      setShowPdfViewer(true)
      return
    }
    setPdfViewerLoading(true)
    setShowPdfViewer(true)
    setPdfViewerUrl(null)
    try {
      const { generateLabRequestPdf } = await import('@/lib/print-prescription-lab')
      const labTemplate = labRequest.laboratory ? { labName: labRequest.laboratory.business_name } : {}
      const result = await generateLabRequestPdf(labRequest, null, { labReportTemplate: labTemplate })
      if (result) {
        pdfViewerRevokeRef.current = result.revoke
        setPdfViewerUrl(result.url)
      } else {
        toast({ title: 'Failed to generate PDF', variant: 'destructive' })
        setShowPdfViewer(false)
      }
    } catch (e) {
      console.error('[LabTestWorkflow] PDF view error:', e)
      toast({ title: 'Failed to generate PDF', variant: 'destructive' })
      setShowPdfViewer(false)
    } finally {
      setPdfViewerLoading(false)
    }
  }

  const closePdfViewer = () => {
    setShowPdfViewer(false)
    if (pdfViewerRevokeRef.current) {
      pdfViewerRevokeRef.current()
      pdfViewerRevokeRef.current = null
    }
    setPdfViewerUrl(null)
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

    const labels: Record<string, string> = {
      [LAB_TEST_STATUS.CREATED]: 'Pending',
      [LAB_TEST_STATUS.PENDING]: 'Pending',
      [LAB_TEST_STATUS.SENT_TO_LAB]: paymentStatus === PAYMENT_STATUS.PAID_ONLINE ? 'Sent to Lab (Paid)' : 'Sent to Lab (Unpaid)',
      [LAB_TEST_STATUS.SAMPLE_COLLECTED]: 'Sample Collected',
      [LAB_TEST_STATUS.PROCESSING]: 'Processing',
      [LAB_TEST_STATUS.FULFILLED]: 'Results Ready',
      [LAB_TEST_STATUS.CANCELLED]: 'Cancelled',
      [LAB_TEST_STATUS.DENIED]: 'Denied by Lab',
    }
    const label = labels[status] ?? status
    const className = getStatusBadgeClassName(status, 'solid')
    return <Badge className={`${className} whitespace-nowrap shrink-0`}>{label}</Badge>
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

      {/* AI Explanation Dialog - opens after Analyze or when View AI Explanation clicked */}
      <Dialog open={showAiAnalysisDialog} onOpenChange={setShowAiAnalysisDialog}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Explanation
              </DialogTitle>
              <div className="flex items-center gap-2">
                {aiAnalysis?.urgency && (
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${
                      aiAnalysis.urgency === 'urgent' ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                      aiAnalysis.urgency === 'soon' ? 'border-orange-500/60 bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                      'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {aiAnalysis.urgency === 'urgent' ? 'Consult soon' : aiAnalysis.urgency === 'soon' ? 'Follow up' : 'Routine'}
                  </Badge>
                )}
                {aiAnalysis?.provider && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {aiAnalysis.provider}
                  </Badge>
                )}
              </div>
            </div>
            <DialogDescription>Educational summary of your lab results. Always consult your doctor for medical advice.</DialogDescription>
          </DialogHeader>
          {aiAnalysis ? (
            <div className="space-y-5 text-sm">
              {typeof aiAnalysis === 'object' ? (
                <>
                  {aiAnalysis.summary && (
                    <div className="rounded-xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/60 dark:bg-violet-950/30 p-4">
                      <p className="font-medium text-violet-800 dark:text-violet-300 mb-1.5">Summary</p>
                      <p className="leading-relaxed">{aiAnalysis.summary}</p>
                      {aiAnalysis.summary_ar && (
                        <p className="mt-3 pt-3 border-t border-violet-200/40 dark:border-violet-800/30 text-muted-foreground leading-relaxed" dir="rtl">
                          {aiAnalysis.summary_ar}
                        </p>
                      )}
                    </div>
                  )}
                  {aiAnalysis.findings?.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Findings by test
                      </p>
                      <div className="space-y-2">
                        {aiAnalysis.findings.map((f: any, i: number) => {
                          const statusLower = (f.status || '').toLowerCase()
                          const statusStyle =
                            statusLower === 'normal' ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20' :
                            statusLower === 'high' ? 'border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20' :
                            statusLower === 'low' ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20' :
                            'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20'
                          const statusBadge =
                            statusLower === 'normal' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                            statusLower === 'high' ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400' :
                            statusLower === 'low' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' :
                            'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          return (
                            <div key={i} className={`rounded-lg border p-3 ${statusStyle}`}>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-medium">{f.test}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusBadge}`}>
                                  {f.status || '—'}
                                </span>
                              </div>
                              <p className="text-muted-foreground leading-relaxed">{f.explanation}</p>
                              {f.explanation_ar && (
                                <p className="mt-2 pt-2 border-t border-border/40 text-muted-foreground text-xs leading-relaxed" dir="rtl">
                                  {f.explanation_ar}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {aiAnalysis.recommendations?.length > 0 && (
                    <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                      <p className="font-medium text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Recommendations
                      </p>
                      <ul className="space-y-2">
                        {aiAnalysis.recommendations.map((r: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                            <span className="leading-relaxed">{r}</span>
                          </li>
                        ))}
                      </ul>
                      {aiAnalysis.recommendations_ar?.length > 0 && (
                        <ul className="mt-3 pt-3 border-t border-emerald-200/40 dark:border-emerald-800/30 space-y-1" dir="rtl">
                          {aiAnalysis.recommendations_ar.map((r: string, i: number) => (
                            <li key={i} className="text-muted-foreground text-xs">{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {aiAnalysis.disclaimer && (
                    <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20 p-3">
                      <p className="text-xs text-muted-foreground italic leading-relaxed">{aiAnalysis.disclaimer}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="leading-relaxed">{String(aiAnalysis)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No analysis available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* All Results Popup - compact cards with per-test colors */}
      <Dialog open={showAllResultsPopup} onOpenChange={setShowAllResultsPopup}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden pt-4 flex flex-col">
          <DialogHeader className="shrink-0 pb-0 gap-0.5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <TestTube className="h-5 w-5 text-primary" />
              All test results
            </DialogTitle>
            <DialogDescription className="mb-0 text-xs">Full details for all requested tests</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto mt-1">
            {((labRequest.items || []) as any[]).map((item: any, idx: number) => {
              const f = (labRequest.lab_fulfillment || []).find((x: any) => x.item_id === item.id)
              const val = item.result_value ?? f?.result_value
              const unit = item.result_unit ?? f?.result_unit
              const ref = item.reference_range ?? f?.reference_range
              const failed = (f?.status || item.result_status) === 'failed'
              const name = item.test_type?.name || item.test_type?.name_ar || '—'
              const refMatch = ref?.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
              const min = refMatch?.[1] ? parseFloat(refMatch[1]) : undefined
              const max = refMatch?.[2] ? parseFloat(refMatch[2]) : undefined
              const numVal = val != null ? parseFloat(String(val)) : undefined
              const showBar = !failed && min != null && max != null && numVal != null && !isNaN(numVal)

              // Derive status from value vs reference when not in data
              const status = item.result_status ?? f?.result_status ?? (min != null && max != null && numVal != null && !isNaN(numVal)
                ? (numVal < min ? 'low' : numVal > max ? 'high' : 'normal')
                : 'normal')

              const statusInfo = getResultStatusInfo(status, failed)
              const StatusIcon = statusInfo.icon

              // Each test gets a distinct color: status-based when abnormal, else cycle by index
              const accentPalette = ['violet', 'amber', 'sky', 'emerald', 'fuchsia', 'teal', 'indigo', 'cyan'] as const
              const accent = failed
                ? 'violet'
                : status === 'critical'
                  ? 'amber'
                  : status === 'high'
                    ? 'amber'
                    : status === 'low'
                      ? 'sky'
                      : accentPalette[idx % accentPalette.length]

              const accentClasses: Record<string, string> = {
                violet: 'border-s-violet-500 bg-violet-50/60 dark:bg-violet-950/30',
                amber: 'border-s-amber-500 bg-amber-50/60 dark:bg-amber-950/30',
                sky: 'border-s-sky-500 bg-sky-50/60 dark:bg-sky-950/30',
                emerald: 'border-s-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30',
                fuchsia: 'border-s-fuchsia-500 bg-fuchsia-50/60 dark:bg-fuchsia-950/30',
                teal: 'border-s-teal-500 bg-teal-50/60 dark:bg-teal-950/30',
                indigo: 'border-s-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30',
                cyan: 'border-s-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30',
              }

              const textClasses: Record<string, string> = {
                violet: 'text-violet-700 dark:text-violet-400',
                amber: 'text-amber-700 dark:text-amber-400',
                sky: 'text-sky-700 dark:text-sky-400',
                emerald: 'text-emerald-700 dark:text-emerald-400',
                fuchsia: 'text-fuchsia-700 dark:text-fuchsia-400',
                teal: 'text-teal-700 dark:text-teal-400',
                indigo: 'text-indigo-700 dark:text-indigo-400',
                cyan: 'text-cyan-700 dark:text-cyan-400',
              }

              const barBgClasses: Record<string, string> = {
                violet: 'bg-violet-500',
                amber: 'bg-amber-500',
                sky: 'bg-sky-500',
                emerald: 'bg-emerald-500',
                fuchsia: 'bg-fuchsia-500',
                teal: 'bg-teal-500',
                indigo: 'bg-indigo-500',
                cyan: 'bg-cyan-500',
              }

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border border-s-4 border-muted p-2.5 ${accentClasses[accent]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium text-sm truncate ${textClasses[accent]}`}>{name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md shrink-0 ${statusInfo.bg} ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className={`text-lg font-bold tabular-nums ${textClasses[accent]}`}>
                      {failed ? '—' : (val ?? '—')}
                    </span>
                    {!failed && unit && (
                      <span className={`text-xs font-medium ${textClasses[accent]} opacity-80`}>{unit}</span>
                    )}
                  </div>
                  {ref && !failed && (
                    <p className={`text-xs mt-0.5 truncate font-medium ${textClasses[accent]} opacity-90`}>Ref: {ref}</p>
                  )}
                  {showBar && (
                    <div className={`flex items-center gap-1.5 text-xs mt-1 font-medium ${textClasses[accent]}`}>
                      <span className="tabular-nums w-6 opacity-80">{min}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barBgClasses[accent]}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, ((numVal - min) / (max - min)) * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="tabular-nums w-6 opacity-80">{max}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={showPdfViewer} onOpenChange={(open) => !open && closePdfViewer()}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="flex items-center px-4 py-2 shrink-0 border-b">
            <DialogTitle className="text-base font-medium">Lab Results PDF</DialogTitle>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            {pdfViewerLoading && (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-muted-foreground">Generating PDF…</p>
              </div>
            )}
            {!pdfViewerLoading && pdfViewerUrl && (
              <iframe
                src={pdfViewerUrl}
                title="Lab Results PDF"
                className="w-full h-full min-h-[400px] rounded-lg border bg-muted"
              />
            )}
          </div>
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
      <Card className="overflow-hidden gap-2 sm:gap-3 pt-0 pb-2 sm:pb-3 w-full min-w-0">
      <CardHeader className="p-3 pt-2 pb-2 sm:p-4 sm:pb-3 border-b bg-sky-50/70 dark:bg-sky-950/25 space-y-1 sm:space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <TestTube className="h-5 w-5 shrink-0 text-primary" />
              <CardTitle className="text-base sm:text-lg">Lab Test Request</CardTitle>
              {getPriorityBadge()}
              {labRequest.diagnosis && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-xs" title={labRequest.diagnosis}>— {labRequest.diagnosis}</span>
              )}
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2 space-y-3 sm:p-4 sm:pt-3 sm:space-y-4">
          {/* Tabs: Overview | Documents */}
          {labRequest.id && (
            <div className="flex gap-1 border-b pb-2 sm:pb-3 -mx-1 px-1">
              <Button
                variant={labWorkflowTab === 'overview' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setLabWorkflowTab('overview')}
              >
                Overview
              </Button>
              <Button
                variant={labWorkflowTab === 'documents' ? 'secondary' : 'outline'}
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
          <div className="space-y-1 sm:space-y-1.5">
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
              <div className="space-y-2 sm:space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Test Results</Label>
                    {hasResults && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setResultsViewMode(resultsViewMode === 'cards' ? 'table' : 'cards')}
                        title={resultsViewMode === 'cards' ? 'View as table' : 'View as cards'}
                      >
                        {resultsViewMode === 'cards' ? (
                          <><Table2 className="h-4 w-4 me-1.5" />Table</>
                        ) : (
                          <><LayoutGrid className="h-4 w-4 me-1.5" />Cards</>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {hasResults && (
                      <Button size="sm" variant="outline" onClick={() => setShowAllResultsPopup(true)} className="h-8 px-3">
                        <Maximize2 className="h-4 w-4 me-1.5" />
                        View all
                      </Button>
                    )}
                    {hasResults && (
                      hasStoredAnalysis ? (
                        <Button size="sm" variant="outline" onClick={() => setShowAiAnalysisDialog(true)} className="h-8 px-2 sm:px-3">
                          <Brain className="h-4 w-4 me-1 sm:me-1.5" />
                          <span className="hidden sm:inline">View AI Explanation</span>
                          <span className="sm:hidden">AI</span>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={handleAiExplain} disabled={isAiExplaining} className="h-8 px-2 sm:px-3">
                          {isAiExplaining ? (
                            <LoadingSpinner size="sm" className="me-1 sm:me-1.5" />
                          ) : (
                            <Brain className="h-4 w-4 me-1 sm:me-1.5" />
                          )}
                          <span className="hidden sm:inline">{isAiExplaining ? 'Analyzing...' : 'Analyze'}</span>
                          <span className="sm:hidden">{isAiExplaining ? '…' : 'AI'}</span>
                        </Button>
                      )
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 px-3">
                          PDF / QR
                          <ChevronDown className="h-3.5 w-3.5 ms-1 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleViewPdf}>
                          <FileText className="h-4 w-4 me-2" />
                          View PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadPdf}>
                          <FileDown className="h-4 w-4 me-2" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowQrDialog(true)}>
                          <QrCode className="h-4 w-4 me-2" />
                          Show QR Code
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {hasResults ? (
                  resultsViewMode === 'table' ? (
                    <div className="rounded-none sm:rounded-xl border overflow-x-auto overflow-y-visible">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">Test</th>
                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-center font-medium">Result</th>
                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-center font-medium">Unit</th>
                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-center font-medium">Ref. Range</th>
                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-center font-medium">Status</th>
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
                                <td className="px-3 py-2 sm:px-4 sm:py-3 font-medium">{name}</td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-center">{failed ? <span className="text-destructive">Failed</span> : (val ?? '—')}</td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-center text-muted-foreground">{unit || '—'}</td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-center text-muted-foreground">{ref || '—'}</td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-center">
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
                  <>
                    {/* Mobile: ultra-compact list (View all button is in header) */}
                    <div className="sm:hidden divide-y divide-border/60 rounded-none border border-border/60 bg-card">
                        {items.map((item: any) => {
                          const f = fulfillmentMap.get(item.id)
                          const val = item.result_value ?? f?.result_value
                          const unit = item.result_unit ?? f?.result_unit
                          const failed = (f?.status || item.result_status) === 'failed'
                          const name = item.test_type?.name || item.test_type?.name_ar || '—'
                          const statusInfo = getResultStatusInfo(item.result_status ?? f?.result_status, failed)
                          const StatusIcon = statusInfo.icon

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 py-2 px-2 sm:py-2.5 sm:px-3 min-w-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-muted-foreground truncate">{name}</p>
                                <p className="text-sm font-semibold tabular-nums truncate">
                                  {failed ? <span className="text-destructive">Failed</span> : `${val ?? '—'} ${unit || ''}`.trim()}
                                </p>
                              </div>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${statusInfo.bg} ${statusInfo.color}`}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {statusInfo.label}
                              </span>
                            </div>
                          )
                        })}
                    </div>

                    {/* Desktop: full cards */}
                    <div className="hidden sm:grid gap-2 sm:gap-4">
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
                        const refMatch = ref?.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
                        const min = refMatch?.[1] ? parseFloat(refMatch[1]) : undefined
                        const max = refMatch?.[2] ? parseFloat(refMatch[2]) : undefined
                        const numVal = val != null ? parseFloat(String(val)) : undefined
                        const showBar = !failed && min != null && max != null && numVal != null && !isNaN(numVal)

                        return (
                          <div
                            key={item.id}
                            className={`
                              rounded-xl border p-3 sm:p-4 min-w-0
                              ${failed ? 'border-destructive/30 bg-destructive/5' : 'border-border/60 bg-card'}
                            `}
                          >
                            <div className="flex items-center justify-between gap-3 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-muted-foreground">{name}</p>
                                <div className="flex items-baseline gap-2 flex-wrap mt-1.5">
                                  <span className={`text-2xl font-bold tabular-nums ${failed ? 'text-destructive' : ''}`}>
                                    {failed ? 'Failed' : (val ?? '—')}
                                  </span>
                                  {!failed && unit && (
                                    <span className="text-base font-medium text-muted-foreground">{unit}</span>
                                  )}
                                </div>
                                {ref && !failed && (
                                  <p className="mt-1 text-xs text-muted-foreground">Reference: {ref}</p>
                                )}
                              </div>
                              <div className="shrink-0">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>
                            {showBar && (
                              <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-border/40">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="tabular-nums">{min}</span>
                                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        status === 'critical' ? 'bg-destructive' :
                                        status === 'high' ? 'bg-orange-500' :
                                        status === 'low' ? 'bg-blue-500' : 'bg-green-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(100, Math.max(0, ((numVal - min) / (max - min)) * 100))}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="tabular-nums">{max}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                  )
                ) : (
                  <div className="p-2 border border-green-500/30 bg-green-500/5 rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Results Available</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={handleViewPdf}>
                        <FileText className="h-4 w-4 me-2" />
                        View PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                        <Download className="h-4 w-4 me-2" />
                        Download PDF
                      </Button>
                    </div>
                    {labRequest.result_notes && (
                      <p className="text-sm text-muted-foreground mt-2">{labRequest.result_notes}</p>
                    )}
                  </div>
                )}

                {labRequest.result_notes && hasResults && (
                  <p className="text-sm text-muted-foreground">{labRequest.result_notes}</p>
                )}
              </div>
            )
          })(          )}

          {/* QR — when not fulfilled, no PDF; show button here */}
          {labRequest.status !== LAB_TEST_STATUS.FULFILLED && (
            <div className="border-t pt-2 sm:pt-3">
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
              Results ready — download PDF above.
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

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pill, Send, Building2, MapPin, Star, Clock, CheckCircle, CreditCard, Banknote, QrCode, Download, FileDown, Printer, XCircle, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react'
import { QRCodeDisplay } from './qr-code-display'

// Status constants
const PRESCRIPTION_STATUS = {
  CREATED: 'created',
  SENT_TO_PHARMACY: 'sent_to_pharmacy',
  PROCESSING: 'processing',
  READY: 'ready',
  COLLECTED: 'collected',
}

/** Per-medication fulfillment from pharmacy */
interface PharmacyFulfillmentItem {
  medication_index: number
  status: 'available' | 'partial' | 'out_of_stock' | 'substituted' | 'pending_approval'
  dispensed_quantity?: number
  unit_price?: number
  substitute_name?: string
  substitute_dosage?: string
  pharmacy_notes?: string
  requires_doctor_approval?: boolean
  doctor_approved?: boolean
  back_order_date?: string
}

interface Prescription {
  id: string
  status: string
  payment_status: string
  diagnosis?: string
  medications: any[]
  notes?: string
  pharmacy_id?: string
  pharmacy?: any
  doctor_id?: string
  doctor_name?: string
  pharmacy_name?: string
  patient?: any
  created_at: string
  sent_to_pharmacy_at?: string
  collected_at?: string
  total_amount?: number
  pharmacy_fulfillment?: PharmacyFulfillmentItem[]
  estimated_ready_at?: string
  total_price?: number
}

interface PrescriptionWorkflowProps {
  prescription: Prescription
  userRole: 'patient' | 'doctor' | 'pharmacy'
  patientId?: string
  onUpdate?: () => void
  open?: boolean
  onClose?: () => void
}

export function PrescriptionWorkflow({ prescription, userRole, patientId, onUpdate, open, onClose }: PrescriptionWorkflowProps) {
  const { toast } = useToast()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [loadingPharmacies, setLoadingPharmacies] = useState(false)
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patientFavoritePharmacy, setPatientFavoritePharmacy] = useState<any>(null)
  const [showQrDialog, setShowQrDialog] = useState(false)

  const isDialogMode = open !== undefined
  const canSendToPharmacy = (prescription.status === PRESCRIPTION_STATUS.CREATED || prescription.status === 'active') && 
    (userRole === 'patient' || userRole === 'doctor')
  const isDeclined = prescription.status === 'declined'
  const canResend = isDeclined && userRole === 'doctor'

  // Auto-open send dialog in dialog mode
  useEffect(() => {
    if (isDialogMode && open && canSendToPharmacy) {
      loadPharmacies()
      setShowSendDialog(true)
    }
  }, [open, isDialogMode, canSendToPharmacy])

  const loadPharmacies = async () => {
    setLoadingPharmacies(true)
    const supabase = createBrowserClient()

    // Load patient's preferred pharmacy if we have patientId
    if (patientId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_pharmacy_id')
        .eq('id', patientId)
        .single()

      if (profile?.preferred_pharmacy_id) {
        const { data: favPharmacy } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', profile.preferred_pharmacy_id)
          .single()
        
        if (favPharmacy) {
          setPatientFavoritePharmacy(favPharmacy)
        }
      }
    }

    // Load nearby pharmacies (for now, just load all active pharmacies)
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('professional_type', 'pharmacy')
      .eq('verification_status', 'verified')
      .limit(20)

    setPharmacies(data || [])
    setLoadingPharmacies(false)
  }

  const handleSendToPharmacy = async () => {
    if (!selectedPharmacy) {
      toast({ title: 'Please select a pharmacy', variant: 'destructive' })
      return
    }
    setShowSendDialog(false)
    setShowPaymentDialog(true)
  }

  const handleConfirmPayment = async () => {
    setIsSubmitting(true)
    try {
      // Use the new send API endpoint
      const response = await fetch(`/api/prescriptions/${prescription.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: selectedPharmacy.id,
          ticketId: (prescription as any).ticket_id, // If available
          threadId: (prescription as any).thread_id, // If available
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send prescription')
      }

      toast({ title: 'Prescription sent successfully!' })
      setShowPaymentDialog(false)
      setShowSendDialog(false)
      onUpdate?.()
      onClose?.()
    } catch (error: any) {
      toast({ title: 'Error sending prescription', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle resending a declined prescription
  const handleResend = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/prescriptions/${prescription.id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to prepare resend')
      }
      
      toast({ title: 'Ready to resend', description: 'Select a different pharmacy to send this prescription.' })
      onUpdate?.()
      // Open pharmacy selector
      loadPharmacies()
      setShowSendDialog(true)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      created: { label: 'Not Fulfilled', className: 'bg-gray-500' },
      active: { label: 'Active', className: 'bg-blue-500' },
      sent: { label: 'Sent to Pharmacy', className: 'bg-purple-500' },
      sent_to_pharmacy: { label: 'Sent to Pharmacy', className: 'bg-purple-500' },
      received: { label: 'Received', className: 'bg-indigo-500' },
      processing: { label: 'Processing', className: 'bg-yellow-500' },
      ready: { label: 'Ready for Pickup', className: 'bg-green-500' },
      picked_up: { label: 'Picked Up', className: 'bg-emerald-500' },
      collected: { label: 'Collected', className: 'bg-green-700' },
      dispensed: { label: 'Dispensed', className: 'bg-green-700' },
      declined: { label: 'Declined by Pharmacy', className: 'bg-red-500' },
    }
    const config = statusConfig[prescription.status] || statusConfig.created
    return <Badge className={`${config.className} whitespace-nowrap shrink-0`}>{config.label}</Badge>
  }

  const handleDownloadPDF = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      
      const element = document.getElementById(`prescription-card-${prescription.id}`)
      if (!element) return
      
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`prescription-${prescription.id}.pdf`)
      
      toast({ title: 'PDF downloaded successfully!' })
    } catch (error) {
      console.error('[v0] Error generating PDF:', error)
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    }
  }

  const handlePrint = async () => {
    try {
      let branding = null
      if (prescription.doctor_id) {
        const res = await fetch(`/api/professionals/${prescription.doctor_id}/branding`, { credentials: 'include' })
        const json = await res.json()
        if (res.ok) branding = json.branding
      }
      const { openPdfPrescription, getPrescriptionPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const ok = await openPdfPrescription(prescription, branding)
      if (!ok) openPrintWindow(getPrescriptionPrintHtml(prescription, branding), 'Prescription')
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to open PDF', variant: 'destructive' })
    }
  }

  const getPaymentBadge = () => {
    if (prescription.payment_status === 'paid_online') {
      return <Badge className="bg-green-100 text-green-700 whitespace-nowrap shrink-0">Paid Online</Badge>
    }
    if (prescription.payment_status === 'paid_cash') {
      return <Badge className="bg-green-100 text-green-700 whitespace-nowrap shrink-0">Paid Cash</Badge>
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-300 whitespace-nowrap shrink-0">Unpaid</Badge>
  }

  // Main content render
  const renderPrescriptionCard = () => (
    <Card className="overflow-hidden gap-3 py-3 w-full min-w-0">
      <CardHeader className="p-4 pt-3 pb-3 border-b space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Pill className="h-5 w-5 shrink-0 text-primary" />
            <CardTitle className="text-lg">Prescription</CardTitle>
            {prescription.diagnosis && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-xs" title={prescription.diagnosis}>— {prescription.diagnosis}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  <Download className="h-4 w-4 mr-1.5" />
                  PDF
                  <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Open / Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setShowQrDialog(true)} className="h-8 px-3">
              <QrCode className="h-4 w-4 mr-1.5" />
              QR
            </Button>
            {getStatusBadge()}
            {prescription.status !== 'created' && getPaymentBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-4" id={`prescription-card-${prescription.id}`}>
        <div className="flex flex-col gap-5 min-w-0">
        {/* Note from doctor (visible only to patient) */}
        {userRole === 'patient' && prescription.notes && (
          <div className="text-sm p-3 rounded-lg bg-muted/30 dark:bg-muted/10 break-words">
            <span className="font-medium text-muted-foreground">Note from doctor:</span> {prescription.notes}
          </div>
        )}
        {/* Estimated Ready Time and Total Price */}
        {prescription.pharmacy_id && (prescription.estimated_ready_at || prescription.total_price) && (
          <div className="flex flex-wrap gap-6 text-sm">
            {prescription.estimated_ready_at && (
              <span className="text-green-700 dark:text-green-400">
                <strong>Ready:</strong> {new Date(prescription.estimated_ready_at).toLocaleString()}
              </span>
            )}
            {prescription.total_price && (
              <span className="text-green-700 dark:text-green-400">
                <strong>Total:</strong> {prescription.total_price.toLocaleString()} DZD
              </span>
            )}
          </div>
        )}

        {/* Medications List */}
        <div className="space-y-3 min-w-0">
          <Label className="text-sm font-medium">Medications</Label>
          <div className="flex flex-col gap-3">
            {prescription.medications?.map((med: any, idx: number) => {
              const fulfillment = prescription.pharmacy_fulfillment?.find(f => f.medication_index === idx)
              const isOutOfStock = fulfillment?.status === 'out_of_stock'
              const isSubstituted = fulfillment?.status === 'substituted'
              const isPartial = fulfillment?.status === 'partial'
              const isPending = fulfillment?.status === 'pending_approval'
              const needsApproval = fulfillment?.requires_doctor_approval && fulfillment?.doctor_approved === undefined
              const medName = med.medication_name || med.name || 'Medication'
              const details = [med.dosage, med.frequency, med.duration].filter(Boolean).join(' • ') || '—'
              
              return (
                <div key={idx} className={`py-3 px-4 rounded-lg border border-border/60 min-w-0 ${
                  isOutOfStock ? 'bg-red-50/50 dark:bg-red-950/10' :
                  isPending || needsApproval ? 'bg-amber-50/50 dark:bg-amber-950/10' :
                  isSubstituted ? 'bg-purple-50/50 dark:bg-purple-950/10' :
                  isPartial ? 'bg-yellow-50/50 dark:bg-yellow-950/10' :
                  'bg-muted/30 dark:bg-muted/10'
                }`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{medName}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{details}</p>
                      {med.instructions && (
                        <p className="text-sm text-muted-foreground mt-1 break-words">{med.instructions}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {fulfillment ? (
                        <>
                          <Badge variant={
                            fulfillment.status === 'available' ? 'default' :
                            fulfillment.status === 'out_of_stock' ? 'destructive' : 
                            fulfillment.status === 'pending_approval' ? 'outline' : 'secondary'
                          } className="text-xs whitespace-nowrap">
                            {fulfillment.status === 'available' ? '✓ Available' :
                             fulfillment.status === 'partial' ? '⚠ Partial' :
                             fulfillment.status === 'out_of_stock' ? '✗ Unavailable' : 
                             fulfillment.status === 'pending_approval' ? '⏳ Pending' : '↔ Substitute'}
                          </Badge>
                          {fulfillment.doctor_approved !== undefined && (
                            <Badge variant={fulfillment.doctor_approved ? 'default' : 'destructive'} className="text-xs whitespace-nowrap">
                              {fulfillment.doctor_approved ? '✓ Dr. OK' : '✗ Dr. Rejected'}
                            </Badge>
                          )}
                          {fulfillment.dispensed_quantity != null && (
                            <span className="text-sm text-muted-foreground">Qty: {fulfillment.dispensed_quantity}</span>
                          )}
                          {fulfillment.unit_price != null && (
                            <span className="text-sm font-medium">{fulfillment.unit_price.toLocaleString()} DZD</span>
                          )}
                        </>
                      ) : prescription.pharmacy_id && (
                        <span className="text-sm text-muted-foreground">Processing...</span>
                      )}
                    </div>
                  </div>
                  {/* Substitute, Back Order, and Notes from Pharmacy */}
                  {fulfillment && (fulfillment.substitute_name || fulfillment.pharmacy_notes || fulfillment.back_order_date) && (
                    <div className="mt-2 pt-2 border-t border-border/40 text-sm space-y-1">
                      {fulfillment.substitute_name && (
                        <p className="text-purple-700 dark:text-purple-400">
                          <span className="font-medium">↔ Substitute:</span> {fulfillment.substitute_name}
                          {fulfillment.substitute_dosage && ` (${fulfillment.substitute_dosage})`}
                        </p>
                      )}
                      {fulfillment.back_order_date && (
                        <p className="text-amber-600 dark:text-amber-400">
                          <span className="font-medium">📅 Expected:</span> {new Date(fulfillment.back_order_date).toLocaleDateString()}
                        </p>
                      )}
                      {fulfillment.pharmacy_notes && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">💬 Note:</span> {fulfillment.pharmacy_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Timeline — below medications */}
        <div className="space-y-2 min-w-0">
          <Label className="text-sm font-medium">Timeline</Label>
          <div className="space-y-1.5 text-sm p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Created: {new Date(prescription.created_at).toLocaleString()}</span>
            </div>
            {prescription.sent_to_pharmacy_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Send className="h-3 w-3 shrink-0" />
                <span>Sent: {new Date(prescription.sent_to_pharmacy_at).toLocaleString()}</span>
              </div>
            )}
            {prescription.collected_at && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-3 w-3 shrink-0" />
                <span>Collected: {new Date(prescription.collected_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pharmacy Info */}
        {prescription.pharmacy && (
          <div className="flex items-start gap-3 text-sm min-w-0 p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
            <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="break-words">
              <span className="font-medium">{prescription.pharmacy.business_name}</span>
              {(prescription.pharmacy.commune || prescription.pharmacy.wilaya) && (
                <span className="text-muted-foreground">
                  {' — '}
                  {[prescription.pharmacy.commune, prescription.pharmacy.wilaya].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {canSendToPharmacy && (
          <Button 
            className="w-full h-9" 
            onClick={() => {
              loadPharmacies()
              setShowSendDialog(true)
            }}
          >
            <Send className="h-4 w-4 me-2" />
            Send to Pharmacy
          </Button>
        )}

        {prescription.status === PRESCRIPTION_STATUS.READY && userRole === 'patient' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your prescription is ready for pickup at the pharmacy!
            </AlertDescription>
          </Alert>
        )}

        {/* Declined Alert */}
        {isDeclined && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {userRole === 'patient' 
                  ? 'This prescription was declined by the pharmacy. Your doctor can send it to a different pharmacy.'
                  : 'This prescription was declined by the pharmacy. You can send it to a different pharmacy.'}
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
        </div>
      </CardContent>
    </Card>
  )

  // Dialogs
  const renderDialogs = () => (
    <>
      {/* Select Pharmacy Dialog */}
      <Dialog open={showSendDialog} onOpenChange={(isOpen) => {
        setShowSendDialog(isOpen)
        if (!isOpen && isDialogMode) onClose?.()
      }}>
        <DialogContent size="md" style={{width: '480px'}}>
          <DialogHeader>
            <DialogTitle>Select Pharmacy</DialogTitle>
            <DialogDescription>
              Choose a pharmacy to send your prescription to
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 p-1">
              {patientFavoritePharmacy && (
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPharmacy?.id === patientFavoritePharmacy.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedPharmacy(patientFavoritePharmacy)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{patientFavoritePharmacy.business_name}</span>
                    </div>
                    <Badge variant="secondary">Preferred</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {patientFavoritePharmacy.commune}, {patientFavoritePharmacy.wilaya}
                  </p>
                </div>
              )}

              {loadingPharmacies ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                pharmacies
                  .filter(p => p.id !== patientFavoritePharmacy?.id)
                  .map((pharmacy) => (
                    <div 
                      key={pharmacy.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPharmacy?.id === pharmacy.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPharmacy(pharmacy)}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{pharmacy.business_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{pharmacy.commune}, {pharmacy.wilaya}</span>
                      </div>
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
            <Button onClick={handleSendToPharmacy} disabled={!selectedPharmacy}>
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
        <DialogContent size="md" style={{width: '480px'}}>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              How would you like to pay for your prescription?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPharmacy && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Sending to:</p>
                <p className="text-sm">{selectedPharmacy.business_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedPharmacy.commune}, {selectedPharmacy.wilaya}
                </p>
              </div>
            )}

            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'online')}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setPaymentMethod('cash')}>
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Pay Cash at Pharmacy</p>
                    <p className="text-sm text-muted-foreground">Pay when you pick up your medication</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setPaymentMethod('online')}>
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Pay Online</p>
                    <p className="text-sm text-muted-foreground">Pay now with card or mobile payment</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

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
            <DialogTitle>Prescription QR Code</DialogTitle>
            <DialogDescription>Scan to view prescription details</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <QRCodeDisplay
              value={JSON.stringify({
                type: 'prescription',
                id: prescription.id,
                doctor_name: prescription.doctor_name,
                pharmacy_name: prescription.pharmacy_name,
                medications: prescription.medications?.length || 0,
                status: prescription.status
              })}
              size={160}
              downloadFileName={`prescription-${prescription.id}`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

  // If in dialog mode (from doctor dashboard), don't render the card - just the dialogs
  if (isDialogMode) {
    return renderDialogs()
  }

  // Normal mode - render card and dialogs
  return (
    <>
      {renderPrescriptionCard()}
      {renderDialogs()}
    </>
  )
}

export default PrescriptionWorkflow

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getStatusBadgeClassName } from '@/lib/status-colors'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pill, Send, Building2, MapPin, Star, Clock, CheckCircle, CreditCard, Banknote, QrCode, Download, Printer, FileDown, ChevronDown } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { QRCodeDisplay } from './qr-code-display'

// Status constants
const PRESCRIPTION_STATUS = {
  CREATED: 'created',
  SENT_TO_PHARMACY: 'sent_to_pharmacy',
  PROCESSING: 'processing',
  READY: 'ready',
  COLLECTED: 'collected',
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

  const isDialogMode = open !== undefined
  const canSendToPharmacy = prescription.status === PRESCRIPTION_STATUS.CREATED && 
    (userRole === 'patient' || userRole === 'doctor')

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
    const supabase = createBrowserClient()

    try {
      const updateData: any = {
        pharmacy_id: selectedPharmacy.id,
        status: PRESCRIPTION_STATUS.SENT_TO_PHARMACY,
        sent_to_pharmacy_at: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'online' ? 'paid_online' : 'unpaid',
      }

      const { error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', prescription.id)

      if (error) throw error

      // Notify pharmacy
      const { data: pharmacyProf } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', selectedPharmacy.id)
        .single()

      if (pharmacyProf?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: pharmacyProf.auth_user_id,
          type: 'new_prescription',
          title: 'New Prescription Received',
          message: `A new prescription has been sent to your pharmacy`,
          data: { prescription_id: prescription.id },
        })
      }

      toast({ title: 'Prescription sent successfully!' })
      setShowPaymentDialog(false)
      onUpdate?.()
      onClose?.()
    } catch (error: any) {
      toast({ title: 'Error sending prescription', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = () => {
    const statusLabels: Record<string, string> = {
      created: 'Created',
      active: 'Created',
      sent_to_pharmacy: 'Sent to Pharmacy',
      processing: 'Processing',
      ready: 'Ready for Pickup',
      collected: 'Collected',
    }
    const label = statusLabels[prescription.status] || prescription.status
    const className = getStatusBadgeClassName(prescription.status, 'solid')
    return <Badge className={className}>{label}</Badge>
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

  const handlePrint = () => {
    const printContent = document.getElementById(`prescription-card-${prescription.id}`)
    if (!printContent) return
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription ${prescription.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const getPaymentBadge = () => {
    if (prescription.payment_status === 'paid_online') {
      return <Badge className="bg-green-100 text-green-700">Paid Online</Badge>
    }
    if (prescription.payment_status === 'paid_cash') {
      return <Badge className="bg-green-100 text-green-700">Paid Cash</Badge>
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-300">Unpaid</Badge>
  }

  // Main content render
  const renderPrescriptionCard = () => (
    <Card>
      <CardHeader className="p-3 pt-2.5 pb-2.5 border-b space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Pill className="h-6 w-6 shrink-0 text-primary" />
            <CardTitle className="text-xl">Prescription</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {prescription.status !== 'created' && getPaymentBadge()}
          </div>
        </div>
        {prescription.diagnosis && (
          <p className="text-base text-muted-foreground">
            <span className="font-medium text-foreground">Diagnosis:</span> {prescription.diagnosis}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="h-9 px-4">
                <Download className="h-4 w-4 mr-2" />
                PDF
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
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
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-2" id={`prescription-card-${prescription.id}`}>
        {/* Medications List */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Medications</Label>
          <div className="space-y-2">
            {prescription.medications?.map((med: any, idx: number) => (
              <div key={idx} className="p-5 bg-muted/50 rounded-xl">
                <p className="font-medium">{med.name}</p>
                <p className="text-sm text-muted-foreground">
                  {med.dosage} - {med.frequency} - {med.duration}
                </p>
                {med.instructions && (
                  <p className="text-xs text-muted-foreground mt-1">{med.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pharmacy Info */}
        {prescription.pharmacy && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Pharmacy</span>
            </div>
            <p className="text-sm">{prescription.pharmacy.business_name}</p>
            <p className="text-xs text-muted-foreground">
              {prescription.pharmacy.commune}, {prescription.pharmacy.wilaya}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timeline</Label>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Created: {new Date(prescription.created_at).toLocaleString()}</span>
            </div>
            {prescription.sent_to_pharmacy_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Send className="h-3 w-3" />
                <span>Sent: {new Date(prescription.sent_to_pharmacy_at).toLocaleString()}</span>
              </div>
            )}
            {prescription.collected_at && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Collected: {new Date(prescription.collected_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* QR Code */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-4 w-4" />
            <Label className="text-sm font-medium">Prescription QR Code</Label>
          </div>
          <QRCodeDisplay
            value={JSON.stringify({
              type: 'prescription',
              id: prescription.id,
              doctor_name: prescription.doctor_name,
              pharmacy_name: prescription.pharmacy_name,
              medications: prescription.medications?.length || 0,
              status: prescription.status
            })}
            size={150}
            downloadFileName={`prescription-${prescription.id}`}
          />
        </div>

        {/* Action Button */}
        {canSendToPharmacy && (
          <Button 
            className="w-full" 
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
        <DialogContent className="max-w-md">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              How would you like to pay for your prescription?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
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

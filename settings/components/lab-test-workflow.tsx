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
  AlertCircle, Building2, Phone, Star, Navigation, FileText, Download, QrCode
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { QRCodeDisplay } from './qr-code-display'
import { getStatusBadgeClassName } from '@/lib/status-colors'

// Lab test status flow
export const LAB_TEST_STATUS = {
  CREATED: 'created',
  SENT_TO_LAB: 'sent_to_lab',
  PAID: 'paid',
  SAMPLE_COLLECTED: 'sample_collected',
  PROCESSING: 'processing',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled'
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
  test_types: string[]
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

  const getStatusBadge = () => {
    const status = labRequest.status
    const paymentStatus = labRequest.payment_status

    const labels: Record<string, string> = {
      [LAB_TEST_STATUS.CREATED]: 'Pending',
      [LAB_TEST_STATUS.SENT_TO_LAB]: paymentStatus === PAYMENT_STATUS.PAID_ONLINE ? 'Sent to Lab (Paid)' : 'Sent to Lab (Unpaid)',
      [LAB_TEST_STATUS.SAMPLE_COLLECTED]: 'Sample Collected',
      [LAB_TEST_STATUS.PROCESSING]: 'Processing',
      [LAB_TEST_STATUS.FULFILLED]: 'Results Ready',
      [LAB_TEST_STATUS.CANCELLED]: 'Cancelled',
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

  const canSendToLab = labRequest.status === LAB_TEST_STATUS.CREATED && 
    (userRole === 'patient' || userRole === 'doctor')

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
                  <LoadingSpinner size="md" />
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
    </>
  )

  // If in dialog mode, only render dialogs
  if (isDialogMode) {
    return renderDialogs()
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Lab Test Request</CardTitle>
              {getPriorityBadge()}
            </div>
            {getStatusBadge()}
          </div>
          {labRequest.diagnosis && (
            <CardDescription>Diagnosis: {labRequest.diagnosis}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Types List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Requested Tests</Label>
            <div className="flex flex-wrap gap-2">
              {labRequest.test_types?.map((test: string, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {test}
                </Badge>
              ))}
            </div>
          </div>

          {/* Clinical Notes */}
          {labRequest.clinical_notes && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Clinical Notes</Label>
              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                {labRequest.clinical_notes}
              </p>
            </div>
          )}

          {/* Laboratory Info (if assigned) */}
          {labRequest.laboratory && (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Laboratory</span>
              </div>
              <p className="text-sm">{labRequest.laboratory.business_name}</p>
              <p className="text-xs text-muted-foreground">{labRequest.laboratory.address}</p>
            </div>
          )}

          {/* Results Section */}
          {labRequest.status === LAB_TEST_STATUS.FULFILLED && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Test Results</Label>
              <div className="p-4 border border-green-500/30 bg-green-500/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Results Available</span>
                  </div>
                  {labRequest.result_pdf_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={labRequest.result_pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 me-2" />
                        Download PDF
                      </a>
                    </Button>
                  )}
                </div>
                {labRequest.result_notes && (
                  <p className="text-sm text-muted-foreground mt-2">{labRequest.result_notes}</p>
                )}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="h-4 w-4" />
              <Label className="text-sm font-medium">Lab Test QR Code</Label>
            </div>
            <QRCodeDisplay
              value={JSON.stringify({
                type: 'lab_test',
                id: labRequest.id,
                doctor_name: labRequest.doctor_name,
                laboratory_name: labRequest.laboratory_name,
                tests: labRequest.test_types?.length || 0,
                status: labRequest.status
              })}
              size={150}
              downloadFileName={`lab-test-${labRequest.id}`}
            />
          </div>

          {/* Timeline */}
          <div className="space-y-2">
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
              className="w-full" 
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
        </CardContent>
      </Card>

      {renderDialogs()}
    </>
  )
}

export default LabTestWorkflow

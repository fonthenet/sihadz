'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { 
  FileText, Package, AlertTriangle, CheckCircle, Clock, Send,
  DollarSign, Plus, RefreshCw, XCircle, Eye, Filter
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import type { 
  ChifaInvoice, ChifaBordereau, ChifaRejection, 
  InsuranceType, BordereauStatus, RejectionStatus 
} from '@/lib/pharmacy/chifa-types'

interface ChifaDashboardStats {
  pending_invoices: number
  pending_amount: number
  in_bordereau_invoices: number
  in_bordereau_amount: number
  submitted_amount: number
  pending_bordereaux: number
  pending_rejections: number
  this_month_claims: number
  this_month_amount: number
  paid_this_month: number
  by_insurance: { CNAS: number; CASNOS: number; CVM: number }
}

export default function ChifaManagement() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  
  // Data
  const [stats, setStats] = useState<ChifaDashboardStats | null>(null)
  const [invoices, setInvoices] = useState<ChifaInvoice[]>([])
  const [bordereaux, setBordereaux] = useState<ChifaBordereau[]>([])
  const [rejections, setRejections] = useState<ChifaRejection[]>([])
  
  // Filters
  const [invoiceStatus, setInvoiceStatus] = useState<string>('pending')
  const [insuranceFilter, setInsuranceFilter] = useState<string>('_all')
  
  // Dialogs
  const [showCreateBordereau, setShowCreateBordereau] = useState(false)
  const [showBordereauPayment, setShowBordereauPayment] = useState(false)
  const [showResolveRejection, setShowResolveRejection] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [selectedBordereau, setSelectedBordereau] = useState<ChifaBordereau | null>(null)
  const [selectedRejection, setSelectedRejection] = useState<ChifaRejection | null>(null)
  
  // Form data
  const [bordereauForm, setBordereauForm] = useState({
    insurance_type: 'CNAS' as InsuranceType,
    period_start: '',
    period_end: '',
    notes: ''
  })
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_reference: ''
  })
  const [resolutionForm, setResolutionForm] = useState({
    status: 'corrected' as RejectionStatus,
    resolution_notes: ''
  })

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/chifa/dashboard', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (error: any) {
      console.error('Error fetching Chifa stats:', error)
    }
  }, [])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      let url = `/api/pharmacy/chifa/invoices?status=${invoiceStatus}`
      if (insuranceFilter && insuranceFilter !== '_all') {
        url += `&insurance_type=${insuranceFilter}`
      }
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch invoices')
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (error: any) {
      console.error('Error fetching invoices:', error)
    }
  }, [invoiceStatus, insuranceFilter])

  // Fetch bordereaux
  const fetchBordereaux = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/chifa/bordereaux', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch bordereaux')
      const data = await res.json()
      setBordereaux(data.bordereaux || [])
    } catch (error: any) {
      console.error('Error fetching bordereaux:', error)
    }
  }, [])

  // Fetch rejections
  const fetchRejections = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/chifa/rejections', { credentials: 'include' })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Failed to fetch rejections (${res.status})`)
      }
      const data = await res.json()
      setRejections(data.rejections || [])
    } catch (error: any) {
      console.error('Error fetching rejections:', error)
      setRejections([]) // Show empty state on error
    }
  }, [])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchInvoices(), fetchBordereaux(), fetchRejections()])
      setLoading(false)
    }
    loadData()
  }, [fetchStats, fetchInvoices, fetchBordereaux, fetchRejections])

  // Reload invoices when filters change
  useEffect(() => {
    fetchInvoices()
  }, [invoiceStatus, insuranceFilter, fetchInvoices])

  // Toggle invoice selection
  const toggleInvoiceSelection = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Create bordereau
  const handleCreateBordereau = async () => {
    if (selectedInvoices.length === 0) {
      toast({ title: 'Error', description: 'Select at least one invoice', variant: 'destructive' })
      return
    }
    if (selectedInvoices.length > 20) {
      toast({ title: 'Error', description: 'Maximum 20 invoices per bordereau', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/pharmacy/chifa/bordereaux', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bordereauForm,
          invoice_ids: selectedInvoices
        })
      })

      if (!res.ok) throw new Error('Failed to create bordereau')
      
      toast({ title: 'Success', description: 'Bordereau created successfully' })
      setShowCreateBordereau(false)
      setSelectedInvoices([])
      setBordereauForm({ insurance_type: 'CNAS', period_start: '', period_end: '', notes: '' })
      await Promise.all([fetchStats(), fetchInvoices(), fetchBordereaux()])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Finalize bordereau
  const handleFinalizeBordereau = async (id: string) => {
    try {
      const res = await fetch('/api/pharmacy/chifa/bordereaux', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'finalize' })
      })
      if (!res.ok) throw new Error('Failed to finalize')
      toast({ title: 'Success', description: 'Bordereau finalized' })
      await fetchBordereaux()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Submit bordereau
  const handleSubmitBordereau = async (id: string) => {
    try {
      const res = await fetch('/api/pharmacy/chifa/bordereaux', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'submit' })
      })
      if (!res.ok) throw new Error('Failed to submit')
      toast({ title: 'Success', description: 'Bordereau submitted' })
      await Promise.all([fetchStats(), fetchBordereaux()])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedBordereau) return

    try {
      const res = await fetch('/api/pharmacy/chifa/bordereaux', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBordereau.id,
          action: 'record_payment',
          amount_paid: parseFloat(paymentForm.amount_paid),
          payment_date: paymentForm.payment_date,
          payment_reference: paymentForm.payment_reference
        })
      })
      if (!res.ok) throw new Error('Failed to record payment')
      
      toast({ title: 'Success', description: 'Payment recorded' })
      setShowBordereauPayment(false)
      setSelectedBordereau(null)
      setPaymentForm({ amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_reference: '' })
      await Promise.all([fetchStats(), fetchBordereaux()])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Resolve rejection
  const handleResolveRejection = async () => {
    if (!selectedRejection) return

    try {
      const res = await fetch('/api/pharmacy/chifa/rejections', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRejection.id,
          ...resolutionForm
        })
      })
      if (!res.ok) throw new Error('Failed to resolve rejection')
      
      toast({ title: 'Success', description: 'Rejection resolved' })
      setShowResolveRejection(false)
      setSelectedRejection(null)
      await Promise.all([fetchStats(), fetchRejections()])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_bordereau: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      finalized: 'bg-indigo-100 text-indigo-800',
      submitted: 'bg-purple-100 text-purple-800',
      processing: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-amber-100 text-amber-800',
      rejected: 'bg-red-100 text-red-800',
      corrected: 'bg-teal-100 text-teal-800',
      resubmitted: 'bg-cyan-100 text-cyan-800',
      written_off: 'bg-slate-100 text-slate-800'
    }
    return <Badge className={styles[status] || 'bg-gray-100'}>{status.replace('_', ' ')}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading Chifa data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chifa / CNAS Management</h2>
          <p className="text-muted-foreground">Manage insurance claims and bordereaux</p>
        </div>
        <Button onClick={() => Promise.all([fetchStats(), fetchInvoices(), fetchBordereaux(), fetchRejections()])}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            {stats?.pending_invoices ? <Badge className="ml-2" variant="secondary">{stats.pending_invoices}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="bordereaux">Bordereaux</TabsTrigger>
          <TabsTrigger value="rejections">
            Rejections
            {stats?.pending_rejections ? <Badge className="ml-2" variant="destructive">{stats.pending_rejections}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pending_invoices || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(stats?.pending_amount || 0)} to claim
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Bordereaux</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.in_bordereau_invoices || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(stats?.in_bordereau_amount || 0)} ready
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats?.submitted_amount || 0)}</div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats?.paid_this_month || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  From {stats?.this_month_claims || 0} claims
                </p>
              </CardContent>
            </Card>
          </div>

          {/* By Insurance Type */}
          <Card>
            <CardHeader>
              <CardTitle>This Month by Insurance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {formatPrice(stats?.by_insurance?.CNAS || 0)}
                  </div>
                  <div className="text-sm text-blue-600">CNAS</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {formatPrice(stats?.by_insurance?.CASNOS || 0)}
                  </div>
                  <div className="text-sm text-green-600">CASNOS</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {formatPrice(stats?.by_insurance?.CVM || 0)}
                  </div>
                  <div className="text-sm text-purple-600">CVM</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                  Pending Bordereaux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.pending_bordereaux || 0}</p>
                <p className="text-sm text-muted-foreground">Draft or finalized, ready to submit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  Pending Rejections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.pending_rejections || 0}</p>
                <p className="text-sm text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_bordereau">In Bordereau</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Insurance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Types</SelectItem>
                  <SelectItem value="CNAS">CNAS</SelectItem>
                  <SelectItem value="CASNOS">CASNOS</SelectItem>
                  <SelectItem value="CVM">CVM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {invoiceStatus === 'pending' && selectedInvoices.length > 0 && (
              <Button onClick={() => setShowCreateBordereau(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Bordereau ({selectedInvoices.length})
              </Button>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  {invoiceStatus === 'pending' && <TableHead className="w-10"></TableHead>}
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Insured</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead className="text-right">Chifa Amount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      {invoiceStatus === 'pending' && (
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.invoice_date}</TableCell>
                      <TableCell>
                        <div>{invoice.insured_name}</div>
                        <div className="text-xs text-muted-foreground">{invoice.insured_number}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.insurance_type}</Badge>
                        {invoice.is_chronic && <Badge className="ml-1 bg-red-100 text-red-800">ALD</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPrice(invoice.total_chifa)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPrice(invoice.grand_total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Bordereaux Tab */}
        <TabsContent value="bordereaux" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bordereau #</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bordereaux.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No bordereaux found
                    </TableCell>
                  </TableRow>
                ) : (
                  bordereaux.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.bordereau_number}</TableCell>
                      <TableCell><Badge variant="outline">{b.insurance_type}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {b.period_start} - {b.period_end}
                      </TableCell>
                      <TableCell className="text-right">{b.invoice_count}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(b.total_chifa_amount + b.total_majoration)}
                      </TableCell>
                      <TableCell>{getStatusBadge(b.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {b.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handleFinalizeBordereau(b.id)}>
                              Finalize
                            </Button>
                          )}
                          {b.status === 'finalized' && (
                            <Button size="sm" onClick={() => handleSubmitBordereau(b.id)}>
                              <Send className="h-3 w-3 mr-1" />
                              Submit
                            </Button>
                          )}
                          {['submitted', 'processing'].includes(b.status) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedBordereau(b)
                                setPaymentForm({
                                  amount_paid: String(b.total_chifa_amount + b.total_majoration),
                                  payment_date: new Date().toISOString().split('T')[0],
                                  payment_reference: ''
                                })
                                setShowBordereauPayment(true)
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Payment
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Rejections Tab */}
        <TabsContent value="rejections" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No rejections found
                    </TableCell>
                  </TableRow>
                ) : (
                  rejections.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{r.invoice?.invoice_number}</div>
                        <div className="text-xs text-muted-foreground">{r.invoice?.insured_name}</div>
                      </TableCell>
                      <TableCell>{r.rejection_date}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {r.rejection_code && <Badge variant="outline" className="mr-2">{r.rejection_code}</Badge>}
                          <span className="text-sm">{r.rejection_motif}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatPrice(r.rejected_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedRejection(r)
                              setShowResolveRejection(true)
                            }}
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Bordereau Dialog */}
      <Dialog open={showCreateBordereau} onOpenChange={setShowCreateBordereau}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bordereau</DialogTitle>
            <DialogDescription>
              Create a batch submission with {selectedInvoices.length} invoice(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Insurance Type</Label>
              <Select 
                value={bordereauForm.insurance_type} 
                onValueChange={(v: InsuranceType) => setBordereauForm(f => ({ ...f, insurance_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNAS">CNAS</SelectItem>
                  <SelectItem value="CASNOS">CASNOS</SelectItem>
                  <SelectItem value="CVM">CVM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={bordereauForm.period_start}
                  onChange={e => setBordereauForm(f => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={bordereauForm.period_end}
                  onChange={e => setBordereauForm(f => ({ ...f, period_end: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={bordereauForm.notes}
                onChange={e => setBordereauForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes for this submission..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBordereau(false)}>Cancel</Button>
            <Button onClick={handleCreateBordereau}>Create Bordereau</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showBordereauPayment} onOpenChange={setShowBordereauPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedBordereau?.bordereau_number} - Expected: {formatPrice((selectedBordereau?.total_chifa_amount || 0) + (selectedBordereau?.total_majoration || 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount Received</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount_paid}
                onChange={e => setPaymentForm(f => ({ ...f, amount_paid: e.target.value }))}
              />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={paymentForm.payment_reference}
                onChange={e => setPaymentForm(f => ({ ...f, payment_reference: e.target.value }))}
                placeholder="Bank transfer reference..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBordereauPayment(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Rejection Dialog */}
      <Dialog open={showResolveRejection} onOpenChange={setShowResolveRejection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Rejection</DialogTitle>
            <DialogDescription>
              {selectedRejection?.rejection_motif}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution</Label>
              <Select 
                value={resolutionForm.status} 
                onValueChange={(v: RejectionStatus) => setResolutionForm(f => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrected">Corrected - Will resubmit</SelectItem>
                  <SelectItem value="written_off">Write Off - Accept loss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={resolutionForm.resolution_notes}
                onChange={e => setResolutionForm(f => ({ ...f, resolution_notes: e.target.value }))}
                placeholder="Resolution details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveRejection(false)}>Cancel</Button>
            <Button onClick={handleResolveRejection}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

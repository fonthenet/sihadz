'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { 
  Building2, Plus, FileText, CreditCard, Search, RefreshCw,
  Users, Receipt, AlertCircle, CheckCircle, Clock, DollarSign
} from 'lucide-react'
import type { B2BCustomer, B2BInvoice, B2BCustomerInput } from '@/lib/pharmacy/ordonnancier-types'

interface B2BManagementProps {
  professional?: any
}

export function B2BManagement({ professional }: B2BManagementProps) {
  const [activeTab, setActiveTab] = useState('customers')
  const [customers, setCustomers] = useState<B2BCustomer[]>([])
  const [invoices, setInvoices] = useState<B2BInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Customer form
  const [customerForm, setCustomerForm] = useState<Partial<B2BCustomerInput>>({
    payment_terms: 30,
    credit_limit: 0
  })

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash',
    reference: '',
    notes: ''
  })

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/b2b/customers', {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch customers')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error: any) {
      console.error('Error fetching customers:', error)
    }
  }, [])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/b2b/invoices', {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch invoices')
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (error: any) {
      console.error('Error fetching invoices:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchCustomers(), fetchInvoices()])
      setLoading(false)
    }
    loadData()
  }, [fetchCustomers, fetchInvoices])

  // Create customer
  const handleCreateCustomer = async () => {
    if (!customerForm.company_name) {
      toast({ title: 'Error', description: 'Company name required', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/pharmacy/b2b/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(customerForm)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create customer')
      }

      toast({ title: 'Success', description: 'Customer created' })
      setShowCustomerDialog(false)
      setCustomerForm({ payment_terms: 30, credit_limit: 0 })
      fetchCustomers()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentForm.amount) {
      toast({ title: 'Error', description: 'Amount required', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/pharmacy/b2b/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'record_payment',
          invoice_id: selectedInvoice.id,
          ...paymentForm
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to record payment')
      }

      toast({ title: 'Success', description: 'Payment recorded' })
      setShowPaymentDialog(false)
      setSelectedInvoice(null)
      setPaymentForm({ amount: 0, payment_method: 'cash', reference: '', notes: '' })
      fetchInvoices()
      fetchCustomers()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Filter
  const filteredCustomers = customers.filter(c =>
    !searchTerm ||
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nif?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredInvoices = invoices.filter(i =>
    !searchTerm ||
    i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const totalOutstanding = invoices
    .filter(i => ['pending', 'partial', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total_ttc - i.amount_paid), 0)

  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      partial: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500'
    }
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      pending: 'En attente',
      partial: 'Partiel',
      paid: 'Payé',
      overdue: 'En retard',
      cancelled: 'Annulé'
    }
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Facturation B2B
          </h2>
          <p className="text-muted-foreground">
            Gestion des clients professionnels et créances
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchCustomers(); fetchInvoices() }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau Client B2B</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Raison sociale *</Label>
                    <Input 
                      placeholder="Nom de l'entreprise"
                      value={customerForm.company_name || ''}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, company_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Forme juridique</Label>
                    <Select 
                      value={customerForm.legal_form || ''}
                      onValueChange={(v) => setCustomerForm(prev => ({ ...prev, legal_form: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SARL">SARL</SelectItem>
                        <SelectItem value="EURL">EURL</SelectItem>
                        <SelectItem value="SPA">SPA</SelectItem>
                        <SelectItem value="SNC">SNC</SelectItem>
                        <SelectItem value="entreprise_individuelle">Entreprise individuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Identifiants fiscaux</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>NIF</Label>
                      <Input 
                        placeholder="Numéro d'Identification Fiscale"
                        value={customerForm.nif || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, nif: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>NIS</Label>
                      <Input 
                        placeholder="Numéro d'Identification Statistique"
                        value={customerForm.nis || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, nis: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>RC</Label>
                      <Input 
                        placeholder="Registre du Commerce"
                        value={customerForm.rc || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rc: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Article d'imposition</Label>
                      <Input 
                        placeholder="Article"
                        value={customerForm.article_imposition || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, article_imposition: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nom du contact</Label>
                      <Input 
                        placeholder="Nom et prénom"
                        value={customerForm.contact_name || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input 
                        placeholder="Numéro de téléphone"
                        value={customerForm.contact_phone || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        placeholder="email@example.com"
                        value={customerForm.contact_email || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Wilaya</Label>
                      <Input 
                        placeholder="Wilaya"
                        value={customerForm.wilaya || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, wilaya: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Adresse</Label>
                      <Input 
                        placeholder="Adresse complète"
                        value={customerForm.address || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Conditions de paiement</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Délai de paiement (jours)</Label>
                      <Select 
                        value={String(customerForm.payment_terms || 30)}
                        onValueChange={(v) => setCustomerForm(prev => ({ ...prev, payment_terms: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Comptant</SelectItem>
                          <SelectItem value="15">15 jours</SelectItem>
                          <SelectItem value="30">30 jours</SelectItem>
                          <SelectItem value="45">45 jours</SelectItem>
                          <SelectItem value="60">60 jours</SelectItem>
                          <SelectItem value="90">90 jours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Plafond de crédit (DZD)</Label>
                      <Input 
                        type="number"
                        placeholder="0 = illimité"
                        value={customerForm.credit_limit || ''}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateCustomer}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clients B2B</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Factures</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Créances</p>
                <p className="text-2xl font-bold">{totalOutstanding.toLocaleString('fr-DZ')} DA</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers">Clients</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clients B2B</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun client B2B</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>NIF</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.company_name}</p>
                            {customer.legal_form && (
                              <p className="text-xs text-muted-foreground">{customer.legal_form}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {customer.nif || '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{customer.contact_name || '-'}</p>
                            {customer.contact_phone && (
                              <p className="text-xs text-muted-foreground">{customer.contact_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.payment_terms === 0 ? 'Comptant' : `${customer.payment_terms} jours`}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={customer.current_balance > 0 ? 'text-red-600 font-medium' : ''}>
                            {customer.current_balance.toLocaleString('fr-DZ')} DA
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Factures</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune facture</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="text-right">Payé</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {invoice.customer?.company_name || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {invoice.total_ttc.toLocaleString('fr-DZ')} DA
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.amount_paid.toLocaleString('fr-DZ')} DA
                        </TableCell>
                        <TableCell>
                          {statusBadge(invoice.status)}
                        </TableCell>
                        <TableCell>
                          {['pending', 'partial'].includes(invoice.status) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setPaymentForm({
                                  amount: invoice.total_ttc - invoice.amount_paid,
                                  payment_method: 'cash',
                                  reference: '',
                                  notes: ''
                                })
                                setShowPaymentDialog(true)
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Paiement
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Facture</p>
                <p className="font-medium">{selectedInvoice.invoice_number}</p>
                <p className="text-sm">
                  Restant: {(selectedInvoice.total_ttc - selectedInvoice.amount_paid).toLocaleString('fr-DZ')} DA
                </p>
              </div>
              <div>
                <Label>Montant *</Label>
                <Input 
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Mode de paiement</Label>
                <Select 
                  value={paymentForm.payment_method}
                  onValueChange={(v) => setPaymentForm(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="ccp">CCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Référence</Label>
                <Input 
                  placeholder="N° chèque, référence virement..."
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleRecordPayment}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

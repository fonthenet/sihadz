'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import type { PharmacySupplier, SupplierFormData, PaymentTerms } from '@/lib/inventory/types'

const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  cash: 'Cash',
  '15_days': '15 Days',
  '30_days': '30 Days',
  '60_days': '60 Days',
  '90_days': '90 Days'
}

export default function SupplierManagement() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<PharmacySupplier | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>({
    name: ''
  })

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/pharmacy/inventory/suppliers?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      
      const data = await res.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast({ title: 'Error', description: 'Failed to load suppliers', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const openNewSupplierDialog = () => {
    setEditingSupplier(null)
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      phone_secondary: '',
      email: '',
      fax: '',
      address: '',
      wilaya: '',
      commune: '',
      payment_terms: 'cash',
      credit_limit: undefined,
      notes: ''
    })
    setDialogOpen(true)
  }

  const openEditDialog = (supplier: PharmacySupplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      phone_secondary: supplier.phone_secondary || '',
      email: supplier.email || '',
      fax: supplier.fax || '',
      address: supplier.address || '',
      wilaya: supplier.wilaya || '',
      commune: supplier.commune || '',
      payment_terms: supplier.payment_terms as PaymentTerms || 'cash',
      credit_limit: supplier.credit_limit || undefined,
      notes: supplier.notes || ''
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // For now, only support creating new suppliers
      // TODO: Add update endpoint
      const res = await fetch('/api/pharmacy/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save supplier')
      }

      toast({ title: 'Success', description: 'Supplier created' })
      setDialogOpen(false)
      fetchSuppliers()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Suppliers
              <Badge variant="secondary">{suppliers.length}</Badge>
            </CardTitle>
            <Button onClick={openNewSupplierDialog} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Suppliers List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No suppliers found</p>
              <Button variant="link" onClick={openNewSupplierDialog}>
                Add a supplier
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuppliers.map(supplier => (
                <div 
                  key={supplier.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.payment_terms && (
                          <Badge variant="outline" className="text-xs">
                            {PAYMENT_TERMS_LABELS[supplier.payment_terms as PaymentTerms] || supplier.payment_terms}
                          </Badge>
                        )}
                      </div>
                      {supplier.contact_person && (
                        <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        {supplier.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </span>
                        )}
                        {supplier.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </span>
                        )}
                        {(supplier.wilaya || supplier.address) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.wilaya || supplier.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(supplier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Edit supplier information' : 'Add a new supplier'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Name *</Label>
                <Input
                  id="supplier_name"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData(f => ({ ...f, contact_person: e.target.value }))}
                  placeholder="Contact person"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_phone">Phone</Label>
                <Input
                  id="supplier_phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 0555 123 456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_email">Email</Label>
                <Input
                  id="supplier_email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_address">Address</Label>
              <Input
                id="supplier_address"
                value={formData.address || ''}
                onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_wilaya">Wilaya</Label>
                <Input
                  id="supplier_wilaya"
                  value={formData.wilaya || ''}
                  onChange={(e) => setFormData(f => ({ ...f, wilaya: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_commune">Commune</Label>
                <Input
                  id="supplier_commune"
                  value={formData.commune || ''}
                  onChange={(e) => setFormData(f => ({ ...f, commune: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select 
                  value={formData.payment_terms || 'cash'} 
                  onValueChange={(v) => setFormData(f => ({ ...f, payment_terms: v as PaymentTerms }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_TERMS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (DA)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={formData.credit_limit || ''}
                  onChange={(e) => setFormData(f => ({ ...f, credit_limit: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_notes">Notes</Label>
              <Textarea
                id="supplier_notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                editingSupplier ? 'Save' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

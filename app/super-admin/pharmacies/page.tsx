"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Edit, Trash2, Pill, MapPin, Phone, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

// Using the unified professionals table as single source of truth
interface Pharmacy {
  id: string
  business_name: string
  business_name_ar: string | null
  address_line1: string | null
  wilaya: string | null
  commune: string | null
  phone: string | null
  email: string | null
  license_number: string | null
  is_active: boolean
  is_verified: boolean
  is_on_duty: boolean
  is_24h: boolean
  has_delivery: boolean
  rating: number | null
  review_count: number | null
  working_hours: any
  status: string
  created_at: string
}

const Loading = () => null

export default function PharmaciesManagement() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchPharmacies()
  }, [])

  const fetchPharmacies = async () => {
    setLoading(true)
    // Query from the unified professionals table, filtered by type = 'pharmacy'
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('type', 'pharmacy')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPharmacies(data)
    } else {
      console.error('[v0] Error fetching pharmacies:', error)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!editingPharmacy) return
    setSaving(true)

    // Update in the professionals table
    const { error } = await supabase
      .from('professionals')
      .update({
        business_name: editingPharmacy.business_name,
        business_name_ar: editingPharmacy.business_name_ar,
        address_line1: editingPharmacy.address_line1,
        wilaya: editingPharmacy.wilaya,
        commune: editingPharmacy.commune,
        phone: editingPharmacy.phone,
        email: editingPharmacy.email,
        is_active: editingPharmacy.is_active,
        is_on_duty: editingPharmacy.is_on_duty,
        is_24h: editingPharmacy.is_24h,
        has_delivery: editingPharmacy.has_delivery,
      })
      .eq('id', editingPharmacy.id)

    if (!error) {
      fetchPharmacies()
      setIsDialogOpen(false)
      setEditingPharmacy(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pharmacy? This will permanently remove the professional record.')) return
    await supabase.from('professionals').delete().eq('id', id)
    fetchPharmacies()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('professionals').update({ is_active: !currentStatus }).eq('id', id)
    fetchPharmacies()
  }

  const handleToggleOnDuty = async (id: string, currentStatus: boolean) => {
    await supabase.from('professionals').update({ is_on_duty: !currentStatus }).eq('id', id)
    fetchPharmacies()
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/super-admin/approve-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId: id, action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchPharmacies()
    } catch (e) {
      console.error('Approve pharmacy error:', e)
    }
  }

  const handleReject = async (id: string, reason?: string) => {
    try {
      const res = await fetch('/api/super-admin/approve-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId: id, action: 'reject', rejectionReason: reason || 'Rejected by admin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchPharmacies()
    } catch (e) {
      console.error('Reject pharmacy error:', e)
    }
  }

  const filteredPharmacies = pharmacies.filter(p =>
    p.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address_line1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.wilaya?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (pharmacy: Pharmacy) => {
    if (pharmacy.status === 'waiting_approval') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>
    }
    if (pharmacy.status === 'verified' && pharmacy.is_active) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>
    }
    if (pharmacy.status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
    }
    return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Inactive</Badge>
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pharmacies Management</h1>
            <p className="text-muted-foreground">Manage all pharmacies on the platform ({filteredPharmacies.length} total)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPharmacy({
                id: '',
                business_name: '',
                business_name_ar: '',
                address_line1: '',
                wilaya: '16',
                commune: '',
                phone: '',
                email: '',
                license_number: '',
                is_active: false,
                is_verified: false,
                is_on_duty: false,
                is_24h: false,
                has_delivery: false,
                rating: null,
                review_count: 0,
                working_hours: {},
                status: 'waiting_approval',
                created_at: ''
              })}>
                <Plus className="h-4 w-4 mr-2" /> Add Pharmacy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPharmacy?.id ? 'Edit Pharmacy' : 'Add New Pharmacy'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name (English)</Label>
                    <Input value={editingPharmacy?.business_name || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, business_name: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (Arabic)</Label>
                    <Input dir="rtl" value={editingPharmacy?.business_name_ar || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, business_name_ar: e.target.value} : null)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={editingPharmacy?.address_line1 || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, address_line1: e.target.value} : null)} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={editingPharmacy?.phone || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, phone: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Wilaya</Label>
                    <Input value={editingPharmacy?.wilaya || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, wilaya: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Commune</Label>
                    <Input value={editingPharmacy?.commune || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, commune: e.target.value} : null)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={editingPharmacy?.email || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, email: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input value={editingPharmacy?.license_number || ''} onChange={e => setEditingPharmacy(prev => prev ? {...prev, license_number: e.target.value} : null)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={editingPharmacy?.is_active || false} onCheckedChange={checked => setEditingPharmacy(prev => prev ? {...prev, is_active: checked} : null)} />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingPharmacy?.is_on_duty || false} onCheckedChange={checked => setEditingPharmacy(prev => prev ? {...prev, is_on_duty: checked} : null)} />
                    <Label>On Duty</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingPharmacy?.is_24h || false} onCheckedChange={checked => setEditingPharmacy(prev => prev ? {...prev, is_24h: checked} : null)} />
                    <Label>24h</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingPharmacy?.has_delivery || false} onCheckedChange={checked => setEditingPharmacy(prev => prev ? {...prev, has_delivery: checked} : null)} />
                    <Label>Delivery</Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-transparent">Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <LoadingSpinner size="sm" className="me-2" />}
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search pharmacies by name, address, or wilaya..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" className="text-muted-foreground" />
              </div>
            ) : filteredPharmacies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pharmacies found. Pharmacies will appear here after professionals sign up and are verified.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pharmacy</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>On Duty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPharmacies.map(pharmacy => (
                    <TableRow key={pharmacy.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Pill className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <div className="font-medium">{pharmacy.business_name}</div>
                            {pharmacy.business_name_ar && (
                              <div className="text-sm text-muted-foreground" dir="rtl">{pharmacy.business_name_ar}</div>
                            )}
                            <div className="text-xs text-muted-foreground">License: {pharmacy.license_number || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span>{pharmacy.address_line1 || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{pharmacy.wilaya}, {pharmacy.commune}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {pharmacy.phone || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">{pharmacy.email || ''}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pharmacy.is_on_duty ? "default" : "outline"} className={`cursor-pointer ${pharmacy.is_on_duty ? 'bg-amber-500' : ''}`} onClick={() => handleToggleOnDuty(pharmacy.id, pharmacy.is_on_duty)}>
                          {pharmacy.is_on_duty ? <><Clock className="h-3 w-3 mr-1" /> On Duty</> : 'Regular'}
                        </Badge>
                        {pharmacy.is_24h && <Badge variant="outline" className="ml-1">24h</Badge>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(pharmacy)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {pharmacy.status === 'waiting_approval' && (
                            <>
                              <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(pharmacy.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleReject(pharmacy.id)}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setEditingPharmacy(pharmacy); setIsDialogOpen(true) }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(pharmacy.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}

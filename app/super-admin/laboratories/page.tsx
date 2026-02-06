"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Edit, Trash2, FlaskConical, MapPin, Phone, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

// Using the unified professionals table as single source of truth
interface Laboratory {
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
  is_24h: boolean
  rating: number | null
  review_count: number | null
  working_hours: any
  test_types: string[] | null
  status: string
  created_at: string
}

export default function LaboratoriesManagement() {
  const [labs, setLabs] = useState<Laboratory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchLabs()
  }, [])

  const fetchLabs = async () => {
    setLoading(true)
    // Query from the unified professionals table, filtered by type = 'laboratory'
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('type', 'laboratory')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLabs(data)
    } else {
      console.error('[v0] Error fetching laboratories:', error)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!editingLab) return
    setSaving(true)

    // Update in the professionals table
    const { error } = await supabase
      .from('professionals')
      .update({
        business_name: editingLab.business_name,
        business_name_ar: editingLab.business_name_ar,
        address_line1: editingLab.address_line1,
        wilaya: editingLab.wilaya,
        commune: editingLab.commune,
        phone: editingLab.phone,
        email: editingLab.email,
        is_active: editingLab.is_active,
        is_24h: editingLab.is_24h,
        test_types: editingLab.test_types,
      })
      .eq('id', editingLab.id)

    if (!error) {
      fetchLabs()
      setIsDialogOpen(false)
      setEditingLab(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this laboratory? This will permanently remove the professional record.')) return
    await supabase.from('professionals').delete().eq('id', id)
    fetchLabs()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('professionals').update({ is_active: !currentStatus }).eq('id', id)
    fetchLabs()
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/super-admin/approve-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId: id, action: 'approve' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      fetchLabs()
    } catch (e) {
      console.error('Approve lab error:', e)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch('/api/super-admin/approve-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId: id, action: 'reject', rejectionReason: 'Rejected by admin' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      fetchLabs()
    } catch (e) {
      console.error('Reject lab error:', e)
    }
  }

  const filteredLabs = labs.filter(l =>
    l.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.address_line1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.wilaya?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (lab: Laboratory) => {
    if (lab.status === 'waiting_approval') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>
    }
    if (lab.status === 'verified' && lab.is_active) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>
    }
    if (lab.status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
    }
    return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Inactive</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laboratories Management</h1>
          <p className="text-muted-foreground">Manage all laboratories on the platform ({filteredLabs.length} total)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingLab({
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
              is_24h: false,
              rating: null,
              review_count: 0,
              working_hours: {},
              test_types: [],
              status: 'waiting_approval',
              created_at: ''
            })}>
              <Plus className="h-4 w-4 mr-2" /> Add Laboratory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLab?.id ? 'Edit Laboratory' : 'Add New Laboratory'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name (English)</Label>
                  <Input value={editingLab?.business_name || ''} onChange={e => setEditingLab(prev => prev ? {...prev, business_name: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Name (Arabic)</Label>
                  <Input value={editingLab?.business_name_ar || ''} onChange={e => setEditingLab(prev => prev ? {...prev, business_name_ar: e.target.value} : null)} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editingLab?.address_line1 || ''} onChange={e => setEditingLab(prev => prev ? {...prev, address_line1: e.target.value} : null)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editingLab?.phone || ''} onChange={e => setEditingLab(prev => prev ? {...prev, phone: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Wilaya</Label>
                  <Input value={editingLab?.wilaya || ''} onChange={e => setEditingLab(prev => prev ? {...prev, wilaya: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Commune</Label>
                  <Input value={editingLab?.commune || ''} onChange={e => setEditingLab(prev => prev ? {...prev, commune: e.target.value} : null)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editingLab?.email || ''} onChange={e => setEditingLab(prev => prev ? {...prev, email: e.target.value} : null)} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingLab?.is_active || false} onCheckedChange={checked => setEditingLab(prev => prev ? {...prev, is_active: checked} : null)} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingLab?.is_24h || false} onCheckedChange={checked => setEditingLab(prev => prev ? {...prev, is_24h: checked} : null)} />
                  <Label>24h Service</Label>
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
              <Input placeholder="Search laboratories by name, address, or wilaya..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" className="text-muted-foreground" />
            </div>
          ) : filteredLabs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No laboratories found. Laboratories will appear here after professionals sign up and are verified.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Laboratory</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabs.map(lab => (
                  <TableRow key={lab.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <FlaskConical className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">{lab.business_name}</div>
                          {lab.business_name_ar && <div className="text-sm text-muted-foreground" dir="rtl">{lab.business_name_ar}</div>}
                          <div className="text-xs text-muted-foreground">License: {lab.license_number || 'N/A'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {lab.address_line1 || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">{lab.wilaya}, {lab.commune}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {lab.phone || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">{lab.email || ''}</div>
                    </TableCell>
                    <TableCell>
                      {lab.rating?.toFixed(1) || 'N/A'}
                      {lab.is_24h && <Badge variant="outline" className="ml-1">24h</Badge>}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(lab)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lab.status === 'waiting_approval' && (
                          <>
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(lab.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleReject(lab.id)}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { setEditingLab(lab); setIsDialogOpen(true) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(lab.id)}>
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
  )
}

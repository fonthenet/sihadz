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
import { Search, Plus, Edit, Trash2, Building2, MapPin, Phone, Clock, CheckCircle, XCircle } from "lucide-react"
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

interface Clinic {
  id: string
  name: string
  name_ar: string | null
  address: string | null
  wilaya_code: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  rating: number | null
  review_count: number | null
  working_hours: any
  created_at: string
}

export default function ClinicsManagement() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchClinics()
  }, [])

  const fetchClinics = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setClinics(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!editingClinic) return
    setSaving(true)

    const { error } = editingClinic.id
      ? await supabase.from('clinics').update(editingClinic).eq('id', editingClinic.id)
      : await supabase.from('clinics').insert(editingClinic)

    if (!error) {
      fetchClinics()
      setIsDialogOpen(false)
      setEditingClinic(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this clinic?')) return
    await supabase.from('clinics').delete().eq('id', id)
    fetchClinics()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('clinics').update({ is_active: !currentStatus }).eq('id', id)
    fetchClinics()
  }

  const filteredClinics = clinics.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clinics Management</h1>
          <p className="text-muted-foreground">Manage all clinics on the platform</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClinic({ id: '', name: '', name_ar: '', address: '', wilaya_code: '16', phone: '', email: '', is_active: true, rating: null, review_count: 0, working_hours: {}, created_at: '' })}>
              <Plus className="h-4 w-4 mr-2" /> Add Clinic
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingClinic?.id ? 'Edit Clinic' : 'Add New Clinic'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name (English)</Label>
                  <Input value={editingClinic?.name || ''} onChange={e => setEditingClinic(prev => prev ? {...prev, name: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Name (Arabic)</Label>
                  <Input value={editingClinic?.name_ar || ''} onChange={e => setEditingClinic(prev => prev ? {...prev, name_ar: e.target.value} : null)} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editingClinic?.address || ''} onChange={e => setEditingClinic(prev => prev ? {...prev, address: e.target.value} : null)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editingClinic?.phone || ''} onChange={e => setEditingClinic(prev => prev ? {...prev, phone: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editingClinic?.email || ''} onChange={e => setEditingClinic(prev => prev ? {...prev, email: e.target.value} : null)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wilaya Code</Label>
                <Input value={editingClinic?.wilaya_code || ''} onChange={e => setEditingClinic(prev => prev ? {...prev, wilaya_code: e.target.value} : null)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingClinic?.is_active || false} onCheckedChange={checked => setEditingClinic(prev => prev ? {...prev, is_active: checked} : null)} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
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
              <Input placeholder="Search clinics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" className="text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map(clinic => (
                  <TableRow key={clinic.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{clinic.name}</div>
                          {clinic.name_ar && <div className="text-sm text-muted-foreground" dir="rtl">{clinic.name_ar}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {clinic.address || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {clinic.phone || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{clinic.rating?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={clinic.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleActive(clinic.id, clinic.is_active)}>
                        {clinic.is_active ? <><CheckCircle className="h-3 w-3 mr-1" /> Active</> : <><XCircle className="h-3 w-3 mr-1" /> Inactive</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingClinic(clinic); setIsDialogOpen(true) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(clinic.id)}>
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

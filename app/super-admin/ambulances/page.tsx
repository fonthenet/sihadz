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
import { Search, Plus, Edit, Trash2, Ambulance, MapPin, Phone, CheckCircle, XCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

interface AmbulanceService {
  id: string
  name: string
  name_ar: string | null
  address: string | null
  wilaya_code: string | null
  phone: string | null
  emergency_phone: string | null
  is_active: boolean
  is_available: boolean
  created_at: string
}

export default function AmbulancesManagement() {
  const [ambulances, setAmbulances] = useState<AmbulanceService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingAmbulance, setEditingAmbulance] = useState<AmbulanceService | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchAmbulances()
  }, [])

  const fetchAmbulances = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ambulances')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAmbulances(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!editingAmbulance) return
    setSaving(true)

    const { error } = editingAmbulance.id
      ? await supabase.from('ambulances').update(editingAmbulance).eq('id', editingAmbulance.id)
      : await supabase.from('ambulances').insert(editingAmbulance)

    if (!error) {
      fetchAmbulances()
      setIsDialogOpen(false)
      setEditingAmbulance(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ambulance service?')) return
    await supabase.from('ambulances').delete().eq('id', id)
    fetchAmbulances()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('ambulances').update({ is_active: !currentStatus }).eq('id', id)
    fetchAmbulances()
  }

  const handleToggleAvailable = async (id: string, currentStatus: boolean) => {
    await supabase.from('ambulances').update({ is_available: !currentStatus }).eq('id', id)
    fetchAmbulances()
  }

  const filteredAmbulances = ambulances.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ambulances Management</h1>
            <p className="text-muted-foreground">Manage all ambulance services on the platform</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAmbulance({ id: '', name: '', name_ar: '', address: '', wilaya_code: '16', phone: '', emergency_phone: '', is_active: true, is_available: true, created_at: '' })}>
                <Plus className="h-4 w-4 mr-2" /> Add Ambulance Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAmbulance?.id ? 'Edit Ambulance Service' : 'Add New Ambulance Service'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name (English)</Label>
                    <Input value={editingAmbulance?.name || ''} onChange={e => setEditingAmbulance(prev => prev ? {...prev, name: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (Arabic)</Label>
                    <Input value={editingAmbulance?.name_ar || ''} onChange={e => setEditingAmbulance(prev => prev ? {...prev, name_ar: e.target.value} : null)} dir="rtl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={editingAmbulance?.address || ''} onChange={e => setEditingAmbulance(prev => prev ? {...prev, address: e.target.value} : null)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={editingAmbulance?.phone || ''} onChange={e => setEditingAmbulance(prev => prev ? {...prev, phone: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Phone</Label>
                    <Input value={editingAmbulance?.emergency_phone || ''} onChange={e => setEditingAmbulance(prev => prev ? {...prev, emergency_phone: e.target.value} : null)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Wilaya Code</Label>
                  <Input value={editingAmbulance?.wilaya_code || ''} onChange={e => setEditingAmbulance(prev => prev ? {...prev, wilaya_code: e.target.value} : null)} />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={editingAmbulance?.is_active || false} onCheckedChange={checked => setEditingAmbulance(prev => prev ? {...prev, is_active: checked} : null)} />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingAmbulance?.is_available || false} onCheckedChange={checked => setEditingAmbulance(prev => prev ? {...prev, is_available: checked} : null)} />
                    <Label>Available Now</Label>
                  </div>
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
                <Input placeholder="Search ambulance services..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
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
                    <TableHead>Service</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAmbulances.map(ambulance => (
                    <TableRow key={ambulance.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Ambulance className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <div className="font-medium">{ambulance.name}</div>
                            {ambulance.name_ar && <div className="text-sm text-muted-foreground" dir="rtl">{ambulance.name_ar}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {ambulance.address || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {ambulance.phone || 'N/A'}
                          </div>
                          {ambulance.emergency_phone && (
                            <div className="text-xs text-red-500 font-medium">Emergency: {ambulance.emergency_phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ambulance.is_available ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleAvailable(ambulance.id, ambulance.is_available)}>
                          {ambulance.is_available ? 'Available' : 'Busy'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ambulance.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleActive(ambulance.id, ambulance.is_active)}>
                          {ambulance.is_active ? <><CheckCircle className="h-3 w-3 mr-1" /> Active</> : <><XCircle className="h-3 w-3 mr-1" /> Inactive</>}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingAmbulance(ambulance); setIsDialogOpen(true) }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ambulance.id)}>
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

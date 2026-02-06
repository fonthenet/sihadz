'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save, Plus, Trash2, Users, Stethoscope, UserCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface LabStaffMember {
  id: string
  name: string
  phone?: string
  specialization?: string
  credentials?: string
}

export interface LabStaff {
  technicians: LabStaffMember[]
  pathologists: LabStaffMember[]
}

export interface LabStaffManagementProps {
  professional: { id: string; lab_staff?: unknown }
  onUpdate?: () => void
}

export function LabStaffManagement({ professional, onUpdate }: LabStaffManagementProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [technicians, setTechnicians] = useState<LabStaffMember[]>([])
  const [pathologists, setPathologists] = useState<LabStaffMember[]>([])

  // New staff form state
  const [newTechName, setNewTechName] = useState('')
  const [newTechPhone, setNewTechPhone] = useState('')
  const [newTechSpecialization, setNewTechSpecialization] = useState('')
  const [newPathName, setNewPathName] = useState('')
  const [newPathPhone, setNewPathPhone] = useState('')
  const [newPathCredentials, setNewPathCredentials] = useState('')

  const labStaff = (professional?.lab_staff as LabStaff) || { technicians: [], pathologists: [] }

  useEffect(() => {
    setTechnicians(labStaff.technicians || [])
    setPathologists(labStaff.pathologists || [])
  }, [professional?.lab_staff])

  const generateId = () => Math.random().toString(36).substring(2, 10)

  const handleAddTechnician = () => {
    if (!newTechName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Technician name is required.' })
      return
    }
    const newTech: LabStaffMember = {
      id: generateId(),
      name: newTechName.trim(),
      phone: newTechPhone.trim() || undefined,
      specialization: newTechSpecialization.trim() || undefined,
    }
    setTechnicians([...technicians, newTech])
    setNewTechName('')
    setNewTechPhone('')
    setNewTechSpecialization('')
  }

  const handleAddPathologist = () => {
    if (!newPathName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Pathologist name is required.' })
      return
    }
    const newPath: LabStaffMember = {
      id: generateId(),
      name: newPathName.trim(),
      phone: newPathPhone.trim() || undefined,
      credentials: newPathCredentials.trim() || undefined,
    }
    setPathologists([...pathologists, newPath])
    setNewPathName('')
    setNewPathPhone('')
    setNewPathCredentials('')
  }

  const handleRemoveTechnician = (id: string) => {
    setTechnicians(technicians.filter(t => t.id !== id))
  }

  const handleRemovePathologist = (id: string) => {
    setPathologists(pathologists.filter(p => p.id !== id))
  }

  const handleSave = async () => {
    if (!professional?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'No professional ID found.' })
      return
    }
    setSaving(true)
    try {
      const payload: LabStaff = { technicians, pathologists }
      console.log('[LabStaffManagement] Saving:', { professionalId: professional.id, payload })
      
      // Use API route to bypass RLS issues
      const res = await fetch(`/api/professionals/${professional.id}/staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_staff: payload }),
        credentials: 'include',
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      
      toast({ title: 'Staff saved', description: 'Lab staff directory has been updated.' })
      onUpdate?.()
    } catch (e: any) {
      console.error('Save staff error:', e)
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to save staff.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Lab Staff Directory
        </CardTitle>
        <CardDescription>
          Manage your laboratory technicians and pathologists. They can be assigned to test requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Technicians Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserCircle className="h-4 w-4 text-teal-600" />
            <Label className="text-base font-semibold">Lab Technicians</Label>
          </div>
          
          {technicians.length > 0 && (
            <div className="space-y-2 mb-4">
              {technicians.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{tech.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tech.specialization && <span>{tech.specialization}</span>}
                      {tech.phone && <span className="ml-2">· {tech.phone}</span>}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveTechnician(tech.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="newTechName" className="text-xs">Name *</Label>
              <Input id="newTechName" value={newTechName} onChange={(e) => setNewTechName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newTechPhone" className="text-xs">Phone</Label>
              <Input id="newTechPhone" value={newTechPhone} onChange={(e) => setNewTechPhone(e.target.value)} placeholder="0555..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newTechSpec" className="text-xs">Specialization</Label>
              <Input id="newTechSpec" value={newTechSpecialization} onChange={(e) => setNewTechSpecialization(e.target.value)} placeholder="e.g. Hematology" />
            </div>
            <Button variant="outline" onClick={handleAddTechnician} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
        </div>

        <Separator />

        {/* Pathologists Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="h-4 w-4 text-violet-600" />
            <Label className="text-base font-semibold">Pathologists / Doctors</Label>
          </div>
          
          {pathologists.length > 0 && (
            <div className="space-y-2 mb-4">
              {pathologists.map((path) => (
                <div key={path.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{path.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {path.credentials && <Badge variant="secondary" className="text-xs mr-2">{path.credentials}</Badge>}
                      {path.phone && <span>{path.phone}</span>}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemovePathologist(path.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="newPathName" className="text-xs">Name *</Label>
              <Input id="newPathName" value={newPathName} onChange={(e) => setNewPathName(e.target.value)} placeholder="Dr. Name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPathPhone" className="text-xs">Phone</Label>
              <Input id="newPathPhone" value={newPathPhone} onChange={(e) => setNewPathPhone(e.target.value)} placeholder="0555..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPathCreds" className="text-xs">Credentials</Label>
              <Input id="newPathCreds" value={newPathCredentials} onChange={(e) => setNewPathCredentials(e.target.value)} placeholder="e.g. MD, PhD" />
            </div>
            <Button variant="outline" onClick={handleAddPathologist} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><span className="animate-spin mr-2">⏳</span>Saving...</> : <><Save className="h-4 w-4 mr-2" />Save staff</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

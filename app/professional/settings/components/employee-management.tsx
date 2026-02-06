'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Key,
  Clock,
  Shield,
  UserCircle,
  Phone,
  Mail,
  Copy,
  Check,
  AlertCircle,
  Search,
  Building2,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  username: string
  display_name: string
  phone: string | null
  email: string | null
  is_active: boolean
  last_login: string | null
  login_count: number
  role_id: string | null
  role?: {
    id: string
    name: string
    description: string | null
    is_system: boolean
  }
  created_at: string
}

interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permissions: any
}

interface EmployeeManagementProps {
  professional: {
    id: string
    business_name?: string
    practice_code?: string
  }
}

export function EmployeeManagement({ professional }: EmployeeManagementProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showResetPinDialog, setShowResetPinDialog] = useState(false)
  const [resetPinTarget, setResetPinTarget] = useState<Employee | null>(null)
  const [resetPinCustom, setResetPinCustom] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [tempPin, setTempPin] = useState<string | null>(null)
  const [copiedPin, setCopiedPin] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    pin: '',
    roleId: '',
    phone: '',
    email: '',
    notes: '',
  })

  const loadData = useCallback(async () => {
    if (!professional?.id) return
    setLoading(true)
    try {
      const [empRes, roleRes] = await Promise.all([
        fetch(`/api/professionals/${professional.id}/employees`, { credentials: 'include' }),
        fetch(`/api/professionals/${professional.id}/roles`, { credentials: 'include' }),
      ])

      if (empRes.ok) {
        const { employees } = await empRes.json()
        setEmployees(employees || [])
      }

      if (roleRes.ok) {
        const { roles } = await roleRes.json()
        setRoles(roles || [])
      }
    } catch (error) {
      console.error('Error loading employee data:', error)
      toast({ title: 'Error', description: 'Failed to load employee data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [professional?.id, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setFormData({
      username: '',
      displayName: '',
      pin: '',
      roleId: '',
      phone: '',
      email: '',
      notes: '',
    })
  }

  const handleAddEmployee = async () => {
    if (!formData.username || !formData.displayName) {
      toast({ title: 'Error', description: 'Username and name are required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/professionals/${professional.id}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          displayName: formData.displayName,
          pin: formData.pin || undefined,
          roleId: formData.roleId || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          notes: formData.notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to add employee', variant: 'destructive' })
        return
      }

      // Show temporary PIN if generated
      if (data.temporaryPin) {
        setTempPin(data.temporaryPin)
        setShowPinDialog(true)
      } else {
        toast({ title: 'Success', description: 'Employee added successfully' })
      }

      setShowAddDialog(false)
      resetForm()
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add employee', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditEmployee = async () => {
    if (!selectedEmployee || !formData.displayName) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/professionals/${professional.id}/employees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          displayName: formData.displayName,
          roleId: formData.roleId || null,
          phone: formData.phone || null,
          email: formData.email || null,
          notes: formData.notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to update employee', variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Employee updated successfully' })
      setShowEditDialog(false)
      setSelectedEmployee(null)
      resetForm()
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update employee', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleResetPin = async (employee: Employee, customPin?: string) => {
    if (customPin && (customPin.length < 4 || customPin.length > 6 || !/^\d+$/.test(customPin))) {
      toast({ title: 'Error', description: 'PIN must be 4–6 digits', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/professionals/${professional.id}/employees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          customPin ? { employeeId: employee.id, newPin: customPin } : { employeeId: employee.id, resetPin: true }
        ),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to set PIN', variant: 'destructive' })
        return
      }

      if (data.temporaryPin) {
        setTempPin(data.temporaryPin)
        setShowPinDialog(true)
      } else if (customPin) {
        toast({ title: 'Success', description: 'Custom PIN set successfully' })
      }
      setShowResetPinDialog(false)
      setResetPinTarget(null)
      setResetPinCustom('')
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to set PIN', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/professionals/${professional.id}/employees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employeeId: employee.id,
          isActive: !employee.is_active,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to update status', variant: 'destructive' })
        return
      }

      toast({
        title: 'Success',
        description: `Employee ${employee.is_active ? 'deactivated' : 'activated'}`,
      })
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.display_name}? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(
        `/api/professionals/${professional.id}/employees?employeeId=${employee.id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to delete employee', variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Employee deleted' })
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete employee', variant: 'destructive' })
    }
  }

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      username: employee.username,
      displayName: employee.display_name,
      pin: '',
      roleId: employee.role_id || '',
      phone: employee.phone || '',
      email: employee.email || '',
      notes: '',
    })
    setShowEditDialog(true)
  }

  const copyPin = () => {
    if (tempPin) {
      navigator.clipboard.writeText(tempPin)
      setCopiedPin(true)
      setTimeout(() => setCopiedPin(false), 2000)
    }
  }

  const filteredEmployees = employees.filter(
    (e) =>
      e.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = employees.filter((e) => e.is_active).length

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Team & Employees</CardTitle>
                <CardDescription>
                  {activeCount} active employee{activeCount !== 1 ? 's' : ''} · Practice code:{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                    {professional.practice_code || 'Not set'}
                  </code>
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Employee List */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No employees yet</p>
              <p className="text-sm mt-1">Add employees to give them access to your dashboard</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Employee
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={cn(
                    'flex items-center gap-4 p-4 border rounded-lg transition-colors',
                    employee.is_active
                      ? 'bg-card hover:bg-muted/50'
                      : 'bg-muted/30 opacity-60'
                  )}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {employee.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{employee.display_name}</p>
                      <Badge variant={employee.is_active ? 'default' : 'secondary'} className="text-xs">
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        @{employee.username}
                      </span>
                      {employee.role && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {employee.role.name}
                        </span>
                      )}
                      {employee.last_login && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last login: {new Date(employee.last_login).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setResetPinTarget(employee); setResetPinCustom(''); setShowResetPinDialog(true) }}
                      disabled={saving}
                      title="Set or reset PIN"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={employee.is_active}
                      onCheckedChange={() => handleToggleActive(employee)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteEmployee(employee)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account with dashboard access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-username">Username *</Label>
                <Input
                  id="add-username"
                  placeholder="e.g. john_doe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-name">Display Name *</Label>
                <Input
                  id="add-name"
                  placeholder="e.g. John Doe"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-pin">PIN (optional)</Label>
                <Input
                  id="add-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 4–6 digits or leave blank"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Custom PIN (4–6 digits) or leave blank to auto-generate</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-role">Role</Label>
                <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                  <SelectTrigger id="add-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  placeholder="+213..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update {selectedEmployee?.display_name}'s information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={formData.username} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Display Name *</Label>
              <Input
                id="edit-name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedEmployee(null); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set/Reset PIN Dialog */}
      <Dialog open={showResetPinDialog} onOpenChange={(open) => { setShowResetPinDialog(open); if (!open) { setResetPinTarget(null); setResetPinCustom('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Set PIN for {resetPinTarget?.display_name}
            </DialogTitle>
            <DialogDescription>
              Enter a custom 4–6 digit PIN, or generate a random one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-pin">Custom PIN (4–6 digits)</Label>
              <Input
                id="reset-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter custom PIN or leave blank"
                value={resetPinCustom}
                onChange={(e) => setResetPinCustom(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetPinDialog(false); setResetPinTarget(null); setResetPinCustom('') }}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => resetPinTarget && handleResetPin(resetPinTarget)}
              disabled={saving}
            >
              Generate random
            </Button>
            <Button
              onClick={() => resetPinTarget && handleResetPin(resetPinTarget, resetPinCustom)}
              disabled={saving || resetPinCustom.length < 4 || resetPinCustom.length > 6}
            >
              {saving ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Set custom PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Display Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(open) => { setShowPinDialog(open); if (!open) setTempPin(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Employee PIN
            </DialogTitle>
            <DialogDescription>
              Share this PIN securely with the employee. It will only be shown once.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 text-center">
              <p className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">
                {tempPin}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={copyPin}
            >
              {copiedPin ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy PIN
                </>
              )}
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This PIN will not be shown again. If lost, you can reset it from the employee list.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={() => { setShowPinDialog(false); setTempPin(null) }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

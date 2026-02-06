'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
  Database,
  Lock,
} from 'lucide-react'
import { LoadingSpinner, SectionLoading } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Role {
  id: string
  name: string
  description: string | null
  permissions: EmployeePermissions
  is_system: boolean
  is_active: boolean
}

interface EmployeePermissions {
  dashboard: Record<string, boolean>
  actions: Record<string, boolean>
  data: Record<string, boolean>
}

interface RoleEditorProps {
  professional: {
    id: string
    type?: string
  }
}

const ALL_DASHBOARD_PERMISSIONS = [
  { key: 'overview', label: 'Overview', description: 'Dashboard overview and stats' },
  { key: 'patients', label: 'Patients', description: 'Patient list and details' },
  { key: 'appointments', label: 'Appointments', description: 'View and manage appointments' },
  { key: 'messages', label: 'Messages', description: 'Messaging and communication' },
  { key: 'finances', label: 'Finances', description: 'Financial data and billing' },
  { key: 'analytics', label: 'Analytics', description: 'Reports and analytics' },
  { key: 'settings', label: 'Settings', description: 'Practice settings' },
  { key: 'requests', label: 'Requests', description: 'Test requests (labs)' },
  { key: 'samples', label: 'Samples', description: 'Sample management (labs)' },
  { key: 'results', label: 'Results', description: 'Test results (labs)' },
  { key: 'equipment', label: 'Equipment', description: 'Equipment (labs)' },
  { key: 'prescriptions', label: 'Prescriptions', description: 'Prescriptions' },
  { key: 'orders', label: 'Orders', description: 'Order management' },
  { key: 'inventory', label: 'Inventory', description: 'Inventory management' },
  { key: 'delivery', label: 'Delivery', description: 'Delivery tracking' },
  { key: 'documents', label: 'Documents', description: 'Document management' },
  { key: 'lab_requests', label: 'Lab Requests', description: 'Laboratory requests (doctors)' },
  { key: 'pos', label: 'Point of Sale', description: 'POS / cash register' },
  { key: 'chifa', label: 'Chifa / CNAS', description: 'Chifa and CNAS billing' },
]

/** Dashboard permission keys per professional type – only show what's relevant */
const DASHBOARD_KEYS_BY_TYPE: Record<string, string[]> = {
  pharmacy: ['overview', 'prescriptions', 'orders', 'messages', 'inventory', 'pos', 'chifa', 'finances', 'delivery', 'analytics', 'settings'],
  doctor: ['overview', 'patients', 'appointments', 'messages', 'prescriptions', 'lab_requests', 'analytics', 'finances', 'documents', 'settings'],
  laboratory: ['overview', 'requests', 'patients', 'samples', 'results', 'equipment', 'analytics', 'finances', 'documents', 'messages', 'settings'],
  clinic: ['overview', 'patients', 'appointments', 'messages', 'analytics', 'finances', 'settings'],
  ambulance: ['overview', 'messages', 'settings'],
}

function getDashboardPermissionsForType(professionalType?: string) {
  const keys = professionalType ? DASHBOARD_KEYS_BY_TYPE[professionalType] : null
  if (!keys) return ALL_DASHBOARD_PERMISSIONS
  return ALL_DASHBOARD_PERMISSIONS.filter((p) => keys.includes(p.key))
}

const ACTION_PERMISSIONS = [
  { key: 'create_appointments', label: 'Create Appointments', description: 'Book new appointments' },
  { key: 'cancel_appointments', label: 'Cancel Appointments', description: 'Cancel existing appointments' },
  { key: 'view_patient_details', label: 'View Patient Details', description: 'Access patient medical info' },
  { key: 'create_prescriptions', label: 'Create Prescriptions', description: 'Write prescriptions' },
  { key: 'process_orders', label: 'Process Orders', description: 'Process and fulfill orders' },
  { key: 'manage_inventory', label: 'Manage Inventory', description: 'Add/edit inventory items' },
  { key: 'view_reports', label: 'View Reports', description: 'Access business reports' },
  { key: 'manage_employees', label: 'Manage Employees', description: 'Add/edit employees (admin)' },
  { key: 'manage_settings', label: 'Manage Settings', description: 'Change practice settings' },
]

const DATA_PERMISSIONS = [
  { key: 'view_all_patients', label: 'View All Patients', description: 'See all patient records' },
  { key: 'view_financial_data', label: 'View Financial Data', description: 'Access revenue and billing' },
  { key: 'export_data', label: 'Export Data', description: 'Export reports and data' },
]

/** Build a description from current permissions so it always reflects what the role can access */
function getRoleSummaryFromPermissions(
  permissions: EmployeePermissions | null | undefined,
  professionalType?: string
): string {
  if (!permissions?.dashboard) return 'No permissions'
  const d = permissions.dashboard
  const labels: Record<string, string> = {
    overview: 'Overview',
    pos: 'POS',
    prescriptions: 'Prescriptions',
    orders: 'Orders',
    inventory: 'Inventory',
    chifa: 'Chifa',
    messages: 'Messages',
    finances: 'Finances',
    patients: 'Patients',
    appointments: 'Appointments',
    settings: 'Settings',
    analytics: 'Analytics',
    requests: 'Requests',
    samples: 'Samples',
    results: 'Results',
    equipment: 'Equipment',
    delivery: 'Delivery',
    documents: 'Documents',
    lab_requests: 'Lab requests',
  }
  const keysToShow = professionalType ? DASHBOARD_KEYS_BY_TYPE[professionalType] : Object.keys(labels)
  const enabled: string[] = []
  for (const key of keysToShow || []) {
    if (d[key] && labels[key]) enabled.push(labels[key])
  }
  if (enabled.length === 0) return 'No sections enabled'
  return enabled.join(', ')
}

export function RoleEditor({ professional }: RoleEditorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPermissions, setFormPermissions] = useState<EmployeePermissions>({
    dashboard: {},
    actions: {},
    data: {},
  })

  const loadRoles = useCallback(async () => {
    if (!professional?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/professionals/${professional.id}/roles`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const { roles } = await res.json()
        setRoles(roles || [])
      }
    } catch (error) {
      console.error('Error loading roles:', error)
      toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [professional?.id, toast])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPermissions({ dashboard: {}, actions: {}, data: {} })
  }

  const openCreateDialog = () => {
    setIsCreating(true)
    setSelectedRole(null)
    resetForm()
    setShowDialog(true)
  }

  const openEditDialog = (role: Role) => {
    setIsCreating(false)
    setSelectedRole(role)
    setFormName(role.name)
    setFormDescription(role.description || '')
    setFormPermissions(role.permissions || { dashboard: {}, actions: {}, data: {} })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const endpoint = `/api/professionals/${professional.id}/roles`
      const method = isCreating ? 'POST' : 'PATCH'
      const body = isCreating
        ? { name: formName, description: formDescription, permissions: formPermissions }
        : { roleId: selectedRole?.id, name: formName, description: formDescription, permissions: formPermissions }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to save role', variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: isCreating ? 'Role created' : 'Role updated' })
      setShowDialog(false)
      resetForm()

      // Update roles state immediately with saved data so cards reflect changes
      const savedRole = data.role
      if (savedRole) {
        if (isCreating) {
          setRoles((prev) => [...prev, savedRole])
        } else {
          setRoles((prev) =>
            prev.map((r) => (r.id === savedRole.id ? savedRole : r))
          )
        }
      } else {
        loadRoles()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save role', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      toast({ title: 'Error', description: 'System roles cannot be deleted', variant: 'destructive' })
      return
    }

    if (!confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
      return
    }

    try {
      const res = await fetch(
        `/api/professionals/${professional.id}/roles?roleId=${role.id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to delete role', variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Role deleted' })
      loadRoles()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' })
    }
  }

  const togglePermission = (category: 'dashboard' | 'actions' | 'data', key: string) => {
    setFormPermissions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key],
      },
    }))
  }

  const toggleAllInCategory = (category: 'dashboard' | 'actions' | 'data', value: boolean) => {
    const keys =
      category === 'dashboard'
        ? getDashboardPermissionsForType(professional?.type).map((p) => p.key)
        : category === 'actions'
        ? ACTION_PERMISSIONS.map((p) => p.key)
        : DATA_PERMISSIONS.map((p) => p.key)

    setFormPermissions((prev) => ({
      ...prev,
      [category]: Object.fromEntries(keys.map((k) => [k, value])),
    }))
  }

  const countPermissions = (role: Role) => {
    const p = role.permissions || { dashboard: {}, actions: {}, data: {} }
    return (
      Object.values(p.dashboard || {}).filter(Boolean).length +
      Object.values(p.actions || {}).filter(Boolean).length +
      Object.values(p.data || {}).filter(Boolean).length
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <SectionLoading minHeight="min-h-[200px]" className="text-muted-foreground" />
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
              <div className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  Define what each role can see and do in the dashboard
                </CardDescription>
              </div>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No roles defined</p>
              <p className="text-sm mt-1">Create roles to assign permissions to employees</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={cn(
                    'relative p-4 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50',
                    selectedRole?.id === role.id && 'ring-2 ring-primary'
                  )}
                  onClick={() => openEditDialog(role)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{role.name}</h4>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      )}
                    </div>
                    {!role.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(role)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2" title={getRoleSummaryFromPermissions(role.permissions, professional?.type)}>
                    {getRoleSummaryFromPermissions(role.permissions, professional?.type)}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {countPermissions(role)} permissions
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create New Role' : `Edit Role: ${selectedRole?.name}`}</DialogTitle>
            <DialogDescription>
              {selectedRole?.is_system
                ? 'System roles can have permissions edited but cannot be renamed or deleted'
                : 'Define what employees with this role can access'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={selectedRole?.is_system}
                    placeholder="e.g. Senior Technician"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-desc">Description</Label>
                  <Input
                    id="role-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <Separator />

              {/* Permissions */}
              <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dashboard" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Actions
                  </TabsTrigger>
                  <TabsTrigger value="data" className="gap-2">
                    <Database className="h-4 w-4" />
                    Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">Which sections can this role see?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory('dashboard', true)}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory('dashboard', false)}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {getDashboardPermissionsForType(professional?.type).map((perm) => (
                        <div
                          key={perm.key}
                          className={cn(
                            'flex items-center justify-between p-3 border rounded-lg transition-colors',
                            formPermissions.dashboard[perm.key] && 'bg-primary/5 border-primary/30'
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">{perm.label}</p>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                          <Switch
                            checked={formPermissions.dashboard[perm.key] || false}
                            onCheckedChange={() => togglePermission('dashboard', perm.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="actions" className="mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">What can this role do?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory('actions', true)}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory('actions', false)}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ACTION_PERMISSIONS.map((perm) => (
                        <div
                          key={perm.key}
                          className={cn(
                            'flex items-center justify-between p-3 border rounded-lg transition-colors',
                            formPermissions.actions[perm.key] && 'bg-primary/5 border-primary/30'
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">{perm.label}</p>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                          <Switch
                            checked={formPermissions.actions[perm.key] || false}
                            onCheckedChange={() => togglePermission('actions', perm.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="data" className="mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">What data can this role access?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory('data', true)}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory('data', false)}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {DATA_PERMISSIONS.map((perm) => (
                      <div
                        key={perm.key}
                        className={cn(
                          'flex items-center justify-between p-3 border rounded-lg transition-colors',
                          formPermissions.data[perm.key] && 'bg-primary/5 border-primary/30'
                        )}
                      >
                        <div>
                          <p className="font-medium text-sm">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                        <Switch
                          checked={formPermissions.data[perm.key] || false}
                          onCheckedChange={() => togglePermission('data', perm.key)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" className="me-2" /> : null}
              {isCreating ? 'Create Role' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

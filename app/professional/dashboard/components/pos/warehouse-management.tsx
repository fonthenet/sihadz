'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Warehouse,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  Package,
  Thermometer,
  Check,
  X,
  Truck
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import type { Warehouse as WarehouseType, WarehouseTransfer } from '@/lib/pos/types'

export default function WarehouseManagement() {
  const { toast } = useToast()
  
  const [warehouses, setWarehouses] = useState<(WarehouseType & { stock_batches?: number; total_quantity?: number })[]>([])
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create warehouse
  const [showCreate, setShowCreate] = useState(false)
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    warehouse_type: 'storage',
    description: '',
    is_default: false,
    is_sales_enabled: true,
    temperature_controlled: false
  })
  const [creating, setCreating] = useState(false)

  // Create transfer
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    notes: '',
    items: [] as Array<{ product_id: string; product_name: string; quantity: number }>
  })

  const loadData = useCallback(async () => {
    try {
      const [whRes, trRes] = await Promise.all([
        fetch('/api/pharmacy/warehouses'),
        fetch('/api/pharmacy/warehouses/transfers')
      ])
      
      if (whRes.ok) {
        const data = await whRes.json()
        setWarehouses(data.warehouses || [])
      }
      
      if (trRes.ok) {
        const data = await trRes.json()
        setTransfers(data.transfers || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateWarehouse = async () => {
    if (!warehouseForm.code || !warehouseForm.name) {
      toast({ title: 'Error', description: 'Code and name required', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/pharmacy/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseForm)
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: data.message })
        setShowCreate(false)
        setWarehouseForm({
          code: '', name: '', warehouse_type: 'storage', description: '',
          is_default: false, is_sales_enabled: true, temperature_controlled: false
        })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleTransferAction = async (transferId: string, action: 'ship' | 'receive' | 'cancel') => {
    try {
      const res = await fetch(`/api/pharmacy/warehouses/transfers?id=${transferId}&action=${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: data.message })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      in_transit: { variant: 'default', label: 'In Transit' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    }
    const s = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="warehouses" className="space-y-4">
      <TabsList>
        <TabsTrigger value="warehouses" className="gap-2">
          <Warehouse className="h-4 w-4" />
          Warehouses
        </TabsTrigger>
        <TabsTrigger value="transfers" className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Transfers
        </TabsTrigger>
      </TabsList>

      <TabsContent value="warehouses" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Stock Locations</h3>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Button>
        </div>

        {warehouses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No warehouses configured</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Warehouse
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map(wh => (
              <Card key={wh.id} className={wh.is_default ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{wh.name}</CardTitle>
                      <CardDescription>{wh.code}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {wh.is_default && <Badge>Default</Badge>}
                      {wh.temperature_controlled && (
                        <Badge variant="outline">
                          <Thermometer className="h-3 w-3 mr-1" />
                          Cold
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Batches</p>
                      <p className="font-semibold">{wh.stock_batches || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Qty</p>
                      <p className="font-semibold">{wh.total_quantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{wh.warehouse_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {wh.description && (
                    <p className="text-sm text-muted-foreground mt-2">{wh.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="transfers" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Stock Transfers</h3>
          <Button onClick={() => setShowTransfer(true)} disabled={warehouses.length < 2}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transfers yet
                    </TableCell>
                  </TableRow>
                ) : transfers.map(tr => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-medium">{tr.transfer_number}</TableCell>
                    <TableCell>{tr.from_warehouse?.name || '-'}</TableCell>
                    <TableCell>{tr.to_warehouse?.name || '-'}</TableCell>
                    <TableCell>{tr.items?.length || 0} items</TableCell>
                    <TableCell>{new Date(tr.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(tr.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {tr.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleTransferAction(tr.id, 'ship')}>
                              <Truck className="h-3 w-3 mr-1" />
                              Ship
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleTransferAction(tr.id, 'cancel')}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {tr.status === 'in_transit' && (
                          <Button size="sm" onClick={() => handleTransferAction(tr.id, 'receive')}>
                            <Check className="h-3 w-3 mr-1" />
                            Receive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Create Warehouse Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Warehouse</DialogTitle>
            <DialogDescription>Create a new stock location</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })}
                  placeholder="MAIN"
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="Main Storage"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={warehouseForm.warehouse_type}
                onValueChange={(v) => setWarehouseForm({ ...warehouseForm, warehouse_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="sales_floor">Sales Floor</SelectItem>
                  <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  <SelectItem value="controlled">Controlled Substances</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={warehouseForm.description}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Set as Default</Label>
              <Switch
                checked={warehouseForm.is_default}
                onCheckedChange={(c) => setWarehouseForm({ ...warehouseForm, is_default: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Enable Sales from this Location</Label>
              <Switch
                checked={warehouseForm.is_sales_enabled}
                onCheckedChange={(c) => setWarehouseForm({ ...warehouseForm, is_sales_enabled: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Temperature Controlled</Label>
              <Switch
                checked={warehouseForm.temperature_controlled}
                onCheckedChange={(c) => setWarehouseForm({ ...warehouseForm, temperature_controlled: c })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateWarehouse} disabled={creating}>
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

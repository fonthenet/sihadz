'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  ShoppingCart,
  Plus,
  Send,
  Check,
  Package,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import type { PurchaseOrder, OrderSuggestion, Warehouse } from '@/lib/pos/types'

interface Supplier {
  id: string
  name: string
  phone?: string
}

export default function PurchaseOrders() {
  const { toast } = useToast()
  
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suggestions, setSuggestions] = useState<OrderSuggestion[]>([])
  const [suggestionSummary, setSuggestionSummary] = useState({ out_of_stock: 0, low_stock: 0, rotation: 0, total_items: 0 })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create PO
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [poNotes, setPoNotes] = useState('')
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [ordersRes, suggestRes, suppRes, whRes] = await Promise.all([
        fetch('/api/pharmacy/purchase-orders'),
        fetch('/api/pharmacy/purchase-orders/suggestions'),
        fetch('/api/pharmacy/inventory/suppliers'),
        fetch('/api/pharmacy/warehouses')
      ])
      
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }
      
      if (suggestRes.ok) {
        const data = await suggestRes.json()
        setSuggestions(data.suggestions || [])
        setSuggestionSummary(data.summary || { out_of_stock: 0, low_stock: 0, rotation: 0, total_items: 0 })
      }
      
      if (suppRes.ok) {
        const data = await suppRes.json()
        setSuppliers(data.suppliers || [])
      }
      
      if (whRes.ok) {
        const data = await whRes.json()
        setWarehouses(data.warehouses || [])
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

  const handleCreatePO = async () => {
    if (selectedSuggestions.size === 0) {
      toast({ title: 'Error', description: 'Select at least one item', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const items = suggestions
        .filter(s => selectedSuggestions.has(s.product_id))
        .map(s => ({
          product_id: s.product_id,
          product_name: s.product_name,
          product_barcode: s.product_barcode,
          quantity_ordered: s.suggested_quantity,
          unit_price: s.last_purchase_price
        }))

      const res = await fetch('/api/pharmacy/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplier || undefined,
          warehouse_id: selectedWarehouse || undefined,
          notes: poNotes,
          items
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: `PO ${data.purchase_order.po_number} created` })
        setShowCreate(false)
        setSelectedSuggestions(new Set())
        setSelectedSupplier('')
        setPoNotes('')
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

  const handlePOAction = async (poId: string, action: 'send' | 'confirm' | 'receive' | 'cancel') => {
    try {
      const res = await fetch(`/api/pharmacy/purchase-orders?id=${poId}&action=${action}`, {
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

  const toggleSuggestion = (productId: string) => {
    const newSet = new Set(selectedSuggestions)
    if (newSet.has(productId)) {
      newSet.delete(productId)
    } else {
      newSet.add(productId)
    }
    setSelectedSuggestions(newSet)
  }

  const selectAll = () => {
    setSelectedSuggestions(new Set(suggestions.map(s => s.product_id)))
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'out_of_stock': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'low_stock': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'rotation': return <TrendingUp className="h-4 w-4 text-blue-500" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sent: { variant: 'default', label: 'Sent' },
      confirmed: { variant: 'outline', label: 'Confirmed' },
      partial: { variant: 'outline', label: 'Partial' },
      received: { variant: 'outline', label: 'Received' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    }
    const s = map[status] || { variant: 'secondary', label: status }
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
    <Tabs defaultValue="wizard" className="space-y-4">
      <TabsList>
        <TabsTrigger value="wizard" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Order Wizard
          {suggestionSummary.total_items > 0 && (
            <Badge variant="destructive" className="ml-1">{suggestionSummary.total_items}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="orders" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Purchase Orders
        </TabsTrigger>
      </TabsList>

      {/* Order Wizard */}
      <TabsContent value="wizard" className="space-y-4">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={suggestionSummary.out_of_stock > 0 ? 'border-red-200' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{suggestionSummary.out_of_stock}</p>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={suggestionSummary.low_stock > 0 ? 'border-orange-200' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{suggestionSummary.low_stock}</p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{suggestionSummary.rotation}</p>
                  <p className="text-sm text-muted-foreground">By Rotation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <div>
                  <p className="text-2xl font-bold">{suggestionSummary.total_items}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Suggested Orders</CardTitle>
              <CardDescription>Based on stock levels and sales rotation</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button
                size="sm"
                disabled={selectedSuggestions.size === 0}
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create PO ({selectedSuggestions.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>All products are well stocked!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Avg Daily</TableHead>
                    <TableHead>Suggested Qty</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map(s => (
                    <TableRow key={s.product_id} className={selectedSuggestions.has(s.product_id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSuggestions.has(s.product_id)}
                          onCheckedChange={() => toggleSuggestion(s.product_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{s.product_name}</p>
                        {s.product_barcode && (
                          <p className="text-xs text-muted-foreground">{s.product_barcode}</p>
                        )}
                      </TableCell>
                      <TableCell className={s.current_stock === 0 ? 'text-red-600 font-bold' : ''}>
                        {s.current_stock}
                      </TableCell>
                      <TableCell>{s.min_stock_level}</TableCell>
                      <TableCell>{s.avg_daily_sales.toFixed(1)}</TableCell>
                      <TableCell className="font-bold">{s.suggested_quantity}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getReasonIcon(s.reason)}
                          <span className="text-sm capitalize">{s.reason.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Purchase Orders List */}
      <TabsContent value="orders" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase orders yet
                    </TableCell>
                  </TableRow>
                ) : orders.map(po => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.supplier?.name || po.supplier_name || '-'}</TableCell>
                    <TableCell>{po.items?.length || 0} items</TableCell>
                    <TableCell>{formatPrice(po.total_amount)}</TableCell>
                    <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {po.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handlePOAction(po.id, 'send')}>
                            <Send className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                        {po.status === 'sent' && (
                          <Button size="sm" variant="outline" onClick={() => handlePOAction(po.id, 'confirm')}>
                            <Check className="h-3 w-3 mr-1" />
                            Confirm
                          </Button>
                        )}
                        {po.status === 'confirmed' && (
                          <Button size="sm" onClick={() => handlePOAction(po.id, 'receive')}>
                            <Package className="h-3 w-3 mr-1" />
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

      {/* Create PO Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              {selectedSuggestions.size} items selected
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier (optional)</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No supplier</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destination Warehouse</Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Default</SelectItem>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Order notes..."
              />
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-auto">
              <h4 className="font-medium mb-2">Selected Items</h4>
              <div className="space-y-2">
                {suggestions.filter(s => selectedSuggestions.has(s.product_id)).map(s => (
                  <div key={s.product_id} className="flex justify-between text-sm">
                    <span>{s.product_name}</span>
                    <span className="font-medium">{s.suggested_quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreatePO} disabled={creating}>
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

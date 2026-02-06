'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Boxes,
  Plus,
  Search,
  Calendar,
  Package,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { formatPrice, formatDate } from '@/lib/inventory/calculations'
import type { PharmacyInventory, PharmacyProduct, PharmacySupplier } from '@/lib/inventory/types'

interface StockLevelsProps {
  onStockChange?: () => void
}

export default function StockLevels({ onStockChange }: StockLevelsProps) {
  const { toast } = useToast()
  const [inventory, setInventory] = useState<PharmacyInventory[]>([])
  const [products, setProducts] = useState<PharmacyProduct[]>([])
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [batchNumber, setBatchNumber] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [purchasePrice, setPurchasePrice] = useState<number | undefined>()
  const [supplierId, setSupplierId] = useState<string>('')
  const [location, setLocation] = useState<string>('')

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pharmacy/inventory/stock?per_page=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch inventory')
      const data = await res.json()
      setInventory(data.data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/products?per_page=500', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data.data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }, [])

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/suppliers', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      const data = await res.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
    fetchProducts()
    fetchSuppliers()
  }, [fetchInventory, fetchProducts, fetchSuppliers])

  const openReceiveDialog = () => {
    setSelectedProduct('')
    setQuantity(1)
    setBatchNumber('')
    setExpiryDate('')
    setPurchasePrice(undefined)
    setSupplierId('')
    setLocation('')
    setDialogOpen(true)
  }

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId)
    const product = products.find(p => p.id === productId)
    if (product?.purchase_price) {
      setPurchasePrice(product.purchase_price)
    }
  }

  const handleReceive = async () => {
    if (!selectedProduct || !quantity || quantity <= 0) {
      toast({ title: 'Error', description: 'Select a product and quantity', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/pharmacy/inventory/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          quantity,
          batch_number: batchNumber || null,
          expiry_date: expiryDate || null,
          purchase_price_unit: purchasePrice || null,
          supplier_id: supplierId || null,
          location: location || null
        }),
        credentials: 'include'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add stock')
      }

      toast({ title: 'Success', description: `${quantity} units added to stock` })
      setDialogOpen(false)
      fetchInventory()
      onStockChange?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>
    }
    if (daysLeft <= 7) {
      return <Badge variant="destructive" className="text-xs">{daysLeft}d</Badge>
    }
    if (daysLeft <= 30) {
      return <Badge className="bg-orange-500 text-xs">{daysLeft}d</Badge>
    }
    return <Badge variant="outline" className="text-xs">{formatDate(expiryDate)}</Badge>
  }

  // Group inventory by product
  const groupedInventory = inventory.reduce((acc, inv) => {
    const productId = inv.product_id
    if (!acc[productId]) {
      acc[productId] = {
        product: inv.product,
        batches: []
      }
    }
    acc[productId].batches.push(inv)
    return acc
  }, {} as Record<string, { product?: any; batches: PharmacyInventory[] }>)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Stock Levels
            </CardTitle>
            <Button onClick={openReceiveDialog} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Receive Stock
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : Object.keys(groupedInventory).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Boxes className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No stock recorded</p>
              <Button variant="link" onClick={openReceiveDialog}>
                Receive stock
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedInventory).map(([productId, { product, batches }]) => {
                const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0)
                const totalReserved = batches.reduce((sum, b) => sum + (b.reserved_quantity || 0), 0)
                
                return (
                  <div key={productId} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{product?.name || 'Unknown product'}</p>
                        <p className="text-xs text-muted-foreground">
                          {product?.barcode || '-'} • {batches.length} lot(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{totalQty}</p>
                        {totalReserved > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {totalReserved} reserved
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {batches.length > 0 && (
                      <div className="space-y-1 mt-2 pt-2 border-t">
                        {batches.slice(0, 3).map(batch => (
                          <div key={batch.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Lot: {batch.batch_number || 'N/A'}
                              </span>
                              {getExpiryBadge(batch.expiry_date)}
                            </div>
                            <span className="font-medium">{batch.quantity}</span>
                          </div>
                        ))}
                        {batches.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            + {batches.length - 3} more batch(es)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive Stock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Receive Stock
            </DialogTitle>
            <DialogDescription>
              Record a new stock receipt
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={selectedProduct} onValueChange={handleProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.barcode && `(${product.barcode})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Unit Price (DA)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={purchasePrice || ''}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || undefined)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch Number</Label>
                <Input
                  id="batch_number"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. LOT2026A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId || "none"} onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Shelf A3, Refrigerator"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={saving || !selectedProduct || !quantity}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Receive'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

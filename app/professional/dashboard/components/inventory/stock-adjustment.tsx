'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import type { PharmacyProduct, AdjustmentReasonCode } from '@/lib/inventory/types'
import { useAuth } from '@/components/auth-provider'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'

interface StockAdjustmentProps {
  onAdjustment?: () => void
}

const ADJUSTMENT_REASONS: { value: AdjustmentReasonCode; label: string }[] = [
  { value: 'count_correction', label: 'Inventory Count Correction' },
  { value: 'damage', label: 'Damaged Product' },
  { value: 'expiry', label: 'Expired Product' },
  { value: 'theft', label: 'Theft / Loss' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'data_entry_error', label: 'Data Entry Error' },
  { value: 'initial_stock', label: 'Initial Stock' },
  { value: 'other', label: 'Other Reason' }
]

export default function StockAdjustment({ onAdjustment }: StockAdjustmentProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [products, setProducts] = useState<PharmacyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add')
  const [quantity, setQuantity] = useState<number>(1)
  const [reasonCode, setReasonCode] = useState<AdjustmentReasonCode>('count_correction')
  const [notes, setNotes] = useState<string>('')

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pharmacy/inventory/products?per_page=500', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data.data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity || !reasonCode) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    const payload = {
      product_id: selectedProduct,
      adjustment_type: adjustmentType,
      quantity,
      reason_code: reasonCode,
      notes: notes || null
    }

    // Offline: queue for sync when back online
    if (!isOnline() && user?.id) {
      try {
        await addToSyncQueue(user.id, { type: 'inventory_adjust', payload }, 'Stock adjustment')
        toast({ title: 'Queued', description: 'Adjustment will sync when you\'re back online.' })
        window.dispatchEvent(new CustomEvent('offline-sync-queued'))
        setSelectedProduct('')
        setQuantity(1)
        setNotes('')
        onAdjustment?.()
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to queue adjustment', variant: 'destructive' })
      }
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/pharmacy/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to adjust stock')
      }

      const result = await res.json()
      toast({ 
        title: 'Success', 
        description: result.message || 'Stock adjusted successfully'
      })
      
      // Reset form
      setSelectedProduct('')
      setQuantity(1)
      setNotes('')
      
      onAdjustment?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Stock Adjustment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label>Product *</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{product.name}</span>
                    <span className="text-muted-foreground text-sm">
                      Stock: {product.current_stock || 0}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProductData && (
            <p className="text-sm text-muted-foreground">
              Current stock: <strong>{selectedProductData.current_stock || 0}</strong> units
            </p>
          )}
        </div>

        {/* Adjustment Type */}
        <div className="space-y-2">
          <Label>Adjustment Type *</Label>
          <RadioGroup
            value={adjustmentType}
            onValueChange={(v) => setAdjustmentType(v as 'add' | 'remove')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="add" id="add" />
              <Label htmlFor="add" className="flex items-center gap-1 cursor-pointer">
                <Plus className="h-4 w-4 text-green-600" />
                Add
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="remove" id="remove" />
              <Label htmlFor="remove" className="flex items-center gap-1 cursor-pointer">
                <Minus className="h-4 w-4 text-red-600" />
                Remove
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="adj_quantity">Quantity *</Label>
          <Input
            id="adj_quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label>Reason *</Label>
          <Select value={reasonCode} onValueChange={(v) => setReasonCode(v as AdjustmentReasonCode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADJUSTMENT_REASONS.map(reason => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="adj_notes">Notes (optional)</Label>
          <Textarea
            id="adj_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={saving || !selectedProduct || !quantity}
          className="w-full"
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Save Adjustment
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

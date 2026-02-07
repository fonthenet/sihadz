'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  XCircle,
  CheckCircle,
  RefreshCw,
  Send,
  Package,
  ArrowRight,
  Edit,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import type { SupplierPurchaseOrder } from '@/lib/supplier/types'
import { getStatusBadgeClassName } from '@/lib/status-colors'

interface OrderItem {
  id: string
  product_id: string
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price: number
  line_total: number
  item_status?: string
  rejection_reason?: string | null
  substitute_product_id?: string | null
  substitute_product_name?: string | null
  substitute_product_sku?: string | null
  substitute_quantity?: number | null
  substitute_unit_price?: number | null
  substitute_line_total?: number | null
  substitute_notes?: string | null
  adjusted_quantity?: number | null
  adjusted_unit_price?: number | null
  adjustment_reason?: string | null
  supplier_item_notes?: string | null
  product?: { id: string; name: string; sku?: string }
}

interface SupplierOrderDetailSheetProps {
  order: SupplierPurchaseOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SupplierOrderDetailSheet({
  order,
  open,
  onOpenChange,
  onSuccess,
}: SupplierOrderDetailSheetProps) {
  const { toast } = useToast()
  const [orderData, setOrderData] = useState<SupplierPurchaseOrder | null>(order)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; unit_price: number }[]>([])
  const [substituteItem, setSubstituteItem] = useState<OrderItem | null>(null)
  const [adjustItem, setAdjustItem] = useState<OrderItem | null>(null)
  const [rejectItem, setRejectItem] = useState<OrderItem | null>(null)
  const [noteItem, setNoteItem] = useState<OrderItem | null>(null)
  const [substituteForm, setSubstituteForm] = useState({
    product_id: '',
    quantity: '',
    unit_price: '',
    notes: '',
  })
  const [adjustForm, setAdjustForm] = useState({
    quantity: '',
    unit_price: '',
    reason: '',
  })
  const [rejectReason, setRejectReason] = useState('')
  const [noteText, setNoteText] = useState('')
  const [changesSummary, setChangesSummary] = useState('')

  useEffect(() => {
    if (open && order?.id) {
      setOrderData(order)
      setSendForReviewSuccess(false)
      fetch(`/api/supplier/orders?order_id=${order.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.id) setOrderData(d)
          else if (d.data?.length) {
            const o = d.data.find((x: { id: string }) => x.id === order.id)
            if (o) setOrderData(o)
          }
        })
    }
  }, [open, order?.id])

  useEffect(() => {
    if (open && order) {
      fetch('/api/supplier/products?limit=500')
        .then((r) => r.json())
        .then((d) => setProducts(d.data || []))
    }
  }, [open, order?.id])

  const items = (orderData?.items || []) as OrderItem[]
  const canEdit = orderData?.status === 'submitted' || orderData?.status === 'pending_buyer_review'
  const hasChanges = items.some(
    (i) =>
      ['rejected', 'substitution_offered', 'quantity_adjusted', 'price_adjusted'].includes(
        i.item_status || ''
      )
  )

  async function callItemAction(
    action: string,
    itemId: string,
    data?: Record<string, unknown>
  ) {
    if (!order?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/supplier/orders/${order.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, item_id: itemId, ...data }),
      })
      const result = await res.json()
      if (res.ok) {
        setOrderData(result)
        toast({ title: 'Success', description: 'Item updated' })
        setSubstituteItem(null)
        setAdjustItem(null)
        setRejectItem(null)
        setNoteItem(null)
      } else {
        throw new Error(result.error || 'Failed')
      }
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const [sendForReviewSuccess, setSendForReviewSuccess] = useState(false)
  const [sendingForReview, setSendingForReview] = useState(false)

  async function sendForReview() {
    if (!order?.id) return
    setSendingForReview(true)
    setSendForReviewSuccess(false)
    try {
      const res = await fetch(`/api/supplier/orders/${order.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_for_review',
          changes_summary: changesSummary || undefined,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        setOrderData(result)
        setSendForReviewSuccess(true)
        toast({ title: 'Sent for review', description: 'The pharmacy will be notified to review your changes.' })
        onSuccess()
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        throw new Error(result.error || 'Failed')
      }
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to send',
        variant: 'destructive',
      })
    } finally {
      setSendingForReview(false)
    }
  }

  function openSubstitute(item: OrderItem) {
    setSubstituteItem(item)
    setSubstituteForm({
      product_id: '',
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      notes: '',
    })
  }

  function submitSubstitute() {
    if (!substituteItem || !substituteForm.product_id || !substituteForm.quantity || !substituteForm.unit_price)
      return
    const prod = products.find((p) => p.id === substituteForm.product_id)
    if (!prod) return
    callItemAction('substitute', substituteItem.id, {
      substitute_product_id: substituteForm.product_id,
      substitute_quantity: parseInt(substituteForm.quantity, 10),
      substitute_unit_price: parseFloat(substituteForm.unit_price),
      substitute_notes: substituteForm.notes || undefined,
    })
  }

  function openAdjust(item: OrderItem) {
    setAdjustItem(item)
    setAdjustForm({
      quantity: String(item.adjusted_quantity ?? item.quantity),
      unit_price: String(item.adjusted_unit_price ?? item.unit_price),
      reason: item.adjustment_reason || '',
    })
  }

  function submitAdjust() {
    if (!adjustItem) return
    const qty = adjustForm.quantity ? parseInt(adjustForm.quantity, 10) : null
    const price = adjustForm.unit_price ? parseFloat(adjustForm.unit_price) : null
    if (qty == null && price == null) return
    callItemAction('adjust', adjustItem.id, {
      adjusted_quantity: qty,
      adjusted_unit_price: price,
      adjustment_reason: adjustForm.reason || undefined,
    })
  }

  function submitReject() {
    if (!rejectItem) return
    callItemAction('reject', rejectItem.id, {
      rejection_reason: rejectReason || 'Item rejected by supplier',
    })
    setRejectReason('')
  }

  function submitNote() {
    if (!noteItem) return
    callItemAction('add_note', noteItem.id, { notes: noteText })
    setNoteText('')
  }

  if (!order) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Order {order.order_number}</SheetTitle>
            <SheetDescription>
              {order.buyer?.business_name} • {order.created_at && new Date(order.created_at).toLocaleDateString()}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                className={cn(
                  'capitalize',
                  orderData?.status === 'submitted' && 'bg-blue-100 text-blue-700',
                  orderData?.status === 'pending_buyer_review' && 'bg-amber-100 text-amber-700',
                  orderData?.status === 'confirmed' && 'bg-green-100 text-green-700'
                )}
              >
                {orderData?.status?.replace(/_/g, ' ')}
              </Badge>
              <p className="text-xl font-bold">{orderData?.total?.toLocaleString()} DZD</p>
            </div>

            {orderData?.status === 'pending_buyer_review' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-200">Awaiting buyer review</p>
                <p className="text-muted-foreground mt-1">Your changes have been sent to the pharmacy. They will approve or reject.</p>
                {orderData.review_requested_at && (
                  <p className="text-xs text-muted-foreground mt-2">Sent on {new Date(orderData.review_requested_at).toLocaleString()}</p>
                )}
              </div>
            )}
            {orderData?.supplier_changes_summary && (
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Changes summary</p>
                <p className="text-muted-foreground mt-1">{orderData.supplier_changes_summary}</p>
              </div>
            )}

            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-3">
                {items.map((item) => {
                  const status = item.item_status || 'pending'
                  const isRejected = status === 'rejected' || status === 'substitution_rejected'
                  const isSubstitution = status === 'substitution_offered'
                  const isAdjusted = status === 'quantity_adjusted' || status === 'price_adjusted'

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-lg border p-4',
                        isRejected && 'bg-red-50 dark:bg-red-950/20 border-red-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {item.product_name || item.product?.name || 'Product'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.product_sku || item.product?.sku || 'N/A'} •{' '}
                            {item.quantity} × {item.unit_price?.toLocaleString()} DZD
                          </p>
                          {isRejected && item.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">{item.rejection_reason}</p>
                          )}
                          {isSubstitution && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-amber-700">
                              <ArrowRight className="h-4 w-4" />
                              <span>
                                Substitute: {item.substitute_product_name} ×{' '}
                                {item.substitute_quantity} @{' '}
                                {item.substitute_unit_price?.toLocaleString()} DZD
                                {item.substitute_notes && ` — ${item.substitute_notes}`}
                              </span>
                            </div>
                          )}
                          {isAdjusted && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                              <Edit className="h-4 w-4" />
                              <span>
                                Adjusted: {item.adjusted_quantity ?? item.quantity} ×{' '}
                                {(item.adjusted_unit_price ?? item.unit_price)?.toLocaleString()} DZD
                                {item.adjustment_reason && ` — ${item.adjustment_reason}`}
                              </span>
                            </div>
                          )}
                          {item.supplier_item_notes && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {item.supplier_item_notes}
                            </p>
                          )}
                        </div>
                        <Badge className={cn('shrink-0', getStatusBadgeClassName(status, 'solid'))}>
                          {status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {canEdit && !isRejected && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {status === 'pending' || status === 'accepted' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => callItemAction('accept', item.id)}
                                disabled={loading}
                              >
                                <CheckCircle className="h-4 w-4 me-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                  setRejectItem(item)
                                  setRejectReason('')
                                }}
                              >
                                <XCircle className="h-4 w-4 me-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSubstitute(item)}
                              >
                                <Package className="h-4 w-4 me-1" />
                                Substitute
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAdjust(item)}
                              >
                                <Edit className="h-4 w-4 me-1" />
                                Adjust
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSubstitute(item)}
                              >
                                Change Substitute
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAdjust(item)}
                              >
                                Change Adjust
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNoteItem(item)
                              setNoteText(item.supplier_item_notes || '')
                            }}
                          >
                            <MessageSquare className="h-4 w-4 me-1" />
                            Note
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {canEdit && hasChanges && ['submitted', 'pending_buyer_review'].includes(orderData?.status || '') && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Changes summary (optional)</Label>
                <Textarea
                  placeholder="Brief summary of modifications for the buyer..."
                  value={changesSummary}
                  onChange={(e) => setChangesSummary(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>

          <SheetFooter className="mt-6 flex flex-wrap gap-2">
            {canEdit && hasChanges && ['submitted', 'pending_buyer_review'].includes(orderData?.status || '') && (
              <Button
                onClick={sendForReview}
                disabled={loading || sendingForReview}
                className={sendForReviewSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {sendingForReview ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    Sending...
                  </>
                ) : sendForReviewSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 me-2" />
                    Sent
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 me-2" />
                    Send for Buyer Review
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Substitute Dialog */}
      <Dialog open={!!substituteItem} onOpenChange={() => setSubstituteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offer Substitute</DialogTitle>
            <DialogDescription>
              Replace &quot;{substituteItem?.product_name}&quot; with another product from your catalog
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={substituteForm.product_id}
                onValueChange={(v) => {
                  const p = products.find((x) => x.id === v)
                  setSubstituteForm((f) => ({
                    ...f,
                    product_id: v,
                    unit_price: p ? String(p.unit_price) : f.unit_price,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.id !== substituteItem?.product_id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku || 'N/A'}) — {p.unit_price?.toLocaleString()} DZD
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={substituteForm.quantity}
                  onChange={(e) => setSubstituteForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (DZD)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={substituteForm.unit_price}
                  onChange={(e) => setSubstituteForm((f) => ({ ...f, unit_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Equivalent product, same therapeutic effect"
                value={substituteForm.notes}
                onChange={(e) => setSubstituteForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubstituteItem(null)}>
              Cancel
            </Button>
            <Button onClick={submitSubstitute} disabled={!substituteForm.product_id || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Offer Substitute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Quantity / Price</DialogTitle>
            <DialogDescription>
              Modify quantity or unit price for &quot;{adjustItem?.product_name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (DZD)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={adjustForm.unit_price}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, unit_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g. Stock constraint, price update"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>
              Cancel
            </Button>
            <Button onClick={submitAdjust} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectItem} onOpenChange={() => setRejectItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Item</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting &quot;{rejectItem?.product_name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g. Out of stock, discontinued"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={!!noteItem} onOpenChange={() => setNoteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Internal note for &quot;{noteItem?.product_name}&quot; (visible to buyer)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Will ship in 2 days"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteItem(null)}>
              Cancel
            </Button>
            <Button onClick={submitNote} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

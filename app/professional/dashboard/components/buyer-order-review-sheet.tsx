'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle,
  XCircle,
  Package,
  ArrowRight,
  Edit,
  Loader2,
} from 'lucide-react'
import type { SupplierPurchaseOrder } from '@/lib/supplier/types'

interface OrderItem {
  id: string
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price: number
  line_total: number
  item_status?: string
  rejection_reason?: string | null
  substitute_product_name?: string | null
  substitute_quantity?: number | null
  substitute_unit_price?: number | null
  substitute_line_total?: number | null
  substitute_notes?: string | null
  adjusted_quantity?: number | null
  adjusted_unit_price?: number | null
  adjustment_reason?: string | null
}

interface BuyerOrderReviewSheetProps {
  order: SupplierPurchaseOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (orderId: string, itemDecisions?: Record<string, 'accept' | 'reject'>) => Promise<void>
  onReject: (orderId: string, reason?: string) => Promise<void>
  loading?: boolean
}

export function BuyerOrderReviewSheet({
  order,
  open,
  onOpenChange,
  onApprove,
  onReject,
  loading = false,
}: BuyerOrderReviewSheetProps) {
  const { toast } = useToast()
  const [rejectReason, setRejectReason] = useState('')
  const [substitutionDecisions, setSubstitutionDecisions] = useState<Record<string, 'accept' | 'reject'>>({})
  const [isApproving, setIsApproving] = useState(false)

  const items = (order?.items || []) as OrderItem[]
  const substitutionItems = items.filter((i) => i.item_status === 'substitution_offered')
  const hasSubstitutions = substitutionItems.length > 0
  const isBusy = loading || isApproving

  function setAllSubstitutions(decision: 'accept' | 'reject') {
    const next: Record<string, 'accept' | 'reject'> = {}
    substitutionItems.forEach((i) => { next[i.id] = decision })
    setSubstitutionDecisions(next)
  }

  async function handleApprove() {
    if (!order?.id) return
    setIsApproving(true)
    try {
      await onApprove(order.id, substitutionDecisions)
      onOpenChange(false)
      setSubstitutionDecisions({})
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    if (!order?.id) return
    await onReject(order.id, rejectReason)
    onOpenChange(false)
    setRejectReason('')
  }

  if (!order) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Review Supplier Changes</SheetTitle>
          <SheetDescription>
            Order {order.order_number} from {order.supplier?.business_name}. The supplier has modified items. Review each change and approve or reject.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {order.supplier_changes_summary && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Supplier summary</p>
              <p className="text-muted-foreground mt-1">{order.supplier_changes_summary}</p>
            </div>
          )}
          {hasSubstitutions && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAllSubstitutions('accept')}>
                Accept all substitutions
              </Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => setAllSubstitutions('reject')}>
                Reject all substitutions
              </Button>
            </div>
          )}

          <ScrollArea className="h-[45vh] pr-4">
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
                          {item.product_name || 'Product'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.product_sku || 'N/A'} • {item.quantity} × {item.unit_price?.toLocaleString()} DZD
                        </p>
                        {isRejected && item.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                            <XCircle className="h-4 w-4 shrink-0" />
                            Rejected: {item.rejection_reason}
                          </p>
                        )}
                        {isSubstitution && (
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm text-amber-700">
                              <ArrowRight className="h-4 w-4 shrink-0" />
                              <span>
                                Substitute: {item.substitute_product_name} × {item.substitute_quantity} @{' '}
                                {item.substitute_unit_price?.toLocaleString()} DZD
                                {item.substitute_notes && ` — ${item.substitute_notes}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant={substitutionDecisions[item.id] === 'accept' ? 'default' : 'outline'}
                                onClick={() =>
                                  setSubstitutionDecisions((d) => ({ ...d, [item.id]: 'accept' }))
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant={substitutionDecisions[item.id] === 'reject' ? 'destructive' : 'outline'}
                                onClick={() =>
                                  setSubstitutionDecisions((d) => ({ ...d, [item.id]: 'reject' }))
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                        {isAdjusted && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                            <Edit className="h-4 w-4 shrink-0" />
                            <span>
                              Adjusted: {item.adjusted_quantity ?? item.quantity} ×{' '}
                              {(item.adjusted_unit_price ?? item.unit_price)?.toLocaleString()} DZD
                              {item.adjustment_reason && ` — ${item.adjustment_reason}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          'shrink-0 capitalize',
                          isRejected && 'bg-red-100 text-red-700',
                          isSubstitution && 'bg-amber-100 text-amber-700',
                          isAdjusted && 'bg-blue-100 text-blue-700',
                          status === 'accepted' && 'bg-green-100 text-green-700',
                          status === 'pending' && 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-lg font-bold">{order.total?.toLocaleString()} DZD</p>
          </div>
        </div>

        <SheetFooter className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={handleApprove}
            disabled={isBusy}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 me-2" />
            )}
            Approve Changes
          </Button>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Textarea
              placeholder="Reason for rejecting (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-w-[200px]"
              rows={1}
            />
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isBusy}
            >
              {loading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <XCircle className="h-4 w-4 me-2" />}
              Reject Changes
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

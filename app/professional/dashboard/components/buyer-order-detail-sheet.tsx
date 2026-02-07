'use client'

import { useLanguage } from '@/lib/i18n/language-context'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  FileText,
  Edit,
  ArrowRight,
  XCircle,
  CheckCircle,
  PackageCheck,
  CircleDollarSign,
  Loader2,
} from 'lucide-react'
import type { SupplierPurchaseOrder } from '@/lib/supplier/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  substitution_offered: 'bg-amber-100 text-amber-700',
  substitution_accepted: 'bg-green-100 text-green-700',
  substitution_rejected: 'bg-red-100 text-red-700',
  quantity_adjusted: 'bg-blue-100 text-blue-700',
  price_adjusted: 'bg-blue-100 text-blue-700',
}

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

interface BuyerOrderDetailSheetProps {
  order: SupplierPurchaseOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReview?: (order: SupplierPurchaseOrder) => void
  onConfirmDelivery?: (orderId: string) => Promise<void>
  onMarkPaid?: (orderId: string) => Promise<void>
  loading?: boolean
}

export function BuyerOrderDetailSheet({
  order,
  open,
  onOpenChange,
  onReview,
  onConfirmDelivery,
  onMarkPaid,
  loading = false,
}: BuyerOrderDetailSheetProps) {
  const { language } = useLanguage()
  const items = (order?.items || []) as OrderItem[]

  const l = {
    viewDetails: language === 'ar' ? 'تفاصيل الطلب' : language === 'fr' ? 'Détails de la commande' : 'Order Details',
    supplier: language === 'ar' ? 'المورد' : language === 'fr' ? 'Fournisseur' : 'Supplier',
    items: language === 'ar' ? 'العناصر' : language === 'fr' ? 'Articles' : 'Items',
    subtotal: language === 'ar' ? 'المجموع الفرعي' : language === 'fr' ? 'Sous-total' : 'Subtotal',
    shipping: language === 'ar' ? 'الشحن' : language === 'fr' ? 'Livraison' : 'Shipping',
    total: language === 'ar' ? 'المجموع' : language === 'fr' ? 'Total' : 'Total',
    expectedDelivery: language === 'ar' ? 'التسليم المتوقع' : language === 'fr' ? 'Livraison prévue' : 'Expected delivery',
    tracking: language === 'ar' ? 'تتبع' : language === 'fr' ? 'Suivi' : 'Tracking',
    deliveryAddress: language === 'ar' ? 'عنوان التسليم' : language === 'fr' ? 'Adresse de livraison' : 'Delivery address',
    buyerNotes: language === 'ar' ? 'ملاحظاتك' : language === 'fr' ? 'Vos notes' : 'Your notes',
    supplierNotes: language === 'ar' ? 'ملاحظات المورد' : language === 'fr' ? 'Notes fournisseur' : 'Supplier notes',
    review: language === 'ar' ? 'مراجعة' : language === 'fr' ? 'Réviser' : 'Review',
    confirmDelivery: language === 'ar' ? 'تأكيد الاستلام' : language === 'fr' ? 'Confirmer réception' : 'Confirm delivery',
    markPaid: language === 'ar' ? 'تم الدفع' : language === 'fr' ? 'Marquer payé' : 'Mark paid',
    close: language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close',
    dzd: 'DZD',
  }

  if (!order) return null

  const canReview = order.status === 'pending_buyer_review' && onReview
  const canConfirmDelivery = order.status === 'shipped' && onConfirmDelivery
  const canMarkPaid = ['delivered', 'completed', 'shipped'].includes(order.status) && !order.paid_at && onMarkPaid

  async function handleConfirmDelivery() {
    if (order?.id && onConfirmDelivery) await onConfirmDelivery(order.id)
  }

  async function handleMarkPaid() {
    if (order?.id && onMarkPaid) await onMarkPaid(order.id)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{order.order_number}</SheetTitle>
          <SheetDescription>
            {order.supplier?.business_name} • {order.created_at && new Date(order.created_at).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Status & Total */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge className={cn(
              'capitalize',
              order.status === 'pending_buyer_review' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              order.status === 'submitted' && 'bg-blue-100 text-blue-700',
              order.status === 'confirmed' && 'bg-emerald-100 text-emerald-700',
              order.status === 'shipped' && 'bg-purple-100 text-purple-700',
              order.status === 'delivered' && 'bg-green-100 text-green-700',
              order.status === 'rejected' && 'bg-red-100 text-red-700'
            )}>
              {order.status === 'pending_buyer_review'
                ? (language === 'ar' ? 'تحتاج مراجعة' : language === 'fr' ? 'À réviser' : 'Needs Review')
                : order.status.replace(/_/g, ' ')}
            </Badge>
            <p className="text-xl font-bold">{order.total?.toLocaleString()} {l.dzd}</p>
          </div>

          {/* Supplier changes summary */}
          {order.supplier_changes_summary && order.status === 'pending_buyer_review' && (
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {language === 'ar' ? 'ملخص تغييرات المورد' : language === 'fr' ? 'Résumé des modifications' : 'Supplier changes summary'}
              </p>
              <p className="text-muted-foreground mt-1">{order.supplier_changes_summary}</p>
            </div>
          )}

          {/* Delivery info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {order.expected_delivery_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{l.expectedDelivery}: {new Date(order.expected_delivery_date).toLocaleDateString()}</span>
              </div>
            )}
            {order.tracking_number && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span>{l.tracking}: {order.tracking_number}</span>
              </div>
            )}
            {order.delivery_address && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{l.deliveryAddress}: {order.delivery_address}</span>
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              {l.items} ({items.length})
            </h4>
            <ScrollArea className="h-[40vh] pr-4">
              <div className="space-y-3">
                {items.map((item) => {
                  const status = item.item_status ?? 'pending'
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
                          <p className="font-medium">{item.product_name || 'Product'}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.product_sku || 'N/A'} • {item.quantity} × {item.unit_price?.toLocaleString()} {l.dzd}
                          </p>
                          {isRejected && item.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                              <XCircle className="h-4 w-4 shrink-0" />
                              {item.rejection_reason}
                            </p>
                          )}
                          {isSubstitution && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                              <ArrowRight className="h-4 w-4 shrink-0" />
                              <span>
                                {language === 'ar' ? 'بديل' : language === 'fr' ? 'Substitut' : 'Substitute'}: {item.substitute_product_name} × {item.substitute_quantity} @ {item.substitute_unit_price?.toLocaleString()} {l.dzd}
                                {item.substitute_notes && ` — ${item.substitute_notes}`}
                              </span>
                            </div>
                          )}
                          {isAdjusted && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                              <Edit className="h-4 w-4 shrink-0" />
                              <span>
                                {language === 'ar' ? 'معدّل' : language === 'fr' ? 'Ajusté' : 'Adjusted'}: {item.adjusted_quantity ?? item.quantity} × {(item.adjusted_unit_price ?? item.unit_price)?.toLocaleString()} {l.dzd}
                                {item.adjustment_reason && ` — ${item.adjustment_reason}`}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-end shrink-0">
                          <p className="font-medium">
                            {(item.substitute_line_total ?? item.line_total)?.toLocaleString()} {l.dzd}
                          </p>
                          <Badge className={cn('mt-1', STATUS_COLORS[status] || 'bg-slate-100')}>
                            {status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Totals */}
          <div className="space-y-1 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>{l.subtotal}</span>
              <span>{order.subtotal?.toLocaleString()} {l.dzd}</span>
            </div>
            {(order.shipping_cost ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span>{l.shipping}</span>
                <span>{order.shipping_cost?.toLocaleString()} {l.dzd}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2">
              <span>{l.total}</span>
              <span>{order.total?.toLocaleString()} {l.dzd}</span>
            </div>
          </div>

          {/* Notes */}
          {(order.buyer_notes || order.supplier_notes) && (
            <div className="space-y-2 text-sm">
              {order.buyer_notes && (
                <div>
                  <p className="font-medium text-muted-foreground">{l.buyerNotes}</p>
                  <p className="mt-1">{order.buyer_notes}</p>
                </div>
              )}
              {order.supplier_notes && (
                <div>
                  <p className="font-medium text-muted-foreground">{l.supplierNotes}</p>
                  <p className="mt-1">{order.supplier_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 flex flex-wrap gap-2">
          {canReview && (
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => { onReview(order); onOpenChange(false) }}
              disabled={loading}
            >
              <Edit className="h-4 w-4 me-2" />
              {l.review}
            </Button>
          )}
          {canConfirmDelivery && (
            <Button onClick={handleConfirmDelivery} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <PackageCheck className="h-4 w-4 me-2" />}
              {l.confirmDelivery}
            </Button>
          )}
          {canMarkPaid && (
            <Button variant="outline" onClick={handleMarkPaid} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <CircleDollarSign className="h-4 w-4 me-2" />}
              {l.markPaid}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {l.close}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

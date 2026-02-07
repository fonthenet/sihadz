'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Store,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import type { StorefrontOrder, OrderStatus } from '@/lib/storefront/types'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { getStatusBadgeClassName } from '@/lib/status-colors'

const STATUS_CONFIG: Record<OrderStatus, { label: string; labelFr: string; labelAr: string; icon: any }> = {
  pending: { label: 'Pending', labelFr: 'En attente', labelAr: 'قيد الانتظار', icon: Clock },
  confirmed: { label: 'Confirmed', labelFr: 'Confirmée', labelAr: 'مؤكد', icon: CheckCircle },
  preparing: { label: 'Preparing', labelFr: 'En préparation', labelAr: 'قيد التحضير', icon: Package },
  ready: { label: 'Ready', labelFr: 'Prête', labelAr: 'جاهز', icon: CheckCircle },
  completed: { label: 'Completed', labelFr: 'Terminée', labelAr: 'مكتمل', icon: CheckCircle },
  cancelled: { label: 'Cancelled', labelFr: 'Annulée', labelAr: 'ملغي', icon: XCircle },
}

const labels = {
  title: { en: 'My Orders', fr: 'Mes Commandes', ar: 'طلباتي' },
  subtitle: { en: 'Track your store orders', fr: 'Suivez vos commandes', ar: 'تتبع طلباتك' },
  active: { en: 'Active', fr: 'Actives', ar: 'نشطة' },
  history: { en: 'History', fr: 'Historique', ar: 'السجل' },
  noOrders: { en: 'No orders yet', fr: 'Aucune commande', ar: 'لا توجد طلبات بعد' },
  noOrdersDesc: { en: 'Your orders will appear here when you make a purchase', fr: 'Vos commandes apparaîtront ici', ar: 'ستظهر طلباتك هنا عند إجراء عملية شراء' },
  browseStores: { en: 'Browse Stores', fr: 'Parcourir les magasins', ar: 'تصفح المتاجر' },
  items: { en: 'items', fr: 'articles', ar: 'منتجات' },
  viewDetails: { en: 'View Details', fr: 'Voir les détails', ar: 'عرض التفاصيل' },
  cancelOrder: { en: 'Cancel Order', fr: 'Annuler la commande', ar: 'إلغاء الطلب' },
  subtotal: { en: 'Subtotal', fr: 'Sous-total', ar: 'المجموع الفرعي' },
  delivery: { en: 'Delivery', fr: 'Livraison', ar: 'التوصيل' },
  total: { en: 'Total', fr: 'Total', ar: 'المجموع' },
  payAtPickup: { en: 'Pay at pickup', fr: 'Payer au retrait', ar: 'الدفع عند الاستلام' },
  paidOnline: { en: 'Paid online', fr: 'Payé en ligne', ar: 'تم الدفع عبر الإنترنت' },
  refresh: { en: 'Refresh', fr: 'Actualiser', ar: 'تحديث' },
  orderPlaced: { en: 'Order placed', fr: 'Commande passée', ar: 'تم تقديم الطلب' },
}

export default function CustomerOrdersPage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const t = (key: keyof typeof labels) => labels[key][language] || labels[key].en

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<StorefrontOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('active')
  
  // Dialog state
  const [selectedOrder, setSelectedOrder] = useState<StorefrontOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter === 'active'
        ? 'pending,confirmed,preparing,ready'
        : 'completed,cancelled'

      const res = await fetch(`/api/storefront/orders/my?page=${page}&status=${statusParam}`)
      const data = await res.json()

      if (res.ok) {
        setOrders(data.orders || [])
        setTotal(data.total || 0)
        setTotalPages(data.total_pages || 1)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleCancelOrder = async () => {
    if (!selectedOrder) return

    setCancelling(true)
    try {
      const res = await fetch(`/api/storefront/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: 'Cancelled by customer',
        }),
      })

      if (res.ok) {
        toast({
          title: 'Order cancelled',
          description: `Order ${selectedOrder.order_number} has been cancelled`,
        })
        setSelectedOrder(null)
        fetchOrders()
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      language === 'fr' ? 'fr-DZ' : language === 'ar' ? 'ar-DZ' : 'en-US',
      {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }
    )
  }

  const getStatusLabel = (status: OrderStatus) => {
    const config = STATUS_CONFIG[status]
    return language === 'fr' ? config.labelFr : language === 'ar' ? config.labelAr : config.label
  }

  return (
    <DashboardPageWrapper
      maxWidth="lg"
      headerActions={
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 me-1.5 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      }
      showHeader={false}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 tracking-tight">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading} className="w-fit">
          <RefreshCw className={`h-4 w-4 me-1.5 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="active">{t('active')}</TabsTrigger>
          <TabsTrigger value="history">{t('history')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : orders.length === 0 ? (
        <Card className="rounded-none sm:rounded-xl border-dashed">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('noOrders')}</h3>
            <p className="text-muted-foreground mb-4">{t('noOrdersDesc')}</p>
            <Button asChild>
              <Link href="/pharmacies">
                <Store className="h-4 w-4 mr-2" />
                {t('browseStores')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status]
            const StatusIcon = statusConfig.icon

            return (
              <Card
                key={order.id}
                className="rounded-none sm:rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-sm">{order.order_number}</span>
                        <Badge className={getStatusBadgeClassName(order.status, 'solid')}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{order.professional?.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length || 0} {t('items')} • {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{order.total.toLocaleString()} DZD</p>
                      <p className="text-xs text-muted-foreground">
                        {order.payment_method === 'cash' ? t('payAtPickup') : t('paidOnline')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedOrder.order_number}
                  <Badge className={getStatusBadgeClassName(selectedOrder.status, 'solid')}>
                    {getStatusLabel(selectedOrder.status)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {t('orderPlaced')} {formatDate(selectedOrder.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Store Info */}
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{selectedOrder.professional?.business_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {selectedOrder.professional?.address_line1}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedOrder.professional?.phone}
                  </p>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span className="font-medium">{item.total.toLocaleString()} DZD</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span>{selectedOrder.subtotal.toLocaleString()} DZD</span>
                  </div>
                  {selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span>{t('delivery')}</span>
                      <span>{selectedOrder.delivery_fee.toLocaleString()} DZD</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base">
                    <span>{t('total')}</span>
                    <span>{selectedOrder.total.toLocaleString()} DZD</span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {selectedOrder.payment_method === 'cash' ? t('payAtPickup') : t('paidOnline')}
                  </Badge>
                </div>
              </div>

              <DialogFooter>
                {selectedOrder.status === 'pending' && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                  >
                    {cancelling && <LoadingSpinner size="sm" className="me-2" />}
                    {t('cancelOrder')}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardPageWrapper>
  )
}

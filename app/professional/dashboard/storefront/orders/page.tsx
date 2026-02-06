'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import type { StorefrontOrder, OrderStatus } from '@/lib/storefront/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-700', icon: Package },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
  cancelled: null,
}

export default function StorefrontOrdersPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<StorefrontOrder[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending,confirmed,preparing,ready')
  const [search, setSearch] = useState('')
  
  // Dialog
  const [selectedOrder, setSelectedOrder] = useState<StorefrontOrder | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      })
      const res = await fetch(`/api/storefront/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setStats(data.stats || {})
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/storefront/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Order updated',
          description: `Order marked as ${STATUS_CONFIG[newStatus].label}`,
        })
        fetchOrders()
        setSelectedOrder(null)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-DZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const activeCount = (stats.pending || 0) + (stats.confirmed || 0) + (stats.preparing || 0) + (stats.ready || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/professional/dashboard/storefront">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-muted-foreground">{activeCount} active orders</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => { setStatusFilter(v); setPage(1) }}
      >
        <TabsList>
          <TabsTrigger value="pending,confirmed,preparing,ready">
            Active
            {activeCount > 0 && <Badge className="ml-1" variant="secondary">{activeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {stats.pending > 0 && <Badge className="ml-1" variant="destructive">{stats.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="pl-9"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                Orders will appear here when customers place them
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order, index) => {
            const statusConfig = STATUS_CONFIG[order.status]
            const StatusIcon = statusConfig.icon
            const nextStatus = NEXT_STATUS[order.status]

            return (
              <Card
                key={order.id}
                className={cn(
                  "hover:border-primary/50 transition-colors cursor-pointer",
                  index % 2 === 1 && "bg-slate-50/80 dark:bg-slate-800/30"
                )}
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium">{order.order_number}</span>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {order.fulfillment_type === 'delivery' && (
                          <Badge variant="outline">Delivery</Badge>
                        )}
                      </div>
                      <p className="text-sm">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length || 0} items • {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{order.total.toLocaleString()} DZD</p>
                      <p className="text-xs text-muted-foreground">
                        {order.payment_method === 'cash' ? 'Pay at pickup' : 'Paid online'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action */}
                  {nextStatus && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          updateOrderStatus(order.id, nextStatus)
                        }}
                        disabled={updating}
                      >
                        Mark as {STATUS_CONFIG[nextStatus].label}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedOrder.order_number}
                  <Badge className={STATUS_CONFIG[selectedOrder.status].color}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Placed {formatDate(selectedOrder.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Customer</h4>
                  <div className="text-sm space-y-1">
                    <p>{selectedOrder.customer_name}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selectedOrder.customer_phone}
                    </p>
                    {selectedOrder.delivery_address && (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {selectedOrder.delivery_address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-medium">{item.total.toLocaleString()} DZD</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{selectedOrder.subtotal.toLocaleString()} DZD</span>
                  </div>
                  {selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span>{selectedOrder.delivery_fee.toLocaleString()} DZD</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{selectedOrder.total.toLocaleString()} DZD</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {selectedOrder.payment_method === 'cash' ? 'Cash on pickup' : 'Online'} - {selectedOrder.payment_status}
                  </Badge>
                </div>

                {/* Notes */}
                {selectedOrder.customer_notes && (
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Customer Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer_notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedOrder.status === 'pending' && (
                  <Button
                    variant="destructive"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    disabled={updating}
                  >
                    Cancel Order
                  </Button>
                )}
                {NEXT_STATUS[selectedOrder.status] && (
                  <Button
                    onClick={() => updateOrderStatus(selectedOrder.id, NEXT_STATUS[selectedOrder.status]!)}
                    disabled={updating}
                  >
                    {updating && <LoadingSpinner size="sm" className="me-2" />}
                    Mark as {STATUS_CONFIG[NEXT_STATUS[selectedOrder.status]!].label}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

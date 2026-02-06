'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Store,
  Package,
  ShoppingCart,
  Settings,
  Plus,
  Eye,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import type { StorefrontSettings, StorefrontProduct, StorefrontOrder } from '@/lib/storefront/types'

export default function StorefrontOverviewPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Partial<StorefrontSettings> | null>(null)
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [orders, setOrders] = useState<StorefrontOrder[]>([])
  const [orderStats, setOrderStats] = useState<Record<string, number>>({})
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch settings
      const settingsRes = await fetch('/api/storefront/settings')
      const settingsData = await settingsRes.json()
      setSettings(settingsData.settings)

      // Fetch products
      const productsRes = await fetch('/api/storefront/products?per_page=5')
      const productsData = await productsRes.json()
      setProducts(productsData.products || [])

      // Fetch recent orders
      const ordersRes = await fetch('/api/storefront/orders?per_page=5')
      const ordersData = await ordersRes.json()
      setOrders(ordersData.orders || [])
      setOrderStats(ordersData.stats || {})
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStorefront = async () => {
    setEnabling(true)
    try {
      const res = await fetch('/api/storefront/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !settings?.is_enabled }),
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
        toast({
          title: data.settings.is_enabled ? 'Storefront enabled' : 'Storefront disabled',
          description: data.settings.is_enabled
            ? 'Your online store is now visible to customers'
            : 'Your online store is now hidden',
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setEnabling(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'confirmed': return 'bg-blue-100 text-blue-700'
      case 'preparing': return 'bg-purple-100 text-purple-700'
      case 'ready': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-gray-100 text-gray-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  const pendingOrders = orderStats.pending || 0
  const activeProducts = products.filter(p => p.is_available).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6" />
            Online Store
          </h1>
          <p className="text-muted-foreground">
            Manage your online storefront, products, and orders
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Store is</span>
            <Switch
              checked={settings?.is_enabled || false}
              onCheckedChange={toggleStorefront}
              disabled={enabling}
            />
            <Badge variant={settings?.is_enabled ? 'default' : 'secondary'}>
              {settings?.is_enabled ? 'Live' : 'Offline'}
            </Badge>
          </div>
          {settings?.is_enabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/pharmacies/${settings.professional_id}/shop`} target="_blank">
                <Eye className="h-4 w-4 mr-1" />
                View Store
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-xs text-muted-foreground">{activeProducts} active</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className={pendingOrders > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Need confirmation</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready for Pickup</p>
                <p className="text-2xl font-bold">{orderStats.ready || 0}</p>
                <p className="text-xs text-muted-foreground">Awaiting customer</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{orderStats.completed || 0}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/professional/dashboard/storefront/products">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </CardTitle>
              <CardDescription>Manage your product catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1">
                Manage <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/professional/dashboard/storefront/orders">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Orders
                {pendingOrders > 0 && (
                  <Badge variant="destructive" className="ml-auto">{pendingOrders}</Badge>
                )}
              </CardTitle>
              <CardDescription>View and manage customer orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1">
                View Orders <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/professional/dashboard/storefront/settings">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </CardTitle>
              <CardDescription>Store settings, fulfillment, payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1">
                Configure <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/professional/dashboard/storefront/orders">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.slice(0, 5).map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    <span className="font-medium text-sm">{order.total.toLocaleString()} DZD</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">
              Add products to your store to start selling online
            </p>
            <Button asChild>
              <Link href="/professional/dashboard/storefront/products">
                <Plus className="h-4 w-4 mr-1" />
                Add Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

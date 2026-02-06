'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Boxes,
  History,
  Plus,
  RefreshCw,
  Truck,
  AlertCircle,
  Clock,
  Settings,
  Database
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import ProductCatalog from './product-catalog'
import StockLevels from './stock-levels'
import StockAdjustment from './stock-adjustment'
import ExpiryManagement from './expiry-management'
import TransactionHistory from './transaction-history'
import SupplierManagement from './supplier-management'
import IntegrationsPanel from './integrations-panel'
import NationalImport from './national-import'

interface InventoryStats {
  total_products: number
  active_products: number
  total_stock_value: number
  low_stock_count: number
  out_of_stock_count: number
  expiring_soon_count: number
  expired_count: number
  total_suppliers: number
}

interface TransactionSummary {
  purchases_count: number
  purchases_value: number
  sales_count: number
  sales_value: number
  adjustments_count: number
}

export default function InventoryDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [transactions30d, setTransactions30d] = useState<TransactionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/stats', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data.stats)
      setTransactions30d(data.transactions_30d)
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: 'Error',
        description: 'Failed to load statistics',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  const renderStatsCards = () => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (!stats) return null

    const n = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? v : 0)
    const lowStock = n(stats.low_stock_count)
    const outOfStock = n(stats.out_of_stock_count)
    const expiredCount = n(stats.expired_count)
    const expiringSoon = n(stats.expiring_soon_count)

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{n(stats.active_products)}</p>
                <p className="text-xs text-muted-foreground">of {n(stats.total_products)} total</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold">{formatPrice(n(stats.total_stock_value))}</p>
                <p className="text-xs text-muted-foreground">{n(stats.total_suppliers)} suppliers</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={lowStock + outOfStock > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Alerts</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-orange-600">{lowStock + outOfStock}</p>
                  {outOfStock > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {outOfStock} out of stock
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{lowStock} low stock</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={expiredCount > 0 ? 'border-red-200 bg-red-50/50' : expiringSoon > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiry</p>
                <div className="flex items-baseline gap-2">
                  {expiredCount > 0 ? (
                    <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600">{expiringSoon}</p>
                  )}
                  {expiredCount > 0 && (
                    <Badge variant="destructive" className="text-xs">EXPIRED</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {expiringSoon} expiring in 30d
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderActivitySummary = () => {
    if (!transactions30d) return null

    const n = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? v : 0)
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Last 30 Days Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">+{n(transactions30d.purchases_count)}</p>
              <p className="text-xs text-muted-foreground">Receipts</p>
              <p className="text-xs font-medium">{formatPrice(n(transactions30d.purchases_value))}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{n(transactions30d.sales_count)}</p>
              <p className="text-xs text-muted-foreground">Sales</p>
              <p className="text-xs font-medium">{formatPrice(n(transactions30d.sales_value))}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{n(transactions30d.adjustments_count)}</p>
              <p className="text-xs text-muted-foreground">Adjustments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your products, stock and suppliers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setActiveTab('products')}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <Boxes className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs sm:text-sm">
            <Package className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Products
          </TabsTrigger>
          <TabsTrigger value="import" className="text-xs sm:text-sm">
            <Database className="h-4 w-4 mr-1.5 hidden sm:inline" />
            National DB
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs sm:text-sm">
            <Boxes className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="expiry" className="text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Expiry
            {stats && (stats.expired_count + stats.expiring_soon_count) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {stats.expired_count + stats.expiring_soon_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs sm:text-sm">
            <Truck className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <History className="h-4 w-4 mr-1.5 hidden sm:inline" />
            History
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">
            <Settings className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {renderActivitySummary()}
            
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('import')}>
                  <Database className="h-4 w-4 mr-2" />
                  Import from National DB
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('stock')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Receive Stock
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('stock')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Adjust Stock
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('products')}>
                  <Package className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Preview */}
          {stats && (stats.low_stock_count + stats.out_of_stock_count + stats.expired_count + stats.expiring_soon_count) > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Active Alerts
                  </CardTitle>
                  <Button variant="link" size="sm" onClick={() => setActiveTab('expiry')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.out_of_stock_count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="destructive">Out of Stock</Badge>
                      <span>{stats.out_of_stock_count} product(s) out of stock</span>
                    </div>
                  )}
                  {stats.low_stock_count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-orange-500">Low Stock</Badge>
                      <span>{stats.low_stock_count} product(s) low on stock</span>
                    </div>
                  )}
                  {stats.expired_count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="destructive">Expired</Badge>
                      <span>{stats.expired_count} batch(es) expired - remove from stock</span>
                    </div>
                  )}
                  {stats.expiring_soon_count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-yellow-500">Expiring</Badge>
                      <span>{stats.expiring_soon_count} batch(es) expiring within 30 days</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ProductCatalog onProductChange={fetchStats} />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <NationalImport onImportComplete={() => {
            fetchStats()
            setActiveTab('products')
          }} />
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <StockLevels onStockChange={fetchStats} />
            <StockAdjustment onAdjustment={fetchStats} />
          </div>
        </TabsContent>

        <TabsContent value="expiry" className="mt-6">
          <ExpiryManagement />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <SupplierManagement />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <TransactionHistory />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

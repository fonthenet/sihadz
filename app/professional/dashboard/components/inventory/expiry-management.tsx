'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  AlertCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { formatDate } from '@/lib/inventory/calculations'

interface Alert {
  id: string
  product_id: string
  inventory_id?: string
  product_name: string
  product_barcode?: string
  batch_number?: string
  alert_type: string
  severity: string
  message: string
  expiry_date?: string
  quantity?: number
  days_until_expiry?: number
  current_quantity?: number
  min_stock_level?: number
}

interface AlertSummary {
  total: number
  critical: number
  warning: number
  out_of_stock: number
  low_stock: number
  expired: number
  expiring_7: number
  expiring_30: number
}

export default function ExpiryManagement() {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/alerts', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch alerts')
      const data = await res.json()
      setAlerts(data.alerts || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      toast({ title: 'Error', description: 'Failed to load alerts', variant: 'destructive' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAlerts()
  }

  const getAlertIcon = (alertType: string, severity: string) => {
    if (alertType === 'expired' || severity === 'critical') {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    if (alertType.startsWith('expiring')) {
      return <Clock className="h-5 w-5 text-orange-500" />
    }
    if (alertType === 'low_stock' || alertType === 'out_of_stock') {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />
  }

  const getAlertBadge = (alertType: string, severity: string) => {
    if (alertType === 'expired') {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (alertType === 'out_of_stock') {
      return <Badge variant="destructive">Out of Stock</Badge>
    }
    if (alertType === 'expiring_7') {
      return <Badge className="bg-red-500">Expires in 7d</Badge>
    }
    if (alertType === 'expiring_30') {
      return <Badge className="bg-orange-500">Expires in 30d</Badge>
    }
    if (alertType === 'low_stock') {
      return <Badge className="bg-orange-500">Low Stock</Badge>
    }
    return <Badge variant="secondary">{alertType}</Badge>
  }

  const filterAlerts = (type: string) => {
    if (type === 'all') return alerts
    if (type === 'expiry') {
      return alerts.filter(a => ['expired', 'expiring_7', 'expiring_30'].includes(a.alert_type))
    }
    if (type === 'stock') {
      return alerts.filter(a => ['out_of_stock', 'low_stock'].includes(a.alert_type))
    }
    return alerts.filter(a => a.alert_type === type)
  }

  const renderAlertCard = (alert: Alert) => (
    <div 
      key={alert.id}
      className={`p-4 rounded-lg border ${
        alert.severity === 'critical' 
          ? 'bg-red-50 border-red-200' 
          : alert.severity === 'warning'
          ? 'bg-orange-50 border-orange-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {getAlertIcon(alert.alert_type, alert.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{alert.product_name}</p>
            {getAlertBadge(alert.alert_type, alert.severity)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {alert.batch_number && <span>Batch: {alert.batch_number}</span>}
            {alert.quantity !== undefined && <span>Qty: {alert.quantity}</span>}
            {alert.expiry_date && <span>Exp: {formatDate(alert.expiry_date)}</span>}
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
return (
    <Card>
      <CardHeader>
        <CardTitle>Expiry Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerts & Expiry
            </CardTitle>
            <CardDescription>
              {summary?.total || 0} active alert(s)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summary && summary.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {summary.expired > 0 && (
              <div className="p-3 rounded-lg bg-red-100 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.expired}</p>
                <p className="text-xs text-red-700">Expired</p>
              </div>
            )}
            {summary.out_of_stock > 0 && (
              <div className="p-3 rounded-lg bg-red-100 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.out_of_stock}</p>
                <p className="text-xs text-red-700">Out of Stock</p>
              </div>
            )}
            {summary.expiring_7 > 0 && (
              <div className="p-3 rounded-lg bg-orange-100 text-center">
                <p className="text-2xl font-bold text-orange-600">{summary.expiring_7}</p>
                <p className="text-xs text-orange-700">Exp. 7d</p>
              </div>
            )}
            {summary.expiring_30 > 0 && (
              <div className="p-3 rounded-lg bg-yellow-100 text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.expiring_30}</p>
                <p className="text-xs text-yellow-700">Exp. 30d</p>
              </div>
            )}
            {summary.low_stock > 0 && (
              <div className="p-3 rounded-lg bg-orange-100 text-center">
                <p className="text-2xl font-bold text-orange-600">{summary.low_stock}</p>
                <p className="text-xs text-orange-700">Low Stock</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All
              {summary && summary.total > 0 && (
                <Badge variant="secondary" className="ml-1.5">{summary.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expiry">
              Expiry
              {summary && (summary.expired + summary.expiring_7 + summary.expiring_30) > 0 && (
                <Badge variant="destructive" className="ml-1.5">
                  {summary.expired + summary.expiring_7 + summary.expiring_30}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stock">
              Stock
              {summary && (summary.out_of_stock + summary.low_stock) > 0 && (
                <Badge className="ml-1.5 bg-orange-500">
                  {summary.out_of_stock + summary.low_stock}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filterAlerts(activeTab).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No alerts in this category</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterAlerts(activeTab).map(alert => renderAlertCard(alert))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

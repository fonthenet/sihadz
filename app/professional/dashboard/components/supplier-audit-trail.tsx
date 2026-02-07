'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Search, Download, RefreshCw, Calendar, Filter,
  ShoppingCart, Package, CreditCard, FileText, Box, Link as LinkIcon,
  Warehouse, Settings, Building2, List, ChevronRight, ChevronDown,
  Clock, User, ArrowUpRight, ArrowDownRight, TrendingUp, Activity,
  DollarSign, BarChart3, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type AuditLogEntry,
  type AuditSummary,
  type AuditEntityType,
  type AuditAction,
  fetchAuditLogs,
  fetchAuditSummary,
  exportAuditLogs,
  formatAuditAction,
  formatEntityType,
  getActionColor,
} from '@/lib/supplier/audit'

interface SupplierAuditTrailProps {
  supplierId: string
  supplierName: string
}

const ENTITY_ICONS: Record<AuditEntityType, typeof ShoppingCart> = {
  order: ShoppingCart,
  order_item: Package,
  payment: CreditCard,
  invoice: FileText,
  product: Box,
  buyer_link: LinkIcon,
  inventory: Warehouse,
  settings: Settings,
  warehouse: Building2,
  catalog: List,
}

export function SupplierAuditTrail({ supplierId, supplierName }: SupplierAuditTrailProps) {
  // State
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [entityType, setEntityType] = useState<AuditEntityType | 'all'>('all')
  const [action, setAction] = useState<AuditAction | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [summaryPeriod, setSummaryPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  
  // UI State
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'summary'>('logs')

  // Load audit logs
  const loadLogs = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoading(true)
    try {
      const result = await fetchAuditLogs({
        page: pageNum,
        limit: 50,
        entity_type: entityType,
        action: action,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
      })
      
      if (append) {
        setLogs(prev => [...prev, ...result.data])
      } else {
        setLogs(result.data)
      }
      setTotal(result.total)
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [entityType, action, dateFrom, dateTo, search])

  // Load summary
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const result = await fetchAuditSummary({
        period: summaryPeriod,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setSummary(result)
    } catch (error) {
      console.error('Failed to load audit summary:', error)
    } finally {
      setLoadingSummary(false)
    }
  }, [summaryPeriod, dateFrom, dateTo])

  // Initial load
  useEffect(() => {
    loadLogs(1)
    loadSummary()
  }, [])

  // Reload when filters change
  useEffect(() => {
    loadLogs(1)
  }, [entityType, action, dateFrom, dateTo, search])

  useEffect(() => {
    loadSummary()
  }, [summaryPeriod, dateFrom, dateTo])

  // Handle export
  const handleExport = (format: 'csv' | 'json') => {
    const url = exportAuditLogs({
      format,
      entity_type: entityType,
      action: action,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Audit Trail</h2>
          <p className="text-muted-foreground">
            Complete history of all changes for accounting and compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 me-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 me-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'logs' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('logs')}
        >
          <Activity className="h-4 w-4 me-2" />
          Activity Log
        </Button>
        <Button
          variant={activeTab === 'summary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('summary')}
        >
          <BarChart3 className="h-4 w-4 me-2" />
          Summary Report
        </Button>
      </div>

      {activeTab === 'summary' ? (
        // Summary View
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select value={summaryPeriod} onValueChange={(v) => setSummaryPeriod(v as typeof summaryPeriod)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadSummary}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {loadingSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : summary ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{summary.total_events}</p>
                        <p className="text-sm text-muted-foreground">Total Events</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          +{summary.financial.total_credits.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Credits (DZD)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <ShoppingCart className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{summary.orders_created}</p>
                        <p className="text-sm text-muted-foreground">Orders Created</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{summary.payments_received}</p>
                        <p className="text-sm text-muted-foreground">Payments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* By Entity Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Events by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(summary.by_entity_type)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => {
                          const Icon = ENTITY_ICONS[type as AuditEntityType] || FileText
                          return (
                            <div key={type} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{formatEntityType(type as AuditEntityType)}</span>
                              </div>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* By Action */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Events by Action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(summary.by_action)
                        .sort((a, b) => b[1] - a[1])
                        .map(([act, count]) => (
                          <div key={act} className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm px-2 py-0.5 rounded",
                              getActionColor(act as AuditAction)
                            )}>
                              {formatAuditAction(act as AuditAction)}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        +{summary.financial.total_credits.toLocaleString()} DZD
                      </p>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        -{summary.financial.total_debits.toLocaleString()} DZD
                      </p>
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                    </div>
                    <div>
                      <p className={cn(
                        "text-2xl font-bold",
                        summary.financial.net_change >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {summary.financial.net_change >= 0 ? '+' : ''}{summary.financial.net_change.toLocaleString()} DZD
                      </p>
                      <p className="text-sm text-muted-foreground">Net Change</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : (
        // Activity Log View
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Search */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>

                {/* Entity Type */}
                <Select value={entityType} onValueChange={(v) => setEntityType(v as AuditEntityType | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="order">Orders</SelectItem>
                    <SelectItem value="invoice">Invoices</SelectItem>
                    <SelectItem value="product">Products</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                  </SelectContent>
                </Select>

                {/* Action */}
                <Select value={action} onValueChange={(v) => setAction(v as AuditAction | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Created</SelectItem>
                    <SelectItem value="update">Updated</SelectItem>
                    <SelectItem value="status_change">Status Changed</SelectItem>
                    <SelectItem value="payment_marked">Payment Marked</SelectItem>
                    <SelectItem value="shipment">Shipped</SelectItem>
                    <SelectItem value="delivery">Delivered</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date From */}
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-[150px]"
                  placeholder="From"
                />

                {/* Date To */}
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-[150px]"
                  placeholder="To"
                />

                <Button variant="outline" onClick={() => loadLogs(1)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Results count */}
              <p className="text-sm text-muted-foreground mt-3">
                {total.toLocaleString()} event{total !== 1 ? 's' : ''} found
              </p>
            </CardContent>
          </Card>

          {/* Logs List */}
          {loading && logs.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No audit events found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const Icon = ENTITY_ICONS[log.entity_type] || FileText
                const date = new Date(log.created_at)
                
                return (
                  <Card 
                    key={log.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedLog(log)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn(
                          "p-2 rounded-lg",
                          getActionColor(log.action)
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{log.action_label || formatAuditAction(log.action)}</p>
                            <Badge variant="outline" className="text-xs">
                              {formatEntityType(log.entity_type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.actor_name || 'System'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {date.toLocaleDateString()} {date.toLocaleTimeString()}
                            </span>
                            {log.entity_ref && (
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                {log.entity_ref}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount Change */}
                        {log.amount_change != null && log.amount_change !== 0 && (
                          <div className={cn(
                            "text-end font-medium",
                            log.amount_change > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {log.amount_change > 0 ? '+' : ''}{log.amount_change.toLocaleString()} DZD
                          </div>
                        )}

                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => loadLogs(page + 1, true)}
                    disabled={loading}
                  >
                    {loading ? <RefreshCw className="h-4 w-4 me-2 animate-spin" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Audit Event Details</SheetTitle>
          </SheetHeader>
          
          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* Action Badge */}
              <div className="flex items-center gap-3">
                <Badge className={cn("text-sm", getActionColor(selectedLog.action))}>
                  {formatAuditAction(selectedLog.action)}
                </Badge>
                <Badge variant="outline">
                  {formatEntityType(selectedLog.entity_type)}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <p className="text-lg font-medium">{selectedLog.action_label}</p>
                {selectedLog.entity_ref && (
                  <p className="text-sm text-muted-foreground font-mono">{selectedLog.entity_ref}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actor</span>
                  <span>{selectedLog.actor_name || 'System'} ({selectedLog.actor_type})</span>
                </div>
                {selectedLog.amount_change != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Change</span>
                    <span className={selectedLog.amount_change > 0 ? "text-green-600" : "text-red-600"}>
                      {selectedLog.amount_change > 0 ? '+' : ''}{selectedLog.amount_change.toLocaleString()} DZD
                    </span>
                  </div>
                )}
                {selectedLog.notes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notes</span>
                    <span>{selectedLog.notes}</span>
                  </div>
                )}
              </div>

              {/* Changed Fields */}
              {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Changed Fields</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedLog.changed_fields.map(field => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Old/New Values */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="space-y-3">
                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 text-red-600">Previous Values</p>
                      <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded-lg overflow-auto">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 text-green-600">New Values</p>
                      <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-3 rounded-lg overflow-auto">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

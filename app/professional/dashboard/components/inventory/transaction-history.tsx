'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  History,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import type { InventoryTransaction, TransactionType } from '@/lib/inventory/types'

const TRANSACTION_LABELS: Record<TransactionType, { label: string; color: string }> = {
  purchase: { label: 'Purchase', color: 'bg-green-500' },
  sale: { label: 'Sale', color: 'bg-blue-500' },
  prescription: { label: 'Prescription', color: 'bg-blue-400' },
  adjustment_add: { label: 'Adjustment +', color: 'bg-green-400' },
  adjustment_remove: { label: 'Adjustment -', color: 'bg-orange-500' },
  return_supplier: { label: 'Return to Supplier', color: 'bg-purple-500' },
  return_customer: { label: 'Customer Return', color: 'bg-purple-400' },
  expired: { label: 'Expired', color: 'bg-red-500' },
  damage: { label: 'Damage', color: 'bg-red-400' },
  transfer_in: { label: 'Transfer In', color: 'bg-teal-500' },
  transfer_out: { label: 'Transfer Out', color: 'bg-teal-400' }
}

export default function TransactionHistory() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20'
      })
      
      if (typeFilter) params.set('type', typeFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(`/api/pharmacy/inventory/transactions?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch transactions')
      
      const data = await res.json()
      setTransactions(data.data || [])
      setTotalPages(data.total_pages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({ title: 'Error', description: 'Failed to load history', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, dateFrom, dateTo, toast])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const clearFilters = () => {
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters = typeFilter || dateFrom || dateTo

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('fr-DZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Movement History
            <Badge variant="secondary">{total}</Badge>
          </CardTitle>
          <Button 
            variant={showFilters ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
            {hasActiveFilters && <Badge className="ml-1.5 h-5 w-5 p-0 justify-center">!</Badge>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg mb-4">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter || "_all"} onValueChange={(v) => { setTypeFilter(v === "_all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {Object.entries(TRANSACTION_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="w-40"
              />
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No movements recorded</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => {
                  const typeInfo = TRANSACTION_LABELS[tx.transaction_type] || { label: tx.transaction_type, color: 'bg-gray-500' }
                  const isPositive = tx.quantity_change > 0
                  
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.product?.name || 'Unknown product'}</p>
                          {tx.batch_number && (
                            <p className="text-xs text-muted-foreground">Batch: {tx.batch_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${typeInfo.color} text-white text-xs`}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {isPositive ? '+' : ''}{tx.quantity_change}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tx.quantity_before} → {tx.quantity_after}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {tx.total_value ? formatPrice(tx.total_value) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.notes || tx.reason_code || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} movements)
            </p>
            <div className="flex gap-1">
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
      </CardContent>
    </Card>
  )
}

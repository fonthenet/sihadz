'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Receipt,
  Printer,
  RefreshCw,
  Ban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import { useScanHandler } from '@/lib/scanner'
import type { POSSale } from '@/lib/pos/types'
import { LoadingSpinner } from '@/components/ui/page-loading'

export default function OrdersSection() {
  const { toast } = useToast()
  const [sales, setSales] = useState<POSSale[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 20
  const [search, setSearch] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('completed')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.toISOString().slice(0, 10)
  })
  const [selectedSale, setSelectedSale] = useState<POSSale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [voidingId, setVoidingId] = useState<string | null>(null)

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        date_from: dateFrom,
        date_to: `${dateTo}T23:59:59`,
      })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (searchApplied.trim()) params.set('search', searchApplied.trim())

      const res = await fetch(`/api/pharmacy/pos/sales?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSales(data.data || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Error fetching sales:', err)
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, dateFrom, dateTo, statusFilter, searchApplied, toast])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchApplied(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const { onKeyDown: searchScanKeyDown } = useScanHandler({
    context: 'receipts',
    value: search,
    onScan: (value) => {
      setSearch(value)
      setSearchApplied(value)
      setPage(1)
    },
    existingOnKeyDown: (e) => {
      if (e.key === 'Enter') {
        setSearchApplied(search)
        setPage(1)
      }
    },
  })

  const handlePrintReceipt = (sale: POSSale) => {
    setSelectedSale(sale)
    setShowReceipt(true)
  }

  const printReceipt = () => {
    const sale = selectedSale
    if (!sale) return

    const itemRows = (sale.items || [])
      .map(
        (i) =>
          `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${formatPrice(i.unit_price)}</td><td>${formatPrice(i.line_total || i.unit_price * i.quantity)}</td></tr>`
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Receipt #${sale.sale_number}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 4px; text-align: left; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .border-t { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="text-center border-b">
            <p class="font-bold">PHARMACY RECEIPT</p>
            <p>Receipt #${sale.sale_number}</p>
            <p>${new Date(sale.created_at).toLocaleString()}</p>
            ${sale.customer_name ? `<p>Customer: ${sale.customer_name}</p>` : ''}
          </div>
          <table>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            ${itemRows}
          </table>
          <div class="border-t">
            <p>Subtotal: ${formatPrice(sale.subtotal)}</p>
            ${sale.discount_amount > 0 ? `<p>Discount: -${formatPrice(sale.discount_amount)}</p>` : ''}
            <p class="font-bold">TOTAL: ${formatPrice(sale.total_amount)}</p>
          </div>
          <div class="text-center border-t">
            <p>Thank you!</p>
            <p>Served by: ${sale.created_by_name || 'Staff'}</p>
          </div>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.print()
    }
  }

  const handleVoid = async (sale: POSSale) => {
    if (sale.status !== 'completed') return
    const reason = prompt('Void reason (required):')
    if (!reason?.trim()) {
      toast({ title: 'Cancelled', description: 'Void reason is required' })
      return
    }

    setVoidingId(sale.id)
    try {
      const res = await fetch(`/api/pharmacy/pos/sales/${sale.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Sale voided', description: data.message })
        setShowReceipt(false)
        setSelectedSale(null)
        fetchSales()
      } else {
        toast({ title: 'Error', description: data.error || 'Void failed', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to void sale', variant: 'destructive' })
    } finally {
      setVoidingId(null)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sales History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            View, reprint, and manage completed sales. Use filters to find specific orders.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scan or search receipt #, customer, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={searchScanKeyDown}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="w-[140px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchSales} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" className="text-muted-foreground" />
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-50" />
                <p>No sales found for this period</p>
                <p className="text-sm">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono font-medium">{sale.sale_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sale.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                        <TableCell className="text-right">
                          {sale.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(sale.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sale.status === 'completed'
                                ? 'default'
                                : sale.status === 'voided'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePrintReceipt(sale)}
                              title="View / Reprint"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {sale.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleVoid(sale)}
                                disabled={voidingId === sale.id}
                                title="Void sale"
                              >
                                {voidingId === sale.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Receipt #{selectedSale?.sale_number}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="text-center border-b pb-3 text-sm">
                <p className="font-bold">PHARMACY RECEIPT</p>
                <p className="text-muted-foreground">
                  {new Date(selectedSale.created_at).toLocaleString()}
                </p>
                {selectedSale.customer_name && (
                  <p>Customer: {selectedSale.customer_name}</p>
                )}
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-2 text-sm">
                  {selectedSale.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <div>
                        <p>{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.line_total || item.unit_price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t pt-3 text-sm">
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL</span>
                  <span>{formatPrice(selectedSale.total_amount)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={printReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                {selectedSale.status === 'completed' && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleVoid(selectedSale)}
                    disabled={voidingId === selectedSale.id}
                  >
                    {voidingId === selectedSale.id ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Ban className="h-4 w-4 mr-2" />
                    )}
                    Void
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

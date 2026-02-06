'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Wallet,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ShoppingCart
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import type { CashDrawer, CashDrawerSession } from '@/lib/pos/types'

interface CashManagementProps {
  onSessionOpened?: () => void
  onSessionClosed?: () => void
  compact?: boolean
}

export default function CashManagement({ onSessionOpened, onSessionClosed, compact = false }: CashManagementProps) {
  const { toast } = useToast()
  
  const [drawers, setDrawers] = useState<(CashDrawer & { current_session?: any })[]>([])
  const [sessions, setSessions] = useState<CashDrawerSession[]>([])
  const [loading, setLoading] = useState(true)
  
  // Open session dialog
  const [showOpenSession, setShowOpenSession] = useState(false)
  const [selectedDrawer, setSelectedDrawer] = useState<string>('')
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [openingNotes, setOpeningNotes] = useState('')
  const [opening, setOpening] = useState(false)
  
  // Close session dialog
  const [showCloseSession, setShowCloseSession] = useState(false)
  const [sessionToClose, setSessionToClose] = useState<CashDrawerSession | null>(null)
  const [sessionSales, setSessionSales] = useState<any[]>([])
  const [loadingSessionSales, setLoadingSessionSales] = useState(false)
  const [countedCash, setCountedCash] = useState<number>(0)
  const [countedCards, setCountedCards] = useState<number>(0)
  const [varianceNotes, setVarianceNotes] = useState('')
  const [closing, setClosing] = useState(false)
  
  // Close result popup (prominent display after closing session)
  const [showCloseResult, setShowCloseResult] = useState(false)
  const [closeResultVariance, setCloseResultVariance] = useState<number | null>(null)

  // Create drawer dialog
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [drawerName, setDrawerName] = useState('')
  const [drawerCode, setDrawerCode] = useState('')
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [drawersRes, sessionsRes] = await Promise.all([
        fetch('/api/pharmacy/pos/drawers'),
        fetch('/api/pharmacy/pos/sessions?limit=50')
      ])
      
      if (drawersRes.ok) {
        const data = await drawersRes.json()
        setDrawers(data.drawers || [])
      }
      
      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Keyboard shortcut: Ctrl+Enter to open session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        const hasOpenSession = drawers.some(d => d.current_session)
        if (!hasOpenSession) {
          setShowOpenSession(true)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawers])

  // Fetch session sales when Close Session dialog opens
  useEffect(() => {
    if (!showCloseSession || !sessionToClose?.id) {
      setSessionSales([])
      return
    }
    setLoadingSessionSales(true)
    fetch(`/api/pharmacy/pos/sales?session_id=${sessionToClose.id}&status=completed&per_page=200`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => setSessionSales(data.data || []))
      .catch(() => setSessionSales([]))
      .finally(() => setLoadingSessionSales(false))
  }, [showCloseSession, sessionToClose?.id])

  // Auto-select main (first available) drawer when opening session dialog
  useEffect(() => {
    if (showOpenSession && drawers.length > 0) {
      const available = drawers.filter(d => !d.current_session)
      const mainDrawer = available.find(d =>
        /main|principal|default/i.test(d.name) || /main|principal|default/i.test(d.code)
      ) ?? available[0]
      if (mainDrawer) {
        setSelectedDrawer(mainDrawer.id)
      }
    }
  }, [showOpenSession, drawers])

  const handleOpenSession = async () => {
    if (!selectedDrawer) {
      toast({ title: 'Error', description: 'Select a drawer', variant: 'destructive' })
      return
    }

    setOpening(true)
    try {
      const res = await fetch('/api/pharmacy/pos/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawer_id: selectedDrawer,
          opening_balance: openingBalance,
          opening_notes: openingNotes
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: data.message })
        setShowOpenSession(false)
        setSelectedDrawer('')
        setOpeningBalance(0)
        setOpeningNotes('')
        loadData()
        onSessionOpened?.()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setOpening(false)
    }
  }

  const handleCloseSession = async () => {
    if (!sessionToClose) return

    setClosing(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sessions?id=${sessionToClose.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counted_cash: countedCash,
          counted_cards: countedCards,
          variance_notes: varianceNotes
        })
      })

      const data = await res.json()
      if (res.ok) {
        setShowCloseSession(false)
        setSessionToClose(null)
        setCountedCash(0)
        setCountedCards(0)
        setVarianceNotes('')
        loadData()
        const variance = data.summary?.variance ?? 0
        setCloseResultVariance(variance)
        setShowCloseResult(true)
        onSessionClosed?.()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }

  const handleCreateDrawer = async () => {
    if (!drawerName || !drawerCode) {
      toast({ title: 'Error', description: 'Name and code required', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/pharmacy/pos/drawers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: drawerName, code: drawerCode })
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: data.message })
        setShowCreateDrawer(false)
        setDrawerName('')
        setDrawerCode('')
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const openSession = drawers.find(d => d.current_session)?.current_session
  const selectedDrawerObj = drawers.find(d => d.id === selectedDrawer)
  const lastClosedForDrawer = selectedDrawer
    ? sessions
        .filter(s => s.drawer_id === selectedDrawer && s.status === 'closed')
        .sort((a, b) => new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime())[0]
    : null

  const QUICK_AMOUNTS_OPEN = [0, 500, 1000, 2000, 5000, 10000, 20000]
  const QUICK_AMOUNTS_CLOSE = [0, 1000, 5000, 10000, 20000, 50000]

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={openSession ? 'border-green-500' : 'border-orange-500'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {openSession ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-orange-500" />}
              Session Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openSession ? (
              <div>
                <p className="text-2xl font-bold text-green-600">Open</p>
                <p className="text-sm text-muted-foreground">{openSession.session_number}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Opened by {openSession.opened_by_name}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-orange-600">Closed</p>
                <p className="text-sm text-muted-foreground">No active session</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cash Drawers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{drawers.length}</p>
            <p className="text-sm text-muted-foreground">
              {drawers.filter(d => d.current_session).length} in use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today's Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {sessions.filter(s => 
                new Date(s.opened_at).toDateString() === new Date().toDateString()
              ).length}
            </p>
            <p className="text-sm text-muted-foreground">sessions today</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {openSession ? (
          <Button 
            variant="destructive"
            onClick={() => {
              setSessionToClose(openSession)
              setShowCloseSession(true)
            }}
          >
            <Lock className="h-4 w-4 mr-2" />
            Close Session
          </Button>
        ) : (
          <Button onClick={() => setShowOpenSession(true)}>
            <Unlock className="h-4 w-4 mr-2" />
            Open Session
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowCreateDrawer(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Drawer
        </Button>
        <Button variant="ghost" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Drawers */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Drawers</CardTitle>
          <CardDescription>Manage your point of sale registers</CardDescription>
        </CardHeader>
        <CardContent>
          {drawers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No drawers configured. Add one to get started.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drawers.map(drawer => (
                <Card key={drawer.id} className={drawer.current_session ? 'border-green-200' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{drawer.name}</h4>
                        <p className="text-sm text-muted-foreground">{drawer.code}</p>
                      </div>
                      {drawer.current_session ? (
                        <Badge className="bg-green-100 text-green-700">In Use</Badge>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </div>
                    {drawer.current_session && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {drawer.current_session.session_number}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Drawer</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Cash Counted</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.slice(0, 10).map(session => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.session_number}</TableCell>
                  <TableCell>{session.drawer?.name || '-'}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{new Date(session.opened_at).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{session.opened_by_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.closed_at ? (
                      <div>
                        <p className="text-sm">{new Date(session.closed_at).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{session.closed_by_name}</p>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatPrice(session.opening_balance)}</TableCell>
                  <TableCell>{session.counted_cash !== null ? formatPrice(session.counted_cash) : '-'}</TableCell>
                  <TableCell>
                    {session.variance_cash !== null ? (
                      <span className={session.variance_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {session.variance_cash >= 0 ? '+' : ''}{formatPrice(session.variance_cash)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Open Session Dialog */}
      <Dialog open={showOpenSession} onOpenChange={(open) => {
        setShowOpenSession(open)
        if (!open) {
          setSelectedDrawer('')
          setOpeningBalance(0)
          setOpeningNotes('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Cash Drawer Session</DialogTitle>
            <DialogDescription>
              Start a new session to begin making sales
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Drawer</Label>
              <Select value={selectedDrawer} onValueChange={setSelectedDrawer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a drawer..." />
                </SelectTrigger>
                <SelectContent>
                  {drawers.filter(d => !d.current_session).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDrawerObj && (
                <p className="text-xs text-muted-foreground">
                  Opening <span className="font-medium text-foreground">{selectedDrawerObj.name}</span> ({selectedDrawerObj.code})
                </p>
              )}
            </div>

            {lastClosedForDrawer && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Last session:</span> Closed with {formatPrice(lastClosedForDrawer.counted_cash ?? lastClosedForDrawer.opening_balance)}
                {lastClosedForDrawer.variance_cash != null && lastClosedForDrawer.variance_cash !== 0 && (
                  <span className={lastClosedForDrawer.variance_cash >= 0 ? ' text-green-600' : ' text-red-600'}>
                    {' '}({lastClosedForDrawer.variance_cash >= 0 ? '+' : ''}{formatPrice(lastClosedForDrawer.variance_cash)} variance)
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Opening Balance (DZD)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_AMOUNTS_OPEN.map(amt => (
                  <Button
                    key={amt}
                    type="button"
                    variant={openingBalance === amt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOpeningBalance(amt)}
                  >
                    {amt === 0 ? '0' : formatPrice(amt)}
                  </Button>
                ))}
              </div>
              <Input
                autoFocus
                type="number"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedDrawer && !opening) {
                    e.preventDefault()
                    handleOpenSession()
                  }
                }}
                placeholder="Count cash in drawer..."
                className="focus-visible:border-green-500 focus-visible:ring-green-500/30 focus-visible:ring-[3px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Any notes for this session..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenSession(false)}>Cancel</Button>
            <Button onClick={handleOpenSession} disabled={opening || !selectedDrawer}>
              {opening ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              Open Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseSession} onOpenChange={(open) => {
        setShowCloseSession(open)
        if (!open) {
          setSessionToClose(null)
          setCountedCash(0)
          setCountedCards(0)
          setVarianceNotes('')
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" size="xl">
          <DialogHeader>
            <DialogTitle>Close Session</DialogTitle>
            <DialogDescription>
              <span>Count the cash and close {sessionToClose?.session_number}</span>
              {sessionToClose && (
                <span className="block mt-1 text-foreground font-medium">
                  {(sessionToClose.drawer?.name ?? drawers.find(d => d.id === sessionToClose.drawer_id)?.name) ?? 'Drawer'} — Opened with {formatPrice(sessionToClose.opening_balance)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Sold Products Summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Step 1 — Sold products
              </h4>
              {loadingSessionSales ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading sales...
                </div>
              ) : sessionSales.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No sales in this session.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Transactions</span>
                      <p className="font-semibold">{sessionSales.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Items sold</span>
                      <p className="font-semibold">
                        {sessionSales.reduce((sum, s) => sum + (s.items?.reduce((q: number, i: any) => q + (i.quantity || 0), 0) ?? 0), 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total revenue</span>
                      <p className="font-semibold">
                        {formatPrice(sessionSales.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected cash in drawer</span>
                      <p className="font-semibold text-green-600">
                        {formatPrice(
                          (sessionToClose?.opening_balance ?? 0) +
                          sessionSales.reduce((sum, s) => sum + ((s.paid_cash || 0) - (s.change_given || 0)), 0)
                        )}
                      </p>
                    </div>
                  </div>
                  <ScrollArea className="h-[140px] rounded border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="py-2">Product</TableHead>
                          <TableHead className="py-2 w-16">Qty</TableHead>
                          <TableHead className="py-2 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionSales.flatMap(sale =>
                          (sale.items || []).map((item: any, idx: number) => (
                            <TableRow key={`${sale.id}-${idx}`}>
                              <TableCell className="py-1.5 text-sm">{item.product_name || 'Item'}</TableCell>
                              <TableCell className="py-1.5 text-sm">{item.quantity ?? 0}</TableCell>
                              <TableCell className="py-1.5 text-sm text-right">{formatPrice(item.line_total || 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </div>

            {/* Step 2: Count Cash */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Step 2 — Count cash
              </h4>
            <div className="space-y-2">
              <Label>Cash Counted (DZD)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_AMOUNTS_CLOSE.map(amt => (
                  <Button
                    key={amt}
                    type="button"
                    variant={countedCash === amt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCountedCash(amt)}
                  >
                    {amt === 0 ? '0' : formatPrice(amt)}
                  </Button>
                ))}
              </div>
              <Input
                autoFocus
                type="number"
                value={countedCash || ''}
                onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sessionToClose && !closing) {
                    e.preventDefault()
                    handleCloseSession()
                  }
                }}
                placeholder="Total cash in drawer..."
                className="focus-visible:border-green-500 focus-visible:ring-green-500/30 focus-visible:ring-[3px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Cards (if applicable)</Label>
              <Input
                type="number"
                value={countedCards || ''}
                onChange={(e) => setCountedCards(parseFloat(e.target.value) || 0)}
                placeholder="Card receipts total..."
              />
            </div>

            <div className="space-y-2">
              <Label>Variance Notes</Label>
              <Textarea
                value={varianceNotes}
                onChange={(e) => setVarianceNotes(e.target.value)}
                placeholder="Explain any variance..."
              />
            </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseSession(false)}>Cancel</Button>
            <Button onClick={handleCloseSession} disabled={closing} variant="destructive">
              {closing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Close Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Result Popup - prominent display of variance / cash to return */}
      <Dialog open={showCloseResult} onOpenChange={(open) => setShowCloseResult(open)}>
        <DialogContent
          className="max-w-md text-center p-10 z-[100]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center font-bold">
              Session Closed
            </DialogTitle>
          </DialogHeader>
          <div
            className={`py-8 px-6 rounded-2xl border-2 shadow-lg ${
              (closeResultVariance ?? 0) > 0
                ? 'bg-green-500/15 dark:bg-green-500/25 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                : (closeResultVariance ?? 0) < 0
                  ? 'bg-red-500/15 dark:bg-red-500/25 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                  : 'bg-muted/50 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]'
            }`}
          >
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {(closeResultVariance ?? 0) > 0
                ? 'Cash to return (excess)'
                : (closeResultVariance ?? 0) < 0
                  ? 'Shortage'
                  : 'Exact match'}
            </p>
            <p
              className={`text-7xl md:text-8xl font-bold tabular-nums drop-shadow-lg ${
                (closeResultVariance ?? 0) > 0
                  ? 'text-green-600 dark:text-green-400'
                  : (closeResultVariance ?? 0) < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
              }`}
            >
              {(closeResultVariance ?? 0) >= 0 ? '+' : ''}
              {formatPrice(closeResultVariance ?? 0)}
            </p>
            <p className="text-xl font-semibold text-muted-foreground mt-3">DZD</p>
          </div>
          <DialogFooter className="justify-center">
            <Button
              size="lg"
              className="min-w-40"
              onClick={() => setShowCloseResult(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Drawer Dialog */}
      <Dialog open={showCreateDrawer} onOpenChange={setShowCreateDrawer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Drawer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder="e.g., Main Register"
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={drawerCode}
                onChange={(e) => setDrawerCode(e.target.value.toUpperCase())}
                placeholder="e.g., MAIN"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDrawer(false)}>Cancel</Button>
            <Button onClick={handleCreateDrawer} disabled={creating}>
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wallet,
  Unlock,
  Lock,
  Plus,
  History,
  Clock,
  Banknote,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import ProfessionalPOSTerminal from './professional-pos-terminal'
import { useToast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/inventory/calculations'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface CashDrawer {
  id: string
  professional_id: string
  name: string
  code: string
  is_active: boolean
  current_session?: { id: string; session_number: string; opened_at: string } | null
}

interface CashDrawerSession {
  id: string
  professional_id: string
  drawer_id: string
  session_number: string
  opened_at: string
  opened_by_name?: string
  opening_balance: number
  status: string
  drawer?: { id: string; name: string; code: string }
}

interface ProfessionalPOSUnifiedProps {
  professionalName?: string
  employeeUsername?: string | null
  /** Pre-fill from an appointment/ticket */
  appointmentId?: string | null
}

export default function ProfessionalPOSUnified({ professionalName, employeeUsername, appointmentId }: ProfessionalPOSUnifiedProps = {}) {
  const { toast } = useToast()
  const [currentSession, setCurrentSession] = useState<CashDrawerSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawers, setDrawers] = useState<CashDrawer[]>([])
  const [sessions, setSessions] = useState<CashDrawerSession[]>([])

  const [showStartShift, setShowStartShift] = useState(false)
  const [selectedDrawer, setSelectedDrawer] = useState<string>('')
  const [openingFloat, setOpeningFloat] = useState<string>('')
  const [suggestedFloat, setSuggestedFloat] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)

  const [showEndShift, setShowEndShift] = useState(false)
  const [countedCash, setCountedCash] = useState<string>('')
  const [closingNotes, setClosingNotes] = useState('')
  const [ending, setEnding] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<{
    transactions: number
    totalSales: number
    totalCash: number
    totalCard: number
    expectedCash: number
    openingBalance: number
  } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const [showCloseResult, setShowCloseResult] = useState(false)
  const [closeResult, setCloseResult] = useState<{
    variance: number
    expected: number
    counted: number
    transactions: number
    totalSales: number
  } | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [drawerName, setDrawerName] = useState('')
  const [drawerCode, setDrawerCode] = useState('')
  const [creating, setCreating] = useState(false)

  const API_BASE = '/api/professional/pos'

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, drawersRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/sessions?active_only=true`),
        fetch(`${API_BASE}/drawers`),
        fetch(`${API_BASE}/sessions?limit=10`),
      ])

      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setCurrentSession(data.current_session ?? null)
      }
      if (drawersRes.ok) {
        const data = await drawersRes.json()
        setDrawers(data.drawers || [])
        const available = (data.drawers || []).find((d: CashDrawer) => !d.current_session)
        if (available && !selectedDrawer) setSelectedDrawer(available.id)
      }
      if (historyRes.ok) {
        const data = await historyRes.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Error loading POS data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDrawer])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!selectedDrawer) {
      setSuggestedFloat(null)
      return
    }
    const lastSession = sessions.find(
      (s) => s.drawer_id === selectedDrawer && s.status === 'closed' && (s as any).counted_cash != null
    )
    if (lastSession && (lastSession as any).counted_cash) {
      setSuggestedFloat((lastSession as any).counted_cash)
      if (!openingFloat) setOpeningFloat(String((lastSession as any).counted_cash))
    } else {
      setSuggestedFloat(null)
    }
  }, [selectedDrawer, sessions])

  const handleQuickStart = async () => {
    const drawer = drawers.find((d) => !d.current_session)
    if (!drawer) {
      toast({ title: 'No drawer available', variant: 'destructive' })
      return
    }
    const lastSession = sessions.find(
      (s) => s.drawer_id === drawer.id && s.status === 'closed' && (s as any).counted_cash != null
    )
    const quickFloat = lastSession ? (lastSession as any).counted_cash : 0

    setStarting(true)
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawer_id: drawer.id,
          opening_balance: quickFloat,
          opening_notes: quickFloat > 0 ? 'Quick start with previous float' : 'Quick start',
        }),
      })
      if (res.ok) {
        setShowCloseResult(false)
        setCloseResult(null)
        loadData()
        toast({ title: 'Shift started', description: `Using ${drawer.name}` })
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setStarting(false)
    }
  }

  const handleStartShift = async () => {
    if (!selectedDrawer) {
      toast({ title: 'Select a drawer', variant: 'destructive' })
      return
    }
    setStarting(true)
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawer_id: selectedDrawer,
          opening_balance: parseFloat(openingFloat) || 0,
          opening_notes: '',
        }),
      })
      if (res.ok) {
        setShowStartShift(false)
        setOpeningFloat('')
        setShowCloseResult(false)
        setCloseResult(null)
        loadData()
        toast({ title: 'Shift started' })
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    if (!showEndShift || !currentSession?.id) {
      setSessionSummary(null)
      return
    }
    setLoadingSummary(true)
    fetch(`${API_BASE}/sales?session_id=${currentSession.id}&status=completed&per_page=500`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        const sales = data.data || []
        const totalSales = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
        const totalCash = sales.reduce(
          (sum: number, s: any) => sum + ((s.paid_cash || 0) - (s.change_given || 0)),
          0
        )
        const totalCard = sales.reduce((sum: number, s: any) => sum + (s.paid_card || 0), 0)
        const expectedCash = (currentSession.opening_balance || 0) + totalCash
        
        setSessionSummary({
          transactions: sales.length,
          totalSales,
          totalCash,
          totalCard,
          expectedCash,
          openingBalance: currentSession.opening_balance || 0,
        })
      })
      .catch(() => setSessionSummary(null))
      .finally(() => setLoadingSummary(false))
  }, [showEndShift, currentSession?.id, currentSession?.opening_balance])

  const handleEndShift = async () => {
    if (!currentSession) return
    setEnding(true)
    try {
      const res = await fetch(`${API_BASE}/sessions?id=${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counted_cash: parseFloat(countedCash) || 0,
          counted_cards: 0,
          variance_notes: closingNotes,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowEndShift(false)
        setCountedCash('')
        setClosingNotes('')
        setCloseResult({
          variance: data.summary?.variance ?? 0,
          expected: sessionSummary?.expectedCash || 0,
          counted: parseFloat(countedCash) || 0,
          transactions: sessionSummary?.transactions || 0,
          totalSales: sessionSummary?.totalSales || 0,
        })
        setShowCloseResult(true)
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setEnding(false)
    }
  }

  const handleCreateDrawer = async () => {
    if (!drawerName) {
      toast({ title: 'Enter drawer name', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const code = drawerCode || drawerName.toUpperCase().replace(/\s+/g, '_').slice(0, 10)
      const res = await fetch(`${API_BASE}/drawers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: drawerName, code }),
      })
      if (res.ok) {
        setShowCreateDrawer(false)
        setDrawerName('')
        setDrawerCode('')
        loadData()
        toast({ title: 'Drawer created' })
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const availableDrawers = drawers.filter((d) => !d.current_session)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  if (drawers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Register</CardTitle>
            <CardDescription>Create your first cash drawer to start selling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Register Name</Label>
              <Input
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder="Main Register"
                autoFocus
              />
            </div>
            <Button onClick={handleCreateDrawer} disabled={creating || !drawerName} className="w-full" size="lg">
              {creating ? <LoadingSpinner size="sm" className="me-2" /> : <Plus className="h-4 w-4 me-2" />}
              Create Register
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentSession) {
    return (
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="h-20 w-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              Welcome{employeeUsername ? ` ${employeeUsername}` : ''}, Start Your Shift
            </CardTitle>
            <CardDescription>Open a cash drawer session to begin selling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {availableDrawers.length > 0 && (
              <div className="text-center">
                <Button size="lg" onClick={handleQuickStart} disabled={starting} className="gap-2 px-8">
                  {starting ? <LoadingSpinner size="md" /> : <Unlock className="h-5 w-5" />}
                  Quick Start
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {availableDrawers[0]?.name || 'Main Register'}
                  {suggestedFloat !== null && suggestedFloat > 0 &&
                    ` • Starting with ${formatPrice(suggestedFloat)} from last shift`}
                </p>
              </div>
            )}

            {availableDrawers.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Register</Label>
                <Select value={selectedDrawer} onValueChange={setSelectedDrawer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a register..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrawers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        All registers are in use
                      </div>
                    ) : (
                      availableDrawers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cash Already in Drawer</Label>
                {suggestedFloat !== null && suggestedFloat > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                    <Banknote className="h-4 w-4 text-blue-600" />
                    <span>
                      Last shift closed with <strong>{formatPrice(suggestedFloat)}</strong>
                    </span>
                    {openingFloat !== String(suggestedFloat) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ms-auto h-6 text-blue-600"
                        onClick={() => setOpeningFloat(String(suggestedFloat))}
                      >
                        Use this
                      </Button>
                    )}
                  </div>
                )}
                <Input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="Count and enter the cash in drawer..."
                  className="text-lg"
                />
                <div className="flex gap-2">
                  {[0, 1000, 2000, 5000].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant={openingFloat === String(amt) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOpeningFloat(String(amt))}
                      className="flex-1"
                    >
                      {amt === 0 ? '0' : formatPrice(amt)}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={handleStartShift} disabled={starting || !selectedDrawer} className="w-full gap-2">
                {starting ? <LoadingSpinner size="sm" /> : <Unlock className="h-4 w-4" />}
                Start Shift
              </Button>
            </div>
          </CardContent>
        </Card>

        {sessions.length > 0 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{s.session_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.drawer?.name} • {new Date(s.opened_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={s.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => setShowCreateDrawer(true)}>
            <Plus className="h-4 w-4 me-2" />
            Add Register
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4 me-2" />
            Session History
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            {currentSession.session_number}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {currentSession.drawer?.name} • Opened {new Date(currentSession.opened_at).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEndShift(true)}>
            <Lock className="h-4 w-4 me-2" />
            End Shift
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4 me-2" />
            History
          </Button>
        </div>
      </div>

      <ProfessionalPOSTerminal
        sessionOverride={currentSession}
        professionalName={professionalName}
        employeeUsername={employeeUsername}
        appointmentId={appointmentId}
        onSaleComplete={() => loadData()}
      />

      <Dialog open={showEndShift} onOpenChange={setShowEndShift}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Shift</DialogTitle>
            <DialogDescription>Count the cash in the drawer and enter the amount</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingSummary ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : sessionSummary ? (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <p>Transactions: {sessionSummary.transactions}</p>
                <p>Total Sales: {formatPrice(sessionSummary.totalSales)}</p>
                <p>Expected Cash: {formatPrice(sessionSummary.expectedCash)}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Counted Cash</Label>
              <Input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="Enter counted amount..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Variance notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndShift(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndShift} disabled={ending}>
              {ending ? <LoadingSpinner size="sm" className="me-2" /> : <Lock className="h-4 w-4 me-2" />}
              Close Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseResult} onOpenChange={setShowCloseResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Closed</DialogTitle>
            <DialogDescription>Shift reconciliation complete</DialogDescription>
          </DialogHeader>
          {closeResult && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p>Transactions: {closeResult.transactions}</p>
                <p>Total Sales: {formatPrice(closeResult.totalSales)}</p>
                <p>Expected: {formatPrice(closeResult.expected)}</p>
                <p>Counted: {formatPrice(closeResult.counted)}</p>
                <p className={closeResult.variance >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  Variance: {closeResult.variance >= 0 ? '+' : ''}{formatPrice(closeResult.variance)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setShowCloseResult(false); loadData(); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Session History</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{s.session_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.drawer?.name} • {new Date(s.opened_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={s.status === 'open' ? 'default' : 'secondary'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showCreateDrawer} onOpenChange={setShowCreateDrawer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Register</DialogTitle>
            <DialogDescription>Create a new cash drawer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={drawerName} onChange={(e) => setDrawerName(e.target.value)} placeholder="Till 2" />
            </div>
            <div className="space-y-2">
              <Label>Code (optional)</Label>
              <Input value={drawerCode} onChange={(e) => setDrawerCode(e.target.value)} placeholder="TILL2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDrawer(false)}>Cancel</Button>
            <Button onClick={handleCreateDrawer} disabled={creating || !drawerName}>
              {creating ? <LoadingSpinner size="sm" className="me-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

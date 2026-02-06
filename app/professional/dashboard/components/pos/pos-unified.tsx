'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react'
import POSTerminal from './pos-terminal'
import { useToast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/inventory/calculations'
import type { CashDrawer, CashDrawerSession } from '@/lib/pos/types'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface POSUnifiedProps {
  professionalName?: string
  employeeUsername?: string | null
}

export default function POSUnified({ professionalName, employeeUsername }: POSUnifiedProps = {}) {
  const { toast } = useToast()
  
  // Core state
  const [currentSession, setCurrentSession] = useState<CashDrawerSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawers, setDrawers] = useState<CashDrawer[]>([])
  const [sessions, setSessions] = useState<CashDrawerSession[]>([])
  
  // Start shift state
  const [showStartShift, setShowStartShift] = useState(false)
  const [selectedDrawer, setSelectedDrawer] = useState<string>('')
  const [openingFloat, setOpeningFloat] = useState<string>('')
  const [suggestedFloat, setSuggestedFloat] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  
  // End shift state
  const [showEndShift, setShowEndShift] = useState(false)
  const [countedCash, setCountedCash] = useState<string>('')
  const [closingNotes, setClosingNotes] = useState('')
  const [ending, setEnding] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  
  // Close result
  const [showCloseResult, setShowCloseResult] = useState(false)
  const [closeResult, setCloseResult] = useState<any>(null)
  
  // History sheet
  const [showHistory, setShowHistory] = useState(false)
  
  // Create drawer
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [drawerName, setDrawerName] = useState('')
  const [drawerCode, setDrawerCode] = useState('')
  const [creating, setCreating] = useState(false)

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [sessionRes, drawersRes, historyRes] = await Promise.all([
        fetch('/api/pharmacy/pos/sessions?active_only=true'),
        fetch('/api/pharmacy/pos/drawers'),
        fetch('/api/pharmacy/pos/sessions?limit=10'),
      ])
      
      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setCurrentSession(data.current_session ?? null)
      }
      
      if (drawersRes.ok) {
        const data = await drawersRes.json()
        setDrawers(data.drawers || [])
        // Auto-select first available drawer
        const available = (data.drawers || []).find((d: CashDrawer) => !d.current_session)
        if (available && !selectedDrawer) {
          setSelectedDrawer(available.id)
        }
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

  // When drawer is selected, suggest the last session's closing balance
  useEffect(() => {
    if (!selectedDrawer) {
      setSuggestedFloat(null)
      return
    }
    // Find last closed session for this drawer
    const lastSession = sessions.find(s => 
      s.drawer_id === selectedDrawer && 
      s.status === 'closed' && 
      s.counted_cash !== null
    )
    if (lastSession?.counted_cash) {
      setSuggestedFloat(lastSession.counted_cash)
      // Auto-fill if opening float is empty
      if (!openingFloat) {
        setOpeningFloat(String(lastSession.counted_cash))
      }
    } else {
      setSuggestedFloat(null)
    }
  }, [selectedDrawer, sessions])

  // Quick start shift (one click)
  const handleQuickStart = async () => {
    const drawer = drawers.find(d => !d.current_session)
    if (!drawer) {
      toast({ title: 'No drawer available', variant: 'destructive' })
      return
    }
    // Find last closed session for this drawer to get suggested float
    const lastSession = sessions.find(s => 
      s.drawer_id === drawer.id && 
      s.status === 'closed' && 
      s.counted_cash !== null
    )
    const quickFloat = lastSession?.counted_cash || 0
    
    setStarting(true)
    try {
      const res = await fetch('/api/pharmacy/pos/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawer_id: drawer.id,
          opening_balance: quickFloat,
          opening_notes: quickFloat > 0 ? 'Quick start with previous float' : 'Quick start',
        }),
      })
      if (res.ok) {
        // Reset any close result state
        setShowCloseResult(false)
        setCloseResult(null)
        loadData()
        toast({ title: 'Shift started', description: `Using ${drawer.name}` })
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setStarting(false)
    }
  }

  // Start shift with options
  const handleStartShift = async () => {
    if (!selectedDrawer) {
      toast({ title: 'Select a drawer', variant: 'destructive' })
      return
    }
    setStarting(true)
    try {
      const res = await fetch('/api/pharmacy/pos/sessions', {
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
        // Reset any close result state
        setShowCloseResult(false)
        setCloseResult(null)
        loadData()
        toast({ title: 'Shift started' })
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setStarting(false)
    }
  }

  // Load session summary when opening end shift dialog
  useEffect(() => {
    if (!showEndShift || !currentSession?.id) {
      setSessionSummary(null)
      return
    }
    setLoadingSummary(true)
    fetch(`/api/pharmacy/pos/sales?session_id=${currentSession.id}&status=completed&per_page=500`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => {
        const sales = data.data || []
        const totalSales = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
        const totalCash = sales.reduce((sum: number, s: any) => sum + ((s.paid_cash || 0) - (s.change_given || 0)), 0)
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

  // End shift
  const handleEndShift = async () => {
    if (!currentSession) return
    setEnding(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sessions?id=${currentSession.id}`, {
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
        
        // Show result
        const variance = data.summary?.variance ?? 0
        setCloseResult({
          variance,
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setEnding(false)
    }
  }

  // Create drawer
  const handleCreateDrawer = async () => {
    if (!drawerName) {
      toast({ title: 'Enter drawer name', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const code = drawerCode || drawerName.toUpperCase().replace(/\s+/g, '_').slice(0, 10)
      const res = await fetch('/api/pharmacy/pos/drawers', {
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const availableDrawers = drawers.filter(d => !d.current_session)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  // ============================================================================
  // NO DRAWERS - First time setup
  // ============================================================================
  if (drawers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Register</CardTitle>
            <CardDescription>
              Create your first cash drawer to start selling
            </CardDescription>
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
            <Button 
              onClick={handleCreateDrawer} 
              disabled={creating || !drawerName} 
              className="w-full"
              size="lg"
            >
              {creating ? <LoadingSpinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Register
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================================
  // NO ACTIVE SESSION - Start Shift screen
  // ============================================================================
  if (!currentSession) {
    return (
      <div className="space-y-6">
        {/* Start Shift Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="h-20 w-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome{employeeUsername ? ` ${employeeUsername}` : ''}, Start Your Shift</CardTitle>
            <CardDescription>
              Open a cash drawer session to begin selling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Start */}
            {availableDrawers.length > 0 && (() => {
              const quickDrawer = availableDrawers[0]
              const lastSession = sessions.find(s => 
                s.drawer_id === quickDrawer?.id && 
                s.status === 'closed' && 
                s.counted_cash !== null
              )
              const quickFloat = lastSession?.counted_cash || 0
              
              return (
                <div className="text-center">
                  <Button 
                    size="lg" 
                    onClick={handleQuickStart}
                    disabled={starting}
                    className="gap-2 px-8"
                  >
                    {starting ? (
                      <LoadingSpinner size="md" />
                    ) : (
                      <Unlock className="h-5 w-5" />
                    )}
                    Quick Start
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    {quickDrawer?.name || 'Main Register'}
                    {quickFloat > 0 && ` • Starting with ${formatPrice(quickFloat)} from last shift`}
                  </p>
                </div>
              )
            })()}

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

            {/* Start with options */}
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
                      availableDrawers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
                    <span>Last shift closed with <strong>{formatPrice(suggestedFloat)}</strong></span>
                    {openingFloat !== String(suggestedFloat) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 text-blue-600"
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
                  {[0, 1000, 2000, 5000].map(amt => (
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
                <p className="text-xs text-muted-foreground">
                  Enter 0 if you're starting with an empty drawer
                </p>
              </div>

              <Button 
                onClick={handleStartShift}
                disabled={starting || !selectedDrawer}
                className="w-full gap-2"
              >
                {starting ? <LoadingSpinner size="sm" /> : <Unlock className="h-4 w-4" />}
                Start Shift
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
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
                {sessions.slice(0, 5).map(s => (
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{s.session_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.drawer?.name} • {new Date(s.opened_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={s.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                        {s.status}
                      </Badge>
                      {s.variance_cash !== null && s.variance_cash !== undefined && (
                        <p className={`text-xs mt-1 ${s.variance_cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {s.variance_cash >= 0 ? '+' : ''}{formatPrice(s.variance_cash)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Drawer button */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => setShowCreateDrawer(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Another Register
          </Button>
        </div>

        {/* Create Drawer Dialog */}
        <Dialog open={showCreateDrawer} onOpenChange={setShowCreateDrawer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Register</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={drawerName}
                  onChange={(e) => setDrawerName(e.target.value)}
                  placeholder="e.g., Register 2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDrawer(false)}>Cancel</Button>
              <Button onClick={handleCreateDrawer} disabled={creating || !drawerName}>
                {creating ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================================================
  // ACTIVE SESSION - POS Terminal with End Shift button
  // ============================================================================
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Shift Info Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-4">
          <Badge className="bg-green-600 hover:bg-green-700 gap-1.5">
            <Unlock className="h-3 w-3" />
            Shift Open{employeeUsername ? ` - ${employeeUsername}` : ''}
          </Badge>
          <span className="text-sm font-medium">{currentSession.drawer?.name || 'Register'}</span>
          <span className="text-sm text-muted-foreground">
            Started {new Date(currentSession.opened_at).toLocaleTimeString()}
          </span>
          {currentSession.opening_balance > 0 && (
            <span className="text-sm text-muted-foreground">
              • Float: {formatPrice(currentSession.opening_balance)}
            </span>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowEndShift(true)}
          className="gap-2 border-green-500/30 hover:bg-green-500/10"
        >
          <Lock className="h-4 w-4" />
          End Shift
        </Button>
      </div>

      {/* POS Terminal */}
      <POSTerminal 
        key={currentSession.id} 
        sessionOverride={currentSession}
        professionalName={professionalName}
        employeeUsername={employeeUsername}
      />

      {/* End Shift Dialog */}
      <Dialog open={showEndShift} onOpenChange={setShowEndShift}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              End Shift{employeeUsername ? ` - ${employeeUsername}` : ''}
            </DialogTitle>
            <DialogDescription>
              Count the cash in your drawer and close out your shift
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Session Summary */}
            {loadingSummary ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="lg" className="text-muted-foreground" />
              </div>
            ) : sessionSummary && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{sessionSummary.transactions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-medium">{formatPrice(sessionSummary.totalSales)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-sm font-medium">Expected Cash</span>
                  <span className="font-bold text-green-600">{formatPrice(sessionSummary.expectedCash)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Opening float ({formatPrice(sessionSummary.openingBalance)}) + Cash received ({formatPrice(sessionSummary.totalCash)})
                </p>
              </div>
            )}

            {/* Cash Count */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Cash in Drawer
              </Label>
              <Input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="Count and enter total..."
                className="text-lg"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Count all bills and coins in the drawer
              </p>
            </div>

            {/* Quick variance preview */}
            {countedCash && sessionSummary && (
              <div className={`p-3 rounded-lg ${
                parseFloat(countedCash) === sessionSummary.expectedCash
                  ? 'bg-green-500/10 border border-green-500/20'
                  : parseFloat(countedCash) > sessionSummary.expectedCash
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Variance</span>
                  <span className={`font-bold ${
                    parseFloat(countedCash) >= sessionSummary.expectedCash ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(countedCash) >= sessionSummary.expectedCash ? '+' : ''}
                    {formatPrice((parseFloat(countedCash) || 0) - sessionSummary.expectedCash)}
                  </span>
                </div>
              </div>
            )}

            {/* Notes (if variance) */}
            {countedCash && sessionSummary && parseFloat(countedCash) !== sessionSummary.expectedCash && (
              <div className="space-y-2">
                <Label>Explanation (optional)</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Explain the variance..."
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndShift(false)}>Cancel</Button>
            <Button 
              onClick={handleEndShift} 
              disabled={ending || !countedCash}
              variant="destructive"
              className="gap-2"
            >
              {ending ? <LoadingSpinner size="sm" /> : <Lock className="h-4 w-4" />}
              End Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Result Dialog - only show when we have valid close result data */}
      <Dialog open={showCloseResult && closeResult !== null} onOpenChange={setShowCloseResult}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Shift Complete</DialogTitle>
          </DialogHeader>
          
          {closeResult && (
            <div className="py-6 space-y-6">
              {/* Variance Result */}
              <div className={`p-6 rounded-2xl ${
                closeResult.variance === 0
                  ? 'bg-green-500/10'
                  : closeResult.variance > 0
                    ? 'bg-green-500/10'
                    : 'bg-red-500/10'
              }`}>
                {closeResult.variance === 0 ? (
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-3" />
                ) : closeResult.variance > 0 ? (
                  <TrendingUp className="h-12 w-12 mx-auto text-green-600 mb-3" />
                ) : (
                  <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-3" />
                )}
                <p className="text-sm text-muted-foreground">
                  {closeResult.variance === 0 ? 'Perfect Balance' : closeResult.variance > 0 ? 'Overage' : 'Shortage'}
                </p>
                <p className={`text-4xl font-bold ${
                  closeResult.variance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {closeResult.variance >= 0 ? '+' : ''}{formatPrice(closeResult.variance)}
                </p>
              </div>

              {/* Summary */}
              <div className="text-sm space-y-2 text-left bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions</span>
                  <span>{closeResult.transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span>{formatPrice(closeResult.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected</span>
                  <span>{formatPrice(closeResult.expected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Counted</span>
                  <span>{formatPrice(closeResult.counted)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="justify-center">
            <Button size="lg" onClick={() => setShowCloseResult(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

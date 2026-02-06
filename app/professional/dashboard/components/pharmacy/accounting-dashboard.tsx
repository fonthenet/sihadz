'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  BookOpen, FileText, TrendingUp, TrendingDown, DollarSign,
  Building2, CreditCard, Wallet, Calculator, RefreshCw, Plus,
  Download, Eye, CheckCircle, AlertCircle
} from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import type { 
  Account, JournalEntry, JournalType, FiscalYear,
  JournalEntryFormData, JournalEntryLineFormData 
} from '@/lib/pharmacy/accounting-types'

interface AccountingDashboardStats {
  fiscal_year: string
  period: string
  total_revenue: number
  total_expenses: number
  net_result: number
  cash_balance: number
  bank_balance: number
  total_cash: number
  client_receivables: number
  cnas_receivables: number
  casnos_receivables: number
  total_receivables: number
  supplier_payables: number
  tva_collectee_month: number
  tva_deductible_month: number
  tva_net_month: number
  unposted_entries: number
  entries_this_month: number
}

export default function AccountingDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  
  // Data
  const [stats, setStats] = useState<AccountingDashboardStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [journalTypes, setJournalTypes] = useState<JournalType[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  
  // Filters
  const [journalFilter, setJournalFilter] = useState<string>('_all')
  const [statusFilter, setStatusFilter] = useState<string>('_all')
  const [accountClassFilter, setAccountClassFilter] = useState<string>('_all')
  
  // Dialogs
  const [showCreateEntry, setShowCreateEntry] = useState(false)
  const [showReport, setShowReport] = useState(false)
  
  // Form
  const [entryForm, setEntryForm] = useState<JournalEntryFormData>({
    journal_type_code: 'OD',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    lines: [
      { account_code: '', description: '', debit_amount: 0, credit_amount: 0 },
      { account_code: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]
  })

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/accounting/dashboard')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (error: any) {
      console.error('Error fetching accounting stats:', error)
    }
  }, [])

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      let url = '/api/pharmacy/accounting/accounts?with_balances=true&detail=true'
      if (accountClassFilter && accountClassFilter !== '_all') {
        url += `&class=${accountClassFilter}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (error: any) {
      console.error('Error fetching accounts:', error)
    }
  }, [accountClassFilter])

  // Fetch journal entries
  const fetchEntries = useCallback(async () => {
    try {
      let url = '/api/pharmacy/accounting/journals?limit=100'
      if (journalFilter && journalFilter !== '_all') {
        url += `&journal_code=${journalFilter}`
      }
      if (statusFilter && statusFilter !== '_all') {
        url += `&status=${statusFilter}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch entries')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (error: any) {
      console.error('Error fetching entries:', error)
    }
  }, [journalFilter, statusFilter])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchAccounts(), fetchEntries()])
      setLoading(false)
    }
    loadData()
  }, [fetchStats, fetchAccounts, fetchEntries])

  // Reload on filter change
  useEffect(() => {
    fetchAccounts()
  }, [accountClassFilter, fetchAccounts])

  useEffect(() => {
    fetchEntries()
  }, [journalFilter, statusFilter, fetchEntries])

  // Generate report
  const generateReport = async (type: string) => {
    try {
      const now = new Date()
      const startOfYear = `${now.getFullYear()}-01-01`
      const today = now.toISOString().split('T')[0]
      
      let url = `/api/pharmacy/accounting/reports?type=${type}`
      
      switch (type) {
        case 'trial_balance':
        case 'income_statement':
          url += `&start_date=${startOfYear}&end_date=${today}`
          break
        case 'balance_sheet':
          url += `&end_date=${today}`
          break
        case 'g50':
          url += `&year=${now.getFullYear()}&month=${now.getMonth() + 1}`
          break
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to generate report')
      const data = await res.json()
      setSelectedReport(data)
      setShowReport(true)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Add line to entry form
  const addEntryLine = () => {
    setEntryForm(f => ({
      ...f,
      lines: [...f.lines, { account_code: '', description: '', debit_amount: 0, credit_amount: 0 }]
    }))
  }

  // Update entry line
  const updateEntryLine = (index: number, field: keyof JournalEntryLineFormData, value: any) => {
    setEntryForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === index ? { ...l, [field]: value } : l)
    }))
  }

  // Create journal entry
  const handleCreateEntry = async () => {
    // Validate balance
    const totalDebit = entryForm.lines.reduce((sum, l) => sum + (parseFloat(String(l.debit_amount)) || 0), 0)
    const totalCredit = entryForm.lines.reduce((sum, l) => sum + (parseFloat(String(l.credit_amount)) || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({ 
        title: 'Error', 
        description: `Entry not balanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`, 
        variant: 'destructive' 
      })
      return
    }

    try {
      const res = await fetch('/api/pharmacy/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entryForm,
          lines: entryForm.lines.filter(l => l.account_code).map(l => ({
            ...l,
            debit_amount: parseFloat(String(l.debit_amount)) || 0,
            credit_amount: parseFloat(String(l.credit_amount)) || 0
          }))
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create entry')
      }
      
      toast({ title: 'Success', description: 'Journal entry created' })
      setShowCreateEntry(false)
      setEntryForm({
        journal_type_code: 'OD',
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        lines: [
          { account_code: '', description: '', debit_amount: 0, credit_amount: 0 },
          { account_code: '', description: '', debit_amount: 0, credit_amount: 0 }
        ]
      })
      await fetchEntries()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Post entry
  const handlePostEntry = async (id: string) => {
    try {
      const res = await fetch('/api/pharmacy/accounting/journals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'post' })
      })
      if (!res.ok) throw new Error('Failed to post entry')
      toast({ title: 'Success', description: 'Entry posted' })
      await Promise.all([fetchStats(), fetchEntries()])
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Format balance with color
  const formatBalance = (amount: number, isPositiveGood = true) => {
    const color = amount >= 0 
      ? (isPositiveGood ? 'text-green-600' : 'text-red-600')
      : (isPositiveGood ? 'text-red-600' : 'text-green-600')
    return <span className={color}>{formatPrice(Math.abs(amount))}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading accounting data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accounting</h2>
          <p className="text-muted-foreground">
            {stats?.fiscal_year || 'Current Fiscal Year'} - SCF Compliant
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => Promise.all([fetchStats(), fetchAccounts(), fetchEntries()])}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateEntry(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="journals">
            Journals
            {stats?.unposted_entries ? <Badge className="ml-2" variant="secondary">{stats.unposted_entries}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* P&L Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(stats?.total_revenue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses (This Month)</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatPrice(stats?.total_expenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Result</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(stats?.net_result || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(stats?.net_result || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash & Receivables */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash (Caisse)</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats?.cash_balance || 0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bank</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats?.bank_balance || 0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CNAS Receivable</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(stats?.cnas_receivables || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Supplier Payables</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatPrice(stats?.supplier_payables || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TVA Summary */}
          <Card>
            <CardHeader>
              <CardTitle>TVA This Month (G50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-700">
                    {formatPrice(stats?.tva_collectee_month || 0)}
                  </div>
                  <div className="text-sm text-green-600">TVA Collectée</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-700">
                    {formatPrice(stats?.tva_deductible_month || 0)}
                  </div>
                  <div className="text-sm text-blue-600">TVA Déductible</div>
                </div>
                <div className={`text-center p-4 rounded-lg ${(stats?.tva_net_month || 0) >= 0 ? 'bg-orange-50' : 'bg-purple-50'}`}>
                  <div className={`text-xl font-bold ${(stats?.tva_net_month || 0) >= 0 ? 'text-orange-700' : 'text-purple-700'}`}>
                    {formatPrice(Math.abs(stats?.tva_net_month || 0))}
                  </div>
                  <div className={`text-sm ${(stats?.tva_net_month || 0) >= 0 ? 'text-orange-600' : 'text-purple-600'}`}>
                    {(stats?.tva_net_month || 0) >= 0 ? 'À Décaisser' : 'Crédit TVA'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journals Tab */}
        <TabsContent value="journals" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={journalFilter} onValueChange={setJournalFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Journal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Journals</SelectItem>
                <SelectItem value="VT">Ventes</SelectItem>
                <SelectItem value="AC">Achats</SelectItem>
                <SelectItem value="CA">Caisse</SelectItem>
                <SelectItem value="BQ">Banque</SelectItem>
                <SelectItem value="OD">Opérations Diverses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                      <TableCell>{entry.entry_date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.journal_type?.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className="text-right font-mono">{formatPrice(entry.total_debit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPrice(entry.total_credit)}</TableCell>
                      <TableCell>
                        <Badge className={entry.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {entry.status}
                        </Badge>
                        {entry.is_auto_generated && <Badge variant="outline" className="ml-1">Auto</Badge>}
                      </TableCell>
                      <TableCell>
                        {entry.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handlePostEntry(entry.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Post
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={accountClassFilter} onValueChange={setAccountClassFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Classes</SelectItem>
                <SelectItem value="1">1 - Capitaux</SelectItem>
                <SelectItem value="2">2 - Immobilisations</SelectItem>
                <SelectItem value="3">3 - Stocks</SelectItem>
                <SelectItem value="4">4 - Tiers</SelectItem>
                <SelectItem value="5">5 - Financiers</SelectItem>
                <SelectItem value="6">6 - Charges</SelectItem>
                <SelectItem value="7">7 - Produits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono">{acc.code}</TableCell>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{acc.account_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPrice(acc.debit_total || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPrice(acc.credit_total || 0)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatBalance(acc.balance || 0, acc.normal_balance === 'debit')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:border-primary" onClick={() => generateReport('trial_balance')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Trial Balance
                </CardTitle>
                <CardDescription>Balance Générale - All account balances</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary" onClick={() => generateReport('income_statement')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Income Statement
                </CardTitle>
                <CardDescription>Compte de Résultat - P&L summary</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary" onClick={() => generateReport('balance_sheet')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Balance Sheet
                </CardTitle>
                <CardDescription>Bilan - Assets and liabilities</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary" onClick={() => generateReport('g50')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  G50 TVA Summary
                </CardTitle>
                <CardDescription>Monthly TVA declaration data</CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          {/* G50 Export Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exporter G50 pour Jibayatic
              </CardTitle>
              <CardDescription>
                Télécharger les données TVA au format CSV pour déclaration fiscale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label>Année</Label>
                    <Select defaultValue={String(new Date().getFullYear())}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2].map(offset => {
                          const year = new Date().getFullYear() - offset
                          return <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mois</Label>
                    <Select defaultValue={String(new Date().getMonth() + 1)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                        ].map((m, i) => (
                          <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="gap-2"
                  onClick={async () => {
                    try {
                      const year = new Date().getFullYear()
                      const month = new Date().getMonth() + 1
                      const res = await fetch(`/api/pharmacy/accounting/g50-export?year=${year}&month=${month}&format=csv`, {
                        credentials: 'include'
                      })
                      if (!res.ok) throw new Error('Failed to generate G50')
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `G50-${year}-${String(month).padStart(2, '0')}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                      toast({ title: 'Success', description: 'G50 CSV downloaded' })
                    } catch (error: any) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' })
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  Télécharger CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Entry Dialog */}
      <Dialog open={showCreateEntry} onOpenChange={setShowCreateEntry}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>Create a manual accounting entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Journal</Label>
                <Select 
                  value={entryForm.journal_type_code} 
                  onValueChange={v => setEntryForm(f => ({ ...f, journal_type_code: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OD">OD - Opérations Diverses</SelectItem>
                    <SelectItem value="CA">CA - Caisse</SelectItem>
                    <SelectItem value="BQ">BQ - Banque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={entryForm.entry_date}
                  onChange={e => setEntryForm(f => ({ ...f, entry_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Reference</Label>
                <Input
                  value={entryForm.reference_number || ''}
                  onChange={e => setEntryForm(f => ({ ...f, reference_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label>Description (Libellé)</Label>
              <Input
                value={entryForm.description}
                onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Entry description..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines</Label>
                <Button type="button" size="sm" variant="outline" onClick={addEntryLine}>
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Debit</TableHead>
                    <TableHead className="w-32">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entryForm.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={line.account_code}
                          onChange={e => updateEntryLine(idx, 'account_code', e.target.value)}
                          placeholder="e.g. 531"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description || ''}
                          onChange={e => updateEntryLine(idx, 'description', e.target.value)}
                          placeholder="Line description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.debit_amount || ''}
                          onChange={e => updateEntryLine(idx, 'debit_amount', parseFloat(e.target.value) || 0)}
                          disabled={line.credit_amount > 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.credit_amount || ''}
                          onChange={e => updateEntryLine(idx, 'credit_amount', parseFloat(e.target.value) || 0)}
                          disabled={line.debit_amount > 0}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                    <TableCell className="font-mono font-bold">
                      {formatPrice(entryForm.lines.reduce((s, l) => s + (parseFloat(String(l.debit_amount)) || 0), 0))}
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {formatPrice(entryForm.lines.reduce((s, l) => s + (parseFloat(String(l.credit_amount)) || 0), 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateEntry(false)}>Cancel</Button>
            <Button onClick={handleCreateEntry}>Create Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.report_type === 'trial_balance' && 'Trial Balance (Balance Générale)'}
              {selectedReport?.report_type === 'income_statement' && 'Income Statement (Compte de Résultat)'}
              {selectedReport?.report_type === 'balance_sheet' && 'Balance Sheet (Bilan)'}
              {selectedReport?.report_type === 'g50' && 'G50 TVA Summary'}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.period_start && `${selectedReport.period_start} to ${selectedReport.period_end}`}
              {selectedReport?.as_of_date && `As of ${selectedReport.as_of_date}`}
              {selectedReport?.period && `Period: ${selectedReport.period}`}
            </DialogDescription>
          </DialogHeader>

          {selectedReport?.report_type === 'trial_balance' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Opening Debit</TableHead>
                  <TableHead className="text-right">Opening Credit</TableHead>
                  <TableHead className="text-right">Period Debit</TableHead>
                  <TableHead className="text-right">Period Credit</TableHead>
                  <TableHead className="text-right">Closing Debit</TableHead>
                  <TableHead className="text-right">Closing Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedReport.rows?.map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <span className="font-mono mr-2">{row.account_code}</span>
                      {row.account_name}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.opening_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.opening_credit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.period_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.period_credit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.closing_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(row.closing_credit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell>TOTALS</TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(selectedReport.totals?.opening_debit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(selectedReport.totals?.opening_credit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(selectedReport.totals?.period_debit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(selectedReport.totals?.period_credit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(selectedReport.totals?.closing_debit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPrice(selectedReport.totals?.closing_credit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {selectedReport?.report_type === 'income_statement' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Revenue (Produits)</h4>
                <div className="space-y-1 pl-4">
                  <div className="flex justify-between">
                    <span>Ventes médicaments</span>
                    <span className="font-mono">{formatPrice(selectedReport.revenue?.sales_medications)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ventes parapharmacie</span>
                    <span className="font-mono">{formatPrice(selectedReport.revenue?.sales_parapharmacy)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Autres produits</span>
                    <span className="font-mono">{formatPrice(selectedReport.revenue?.other_revenue)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total Revenue</span>
                    <span className="font-mono text-green-600">{formatPrice(selectedReport.revenue?.total_revenue)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Expenses (Charges)</h4>
                <div className="space-y-1 pl-4">
                  <div className="flex justify-between">
                    <span>Achats</span>
                    <span className="font-mono">{formatPrice(selectedReport.expenses?.purchases)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Services externes</span>
                    <span className="font-mono">{formatPrice(selectedReport.expenses?.external_services)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Personnel</span>
                    <span className="font-mono">{formatPrice(selectedReport.expenses?.personnel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impôts et taxes</span>
                    <span className="font-mono">{formatPrice(selectedReport.expenses?.taxes)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total Expenses</span>
                    <span className="font-mono text-red-600">{formatPrice(selectedReport.expenses?.total_expenses)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Result</span>
                  <span className={`font-mono ${selectedReport.results?.net_result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPrice(selectedReport.results?.net_result)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedReport?.report_type === 'balance_sheet' && (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-2 text-lg">Assets (Actif)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Immobilisations</span>
                    <span className="font-mono">{formatPrice(selectedReport.assets?.fixed_assets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stocks</span>
                    <span className="font-mono">{formatPrice(selectedReport.assets?.inventory)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Créances</span>
                    <span className="font-mono">{formatPrice(selectedReport.assets?.receivables)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trésorerie</span>
                    <span className="font-mono">{formatPrice(selectedReport.assets?.cash_bank)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total Actif</span>
                    <span className="font-mono">{formatPrice(selectedReport.assets?.total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-lg">Liabilities (Passif)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Capitaux propres</span>
                    <span className="font-mono">{formatPrice(selectedReport.liabilities?.equity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fournisseurs</span>
                    <span className="font-mono">{formatPrice(selectedReport.liabilities?.suppliers)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Autres dettes</span>
                    <span className="font-mono">{formatPrice(selectedReport.liabilities?.other_payables)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total Passif</span>
                    <span className="font-mono">{formatPrice(selectedReport.liabilities?.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedReport?.report_type === 'g50' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-2">TVA Collectée</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>TVA 19%</span>
                      <span className="font-mono">{formatPrice(selectedReport.tva_collectee?.tva_19)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA 9%</span>
                      <span className="font-mono">{formatPrice(selectedReport.tva_collectee?.tva_9)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total</span>
                      <span className="font-mono text-green-600">{formatPrice(selectedReport.tva_collectee?.total)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">TVA Déductible</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>TVA 19%</span>
                      <span className="font-mono">{formatPrice(selectedReport.tva_deductible?.tva_19)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA 9%</span>
                      <span className="font-mono">{formatPrice(selectedReport.tva_deductible?.tva_9)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total</span>
                      <span className="font-mono text-blue-600">{formatPrice(selectedReport.tva_deductible?.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 pt-4">
                {selectedReport.tva_a_decaisser > 0 ? (
                  <div className="flex justify-between text-lg font-bold">
                    <span>TVA à Décaisser</span>
                    <span className="font-mono text-orange-600">{formatPrice(selectedReport.tva_a_decaisser)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-lg font-bold">
                    <span>Crédit de TVA</span>
                    <span className="font-mono text-purple-600">{formatPrice(selectedReport.credit_tva)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReport(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

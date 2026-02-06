'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight, History, Clock, CheckCircle, XCircle, Lock, RefreshCw, Info, AlertTriangle } from 'lucide-react'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDateAlgeria, formatDateTimeAlgeria } from '@/lib/date-algeria'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'

type Wallet = { id: string; balance: number; currency: string; updated_at: string }
type Tx = { id: string; type: string; amount: number; balance_after: number | null; description: string | null; created_at: string }
type TopUpRequest = { id: string; request_number?: string; amount_dzd: number; status: string; proof_reference: string | null; created_at: string; processed_at: string | null }
type Deposit = { 
  id: string; 
  amount: number; 
  status: 'frozen' | 'released' | 'refunded' | 'forfeited'; 
  refund_amount?: number; 
  refund_percentage?: number;
  appointment_id?: string;
  created_at: string 
}

/** Unified activity item: top-up requests + wallet transactions, sorted by date */
type ActivityItem = {
  id: string
  kind: 'request' | 'transaction'
  date: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  label: string
  description: string | null
  request_number?: string
}

const tLabels = (lang: string) => ({
  wallet: lang === 'ar' ? 'المحفظة' : lang === 'fr' ? 'Portefeuille' : 'Wallet',
  balance: lang === 'ar' ? 'الرصيد' : lang === 'fr' ? 'Solde' : 'Balance',
  requestTopUp: lang === 'ar' ? 'طلب شحن' : lang === 'fr' ? 'Demander un rechargement' : 'Request top-up',
  amount: lang === 'ar' ? 'المبلغ (د.ج)' : lang === 'fr' ? 'Montant (DZD)' : 'Amount (DZD)',
  proofRef: lang === 'ar' ? 'مرجع التحويل (اختياري)' : lang === 'fr' ? 'Référence du virement (optionnel)' : 'Transfer reference (optional)',
  submit: lang === 'ar' ? 'إرسال الطلب' : lang === 'fr' ? 'Envoyer la demande' : 'Submit request',
  activity: lang === 'ar' ? 'النشاط' : lang === 'fr' ? 'Activité' : 'Activity',
  all: lang === 'ar' ? 'الكل' : lang === 'fr' ? 'Tout' : 'All',
  pending: lang === 'ar' ? 'قيد المراجعة' : lang === 'fr' ? 'En attente' : 'Pending',
  approved: lang === 'ar' ? 'موافق عليه' : lang === 'fr' ? 'Approuvé' : 'Approved',
  rejected: lang === 'ar' ? 'مرفوض' : lang === 'fr' ? 'Rejeté' : 'Rejected',
  completed: lang === 'ar' ? 'مكتمل' : lang === 'fr' ? 'Complété' : 'Completed',
  topUp: lang === 'ar' ? 'شحن' : lang === 'fr' ? 'Rechargement' : 'Top-up',
  deposit: lang === 'ar' ? 'عربون' : lang === 'fr' ? 'Dépôt' : 'Deposit',
  refund: lang === 'ar' ? 'استرداد' : lang === 'fr' ? 'Remboursement' : 'Refund',
  noActivity: lang === 'ar' ? 'لا يوجد نشاط' : lang === 'fr' ? 'Aucune activité' : 'No activity yet',
  minAmount: lang === 'ar' ? 'الحد الأدنى 100 د.ج' : lang === 'fr' ? 'Minimum 100 DZD' : 'Minimum 100 DZD',
  requestSent: lang === 'ar' ? 'تم إرسال الطلب. سيتم إضافة الرصيد بعد المراجعة.' : lang === 'fr' ? 'Demande envoyée. Le solde sera crédité après vérification.' : 'Request sent. Balance will be credited after review.',
  activeDeposits: lang === 'ar' ? 'العربون المجمد' : lang === 'fr' ? 'Dépôts gelés' : 'Frozen Deposits',
  frozenForAppointments: lang === 'ar' ? 'محجوز للمواعيد القادمة' : lang === 'fr' ? 'Réservé pour les rendez-vous' : 'Reserved for upcoming appointments',
  frozen: lang === 'ar' ? 'مجمد' : lang === 'fr' ? 'Gelé' : 'Frozen',
  released: lang === 'ar' ? 'تم التحرير' : lang === 'fr' ? 'Libéré' : 'Released',
  refunded: lang === 'ar' ? 'مسترد' : lang === 'fr' ? 'Remboursé' : 'Refunded',
  forfeited: lang === 'ar' ? 'مصادر' : lang === 'fr' ? 'Perdu' : 'Forfeited',
  noDeposits: lang === 'ar' ? 'لا توجد عربون مجمدة' : lang === 'fr' ? 'Aucun dépôt gelé' : 'No frozen deposits',
  refundPolicy: lang === 'ar' ? 'سياسة الاسترداد' : lang === 'fr' ? 'Politique de remboursement' : 'Refund Policy',
  refundPolicyDesc: lang === 'ar' ? 'قواعد استرداد العربون عند الإلغاء' : lang === 'fr' ? 'Règles de remboursement en cas d\'annulation' : 'Deposit refund rules on cancellation',
  refund48h: lang === 'ar' ? 'أكثر من 48 ساعة' : lang === 'fr' ? 'Plus de 48h' : '48h+ before',
  refund24h: lang === 'ar' ? '24-48 ساعة' : lang === 'fr' ? '24-48h' : '24-48h before',
  refundLess24h: lang === 'ar' ? 'أقل من 24 ساعة' : lang === 'fr' ? 'Moins de 24h' : 'Less than 24h',
  fullRefund: lang === 'ar' ? 'استرداد كامل' : lang === 'fr' ? 'Remboursement total' : '100% refund',
  halfRefund: lang === 'ar' ? 'استرداد 50%' : lang === 'fr' ? 'Remboursement 50%' : '50% refund',
  noRefund: lang === 'ar' ? 'لا استرداد' : lang === 'fr' ? 'Pas de remboursement' : 'No refund',
  providerCancel: lang === 'ar' ? 'إلغاء مقدم الخدمة' : lang === 'fr' ? 'Annulation par le prestataire' : 'Provider cancellation',
  alwaysFull: lang === 'ar' ? 'استرداد كامل دائماً' : lang === 'fr' ? 'Toujours 100%' : 'Always 100%',
  loading: lang === 'ar' ? 'جاري التحميل...' : lang === 'fr' ? 'Chargement...' : 'Loading...',
})

export default function WalletPage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const labels = tLabels(language)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [proofRef, setProofRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activityFilter, setActivityFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const activityItems = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    topUpRequests.forEach((r) => {
      items.push({
        id: `req-${r.id}`,
        kind: 'request',
        date: r.created_at,
        amount: r.amount_dzd,
        status: r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : 'rejected',
        label: labels.requestTopUp,
        description: r.proof_reference,
        request_number: r.request_number,
      })
    })
    transactions.forEach((tx) => {
      const typeLabel = tx.type === 'top_up' ? labels.topUp : tx.type === 'deposit' ? labels.deposit : tx.type === 'refund' ? labels.refund : tx.type
      items.push({
        id: `tx-${tx.id}`,
        kind: 'transaction',
        date: tx.created_at,
        amount: tx.amount,
        status: 'completed',
        label: typeLabel,
        description: tx.description,
      })
    })
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [topUpRequests, transactions, language])

  const getActivityForTab = (tab: 'all' | 'pending' | 'approved' | 'rejected') => {
    if (tab === 'all') return activityItems
    if (tab === 'pending') return activityItems.filter((a) => a.status === 'pending')
    if (tab === 'approved') return activityItems.filter((a) => a.status === 'approved' || a.status === 'completed')
    if (tab === 'rejected') return activityItems.filter((a) => a.status === 'rejected')
    return activityItems
  }

  const fetchWallet = async () => {
    setFetchError(null)
    try {
      const res = await fetch('/api/wallet')
      const text = await res.text()
      if (!res.ok) {
        const errMsg = text.includes('wallets') && text.includes('schema cache')
          ? 'Wallet not set up: run the migration in Supabase SQL Editor (scripts/014-wallet-system.sql).'
          : text
        setFetchError(errMsg)
        setWallet(null)
        return
      }
      const data = JSON.parse(text)
      setWallet(data.wallet)
    } catch (e) {
      console.error(e)
      setWallet(null)
      setFetchError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/wallet/transactions?limit=30')
      if (!res.ok) return
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch {
      setTransactions([])
    }
  }

  const fetchTopUpRequests = async () => {
    try {
      const res = await fetch('/api/wallet/my-top-up-requests')
      if (!res.ok) return
      const data = await res.json()
      setTopUpRequests(data.requests || [])
    } catch {
      setTopUpRequests([])
    }
  }

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/wallet/deposits')
      if (!res.ok) return
      const data = await res.json()
      setDeposits(data.deposits || [])
    } catch {
      setDeposits([])
    }
  }

  useEffect(() => {
    fetchWallet()
    fetchTransactions()
    fetchTopUpRequests()
    fetchDeposits()
  }, [])

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(topUpAmount)
    if (!Number.isFinite(amount) || amount < 100) {
      toast({ title: labels.minAmount, variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wallet/top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_dzd: amount, proof_reference: proofRef || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      toast({ title: labels.requestSent })
      setTopUpAmount('')
      setProofRef('')
      fetchWallet()
      fetchTransactions()
      fetchTopUpRequests()
    } catch (err: any) {
      toast({ title: err.message || 'Error', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SectionLoading
        minHeight="min-h-[280px]"
        label={labels.loading}
      />
    )
  }

  return (
    <DashboardPageWrapper
      title={labels.wallet}
      subtitle={`${labels.balance} — ${labels.requestTopUp}`}
      maxWidth="lg"
      showHeader={false}
    >
      {fetchError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {fetchError}
        </div>
      )}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 tracking-tight">
          <WalletIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          {labels.wallet}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{labels.balance} — {labels.requestTopUp}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-none sm:rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">{labels.balance}</CardTitle>
            <CardDescription className="text-xs">{labels.wallet}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold tabular-nums">
              {wallet ? `${Number(wallet.balance).toLocaleString()} ${wallet.currency}` : '0 DZD'}
            </div>
            {deposits.filter(d => d.status === 'frozen').length > 0 && (
              <div className="mt-2 pt-2 border-t text-sm">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Lock className="h-4 w-4" />
                  <span>{labels.activeDeposits}: </span>
                  <span className="font-medium">
                    {deposits.filter(d => d.status === 'frozen').reduce((sum, d) => sum + d.amount, 0).toLocaleString()} DZD
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{labels.frozenForAppointments}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none sm:rounded-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">{labels.requestTopUp}</CardTitle>
            <CardDescription className="text-xs">{labels.minAmount}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleTopUpSubmit} className="space-y-3">
              <div>
                <Label htmlFor="amount">{labels.amount}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={100}
                  step={100}
                  placeholder="500"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proof">{labels.proofRef}</Label>
                <Input
                  id="proof"
                  type="text"
                  placeholder="e.g. bank transfer ref"
                  value={proofRef}
                  onChange={(e) => setProofRef(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
                <span className="ml-2">{labels.submit}</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Refund Policy Card */}
      <Card className="rounded-none sm:rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            {labels.refundPolicy}
          </CardTitle>
          <CardDescription className="text-xs">{labels.refundPolicyDesc}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">{labels.refund48h}</p>
                <p className="text-xs text-green-700 dark:text-green-400">{labels.fullRefund}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-sm">{labels.refund24h}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">{labels.halfRefund}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-sm">{labels.refundLess24h}</p>
                <p className="text-xs text-red-700 dark:text-red-400">{labels.noRefund}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <div className="min-w-0">
                <p className="font-medium text-xs">{labels.providerCancel}</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400">{labels.alwaysFull}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Deposits */}
      {deposits.filter(d => d.status === 'frozen').length > 0 && (
        <Card className="rounded-none sm:rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              {labels.activeDeposits}
            </CardTitle>
            <CardDescription>{labels.frozenForAppointments}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-0 divide-y divide-border/60">
              {deposits.filter(d => d.status === 'frozen').map((deposit) => (
                <li key={deposit.id} className="flex items-center justify-between py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-medium">{labels.deposit}</span>
                      {deposit.appointment_id && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {deposit.appointment_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <Badge variant="outline" className="!bg-amber-500/15 !text-amber-700 !border-amber-400/50 dark:!bg-amber-950 dark:!text-amber-200 dark:!border-amber-700">
                      {labels.frozen}
                    </Badge>
                    <div>
                      <span className="text-amber-600 font-medium">{deposit.amount.toLocaleString()} DZD</span>
                      <p className="text-xs text-muted-foreground">{formatDateTimeAlgeria(new Date(deposit.created_at), language as 'en' | 'fr' | 'ar')}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-none sm:rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            {labels.activity}
          </CardTitle>
          <CardDescription>
            {labels.requestTopUp} and {labels.balance} — {labels.pending}, {labels.approved}, {labels.rejected}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activityFilter} onValueChange={(v) => setActivityFilter(v as typeof activityFilter)}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">{labels.all}</TabsTrigger>
              <TabsTrigger value="pending">{labels.pending}</TabsTrigger>
              <TabsTrigger value="approved">{labels.approved}</TabsTrigger>
              <TabsTrigger value="rejected">{labels.rejected}</TabsTrigger>
            </TabsList>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => {
              const list = getActivityForTab(tab)
              return (
                <TabsContent key={tab} value={tab} className="mt-0">
                  {list.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">{labels.noActivity}</p>
                  ) : (
                    <ul className="space-y-0 divide-y divide-border/60 list-stripe">
                      {list.map((item) => (
                    <li
                          key={item.id}
                          className="flex items-center justify-between py-3 first:pt-0"
                        >
                          <div className="flex items-center gap-3">
                            {item.status === 'pending' && <Clock className="h-4 w-4 text-amber-600 shrink-0" />}
                            {item.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                            {item.status === 'rejected' && <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                            {(item.status === 'completed' || item.kind === 'transaction') && (
                              item.amount > 0 ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-600 shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-amber-600 shrink-0" />
                              )
                            )}
                            <div>
                              <span className="font-medium">{item.label}</span>
                              {(item.request_number || item.description) && (
                                <p className="text-xs text-muted-foreground">
                                  {item.request_number && <span className="font-mono font-medium">{item.request_number}</span>}
                                  {item.request_number && item.description ? ' · ' : ''}
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <Badge
                              variant={item.status === 'rejected' ? 'destructive' : 'outline'}
                              className={cn(
                                'shrink-0 border',
                                item.status === 'pending' && '!bg-orange-500/15 !text-orange-700 !border-orange-400/50 dark:!bg-orange-950 dark:!text-orange-200 dark:!border-orange-700',
                                (item.status === 'approved' || item.status === 'completed') && '!bg-green-500/15 !text-green-700 !border-green-400/50 dark:!bg-green-950 dark:!text-green-200 dark:!border-green-700'
                              )}
                            >
                              {item.status === 'pending' ? labels.pending : item.status === 'approved' ? labels.approved : item.status === 'rejected' ? labels.rejected : labels.completed}
                            </Badge>
                            <div>
                              <span className={item.amount > 0 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                                {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()} DZD
                              </span>
                              <p className="text-xs text-muted-foreground">{formatDateTimeAlgeria(new Date(item.date), language as 'en' | 'fr' | 'ar')}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
    </DashboardPageWrapper>
  )
}

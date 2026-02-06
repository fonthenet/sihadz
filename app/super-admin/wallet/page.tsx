'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDateTimeAlgeria } from '@/lib/date-algeria'

type TopUpRequest = {
  id: string
  request_number?: string | null
  user_id: string
  amount_dzd: number
  status: string
  proof_reference: string | null
  admin_notes: string | null
  created_at: string
  processed_at: string | null
  processed_by: string | null
}

const tLabels = (lang: string) => ({
  title: lang === 'ar' ? 'طلبات شحن المحفظة' : lang === 'fr' ? 'Rechargements portefeuille' : 'Wallet top-up requests',
  pending: lang === 'ar' ? 'قيد الانتظار' : lang === 'fr' ? 'En attente' : 'Pending',
  approved: lang === 'ar' ? 'موافق عليه' : lang === 'fr' ? 'Approuvé' : 'Approved',
  rejected: lang === 'ar' ? 'مرفوض' : lang === 'fr' ? 'Rejeté' : 'Rejected',
  amount: lang === 'ar' ? 'المبلغ' : lang === 'fr' ? 'Montant' : 'Amount',
  requestNo: lang === 'ar' ? 'رقم الطلب' : lang === 'fr' ? 'N° demande' : 'Request #',
  proof: lang === 'ar' ? 'المرجع' : lang === 'fr' ? 'Référence' : 'Proof ref',
  date: lang === 'ar' ? 'التاريخ' : lang === 'fr' ? 'Date' : 'Date',
  actions: lang === 'ar' ? 'إجراءات' : lang === 'fr' ? 'Actions' : 'Actions',
  approve: lang === 'ar' ? 'موافقة' : lang === 'fr' ? 'Approuver' : 'Approve',
  reject: lang === 'ar' ? 'رفض' : lang === 'fr' ? 'Rejeter' : 'Reject',
  approvedOk: lang === 'ar' ? 'تمت الموافقة' : lang === 'fr' ? 'Approuvé' : 'Approved',
  rejectedOk: lang === 'ar' ? 'تم الرفض' : lang === 'fr' ? 'Rejeté' : 'Rejected',
  error: lang === 'ar' ? 'خطأ' : lang === 'fr' ? 'Erreur' : 'Error',
  noRequests: lang === 'ar' ? 'لا توجد طلبات' : lang === 'fr' ? 'Aucune demande' : 'No requests',
})

export default function SuperAdminWalletPage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const labels = tLabels(language)
  const [requests, setRequests] = useState<TopUpRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/wallet/admin/top-up-requests')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (e) {
      console.error(e)
      toast({ title: labels.error, description: (e as Error).message, variant: 'destructive' })
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActingId(id)
    try {
      const res = await fetch(`/api/wallet/admin/top-up-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      toast({ title: action === 'approve' ? labels.approvedOk : labels.rejectedOk })
      fetchRequests()
    } catch (e: any) {
      toast({ title: labels.error, description: e.message, variant: 'destructive' })
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Wallet className="h-7 w-7" />
          {labels.title}
        </h1>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4" />
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            {pending.length} {labels.pending.toLowerCase()}
          </p>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noRequests}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.requestNo}</TableHead>
                  <TableHead>{labels.date}</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>{labels.amount}</TableHead>
                  <TableHead>{labels.proof}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">{labels.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-medium">{r.request_number || '—'}</TableCell>
                    <TableCell className="text-sm">{formatDateTimeAlgeria(new Date(r.created_at), language as 'en' | 'fr' | 'ar')}</TableCell>
                    <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                    <TableCell>{Number(r.amount_dzd).toLocaleString()} DZD</TableCell>
                    <TableCell className="text-sm">{r.proof_reference || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === 'rejected' ? 'destructive' : 'outline'}
                        className={cn(
                          'border',
                          r.status === 'pending' && '!bg-orange-500/15 !text-orange-700 !border-orange-400/50 dark:!bg-orange-950 dark:!text-orange-200 dark:!border-orange-700',
                          r.status === 'approved' && '!bg-green-500/15 !text-green-700 !border-green-400/50 dark:!bg-green-950 dark:!text-green-200 dark:!border-green-700'
                        )}
                      >
                        {r.status === 'pending' ? labels.pending : r.status === 'approved' ? labels.approved : labels.rejected}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={actingId === r.id}
                            onClick={() => handleAction(r.id, 'approve')}
                          >
                            {actingId === r.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-1">{labels.approve}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actingId === r.id}
                            onClick={() => handleAction(r.id, 'reject')}
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="ml-1">{labels.reject}</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

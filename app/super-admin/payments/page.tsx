"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, CreditCard, Banknote, CheckCircle, XCircle, Clock, TrendingUp, DollarSign } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

interface Payment {
  id: string
  appointment_id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  appointments?: {
    id: string
    appointment_date: string
    doctors?: { full_name: string }
    profiles?: { full_name: string }
  }
}

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, failed: 0, revenue: 0 })
  const searchParams = useSearchParams()

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    
    // Fetch appointments with payment info
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        consultation_fee,
        payment_method,
        payment_status,
        created_at,
        doctors (full_name),
        profiles (full_name)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const paymentData = data.map(apt => ({
        id: apt.id,
        appointment_id: apt.id,
        amount: apt.consultation_fee || 0,
        payment_method: apt.payment_method || 'cash',
        payment_status: apt.payment_status || 'pending',
        created_at: apt.created_at,
        appointments: {
          id: apt.id,
          appointment_date: apt.appointment_date,
          doctors: apt.doctors,
          profiles: apt.profiles
        }
      }))
      setPayments(paymentData)
      
      // Calculate stats
      const completed = paymentData.filter(p => p.payment_status === 'completed').length
      const pending = paymentData.filter(p => p.payment_status === 'pending').length
      const failed = paymentData.filter(p => p.payment_status === 'failed').length
      const revenue = paymentData.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + p.amount, 0)
      setStats({ total: paymentData.length, completed, pending, failed, revenue })
    }
    setLoading(false)
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/super-admin/appointments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      fetchPayments()
    } catch (e) {
      console.error('Payment status update error:', e)
    }
  }

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.appointments?.doctors?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.appointments?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.payment_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
      case 'failed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payments Management</h1>
            <p className="text-muted-foreground">Track and manage all platform payments</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} DZD</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by doctor or patient..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" className="text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                      <TableCell>{payment.appointments?.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell>{payment.appointments?.doctors?.full_name || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{payment.amount.toLocaleString()} DZD</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {payment.payment_method === 'cash' ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          {payment.payment_method}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select value={payment.payment_status} onValueChange={(v) => handleStatusChange(payment.id, v)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}

"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Calendar, DollarSign, TrendingUp, Building2, Pill, FlaskConical, Stethoscope, ArrowUp, ArrowDown } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/page-loading"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30")
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalClinics: 0,
    totalLabs: 0,
    totalPharmacies: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalRevenue: 0,
    newUsersThisMonth: 0,
    appointmentsThisMonth: 0,
    revenueThisMonth: 0,
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    
    const now = new Date()
    const daysAgo = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000)

    // Fetch counts
    const [users, doctors, clinics, labs, pharmacies, appointments] = await Promise.all([
      supabase.from('profiles').select('id, created_at', { count: 'exact' }),
      supabase.from('doctors').select('id', { count: 'exact' }),
      supabase.from('clinics').select('id', { count: 'exact' }),
      supabase.from('laboratories').select('id', { count: 'exact' }),
      supabase.from('pharmacies').select('id', { count: 'exact' }),
      supabase.from('appointments').select('id, status, consultation_fee, created_at'),
    ])

    const allAppointments = appointments.data || []
    const completedAppts = allAppointments.filter(a => a.status === 'completed')
    const cancelledAppts = allAppointments.filter(a => a.status === 'cancelled')
    const totalRevenue = completedAppts.reduce((sum, a) => sum + (a.consultation_fee || 0), 0)
    
    const newUsersThisMonth = (users.data || []).filter(u => new Date(u.created_at) >= daysAgo).length
    const appointmentsThisMonth = allAppointments.filter(a => new Date(a.created_at) >= daysAgo).length
    const revenueThisMonth = allAppointments
      .filter(a => new Date(a.created_at) >= daysAgo && a.status === 'completed')
      .reduce((sum, a) => sum + (a.consultation_fee || 0), 0)

    setStats({
      totalUsers: users.count || 0,
      totalDoctors: doctors.count || 0,
      totalClinics: clinics.count || 0,
      totalLabs: labs.count || 0,
      totalPharmacies: pharmacies.count || 0,
      totalAppointments: allAppointments.length,
      completedAppointments: completedAppts.length,
      cancelledAppointments: cancelledAppts.length,
      totalRevenue,
      newUsersThisMonth,
      appointmentsThisMonth,
      revenueThisMonth,
    })
    
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Platform performance and insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{stats.newUsersThisMonth}</span> in selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{stats.appointmentsThisMonth}</span> in selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} DZD</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{stats.revenueThisMonth.toLocaleString()} DZD</span> in selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAppointments > 0 
                ? ((stats.completedAppointments / stats.totalAppointments) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedAppointments} completed, {stats.cancelledAppointments} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Healthcare Providers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Doctors</CardTitle>
              <Stethoscope className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDoctors}</div>
              <p className="text-xs text-muted-foreground">Registered doctors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clinics</CardTitle>
              <Building2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClinics}</div>
              <p className="text-xs text-muted-foreground">Registered clinics</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Laboratories</CardTitle>
              <FlaskConical className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLabs}</div>
              <p className="text-xs text-muted-foreground">Registered labs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pharmacies</CardTitle>
              <Pill className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPharmacies}</div>
              <p className="text-xs text-muted-foreground">Registered pharmacies</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Appointments Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completedAppointments}</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalAppointments > 0 ? (stats.completedAppointments / stats.totalAppointments) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending/Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.totalAppointments - stats.completedAppointments - stats.cancelledAppointments}
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalAppointments > 0 ? ((stats.totalAppointments - stats.completedAppointments - stats.cancelledAppointments) / stats.totalAppointments) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.cancelledAppointments}</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${stats.totalAppointments > 0 ? (stats.cancelledAppointments / stats.totalAppointments) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  Stethoscope, Calendar, Users, DollarSign, TrendingUp, TrendingDown,
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Settings, Search,
  FileText, Pill, FlaskConical, MessageSquare, Star, Activity, Heart,
  BarChart3, PieChart as PieChartIcon, Wallet, CreditCard, ArrowUpRight, ArrowDownRight,
  Filter, Download, RefreshCw, MoreHorizontal, ChevronRight, Plus,
  Video, Phone, MapPin, Mail, Shield, Eye, EyeOff, Zap, Target,
  Briefcase, GraduationCap, Award, Building2, Layers, Grid3X3,
  LayoutDashboard, CalendarDays, UserCheck, Receipt, Cog, HelpCircle,
  LogOut, Moon, Sun, Globe, Volume2, VolumeX, Lock, Smartphone,
  ChevronLeft, Home, Clipboard, TestTube, Banknote, BarChart2,
  PenTool, ImageIcon, Send, Inbox, Archive, Trash2, Edit, Copy, Share2
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface DoctorProDashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

// Mock analytics data
const revenueData = [
  { month: 'Jan', revenue: 125000, patients: 42, consultations: 38 },
  { month: 'Feb', revenue: 148000, patients: 51, consultations: 47 },
  { month: 'Mar', revenue: 132000, patients: 45, consultations: 41 },
  { month: 'Apr', revenue: 167000, patients: 58, consultations: 54 },
  { month: 'May', revenue: 155000, patients: 52, consultations: 49 },
  { month: 'Jun', revenue: 189000, patients: 65, consultations: 61 },
]

const weeklyData = [
  { day: 'Sat', appointments: 0, completed: 0 },
  { day: 'Sun', appointments: 8, completed: 7 },
  { day: 'Mon', appointments: 12, completed: 11 },
  { day: 'Tue', appointments: 15, completed: 14 },
  { day: 'Wed', appointments: 10, completed: 10 },
  { day: 'Thu', appointments: 14, completed: 12 },
  { day: 'Fri', appointments: 6, completed: 6 },
]

const appointmentTypes = [
  { name: 'In-Person', value: 65, color: '#0891b2' },
  { name: 'Video Call', value: 25, color: '#7c3aed' },
  { name: 'Phone', value: 10, color: '#f59e0b' },
]

const patientAgeGroups = [
  { age: '0-18', count: 45 },
  { age: '19-35', count: 89 },
  { age: '36-50', count: 124 },
  { age: '51-65', count: 98 },
  { age: '65+', count: 67 },
]

export default function DoctorProDashboard({ professional, profile, onSignOut }: DoctorProDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [acceptingPatients, setAcceptingPatients] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(5)

  const [stats, setStats] = useState({
    todayAppointments: 8,
    weekAppointments: 47,
    totalPatients: 423,
    newPatients: 12,
    monthlyRevenue: 189000,
    revenueGrowth: 14.2,
    rating: 4.8,
    reviewCount: 156,
    completionRate: 94,
    avgWaitTime: 8,
    pendingPrescriptions: 3,
    pendingLabRequests: 2,
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    
    const today = new Date().toISOString().split('T')[0]
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, patient:profiles!appointments_patient_id_fkey(full_name, phone, email)')
      .eq('doctor_id', professional.id)
      .gte('appointment_date', today)
      .order('appointment_date')
      .limit(20)
    
    if (appts) setAppointments(appts)

    const { data: prescList } = await supabase
      .from('prescriptions')
      .select('*, patient:profiles!prescriptions_patient_id_fkey(full_name)')
      .eq('doctor_id', professional.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (prescList) setPrescriptions(prescList)

    const { data: labList } = await supabase
      .from('lab_test_requests')
      .select('*, patient:profiles!lab_test_requests_patient_id_fkey(full_name)')
      .eq('doctor_id', professional.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (labList) setLabRequests(labList)
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, badge: stats.todayAppointments },
    { id: 'patients', label: 'Patients', icon: Users, badge: null },
    { id: 'messages', label: 'Messages', icon: Inbox, badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill, badge: stats.pendingPrescriptions },
    { id: 'lab-requests', label: 'Lab Requests', icon: TestTube, badge: stats.pendingLabRequests },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'documents', label: 'Documents', icon: FileText, badge: null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]

  const quickActions = [
    { label: 'New Prescription', icon: Pill, color: 'bg-cyan-500', action: () => {} },
    { label: 'Lab Request', icon: TestTube, color: 'bg-violet-500', action: () => {} },
    { label: 'Video Call', icon: Video, color: 'bg-emerald-500', action: () => {} },
    { label: 'Send Message', icon: Send, color: 'bg-amber-500', action: () => {} },
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Logo & Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">MedPro</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Profile Card */}
        <div className={cn("p-4 border-b border-slate-200 dark:border-slate-800", sidebarCollapsed && "px-2")}>
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <Avatar className={cn("ring-2 ring-cyan-500/50 ring-offset-2", sidebarCollapsed ? "h-10 w-10" : "h-12 w-12")}>
              <AvatarImage src={professional?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white font-semibold">
                {professional?.business_name?.charAt(0) || 'D'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{professional?.business_name || 'Doctor'}</p>
                <p className="text-xs text-muted-foreground truncate">{professional?.specialization || 'General Medicine'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-slate-400")} />
                  <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Accepting patients</span>
              <Switch checked={acceptingPatients} onCheckedChange={setAcceptingPatients} />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className={cn("space-y-1", sidebarCollapsed ? "px-2" : "px-3")}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
                  sidebarCollapsed ? "justify-center p-3" : "px-4 py-3",
                  activeSection === item.id
                    ? "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={cn("flex-shrink-0", sidebarCollapsed ? "h-5 w-5" : "h-5 w-5")} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <Badge className="bg-cyan-500 text-white text-xs px-2 py-0.5">{item.badge}</Badge>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className={cn("p-4 border-t border-slate-200 dark:border-slate-800 space-y-2", sidebarCollapsed && "px-2")}>
          {!sidebarCollapsed && (
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/25">
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          )}
          <Button 
            variant="ghost" 
            className={cn("w-full text-red-500 hover:text-red-600 hover:bg-red-50", sidebarCollapsed && "px-0")}
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients, appointments..."
                className="pl-10 w-72 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Time Range */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Notifications */}
            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                {unreadMessages}
              </span>
            </Button>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={loadDashboardData} className="bg-transparent">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {quickActions.map((action, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    className="flex-shrink-0 gap-2 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                    onClick={action.action}
                  >
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", action.color)}>
                      <action.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Appointments */}
                <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Today's Appointments</p>
                        <p className="text-4xl font-bold mt-2">{stats.todayAppointments}</p>
                        <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>3 more than yesterday</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Calendar className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-cyan-100 mb-1">
                        <span>Completion</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} className="h-1.5 bg-white/20" />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Patients */}
                <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-violet-100 text-sm font-medium">Total Patients</p>
                        <p className="text-4xl font-bold mt-2">{stats.totalPatients}</p>
                        <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+{stats.newPatients} this week</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Revenue */}
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">{(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+{stats.revenueGrowth}% growth</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rating */}
                <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Patient Rating</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <p className="text-4xl font-bold">{stats.rating}</p>
                          <span className="text-amber-100">/5</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("h-4 w-4", i <= Math.floor(stats.rating) ? "fill-white" : "fill-white/30")} />
                          ))}
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Star className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Revenue Overview</CardTitle>
                      <CardDescription>Monthly revenue and patient trends</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="bg-transparent">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            formatter={(value: number) => [`${value.toLocaleString()} DZD`, 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Appointment Types */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Appointment Types</CardTitle>
                    <CardDescription>Distribution by consultation type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={appointmentTypes}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {appointmentTypes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-2">
                      {appointmentTypes.map((type) => (
                        <div key={type.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                            <span className="text-sm font-medium">{type.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{type.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Today's Schedule</CardTitle>
                      <CardDescription>{stats.todayAppointments} appointments scheduled</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {appointments.length > 0 ? appointments.slice(0, 5).map((apt, i) => (
                        <div key={apt.id || i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="w-14 text-center">
                            <p className="text-sm font-bold text-cyan-600">{apt.appointment_time?.slice(0, 5) || '09:00'}</p>
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-cyan-100 text-cyan-700 font-medium">
                              {(apt.patient?.full_name || apt.guest_name || apt.patient_name || 'P').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {apt.patient?.full_name || apt.guest_name || apt.patient_name || 'Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">{apt.appointment_type || 'Consultation'}</p>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            apt.status === 'confirmed' && 'bg-green-100 text-green-700 hover:bg-green-100',
                            apt.status === 'pending' && 'bg-amber-100 text-amber-700 hover:bg-amber-100',
                            apt.status === 'completed' && 'bg-slate-100 text-slate-700 hover:bg-slate-100',
                          )}>
                            {apt.status || 'pending'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No appointments scheduled for today</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats & Actions */}
                <div className="space-y-6">
                  {/* Performance Metrics */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Completion Rate</span>
                          <span className="font-semibold">{stats.completionRate}%</span>
                        </div>
                        <Progress value={stats.completionRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Avg Wait Time</span>
                          <span className="font-semibold">{stats.avgWaitTime} min</span>
                        </div>
                        <Progress value={100 - stats.avgWaitTime * 3} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Patient Satisfaction</span>
                          <span className="font-semibold">96%</span>
                        </div>
                        <Progress value={96} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pending Tasks */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Pending Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Pill className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Prescriptions</p>
                            <p className="text-xs text-muted-foreground">Awaiting review</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500 text-white">{stats.pendingPrescriptions}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <TestTube className="h-4 w-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Lab Results</p>
                            <p className="text-xs text-muted-foreground">Awaiting results</p>
                          </div>
                        </div>
                        <Badge className="bg-violet-500 text-white">{stats.pendingLabRequests}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Appointments Section */}
          {activeSection === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search appointments..." className="pl-10 w-64" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="bg-transparent">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </div>

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Patient</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {appointments.map((apt, i) => (
                          <tr key={apt.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-cyan-100 text-cyan-700">
                                    {(apt.patient?.full_name || apt.guest_name || 'P').charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{apt.patient?.full_name || apt.guest_name || apt.patient_name || 'Patient'}</p>
                                  <p className="text-sm text-muted-foreground">{apt.patient?.phone || apt.patient_phone || 'No phone'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-medium">{new Date(apt.appointment_date).toLocaleDateString()}</p>
                              <p className="text-sm text-muted-foreground">{apt.appointment_time}</p>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{apt.appointment_type || 'Consultation'}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge className={cn(
                                apt.status === 'confirmed' && 'bg-green-100 text-green-700',
                                apt.status === 'pending' && 'bg-amber-100 text-amber-700',
                                apt.status === 'completed' && 'bg-slate-100 text-slate-700',
                                apt.status === 'cancelled' && 'bg-red-100 text-red-700',
                              )}>
                                {apt.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">View</Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Activity */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Weekly Activity</CardTitle>
                    <CardDescription>Appointments completed vs scheduled</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="appointments" name="Scheduled" fill="#0891b2" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Patient Age Groups */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Patient Demographics</CardTitle>
                    <CardDescription>Distribution by age group</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={patientAgeGroups} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis dataKey="age" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Patients" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}


          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Practice Settings</CardTitle>
                  <CardDescription>Manage your practice preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Online Status</Label>
                      <p className="text-sm text-muted-foreground">Show when you're available online</p>
                    </div>
                    <Switch checked={isOnline} onCheckedChange={setIsOnline} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Accept New Patients</Label>
                      <p className="text-sm text-muted-foreground">Allow new patients to book appointments</p>
                    </div>
                    <Switch checked={acceptingPatients} onCheckedChange={setAcceptingPatients} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Video Consultations</Label>
                      <p className="text-sm text-muted-foreground">Enable video call appointments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Patient Messages</Label>
                      <p className="text-sm text-muted-foreground">Allow patients to send you direct messages</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-base font-medium">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive push notifications</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-base font-medium">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive email updates</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-base font-medium">Sound Alerts</Label>
                        <p className="text-sm text-muted-foreground">Play sound for new messages</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Messages section - redirect to full messages page */}
          {activeSection === 'messages' && (
            <Card className="shadow-sm h-[calc(100vh-10rem)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Messages</CardTitle>
                    <CardDescription>Chat with patients and other healthcare providers</CardDescription>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/dashboard/messages'}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Open Full Inbox
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-20 w-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-3xl flex items-center justify-center mb-6">
                  <Inbox className="h-10 w-10 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Connect with patients, pharmacies, laboratories, and other healthcare providers through secure messaging.
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/dashboard/messages'}
                  >
                    <Inbox className="h-4 w-4 mr-2" />
                    View Inbox
                  </Button>
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => window.location.href = '/dashboard/messages'}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Placeholder sections */}
          {['patients', 'prescriptions', 'lab-requests', 'finances', 'documents'].includes(activeSection) && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  {activeSection === 'patients' && <Users className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'prescriptions' && <Pill className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'lab-requests' && <TestTube className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'finances' && <Banknote className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'documents' && <FileText className="h-8 w-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {sidebarItems.find(i => i.id === activeSection)?.label}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  This section is coming soon. You'll be able to manage all your {activeSection.replace('-', ' ')} here.
                </p>
                <Button className="mt-4 bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

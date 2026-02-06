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
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  FlaskConical, Calendar, Users, DollarSign, TrendingUp,
  Clock, CheckCircle, AlertCircle, Bell, Search,
  FileText, MessageSquare, Star, Package, Truck,
  BarChart2, Wallet, ArrowUpRight, Filter, Download, RefreshCw, 
  MoreHorizontal, ChevronRight, Plus, Mail, Volume2, LayoutDashboard, Cog,
  LogOut, ChevronLeft, Banknote, TestTube, Activity, Microscope,
  Beaker, ClipboardCheck, FileSpreadsheet, Upload, Send, Timer,
  Thermometer, Droplet, Dna, Heart, Brain, Eye, Bone
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LaboratoryProDashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

// Mock data
const testVolumeData = [
  { month: 'Jan', tests: 845, revenue: 420000 },
  { month: 'Feb', tests: 932, revenue: 485000 },
  { month: 'Mar', tests: 878, revenue: 445000 },
  { month: 'Apr', tests: 1056, revenue: 565000 },
  { month: 'May', tests: 998, revenue: 525000 },
  { month: 'Jun', tests: 1189, revenue: 645000 },
]

const weeklyTests = [
  { day: 'Sat', received: 0, completed: 0 },
  { day: 'Sun', received: 45, completed: 42 },
  { day: 'Mon', received: 68, completed: 65 },
  { day: 'Tue', received: 72, completed: 68 },
  { day: 'Wed', received: 58, completed: 55 },
  { day: 'Thu', received: 65, completed: 62 },
  { day: 'Fri', received: 48, completed: 45 },
]

const testCategories = [
  { name: 'Blood Tests', value: 45, color: '#dc2626' },
  { name: 'Urine Tests', value: 20, color: '#f59e0b' },
  { name: 'Imaging', value: 15, color: '#0891b2' },
  { name: 'Microbiology', value: 12, color: '#7c3aed' },
  { name: 'Other', value: 8, color: '#6b7280' },
]

const popularTests = [
  { name: 'Complete Blood Count', code: 'CBC', count: 245, turnaround: '2h' },
  { name: 'Blood Glucose', code: 'GLU', count: 198, turnaround: '1h' },
  { name: 'Lipid Panel', code: 'LIP', count: 156, turnaround: '3h' },
  { name: 'Liver Function', code: 'LFT', count: 134, turnaround: '4h' },
  { name: 'Thyroid Panel', code: 'TSH', count: 112, turnaround: '6h' },
]

export function LaboratoryProDashboard({ professional, onSignOut }: LaboratoryProDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isOperating, setIsOperating] = useState(true)
  const [acceptingSamples, setAcceptingSamples] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [testRequests, setTestRequests] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(4)

  const [stats, setStats] = useState({
    pendingTests: 28,
    processingTests: 15,
    completedToday: 67,
    awaitingCollection: 12,
    monthlyRevenue: 645000,
    revenueGrowth: 22.8,
    rating: 4.9,
    avgTurnaround: 3.2,
    accuracy: 99.7,
    samplesPending: 8,
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    
    const { data: requests } = await supabase
      .from('lab_test_requests')
      .select('*, doctor:healthcare_professionals!lab_test_requests_doctor_id_fkey(business_name), patient:profiles!lab_test_requests_patient_id_fkey(full_name)')
      .eq('laboratory_id', professional.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (requests) setTestRequests(requests)
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'requests', label: 'Test Requests', icon: ClipboardCheck, badge: stats.pendingTests },
    { id: 'samples', label: 'Samples', icon: Beaker, badge: stats.samplesPending },
    { id: 'results', label: 'Results', icon: FileSpreadsheet, badge: null },
    { id: 'equipment', label: 'Equipment', icon: Microscope, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]

  const quickActions = [
    { label: 'Register Sample', icon: Beaker, color: 'bg-violet-500', action: () => {} },
    { label: 'Upload Results', icon: Upload, color: 'bg-emerald-500', action: () => {} },
    { label: 'New Test', icon: TestTube, color: 'bg-cyan-500', action: () => {} },
    { label: 'Send Report', icon: Send, color: 'bg-amber-500', action: () => {} },
  ]

  const testIcons: Record<string, any> = {
    blood: Droplet,
    cardio: Heart,
    neuro: Brain,
    vision: Eye,
    bone: Bone,
    genetic: Dna,
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">LabPro</span>
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

        {/* Profile */}
        <div className={cn("p-4 border-b border-slate-200 dark:border-slate-800", sidebarCollapsed && "px-2")}>
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <Avatar className={cn("ring-2 ring-violet-500/50 ring-offset-2", sidebarCollapsed ? "h-10 w-10" : "h-12 w-12")}>
              <AvatarImage src={professional?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-violet-600 text-white font-semibold">
                {professional?.business_name?.charAt(0) || 'L'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{professional?.business_name || 'Laboratory'}</p>
                <p className="text-xs text-muted-foreground truncate">{professional?.city || 'Location'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-2 h-2 rounded-full", isOperating ? "bg-green-500 animate-pulse" : "bg-slate-400")} />
                  <span className="text-xs text-muted-foreground">{isOperating ? 'Operating' : 'Closed'}</span>
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Operating Mode</span>
              <Switch checked={isOperating} onCheckedChange={setIsOperating} />
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
                    ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <Badge className="bg-violet-500 text-white text-xs px-2 py-0.5">{item.badge}</Badge>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <div className={cn("p-4 border-t border-slate-200 dark:border-slate-800 space-y-2", sidebarCollapsed && "px-2")}>
          {!sidebarCollapsed && (
            <Button className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-lg shadow-violet-500/25">
              <Beaker className="h-4 w-4 mr-2" />
              Register Sample
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
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search tests, patients..."
                className="pl-10 w-72 bg-slate-50 dark:bg-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                {stats.pendingTests}
              </span>
            </Button>

            <Button variant="outline" size="icon" onClick={loadDashboardData} className="bg-transparent">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {quickActions.map((action, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    className="flex-shrink-0 gap-2 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                  >
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", action.color)}>
                      <action.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-violet-100 text-sm font-medium">Pending Tests</p>
                        <p className="text-4xl font-bold mt-2">{stats.pendingTests}</p>
                        <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Awaiting processing</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <TestTube className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">In Progress</p>
                        <p className="text-4xl font-bold mt-2">{stats.processingTests}</p>
                        <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
                          <Activity className="h-4 w-4" />
                          <span>Being processed</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Microscope className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Completed Today</p>
                        <p className="text-4xl font-bold mt-2">{stats.completedToday}</p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>Tests completed</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ClipboardCheck className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">{(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                        <div className="flex items-center gap-1 mt-2 text-amber-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+{stats.revenueGrowth}% growth</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Test Volume</CardTitle>
                      <CardDescription>Monthly tests and revenue</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={testVolumeData}>
                          <defs>
                            <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="tests" stroke="#7c3aed" strokeWidth={3} fill="url(#colorTests)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Test Categories</CardTitle>
                    <CardDescription>Distribution by type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={testCategories}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {testCategories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {testCategories.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{cat.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Requests */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Pending Test Requests</CardTitle>
                      <CardDescription>{stats.pendingTests} tests awaiting processing</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testRequests.length > 0 ? testRequests.slice(0, 5).map((req, i) => (
                        <div key={req.id || i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="h-10 w-10 bg-violet-100 rounded-xl flex items-center justify-center">
                            <TestTube className="h-5 w-5 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {req.patient?.full_name || 'Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Dr. {req.doctor?.business_name || 'Unknown'} • {req.test_types?.length || 0} tests
                            </p>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            req.status === 'pending' && 'bg-amber-100 text-amber-700',
                            req.status === 'processing' && 'bg-cyan-100 text-cyan-700',
                            req.status === 'completed' && 'bg-green-100 text-green-700',
                          )}>
                            {req.status || 'pending'}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            req.priority === 'urgent' && 'border-red-500 text-red-600'
                          )}>
                            {req.priority || 'normal'}
                          </Badge>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            Process
                          </Button>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <TestTube className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending test requests</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance & Popular Tests */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Accuracy Rate</span>
                          <span className="font-semibold">{stats.accuracy}%</span>
                        </div>
                        <Progress value={stats.accuracy} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Avg Turnaround</span>
                          <span className="font-semibold">{stats.avgTurnaround}h</span>
                        </div>
                        <Progress value={100 - stats.avgTurnaround * 10} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Customer Rating</span>
                          <span className="font-semibold">{stats.rating}/5</span>
                        </div>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("h-4 w-4", i <= Math.floor(stats.rating) ? "fill-amber-500 text-amber-500" : "text-slate-200")} />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Popular Tests</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {popularTests.slice(0, 4).map((test, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{test.name}</p>
                            <p className="text-xs text-muted-foreground">{test.turnaround} turnaround</p>
                          </div>
                          <Badge variant="outline">{test.count}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}


          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Laboratory Settings</CardTitle>
                  <CardDescription>Manage your laboratory preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Operating Status</Label>
                      <p className="text-sm text-muted-foreground">Show laboratory as open for samples</p>
                    </div>
                    <Switch checked={isOperating} onCheckedChange={setIsOperating} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Accept New Samples</Label>
                      <p className="text-sm text-muted-foreground">Allow new sample registrations</p>
                    </div>
                    <Switch checked={acceptingSamples} onCheckedChange={setAcceptingSamples} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Home Collection</Label>
                      <p className="text-sm text-muted-foreground">Enable home sample collection service</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Doctor Messages</Label>
                      <p className="text-sm text-muted-foreground">Receive messages from referring doctors</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>New Test Request Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified for new requests</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>Turnaround Alerts</Label>
                        <p className="text-sm text-muted-foreground">Alert when tests exceed turnaround time</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Placeholder sections */}
          {['requests', 'samples', 'results', 'equipment', 'analytics', 'finances'].includes(activeSection) && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  {activeSection === 'requests' && <ClipboardCheck className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'samples' && <Beaker className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'results' && <FileSpreadsheet className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'equipment' && <Microscope className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'analytics' && <BarChart2 className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'finances' && <Banknote className="h-8 w-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {sidebarItems.find(i => i.id === activeSection)?.label}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Manage all your {activeSection.replace('-', ' ')} from this section.
                </p>
                <Button className="mt-4 bg-violet-600 hover:bg-violet-700">
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

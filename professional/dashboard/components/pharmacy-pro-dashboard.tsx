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
  Pill, Calendar, Users, DollarSign, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Settings, Search,
  FileText, MessageSquare, Star, Package, Truck, ShoppingCart,
  BarChart3, Wallet, ArrowUpRight, ArrowDownRight,
  Filter, Download, RefreshCw, MoreHorizontal, ChevronRight, Plus,
  MapPin, Mail, Volume2, Eye, LayoutDashboard, Cog,
  LogOut, ChevronLeft, Clipboard, Banknote, BarChart2, Box,
  Layers, QrCode, Scan, Receipt, AlertTriangle, ThermometerSun,
  PackageCheck, PackageX, Send, Archive
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface PharmacyProDashboardProps {
  professional: any
  profile: any
  onSignOut: () => void
}

// Mock data
const salesData = [
  { month: 'Jan', sales: 890000, prescriptions: 145, orders: 312 },
  { month: 'Feb', sales: 1020000, prescriptions: 168, orders: 389 },
  { month: 'Mar', sales: 945000, prescriptions: 152, orders: 345 },
  { month: 'Apr', sales: 1180000, prescriptions: 189, orders: 421 },
  { month: 'May', sales: 1095000, prescriptions: 175, orders: 398 },
  { month: 'Jun', sales: 1340000, prescriptions: 212, orders: 478 },
]

const weeklyOrders = [
  { day: 'Sat', orders: 12, delivered: 10 },
  { day: 'Sun', orders: 45, delivered: 42 },
  { day: 'Mon', orders: 58, delivered: 55 },
  { day: 'Tue', orders: 62, delivered: 58 },
  { day: 'Wed', orders: 48, delivered: 45 },
  { day: 'Thu', orders: 55, delivered: 52 },
  { day: 'Fri', orders: 38, delivered: 36 },
]

const orderSources = [
  { name: 'Walk-in', value: 45, color: '#0891b2' },
  { name: 'Prescriptions', value: 35, color: '#7c3aed' },
  { name: 'Delivery', value: 20, color: '#f59e0b' },
]

const topProducts = [
  { name: 'Paracetamol 500mg', sales: 245, stock: 1200, status: 'good' },
  { name: 'Amoxicillin 500mg', sales: 189, stock: 450, status: 'good' },
  { name: 'Ibuprofen 400mg', sales: 167, stock: 89, status: 'low' },
  { name: 'Omeprazole 20mg', sales: 145, stock: 320, status: 'good' },
  { name: 'Metformin 850mg', sales: 132, stock: 15, status: 'critical' },
]

export function PharmacyProDashboard({ professional, onSignOut }: PharmacyProDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isOnDuty, setIsOnDuty] = useState(true)
  const [acceptingOrders, setAcceptingOrders] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(3)

  const [stats, setStats] = useState({
    todayOrders: 67,
    pendingPrescriptions: 12,
    deliveryQueue: 8,
    lowStockItems: 15,
    monthlyRevenue: 1340000,
    revenueGrowth: 18.5,
    rating: 4.7,
    reviewCount: 234,
    fulfillmentRate: 97,
    avgDeliveryTime: 28,
  })

  useEffect(() => {
    loadDashboardData()
  }, [professional])

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    
    const { data: prescList } = await supabase
      .from('prescriptions')
      .select('*, doctor:healthcare_professionals!prescriptions_doctor_id_fkey(business_name), patient:profiles!prescriptions_patient_id_fkey(full_name)')
      .eq('pharmacy_id', professional.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (prescList) setPrescriptions(prescList)
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, badge: stats.pendingPrescriptions },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: stats.todayOrders },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: stats.lowStockItems },
    { id: 'delivery', label: 'Delivery', icon: Truck, badge: stats.deliveryQueue },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]

  const quickActions = [
    { label: 'Process Order', icon: CheckCircle, color: 'bg-emerald-500', action: () => {} },
    { label: 'Scan Prescription', icon: Scan, color: 'bg-cyan-500', action: () => {} },
    { label: 'Add Stock', icon: Package, color: 'bg-violet-500', action: () => {} },
    { label: 'New Delivery', icon: Truck, color: 'bg-amber-500', action: () => {} },
  ]

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
              <div className="h-9 w-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">PharmaPro</span>
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
            <Avatar className={cn("ring-2 ring-emerald-500/50 ring-offset-2", sidebarCollapsed ? "h-10 w-10" : "h-12 w-12")}>
              <AvatarImage src={professional?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold">
                {professional?.business_name?.charAt(0) || 'P'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{professional?.business_name || 'Pharmacy'}</p>
                <p className="text-xs text-muted-foreground truncate">{professional?.city || 'Location'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-2 h-2 rounded-full", isOnDuty ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                  <span className="text-xs text-muted-foreground">{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">On Duty Mode</span>
              <Switch checked={isOnDuty} onCheckedChange={setIsOnDuty} />
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
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <Badge className="bg-emerald-500 text-white text-xs px-2 py-0.5">{item.badge}</Badge>
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
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25">
              <Scan className="h-4 w-4 mr-2" />
              Scan Prescription
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
                placeholder="Search orders, medications..."
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
                {unreadMessages + stats.lowStockItems}
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
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Today's Orders</p>
                        <p className="text-4xl font-bold mt-2">{stats.todayOrders}</p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
                          <ArrowUpRight className="h-4 w-4" />
                          <span>+12 from yesterday</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Pending Prescriptions</p>
                        <p className="text-4xl font-bold mt-2">{stats.pendingPrescriptions}</p>
                        <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Awaiting processing</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-violet-100 text-sm font-medium">Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">{(stats.monthlyRevenue / 1000000).toFixed(1)}M</p>
                        <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
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

                <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Low Stock Alerts</p>
                        <p className="text-4xl font-bold mt-2">{stats.lowStockItems}</p>
                        <div className="flex items-center gap-1 mt-2 text-amber-100 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Items need restock</span>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Package className="h-6 w-6" />
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
                      <CardTitle className="text-lg font-semibold">Sales Overview</CardTitle>
                      <CardDescription>Monthly sales and order trends</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            formatter={(value: number) => [`${value.toLocaleString()} DZD`, 'Sales']}
                          />
                          <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Order Sources</CardTitle>
                    <CardDescription>Distribution by channel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderSources}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {orderSources.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-2">
                      {orderSources.map((source) => (
                        <div key={source.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                            <span className="text-sm font-medium">{source.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{source.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Prescriptions */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Pending Prescriptions</CardTitle>
                      <CardDescription>{stats.pendingPrescriptions} awaiting processing</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {prescriptions.length > 0 ? prescriptions.slice(0, 5).map((rx, i) => (
                        <div key={rx.id || i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="h-10 w-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {rx.patient?.full_name || 'Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Dr. {rx.doctor?.business_name || 'Unknown'} • {rx.medications?.length || 0} items
                            </p>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            rx.status === 'pending' && 'bg-amber-100 text-amber-700',
                            rx.status === 'processing' && 'bg-cyan-100 text-cyan-700',
                            rx.status === 'ready' && 'bg-green-100 text-green-700',
                          )}>
                            {rx.status || 'pending'}
                          </Badge>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            Process
                          </Button>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending prescriptions</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products & Alerts */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Top Products</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {topProducts.slice(0, 4).map((product, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              product.status === 'good' && 'bg-green-500',
                              product.status === 'low' && 'bg-amber-500',
                              product.status === 'critical' && 'bg-red-500',
                            )} />
                            <span className="text-sm font-medium truncate max-w-[140px]">{product.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{product.sales} sold</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Fulfillment Rate</span>
                          <span className="font-semibold">{stats.fulfillmentRate}%</span>
                        </div>
                        <Progress value={stats.fulfillmentRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Avg Delivery Time</span>
                          <span className="font-semibold">{stats.avgDeliveryTime} min</span>
                        </div>
                        <Progress value={100 - stats.avgDeliveryTime} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Section */}
          {activeSection === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products..." className="pl-10 w-64" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Stock Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">SKU</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stock</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sales</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topProducts.map((product, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <Pill className="h-5 w-5 text-emerald-600" />
                                </div>
                                <p className="font-medium">{product.name}</p>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">SKU-{1000 + i}</td>
                            <td className="p-4 font-medium">{product.stock}</td>
                            <td className="p-4 text-muted-foreground">{product.sales} units</td>
                            <td className="p-4">
                              <Badge className={cn(
                                product.status === 'good' && 'bg-green-100 text-green-700',
                                product.status === 'low' && 'bg-amber-100 text-amber-700',
                                product.status === 'critical' && 'bg-red-100 text-red-700',
                              )}>
                                {product.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button variant="ghost" size="sm">Restock</Button>
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

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Pharmacy Settings</CardTitle>
                  <CardDescription>Manage your pharmacy preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">On Duty Mode</Label>
                      <p className="text-sm text-muted-foreground">Show as available for prescriptions</p>
                    </div>
                    <Switch checked={isOnDuty} onCheckedChange={setIsOnDuty} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Accept Online Orders</Label>
                      <p className="text-sm text-muted-foreground">Allow customers to order online</p>
                    </div>
                    <Switch checked={acceptingOrders} onCheckedChange={setAcceptingOrders} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Delivery Service</Label>
                      <p className="text-sm text-muted-foreground">Enable home delivery</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Allow Patient Messages</Label>
                      <p className="text-sm text-muted-foreground">Receive direct messages from patients</p>
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
                        <Label>New Prescription Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified for new prescriptions</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>Low Stock Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Placeholder sections */}
          {['prescriptions', 'orders', 'delivery', 'analytics', 'finances'].includes(activeSection) && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  {activeSection === 'prescriptions' && <FileText className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'orders' && <ShoppingCart className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'delivery' && <Truck className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'analytics' && <BarChart2 className="h-8 w-8 text-slate-400" />}
                  {activeSection === 'finances' && <Banknote className="h-8 w-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {sidebarItems.find(i => i.id === activeSection)?.label}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Manage all your {activeSection.replace('-', ' ')} from this section.
                </p>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
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

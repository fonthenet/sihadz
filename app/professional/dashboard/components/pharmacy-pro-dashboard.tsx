'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EditableAvatar } from '@/components/editable-avatar'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  LogOut, Home, ChevronLeft, Clipboard, Banknote, BarChart2, Box,
  Layers, QrCode, Scan, Receipt, AlertTriangle, ThermometerSun,
  PackageCheck, PackageX, Send, Archive, ArrowLeft, Paperclip, CheckCheck,
  Phone, Video, BellOff, Trash2, User,   Stethoscope, FlaskConical, Building2
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'
import PharmacyPrescriptions from './pharmacy-prescriptions'
import { EmployeeManagement } from '@/app/professional/settings/components/employee-management'
import { RoleEditor } from '@/app/professional/settings/components/role-editor'
import { InventoryDashboard } from './inventory'
import POSUnified from './pos/pos-unified'
import WarehouseManagement from './pos/warehouse-management'
import { PurchaseOrders, OrdersSection } from './pos'
import { ChifaManagement, AccountingDashboard, OrdonnancierManagement, B2BManagement } from './pharmacy'
import { AvailabilityCalendar } from './availability-calendar'
import { ProDocumentsSection } from './pro-documents-section'
import { SuppliersSection } from './suppliers-section'

interface PharmacyProDashboardProps {
  professional: any
  profile: any
  authUserId?: string | null
  avatarUrl?: string | null
  onAvatarUpdate?: () => void
  onSignOut: () => void
  onProfessionalUpdate?: () => void
  initialSection?: string
  employeePermissions?: Record<string, Record<string, boolean>> | null
  employeeUsername?: string | null
}

/** Pharmacy section id -> permission key(s); any true grants access. Only sections relevant to pharmacy (no lab tests). */
const PHARMACY_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  schedule: ['overview', 'pos'],
  pos: ['pos'],
  prescriptions: ['prescriptions'],
  orders: ['orders'],
  messages: ['messages'],
  inventory: ['inventory'],
  warehouses: ['inventory'],
  'purchase-orders': ['orders', 'inventory'],
  ordonnancier: ['inventory', 'pos'], // Controlled substances register
  chifa: ['chifa'],
  accounting: ['finances'],
  b2b: ['finances'], // B2B invoicing
  delivery: ['delivery'],
  analytics: ['analytics'],
  finances: ['finances'],
  documents: ['documents'],
  suppliers: ['orders', 'inventory'], // Supplier management
  settings: ['settings'],
}

function canAccessPharmacySection(perms: Record<string, boolean> | null | undefined, sectionId: string): boolean {
  if (!perms) return true
  const keys = PHARMACY_SECTION_PERMISSIONS[sectionId]
  if (!keys) return true
  return keys.some(k => perms[k] === true)
}

const PHARMACY_SECTION_IDS = ['overview', 'schedule', 'pos', 'prescriptions', 'orders', 'messages', 'inventory', 'warehouses', 'purchase-orders', 'ordonnancier', 'chifa', 'accounting', 'b2b', 'delivery', 'analytics', 'finances', 'suppliers', 'settings'] as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Empty chart data when no real data (no fake/seed numbers)
const emptySalesData = [
  { month: 'Jan', sales: 0 }, { month: 'Feb', sales: 0 }, { month: 'Mar', sales: 0 },
  { month: 'Apr', sales: 0 }, { month: 'May', sales: 0 }, { month: 'Jun', sales: 0 },
]
const emptyOrderSources = [{ name: 'No data yet', value: 100, color: '#94a3b8' }]

export function PharmacyProDashboard({ professional, authUserId, avatarUrl, onAvatarUpdate, onSignOut, onProfessionalUpdate, initialSection = 'overview', employeePermissions, employeeUsername }: PharmacyProDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [isOnDuty, setIsOnDuty] = useState(true)
  const [demoDataPresent, setDemoDataPresent] = useState(false)
  const [demoClearLoading, setDemoClearLoading] = useState(false)
  const [acceptingOrders, setAcceptingOrders] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [recentThreads, setRecentThreads] = useState<any[]>([])
  const [salesChartData, setSalesChartData] = useState(emptySalesData)
  const [orderSourceChart, setOrderSourceChart] = useState(emptyOrderSources)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = createBrowserClient()

  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingPrescriptions: 0,
    deliveryQueue: 0,
    lowStockItems: 0,
    monthlyRevenue: 0,
    revenueGrowth: null as number | null,
    rating: 0,
    reviewCount: 0,
    fulfillmentRate: 0,
    avgDeliveryTime: 0,
    yesterdayOrders: 0,
  })

  const dashPerms = employeePermissions?.dashboard

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection)
  }, [initialSection])

  // When employee permissions apply, redirect to first allowed section if current is not allowed
  const allowedSectionIds = useMemo(() => {
    if (!dashPerms) return null
    return PHARMACY_SECTION_IDS.filter(id => canAccessPharmacySection(dashPerms, id))
  }, [dashPerms])
  useEffect(() => {
    if (!allowedSectionIds || allowedSectionIds.length === 0) return
    if (!allowedSectionIds.includes(activeSection)) {
      setActiveSection(allowedSectionIds[0])
    }
  }, [allowedSectionIds, activeSection])

  // Sync section to URL so refresh preserves the current view
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const current = params.get('section')
    if (activeSection === 'overview' && !current) return
    if (activeSection === current) return
    if (activeSection === 'overview') {
      params.delete('section')
    } else {
      params.set('section', activeSection)
    }
    const q = params.toString()
    const url = '/professional/dashboard' + (q ? '?' + q : '')
    router.replace(url, { scroll: false })
  }, [activeSection, router])

  useEffect(() => {
    loadDashboardData()
    loadRecentThreads()
  }, [professional])

  useAutoRefresh(() => {
    loadDashboardData()
    loadRecentThreads()
  }, 60_000, { enabled: !!professional })

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      onProfessionalUpdate?.()
      await loadDashboardData()
      await loadRecentThreads()
    } finally {
      setIsRefreshing(false)
    }
  }, [professional?.id, onProfessionalUpdate])

  useEffect(() => {
    if (activeSection === 'settings') {
      fetch('/api/demo', { credentials: 'include' })
        .then((r) => r.ok ? r.json() : { active: false })
        .then((d) => setDemoDataPresent(!!d.active))
        .catch(() => setDemoDataPresent(false))
    }
  }, [activeSection])

  const handleClearDemoData = async () => {
    setDemoClearLoading(true)
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to clear demo data')
      setDemoDataPresent(false)
      toast({ title: 'Demo data cleared', description: 'All sample data has been removed.' })
      if (res.ok) loadDashboardData()
    } catch (err: any) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setDemoClearLoading(false)
    }
  }

  const loadDashboardData = async () => {
    if (!professional?.id) return
    const supabase = createBrowserClient()
    
    const [prescRes, posRes] = await Promise.all([
      supabase
        .from('prescriptions')
        .select('*, doctor:professionals!prescriptions_doctor_id_fkey(business_name), patient:profiles!prescriptions_patient_id_fkey(full_name)')
        .eq('pharmacy_id', professional.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('pos_sales')
        .select('total_amount, created_at, status')
        .eq('pharmacy_id', professional.id)
        .eq('status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString())
    ])
    const prescList = prescRes.data || []
    const posSales = posRes.data || []
    if (prescList.length) setPrescriptions(prescList)

    // Compute real stats from prescriptions + POS sales
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]

    const pendingStatuses = ['sent_to_pharmacy', 'processing', 'received', 'sent', 'pending']
    const completedStatuses = ['ready', 'dispensed', 'collected', 'picked_up', 'delivered']

    const pendingPrescriptions = (prescList || []).filter((p: any) =>
      pendingStatuses.includes((p.status || '').toLowerCase()) || !completedStatuses.includes((p.status || '').toLowerCase())
    ).length

    const todayPresc = (prescList || []).filter((p: any) =>
      (p.created_at || '').startsWith(today)
    )
    const todayPos = posSales.filter((s: any) => (s.created_at || '').startsWith(today))
    const yesterdayPresc = (prescList || []).filter((p: any) =>
      (p.created_at || '').startsWith(yesterday)
    )
    const yesterdayPos = posSales.filter((s: any) => (s.created_at || '').startsWith(yesterday))

    const monthPresc = (prescList || []).filter((p: any) => {
      const d = (p.created_at || '').slice(0, 10)
      return d >= monthStart && d <= today && completedStatuses.includes((p.status || '').toLowerCase())
    })
    const lastMonthPresc = (prescList || []).filter((p: any) => {
      const d = (p.created_at || '').slice(0, 10)
      return d >= lastMonthStart && d <= lastMonthEnd && completedStatuses.includes((p.status || '').toLowerCase())
    })

    let monthlyRevenue = 0
    monthPresc.forEach((p: any) => { monthlyRevenue += Number(p.total_price || 0) })
    posSales.forEach((s: any) => {
      const d = (s.created_at || '').slice(0, 10)
      if (d >= monthStart && d <= today) monthlyRevenue += Number(s.total_amount || 0)
    })
    let lastMonthRevenue = 0
    lastMonthPresc.forEach((p: any) => { lastMonthRevenue += Number(p.total_price || 0) })
    posSales.forEach((s: any) => {
      const d = (s.created_at || '').slice(0, 10)
      if (d >= lastMonthStart && d <= lastMonthEnd) lastMonthRevenue += Number(s.total_amount || 0)
    })
    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
      : null

    // Build chart data from real prescriptions (last 6 months) - use revenue when completed
    const byMonth: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
      const k = MONTHS[d.getMonth()]
      byMonth[k] = 0
    }
    ;(prescList || []).forEach((p: any) => {
      const created = (p.created_at || '').slice(0, 7)
      if (!created) return
      try {
        const d = new Date(created + '-01')
        const k = MONTHS[d.getMonth()]
        if (byMonth[k] !== undefined && completedStatuses.includes((p.status || '').toLowerCase())) {
          byMonth[k] += Number(p.total_price || 0)
        }
      } catch (_) {}
    })
    posSales.forEach((s: any) => {
      const created = (s.created_at || '').slice(0, 7)
      if (!created) return
      try {
        const d = new Date(created + '-01')
        const k = MONTHS[d.getMonth()]
        if (byMonth[k] !== undefined) byMonth[k] += Number(s.total_amount || 0)
      } catch (_) {}
    })
    setSalesChartData(Object.entries(byMonth).map(([month, sales]) => ({ month, sales })))

    // Order sources: simplified - all from prescriptions (no walk-in/delivery split without that data)
    if ((prescList || []).length > 0) {
      setOrderSourceChart([
        { name: 'Prescriptions', value: 100, color: '#7c3aed' },
      ])
    } else {
      setOrderSourceChart(emptyOrderSources)
    }

    setStats({
      todayOrders: todayPresc.length + todayPos.length,
      pendingPrescriptions: pendingPrescriptions,
      deliveryQueue: 0,
      lowStockItems: 0,
      monthlyRevenue,
      revenueGrowth,
      rating: Number(professional?.rating) || 0,
      reviewCount: Number(professional?.review_count) || 0,
      fulfillmentRate: (prescList || []).length > 0
        ? Math.round(((prescList || []).filter((p: any) => completedStatuses.includes((p.status || '').toLowerCase())).length / (prescList || []).length) * 100)
        : 0,
      avgDeliveryTime: 0,
      yesterdayOrders: yesterdayPresc.length + yesterdayPos.length,
    })
  }

  const loadRecentThreads = async () => {
    if (!professional?.id) return
    
    setLoadingThreads(true)
    try {
      // Get pharmacy's auth_user_id
      const { data: pharmacyProf } = await supabase
        .from('professionals')
        .select('auth_user_id')
        .eq('id', professional.id)
        .single()

      if (!pharmacyProf?.auth_user_id) {
        setLoadingThreads(false)
        return
      }

      // Get threads where pharmacy is a member
      const { data: memberships } = await supabase
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', pharmacyProf.auth_user_id)
        .is('left_at', null)

      if (!memberships || memberships.length === 0) {
        setRecentThreads([])
        setLoadingThreads(false)
        return
      }

      const threadIds = memberships.map(m => m.thread_id)
      
      // Get threads with order_type = 'prescription' (prescription-related conversations)
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id, title, order_type, order_id, metadata, updated_at')
        .in('id', threadIds)
        .eq('order_type', 'prescription')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (!threads) {
        setRecentThreads([])
        setLoadingThreads(false)
        return
      }

      // Get last message for each thread
      const enrichedThreads = await Promise.all(
        threads.map(async (thread) => {
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('id, content, created_at, sender_id')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Get doctor info from metadata or thread
          let doctorName = 'Doctor'
          if (thread.metadata?.doctor_id) {
            const { data: doctor } = await supabase
              .from('professionals')
              .select('business_name')
              .eq('id', thread.metadata.doctor_id)
              .single()
            if (doctor?.business_name) {
              doctorName = doctor.business_name
            }
          }

          return {
            ...thread,
            lastMessage: lastMsg,
            doctorName,
          }
        })
      )

      setRecentThreads(enrichedThreads)
      
      // Update unread count (simple: count threads with recent updates)
      const recentCount = enrichedThreads.filter(t => {
        if (!t.lastMessage) return false
        const msgTime = new Date(t.lastMessage.created_at).getTime()
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000
        return msgTime > dayAgo
      }).length
      setUnreadMessages(recentCount)
    } catch (error) {
      console.error('Error loading recent threads:', error)
    } finally {
      setLoadingThreads(false)
    }
  }

  const allSidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'schedule', label: 'Schedule', icon: Calendar, badge: null },
    { id: 'pos', label: 'Point of Sale', icon: Receipt, badge: null },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, badge: stats.pendingPrescriptions },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: stats.todayOrders },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: stats.lowStockItems },
    { id: 'warehouses', label: 'Warehouses', icon: Layers, badge: null },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: Clipboard, badge: null },
    { id: 'ordonnancier', label: 'Ordonnancier', icon: AlertTriangle, badge: null },
    { id: 'chifa', label: 'Chifa / CNAS', icon: Stethoscope, badge: null },
    { id: 'accounting', label: 'Accounting', icon: BarChart3, badge: null },
    { id: 'b2b', label: 'B2B / Crédit', icon: Building2, badge: null },
    { id: 'delivery', label: 'Delivery', icon: Truck, badge: stats.deliveryQueue },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { id: 'finances', label: 'Finances', icon: Banknote, badge: null },
    { id: 'settings', label: 'Settings', icon: Cog, badge: null },
  ]
  const sidebarItems = dashPerms
    ? allSidebarItems.filter(item => canAccessPharmacySection(dashPerms, item.id))
    : allSidebarItems

  const quickActions = [
    { label: 'Process Order', icon: CheckCircle, color: 'bg-emerald-500', action: () => {} },
    { label: 'Scan Prescription', icon: Scan, color: 'bg-cyan-500', action: () => {} },
    { label: 'Add Stock', icon: Package, color: 'bg-violet-500', action: () => {} },
    { label: 'New Delivery', icon: Truck, color: 'bg-amber-500', action: () => {} },
  ]

  // Messages section - render directly like patient page (no extra wrappers)
  if (activeSection === 'messages' && authUserId) {
    return (
      <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
        <EmbeddedChat
          userId={authUserId}
          userName={professional?.business_name || 'User'}
          userAvatar={avatarUrl || undefined}
          userType={professional?.type || 'pharmacy'}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950">
      {/* Main Content - sidebar is provided by layout (ProDashboardSidebar) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
              <SelectTrigger className="w-[180px] min-h-10 bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleRefresh} className="bg-transparent" disabled={isRefreshing} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto py-6 px-0">
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
                <Card 
                  className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('orders')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Today's Orders</p>
                        <p className="text-4xl font-bold mt-2">{stats.todayOrders}</p>
                        {stats.yesterdayOrders != null && stats.yesterdayOrders > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>{stats.todayOrders >= stats.yesterdayOrders
                              ? `+${stats.todayOrders - stats.yesterdayOrders} from yesterday`
                              : `${stats.todayOrders - stats.yesterdayOrders} from yesterday`}</span>
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('prescriptions')}
                >
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

                <Card 
                  className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('finances')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-violet-100 text-sm font-medium">Monthly Revenue</p>
                        <p className="text-4xl font-bold mt-2">
                          {stats.monthlyRevenue >= 1000000
                            ? `${(stats.monthlyRevenue / 1000000).toFixed(1)}M`
                            : stats.monthlyRevenue >= 1000
                              ? `${(stats.monthlyRevenue / 1000).toFixed(1)}K`
                              : stats.monthlyRevenue}
                        </p>
                        {stats.revenueGrowth != null && stats.revenueGrowth !== 0 && (
                          <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>{stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}% vs last month</span>
                          </div>
                        )}
                      </div>
                      <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setActiveSection('inventory')}
                >
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
                        <AreaChart data={salesChartData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000000 ? `${v/1000000}M` : v >= 1000 ? `${v/1000}K` : String(v)} />
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
                            data={orderSourceChart}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={5}
                          >
                            {orderSourceChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-2">
                      {orderSourceChart.map((source) => (
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
                {/* Recent Messages - Quick Access */}
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-cyan-600" />
                        Recent Messages
                      </CardTitle>
                      <CardDescription>Prescription conversations</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-cyan-600 hover:text-cyan-700"
                      onClick={() => setActiveSection('messages')}
                    >
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingThreads ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" className="text-muted-foreground" />
                      </div>
                    ) : recentThreads.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent messages</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentThreads.map((thread) => (
                          <div
                            key={thread.id}
                            onClick={() => {
                              setActiveSection('messages')
                            }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                          >
                            <div className="h-10 w-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {thread.doctorName || thread.title || 'Prescription'}
                              </p>
                              {thread.lastMessage && (
                                <p className={`text-xs truncate mt-1 ${((thread.lastMessage.content || '').toLowerCase().includes('declined') || (thread.lastMessage.content || '').toLowerCase().includes('denied')) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                                  {thread.lastMessage.content || 'Attachment'}
                                </p>
                              )}
                              {thread.lastMessage && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(thread.lastMessage.created_at).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Prescriptions */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Pending Prescriptions</CardTitle>
                      <CardDescription>{stats.pendingPrescriptions} awaiting processing</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-emerald-600 hover:text-emerald-700"
                      onClick={() => setActiveSection('prescriptions')}
                    >
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const pendingStatuses = ['sent_to_pharmacy', 'processing', 'received', 'sent', 'pending']
                        const completedStatuses = ['ready', 'dispensed', 'collected', 'picked_up', 'delivered']
                        const pendingList = prescriptions.filter((p: any) =>
                          pendingStatuses.includes((p.status || '').toLowerCase()) || !completedStatuses.includes((p.status || '').toLowerCase())
                        )
                        return pendingList.length > 0 ? pendingList.slice(0, 5).map((rx, i) => (
                        <div 
                          key={rx.id || i} 
                          role="button"
                          tabIndex={0}
                          className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                          onClick={() => setActiveSection('prescriptions')}
                          onKeyDown={(e) => e.key === 'Enter' && setActiveSection('prescriptions')}
                        >
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
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-transparent hover:bg-cyan-50 hover:text-cyan-600"
                              onClick={() => {
                                setActiveSection('prescriptions')
                              }}
                              title="Open Messages"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              Process
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending prescriptions</p>
                        </div>
                      )
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products & Alerts - no inventory data without real stock tracking */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Top Products</CardTitle>
                      <CardDescription>Inventory tracking not configured</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-6 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No inventory data yet</p>
                      </div>
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
                          <span className="font-semibold">{stats.avgDeliveryTime > 0 ? `${stats.avgDeliveryTime} min` : '—'}</span>
                        </div>
                        <Progress value={stats.avgDeliveryTime > 0 ? Math.min(100 - stats.avgDeliveryTime, 100) : 0} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Section */}
          {activeSection === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Manage your pharmacy hours, holidays, and Ramadan schedule</p>
                <Button variant="outline" onClick={() => router.push('/professional/dashboard/settings?tab=practice')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </div>
              <AvailabilityCalendar professional={professional} />
            </div>
          )}

          {/* POS Section (unified: sales + cash management) */}
          {activeSection === 'pos' && (
            <POSUnified 
              professionalName={professional?.business_name}
              employeeUsername={employeeUsername}
            />
          )}

          {/* Warehouses Section */}
          {activeSection === 'warehouses' && (
            <WarehouseManagement />
          )}

          {/* Purchase Orders Section */}
          {activeSection === 'purchase-orders' && (
            <PurchaseOrders />
          )}

          {/* Inventory Section */}
          {activeSection === 'inventory' && (
            <InventoryDashboard />
          )}

          {/* Ordonnancier (Controlled Substances Register) Section */}
          {activeSection === 'ordonnancier' && (
            <OrdonnancierManagement professional={professional} />
          )}

          {/* Chifa / CNAS Section */}
          {activeSection === 'chifa' && (
            <ChifaManagement />
          )}

          {/* Accounting Section */}
          {activeSection === 'accounting' && (
            <AccountingDashboard />
          )}

          {/* B2B Invoicing Section */}
          {activeSection === 'b2b' && (
            <B2BManagement professional={professional} />
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <ProDocumentsSection professionalId={professional?.id} />
          )}

          {/* Suppliers Section */}
          {activeSection === 'suppliers' && (
            <SuppliersSection
              professionalId={professional?.id}
              professionalType={professional?.type}
            />
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              {/* Clear demo data - only shown if legacy demo data exists */}
              {demoDataPresent && (
                <Card className="shadow-sm border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-amber-600" />
                      Remove sample data
                    </CardTitle>
                    <CardDescription>
                      Legacy sample data (SEED-*) was found. Remove it to keep only real data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={handleClearDemoData}
                      disabled={demoClearLoading}
                    >
                      {demoClearLoading ? <LoadingSpinner size="sm" className="me-2" /> : null}
                      Clear sample data
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>POS Settings</CardTitle>
                  <CardDescription>Configure your point of sale system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Auto-Open Cash Drawer</Label>
                      <p className="text-sm text-muted-foreground">Automatically open drawer after each sale</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

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

              {/* Employee Management */}
              <EmployeeManagement professional={professional} />

              {/* Roles & Permissions */}
              <RoleEditor professional={professional} />
            </div>
          )}

          {/* Messages Section - uses the same chat widget as the floating widget */}
          {/* Prescriptions Section */}
          {activeSection === 'prescriptions' && professional?.id && (
            <div className="p-6">
              <PharmacyPrescriptions pharmacyId={professional.id} />
            </div>
          )}

          {/* Orders Section - Full Sales History */}
          {activeSection === 'orders' && (
            <OrdersSection />
          )}

          {/* Placeholder sections */}
          {['delivery', 'analytics', 'finances'].includes(activeSection) && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
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

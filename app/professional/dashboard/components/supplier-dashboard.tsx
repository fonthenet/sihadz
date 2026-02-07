'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SupplierOrderDetailSheet } from './supplier-order-detail-sheet'
import { SupplierAuditTrail } from './supplier-audit-trail'
import { BackupSettings } from '@/components/backup'
import { PrivacySecuritySettings } from '@/components/settings/privacy-security-settings'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { addToSyncQueue, isOnline, cacheSet, cacheGet } from '@/lib/offline-sync'
import { parseCsv, csvRowToProduct } from '@/lib/supplier/csv-parser'
import { parseExcel, excelRowsToProducts } from '@/lib/supplier/excel-parser'

// Icons
import {
  Package, ShoppingCart, FileText, Users, Settings, MessageCircle,
  LayoutDashboard, Plus, Search, Filter, MoreHorizontal, MoreVertical,
  TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle, XCircle,
  Truck, AlertCircle, Eye, Edit, Trash2, Send, RefreshCw,
  Building2, Phone, Mail, MapPin, Calendar, CreditCard, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Bell, Warehouse, Box, BarChart3,
  ChevronRight, MessageSquare, Link2, Unlink, Timer, CircleDollarSign,
  PackageCheck, PackageX, CalendarClock, Activity, Zap, Target,
  ClipboardList, FileSpreadsheet, Upload, Download, Tag, Layers, ClipboardCheck
} from 'lucide-react'

// Types
import type {
  SupplierProduct,
  SupplierPurchaseOrder,
  SupplierInvoice,
  SupplierBuyerLink,
  SupplierStats,
} from '@/lib/supplier/types'
import { getStatusBadgeClassName } from '@/lib/status-colors'

interface SupplierDashboardProps {
  authUserId?: string | null
  professional: {
    id: string
    auth_user_id?: string | null
    business_name: string
    type: string
    email?: string
    phone?: string
  }
  profile: {
    id: string
    full_name?: string
  }
  authUserId?: string | null
  avatarUrl?: string | null
  onSignOut: () => void
  initialSection?: string
  employeePermissions?: Record<string, Record<string, boolean>> | null
}

// Inventory alert type
interface InventoryAlert {
  id: string
  type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired'
  product: SupplierProduct
  message: string
  severity: 'critical' | 'warning' | 'info'
  quantity?: number
  reorder_point?: number
  expiry_date?: string
}

// Order pipeline stage
interface PipelineStage {
  id: string
  label: string
  count: number
  color: string
  icon: React.ReactNode
}

export default function SupplierDashboard({
  authUserId,
  professional,
  profile,
  avatarUrl,
  onSignOut,
  initialSection = 'overview',
}: SupplierDashboardProps) {
  const { language, dir } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { toast } = useToast()

  // Active section from URL
  const urlSection = searchParams.get('section')
  const activeSection = urlSection || initialSection

  // Core data state
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [orders, setOrders] = useState<SupplierPurchaseOrder[]>([])
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [buyers, setBuyers] = useState<SupplierBuyerLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Order management state - sorting, grouping, filtering
  const [orderSortBy, setOrderSortBy] = useState<'date' | 'total' | 'buyer' | 'status'>('date')
  const [orderSortDir, setOrderSortDir] = useState<'asc' | 'desc'>('desc')
  const [orderGroupBy, setOrderGroupBy] = useState<'none' | 'buyer' | 'date' | 'status'>('none')
  const [orderDateRange, setOrderDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<any>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Advanced tools state
  const [buyerGroups, setBuyerGroups] = useState<any[]>([])
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [warehouseStock, setWarehouseStock] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)

  // Dialog states
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [showBuyerDialog, setShowBuyerDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showStockAdjustDialog, setShowStockAdjustDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SupplierPurchaseOrder | null>(null)
  const [selectedBuyer, setSelectedBuyer] = useState<SupplierBuyerLink | null>(null)
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null)
  const [productForStockAdjust, setProductForStockAdjust] = useState<SupplierProduct | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string; supplier_type: string; requires_expiry?: boolean }[]>([])
  const [productForm, setProductForm] = useState({
    name: '', sku: '', barcode: '', name_fr: '', name_ar: '',
    description: '', dci_code: '', generic_name: '', form: '', dosage: '', packaging: '',
    category_id: '', manufacturer: '', country_of_origin: '',
    unit_price: 0, min_order_qty: 1, pack_size: 1,
    bulk_discount_qty: '', bulk_discount_percent: '',
    is_chifa_listed: false, reimbursement_rate: 0,
    requires_prescription: false, is_controlled: false,
    in_stock: true, stock_quantity: '', reorder_point: '',
    lead_time_days: 1, expiry_date: '',
    is_active: true, is_featured: false,
  })
  const [stockAdjustQty, setStockAdjustQty] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'xlsx'>('json')
  const [savingProduct, setSavingProduct] = useState(false)
  const [importing, setImporting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [inventoryTab, setInventoryTab] = useState('products')

  // Computed: Inventory alerts
  const inventoryAlerts = useMemo((): InventoryAlert[] => {
    const alerts: InventoryAlert[] = []
    
    products.forEach(product => {
      // Out of stock
      if (!product.in_stock || (product.stock_quantity !== undefined && product.stock_quantity <= 0)) {
        alerts.push({
          id: `out-${product.id}`,
          type: 'out_of_stock',
          product,
          message: `${product.name} is out of stock`,
          severity: 'critical',
          quantity: product.stock_quantity || 0,
        })
      }
      // Low stock (below reorder point)
      else if (product.reorder_point && product.stock_quantity && product.stock_quantity <= product.reorder_point) {
        alerts.push({
          id: `low-${product.id}`,
          type: 'low_stock',
          product,
          message: `${product.name} is running low (${product.stock_quantity} left)`,
          severity: 'warning',
          quantity: product.stock_quantity,
          reorder_point: product.reorder_point,
        })
      }
      // Expiring soon (within 30 days)
      if (product.expiry_date) {
        const expiryDate = new Date(product.expiry_date)
        const today = new Date()
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilExpiry < 0) {
          alerts.push({
            id: `expired-${product.id}`,
            type: 'expired',
            product,
            message: `${product.name} has expired`,
            severity: 'critical',
            expiry_date: product.expiry_date,
          })
        } else if (daysUntilExpiry <= 30) {
          alerts.push({
            id: `expiring-${product.id}`,
            type: 'expiring_soon',
            product,
            message: `${product.name} expires in ${daysUntilExpiry} days`,
            severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
            expiry_date: product.expiry_date,
          })
        }
      }
    })

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }, [products])

  // Computed: Order pipeline stages
  const orderPipeline = useMemo((): PipelineStage[] => {
    const stages = [
      { id: 'submitted', label: 'New Orders', count: 0, color: 'bg-blue-500', icon: <ClipboardList className="h-4 w-4" /> },
      { id: 'pending_buyer_review', label: 'Pending Review', count: 0, color: 'bg-amber-500', icon: <Edit className="h-4 w-4" /> },
      { id: 'confirmed', label: 'Confirmed', count: 0, color: 'bg-emerald-500', icon: <CheckCircle className="h-4 w-4" /> },
      { id: 'processing', label: 'Processing', count: 0, color: 'bg-amber-500', icon: <Package className="h-4 w-4" /> },
      { id: 'shipped', label: 'Shipped', count: 0, color: 'bg-purple-500', icon: <Truck className="h-4 w-4" /> },
      { id: 'delivered', label: 'Delivered', count: 0, color: 'bg-green-500', icon: <PackageCheck className="h-4 w-4" /> },
    ]
    
    orders.forEach(order => {
      const stage = stages.find(s => s.id === order.status)
      if (stage) stage.count++
    })

    return stages
  }, [orders])

  // Computed: Pending link requests
  const pendingLinkRequests = useMemo(() => {
    return buyers.filter(b => b.status === 'pending' && b.requested_by === 'buyer')
  }, [buyers])

  // Computed: Recent activity
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string
      type: 'order' | 'invoice' | 'buyer' | 'product'
      message: string
      timestamp: string
      icon: React.ReactNode
      color: string
    }> = []

    // Recent orders
    orders.slice(0, 5).forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        type: 'order',
        message: `New order ${order.order_number} from ${order.buyer?.business_name || 'Unknown'}`,
        timestamp: order.created_at,
        icon: <ShoppingCart className="h-4 w-4" />,
        color: 'text-blue-500',
      })
    })

    // Recent link requests
    pendingLinkRequests.slice(0, 3).forEach(link => {
      activities.push({
        id: `link-${link.id}`,
        type: 'buyer',
        message: `${link.buyer?.business_name || 'A buyer'} wants to connect`,
        timestamp: link.created_at,
        icon: <Link2 className="h-4 w-4" />,
        color: 'text-amber-500',
      })
    })

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8)
  }, [orders, pendingLinkRequests])

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const offline = !isOnline()
      const uid = authUserId ?? professional?.auth_user_id ?? null

      if (offline && uid) {
        const [cachedProducts, cachedOrders, cachedStats] = await Promise.all([
          cacheGet<unknown[]>(uid, 'supplier-products'),
          cacheGet<unknown[]>(uid, 'supplier-orders'),
          cacheGet<unknown>(uid, 'supplier-stats'),
        ])
        if (cachedProducts?.length) setProducts(cachedProducts)
        if (cachedOrders?.length) setOrders(cachedOrders)
        if (cachedStats) setStats(cachedStats)
        setLoading(false)
        return
      }

      const statsRes = await fetch('/api/supplier/stats')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
        if (uid) await cacheSet(uid, 'supplier-stats', statsData)
      }

      const productsRes = await fetch('/api/supplier/products?limit=500')
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        const prods = productsData.data || []
        setProducts(prods)
        if (uid) await cacheSet(uid, 'supplier-products', prods)
      }

      const ordersRes = await fetch('/api/supplier/orders?limit=100')
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        const ords = ordersData.data || []
        console.log('[SupplierDashboard] Orders loaded:', ords?.length || 0, 'orders')
        setOrders(ords)
        if (uid) await cacheSet(uid, 'supplier-orders', ords)
      } else {
        console.error('[SupplierDashboard] Failed to load orders:', ordersRes.status)
      }

      // Always load buyers
      const buyersRes = await fetch('/api/supplier/buyers?limit=100')
      if (buyersRes.ok) {
        const buyersData = await buyersRes.json()
        setBuyers(buyersData.data || [])
      }

      // Load invoices if on that section
      if (activeSection === 'invoices' || activeSection === 'overview') {
        const invoicesRes = await fetch('/api/supplier/invoices?limit=50')
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json()
          setInvoices(invoicesData.data || [])
        }
      }

      // Load warehouses if on inventory section
      if (activeSection === 'inventory' || activeSection === 'overview') {
        const warehousesRes = await fetch('/api/supplier/warehouses')
        if (warehousesRes.ok) {
          const warehousesData = await warehousesRes.json()
          setWarehouses(warehousesData.data || [])
        }
      }

      // Load analytics if on that section
      if (activeSection === 'analytics' || activeSection === 'overview') {
        const analyticsRes = await fetch('/api/supplier/analytics?period=month')
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json()
          setAnalytics(analyticsData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeSection, professional?.id, authUserId, professional?.auth_user_id])

  // Load settings
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/supplier/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  // Load data on mount and section change
  useEffect(() => {
    loadData()
    if (activeSection === 'settings') {
      loadSettings()
    }
  }, [activeSection, loadData, loadSettings])

  // Order actions (queued when offline)
  async function handleOrderAction(orderId: string, action: string, data?: Record<string, unknown>) {
    if (!isOnline() && userId) {
      try {
        await addToSyncQueue(userId, {
          type: 'order_action',
          payload: { order_id: orderId, action, ...data },
        })
        toast({ title: 'Queued', description: `Order ${action} will sync when you're back online` })
      } catch (e) {
        toast({ title: 'Error', description: 'Could not queue action', variant: 'destructive' })
      }
      return
    }
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, action, ...data }),
      })
      if (res.ok) {
        toast({ title: 'Success', description: `Order ${action}ed successfully` })
        loadData()
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' })
    }
  }

  // Link actions
  async function handleLinkAction(linkId: string, action: string) {
    try {
      const res = await fetch('/api/supplier/buyers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId, action }),
      })
      if (res.ok) {
        toast({ title: 'Success', description: `Request ${action}d successfully` })
        loadData()
      }
    } catch (error) {
      console.error('Error updating link:', error)
      toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' })
    }
  }

  // Open product dialog (add or edit)
  function openProductDialog(product?: SupplierProduct) {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        name: product.name, sku: product.sku || '', barcode: product.barcode || '',
        name_fr: product.name_fr || '', name_ar: product.name_ar || '',
        description: product.description || '', dci_code: product.dci_code || '',
        generic_name: product.generic_name || '', form: product.form || '',
        dosage: product.dosage || '', packaging: product.packaging || '',
        category_id: product.category_id || '', manufacturer: product.manufacturer || '',
        country_of_origin: product.country_of_origin || '',
        unit_price: product.unit_price, min_order_qty: product.min_order_qty || 1,
        pack_size: product.pack_size || 1,
        bulk_discount_qty: product.bulk_discount_qty?.toString() || '',
        bulk_discount_percent: product.bulk_discount_percent?.toString() || '',
        is_chifa_listed: product.is_chifa_listed || false,
        reimbursement_rate: product.reimbursement_rate || 0,
        requires_prescription: product.requires_prescription || false,
        is_controlled: product.is_controlled || false,
        in_stock: product.in_stock ?? true,
        stock_quantity: product.stock_quantity?.toString() || '',
        reorder_point: (product as any).reorder_point?.toString() || '',
        lead_time_days: product.lead_time_days || 1,
        expiry_date: (product as any).expiry_date ? String((product as any).expiry_date).split('T')[0] : '',
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '', sku: '', barcode: '', name_fr: '', name_ar: '',
        description: '', dci_code: '', generic_name: '', form: '', dosage: '', packaging: '',
        category_id: '', manufacturer: '', country_of_origin: '',
        unit_price: 0, min_order_qty: 1, pack_size: 1,
        bulk_discount_qty: '', bulk_discount_percent: '',
        is_chifa_listed: false, reimbursement_rate: 0,
        requires_prescription: false, is_controlled: false,
        in_stock: true, stock_quantity: '', reorder_point: '',
        lead_time_days: 1, expiry_date: '',
        is_active: true, is_featured: false,
      })
    }
    setShowProductDialog(true)
    fetch('/api/supplier/categories?supplier_type=' + (professional.type || 'pharma_supplier'))
      .then(r => r.ok ? r.json() : [])
      .then(setCategories)
  }

  // Save product (create or update)
  async function saveProduct() {
    if (!productForm.name || productForm.unit_price < 0) {
      toast({ title: 'Error', description: 'Name and unit price are required', variant: 'destructive' })
      return
    }
    const selectedCategory = categories.find(c => c.id === productForm.category_id)
    if (selectedCategory?.requires_expiry && !productForm.expiry_date?.trim()) {
      toast({ title: 'Error', description: 'Expiry date is required for medications and other products with expiry', variant: 'destructive' })
      return
    }
    setSavingProduct(true)
    try {
      const payload: Record<string, unknown> = {
        name: productForm.name,
        sku: productForm.sku || undefined,
        barcode: productForm.barcode || undefined,
        name_fr: productForm.name_fr || undefined,
        name_ar: productForm.name_ar || undefined,
        description: productForm.description || undefined,
        dci_code: productForm.dci_code || undefined,
        generic_name: productForm.generic_name || undefined,
        form: productForm.form || undefined,
        dosage: productForm.dosage || undefined,
        packaging: productForm.packaging || undefined,
        category_id: productForm.category_id || undefined,
        manufacturer: productForm.manufacturer || undefined,
        country_of_origin: productForm.country_of_origin || undefined,
        expiry_date: productForm.expiry_date?.trim() || undefined,
        unit_price: Number(productForm.unit_price),
        min_order_qty: Number(productForm.min_order_qty) || 1,
        pack_size: Number(productForm.pack_size) || 1,
        bulk_discount_qty: productForm.bulk_discount_qty ? Number(productForm.bulk_discount_qty) : undefined,
        bulk_discount_percent: productForm.bulk_discount_percent ? Number(productForm.bulk_discount_percent) : undefined,
        is_chifa_listed: productForm.is_chifa_listed,
        reimbursement_rate: productForm.reimbursement_rate,
        requires_prescription: productForm.requires_prescription,
        is_controlled: productForm.is_controlled,
        in_stock: productForm.in_stock,
        stock_quantity: productForm.stock_quantity ? Number(productForm.stock_quantity) : undefined,
        lead_time_days: Number(productForm.lead_time_days) || 1,
        is_active: productForm.is_active,
        is_featured: productForm.is_featured,
      }
      if (editingProduct) {
        const res = await fetch(`/api/supplier/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast({ title: 'Success', description: 'Product updated' })
          setShowProductDialog(false)
          loadData()
        } else {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update')
        }
      } else {
        const res = await fetch('/api/supplier/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast({ title: 'Success', description: 'Product added' })
          setShowProductDialog(false)
          loadData()
        } else {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create')
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save product', variant: 'destructive' })
    } finally {
      setSavingProduct(false)
    }
  }

  // Adjust stock
  async function handleStockAdjust() {
    if (!productForStockAdjust) return
    const qty = parseInt(stockAdjustQty, 10)
    if (isNaN(qty) || qty < 0) {
      toast({ title: 'Error', description: 'Enter a valid quantity', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch(`/api/supplier/products/${productForStockAdjust.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: qty, in_stock: qty > 0 }),
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Stock updated' })
        setShowStockAdjustDialog(false)
        setProductForStockAdjust(null)
        setStockAdjustQty('')
        loadData()
      } else throw new Error('Failed to update')
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' })
    }
  }

  // Delete product
  async function handleDeleteProduct(product: SupplierProduct) {
    if (!confirm(`Delete "${product.name}"?`)) return
    try {
      const res = await fetch(`/api/supplier/products/${product.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Success', description: 'Product removed' })
        loadData()
      } else throw new Error('Failed to delete')
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' })
    }
  }

  // Import products - uses shared CSV/Excel parsers with proper column mapping
  async function handleImport() {
    if (!importFile) {
      toast({ title: 'Error', description: 'Select a file first', variant: 'destructive' })
      return
    }
    setImporting(true)
    try {
      let productsToImport: any[] = []
      const fetchCategoryIdMap = async (): Promise<Record<string, string>> => {
        const map: Record<string, string> = {}
        try {
          const catRes = await fetch('/api/supplier/categories?supplier_type=' + (professional?.type || 'pharma_supplier'))
          if (catRes.ok) {
            const cats = await catRes.json()
            const arr = Array.isArray(cats) ? cats : (cats.data || cats.categories || [])
            arr.forEach((c: { id: string; name: string; name_fr?: string }) => {
              if (c.name) map[c.name.toLowerCase()] = c.id
              if (c.name_fr) map[c.name_fr.toLowerCase()] = c.id
            })
          }
        } catch { /* ignore */ }
        return map
      }

      if (importFormat === 'json') {
        const text = await importFile.text()
        const data = JSON.parse(text)
        productsToImport = Array.isArray(data) ? data : data.products || []
      } else if (importFormat === 'xlsx') {
        const buffer = await importFile.arrayBuffer()
        const { rows, errors } = parseExcel(buffer)
        if (errors.length > 0) throw new Error(errors[0])
        if (rows.length === 0) throw new Error('Excel file has no data rows')
        const categoryIdMap = await fetchCategoryIdMap()
        productsToImport = excelRowsToProducts(rows, categoryIdMap)
      } else {
        const text = await importFile.text()
        const { rows, errors } = parseCsv(text)
        if (errors.length > 0) throw new Error(errors[0])
        if (rows.length === 0) throw new Error('CSV file has no data rows')
        const categoryIdMap = await fetchCategoryIdMap()
        productsToImport = rows.map((row) => csvRowToProduct(row, categoryIdMap))
      }

      const valid = productsToImport.filter((p) => p.name && (p.unit_price ?? 0) > 0)
      if (valid.length === 0) {
        toast({ title: 'Error', description: 'No valid products (name and unit_price required)', variant: 'destructive' })
        setImporting(false)
        return
      }

      const res = await fetch('/api/supplier/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: valid, format: importFormat }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        toast({ title: 'Success', description: `Imported ${result.summary?.success ?? 0} products (${result.summary?.created ?? 0} created, ${result.summary?.updated ?? 0} updated)` })
        setShowImportDialog(false)
        setImportFile(null)
        loadData()
      } else {
        throw new Error(result.error || result.errors?.[0] || 'Import failed')
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Import failed', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  // Export products (JSON, CSV, or Excel)
  function handleExport(format: 'json' | 'csv' | 'xlsx') {
    window.open(`/api/supplier/products/export?format=${format}`, '_blank')
    toast({ title: 'Export started', description: `Downloading ${format.toUpperCase()}...` })
  }

  // Seed 50 test products
  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch('/api/supplier/products/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Success', description: `Added ${data.created} test products` })
        loadData()
      } else throw new Error(data.error || 'Seed failed')
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to seed', variant: 'destructive' })
    } finally {
      setSeeding(false)
    }
  }

  // Save settings
  async function saveSettings() {
    if (!settings) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/supplier/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Settings saved successfully' })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSavingSettings(false)
    }
  }

  const userId = authUserId ?? professional.auth_user_id ?? null
  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener('offline-sync-complete', handler)
    return () => window.removeEventListener('offline-sync-complete', handler)
  }, [loadData])

  // Navigate to section
  const goToSection = (section: string) => {
    router.push(`/professional/dashboard?section=${section}`)
  }

  // Filtered data
  const filteredProducts = useMemo(() => {
    let filtered = products
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'in_stock') {
      filtered = filtered.filter(p => p.in_stock)
    } else if (statusFilter === 'out_of_stock') {
      filtered = filtered.filter(p => !p.in_stock)
    } else if (statusFilter === 'low_stock') {
      filtered = filtered.filter(p => p.reorder_point && p.stock_quantity && p.stock_quantity <= p.reorder_point)
    }
    return filtered
  }, [products, searchQuery, statusFilter])

  const filteredOrders = useMemo(() => {
    let filtered = orders
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.buyer?.business_name?.toLowerCase().includes(q)
      )
    }
    
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }
    
    // Date range filter
    if (orderDateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at)
        if (orderDateRange === 'today') {
          return orderDate >= today
        } else if (orderDateRange === 'week') {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          return orderDate >= weekAgo
        } else if (orderDateRange === 'month') {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          return orderDate >= monthAgo
        }
        return true
      })
    }
    
    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      if (orderSortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (orderSortBy === 'total') {
        comparison = (a.total || 0) - (b.total || 0)
      } else if (orderSortBy === 'buyer') {
        comparison = (a.buyer?.business_name || '').localeCompare(b.buyer?.business_name || '')
      } else if (orderSortBy === 'status') {
        const statusOrder = ['submitted', 'pending_buyer_review', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled']
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      }
      return orderSortDir === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [orders, searchQuery, statusFilter, orderDateRange, orderSortBy, orderSortDir])

  // Group orders by selected criteria
  const groupedOrders = useMemo(() => {
    if (orderGroupBy === 'none') {
      return { 'All Orders': filteredOrders }
    }
    
    const groups: Record<string, SupplierPurchaseOrder[]> = {}
    
    filteredOrders.forEach(order => {
      let key = ''
      if (orderGroupBy === 'buyer') {
        key = order.buyer?.business_name || 'Unknown Buyer'
      } else if (orderGroupBy === 'date') {
        const date = new Date(order.created_at)
        key = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      } else if (orderGroupBy === 'status') {
        key = order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ')
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
    })
    
    return groups
  }, [filteredOrders, orderGroupBy])

  // Toggle order selection
  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }, [])

  // Select all visible orders
  const selectAllOrders = useCallback(() => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set())
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)))
    }
  }, [filteredOrders, selectedOrderIds.size])

  // Bulk order action
  const handleBulkOrderAction = useCallback(async (action: string) => {
    if (selectedOrderIds.size === 0) return
    
    const orderIds = Array.from(selectedOrderIds)
    let successCount = 0
    let failCount = 0
    
    for (const orderId of orderIds) {
      try {
        const res = await fetch('/api/supplier/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, action }),
        })
        if (res.ok) successCount++
        else failCount++
      } catch {
        failCount++
      }
    }
    
    toast({
      title: 'Bulk Action Complete',
      description: `${successCount} succeeded, ${failCount} failed`,
    })
    
    setSelectedOrderIds(new Set())
    loadData()
  }, [selectedOrderIds, toast, loadData])

  const filteredBuyers = useMemo(() => {
    let filtered = buyers
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.buyer?.business_name?.toLowerCase().includes(q)
      )
    }
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter)
    }
    return filtered
  }, [buyers, searchQuery, statusFilter])

  // ==================== RENDER SECTIONS ====================

  // Command Center Overview
  function renderOverview() {
    const criticalAlerts = inventoryAlerts.filter(a => a.severity === 'critical').length
    const warningAlerts = inventoryAlerts.filter(a => a.severity === 'warning').length
    const pendingOrders = orders.filter(o => o.status === 'submitted').length
    const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0)

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold">{(stats?.monthly_revenue || 0).toLocaleString()} DZD</p>
                  {analytics?.sales?.growth_percent !== undefined && (
                    <div className={cn(
                      "flex items-center text-xs mt-1",
                      analytics.sales.growth_percent >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {analytics.sales.growth_percent >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 me-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 me-1" />
                      )}
                      {Math.abs(analytics.sales.growth_percent)}% vs last month
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold">{orders.filter(o => !['completed', 'cancelled', 'delivered'].includes(o.status)).length}</p>
                  {pendingOrders > 0 && (
                    <div className="flex items-center text-xs text-amber-600 mt-1">
                      <AlertCircle className="h-3 w-3 me-1" />
                      {pendingOrders} need attention
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Status</p>
                  <p className="text-2xl font-bold">{products.length} Products</p>
                  {(criticalAlerts > 0 || warningAlerts > 0) && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      {criticalAlerts > 0 && (
                        <span className="text-red-600">{criticalAlerts} critical</span>
                      )}
                      {warningAlerts > 0 && (
                        <span className="text-amber-600">{warningAlerts} warnings</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Buyers</p>
                  <p className="text-2xl font-bold">{buyers.filter(b => b.status === 'active').length}</p>
                  {pendingLinkRequests.length > 0 && (
                    <div className="flex items-center text-xs text-amber-600 mt-1">
                      <Link2 className="h-3 w-3 me-1" />
                      {pendingLinkRequests.length} pending requests
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unpaid Orders Alert */}
        {(stats?.unpaid_orders_count || 0) > 0 && (
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-amber-600" />
                Unpaid Orders — {(stats?.unpaid_amount || 0).toLocaleString()} DZD
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {stats?.unpaid_orders_count} delivered order(s) awaiting payment from {stats?.buyers_with_unpaid} buyer(s). 
                Collect payments and mark orders as paid when received.
              </p>
              <Button variant="outline" size="sm" onClick={() => goToSection('orders')} className="w-fit">
                View Orders <ChevronRight className="h-4 w-4 ms-1" />
              </Button>
            </CardHeader>
          </Card>
        )}

        {/* Alerts & Action Center */}
        {(inventoryAlerts.length > 0 || pendingLinkRequests.length > 0 || pendingOrders > 0) && (
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  Action Center
                  <Badge variant="secondary" className="ms-2">
                    {inventoryAlerts.filter(a => a.severity === 'critical').length + pendingLinkRequests.length + pendingOrders}
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => goToSection('inventory')}>
                  View All <ChevronRight className="h-4 w-4 ms-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Critical inventory alerts */}
                {inventoryAlerts.filter(a => a.severity === 'critical').slice(0, 3).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/50">
                    <div className="flex items-center gap-3">
                      {alert.type === 'out_of_stock' && <PackageX className="h-5 w-5 text-red-500" />}
                      {alert.type === 'low_stock' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                      {alert.type === 'expired' && <CalendarClock className="h-5 w-5 text-red-500" />}
                      {alert.type === 'expiring_soon' && <Timer className="h-5 w-5 text-amber-500" />}
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">SKU: {alert.product.sku || 'N/A'}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => goToSection('inventory')}>
                      Manage
                    </Button>
                  </div>
                ))}

                {/* Pending orders */}
                {orders.filter(o => o.status === 'submitted').slice(0, 2).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-sm">New order: {order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.buyer?.business_name} • {order.total.toLocaleString()} DZD
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOrderAction(order.id, 'reject')}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleOrderAction(order.id, 'confirm')}
                        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500/20 dark:border dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-500/30 dark:shadow-[0_0_15px_rgba(52,211,153,0.4)] dark:hover:shadow-[0_0_20px_rgba(52,211,153,0.6)]"
                      >
                        <CheckCircle className="h-4 w-4 me-1" />
                        Confirm
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pending link requests */}
                {pendingLinkRequests.slice(0, 2).map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium text-sm">{link.buyer?.business_name} wants to connect</p>
                        <p className="text-xs text-muted-foreground capitalize">{link.buyer?.type} • {link.buyer?.wilaya}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLinkAction(link.id, 'reject')}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleLinkAction(link.id, 'approve')}>
                        <CheckCircle className="h-4 w-4 me-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Pipeline */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Order Pipeline</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToSection('orders')}>
                View All <ChevronRight className="h-3 w-3 ms-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-6 gap-1.5">
              {orderPipeline.map((stage) => (
                <div
                  key={stage.id}
                  className={cn(
                    "relative py-2 px-1 rounded-md border text-center cursor-pointer hover:bg-muted/50 transition-colors",
                    stage.count > 0 && "border-primary/50"
                  )}
                  onClick={() => {
                    setStatusFilter(stage.id)
                    goToSection('orders')
                  }}
                >
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1 text-white", stage.color)}>
                    <span className="scale-75">{stage.icon}</span>
                  </div>
                  <p className="text-sm font-semibold leading-none">{stage.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{stage.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => goToSection('orders')}>
                  View All <ChevronRight className="h-4 w-4 ms-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.buyer?.business_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-end">
                          <p className="font-medium text-sm">{order.total.toLocaleString()} DZD</p>
                          <Badge className={cn("text-xs", getStatusBadgeClassName(order.status, 'solid'))}>{order.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Buyers */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Buyers</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => goToSection('buyers')}>
                  View All <ChevronRight className="h-4 w-4 ms-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : buyers.filter(b => b.status === 'active').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active buyers</p>
              ) : (
                <div className="space-y-3">
                  {buyers.filter(b => b.status === 'active').slice(0, 5).map((link, idx) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBuyer(link)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                          {link.buyer?.business_name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{link.buyer?.business_name}</p>
                          <p className="text-xs text-muted-foreground capitalize truncate">{link.buyer?.type} • {link.buyer?.wilaya}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); goToSection('messages') }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => openProductDialog()}>
                <Plus className="h-5 w-5" />
                <span className="text-xs">Add Product</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => goToSection('inventory')}>
                <Package className="h-5 w-5" />
                <span className="text-xs">Manage Stock</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => goToSection('orders')}>
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">View Orders</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => goToSection('analytics')}>
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Analytics</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => goToSection('audit')}>
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-xs">Audit Trail</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Inventory Section
  function renderInventory() {
    const stockLevels = {
      critical: products.filter(p => !p.in_stock || (p.stock_quantity !== undefined && p.stock_quantity <= 0)).length,
      low: products.filter(p => p.in_stock && p.reorder_point && p.stock_quantity && p.stock_quantity <= p.reorder_point && p.stock_quantity > 0).length,
      ok: products.filter(p => p.in_stock && (!p.reorder_point || !p.stock_quantity || p.stock_quantity > p.reorder_point)).length,
    }

    return (
      <div className="space-y-6">
        <Tabs value={inventoryTab} onValueChange={setInventoryTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="import-export">Import & Export</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6 mt-6">
        {/* Stock Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-red-300" onClick={() => setStatusFilter('out_of_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <PackageX className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{stockLevels.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-amber-300" onClick={() => setStatusFilter('low_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-amber-600">{stockLevels.low}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-green-300" onClick={() => setStatusFilter('in_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <PackageCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">{stockLevels.ok}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Alerts */}
        {inventoryAlerts.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Inventory Alerts ({inventoryAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {inventoryAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20 border-red-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {alert.severity === 'critical' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.quantity !== undefined && `Stock: ${alert.quantity}`}
                          {alert.reorder_point && ` | Reorder at: ${alert.reorder_point}`}
                          {alert.expiry_date && ` | Expires: ${new Date(alert.expiry_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeClassName(alert.severity === 'critical' ? 'critical' : 'low', 'solid')}>
                      {alert.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-base">Products ({filteredProducts.length})</CardTitle>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => openProductDialog()}>
                  <Plus className="h-4 w-4 me-2" />
                  Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No products found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.slice(0, 20).map(product => {
                  // Determine stock status
                  let stockStatus: 'critical' | 'low' | 'ok' = 'ok'
                  if (!product.in_stock || (product.stock_quantity !== undefined && product.stock_quantity <= 0)) {
                    stockStatus = 'critical'
                  } else if (product.reorder_point && product.stock_quantity && product.stock_quantity <= product.reorder_point) {
                    stockStatus = 'low'
                  }

                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-2 h-12 rounded-full shrink-0",
                          stockStatus === 'critical' && 'bg-red-500',
                          stockStatus === 'low' && 'bg-amber-500',
                          stockStatus === 'ok' && 'bg-green-500',
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>SKU: {product.sku || 'N/A'}</span>
                            {product.barcode && <span>• {product.barcode}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-end min-w-[100px]">
                          <p className="font-bold">{product.unit_price.toLocaleString()} DZD</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {product.stock_quantity ?? '∞'}
                            {product.reorder_point && ` (min: ${product.reorder_point})`}
                          </p>
                        </div>
                        <Badge className={getStatusBadgeClassName(stockStatus, 'solid')}>
                          {stockStatus === 'critical' ? 'Out' : stockStatus === 'low' ? 'Low' : 'OK'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openProductDialog(product)}>
                              <Edit className="h-4 w-4 me-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setProductForStockAdjust(product)
                              setStockAdjustQty(String(product.stock_quantity ?? 0))
                              setShowStockAdjustDialog(true)
                            }}>
                              <Box className="h-4 w-4 me-2" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProduct(product)}>
                              <Trash2 className="h-4 w-4 me-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warehouses */}
        {warehouses.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Warehouses ({warehouses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map(warehouse => (
                  <Card key={warehouse.id} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{warehouse.name}</p>
                          {warehouse.code && <p className="text-xs text-muted-foreground">{warehouse.code}</p>}
                        </div>
                        {warehouse.is_default && <Badge variant="secondary">Default</Badge>}
                      </div>
                      {warehouse.wilaya && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {warehouse.wilaya}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="import-export" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Import & Export
                </CardTitle>
                <CardDescription>Bulk import products from CSV/JSON or export your catalog</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 me-2" />
                  Import Products
                </Button>
                <Button variant="outline" onClick={() => handleExport('json')}>
                  <Download className="h-4 w-4 me-2" />
                  Export JSON
                </Button>
                <Button variant="outline" onClick={() => handleExport('csv')}>
                  <Download className="h-4 w-4 me-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')}>
                  <Download className="h-4 w-4 me-2" />
                  Export Excel
                </Button>
                <Button variant="secondary" onClick={handleSeed} disabled={seeding}>
                  <Package className="h-4 w-4 me-2" />
                  {seeding ? 'Seeding...' : 'Add 50 Test Products'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Orders Section
  function renderOrders() {
    return (
      <div className="space-y-6">
        {/* Order Pipeline */}
        <div className="grid grid-cols-6 gap-1.5">
          {orderPipeline.map((stage) => (
            <Card
              key={stage.id}
              className={cn(
                "cursor-pointer transition-colors",
                statusFilter === stage.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
              )}
              onClick={() => setStatusFilter(statusFilter === stage.id ? 'all' : stage.id)}
            >
              <CardContent className="py-2 px-1 text-center">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1 text-white", stage.color)}>
                  <span className="scale-75">{stage.icon}</span>
                </div>
                <p className="text-sm font-semibold leading-none">{stage.count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{stage.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search, Filter, Sort, Group Controls */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Row 1: Search and quick filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending_buyer_review">Pending Review</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderDateRange} onValueChange={(v) => setOrderDateRange(v as typeof orderDateRange)}>
                <SelectTrigger className="w-[130px]">
                  <Calendar className="h-4 w-4 me-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Row 2: Sort, Group, Bulk Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-t pt-4">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Select value={orderSortBy} onValueChange={(v) => setOrderSortBy(v as typeof orderSortBy)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setOrderSortDir(orderSortDir === 'asc' ? 'desc' : 'asc')}
                  >
                    {orderSortDir === 'asc' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Group */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Group:</span>
                  <Select value={orderGroupBy} onValueChange={(v) => setOrderGroupBy(v as typeof orderGroupBy)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="buyer">By Buyer</SelectItem>
                      <SelectItem value="date">By Date</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="bulk-mode"
                  checked={showBulkActions}
                  onCheckedChange={setShowBulkActions}
                />
                <Label htmlFor="bulk-mode" className="text-sm cursor-pointer">Bulk Actions</Label>
              </div>
            </div>

            {/* Bulk Action Bar (when enabled) */}
            {showBulkActions && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllOrders}
                >
                  {selectedOrderIds.size === filteredOrders.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedOrderIds.size} selected
                </span>
                {selectedOrderIds.size > 0 && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkOrderAction('confirm')}
                      className="text-emerald-600"
                    >
                      <CheckCircle className="h-4 w-4 me-1" />
                      Confirm All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkOrderAction('ship')}
                      className="text-purple-600"
                    >
                      <Truck className="h-4 w-4 me-1" />
                      Ship All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkOrderAction('mark_paid')}
                      className="text-green-600"
                    >
                      <CircleDollarSign className="h-4 w-4 me-1" />
                      Mark Paid
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders List - Grouped */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedOrders).map(([groupName, groupOrders]) => (
              <div key={groupName} className="space-y-3">
                {/* Group Header */}
                {orderGroupBy !== 'none' && (
                  <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-lg">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{groupName}</span>
                    <Badge variant="secondary" className="text-xs">{groupOrders.length}</Badge>
                    <span className="text-sm text-muted-foreground ms-auto">
                      {groupOrders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()} DZD
                    </span>
                  </div>
                )}
                
                {/* Orders in Group */}
                {groupOrders.map(order => (
              <Card key={order.id} className={cn(
                "hover:shadow-md transition-shadow",
                selectedOrderIds.has(order.id) && "ring-2 ring-primary"
              )}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox for bulk selection */}
                      {showBulkActions && (
                        <div
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shrink-0 mt-1",
                            selectedOrderIds.has(order.id)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 hover:border-primary"
                          )}
                          onClick={() => toggleOrderSelection(order.id)}
                        >
                          {selectedOrderIds.has(order.id) && <CheckCircle className="h-3 w-3" />}
                        </div>
                      )}
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{order.order_number}</p>
                          <Badge className={getStatusBadgeClassName(order.status, 'solid')}>{order.status.replace(/_/g, ' ')}</Badge>
                          {order.paid_at && <Badge variant="outline" className="text-green-600 border-green-600">Paid</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{order.buyer?.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} items
                          {order.expected_delivery_date && (
                            <> • <span className="text-amber-600">Due: {new Date(order.expected_delivery_date).toLocaleDateString()}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-end">
                        <p className="font-bold text-lg">{order.total.toLocaleString()} DZD</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === 'submitted' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                              <Edit className="h-4 w-4 me-1" />
                              Edit Order
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOrderAction(order.id, 'reject')}>
                              Reject
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleOrderAction(order.id, 'confirm')}
                              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500/20 dark:border dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-500/30 dark:shadow-[0_0_15px_rgba(52,211,153,0.4)] dark:hover:shadow-[0_0_20px_rgba(52,211,153,0.6)]"
                            >
                              <CheckCircle className="h-4 w-4 me-1" />
                              Confirm
                            </Button>
                          </>
                        )}
                        {order.status === 'pending_buyer_review' && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4 me-1" />
                            View
                          </Button>
                        )}
                        {['confirmed', 'processing'].includes(order.status) && (
                          <Button size="sm" onClick={() => handleOrderAction(order.id, 'ship')}>
                            <Truck className="h-4 w-4 me-1" />
                            Ship
                          </Button>
                        )}
                        {order.status === 'delivered' && (
                          <Button size="sm" onClick={() => {
                            fetch('/api/supplier/invoices', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'create_from_order', order_id: order.id }),
                            }).then(() => loadData())
                          }}>
                            <FileText className="h-4 w-4 me-1" />
                            Invoice
                          </Button>
                        )}
                        {['delivered', 'completed', 'shipped'].includes(order.status) && !order.paid_at && (
                          <Button size="sm" variant="outline" onClick={() => handleOrderAction(order.id, 'mark_paid')}>
                            <CircleDollarSign className="h-4 w-4 me-1" />
                            Mark Paid
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Buyers Section
  function renderBuyers() {
    const activeBuyers = buyers.filter(b => b.status === 'active')
    const pendingBuyers = buyers.filter(b => b.status === 'pending')

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeBuyers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingBuyers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buyers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pending Requests */}
        {pendingLinkRequests.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-5 w-5 text-amber-500" />
                Pending Connection Requests ({pendingLinkRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingLinkRequests.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-medium">
                        {link.buyer?.business_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{link.buyer?.business_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {link.buyer?.type} • {link.buyer?.wilaya}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLinkAction(link.id, 'reject')}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => handleLinkAction(link.id, 'approve')}>
                        <CheckCircle className="h-4 w-4 me-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buyers List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filteredBuyers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No buyers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBuyers.map(link => (
              <Card key={link.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-lg">
                        {link.buyer?.business_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{link.buyer?.business_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{link.buyer?.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(link as { has_unpaid?: boolean; unpaid_amount?: number }).has_unpaid && (
                        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                          <CircleDollarSign className="h-3 w-3 me-1" />
                          {(link as { unpaid_amount?: number }).unpaid_amount?.toLocaleString()} DZD unpaid
                        </Badge>
                      )}
                      <Badge className={getStatusBadgeClassName(link.status, 'solid')}>{link.status}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {link.buyer?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {link.buyer.email}
                      </div>
                    )}
                    {link.buyer?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {link.buyer.phone}
                      </div>
                    )}
                    {link.buyer?.wilaya && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {link.buyer.wilaya}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => goToSection('messages')}>
                      <MessageSquare className="h-4 w-4 me-1" />
                      Message
                    </Button>
                    {link.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleLinkAction(link.id, 'suspend')}>
                        <Unlink className="h-4 w-4" />
                      </Button>
                    )}
                    {link.status === 'pending' && link.requested_by === 'buyer' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleLinkAction(link.id, 'reject')}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleLinkAction(link.id, 'approve')}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Analytics Section
  function renderAnalytics() {
    return (
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex justify-end">
          <Select defaultValue="month">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{(analytics?.sales?.total_revenue || 0).toLocaleString()} DZD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{analytics?.sales?.total_orders || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">{(analytics?.sales?.average_order_value || 0).toLocaleString()} DZD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Unique Buyers</p>
              <p className="text-2xl font-bold">{analytics?.sales?.unique_buyers || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Buyers & Products */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Buyers</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.top_buyers?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.top_buyers.slice(0, 5).map((buyer: any, idx: number) => (
                    <div key={buyer.buyer_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <div>
                          <p className="font-medium">{buyer.business_name}</p>
                          <p className="text-sm text-muted-foreground">{buyer.orders} orders</p>
                        </div>
                      </div>
                      <p className="font-bold">{buyer.revenue.toLocaleString()} DZD</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.top_products?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.top_products.slice(0, 5).map((product: any, idx: number) => (
                    <div key={product.product_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} units</p>
                        </div>
                      </div>
                      <p className="font-bold">{product.revenue.toLocaleString()} DZD</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Settings Section
  function renderSettings() {
    if (settingsLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )
    }

    if (!settings) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Failed to load settings</p>
            <Button onClick={loadSettings} className="mt-4">
              <RefreshCw className="h-4 w-4 me-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Order Settings</CardTitle>
            <CardDescription>Configure default order preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Order Value (DZD)</Label>
                <Input
                  type="number"
                  value={settings.min_order_value || ''}
                  onChange={(e) => setSettings({ ...settings, min_order_value: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Free Shipping Threshold (DZD)</Label>
                <Input
                  type="number"
                  value={settings.free_shipping_threshold || ''}
                  onChange={(e) => setSettings({ ...settings, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Shipping Cost (DZD)</Label>
                <Input
                  type="number"
                  value={settings.default_shipping_cost || 0}
                  onChange={(e) => setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Payment Terms</Label>
                <Select
                  value={settings.default_payment_terms || 'cash'}
                  onValueChange={(value) => setSettings({ ...settings, default_payment_terms: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="15_days">15 Days</SelectItem>
                    <SelectItem value="30_days">30 Days</SelectItem>
                    <SelectItem value="60_days">60 Days</SelectItem>
                    <SelectItem value="90_days">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Order Acceptance</CardTitle>
            <CardDescription>Control how orders are accepted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Accept Orders</Label>
                <p className="text-sm text-muted-foreground">Automatically accept orders from linked buyers</p>
              </div>
              <Switch
                checked={settings.auto_accept_orders || false}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_accept_orders: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Accept Orders from Anyone</Label>
                <p className="text-sm text-muted-foreground">Allow orders from buyers without a link</p>
              </div>
              <Switch
                checked={settings.accept_orders_from_anyone !== false}
                onCheckedChange={(checked) => setSettings({ ...settings, accept_orders_from_anyone: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Order Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified when new orders are placed</p>
              </div>
              <Switch
                checked={settings.notify_new_orders !== false}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_new_orders: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Connection Request Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified when buyers request to connect</p>
              </div>
              <Switch
                checked={settings.notify_new_link_requests !== false}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_new_link_requests: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? (
              <>
                <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 me-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Security Settings */}
        <PrivacySecuritySettings language={language as 'en' | 'fr' | 'ar'} compact />

        {/* Backup & Offline Settings */}
        <BackupSettings professionalId={professional.id} />
      </div>
    )
  }

  // Handle messages section
  if (activeSection === 'messages' && authUserId) {
    return (
      <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
        <EmbeddedChat
          userId={authUserId}
          userType={professional.type as 'pharma_supplier' | 'equipment_supplier'}
          userName={professional.business_name}
          userAvatar={avatarUrl || undefined}
        />
      </div>
    )
  }

  // Main render
  return (
    <div className="w-full min-w-0 py-4 sm:py-6 px-0 space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{professional.business_name}</h1>
          <p className="text-muted-foreground capitalize">
            {professional.type === 'pharma_supplier' ? 'Pharmaceutical Supplier' : 'Medical Equipment Supplier'}
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 me-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'inventory' && renderInventory()}
      {activeSection === 'products' && renderInventory()}
      {activeSection === 'orders' && renderOrders()}
      {activeSection === 'buyers' && renderBuyers()}
      {activeSection === 'analytics' && renderAnalytics()}
      {activeSection === 'settings' && renderSettings()}
      {activeSection === 'audit' && (
        <SupplierAuditTrail 
          supplierId={professional.id}
          authUserId={userId} 
          supplierName={professional.business_name} 
        />
      )}

      {/* Order Detail Sheet (with item-level edit) */}
      <SupplierOrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onSuccess={loadData}
      />

      {/* Product Add/Edit Dialog */}
      <Dialog open={showProductDialog} onOpenChange={(open) => !open && setShowProductDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>Product details for your catalog</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input value={productForm.barcode} onChange={e => setProductForm(f => ({ ...f, barcode: e.target.value }))} placeholder="EAN-13" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={productForm.category_id} onValueChange={v => setProductForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price (DZD) *</Label>
                <Input type="number" min={0} step={0.01} value={productForm.unit_price || ''} onChange={e => setProductForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Min Order Qty</Label>
                <Input type="number" min={1} value={productForm.min_order_qty} onChange={e => setProductForm(f => ({ ...f, min_order_qty: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input type="number" min={0} value={productForm.stock_quantity} onChange={e => setProductForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <Input type="number" min={0} value={productForm.reorder_point} onChange={e => setProductForm(f => ({ ...f, reorder_point: e.target.value }))} placeholder="Low stock alert" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Form (tablet, syrup, etc.)</Label>
                <Input value={productForm.form} onChange={e => setProductForm(f => ({ ...f, form: e.target.value }))} placeholder="e.g. tablet" />
              </div>
              <div className="space-y-2">
                <Label>Dosage</Label>
                <Input value={productForm.dosage} onChange={e => setProductForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input value={productForm.manufacturer} onChange={e => setProductForm(f => ({ ...f, manufacturer: e.target.value }))} />
              </div>
              {categories.some(c => c.id === productForm.category_id && c.requires_expiry) && (
                <div className="space-y-2">
                  <Label>Expiry Date *</Label>
                  <Input
                    type="date"
                    value={productForm.expiry_date}
                    onChange={e => setProductForm(f => ({ ...f, expiry_date: e.target.value }))}
                    placeholder="Required for medications"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={productForm.in_stock} onCheckedChange={v => setProductForm(f => ({ ...f, in_stock: v }))} />
                <Label>In Stock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={productForm.is_active} onCheckedChange={v => setProductForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={savingProduct}>
              {savingProduct ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Dialog */}
      <Dialog open={showStockAdjustDialog} onOpenChange={(open) => !open && (setShowStockAdjustDialog(false), setProductForStockAdjust(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>{productForStockAdjust?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Quantity</Label>
            <Input type="number" min={0} value={stockAdjustQty} onChange={e => setStockAdjustQty(e.target.value)} className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockAdjustDialog(false)}>Cancel</Button>
            <Button onClick={handleStockAdjust}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => !open && (setShowImportDialog(false), setImportFile(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Products</DialogTitle>
            <DialogDescription>Upload JSON, CSV, or Excel (XLSX). Required: name, unit_price. Supports batch_number, lot_number, expiry_date.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Button variant={importFormat === 'json' ? 'default' : 'outline'} size="sm" onClick={() => setImportFormat('json')}>JSON</Button>
              <Button variant={importFormat === 'csv' ? 'default' : 'outline'} size="sm" onClick={() => setImportFormat('csv')}>CSV</Button>
              <Button variant={importFormat === 'xlsx' ? 'default' : 'outline'} size="sm" onClick={() => setImportFormat('xlsx')}>Excel</Button>
            </div>
            <div>
              <Label>Select File</Label>
              <Input type="file" accept={importFormat === 'json' ? '.json' : importFormat === 'xlsx' ? '.xlsx,.xls' : '.csv'} onChange={e => setImportFile(e.target.files?.[0] || null)} className="mt-2" />
              {importFile && <p className="text-sm text-muted-foreground mt-2">{importFile.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { cn } from '@/lib/utils'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// Icons
import {
  Package, ShoppingCart, FileText, Users, Building2,
  Plus, Minus, Search, RefreshCw, Link2, Unlink, Eye, Send,
  Phone, Mail, MapPin, CheckCircle, XCircle, Clock,
  ArrowRight, Truck, DollarSign, Filter, Upload, Copy, FileSpreadsheet,
  ChevronRight, ClipboardList, Edit, PackageCheck, CircleDollarSign,
  Layers, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { BuyerOrderReviewSheet } from './buyer-order-review-sheet'
import { BuyerOrderDetailSheet } from './buyer-order-detail-sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

// Types
import type {
  SupplierDirectory,
  SupplierBuyerLink,
  SupplierPurchaseOrder,
  SupplierInvoice,
  SupplierProduct,
  OrderInput,
} from '@/lib/supplier/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending_buyer_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

interface SuppliersSectionProps {
  professionalId: string
  professionalType: string
}

const LABELS = {
  en: {
    suppliers: 'Suppliers',
    directory: 'Directory',
    mySuppliers: 'My Suppliers',
    orders: 'Orders',
    invoices: 'Invoices',
    search: 'Search...',
    noSuppliers: 'No suppliers found',
    noOrders: 'No orders found',
    noInvoices: 'No invoices found',
    requestLink: 'Request Link',
    viewProducts: 'View Products',
    placeOrder: 'Place Order',
    products: 'products',
    linked: 'Linked',
    pending: 'Pending',
    connect: 'Connect',
    disconnect: 'Disconnect',
    accept: 'Accept',
    reject: 'Reject',
    allTypes: 'All Types',
    pharmaSupplier: 'Pharmaceutical',
    equipmentSupplier: 'Equipment',
    dzd: 'DZD',
    submit: 'Submit Order',
    cancel: 'Cancel',
    orderNotes: 'Order Notes',
    quantity: 'Quantity',
    addToOrder: 'Add to Order',
    viewOrder: 'View Order',
    confirmDelivery: 'Confirm Delivery',
    receive: 'Receive',
    bulkImport: 'Bulk Import',
    copyFromOrder: 'Copy from Order',
    manual: 'Manual',
    uploadCsv: 'Upload CSV',
    csvFormat: 'Format: sku,quantity or barcode,quantity (one per line)',
    selectOrder: 'Select an order to copy',
    addBySku: 'Add by SKU/Barcode',
    addBySkuPlaceholder: 'Enter SKU or barcode, press Enter',
    loadMore: 'Load More',
    items: 'items',
    available: 'Available',
    minQty: 'Min',
    orderSuccess: 'Order submitted successfully',
    orderError: 'Order failed',
    reduceQty: 'Reduce quantity to match available stock',
    outOfStock: 'Out of stock',
    submitting: 'Submitting...',
  },
  fr: {
    suppliers: 'Fournisseurs',
    directory: 'Annuaire',
    mySuppliers: 'Mes Fournisseurs',
    orders: 'Commandes',
    invoices: 'Factures',
    search: 'Rechercher...',
    noSuppliers: 'Aucun fournisseur trouvé',
    noOrders: 'Aucune commande trouvée',
    noInvoices: 'Aucune facture trouvée',
    requestLink: 'Demander Liaison',
    viewProducts: 'Voir Produits',
    placeOrder: 'Passer Commande',
    products: 'produits',
    linked: 'Lié',
    pending: 'En Attente',
    connect: 'Connecter',
    disconnect: 'Déconnecter',
    accept: 'Accepter',
    reject: 'Rejeter',
    allTypes: 'Tous les Types',
    pharmaSupplier: 'Pharmaceutique',
    equipmentSupplier: 'Équipement',
    dzd: 'DA',
    submit: 'Soumettre Commande',
    cancel: 'Annuler',
    orderNotes: 'Notes de Commande',
    quantity: 'Quantité',
    addToOrder: 'Ajouter à la Commande',
    viewOrder: 'Voir Commande',
    confirmDelivery: 'Confirmer Livraison',
    receive: 'Recevoir',
    bulkImport: 'Import en Masse',
    copyFromOrder: 'Copier une Commande',
    manual: 'Manuel',
    uploadCsv: 'Téléverser CSV',
    csvFormat: 'Format: sku,quantité ou code_barre,quantité (une par ligne)',
    selectOrder: 'Sélectionner une commande à copier',
    addBySku: 'Ajouter par SKU/Code-barres',
    addBySkuPlaceholder: 'Entrez SKU ou code-barres, appuyez sur Entrée',
    loadMore: 'Charger Plus',
    items: 'articles',
    available: 'Disponible',
    minQty: 'Min',
    orderSuccess: 'Commande soumise avec succès',
    orderError: 'Échec de la commande',
    reduceQty: 'Réduire la quantité pour correspondre au stock disponible',
    outOfStock: 'Rupture de stock',
    submitting: 'Envoi en cours...',
  },
  ar: {
    suppliers: 'الموردون',
    directory: 'الدليل',
    mySuppliers: 'موردوني',
    orders: 'الطلبات',
    invoices: 'الفواتير',
    search: 'بحث...',
    noSuppliers: 'لا يوجد موردون',
    noOrders: 'لا توجد طلبات',
    noInvoices: 'لا توجد فواتير',
    requestLink: 'طلب ربط',
    viewProducts: 'عرض المنتجات',
    placeOrder: 'تقديم طلب',
    products: 'منتجات',
    linked: 'مرتبط',
    pending: 'قيد الانتظار',
    connect: 'ربط',
    disconnect: 'إلغاء الربط',
    accept: 'قبول',
    reject: 'رفض',
    allTypes: 'جميع الأنواع',
    pharmaSupplier: 'صيدلاني',
    equipmentSupplier: 'معدات',
    dzd: 'دج',
    submit: 'تقديم الطلب',
    cancel: 'إلغاء',
    orderNotes: 'ملاحظات الطلب',
    quantity: 'الكمية',
    addToOrder: 'إضافة للطلب',
    viewOrder: 'عرض الطلب',
    confirmDelivery: 'تأكيد التسليم',
    receive: 'استلام',
    bulkImport: 'استيراد بالجملة',
    copyFromOrder: 'نسخ من طلب',
    manual: 'يدوي',
    uploadCsv: 'رفع CSV',
    csvFormat: 'التنسيق: sku,الكمية أو barcode,الكمية (سطر واحد لكل)',
    selectOrder: 'اختر طلباً للنسخ',
    addBySku: 'إضافة بالرمز/الباركود',
    addBySkuPlaceholder: 'أدخل الرمز أو الباركود، اضغط Enter',
    loadMore: 'تحميل المزيد',
    items: 'عناصر',
    available: 'متاح',
    minQty: 'الحد الأدنى',
    orderSuccess: 'تم تقديم الطلب بنجاح',
    orderError: 'فشل الطلب',
    reduceQty: 'قلل الكمية لتتوافق مع المخزون المتاح',
    outOfStock: 'نفد من المخزون',
    submitting: 'جاري الإرسال...',
  },
}

export function SuppliersSection({ professionalId, professionalType }: SuppliersSectionProps) {
  const { language, dir } = useLanguage()
  const { toast } = useToast()
  const lang = (language === 'ar' ? 'ar' : language === 'en' ? 'en' : 'fr') as 'en' | 'fr' | 'ar'
  const l = LABELS[lang]

  // State
  const [activeTab, setActiveTab] = useState('directory')
  const [suppliers, setSuppliers] = useState<SupplierDirectory[]>([])
  const [links, setLinks] = useState<SupplierBuyerLink[]>([])
  const [orders, setOrders] = useState<SupplierPurchaseOrder[]>([])
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  
  // Order management - sorting, grouping, filtering
  const [orderSortBy, setOrderSortBy] = useState<'date' | 'total' | 'supplier' | 'status'>('date')
  const [orderSortDir, setOrderSortDir] = useState<'asc' | 'desc'>('desc')
  const [orderGroupBy, setOrderGroupBy] = useState<'none' | 'supplier' | 'date' | 'status'>('none')
  const [orderDateRange, setOrderDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Order creation state
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDirectory | null>(null)
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([])
  const [orderItems, setOrderItems] = useState<{ product: SupplierProduct; quantity: number }[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showProductsDialog, setShowProductsDialog] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [orderMode, setOrderMode] = useState<'manual' | 'import' | 'copy'>('manual')
  const [productPage, setProductPage] = useState(1)
  const [productsHasMore, setProductsHasMore] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string; supplier_type: string }[]>([])
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('')
  const [addBySkuInput, setAddBySkuInput] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [supplierOrdersForCopy, setSupplierOrdersForCopy] = useState<SupplierPurchaseOrder[]>([])
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [actingOrderId, setActingOrderId] = useState<string | null>(null)
  const [actingLinkId, setActingLinkId] = useState<string | null>(null)
  const [orderForReview, setOrderForReview] = useState<SupplierPurchaseOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<SupplierPurchaseOrder | null>(null)
  const [unpaidOrdersCount, setUnpaidOrdersCount] = useState(0)
  const [unpaidAmount, setUnpaidAmount] = useState(0)
  const [orderStockMap, setOrderStockMap] = useState<Record<string, { available: number | null; inStock: boolean }>>({})
  const [orderError, setOrderError] = useState<string | null>(null)
  const submittingOrderRef = useRef(false)

  // Order pipeline stages for buyer (tracking their outgoing orders)
  const orderPipeline = useMemo(() => {
    const stages = [
      { id: 'submitted', label: language === 'ar' ? 'جديد' : language === 'fr' ? 'Soumis' : 'Submitted', count: 0, color: 'bg-blue-500', icon: <ClipboardList className="h-4 w-4" /> },
      { id: 'pending_buyer_review', label: language === 'ar' ? 'قيد المراجعة' : language === 'fr' ? 'En révision' : 'Review', count: 0, color: 'bg-amber-500', icon: <Edit className="h-4 w-4" /> },
      { id: 'confirmed', label: language === 'ar' ? 'مؤكد' : language === 'fr' ? 'Confirmé' : 'Confirmed', count: 0, color: 'bg-emerald-500', icon: <CheckCircle className="h-4 w-4" /> },
      { id: 'processing', label: language === 'ar' ? 'قيد التجهيز' : language === 'fr' ? 'En cours' : 'Processing', count: 0, color: 'bg-orange-500', icon: <Package className="h-4 w-4" /> },
      { id: 'shipped', label: language === 'ar' ? 'تم الشحن' : language === 'fr' ? 'Expédié' : 'Shipped', count: 0, color: 'bg-purple-500', icon: <Truck className="h-4 w-4" /> },
      { id: 'delivered', label: language === 'ar' ? 'تم التسليم' : language === 'fr' ? 'Livré' : 'Delivered', count: 0, color: 'bg-green-500', icon: <PackageCheck className="h-4 w-4" /> },
    ]
    orders.forEach(order => {
      const stage = stages.find(s => s.id === order.status)
      if (stage) stage.count++
    })
    return stages
  }, [orders, language])

  // Filtered orders by status, date, with sorting
  const filteredOrders = useMemo(() => {
    let filtered = orders
    
    // Status filter
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === orderStatusFilter)
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
      } else if (orderSortBy === 'supplier') {
        comparison = (a.supplier?.business_name || '').localeCompare(b.supplier?.business_name || '')
      } else if (orderSortBy === 'status') {
        const statusOrder = ['draft', 'submitted', 'pending_buyer_review', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled']
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      }
      return orderSortDir === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [orders, orderStatusFilter, orderDateRange, orderSortBy, orderSortDir])

  // Group orders by selected criteria
  const groupedOrders = useMemo(() => {
    if (orderGroupBy === 'none') {
      return { 'All Orders': filteredOrders }
    }
    
    const groups: Record<string, typeof filteredOrders> = {}
    
    filteredOrders.forEach(order => {
      let key = ''
      if (orderGroupBy === 'supplier') {
        key = order.supplier?.business_name || 'Unknown Supplier'
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

  // Toggle order selection for bulk actions
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

  // Load data
  useEffect(() => {
    loadData()
  }, [activeTab])

  // Fetch available stock for order items when cart changes
  useEffect(() => {
    if (!selectedSupplier || orderItems.length === 0) {
      setOrderStockMap({})
      return
    }
    const productIds = orderItems.map(i => i.product.id)
    fetch(`/api/suppliers/${selectedSupplier.id}/stock?product_ids=${productIds.join(',')}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) setOrderStockMap(data.data)
      })
      .catch(() => setOrderStockMap({}))
  }, [selectedSupplier?.id, orderItems.map(i => i.product.id).join(',')])

  async function loadData() {
    setLoading(true)
    try {
      // Always load orders for pipeline display
      const ordersRes = await fetch('/api/suppliers/orders')
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.data || [])
        setUnpaidOrdersCount(data.unpaid_orders_count || 0)
        setUnpaidAmount(data.unpaid_amount || 0)
      }

      if (activeTab === 'directory') {
        const res = await fetch('/api/suppliers')
        if (res.ok) {
          const data = await res.json()
          setSuppliers(data.data || [])
        }
      }

      if (activeTab === 'my-suppliers') {
        const res = await fetch('/api/suppliers/links')
        if (res.ok) {
          const data = await res.json()
          setLinks(data || [])
        }
      }

      if (activeTab === 'invoices') {
        const res = await fetch('/api/suppliers/invoices')
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Request link with supplier
  async function requestLink(supplierId: string) {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error requesting link:', error)
    }
  }

  // Load supplier products (with pagination, supports large catalogs)
  async function loadSupplierProducts(supplierId: string, page = 1, append = false, opts?: { category?: string; search?: string }) {
    if (!append) setProductsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '500')
      params.set('page', String(page))
      const cat = opts?.category ?? productCategoryFilter
      const search = opts?.search ?? productSearch
      if (cat) params.set('category', cat)
      if (search) params.set('search', search)
      params.set('in_stock', 'true')
      const res = await fetch(`/api/suppliers/${supplierId}/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        const prods = data.data || []
        if (append) {
          setSupplierProducts(prev => {
            const seen = new Set(prev.map(p => p.id))
            return [...prev, ...prods.filter((p: SupplierProduct) => !seen.has(p.id))]
          })
        } else {
          setSupplierProducts(prods)
        }
        setProductsHasMore(data.hasMore ?? false)
        setProductPage(page)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setProductsLoading(false)
    }
  }

  // Load more products
  function loadMoreProducts() {
    if (selectedSupplier && productsHasMore && !productsLoading) {
      loadSupplierProducts(selectedSupplier.id, productPage + 1, true)
    }
  }

  // Open order dialog - load products, categories, and orders for copy
  function openOrderDialog(supplier: SupplierDirectory) {
    setSelectedSupplier(supplier)
    setOrderItems([])
    setOrderNotes('')
    setOrderError(null)
    setOrderMode('manual')
    setProductPage(1)
    setProductSearch('')
    setProductCategoryFilter('')
    setImportFile(null)
    loadSupplierProducts(supplier.id, 1, false, { search: '', category: '' })
    fetch('/api/supplier/categories?supplier_type=' + (supplier.type || 'pharma_supplier'))
      .then(r => r.ok ? r.json() : [])
      .then(setCategories)
    fetch(`/api/suppliers/orders?supplier_id=${supplier.id}&limit=20`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setSupplierOrdersForCopy(d.data || []))
    setShowOrderDialog(true)
  }

  // Add item to order
  function addToOrder(product: SupplierProduct, qty = 1) {
    const existing = orderItems.find(i => i.product.id === product.id)
    if (existing) {
      setOrderItems(items => items.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: i.quantity + qty }
          : i
      ))
    } else {
      setOrderItems([...orderItems, { product, quantity: qty }])
    }
  }

  // Add by SKU/barcode
  function handleAddBySku(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !addBySkuInput.trim()) return
    const q = addBySkuInput.trim().toLowerCase()
    const parts = q.split(/[\s,]+/)
    const skuOrBarcode = parts[0]
    const qty = parts[1] ? parseInt(parts[1], 10) : 1
    const product = supplierProducts.find(p =>
      p.sku?.toLowerCase() === skuOrBarcode ||
      p.barcode?.toLowerCase() === skuOrBarcode ||
      p.name.toLowerCase().includes(skuOrBarcode)
    )
    if (product) {
      addToOrder(product, isNaN(qty) ? 1 : Math.max(1, qty))
      setAddBySkuInput('')
    }
  }

  // Bulk import from CSV
  async function handleBulkImport() {
    if (!importFile || !selectedSupplier) return
    setImporting(true)
    try {
      const text = await importFile.text()
      const lines = text.split(/\r?\n/).filter(Boolean)
      const productMap = new Map<string | undefined, SupplierProduct>()
      supplierProducts.forEach(p => {
        if (p.sku) productMap.set(p.sku.toLowerCase(), p)
        if (p.barcode) productMap.set(p.barcode.toLowerCase(), p)
      })
      let added = 0
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(/[,;\t]/).map(s => s.trim())
        if (parts.length < 2) continue
        const key = parts[0].toLowerCase()
        const qty = parseInt(parts[1], 10) || 1
        const product = productMap.get(key) || supplierProducts.find(p =>
          p.name.toLowerCase().includes(key) || p.sku?.toLowerCase() === key || p.barcode?.toLowerCase() === key
        )
        if (product) {
          addToOrder(product, qty)
          added++
        }
      }
      setImportFile(null)
      setOrderMode('manual')
    } finally {
      setImporting(false)
    }
  }

  // Copy from previous order
  function handleCopyFromOrder(order: SupplierPurchaseOrder) {
    if (!order.items?.length) return
    const productMap = new Map(supplierProducts.map(p => [p.id, p]))
    const newItems: { product: SupplierProduct; quantity: number }[] = []
    for (const item of order.items as any[]) {
      const pid = item.product_id || item.product?.id
      let product = productMap.get(pid) || (item.product && item.product.id ? item.product : null)
      if (product && product.id) {
        if (!product.unit_price && item.unit_price) {
          product = { ...product, unit_price: item.unit_price } as SupplierProduct
        }
        newItems.push({ product, quantity: item.quantity || 1 })
      }
    }
    if (newItems.length > 0) {
      setOrderItems(newItems)
      setOrderMode('manual')
    }
  }

  // Submit order
  async function submitOrder() {
    if (!selectedSupplier || orderItems.length === 0 || submittingOrderRef.current) return
    submittingOrderRef.current = true
    setSubmittingOrder(true)
    setOrderError(null)
    try {
      const orderData: OrderInput = {
        supplier_id: selectedSupplier.id,
        buyer_notes: orderNotes,
        items: orderItems.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      }

      const res = await fetch('/api/suppliers/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      const postData = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = postData.error || 'Failed to create order'
        const validationErrors = postData.validationErrors as Array<{ productName: string; error: string }> | undefined
        const detail = validationErrors?.length
          ? validationErrors.map(e => `${e.productName}: ${e.error}`).join('; ')
          : msg
        setOrderError(detail)
        toast({ title: l.orderError, description: detail, variant: 'destructive' })
        return
      }

      const order = postData
      const patchRes = await fetch('/api/suppliers/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, action: 'submit' }),
      })

      const patchData = await patchRes.json().catch(() => ({}))
      if (!patchRes.ok) {
        const msg = patchData.error || 'Failed to submit order'
        const validationErrors = patchData.validationErrors as Array<{ productName: string; error: string }> | undefined
        const detail = validationErrors?.length
          ? validationErrors.map(e => `${e.productName}: ${e.error}`).join('; ')
          : msg
        setOrderError(detail)
        toast({ title: l.orderError, description: detail, variant: 'destructive' })
        return
      }

      setShowOrderDialog(false)
      setOrderItems([])
      setOrderNotes('')
      setSelectedSupplier(null)
      setOrderError(null)
      setActiveTab('orders')
      loadData()
      toast({ title: l.orderSuccess })
    } catch (error) {
      console.error('Error submitting order:', error)
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred'
      setOrderError(msg)
      toast({ title: l.orderError, description: msg, variant: 'destructive' })
    } finally {
      submittingOrderRef.current = false
      setSubmittingOrder(false)
    }
  }

  // Handle order action
  async function handleOrderAction(orderId: string, action: string, data?: Record<string, unknown>) {
    if (actingOrderId === orderId) return
    setActingOrderId(orderId)
    try {
      const res = await fetch('/api/suppliers/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, action, ...data }),
      })
      if (res.ok) {
        loadData()
        if (action === 'approve_changes' || action === 'reject_changes') {
          setOrderForReview(null)
        }
      }
    } catch (error) {
      console.error('Error updating order:', error)
    } finally {
      setActingOrderId(null)
    }
  }

  // Handle link action
  async function handleLinkAction(linkId: string, action: string) {
    if (actingLinkId === linkId) return
    setActingLinkId(linkId)
    try {
      const res = await fetch('/api/suppliers/links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId, action }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error updating link:', error)
    } finally {
      setActingLinkId(null)
    }
  }

  // Filtered data
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(s => s.business_name.toLowerCase().includes(q))
    }
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(s => s.type === typeFilter)
    }
    return filtered
  }, [suppliers, searchQuery, typeFilter])

  const filteredProducts = useMemo(() => {
    if (!productSearch) return supplierProducts
    const q = productSearch.toLowerCase()
    return supplierProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    )
  }, [supplierProducts, productSearch])

  const orderTotal = orderItems.reduce((sum, i) => sum + (i.product.unit_price * i.quantity), 0)

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{l.suppliers}</h2>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="directory">{l.directory}</TabsTrigger>
          <TabsTrigger value="my-suppliers">{l.mySuppliers}</TabsTrigger>
          <TabsTrigger value="orders">{l.orders}</TabsTrigger>
          <TabsTrigger value="invoices">{l.invoices}</TabsTrigger>
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={l.search}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={l.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l.allTypes}</SelectItem>
                <SelectItem value="pharma_supplier">{l.pharmaSupplier}</SelectItem>
                <SelectItem value="equipment_supplier">{l.equipmentSupplier}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noSuppliers}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuppliers.map(supplier => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{supplier.business_name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {supplier.type === 'pharma_supplier' ? l.pharmaSupplier : l.equipmentSupplier}
                          </p>
                        </div>
                      </div>
                      {supplier.is_linked ? (
                        <Badge className={STATUS_COLORS[supplier.link_status || 'active']}>
                          {supplier.link_status === 'pending' ? l.pending : l.linked}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground mb-4">
                      {supplier.wilaya && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {supplier.wilaya}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {supplier.product_count} {l.products}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {supplier.is_linked && supplier.link_status === 'active' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedSupplier(supplier)
                              loadSupplierProducts(supplier.id, 1)
                              setShowProductsDialog(true)
                            }}
                          >
                            <Eye className="h-4 w-4 me-1" />
                            {l.viewProducts}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => openOrderDialog(supplier)}
                          >
                            <ShoppingCart className="h-4 w-4 me-1" />
                            {l.placeOrder}
                          </Button>
                        </>
                      ) : supplier.is_linked && supplier.link_status === 'pending' ? (
                        <Button size="sm" variant="outline" disabled className="flex-1">
                          <Clock className="h-4 w-4 me-1" />
                          {l.pending}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => requestLink(supplier.id)}
                        >
                          <Link2 className="h-4 w-4 me-1" />
                          {l.requestLink}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Suppliers Tab */}
        <TabsContent value="my-suppliers" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noSuppliers}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <Card key={link.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{link.supplier?.business_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {link.supplier?.wilaya}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={STATUS_COLORS[link.status]}>{link.status}</Badge>
                        {link.status === 'active' && link.supplier && (
                          <Button
                            size="sm"
                            onClick={() => openOrderDialog({ id: link.supplier!.id, business_name: link.supplier!.business_name || '', type: (link.supplier as any).type || 'pharma_supplier', wilaya: link.supplier?.wilaya, product_count: 0, is_linked: true } as SupplierDirectory)}
                          >
                            <ShoppingCart className="h-4 w-4 me-1" />
                            {l.placeOrder}
                          </Button>
                        )}
                        {link.status === 'pending' && link.requested_by === 'supplier' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLinkAction(link.id, 'reject')}
                              disabled={actingLinkId === link.id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleLinkAction(link.id, 'accept')}
                              disabled={actingLinkId === link.id}
                            >
                              {actingLinkId === link.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Unpaid Orders Alert */}
          {unpaidOrdersCount > 0 && (
            <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CircleDollarSign className="h-8 w-8 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {language === 'ar' ? 'طلبات غير مدفوعة' : language === 'fr' ? 'Commandes impayées' : 'Unpaid Orders'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {unpaidOrdersCount} {language === 'ar' ? 'طلب' : language === 'fr' ? 'commande(s)' : 'order(s)'} — {unpaidAmount.toLocaleString()} {l.dzd}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'قم بتسديد المدفوعات للموردين وحدّث الطلبات كمدفوعة' : language === 'fr' ? 'Réglez vos fournisseurs et marquez les commandes comme payées' : 'Settle payments with suppliers and mark orders as paid'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Pipeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {language === 'ar' ? 'حالة الطلبات' : language === 'fr' ? 'Pipeline des commandes' : 'Order Pipeline'}
                </CardTitle>
                {orderStatusFilter !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setOrderStatusFilter('all')}>
                    {language === 'ar' ? 'عرض الكل' : language === 'fr' ? 'Voir tout' : 'Show All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {orderPipeline.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className={cn(
                      "relative p-3 rounded-lg border text-center cursor-pointer hover:bg-muted/50 transition-colors",
                      stage.count > 0 && "border-primary/50",
                      orderStatusFilter === stage.id && "ring-2 ring-primary bg-muted/50"
                    )}
                    onClick={() => setOrderStatusFilter(orderStatusFilter === stage.id ? 'all' : stage.id)}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-white", stage.color)}>
                      {stage.icon}
                    </div>
                    <p className="text-2xl font-bold">{stage.count}</p>
                    <p className="text-xs text-muted-foreground">{stage.label}</p>
                    {idx < orderPipeline.length - 1 && (
                      <ChevronRight className="absolute top-1/2 -end-3 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 hidden lg:block" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sort, Group, Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Date Range */}
                  <Select value={orderDateRange} onValueChange={(v) => setOrderDateRange(v as typeof orderDateRange)}>
                    <SelectTrigger className="w-[130px] h-9">
                      <Calendar className="h-4 w-4 me-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'كل الوقت' : language === 'fr' ? 'Tout' : 'All Time'}</SelectItem>
                      <SelectItem value="today">{language === 'ar' ? 'اليوم' : language === 'fr' ? 'Aujourd\'hui' : 'Today'}</SelectItem>
                      <SelectItem value="week">{language === 'ar' ? '7 أيام' : language === 'fr' ? '7 jours' : 'Last 7 Days'}</SelectItem>
                      <SelectItem value="month">{language === 'ar' ? '30 يوم' : language === 'fr' ? '30 jours' : 'Last 30 Days'}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'ترتيب:' : language === 'fr' ? 'Trier:' : 'Sort:'}</span>
                    <Select value={orderSortBy} onValueChange={(v) => setOrderSortBy(v as typeof orderSortBy)}>
                      <SelectTrigger className="w-[110px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">{language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                        <SelectItem value="total">{language === 'ar' ? 'المجموع' : language === 'fr' ? 'Total' : 'Total'}</SelectItem>
                        <SelectItem value="supplier">{language === 'ar' ? 'المورد' : language === 'fr' ? 'Fournisseur' : 'Supplier'}</SelectItem>
                        <SelectItem value="status">{language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2"
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
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'تجميع:' : language === 'fr' ? 'Grouper:' : 'Group:'}</span>
                    <Select value={orderGroupBy} onValueChange={(v) => setOrderGroupBy(v as typeof orderGroupBy)}>
                      <SelectTrigger className="w-[120px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{language === 'ar' ? 'بدون' : language === 'fr' ? 'Aucun' : 'None'}</SelectItem>
                        <SelectItem value="supplier">{language === 'ar' ? 'بالمورد' : language === 'fr' ? 'Par fournisseur' : 'By Supplier'}</SelectItem>
                        <SelectItem value="date">{language === 'ar' ? 'بالتاريخ' : language === 'fr' ? 'Par date' : 'By Date'}</SelectItem>
                        <SelectItem value="status">{language === 'ar' ? 'بالحالة' : language === 'fr' ? 'Par statut' : 'By Status'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results count */}
                <span className="text-sm text-muted-foreground">
                  {filteredOrders.length} {language === 'ar' ? 'طلب' : language === 'fr' ? 'commande(s)' : 'order(s)'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {orderStatusFilter !== 'all' 
                    ? (language === 'ar' ? 'لا توجد طلبات في هذه الحالة' : language === 'fr' ? 'Aucune commande dans ce statut' : 'No orders in this status')
                    : l.noOrders
                  }
                </p>
                {orderStatusFilter !== 'all' && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setOrderStatusFilter('all')}>
                    {language === 'ar' ? 'عرض جميع الطلبات' : language === 'fr' ? 'Voir toutes les commandes' : 'View all orders'}
                  </Button>
                )}
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
                        {groupOrders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()} {l.dzd}
                      </span>
                    </div>
                  )}
                  
                  {/* Orders in Group */}
                  {groupOrders.map(order => (
              <Card
                key={order.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  order.status === 'pending_buyer_review' && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10"
                )}
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        order.status === 'pending_buyer_review' ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                      )}>
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{order.order_number}</p>
                          <Badge className={STATUS_COLORS[order.status]}>
                            {order.status === 'pending_buyer_review' 
                              ? (language === 'ar' ? 'تحتاج مراجعة' : language === 'fr' ? 'À réviser' : 'Needs Review')
                              : order.status.replace(/_/g, ' ')
                            }
                          </Badge>
                          {order.paid_at && <Badge variant="outline" className="text-green-600 border-green-600">{language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid'}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{order.supplier?.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                          {order.expected_delivery_date && (
                            <span className="ms-2">
                              • {language === 'ar' ? 'التسليم المتوقع' : language === 'fr' ? 'Livraison prévue' : 'Expected'}: {new Date(order.expected_delivery_date).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                        {order.supplier_changes_summary && order.status === 'pending_buyer_review' && (
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            {order.supplier_changes_summary}
                          </p>
                        )}
                      </div>
                    </div>
                      <div className="flex items-center gap-4">
                        <div className="text-end">
                          <p className="font-bold">{order.total.toLocaleString()} {l.dzd}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items?.length || 0} {l.items || 'items'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.status === 'pending_buyer_review' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-amber-600 hover:bg-amber-700"
                              onClick={(e) => { e.stopPropagation(); setOrderForReview(order) }}
                              disabled={actingOrderId === order.id}
                            >
                              <Edit className="h-4 w-4 me-1" />
                              {language === 'ar' ? 'مراجعة' : language === 'fr' ? 'Réviser' : 'Review'}
                            </Button>
                          )}
                          {order.status === 'shipped' && (
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleOrderAction(order.id, 'confirm_delivery') }}
                              disabled={actingOrderId === order.id}
                            >
                              {actingOrderId === order.id ? <RefreshCw className="h-4 w-4 me-1 animate-spin" /> : <PackageCheck className="h-4 w-4 me-1" />}
                              {l.confirmDelivery}
                            </Button>
                          )}
                          {['delivered', 'completed', 'shipped'].includes(order.status) && !order.paid_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleOrderAction(order.id, 'mark_paid') }}
                              disabled={actingOrderId === order.id}
                            >
                              {actingOrderId === order.id ? <RefreshCw className="h-4 w-4 me-1 animate-spin" /> : <CircleDollarSign className="h-4 w-4 me-1" />}
                              {language === 'ar' ? 'تم الدفع' : language === 'fr' ? 'Marquer payé' : 'Mark Paid'}
                            </Button>
                          )}
                          {order.tracking_number && order.status === 'shipped' && (
                            <Badge variant="outline" className="text-xs">
                              <Truck className="h-3 w-3 me-1" />
                              {order.tracking_number}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order) }}
                          >
                            <Eye className="h-4 w-4 me-1" />
                            {language === 'ar' ? 'عرض' : language === 'fr' ? 'Voir' : 'View'}
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
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noInvoices}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <Card key={invoice.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <Badge className={STATUS_COLORS[invoice.status]}>{invoice.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{invoice.supplier?.business_name}</p>
                          {invoice.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="font-bold">{invoice.total.toLocaleString()} {l.dzd}</p>
                        {invoice.balance > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Balance: {invoice.balance.toLocaleString()} {l.dzd}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Products Dialog */}
      <Dialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSupplier?.business_name} - {l.viewProducts}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={l.search}
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="space-y-2">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold">{product.unit_price.toLocaleString()} {l.dzd}</p>
                    <Badge className={product.in_stock ? STATUS_COLORS.active : STATUS_COLORS.cancelled}>
                      {product.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buyer Order Review Sheet (supplier changes) */}
      <BuyerOrderReviewSheet
        order={orderForReview}
        open={!!orderForReview}
        onOpenChange={(open) => !open && setOrderForReview(null)}
        onApprove={async (orderId, itemDecisions) => {
          await handleOrderAction(orderId, 'approve_changes', {
            item_decisions: itemDecisions || {},
          })
        }}
        onReject={async (orderId, reason) => {
          await handleOrderAction(orderId, 'reject_changes', {
            rejection_reason: reason,
          })
        }}
        loading={!!actingOrderId}
      />

      {/* Buyer Order Detail Sheet (view full order details) */}
      <BuyerOrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onReview={(o) => setOrderForReview(o)}
        onConfirmDelivery={async (orderId) => {
          await handleOrderAction(orderId, 'confirm_delivery')
          setSelectedOrder(null)
        }}
        onMarkPaid={async (orderId) => {
          await handleOrderAction(orderId, 'mark_paid')
          setSelectedOrder(null)
        }}
        loading={!!actingOrderId}
      />

      {/* Bulk Order Sheet - full-width for large orders */}
      <Sheet open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{l.placeOrder} - {selectedSupplier?.business_name}</SheetTitle>
            <SheetDescription>Bulk ordering: manual selection, CSV import, or copy from previous order</SheetDescription>
          </SheetHeader>

          <Tabs value={orderMode} onValueChange={(v) => setOrderMode(v as 'manual' | 'import' | 'copy')} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">{l.manual}</TabsTrigger>
              <TabsTrigger value="import">{l.bulkImport}</TabsTrigger>
              <TabsTrigger value="copy">{l.copyFromOrder}</TabsTrigger>
            </TabsList>

            {/* Manual tab */}
            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={l.search}
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && selectedSupplier && loadSupplierProducts(selectedSupplier.id, 1, false, { search: productSearch })}
                    className="ps-9"
                  />
                </div>
                <Select value={productCategoryFilter || 'all'} onValueChange={(v) => { const cat = v === 'all' ? '' : v; setProductCategoryFilter(cat); selectedSupplier && loadSupplierProducts(selectedSupplier.id, 1, false, { category: cat }); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{l.addBySku}</Label>
                <Input
                  placeholder={l.addBySkuPlaceholder}
                  value={addBySkuInput}
                  onChange={e => setAddBySkuInput(e.target.value)}
                  onKeyDown={handleAddBySku}
                />
              </div>

              <div className="space-y-2">
                <Label>Catalog ({filteredProducts.length} {l.items})</Label>
                <ScrollArea className="h-[280px] border rounded-lg p-2">
                  <div className="space-y-1">
                    {productsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading...</div>
                    ) : (
                      filteredProducts.filter(p => p.in_stock).map(product => {
                        const inOrder = orderItems.find(i => i.product.id === product.id)
                        return (
                          <div
                            key={product.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded transition-colors",
                              inOrder ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku || product.barcode} • {(product as any).buyer_price ?? product.unit_price} {l.dzd}</p>
                            </div>
                            {inOrder ? (
                              <Badge variant="secondary" className="shrink-0">
                                <CheckCircle className="h-3 w-3 me-1" />
                                {inOrder.quantity}
                              </Badge>
                            ) : null}
                            <div className="flex items-center gap-1 shrink-0">
                              {inOrder ? (
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:hover:bg-red-900/40 dark:text-red-400" onClick={() => {
                                  if (inOrder.quantity <= 1) {
                                    setOrderItems(items => items.filter(i => i.product.id !== product.id))
                                  } else {
                                    setOrderItems(items => items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity - 1 } : i))
                                  }
                                }}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                              ) : null}
                              <Button size="sm" variant="outline" className={cn(inOrder && "h-8 w-8 p-0", "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:bg-emerald-900/40 dark:text-emerald-400")} onClick={() => addToOrder(product)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  {productsHasMore && (
                    <Button variant="ghost" size="sm" className="w-full mt-2" onClick={loadMoreProducts} disabled={productsLoading}>
                      {l.loadMore}
                    </Button>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Bulk Import tab */}
            <TabsContent value="import" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">{l.csvFormat}</p>
              <div>
                <Label>{l.uploadCsv}</Label>
                <Input type="file" accept=".csv,.txt" onChange={e => setImportFile(e.target.files?.[0] || null)} className="mt-2" />
                {importFile && <p className="text-sm mt-2">{importFile.name}</p>}
              </div>
              <Button onClick={handleBulkImport} disabled={!importFile || importing}>
                {importing ? 'Importing...' : 'Import & Add to Order'}
              </Button>
            </TabsContent>

            {/* Copy from Order tab */}
            <TabsContent value="copy" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">{l.selectOrder}</p>
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {supplierOrdersForCopy.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No previous orders from this supplier</p>
                  ) : (
                    supplierOrdersForCopy.map(order => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleCopyFromOrder(order)}
                      >
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items?.length || 0} items • {order.total?.toLocaleString()} {l.dzd} • {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Copy className="h-4 w-4" />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Order Items - always visible */}
          <div className="mt-6 border-t pt-6 space-y-4">
            {orderError && (
              <Alert variant="destructive">
                <AlertDescription>{orderError}</AlertDescription>
              </Alert>
            )}
            <Label>Order Items ({orderItems.length})</Label>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="divide-y">
                {orderItems.map((item, idx) => {
                  const stock = orderStockMap[item.product.id]
                  const minQty = (item.product as { min_order_qty?: number }).min_order_qty ?? 1
                  const maxQty = stock?.available != null ? stock.available : undefined
                  const isOverStock = maxQty != null && item.quantity > maxQty
                  const isUnderMin = item.quantity < minQty
                  const hasError = isOverStock || isUnderMin
                  return (
                    <div key={item.product.id} className={cn("flex items-center justify-between p-3", hasError && "bg-destructive/5")}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.product.unit_price.toLocaleString()} {l.dzd} × {item.quantity}
                          {maxQty != null && (
                            <span className={cn("ms-2", isOverStock ? "text-destructive font-medium" : "text-muted-foreground")}>
                              • {l.available}: {maxQty}
                            </span>
                          )}
                          {minQty > 1 && (
                            <span className={cn("ms-2", isUnderMin ? "text-destructive font-medium" : "text-muted-foreground")}>
                              • {l.minQty}: {minQty}
                            </span>
                          )}
                        </p>
                        {isOverStock && (
                          <p className="text-xs text-destructive mt-0.5">
                            {stock?.available === 0 && !stock?.inStock ? l.outOfStock : l.reduceQty}
                          </p>
                        )}
                        {isUnderMin && !isOverStock && (
                          <p className="text-xs text-destructive mt-0.5">{l.minQty}: {minQty}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={minQty}
                          max={maxQty ?? undefined}
                          value={item.quantity}
                          onChange={e => {
                            const raw = parseInt(e.target.value, 10)
                            const qty = isNaN(raw) ? 1 : Math.max(0, raw)
                            const capped = maxQty != null ? Math.min(qty, maxQty) : qty
                            const final = capped < 1 ? 1 : capped
                            setOrderItems(items => items.map((i, iIdx) => iIdx === idx ? { ...i, quantity: final } : i))
                          }}
                          className={cn("w-24", hasError && "border-destructive")}
                        />
                        <Button size="icon" variant="ghost" onClick={() => setOrderItems(items => items.filter((_, iIdx) => iIdx !== idx))}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total</span>
              <span className="font-bold">{orderTotal.toLocaleString()} {l.dzd}</span>
            </div>

            <div className="space-y-2">
              <Label>{l.orderNotes}</Label>
              <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Any special instructions..." rows={2} />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>{l.cancel}</Button>
            <Button
              onClick={submitOrder}
              disabled={
                orderItems.length === 0 ||
                submittingOrder ||
                orderItems.some(item => {
                  const stock = orderStockMap[item.product.id]
                  const minQty = (item.product as { min_order_qty?: number }).min_order_qty ?? 1
                  const maxQty = stock?.available
                  if (item.quantity < minQty) return true
                  if (maxQty != null && item.quantity > maxQty) return true
                  if (stock && !stock.inStock) return true
                  return false
                })
              }
            >
              {submittingOrder ? (
                <>
                  <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                  {l.submitting}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 me-2" />
                  {l.submit}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

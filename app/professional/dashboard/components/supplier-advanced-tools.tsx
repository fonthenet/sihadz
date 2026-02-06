'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Upload, Download, FileSpreadsheet, Users, Tag, FileText,
  Plus, Edit, Trash2, RefreshCw, CheckCircle, XCircle,
  Building2, Package, ShoppingCart, TrendingUp, BarChart3
} from 'lucide-react'
import { parseCsv, csvRowToProduct } from '@/lib/supplier/csv-parser'
import { parseExcel, excelRowsToProducts } from '@/lib/supplier/excel-parser'
import { addToSyncQueue, isOnline, cacheSet, cacheGet } from '@/lib/offline-sync'

interface SupplierAdvancedToolsProps {
  supplierId: string
  authUserId?: string | null
}

const LABELS = {
  en: {
    advancedTools: 'Advanced Commercial Tools',
    bulkOperations: 'Bulk Operations',
    pricingManagement: 'Pricing Management',
    buyerGroups: 'Buyer Groups',
    orderTemplates: 'Order Templates',
    importProducts: 'Import Products',
    exportProducts: 'Export Products',
    importFromCSV: 'Import from CSV',
    importFromJSON: 'Import from JSON',
    exportToCSV: 'Export to CSV',
    exportToJSON: 'Export to JSON',
    downloadTemplate: 'Download Template',
    uploadFile: 'Upload File',
    selectFile: 'Select File',
    noFileSelected: 'No file selected',
    importSuccess: 'Products imported successfully',
    exportSuccess: 'Export started',
    tieredPricing: 'Tiered Pricing',
    buyerSpecificPricing: 'Buyer-Specific Pricing',
    volumeDiscounts: 'Volume Discounts',
    addPricingTier: 'Add Pricing Tier',
    minQuantity: 'Min Quantity',
    maxQuantity: 'Max Quantity',
    discountPercent: 'Discount %',
    fixedPrice: 'Fixed Price',
    applyTo: 'Apply To',
    product: 'Product',
    buyerGroup: 'Buyer Group',
    specificBuyer: 'Specific Buyer',
    createGroup: 'Create Buyer Group',
    groupName: 'Group Name',
    defaultPaymentTerms: 'Default Payment Terms',
    defaultDiscount: 'Default Discount %',
    defaultCreditLimit: 'Default Credit Limit',
    buyersInGroup: 'Buyers in Group',
    createTemplate: 'Create Order Template',
    templateName: 'Template Name',
    selectProducts: 'Select Products',
    addToTemplate: 'Add to Template',
    saveTemplate: 'Save Template',
    useTemplate: 'Use Template',
    noTemplates: 'No templates found',
    noGroups: 'No buyer groups found',
    noTiers: 'No pricing tiers found',
  },
  fr: {
    advancedTools: 'Outils Commerciaux Avancés',
    bulkOperations: 'Opérations en Masse',
    pricingManagement: 'Gestion des Prix',
    buyerGroups: 'Groupes d\'Acheteurs',
    orderTemplates: 'Modèles de Commande',
    importProducts: 'Importer Produits',
    exportProducts: 'Exporter Produits',
    importFromCSV: 'Importer depuis CSV',
    importFromJSON: 'Importer depuis JSON',
    exportToCSV: 'Exporter en CSV',
    exportToJSON: 'Exporter en JSON',
    downloadTemplate: 'Télécharger Modèle',
    uploadFile: 'Téléverser Fichier',
    selectFile: 'Sélectionner Fichier',
    noFileSelected: 'Aucun fichier sélectionné',
    importSuccess: 'Produits importés avec succès',
    exportSuccess: 'Export démarré',
    tieredPricing: 'Tarification par Niveaux',
    buyerSpecificPricing: 'Prix Spécifique Acheteur',
    volumeDiscounts: 'Remises Volume',
    addPricingTier: 'Ajouter Niveau Prix',
    minQuantity: 'Quantité Min',
    maxQuantity: 'Quantité Max',
    discountPercent: 'Remise %',
    fixedPrice: 'Prix Fixe',
    applyTo: 'Appliquer À',
    product: 'Produit',
    buyerGroup: 'Groupe Acheteur',
    specificBuyer: 'Acheteur Spécifique',
    createGroup: 'Créer Groupe Acheteur',
    groupName: 'Nom du Groupe',
    defaultPaymentTerms: 'Conditions Paiement Par Défaut',
    defaultDiscount: 'Remise Par Défaut %',
    defaultCreditLimit: 'Limite Crédit Par Défaut',
    buyersInGroup: 'Acheteurs dans le Groupe',
    createTemplate: 'Créer Modèle Commande',
    templateName: 'Nom du Modèle',
    selectProducts: 'Sélectionner Produits',
    addToTemplate: 'Ajouter au Modèle',
    saveTemplate: 'Enregistrer Modèle',
    useTemplate: 'Utiliser Modèle',
    noTemplates: 'Aucun modèle trouvé',
    noGroups: 'Aucun groupe trouvé',
    noTiers: 'Aucun niveau trouvé',
  },
  ar: {
    advancedTools: 'أدوات تجارية متقدمة',
    bulkOperations: 'عمليات بالجملة',
    pricingManagement: 'إدارة الأسعار',
    buyerGroups: 'مجموعات المشترين',
    orderTemplates: 'قوالب الطلبات',
    importProducts: 'استيراد المنتجات',
    exportProducts: 'تصدير المنتجات',
    importFromCSV: 'استيراد من CSV',
    importFromJSON: 'استيراد من JSON',
    exportToCSV: 'تصدير إلى CSV',
    exportToJSON: 'تصدير إلى JSON',
    downloadTemplate: 'تحميل القالب',
    uploadFile: 'رفع الملف',
    selectFile: 'اختر الملف',
    noFileSelected: 'لم يتم اختيار ملف',
    importSuccess: 'تم استيراد المنتجات بنجاح',
    exportSuccess: 'بدأ التصدير',
    tieredPricing: 'تسعير متدرج',
    buyerSpecificPricing: 'تسعير خاص بالمشتري',
    volumeDiscounts: 'خصومات الحجم',
    addPricingTier: 'إضافة مستوى تسعير',
    minQuantity: 'الحد الأدنى',
    maxQuantity: 'الحد الأقصى',
    discountPercent: 'نسبة الخصم',
    fixedPrice: 'سعر ثابت',
    applyTo: 'ينطبق على',
    product: 'المنتج',
    buyerGroup: 'مجموعة المشترين',
    specificBuyer: 'مشتر محدد',
    createGroup: 'إنشاء مجموعة مشترين',
    groupName: 'اسم المجموعة',
    defaultPaymentTerms: 'شروط الدفع الافتراضية',
    defaultDiscount: 'الخصم الافتراضي %',
    defaultCreditLimit: 'حد الائتمان الافتراضي',
    buyersInGroup: 'المشترون في المجموعة',
    createTemplate: 'إنشاء قالب طلب',
    templateName: 'اسم القالب',
    selectProducts: 'اختر المنتجات',
    addToTemplate: 'إضافة إلى القالب',
    saveTemplate: 'حفظ القالب',
    useTemplate: 'استخدام القالب',
    noTemplates: 'لا توجد قوالب',
    noGroups: 'لا توجد مجموعات',
    noTiers: 'لا توجد مستويات',
  },
}

export function SupplierAdvancedTools({ supplierId, authUserId }: SupplierAdvancedToolsProps) {
  const userId = authUserId ?? supplierId
  const { language, dir } = useLanguage()
  const lang = (language === 'ar' ? 'ar' : language === 'en' ? 'en' : 'fr') as 'en' | 'fr' | 'ar'
  const l = LABELS[lang]
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('bulk')
  const [loading, setLoading] = useState(false)
  
  // Bulk operations
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importFormat, setImportFormat] = useState<'csv' | 'json' | 'xlsx'>('json')

  // Buyer groups
  const [buyerGroups, setBuyerGroups] = useState<any[]>([])
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    default_payment_terms: 'cash',
    default_discount_percent: 0,
    default_credit_limit: '',
  })

  // Pricing tiers
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [showTierDialog, setShowTierDialog] = useState(false)
  const [tierForm, setTierForm] = useState({
    product_id: '',
    buyer_group_id: '',
    buyer_id: '',
    min_quantity: '',
    max_quantity: '',
    discount_percent: '',
    fixed_price: '',
    priority: 0,
  })

  // Order templates
  const [orderTemplates, setOrderTemplates] = useState<any[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  // Warehouses
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [warehouseStock, setWarehouseStock] = useState<any[]>([])
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false)
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false)
  const [showAddStockDialog, setShowAddStockDialog] = useState(false)
  const [addStockWarehouse, setAddStockWarehouse] = useState<any>(null)
  const [supplierProducts, setSupplierProducts] = useState<any[]>([])
  const [addStockForm, setAddStockForm] = useState({
    product_id: '',
    quantity: 0,
    batch_number: '',
    lot_number: '',
    expiry_date: '',
    action: 'add' as 'add' | 'set' | 'subtract',
  })
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    address_line1: '',
    wilaya: '',
    commune: '',
    phone: '',
    email: '',
    manager_name: '',
    is_default: false,
  })

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month')

  useEffect(() => {
    if (activeTab === 'groups') loadBuyerGroups()
    if (activeTab === 'pricing') loadPricingTiers()
    if (activeTab === 'templates') loadOrderTemplates()
    if (activeTab === 'warehouses') {
      loadWarehouses()
      loadWarehouseStock()
    }
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, analyticsPeriod])

  const loadBuyerGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supplier/buyer-groups')
      if (res.ok) {
        const data = await res.json()
        setBuyerGroups(data.data || [])
      }
    } catch (error) {
      console.error('Error loading buyer groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPricingTiers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supplier/pricing-tiers')
      if (res.ok) {
        const data = await res.json()
        setPricingTiers(data.data || [])
      }
    } catch (error) {
      console.error('Error loading pricing tiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrderTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supplier/order-templates')
      if (res.ok) {
        const data = await res.json()
        setOrderTemplates(data.data || [])
      }
    } catch (error) {
      console.error('Error loading order templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWarehouses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supplier/warehouses')
      if (res.ok) {
        const data = await res.json()
        setWarehouses(data.data || [])
      }
    } catch (error) {
      console.error('Error loading warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWarehouseStock = async () => {
    try {
      if (!isOnline() && userId) {
        const cached = await cacheGet<unknown[]>(userId, 'supplier-warehouse-stock')
        if (cached?.length) setWarehouseStock(cached)
        return
      }
      const url = expiringSoonOnly ? '/api/supplier/warehouses/stock?expiring_soon=true' : '/api/supplier/warehouses/stock'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const stock = data.data || []
        setWarehouseStock(stock)
        if (userId) await cacheSet(userId, 'supplier-warehouse-stock', stock)
      }
    } catch (error) {
      console.error('Error loading warehouse stock:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'warehouses') loadWarehouseStock()
  }, [activeTab, expiringSoonOnly])

  const openAddStockDialog = async (warehouse: any) => {
    setAddStockWarehouse(warehouse)
    setAddStockForm({ product_id: '', quantity: 0, batch_number: '', lot_number: '', expiry_date: '', action: 'add' })
    setShowAddStockDialog(true)
    try {
      const res = await fetch('/api/supplier/products?limit=500')
      if (res.ok) {
        const data = await res.json()
        setSupplierProducts(data.data || data.products || [])
      }
    } catch (e) {
      console.error('Error loading products:', e)
    }
  }

  const handleAddStock = async () => {
    if (!addStockWarehouse || !addStockForm.product_id || addStockForm.quantity <= 0) {
      toast({ title: 'Error', description: 'Select warehouse, product, and enter quantity', variant: 'destructive' })
      return
    }
    const payload = {
      warehouse_id: addStockWarehouse.id,
      product_id: addStockForm.product_id,
      quantity: addStockForm.quantity,
      batch_number: addStockForm.batch_number || undefined,
      lot_number: addStockForm.lot_number || undefined,
      expiry_date: addStockForm.expiry_date || undefined,
      action: addStockForm.action,
    }
    if (!isOnline() && userId) {
      try {
        await addToSyncQueue(userId, { type: 'stock_update', payload })
        toast({ title: 'Queued', description: 'Stock update will sync when you\'re back online' })
        setShowAddStockDialog(false)
        setAddStockWarehouse(null)
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to queue', variant: 'destructive' })
      }
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/supplier/warehouses/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Stock updated' })
        setShowAddStockDialog(false)
        setAddStockWarehouse(null)
        loadWarehouseStock()
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update stock')
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update stock', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/supplier/analytics?period=${analyticsPeriod}`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWarehouse = async () => {
    if (!warehouseForm.name) {
      toast({
        title: 'Error',
        description: 'Warehouse name is required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/supplier/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseForm),
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Warehouse created',
        })
        setShowWarehouseDialog(false)
        setWarehouseForm({
          name: '',
          code: '',
          address_line1: '',
          wilaya: '',
          commune: '',
          phone: '',
          email: '',
          manager_name: '',
          is_default: false,
        })
        loadWarehouses()
      } else {
        throw new Error('Failed to create warehouse')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create warehouse',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryIdMap = async (): Promise<Record<string, string>> => {
    const map: Record<string, string> = {}
    try {
      const catRes = await fetch('/api/supplier/categories')
      if (catRes.ok) {
        const catData = await catRes.json()
        const cats = Array.isArray(catData) ? catData : (catData.data || catData.categories || [])
        cats.forEach((c: { id: string; name: string; name_fr?: string }) => {
          if (c.name) map[c.name.toLowerCase()] = c.id
          if (c.name_fr) map[c.name_fr.toLowerCase()] = c.id
        })
      }
    } catch {
      /* ignore */
    }
    return map
  }

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: 'Error',
        description: 'Please select a file',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let products: any[] = []

      if (importFormat === 'json') {
        const text = await importFile.text()
        const data = JSON.parse(text)
        products = Array.isArray(data) ? data : data.products || []
      } else if (importFormat === 'xlsx') {
        const buffer = await importFile.arrayBuffer()
        const { rows, errors } = parseExcel(buffer)
        if (errors.length > 0) {
          toast({
            title: 'Excel Parse Error',
            description: errors[0],
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
        if (rows.length === 0) {
          toast({
            title: 'No Data',
            description: 'Excel file has no data rows',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
        const categoryIdMap = await fetchCategoryIdMap()
        products = excelRowsToProducts(rows, categoryIdMap)
      } else {
        const text = await importFile.text()
        const { rows, errors } = parseCsv(text)
        if (errors.length > 0) {
          toast({
            title: 'CSV Parse Error',
            description: errors[0],
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
        if (rows.length === 0) {
          toast({
            title: 'No Data',
            description: 'CSV file has no data rows',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
        const categoryIdMap = await fetchCategoryIdMap()
        products = rows.map((row) => csvRowToProduct(row, categoryIdMap))
      }

      const res = await fetch('/api/supplier/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, format: importFormat }),
      })

      if (res.ok) {
        const result = await res.json()
        toast({
          title: 'Success',
          description: `Imported ${result.summary.success} products (${result.summary.created} created, ${result.summary.updated} updated)`,
        })
        setImportFile(null)
      } else {
        throw new Error('Import failed')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import products',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/supplier/products/export?format=${format}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const ext = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'json'
        a.download = `supplier-products-${new Date().toISOString().split('T')[0]}.${ext}`
        a.click()
        window.URL.revokeObjectURL(url)
        toast({
          title: 'Success',
          description: 'Export started',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export products',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupForm.name) {
      toast({
        title: 'Error',
        description: 'Group name is required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/supplier/buyer-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Buyer group created',
        })
        setShowGroupDialog(false)
        setGroupForm({
          name: '',
          description: '',
          default_payment_terms: 'cash',
          default_discount_percent: 0,
          default_credit_limit: '',
        })
        loadBuyerGroups()
      } else {
        throw new Error('Failed to create group')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create buyer group',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h2 className="text-2xl font-bold">{l.advancedTools}</h2>
        <p className="text-muted-foreground">Professional B2B commercial tools for large-scale operations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="bulk">{l.bulkOperations}</TabsTrigger>
          <TabsTrigger value="pricing">{l.pricingManagement}</TabsTrigger>
          <TabsTrigger value="groups">{l.buyerGroups}</TabsTrigger>
          <TabsTrigger value="templates">{l.orderTemplates}</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Bulk Operations */}
        <TabsContent value="bulk" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {l.importProducts}
                </CardTitle>
                <CardDescription>Import products in bulk from CSV or JSON</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={importFormat} onValueChange={(v: 'csv' | 'json' | 'xlsx') => setImportFormat(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">{l.importFromJSON}</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="csv">{l.importFromCSV}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{l.selectFile}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept={importFormat === 'csv' ? '.csv' : importFormat === 'xlsx' ? '.xlsx,.xls' : '.json'}
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                  </div>
                  {importFile && (
                    <p className="text-sm text-muted-foreground">{importFile.name}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleImport} disabled={!importFile || loading} className="flex-1">
                    <Upload className="h-4 w-4 me-2" />
                    {l.uploadFile}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const headers = 'SKU,Barcode,Name,Name (FR),Name (AR),Unit Price,Min Order Qty,Pack Size,Category,Manufacturer,Batch Number,Expiry Date,In Stock,Stock Quantity'
                      const example = 'SKU-001,1234567890123,Paracetamol 500mg,Paracétamol,باراسيتامول,150,1,20,Medications,Sanofi,BATCH-2025,2026-12-31,Yes,100'
                      const csv = [headers, example].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'supplier-products-template.csv'
                      a.click()
                      window.URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {l.downloadTemplate}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {l.exportProducts}
                </CardTitle>
                <CardDescription>Export your product catalog for backup or integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv')}
                      disabled={loading}
                      className="flex-1"
                    >
                      <FileSpreadsheet className="h-4 w-4 me-2" />
                      {l.exportToCSV}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('json')}
                      disabled={loading}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 me-2" />
                      {l.exportToJSON}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('xlsx')}
                      disabled={loading}
                      className="flex-1"
                    >
                      <FileSpreadsheet className="h-4 w-4 me-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pricing Management */}
        <TabsContent value="pricing" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{l.tieredPricing}</h3>
              <p className="text-sm text-muted-foreground">Set volume discounts and buyer-specific pricing</p>
            </div>
            <Button onClick={() => setShowTierDialog(true)}>
              <Plus className="h-4 w-4 me-2" />
              {l.addPricingTier}
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : pricingTiers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noTiers}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pricingTiers.map(tier => (
                <Card key={tier.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {tier.product?.name || tier.buyer_group?.name || tier.buyer?.business_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {tier.min_quantity}
                          {tier.max_quantity ? ` - ${tier.max_quantity}` : '+'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {tier.fixed_price ? (
                          <Badge>{tier.fixed_price} DZD</Badge>
                        ) : (
                          <Badge>{tier.discount_percent}% {l.discountPercent}</Badge>
                        )}
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Buyer Groups */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{l.buyerGroups}</h3>
              <p className="text-sm text-muted-foreground">Organize buyers into groups with shared pricing and terms</p>
            </div>
            <Button onClick={() => setShowGroupDialog(true)}>
              <Plus className="h-4 w-4 me-2" />
              {l.createGroup}
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : buyerGroups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noGroups}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {buyerGroups.map(group => (
                <Card key={group.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        {group.description && (
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        )}
                      </div>
                      <Badge>{group.buyer_count?.[0]?.count || 0} {l.buyersInGroup}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Payment Terms:</span> {group.default_payment_terms}</p>
                      <p><span className="text-muted-foreground">Default Discount:</span> {group.default_discount_percent}%</p>
                      {group.default_credit_limit && (
                        <p><span className="text-muted-foreground">Credit Limit:</span> {group.default_credit_limit} DZD</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Order Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{l.orderTemplates}</h3>
              <p className="text-sm text-muted-foreground">Save frequently ordered items as templates</p>
            </div>
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 me-2" />
              {l.createTemplate}
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : orderTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{l.noTemplates}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {orderTemplates.map(template => (
                <Card key={template.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                        {template.buyer && (
                          <p className="text-xs text-muted-foreground mt-1">For: {template.buyer.business_name}</p>
                        )}
                      </div>
                      <Badge>{template.items?.length || 0} items</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
                      </p>
                      <Button size="sm" variant="outline">
                        {l.useTemplate}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Warehouses</h3>
              <p className="text-sm text-muted-foreground">Manage multiple warehouse locations and stock levels with batch/lot/expiry tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch id="expiring-soon" checked={expiringSoonOnly} onCheckedChange={setExpiringSoonOnly} />
                <Label htmlFor="expiring-soon" className="text-sm">Expiring soon (30 days)</Label>
              </div>
              <Button onClick={() => setShowWarehouseDialog(true)}>
                <Plus className="h-4 w-4 me-2" />
                Add Warehouse
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : warehouses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No warehouses found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {warehouses.map(warehouse => {
                  const stock = warehouseStock.filter(s => s.warehouse_id === warehouse.id)
                  const totalStock = stock.reduce((sum, s) => sum + (s.quantity || 0), 0)
                  return (
                    <Card key={warehouse.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{warehouse.name}</h4>
                            {(warehouse.address_line1 || warehouse.address) && (
                              <p className="text-sm text-muted-foreground">{warehouse.address_line1 || warehouse.address}</p>
                            )}
                            {warehouse.is_default && (
                              <Badge className="mt-1">Default</Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openAddStockDialog(warehouse)}>
                            <Plus className="h-4 w-4 me-1" />
                            Add Stock
                          </Button>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Total Stock:</span> {totalStock} units</p>
                          <p><span className="text-muted-foreground">Batches:</span> {stock.length} items</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Stock detail table with batch/lot/expiry */}
              {warehouseStock.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stock by Batch / Lot</CardTitle>
                    <CardDescription>Pharma traceability: batch number, lot number, expiry date per warehouse</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Lot</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-end">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseStock.map((s: any) => {
                          const prod = s.product || {}
                          const wh = s.warehouse || {}
                          const expDate = s.expiry_date ? new Date(s.expiry_date) : null
                          const isExpiringSoon = expDate && (expDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000
                          return (
                            <TableRow key={s.id}>
                              <TableCell>{wh.name || wh.code || '-'}</TableCell>
                              <TableCell>{prod.name || prod.sku || s.product_id}</TableCell>
                              <TableCell>{s.batch_number || '-'}</TableCell>
                              <TableCell>{s.lot_number || '-'}</TableCell>
                              <TableCell>
                                {s.expiry_date ? (
                                  <span className={isExpiringSoon ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                                    {expDate?.toLocaleDateString()}
                                  </span>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-end">{s.quantity ?? 0}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Add Stock Dialog */}
          <Dialog open={showAddStockDialog} onOpenChange={(open) => !open && (setShowAddStockDialog(false), setAddStockWarehouse(null))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add / Adjust Stock</DialogTitle>
                <DialogDescription>
                  {addStockWarehouse?.name} — Enter batch/lot/expiry for pharma traceability
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Product</Label>
                  <Select value={addStockForm.product_id} onValueChange={(v) => setAddStockForm(f => ({ ...f, product_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {supplierProducts.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Action</Label>
                  <Select value={addStockForm.action} onValueChange={(v: 'add' | 'set' | 'subtract') => setAddStockForm(f => ({ ...f, action: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add to existing</SelectItem>
                      <SelectItem value="set">Set quantity</SelectItem>
                      <SelectItem value="subtract">Subtract from existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min={0} value={addStockForm.quantity || ''} onChange={e => setAddStockForm(f => ({ ...f, quantity: parseInt(e.target.value, 10) || 0 }))} />
                </div>
                <div>
                  <Label>Batch Number (optional)</Label>
                  <Input value={addStockForm.batch_number} onChange={e => setAddStockForm(f => ({ ...f, batch_number: e.target.value }))} placeholder="e.g. BATCH-2024-001" />
                </div>
                <div>
                  <Label>Lot Number (optional)</Label>
                  <Input value={addStockForm.lot_number} onChange={e => setAddStockForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="e.g. LOT-12345" />
                </div>
                <div>
                  <Label>Expiry Date (optional)</Label>
                  <Input type="date" value={addStockForm.expiry_date} onChange={e => setAddStockForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddStockDialog(false)}>Cancel</Button>
                <Button onClick={handleAddStock} disabled={loading || !addStockForm.product_id || addStockForm.quantity <= 0}>
                  {loading ? 'Updating...' : 'Update Stock'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Sales Analytics</h3>
              <p className="text-sm text-muted-foreground">Business intelligence and performance metrics</p>
            </div>
            <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
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

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          ) : analytics ? (
            <div className="space-y-4">
              {/* Sales Overview */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{analytics.sales?.total_revenue?.toLocaleString() || 0} DZD</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{analytics.sales?.total_orders || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">{analytics.sales?.average_order_value?.toLocaleString() || 0} DZD</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Unique Buyers</p>
                    <p className="text-2xl font-bold">{analytics.sales?.unique_buyers || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Buyers */}
              {analytics.top_buyers && analytics.top_buyers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Buyers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
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
                  </CardContent>
                </Card>
              )}

              {/* Top Products */}
              {analytics.top_products && analytics.top_products.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.top_products.slice(0, 5).map((product: any, idx: number) => (
                        <div key={product.product_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">#{idx + 1}</Badge>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.quantity} units sold</p>
                            </div>
                          </div>
                          <p className="font-bold">{product.revenue.toLocaleString()} DZD</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No analytics data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Buyer Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l.createGroup}</DialogTitle>
            <DialogDescription>Create a new buyer group with shared settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{l.groupName}</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="e.g., Premium Buyers"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{l.defaultPaymentTerms}</Label>
                <Select
                  value={groupForm.default_payment_terms}
                  onValueChange={(v) => setGroupForm({ ...groupForm, default_payment_terms: v })}
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
              <div className="space-y-2">
                <Label>{l.defaultDiscount}</Label>
                <Input
                  type="number"
                  value={groupForm.default_discount_percent}
                  onChange={(e) => setGroupForm({ ...groupForm, default_discount_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{l.defaultCreditLimit} (DZD)</Label>
              <Input
                type="number"
                value={groupForm.default_credit_limit}
                onChange={(e) => setGroupForm({ ...groupForm, default_credit_limit: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={loading}>
              {l.createGroup}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Dialog */}
      <Dialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Warehouse</DialogTitle>
            <DialogDescription>Create a new warehouse location</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warehouse Name *</Label>
                <Input
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="Main Warehouse"
                />
              </div>
              <div className="space-y-2">
                <Label>Warehouse Code</Label>
                <Input
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                  placeholder="WH-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={warehouseForm.address_line1}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address_line1: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wilaya</Label>
                <Input
                  value={warehouseForm.wilaya}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, wilaya: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Commune</Label>
                <Input
                  value={warehouseForm.commune}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, commune: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={warehouseForm.phone}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={warehouseForm.email}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input
                value={warehouseForm.manager_name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_name: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={warehouseForm.is_default}
                onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, is_default: checked })}
              />
              <Label>Set as default warehouse</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarehouseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWarehouse} disabled={loading}>
              Create Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

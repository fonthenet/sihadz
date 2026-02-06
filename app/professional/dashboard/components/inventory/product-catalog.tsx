'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  Pill,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { formatPrice } from '@/lib/inventory/calculations'
import { useScanHandler } from '@/lib/scanner'
import type { PharmacyProduct, ProductCategory, ProductFormData } from '@/lib/inventory/types'

interface ProductCatalogProps {
  onProductChange?: () => void
}

const PRODUCT_FORMS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'injection', label: 'Injection' },
  { value: 'cream', label: 'Cream' },
  { value: 'ointment', label: 'Ointment' },
  { value: 'gel', label: 'Gel' },
  { value: 'drops', label: 'Drops' },
  { value: 'spray', label: 'Spray' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'patch', label: 'Patch' },
  { value: 'suppository', label: 'Suppository' },
  { value: 'powder', label: 'Powder' },
  { value: 'solution', label: 'Solution' },
  { value: 'other', label: 'Other' }
]

const STORAGE_CONDITIONS = [
  { value: 'room_temp', label: 'Room Temperature' },
  { value: 'refrigerated', label: 'Refrigerated (2-8°C)' },
  { value: 'frozen', label: 'Frozen (<-18°C)' },
  { value: 'protected_light', label: 'Protected from Light' }
]

export default function ProductCatalog({ onProductChange }: ProductCatalogProps) {
  const { toast } = useToast()
  const [products, setProducts] = useState<PharmacyProduct[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [chifaFilter, setChifaFilter] = useState<string>('')
  const [prescriptionFilter, setPrescriptionFilter] = useState<string>('')
  const [stockFilter, setStockFilter] = useState<string>('')
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<PharmacyProduct | null>(null)
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    selling_price: 0
  })

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20'
      })
      
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category_id', categoryFilter)
      if (chifaFilter) params.set('is_chifa_listed', chifaFilter)
      if (prescriptionFilter) params.set('requires_prescription', prescriptionFilter)
      if (stockFilter === 'low') params.set('low_stock_only', 'true')
      if (stockFilter === 'out') params.set('out_of_stock_only', 'true')

      const res = await fetch(`/api/pharmacy/inventory/products?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch products')
      
      const data = await res.json()
      setProducts(data.data || [])
      setTotalPages(data.total_pages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter, chifaFilter, prescriptionFilter, stockFilter, toast])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/categories', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const { onKeyDown: searchScanKeyDown } = useScanHandler({
    context: 'inventory',
    value: search,
    onScan: (value) => { setSearch(value); setPage(1) },
    existingOnKeyDown: (e) => { if (e.key === 'Enter') setPage(1) },
  })

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const openNewProductDialog = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      selling_price: 0,
      purchase_price: undefined,
      barcode: '',
      generic_name: '',
      dci_code: '',
      category_id: '',
      form: '',
      dosage: '',
      packaging: '',
      manufacturer: '',
      is_chifa_listed: false,
      reimbursement_rate: 0,
      tarif_reference: undefined,
      requires_prescription: false,
      is_controlled: false,
      min_stock_level: 0,
      tva_rate: 0
    })
    setDialogOpen(true)
  }

  const openEditDialog = (product: PharmacyProduct) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      name_ar: product.name_ar || '',
      selling_price: product.selling_price,
      purchase_price: product.purchase_price || undefined,
      barcode: product.barcode || '',
      sku: product.sku || '',
      generic_name: product.generic_name || '',
      dci_code: product.dci_code || '',
      category_id: product.category_id || '',
      form: product.form || '',
      dosage: product.dosage || '',
      packaging: product.packaging || '',
      manufacturer: product.manufacturer || '',
      is_chifa_listed: product.is_chifa_listed,
      reimbursement_rate: product.reimbursement_rate,
      tarif_reference: product.tarif_reference || undefined,
      requires_prescription: product.requires_prescription,
      is_controlled: product.is_controlled,
      controlled_tableau: product.controlled_tableau || undefined,
      storage_conditions: product.storage_conditions || undefined,
      min_stock_level: product.min_stock_level,
      reorder_quantity: product.reorder_quantity,
      tva_rate: product.tva_rate
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.selling_price) {
      toast({ title: 'Error', description: 'Name and selling price required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = editingProduct 
        ? `/api/pharmacy/inventory/products/${editingProduct.id}`
        : '/api/pharmacy/inventory/products'
      
      const res = await fetch(url, {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save product')
      }

      toast({ title: 'Success', description: editingProduct ? 'Product updated' : 'Product created' })
      setDialogOpen(false)
      fetchProducts()
      onProductChange?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: PharmacyProduct) => {
    if (!confirm(`Delete "${product.name}"?`)) return

    try {
      const res = await fetch(`/api/pharmacy/inventory/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete product')
      }

      toast({ title: 'Success', description: 'Product deleted' })
      fetchProducts()
      onProductChange?.()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const getStockBadge = (product: PharmacyProduct) => {
    const stock = product.current_stock || 0
    const min = product.min_stock_level

    if (stock === 0 && min > 0) {
      return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
    }
    if (stock < min) {
      return <Badge className="bg-orange-500 text-xs">Low</Badge>
    }
    return <Badge variant="outline" className="text-xs">{stock}</Badge>
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setChifaFilter('')
    setPrescriptionFilter('')
    setStockFilter('')
    setPage(1)
  }

  const hasActiveFilters = search || categoryFilter || chifaFilter || prescriptionFilter || stockFilter

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Catalog
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <Button onClick={openNewProductDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Scan or search by name, barcode, DCI..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  onKeyDown={searchScanKeyDown}
                  className="pl-9"
                />
              </div>
              <Button 
                variant={showFilters ? 'secondary' : 'outline'} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1.5" />
                Filters
                {hasActiveFilters && <Badge className="ml-1.5 h-5 w-5 p-0 justify-center">!</Badge>}
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
                <Select value={categoryFilter || "_all"} onValueChange={(v) => { setCategoryFilter(v === "_all" ? "" : v); setPage(1) }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={chifaFilter || "_all"} onValueChange={(v) => { setChifaFilter(v === "_all" ? "" : v); setPage(1) }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Chifa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    <SelectItem value="true">Reimbursable</SelectItem>
                    <SelectItem value="false">Non-reimbursable</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={prescriptionFilter || "_all"} onValueChange={(v) => { setPrescriptionFilter(v === "_all" ? "" : v); setPage(1) }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Prescription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    <SelectItem value="true">Prescription Only</SelectItem>
                    <SelectItem value="false">OTC</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stockFilter || "_all"} onValueChange={(v) => { setStockFilter(v === "_all" ? "" : v); setPage(1) }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Products Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No products found</p>
              <Button variant="link" onClick={openNewProductDialog}>
                Add a product
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Chifa</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.form && `${PRODUCT_FORMS.find(f => f.value === product.form)?.label || product.form}`}
                            {product.dosage && ` ${product.dosage}`}
                            {product.packaging && ` - ${product.packaging}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.barcode || product.dci_code || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(product.selling_price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStockBadge(product)}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.is_chifa_listed ? (
                          <Badge variant="secondary" className="text-xs">
                            {product.reimbursement_rate}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(product)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} products)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              {editingProduct ? 'Edit Product' : 'New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Edit product information' : 'Add a new product to your catalog'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Doliprane 1000mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generic_name">Generic Name (DCI)</Label>
                  <Input
                    id="generic_name"
                    value={formData.generic_name || ''}
                    onChange={(e) => setFormData(f => ({ ...f, generic_name: e.target.value }))}
                    placeholder="e.g. Paracetamol"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="EAN-13"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dci_code">DCI Code</Label>
                  <Input
                    id="dci_code"
                    value={formData.dci_code || ''}
                    onChange={(e) => setFormData(f => ({ ...f, dci_code: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category_id || ''} 
                    onValueChange={(v) => setFormData(f => ({ ...f, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="form">Form</Label>
                  <Select 
                    value={formData.form || ''} 
                    onValueChange={(v) => setFormData(f => ({ ...f, form: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_FORMS.map(form => (
                        <SelectItem key={form.value} value={form.value}>{form.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    value={formData.dosage || ''}
                    onChange={(e) => setFormData(f => ({ ...f, dosage: e.target.value }))}
                    placeholder="e.g. 500mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packaging">Packaging</Label>
                  <Input
                    id="packaging"
                    value={formData.packaging || ''}
                    onChange={(e) => setFormData(f => ({ ...f, packaging: e.target.value }))}
                    placeholder="e.g. Box of 20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData(f => ({ ...f, manufacturer: e.target.value }))}
                />
              </div>

              {/* Pricing */}
              <div className="border-t pt-4 mt-2">
                <p className="font-medium mb-3">Pricing</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price">Purchase Price (DA)</Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price || ''}
                      onChange={(e) => setFormData(f => ({ ...f, purchase_price: parseFloat(e.target.value) || undefined }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_price">Selling Price (DA) *</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={formData.selling_price || ''}
                      onChange={(e) => setFormData(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tva_rate">TVA (%)</Label>
                    <Select 
                      value={String(formData.tva_rate || 0)} 
                      onValueChange={(v) => setFormData(f => ({ ...f, tva_rate: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Exempt)</SelectItem>
                        <SelectItem value="9">9% (Reduced)</SelectItem>
                        <SelectItem value="19">19% (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* CNAS/Chifa */}
              <div className="border-t pt-4 mt-2">
                <p className="font-medium mb-3">CNAS / Chifa</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="is_chifa_listed"
                      checked={formData.is_chifa_listed || false}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, is_chifa_listed: v }))}
                    />
                    <Label htmlFor="is_chifa_listed">CNAS Reimbursable</Label>
                  </div>
                  {formData.is_chifa_listed && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="reimbursement_rate">Reimbursement Rate</Label>
                        <Select 
                          value={String(formData.reimbursement_rate || 80)} 
                          onValueChange={(v) => setFormData(f => ({ ...f, reimbursement_rate: parseInt(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="80">80%</SelectItem>
                            <SelectItem value="100">100%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tarif_reference">Reference Price (DA)</Label>
                        <Input
                          id="tarif_reference"
                          type="number"
                          step="0.01"
                          value={formData.tarif_reference || ''}
                          onChange={(e) => setFormData(f => ({ ...f, tarif_reference: parseFloat(e.target.value) || undefined }))}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Regulatory */}
              <div className="border-t pt-4 mt-2">
                <p className="font-medium mb-3">Regulatory</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="requires_prescription"
                      checked={formData.requires_prescription || false}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, requires_prescription: v }))}
                    />
                    <Label htmlFor="requires_prescription">Prescription Required</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="is_controlled"
                      checked={formData.is_controlled || false}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, is_controlled: v }))}
                    />
                    <Label htmlFor="is_controlled">Controlled Substance</Label>
                  </div>
                </div>
                {formData.is_controlled && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="controlled_tableau">Schedule</Label>
                    <Select 
                      value={formData.controlled_tableau || ''} 
                      onValueChange={(v) => setFormData(f => ({ ...f, controlled_tableau: v as any }))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Schedule A (Narcotics)</SelectItem>
                        <SelectItem value="B">Schedule B (Psychotropics)</SelectItem>
                        <SelectItem value="C">Schedule C (Dangerous)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Stock Management */}
              <div className="border-t pt-4 mt-2">
                <p className="font-medium mb-3">Stock Management</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="min_stock_level">Minimum Stock</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      value={formData.min_stock_level || 0}
                      onChange={(e) => setFormData(f => ({ ...f, min_stock_level: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                    <Input
                      id="reorder_quantity"
                      type="number"
                      value={formData.reorder_quantity || 0}
                      onChange={(e) => setFormData(f => ({ ...f, reorder_quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage_conditions">Storage</Label>
                    <Select 
                      value={formData.storage_conditions || ''} 
                      onValueChange={(v) => setFormData(f => ({ ...f, storage_conditions: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORAGE_CONDITIONS.map(cond => (
                          <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                editingProduct ? 'Save' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
import { LoadingSpinner, SectionLoading } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  Eye,
  EyeOff,
  Star,
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  RefreshCw,
  Check,
} from 'lucide-react'
import type { StorefrontProduct, StorefrontCategory, StorefrontProductFormData, ProductType } from '@/lib/storefront/types'

const PRO_STORE_PREFS_KEY = 'pro-storefront-view-preferences'

type ProViewMode = 'table' | 'grid'
type ProCardSize = 'small' | 'medium' | 'large'
type ProSortBy = 'name' | 'price' | 'category' | 'newest'

interface ProStoreViewPrefs {
  viewMode: ProViewMode
  size: ProCardSize
  sortBy: ProSortBy
}

const defaultProPrefs: ProStoreViewPrefs = {
  viewMode: 'table',
  size: 'medium',
  sortBy: 'newest',
}

function loadProPrefs(): ProStoreViewPrefs {
  if (typeof window === 'undefined') return defaultProPrefs
  try {
    const raw = localStorage.getItem(PRO_STORE_PREFS_KEY)
    if (!raw) return defaultProPrefs
    const parsed = JSON.parse(raw) as Partial<ProStoreViewPrefs>
    return { ...defaultProPrefs, ...parsed }
  } catch {
    return defaultProPrefs
  }
}

function saveProPrefs(prefs: ProStoreViewPrefs) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PRO_STORE_PREFS_KEY, JSON.stringify(prefs))
  } catch {}
}

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'package', label: 'Package' },
]

export default function StorefrontProductsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [categories, setCategories] = useState<StorefrontCategory[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasPharmacyInventory, setHasPharmacyInventory] = useState(false)
  
  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StorefrontProduct | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Import from inventory
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [inventoryProducts, setInventoryProducts] = useState<Array<{
    id: string
    name: string
    name_ar?: string
    selling_price: number
    available_stock: number
    already_imported: boolean
  }>>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [inventorySearch, setInventorySearch] = useState('')
  const [formData, setFormData] = useState<StorefrontProductFormData>({
    name: '',
    price: 0,
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(search && { search }),
        ...(categoryFilter && { category_id: categoryFilter }),
      })
      const res = await fetch(`/api/storefront/products?${params}`)
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
      setHasPharmacyInventory(data.has_pharmacy_inventory || false)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const openCreateDialog = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      product_type: 'product',
      price: 0,
      compare_at_price: null,
      is_available: true,
      stock_quantity: null,
      track_inventory: false,
      image_url: '',
      is_featured: false,
      category_id: null,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (product: StorefrontProduct) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      name_ar: product.name_ar || '',
      description: product.description || '',
      description_ar: product.description_ar || '',
      product_type: product.product_type,
      price: product.price,
      compare_at_price: product.compare_at_price,
      is_available: product.is_available,
      stock_quantity: product.stock_quantity,
      track_inventory: product.track_inventory,
      image_url: product.image_url || '',
      is_featured: product.is_featured,
      category_id: product.category_id,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || formData.price === undefined) {
      toast({ title: 'Error', description: 'Name and price are required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = editingProduct
        ? `/api/storefront/products/${editingProduct.id}`
        : '/api/storefront/products'
      const method = editingProduct ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (res.ok) {
        toast({
          title: editingProduct ? 'Product updated' : 'Product created',
          description: `${formData.name} has been saved`,
        })
        setDialogOpen(false)
        fetchProducts()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: StorefrontProduct) => {
    if (!confirm(`Delete "${product.name}"?`)) return

    try {
      const res = await fetch(`/api/storefront/products/${product.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast({ title: 'Product deleted' })
        fetchProducts()
      } else {
        const data = await res.json()
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const openImportDialog = async () => {
    setImportDialogOpen(true)
    setInventoryLoading(true)
    setSelectedInventoryIds(new Set())
    setInventorySearch('')
    try {
      const res = await fetch('/api/storefront/pharmacy-inventory?exclude_imported=true')
      const data = await res.json()
      setInventoryProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
      setInventoryProducts([])
    } finally {
      setInventoryLoading(false)
    }
  }

  const refreshInventoryList = async () => {
    setInventoryLoading(true)
    try {
      const params = new URLSearchParams({ exclude_imported: 'true' })
      if (inventorySearch) params.set('search', inventorySearch)
      const res = await fetch(`/api/storefront/pharmacy-inventory?${params}`)
      const data = await res.json()
      setInventoryProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setInventoryLoading(false)
    }
  }

  const toggleInventorySelection = (id: string) => {
    setSelectedInventoryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleImport = async () => {
    if (selectedInventoryIds.size === 0) {
      toast({ title: 'Select products', description: 'Select at least one product to import', variant: 'destructive' })
      return
    }
    setImporting(true)
    try {
      const res = await fetch('/api/storefront/products/import-from-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacy_product_ids: Array.from(selectedInventoryIds) }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: 'Import complete',
          description: `${data.imported} product(s) imported to your storefront`,
        })
        setImportDialogOpen(false)
        fetchProducts()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const handleSyncInventory = async (product: StorefrontProduct) => {
    try {
      const res = await fetch(`/api/storefront/products/${product.id}/sync-inventory`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: 'Synced',
          description: `Price and stock updated from inventory`,
        })
        fetchProducts()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const toggleAvailability = async (product: StorefrontProduct) => {
    try {
      const res = await fetch(`/api/storefront/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !product.is_available }),
      })
      if (res.ok) {
        fetchProducts()
      }
    } catch (error) {
      console.error('Error toggling availability:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/professional/dashboard/storefront">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">{total} products in your store</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPharmacyInventory && (
            <Button variant="outline" onClick={openImportDialog}>
              <PackagePlus className="h-4 w-4 mr-1" />
              Import from inventory
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter || '_all'} onValueChange={(v) => setCategoryFilter(v === '_all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(''); setCategoryFilter(''); setPage(1) }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <LoadingSpinner size="lg" className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No products found</p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-1">
                        {product.name}
                        {product.is_featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        {product.pharmacy_product_id && (
                          <Badge variant="outline" className="text-xs">Synced</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{product.product_type}</div>
                    </TableCell>
                    <TableCell>
                      {product.category?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.price.toLocaleString()} DZD</div>
                      {product.compare_at_price && (
                        <div className="text-xs text-muted-foreground line-through">
                          {product.compare_at_price.toLocaleString()} DZD
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.track_inventory ? (
                        <Badge variant={product.stock_quantity! > 0 ? 'secondary' : 'destructive'}>
                          {product.stock_quantity}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unlimited</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.is_available ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleAvailability(product)}
                      >
                        {product.is_available ? (
                          <><Eye className="h-3 w-3 mr-1" /> Visible</>
                        ) : (
                          <><EyeOff className="h-3 w-3 mr-1" /> Hidden</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {product.pharmacy_product_id && (
                            <DropdownMenuItem onClick={() => handleSyncInventory(product)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Sync from inventory
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
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
      </Card>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details' : 'Add a new product to your store'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Paracetamol 500mg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (DZD) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compare_price">Compare at Price</Label>
                <Input
                  id="compare_price"
                  type="number"
                  min={0}
                  placeholder="Original price"
                  value={formData.compare_at_price || ''}
                  onChange={(e) => setFormData({ ...formData, compare_at_price: parseFloat(e.target.value) || null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_type">Type</Label>
                <Select
                  value={formData.product_type}
                  onValueChange={(v) => setFormData({ ...formData, product_type: v as ProductType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id || '_none'}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v === '_none' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description..."
                  rows={2}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-between sm:col-span-2">
                <div>
                  <Label>Track Inventory</Label>
                  <p className="text-xs text-muted-foreground">Enable stock tracking</p>
                </div>
                <Switch
                  checked={formData.track_inventory}
                  onCheckedChange={(checked) => setFormData({ ...formData, track_inventory: checked })}
                />
              </div>

              {formData.track_inventory && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    value={formData.stock_quantity ?? ''}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Available</Label>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <LoadingSpinner size="sm" className="me-2" />}
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from inventory dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import from inventory</DialogTitle>
            <DialogDescription>
              Select pharmacy products to add to your storefront. Price and stock will sync from inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Search inventory..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refreshInventoryList()}
            />
            <Button variant="outline" size="sm" onClick={refreshInventoryList} disabled={inventoryLoading}>
              Search
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-[200px] max-h-[400px] border rounded-md p-2">
            {inventoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" className="text-muted-foreground" />
              </div>
            ) : inventoryProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No products available to import</p>
                <p className="text-sm mt-1">Add products to your pharmacy inventory first</p>
              </div>
            ) : (
              <div className="space-y-1">
                {inventoryProducts.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 ${
                      selectedInventoryIds.has(p.id) ? 'bg-muted' : ''
                    }`}
                    onClick={() => toggleInventorySelection(p.id)}
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.selling_price.toLocaleString()} DZD · Stock: {p.available_stock}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      selectedInventoryIds.has(p.id) ? 'bg-primary border-primary text-primary-foreground' : ''
                    }`}>
                      {selectedInventoryIds.has(p.id) && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedInventoryIds.size === 0}
            >
              {importing && <LoadingSpinner size="sm" className="me-2" />}
              Import {selectedInventoryIds.size > 0 ? `(${selectedInventoryIds.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

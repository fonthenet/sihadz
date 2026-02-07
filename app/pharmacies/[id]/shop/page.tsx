'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  MapPin,
  Phone,
  Clock,
  Star,
  Store,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { CartProvider, useCart } from '@/lib/storefront/cart-context'
import type { StorefrontProduct, StorefrontCategory, StorefrontSettings } from '@/lib/storefront/types'

const STOREFRONT_PREFS_KEY = 'storefront-view-preferences'

type ViewMode = 'grid' | 'list'
type CardSize = 'small' | 'medium' | 'large'
type SortBy = 'name' | 'price-low' | 'price-high' | 'newest'

interface StorefrontViewPrefs {
  viewMode: ViewMode
  size: CardSize
  sortBy: SortBy
}

const defaultPrefs: StorefrontViewPrefs = {
  viewMode: 'grid',
  size: 'small',
  sortBy: 'newest',
}

function getProductPlaceholderSvg(productName: string, size = 400): string {
  const text = productName.replace(/[<>"&]/g, '').substring(0, 25) || 'Product'
  const lines = text.length > 15 ? [text.substring(0, 15), text.substring(15)] : [text]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect fill="#f1f5f9" width="${size}" height="${size}"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="${Math.min(24, size / 12)}" font-weight="500">${lines[0]}</text>${lines[1] ? `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="${Math.min(20, size / 14)}">${lines[1]}</text>` : ''}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function getProductImageUrl(product: StorefrontProduct, allProducts: StorefrontProduct[] = []): string {
  if (product.image_url) return product.image_url
  const list = Array.isArray(allProducts) ? allProducts : []
  const sameCategory = list.find(
    p => p.id !== product.id && p.image_url && p.category_id === product.category_id
  )
  if (sameCategory?.image_url) return sameCategory.image_url
  const anyWithImage = list.find(p => p.id !== product.id && p.image_url)
  if (anyWithImage?.image_url) return anyWithImage.image_url
  return getProductPlaceholderSvg(product.name)
}

function loadPrefs(): StorefrontViewPrefs {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const raw = localStorage.getItem(STOREFRONT_PREFS_KEY)
    if (!raw) return defaultPrefs
    const parsed = JSON.parse(raw) as Partial<StorefrontViewPrefs>
    return { ...defaultPrefs, ...parsed }
  } catch {
    return defaultPrefs
  }
}

function savePrefs(prefs: StorefrontViewPrefs) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STOREFRONT_PREFS_KEY, JSON.stringify(prefs))
  } catch {}
}

// Wrap page with CartProvider
export default function ShopPageWrapper(props: { params: Promise<{ id: string }> }) {
  const { id: professionalId } = use(props.params)
  return (
    <CartProvider>
      <ShopPage professionalId={professionalId} />
    </CartProvider>
  )
}

function ShopPage({ professionalId }: { professionalId: string }) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<StorefrontSettings | null>(null)
  const [professional, setProfessional] = useState<any>(null)
  const [categories, setCategories] = useState<StorefrontCategory[]>([])
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<StorefrontProduct[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // View preferences (persisted in localStorage)
  const [viewPrefs, setViewPrefs] = useState<StorefrontViewPrefs>(defaultPrefs)

  useEffect(() => {
    setViewPrefs(loadPrefs())
  }, [])

  const updateViewPrefs = useCallback((updates: Partial<StorefrontViewPrefs>) => {
    setViewPrefs(prev => {
      const next = { ...prev, ...updates }
      savePrefs(next)
      return next
    })
  }, [])

  const { state: cart, addItem, removeItem, updateQuantity, getSubtotal, getItemCount, setCartOpen } = useCart()

  const fetchStorefront = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category_id', categoryFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/public/storefront/${professionalId}?${params}`)
      const data = await res.json()

      if (!res.ok) {
        console.error('Storefront error:', data.error)
        return
      }

      setSettings(data.settings)
      setProfessional(data.professional)
      setCategories(data.categories || [])
      setProducts(data.products || [])
      setFeaturedProducts(data.featured_products || [])
    } catch (error) {
      console.error('Error fetching storefront:', error)
    } finally {
      setLoading(false)
    }
  }, [professionalId, categoryFilter, search])

  useEffect(() => {
    fetchStorefront()
  }, [fetchStorefront])

  const sortProducts = useCallback((items: StorefrontProduct[]) => {
    const sorted = [...items]
    switch (viewPrefs.sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
    }
    return sorted
  }, [viewPrefs.sortBy])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStorefront()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-32 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!settings || !professional) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Store Not Available</h2>
            <p className="text-muted-foreground mb-4">
              This business does not have an online store enabled.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cartItemCount = getItemCount()
  const subtotal = getSubtotal()
  const isMyStore = cart.professional_id === professionalId

  const gridCols = viewPrefs.viewMode === 'list'
    ? 'grid-cols-1'
    : viewPrefs.size === 'small'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
      : viewPrefs.size === 'large'
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-semibold">{settings.storefront_name || professional.business_name}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {professional.commune}, {professional.wilaya}
                </p>
              </div>
            </div>

            {/* Cart Button */}
            <Sheet open={cart.isOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                  <SheetDescription>
                    {cartItemCount === 0 ? 'Your cart is empty' : `${cartItemCount} items`}
                  </SheetDescription>
                </SheetHeader>

                {cartItemCount === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Add items to your cart</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1 -mx-6 px-6 my-4">
                      <div className="space-y-3">
                        {cart.items.map((item) => (
                          <div key={item.product_id} className="flex gap-3 p-3 rounded-lg border">
                            <img
                              src={item.product.image_url || getProductPlaceholderSvg(item.product.name, 128)}
                              alt={item.product.name}
                              className="w-16 h-16 rounded object-cover shrink-0"
                              onError={(e) => { e.currentTarget.src = getProductPlaceholderSvg(item.product.name, 128) }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.product.price.toLocaleString()} DZD
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm w-6 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 ml-auto text-destructive"
                                  onClick={() => removeItem(item.product_id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span className="font-medium">{subtotal.toLocaleString()} DZD</span>
                      </div>
                      {settings.min_order_amount && subtotal < settings.min_order_amount && (
                        <p className="text-xs text-amber-600">
                          Minimum order: {settings.min_order_amount.toLocaleString()} DZD
                        </p>
                      )}
                      <Button
                        className="w-full"
                        disabled={settings.min_order_amount ? subtotal < settings.min_order_amount : false}
                        asChild
                      >
                        <Link href={`/pharmacies/${professionalId}/shop/checkout`}>
                          Proceed to Checkout
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Store Info Banner */}
        {settings.storefront_description && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">{settings.storefront_description}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs">
                {settings.pickup_enabled && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pickup in ~{settings.preparation_time_minutes} min
                  </span>
                )}
                {settings.delivery_enabled && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Delivery {settings.delivery_fee > 0 ? `(${settings.delivery_fee} DZD)` : 'available'}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {professional.phone}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Categories */}
        <div className="flex flex-wrap gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </form>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={categoryFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
                {cat.product_count !== undefined && (
                  <Badge variant="secondary" className="ml-1">{cat.product_count}</Badge>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* View Controls: mode, size, sort */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={viewPrefs.viewMode === 'grid' ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 px-2"
              onClick={() => updateViewPrefs({ viewMode: 'grid' })}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewPrefs.viewMode === 'list' ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 px-2"
              onClick={() => updateViewPrefs({ viewMode: 'list' })}
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <SlidersHorizontal className="h-4 w-4" />
                Size
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => updateViewPrefs({ size: 'small' })}>
                {viewPrefs.size === 'small' && '✓ '}Small
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateViewPrefs({ size: 'medium' })}>
                {viewPrefs.size === 'medium' && '✓ '}Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateViewPrefs({ size: 'large' })}>
                {viewPrefs.size === 'large' && '✓ '}Large
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => updateViewPrefs({ sortBy: 'newest' })}>
                {viewPrefs.sortBy === 'newest' && '✓ '}Newest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateViewPrefs({ sortBy: 'name' })}>
                {viewPrefs.sortBy === 'name' && '✓ '}Name A–Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateViewPrefs({ sortBy: 'price-low' })}>
                {viewPrefs.sortBy === 'price-low' && '✓ '}Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateViewPrefs({ sortBy: 'price-high' })}>
                {viewPrefs.sortBy === 'price-high' && '✓ '}Price: High to Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Featured Products */}
        {!categoryFilter && !search && featuredProducts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-gray-500" />
              Featured
            </h2>
            <div className={`grid gap-4 ${gridCols}`}>
              {sortProducts(featuredProducts).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  professionalId={professionalId}
                  allProducts={[...featuredProducts, ...products]}
                  onAddToCart={addItem}
                  viewMode={viewPrefs.viewMode}
                  size={viewPrefs.size}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {categoryFilter
              ? categories.find(c => c.id === categoryFilter)?.name || 'Products'
              : 'All Products'}
          </h2>
          {products.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  {search ? 'Try a different search term' : 'Check back later for new products'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${gridCols}`}>
              {sortProducts(
                products.filter(p => !featuredProducts.some(fp => fp.id === p.id) || categoryFilter || search)
              ).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  professionalId={professionalId}
                  allProducts={[...featuredProducts, ...products]}
                  onAddToCart={addItem}
                  viewMode={viewPrefs.viewMode}
                  size={viewPrefs.size}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden">
          <Button
            className="w-full shadow-lg"
            size="lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart ({cartItemCount}) - {subtotal.toLocaleString()} DZD
          </Button>
        </div>
      )}
    </div>
  )
}

// Product Card Component
function ProductCard({
  product,
  professionalId,
  allProducts,
  onAddToCart,
  viewMode = 'grid',
  size = 'medium',
}: {
  product: StorefrontProduct
  professionalId: string
  allProducts: StorefrontProduct[]
  onAddToCart: (product: StorefrontProduct) => void
  viewMode?: ViewMode
  size?: CardSize
}) {
  const [adding, setAdding] = useState(false)
  const productUrl = `/pharmacies/${professionalId}/shop/product/${product.id}`

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAdding(true)
    onAddToCart(product)
    setTimeout(() => setAdding(false), 300)
  }

  const imgSize = viewMode === 'list'
    ? size === 'small'
      ? 'w-16 h-16 sm:w-20 sm:h-20'
      : size === 'large'
        ? 'w-24 h-24 sm:w-32 sm:h-32'
        : 'w-20 h-20 sm:w-24 sm:h-24'
    : size === 'small'
      ? 'aspect-square'
      : size === 'large'
        ? 'aspect-square'
        : 'aspect-square'

  if (viewMode === 'list') {
    return (
      <Link href={productUrl}>
        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex flex-row gap-4 p-4">
          <div className={`${imgSize} shrink-0 rounded-md overflow-hidden bg-muted`}>
            <img
              src={getProductImageUrl(product, allProducts)}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = getProductPlaceholderSvg(product.name) }}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium line-clamp-1">{product.name}</h3>
                {product.is_featured && (
                  <Badge className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs">Featured</Badge>
                )}
                {product.compare_at_price && (
                  <Badge className="bg-red-500 text-xs">Sale</Badge>
                )}
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <div>
                <span className="font-bold">{product.price.toLocaleString()} DZD</span>
                {product.compare_at_price && (
                  <span className="text-sm text-muted-foreground line-through ml-2">
                    {product.compare_at_price.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {product.requires_prescription && (
                  <Badge variant="outline" className="text-xs">
                    Rx
                  </Badge>
                )}
                <Button size="sm" onClick={handleAdd} disabled={adding}>
                  {adding ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      </Link>
    )
  }

  const contentPadding = size === 'small' ? 'p-3' : size === 'large' ? 'p-5' : 'p-4'

  return (
    <Link href={productUrl}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="aspect-square relative bg-muted">
          <img
            src={getProductImageUrl(product, allProducts)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = getProductPlaceholderSvg(product.name) }}
          />
          {product.is_featured && (
            <Badge className="absolute top-2 left-2 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs">Featured</Badge>
          )}
          {product.compare_at_price && (
            <Badge className="absolute top-2 right-2 bg-red-500 text-xs">Sale</Badge>
          )}
        </div>
        <CardContent className={contentPadding}>
          <h3 className={`font-medium mb-1 line-clamp-2 ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : ''}`}>
            {product.name}
          </h3>
          {product.description && size !== 'small' && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className={`font-bold ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : ''}`}>
                {product.price.toLocaleString()} DZD
              </span>
              {product.compare_at_price && (
                <span className="text-sm text-muted-foreground line-through ml-2">
                  {product.compare_at_price.toLocaleString()}
                </span>
              )}
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding}>
              {adding ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          {product.requires_prescription && (
            <Badge variant="outline" className="mt-2 text-xs">
              Requires Prescription
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

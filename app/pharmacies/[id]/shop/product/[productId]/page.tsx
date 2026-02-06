'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
} from 'lucide-react'
import { CartProvider, useCart } from '@/lib/storefront/cart-context'
import { useSmartBack } from '@/hooks/use-smart-back'
import type { StorefrontProduct } from '@/lib/storefront/types'

function getProductPlaceholderSvg(productName: string, size = 600): string {
  const text = productName.replace(/[<>"&]/g, '').substring(0, 25) || 'Product'
  const lines = text.length > 15 ? [text.substring(0, 15), text.substring(15)] : [text]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect fill="#f1f5f9" width="${size}" height="${size}"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="${Math.min(32, size / 10)}" font-weight="500">${lines[0]}</text>${lines[1] ? `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="${Math.min(28, size / 12)}">${lines[1]}</text>` : ''}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function getProductImageUrl(product: StorefrontProduct): string {
  if (product.image_url) return product.image_url
  return getProductPlaceholderSvg(product.name)
}

function CartSheetContent({
  cart,
  professionalId,
  subtotal,
  onUpdateQuantity,
  onRemoveItem,
}: {
  cart: { items: Array<{ product_id: string; product: StorefrontProduct; quantity: number }> }
  professionalId: string
  subtotal: number
  onUpdateQuantity: (id: string, qty: number) => void
  onRemoveItem: (id: string) => void
}) {
  return (
    <div className="flex flex-col">
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
                <p className="text-sm text-muted-foreground">{item.product.price.toLocaleString()} DZD</p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm w-6 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-auto text-destructive"
                    onClick={() => onRemoveItem(item.product_id)}
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
        <Button className="w-full" asChild>
          <Link href={`/pharmacies/${professionalId}/shop/checkout`}>Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  )
}

export default function ProductDetailPageWrapper(props: { params: Promise<{ id: string; productId: string }> }) {
  const { id: professionalId, productId } = use(props.params)
  return (
    <CartProvider>
      <ProductDetailPage professionalId={professionalId} productId={productId} />
    </CartProvider>
  )
}

function ProductDetailPage({ professionalId, productId }: { professionalId: string; productId: string }) {
  const router = useRouter()
  const goBack = useSmartBack(`/pharmacies/${professionalId}/shop`)

  const { addItem, removeItem, updateQuantity, getSubtotal, getItemCount, setCartOpen, state: cart } = useCart()

  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<StorefrontProduct | null>(null)
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!professionalId || !productId) return
    fetch(`/api/public/storefront/${professionalId}/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data.product || null)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [professionalId, productId])

  const handleAddToCart = () => {
    if (!product) return
    setAdding(true)
    addItem(product, quantity)
    setTimeout(() => setAdding(false), 300)
  }

  const cartItem = product ? cart.items.find(i => i.product_id === product.id) : null
  const cartItemCount = getItemCount()
  const subtotal = getSubtotal()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">This product may have been removed or is no longer available.</p>
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const imageUrl = getProductImageUrl(product)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold truncate flex-1 text-center">{product.name}</h1>
            <Sheet open={cart.isOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative shrink-0">
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
                </SheetHeader>
                {cartItemCount === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  <CartSheetContent
                    cart={cart}
                    professionalId={professionalId}
                    subtotal={subtotal}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeItem}
                  />
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div className="aspect-square rounded-xl overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = getProductPlaceholderSvg(product.name) }}
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {product.is_featured && (
                  <Badge className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Featured</Badge>
                )}
                {product.compare_at_price && (
                  <Badge className="bg-red-500">Sale</Badge>
                )}
                {product.requires_prescription && (
                  <Badge variant="outline">Requires Prescription</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{product.price.toLocaleString()} DZD</span>
                {product.compare_at_price && (
                  <span className="text-muted-foreground line-through">
                    {product.compare_at_price.toLocaleString()} DZD
                  </span>
                )}
              </div>
            </div>

            {product.description && (
              <div>
                <h2 className="font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {product.track_inventory && product.stock_quantity != null && (
              <p className="text-sm text-muted-foreground">
                {product.stock_quantity > 0
                  ? `In stock: ${product.stock_quantity}`
                  : 'Out of stock'}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {product.track_inventory && product.stock_quantity === 0 ? (
                <Button disabled className="w-full sm:w-auto">Out of Stock</Button>
              ) : (
                <>
                  <div className="flex items-center gap-2 border rounded-lg p-2 w-fit">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(q => q + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    className="flex-1 sm:flex-initial"
                    onClick={handleAddToCart}
                    disabled={adding}
                  >
                    {adding ? <LoadingSpinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add to Cart {cartItem ? `(${cartItem.quantity} in cart)` : ''}
                  </Button>
                </>
              )}
            </div>

            <Button variant="outline" asChild>
              <Link href={`/pharmacies/${professionalId}/shop`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Store
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

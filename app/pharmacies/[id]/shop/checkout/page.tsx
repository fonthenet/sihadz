'use client'

import { use, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase/client'
import { CartProvider, useCart } from '@/lib/storefront/cart-context'
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  MapPin,
  Clock,
  Truck,
  Banknote,
  CreditCard,
  CheckCircle,
  LogIn,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import type { StorefrontSettings, FulfillmentType, PaymentMethod } from '@/lib/storefront/types'

export default function CheckoutPageWrapper(props: { params: Promise<{ id: string }> }) {
  const { id: professionalId } = use(props.params)
  return (
    <CartProvider>
      <CheckoutPage professionalId={professionalId} />
    </CartProvider>
  )
}

function CheckoutPage({ professionalId }: { professionalId: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const { state: cart, clearCart, getSubtotal, getItemCount } = useCart()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<StorefrontSettings | null>(null)
  const [professional, setProfessional] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    fulfillment_type: 'pickup' as FulfillmentType,
    delivery_address: '',
    delivery_notes: '',
    payment_method: 'cash' as PaymentMethod,
    customer_notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [professionalId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Check auth
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Get user profile if authenticated
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setFormData(prev => ({
            ...prev,
            customer_name: profileData.full_name || '',
            customer_phone: profileData.phone || '',
            customer_email: profileData.email || user.email || '',
          }))
        }
      }

      // Get storefront settings
      const res = await fetch(`/api/public/storefront/${professionalId}`)
      const data = await res.json()

      if (!res.ok) {
        console.error('Storefront error:', data.error)
        return
      }

      setSettings(data.settings)
      setProfessional(data.professional)

      // Set default fulfillment type
      if (data.settings.pickup_enabled) {
        setFormData(prev => ({ ...prev, fulfillment_type: 'pickup' }))
      } else if (data.settings.delivery_enabled) {
        setFormData(prev => ({ ...prev, fulfillment_type: 'delivery' }))
      }

      // Set default payment method
      if (data.settings.accept_cash_on_pickup) {
        setFormData(prev => ({ ...prev, payment_method: 'cash' }))
      } else if (data.settings.accept_online_payment) {
        setFormData(prev => ({ ...prev, payment_method: 'wallet' }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to place an order',
        variant: 'destructive',
      })
      return
    }

    if (cart.items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items to your cart before checking out',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/storefront/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professionalId,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          fulfillment_type: formData.fulfillment_type,
          delivery_address: formData.fulfillment_type === 'delivery' ? formData.delivery_address : undefined,
          delivery_notes: formData.fulfillment_type === 'delivery' ? formData.delivery_notes : undefined,
          payment_method: formData.payment_method,
          customer_notes: formData.customer_notes || undefined,
          items: cart.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order')
      }

      // Success
      setOrderSuccess(data.order.order_number)
      clearCart()
      toast({
        title: 'Order placed!',
        description: `Your order ${data.order.order_number} has been submitted`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const subtotal = getSubtotal()
  const deliveryFee = formData.fulfillment_type === 'delivery' ? (settings?.delivery_fee || 0) : 0
  const total = subtotal + deliveryFee
  const itemCount = getItemCount()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="container max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Order Success
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
            <p className="text-muted-foreground mb-4">
              Your order <span className="font-mono font-medium">{orderSuccess}</span> has been submitted.
            </p>
            <div className="p-4 bg-muted rounded-lg mb-6 text-left">
              <h3 className="font-medium mb-2">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. The store will confirm your order</li>
                <li>2. They will prepare your items</li>
                <li>3. You{"'"}ll receive a notification when it{"'"}s ready</li>
                {formData.fulfillment_type === 'pickup' && (
                  <li>4. Pick up and pay at the store</li>
                )}
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/pharmacies/${professionalId}/shop`}>
                  Continue Shopping
                </Link>
              </Button>
              <Button className="flex-1" asChild>
                <Link href="/dashboard">
                  Track Orders
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <LogIn className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please log in to complete your order
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/pharmacies/${professionalId}/shop`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Shop
                </Link>
              </Button>
              <Button className="flex-1" asChild>
                <Link href="/login">
                  Log In
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty cart
  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Your Cart is Empty</h2>
            <p className="text-muted-foreground mb-6">
              Add items to your cart before checking out
            </p>
            <Button asChild>
              <Link href={`/pharmacies/${professionalId}/shop`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shop
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/pharmacies/${professionalId}/shop`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="font-semibold">Checkout</h1>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order Summary</CardTitle>
              <CardDescription>{professional?.business_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {cart.items.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.product.name}
                  </span>
                  <span>{(item.product.price * item.quantity).toLocaleString()} DZD</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString()} DZD</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>{deliveryFee.toLocaleString()} DZD</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{total.toLocaleString()} DZD</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone *</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    required
                    placeholder="0555 00 00 00"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How would you like to receive your order?</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.fulfillment_type}
                onValueChange={(v) => setFormData({ ...formData, fulfillment_type: v as FulfillmentType })}
                className="space-y-3"
              >
                {settings?.pickup_enabled && (
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4" />
                        Pickup at Store
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ready in ~{settings.preparation_time_minutes} minutes
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {professional?.address_line1}
                      </p>
                    </Label>
                  </div>
                )}

                {settings?.delivery_enabled && (
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <Truck className="h-4 w-4" />
                        Delivery
                        {settings.delivery_fee > 0 && (
                          <Badge variant="secondary">{settings.delivery_fee} DZD</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Delivered to your address
                      </p>
                    </Label>
                  </div>
                )}
              </RadioGroup>

              {formData.fulfillment_type === 'delivery' && (
                <div className="mt-4 space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_address">Delivery Address *</Label>
                    <Textarea
                      id="delivery_address"
                      required
                      placeholder="Full address for delivery"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_notes">Delivery Instructions</Label>
                    <Input
                      id="delivery_notes"
                      placeholder="e.g. Ring the bell, call on arrival"
                      value={formData.delivery_notes}
                      onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.payment_method}
                onValueChange={(v) => setFormData({ ...formData, payment_method: v as PaymentMethod })}
                className="space-y-3"
              >
                {settings?.accept_cash_on_pickup && (
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <Banknote className="h-4 w-4" />
                        Pay at Pickup
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay with cash when you collect your order
                      </p>
                    </Label>
                  </div>
                )}

                {settings?.accept_online_payment && (
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="wallet" id="wallet" />
                    <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <CreditCard className="h-4 w-4" />
                        Pay Online
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        BaridiMob, CIB, or SihaDZ Wallet
                      </p>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special requests or instructions..."
                value={formData.customer_notes}
                onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <LoadingSpinner size="sm" className="me-2" />
                Placing Order...
              </>
            ) : (
              <>
                Place Order - {total.toLocaleString()} DZD
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

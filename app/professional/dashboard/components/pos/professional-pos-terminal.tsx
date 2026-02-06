'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Minus, Trash2, Banknote, CreditCard, Receipt, Package, Edit3, Grid3X3, Search, User } from 'lucide-react'
import { formatPrice } from '@/lib/inventory/calculations'
import { calculateChifaSplit } from '@/lib/inventory/calculations'
import { useAuth } from '@/components/auth-provider'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'
import type { ProfessionalService, AppointmentForPOS } from '@/lib/pos/professional-types'

interface ProCartItem {
  service_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_amount?: number
  discount_percent?: number
  is_chifa_item?: boolean
  reimbursement_rate?: number
}

interface CashDrawerSession {
  id: string
  professional_id: string
  drawer_id: string
  session_number: string
  drawer?: { id: string; name: string; code: string }
}

interface ProfessionalPOSTerminalProps {
  sessionOverride?: CashDrawerSession | null
  professionalName?: string
  employeeUsername?: string | null
  onSaleComplete?: (sale: unknown) => void
  /** Pre-fill from an appointment/ticket */
  appointmentId?: string | null
}

export default function ProfessionalPOSTerminal({
  sessionOverride,
  professionalName,
  onSaleComplete,
  appointmentId,
}: ProfessionalPOSTerminalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const cashInputRef = useRef<HTMLInputElement>(null)

  const [session] = useState<CashDrawerSession | null>(sessionOverride ?? null)
  const [cart, setCart] = useState<ProCartItem[]>([])
  const [chifaEnabled, setChifaEnabled] = useState(false)
  const [cardEnabled, setCardEnabled] = useState(true)

  // Services catalog
  const [services, setServices] = useState<ProfessionalService[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [serviceSearch, setServiceSearch] = useState('')

  // Appointment linking
  const [linkedAppointment, setLinkedAppointment] = useState<AppointmentForPOS | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)

  const [showAddItem, setShowAddItem] = useState(false)
  const [addDescription, setAddDescription] = useState('')
  const [addQuantity, setAddQuantity] = useState(1)
  const [addPrice, setAddPrice] = useState('')
  const [addChifa, setAddChifa] = useState(false)
  const [addReimbursementRate, setAddReimbursementRate] = useState(80)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [showPayment, setShowPayment] = useState(false)
  const [paidCash, setPaidCash] = useState<number>(0)
  const [paidCard, setPaidCard] = useState<number>(0)
  const [processing, setProcessing] = useState(false)

  const [lastSale, setLastSale] = useState<unknown>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showChangeDue, setShowChangeDue] = useState(false)
  const [changeDueAmount, setChangeDueAmount] = useState(0)

  // Fetch settings and services on mount
  useEffect(() => {
    // Fetch POS settings
    fetch('/api/professional/pos/settings')
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data: { settings?: { chifa_enabled?: boolean; card_enabled?: boolean } }) => {
        const s = (data?.settings ?? data) as { chifa_enabled?: boolean; card_enabled?: boolean } | undefined
        setChifaEnabled(s?.chifa_enabled ?? false)
        setCardEnabled(s?.card_enabled ?? true)
      })
      .catch(() => {})

    // Fetch services catalog
    fetch('/api/professional/pos/services')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ services: [] })))
      .then((data: { services?: ProfessionalService[] }) => {
        setServices(data.services || [])
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false))
  }, [])

  // Load appointment data if appointmentId is provided
  useEffect(() => {
    if (!appointmentId) return

    fetch(`/api/professional/pos/appointment?id=${appointmentId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { appointment?: AppointmentForPOS }) => {
        if (data.appointment) {
          const apt = data.appointment
          setLinkedAppointment(apt)
          setPatientId(apt.patient_id)
          setCustomerName(apt.patient_name)
          setCustomerPhone(apt.patient_phone)

          // Auto-add the service to cart if not already paid
          if (!apt.already_paid && apt.service) {
            setCart([{
              service_id: apt.service.id,
              description: apt.service.name,
              quantity: 1,
              unit_price: apt.service.price,
              is_chifa_item: apt.service.is_chifa_eligible,
              reimbursement_rate: apt.service.chifa_reimbursement_rate,
            }])
          }
        }
      })
      .catch(() => {
        toast({ title: 'Could not load appointment', variant: 'destructive' })
      })
  }, [appointmentId, toast])

  // Filter services based on search
  const filteredServices = services.filter((s) =>
    s.service_name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.name_ar && s.name_ar.includes(serviceSearch)) ||
    (s.category && s.category.toLowerCase().includes(serviceSearch.toLowerCase()))
  )

  // Add service from catalog to cart
  const addServiceToCart = (service: ProfessionalService) => {
    // Check if already in cart
    const existingIndex = cart.findIndex((item) => item.service_id === service.id)
    if (existingIndex >= 0) {
      // Increase quantity
      updateQuantity(existingIndex, 1)
      return
    }

    setCart((prev) => [
      ...prev,
      {
        service_id: service.id,
        description: service.service_name,
        quantity: 1,
        unit_price: service.price,
        is_chifa_item: service.is_chifa_eligible ?? false,
        reimbursement_rate: service.chifa_reimbursement_rate ?? 0,
      },
    ])
  }

  const calculateTotals = () => {
    let subtotal = 0
    let chifaTotal = 0
    let patientTotal = 0

    for (const item of cart) {
      const lineSubtotal = item.unit_price * item.quantity
      const lineDiscount = item.discount_amount || lineSubtotal * ((item.discount_percent || 0) / 100)
      const lineTotal = lineSubtotal - lineDiscount

      subtotal += lineSubtotal

      if (chifaEnabled && item.is_chifa_item && (item.reimbursement_rate || 0) > 0) {
        const split = calculateChifaSplit(item.unit_price, undefined, (item.reimbursement_rate || 0) as 0 | 80 | 100, item.quantity)
        chifaTotal += split.chifa_covered
        patientTotal += split.patient_portion
      } else {
        patientTotal += lineTotal
      }
    }

    return {
      subtotal,
      chifaTotal,
      patientTotal,
      netAmount: patientTotal,
    }
  }

  const totals = calculateTotals()
  const totalPaid = paidCash + paidCard

  const setExactAmount = () => setPaidCash(totals.netAmount)

  const handleAddItem = () => {
    const price = parseFloat(addPrice)
    if (!addDescription.trim()) {
      toast({ title: 'Enter description', variant: 'destructive' })
      return
    }
    if (isNaN(price) || price < 0) {
      toast({ title: 'Enter valid price', variant: 'destructive' })
      return
    }
    if (addQuantity < 1) {
      toast({ title: 'Quantity must be at least 1', variant: 'destructive' })
      return
    }

    setCart((prev) => [
      ...prev,
      {
        description: addDescription.trim(),
        quantity: addQuantity,
        unit_price: price,
        discount_amount: 0,
        discount_percent: 0,
        is_chifa_item: chifaEnabled && addChifa,
        reimbursement_rate: addChifa ? addReimbursementRate : 0,
      },
    ])
    setShowAddItem(false)
    setAddDescription('')
    setAddQuantity(1)
    setAddPrice('')
    setAddChifa(false)
  }

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev]
      const q = next[index].quantity + delta
      if (q <= 0) {
        next.splice(index, 1)
      } else {
        next[index] = { ...next[index], quantity: q }
      }
      return next
    })
  }

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const processPayment = async () => {
    if (cart.length === 0) return
    if (totalPaid < totals.netAmount) {
      toast({ title: 'Insufficient payment', variant: 'destructive' })
      return
    }

    const salePayload = {
      session_id: session?.id,
      drawer_id: session?.drawer_id,
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      appointment_id: linkedAppointment?.appointment_id || appointmentId || null,
      patient_id: patientId || null,
      items: cart.map((item) => ({
        service_id: item.service_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0,
        discount_percent: item.discount_percent || 0,
        is_chifa_item: item.is_chifa_item || false,
        reimbursement_rate: item.reimbursement_rate || 0,
      })),
      payments: { cash: paidCash, card: paidCard },
    }

    // Offline: queue for sync when back online
    if (!isOnline() && user?.id) {
      try {
        await addToSyncQueue(user.id, { type: 'professional_pos_sale', payload: salePayload }, 'Professional sale')
        setShowPayment(false)
        setCart([])
        setCustomerName('')
        setCustomerPhone('')
        setPaidCash(0)
        setPaidCard(0)
        setLinkedAppointment(null)
        setPatientId(null)
        toast({ title: 'Queued', description: 'Sale will sync when you\'re back online.' })
        window.dispatchEvent(new CustomEvent('offline-sync-queued'))
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to queue sale', variant: 'destructive' })
      }
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/professional/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      })

      const data = await res.json()
      if (res.ok) {
        setLastSale(data.sale)
        setShowPayment(false)
        setCart([])
        setCustomerName('')
        setCustomerPhone('')
        setPaidCash(0)
        setPaidCard(0)
        setLinkedAppointment(null)
        setPatientId(null)
        onSaleComplete?.(data.sale)

        const change = data.change_given ?? data.sale?.change_given ?? 0
        if (change > 0) {
          setChangeDueAmount(change)
          setShowChangeDue(true)
        } else {
          setShowReceipt(true)
          toast({ title: 'Sale Complete' })
        }
      } else {
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Services Catalog + Cart */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          {/* Linked appointment banner */}
          {linkedAppointment && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <User className="h-4 w-4" />
                <span className="font-medium">Billing for appointment</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {linkedAppointment.patient_name} • {linkedAppointment.visit_type} • {linkedAppointment.appointment_date}
              </p>
              {linkedAppointment.already_paid && (
                <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                  Already Paid
                </Badge>
              )}
            </div>
          )}

          <Tabs defaultValue="services" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="services" className="flex-1">
                <Grid3X3 className="h-4 w-4 me-2" />
                Services
              </TabsTrigger>
              <TabsTrigger value="cart" className="flex-1">
                <Receipt className="h-4 w-4 me-2" />
                Cart ({cart.length})
              </TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services" className="mt-0">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setShowAddItem(true)} size="icon" title="Manual Entry">
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[280px]">
                {loadingServices ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground">
                    Loading services...
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                    <Package className="h-10 w-10 mb-2 opacity-50" />
                    {services.length === 0 ? (
                      <>
                        <p>No services configured</p>
                        <p className="text-xs mt-1">Add services in Settings → Services</p>
                      </>
                    ) : (
                      <p>No matching services</p>
                    )}
                    <Button variant="link" size="sm" onClick={() => setShowAddItem(true)} className="mt-2">
                      <Plus className="h-3 w-3 me-1" />
                      Add Manual Entry
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => addServiceToCart(service)}
                        className="p-3 text-start rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors"
                      >
                        <p className="font-medium text-sm truncate">{service.service_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{service.category || 'General'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-semibold text-sm text-primary">{formatPrice(service.price)}</span>
                          {service.is_chifa_eligible && (
                            <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-green-600 border-green-600">
                              Chifa
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Cart Tab */}
            <TabsContent value="cart" className="mt-0">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm">Cart Items</h3>
                <Button onClick={() => setShowAddItem(true)} size="sm" variant="outline">
                  <Plus className="h-4 w-4 me-2" />
                  Manual Entry
                </Button>
              </div>

              <ScrollArea className="h-[280px] pr-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm">
                    <Receipt className="h-12 w-12 mb-2 opacity-50" />
                    <p>Cart is empty</p>
                    <p className="text-xs mt-1">Select a service or add manually</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item, i) => {
                      const lineTotal = item.unit_price * item.quantity
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatPrice(item.unit_price)}
                              {item.is_chifa_item && (
                                <span className="ms-2 text-green-600">Chifa {item.reimbursement_rate}%</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border rounded">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(i, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(i, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-medium w-20 text-end">{formatPrice(lineTotal)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Customer (optional) */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Right: Totals + Pay */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.chifaTotal > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>CNAS Reimbursement</span>
                  <span>-{formatPrice(totals.chifaTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-green-700 dark:text-green-300">
                  <span>Patient Pays</span>
                  <span>{formatPrice(totals.patientTotal)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPrice(totals.netAmount)}</span>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg mt-4"
            disabled={cart.length === 0}
            onClick={() => setShowPayment(true)}
          >
            <Banknote className="h-5 w-5 me-2" />
            Pay {formatPrice(totals.netAmount)}
          </Button>

          <Button
            variant="outline"
            className="w-full mt-2"
            disabled={cart.length === 0}
            onClick={() => setCart([])}
          >
            <Trash2 className="h-4 w-4 me-2" />
            Clear Cart
          </Button>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Enter description and price (manual entry)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="e.g. Consultation, Lab test, Service..."
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (DZD)</Label>
                <Input
                  type="number"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            {chifaEnabled && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-chifa"
                    checked={addChifa}
                    onChange={(e) => setAddChifa(e.target.checked)}
                  />
                  <Label htmlFor="add-chifa">Chifa / CNAS reimbursable</Label>
                </div>
                {addChifa && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-xs">Reimbursement %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={addReimbursementRate}
                      onChange={(e) => setAddReimbursementRate(parseInt(e.target.value, 10) || 0)}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={showPayment}
        onOpenChange={(open) => {
          setShowPayment(open)
          if (open) setTimeout(() => cashInputRef.current?.focus(), 100)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
            <DialogDescription>Amount due: {formatPrice(totals.netAmount)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={setExactAmount} className="flex-1">
                Exact
              </Button>
              {[500, 1000, 2000, 5000, 10000].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  onClick={() => setPaidCash((p) => p + amt)}
                >
                  +{amt}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Cash (primary)
              </Label>
              <Input
                ref={cashInputRef}
                type="number"
                value={paidCash || ''}
                onChange={(e) => setPaidCash(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && totalPaid >= totals.netAmount) {
                    e.preventDefault()
                    processPayment()
                  }
                }}
                placeholder="0"
                className="text-lg"
              />
            </div>
            {cardEnabled && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card (optional)
                </Label>
                <Input
                  type="number"
                  value={paidCard || ''}
                  onChange={(e) => setPaidCard(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="text-lg"
                />
              </div>
            )}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Paid</span>
                <span className="font-medium">{formatPrice(totalPaid)}</span>
              </div>
              {totalPaid >= totals.netAmount && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Change Due</span>
                  <span>{formatPrice(totalPaid - totals.netAmount)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancel
            </Button>
            <Button
              onClick={processPayment}
              disabled={processing || totalPaid < totals.netAmount}
            >
              {processing ? 'Processing...' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Due Dialog */}
      <Dialog open={showChangeDue} onOpenChange={setShowChangeDue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Due</DialogTitle>
            <DialogDescription>Give the customer</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-4xl font-bold text-green-600">{formatPrice(changeDueAmount)}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowChangeDue(false); setShowReceipt(true); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sale Complete</DialogTitle>
            <DialogDescription>
              {lastSale && typeof lastSale === 'object' && 'sale_number' in lastSale
                ? `Ticket ${(lastSale as { sale_number: string }).sale_number}`
                : 'Receipt'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {lastSale && typeof lastSale === 'object' && 'total_amount' in lastSale ? (
              <p className="text-lg font-medium">
                Total: {formatPrice((lastSale as { total_amount: number }).total_amount)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowReceipt(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

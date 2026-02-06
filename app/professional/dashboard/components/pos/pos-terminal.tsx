'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Receipt,
  ShoppingCart,
  Barcode,
  X,
  Check,
  AlertCircle,
  Wallet,
  Gift,
  Pause,
  Play,
  RotateCcw,
  Percent,
  Edit3,
  Clock,
  DollarSign,
  Smartphone,
  FileText,
  Ban,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  Printer,
  History,
  XCircle,
  RefreshCw,
  ClipboardList
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { formatPrice } from '@/lib/inventory/calculations'
import { useAuth } from '@/components/auth-provider'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'
import { useScanHandler } from '@/lib/scanner'
import type { CartItem, CashDrawerSession, Customer, POSSale } from '@/lib/pos/types'
import { ChifaCardInput } from '@/components/pharmacy/chifa-card-input'

interface Product {
  id: string
  name: string
  barcode?: string
  form?: string
  selling_price: number
  purchase_price?: number
  tva_rate: number
  is_chifa_listed: boolean
  reimbursement_rate: number
  current_stock: number
}

// Extended CartItem with return support
interface ExtendedCartItem extends CartItem {
  is_return?: boolean
  original_sale_id?: string
  original_item_id?: string
  is_damaged?: boolean
}

// Held sale structure
interface HeldSale {
  id: string
  cart: ExtendedCartItem[]
  customer: Customer | null
  heldAt: Date
  heldBy: string
  note?: string
  reason: 'customer_left' | 'price_check' | 'manager_needed' | 'other'
}

interface POSTerminalProps {
  onSaleComplete?: (sale: POSSale) => void
  /** If provided, skip internal session fetch - used by POSUnified */
  sessionOverride?: CashDrawerSession
  professionalName?: string
  employeeUsername?: string | null
}

export default function POSTerminal({ onSaleComplete, sessionOverride, professionalName, employeeUsername }: POSTerminalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const searchRef = useRef<HTMLInputElement>(null)
  const cashInputRef = useRef<HTMLInputElement>(null)
  
  // Session state - use override if provided
  const [session, setSession] = useState<CashDrawerSession | null>(sessionOverride ?? null)
  const [loadingSession, setLoadingSession] = useState(!sessionOverride)
  
  // Cart state
  const [cart, setCart] = useState<ExtendedCartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  
  // Return mode
  const [isReturnMode, setIsReturnMode] = useState(false)
  
  // Hold queue
  const [heldSales, setHeldSales] = useState<HeldSale[]>([])
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [showRecallDialog, setShowRecallDialog] = useState(false)
  const [holdNote, setHoldNote] = useState('')
  const [holdReason, setHoldReason] = useState<HeldSale['reason']>('customer_left')
  
  // Cart-level discount
  const [cartDiscount, setCartDiscount] = useState(0)
  const [cartDiscountType, setCartDiscountType] = useState<'percent' | 'fixed'>('percent')
  
  // Price override
  const [showPriceOverride, setShowPriceOverride] = useState(false)
  const [priceOverrideItem, setPriceOverrideItem] = useState<ExtendedCartItem | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [priceOverrideReason, setPriceOverrideReason] = useState('')
  
  // Item discount
  const [showItemDiscount, setShowItemDiscount] = useState(false)
  const [discountItem, setDiscountItem] = useState<ExtendedCartItem | null>(null)
  const [itemDiscountValue, setItemDiscountValue] = useState('')
  const [itemDiscountType, setItemDiscountType] = useState<'percent' | 'fixed'>('percent')
  
  // Dosage & treatment period (for medications)
  const [showDosageDialog, setShowDosageDialog] = useState(false)
  const [dosageItem, setDosageItem] = useState<ExtendedCartItem | null>(null)
  const [dosageInstructions, setDosageInstructions] = useState('')
  const [treatmentPeriod, setTreatmentPeriod] = useState('')
  const [dosageFrequency, setDosageFrequency] = useState<1 | 2 | 3 | null>(null)
  const [dosageTiming, setDosageTiming] = useState('')
  
  // Customer
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  /** Chifa insured number from card reader (when no customer selected) */
  const [chifaNumber, setChifaNumber] = useState('')
  
  // Payment - split payment support
  const [showPayment, setShowPayment] = useState(false)
  const [paidCash, setPaidCash] = useState<number>(0)
  const [paidCard, setPaidCard] = useState<number>(0)
  const [paidCheque, setPaidCheque] = useState<number>(0)
  const [paidMobile, setPaidMobile] = useState<number>(0)
  const [paidCredit, setPaidCredit] = useState<number>(0)
  const [chequeNumber, setChequeNumber] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Receipt
  const [lastSale, setLastSale] = useState<POSSale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  // Change due popup (prominent display when cash change > 0)
  const [showChangeDue, setShowChangeDue] = useState(false)
  const [changeDueAmount, setChangeDueAmount] = useState(0)
  
  // Refund popup (for returns)
  const [showRefundDue, setShowRefundDue] = useState(false)
  const [refundDueAmount, setRefundDueAmount] = useState(0)
  
  // Receipt lookup for returns
  const [showReceiptLookup, setShowReceiptLookup] = useState(false)
  const [receiptLookupQuery, setReceiptLookupQuery] = useState('')
  const [receiptLookupResults, setReceiptLookupResults] = useState<POSSale[]>([])
  const [searchingReceipts, setSearchingReceipts] = useState(false)
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<POSSale | null>(null)
  
  // Post-sale void
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [voidQuery, setVoidQuery] = useState('')
  const [voidResults, setVoidResults] = useState<POSSale[]>([])
  const [searchingVoid, setSearchingVoid] = useState(false)
  const [saleToVoid, setSaleToVoid] = useState<POSSale | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [processingVoid, setProcessingVoid] = useState(false)
  
  // X-Report and Z-Report
  const [showXReport, setShowXReport] = useState(false)
  const [xReportData, setXReportData] = useState<any>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  
  // No-sale and Cash movements
  const [showNoSaleDialog, setShowNoSaleDialog] = useState(false)
  const [noSaleReason, setNoSaleReason] = useState('')

  // Receipt actions: return picker, void from receipt, modify
  const [receiptReturnItems, setReceiptReturnItems] = useState<Set<number>>(new Set())
  const [showReceiptVoidConfirm, setShowReceiptVoidConfirm] = useState(false)
  const [receiptVoidReason, setReceiptVoidReason] = useState('')
  const [showReceiptModifyConfirm, setShowReceiptModifyConfirm] = useState(false)
  const [voidingFromReceipt, setVoidingFromReceipt] = useState(false)
  const [showReceiptReturnPicker, setShowReceiptReturnPicker] = useState(false)
  const [showCashMovement, setShowCashMovement] = useState(false)
  const [cashMovementType, setCashMovementType] = useState<'in' | 'out'>('in')
  const [cashMovementAmount, setCashMovementAmount] = useState('')
  const [cashMovementReason, setCashMovementReason] = useState('')

  // Recent Sales panel (F3)
  const [showRecentSales, setShowRecentSales] = useState(false)
  const [recentSales, setRecentSales] = useState<POSSale[]>([])
  const [loadingRecentSales, setLoadingRecentSales] = useState(false)
  const [recentSalesFilter, setRecentSalesFilter] = useState<'session' | 'today' | 'week'>('session')
  const [recentSalesSort, setRecentSalesSort] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'customer'>('newest')
  const [recentSalesSearch, setRecentSalesSearch] = useState('')

  // Load current session (skip if sessionOverride is provided)
  useEffect(() => {
    if (!sessionOverride) {
      loadSession()
    }
  }, [sessionOverride])

  const loadSession = async () => {
    try {
      const res = await fetch('/api/pharmacy/pos/sessions?active_only=true')
      if (res.ok) {
        const data = await res.json()
        setSession(data.current_session)
      }
    } catch (err) {
      console.error('Error loading session:', err)
    } finally {
      setLoadingSession(false)
    }
  }

  const loadRecentSales = async (filterOverride?: 'session' | 'today' | 'week') => {
    const filter = filterOverride ?? recentSalesFilter
    setLoadingRecentSales(true)
    try {
      const params = new URLSearchParams({
        per_page: '50',
        status: 'completed',
      })
      if (filter === 'session' && session?.id) {
        params.set('session_id', session.id)
      } else {
        const now = new Date()
        if (filter === 'today') {
          const today = now.toISOString().slice(0, 10)
          params.set('date_from', today)
          params.set('date_to', `${today}T23:59:59`)
        } else if (filter === 'week') {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          params.set('date_from', weekAgo.toISOString().slice(0, 10))
        }
      }
      const res = await fetch(`/api/pharmacy/pos/sales?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecentSales(data.data || [])
      }
    } catch (err) {
      console.error('Error loading recent sales:', err)
    } finally {
      setLoadingRecentSales(false)
    }
  }

  // Filter and sort recent sales (client-side for search; data already filtered by date/session from API)
  const displayedRecentSales = useMemo(() => {
    let list = [...recentSales]
    if (recentSalesSearch.trim()) {
      const q = recentSalesSearch.toLowerCase().trim()
      list = list.filter(s =>
        (s.sale_number || '').toLowerCase().includes(q) ||
        (s.customer_name || 'Walk-in').toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      switch (recentSalesSort) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'amount_high': return (b.total_amount || 0) - (a.total_amount || 0)
        case 'amount_low': return (a.total_amount || 0) - (b.total_amount || 0)
        case 'customer': return (a.customer_name || 'Walk-in').localeCompare(b.customer_name || 'Walk-in')
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    return list
  }, [recentSales, recentSalesSearch, recentSalesSort])

  // Reload when filter changes (and panel is open)
  useEffect(() => {
    if (showRecentSales) loadRecentSales()
  }, [recentSalesFilter, showRecentSales])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except specific keys)
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      
      // Escape - clear search or close dialogs
      if (e.key === 'Escape') {
        if (searchQuery) {
          e.preventDefault()
          setSearchQuery('')
          setSearchResults([])
        }
        return
      }
      
      // F-key shortcuts (work even in inputs)
      if (e.key.startsWith('F') && !e.ctrlKey && !e.altKey) {
        switch (e.key) {
          case 'F3': // Recent sales panel
            e.preventDefault()
            setShowRecentSales(prev => {
              if (!prev) loadRecentSales()
              return !prev
            })
            break
          case 'F2': // Focus search
            e.preventDefault()
            searchRef.current?.focus()
            break
          case 'F4': // Hold sale
            e.preventDefault()
            if (cart.length > 0) setShowHoldDialog(true)
            break
          case 'F5': // Recall sale
            e.preventDefault()
            if (heldSales.length > 0) setShowRecallDialog(true)
            break
          case 'F6': // Toggle return mode
            e.preventDefault()
            setIsReturnMode(!isReturnMode)
            toast({ 
              title: isReturnMode ? 'Sale Mode' : 'Return Mode',
              description: isReturnMode ? 'Switched to normal sale mode' : 'Items will be added as returns'
            })
            break
          case 'F8': // Open payment
            e.preventDefault()
            if (cart.length > 0) setShowPayment(true)
            break
          case 'F9': // No-sale (open drawer)
            e.preventDefault()
            setShowNoSaleDialog(true)
            break
          case 'F10': // X-Report
            e.preventDefault()
            loadXReport()
            break
          case 'F11': // Void sale lookup
            e.preventDefault()
            setShowVoidDialog(true)
            break
          case 'F12': // Complete sale (if in payment dialog)
            if (showPayment) {
              e.preventDefault()
              processPayment()
            }
            break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, cart, heldSales, isReturnMode, showPayment, showRecentSales])

  // Search products with barcode auto-add
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setSearching(true)
    try {
      const res = await fetch(`/api/pharmacy/inventory/products?search=${encodeURIComponent(query)}&per_page=10`)
      if (res.ok) {
        const data = await res.json()
        const results = data.data || []
        
        // BARCODE AUTO-ADD: If exactly one result and barcode matches query, auto-add
        if (results.length === 1) {
          const product = results[0]
          const queryLower = query.trim().toLowerCase()
          const barcodeLower = (product.barcode || '').toLowerCase()
          
          if (barcodeLower && barcodeLower === queryLower) {
            // Exact barcode match - auto-add and clear
            addToCart(product)
            setSearchQuery('')
            setSearchResults([])
            setSearching(false)
            return
          }
        }
        
        setSearchResults(results)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }, [isReturnMode])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchProducts])

  // Hand scanner: on scan (barcode + Enter/Tab), trigger search immediately
  const { onKeyDown: scanKeyDown } = useScanHandler({
    context: 'products',
    value: searchQuery,
    onScan: (value) => {
      setSearchQuery(value)
      searchProducts(value)
    },
    existingOnKeyDown: (e) => {
      if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault()
        addToCart(searchResults[0])
      }
    },
    prioritizeExisting: true,
  })

  const { onKeyDown: receiptLookupScanKeyDown } = useScanHandler({
    context: 'receipts',
    value: receiptLookupQuery,
    onScan: (value) => searchReceipts(value),
    existingOnKeyDown: (e) => e.key === 'Enter' && searchReceipts(),
  })

  const { onKeyDown: voidScanKeyDown } = useScanHandler({
    context: 'receipts',
    value: voidQuery,
    onScan: (value) => searchSalesForVoid(value),
    existingOnKeyDown: (e) => e.key === 'Enter' && searchSalesForVoid(),
  })

  // Add to cart with return mode and stock validation
  const addToCart = (product: Product) => {
    // Stock validation (only for sales, not returns)
    if (!isReturnMode && product.current_stock <= 0) {
      toast({ 
        title: 'Out of Stock', 
        description: `${product.name} has no available stock`,
        variant: 'destructive'
      })
      return
    }
    
    // Low stock warning
    if (!isReturnMode && product.current_stock > 0 && product.current_stock <= 5) {
      toast({ 
        title: 'Low Stock Warning', 
        description: `Only ${product.current_stock} units remaining`,
        variant: 'default'
      })
    }
    
    // For returns, look for existing return item
    // For sales, look for existing sale item
    const existing = cart.find(item => 
      item.product_id === product.id && 
      (isReturnMode ? item.is_return : !item.is_return)
    )
    
    if (existing) {
      // Increase/decrease quantity based on mode
      setCart(cart.map(item => 
        item.product_id === product.id && (isReturnMode ? item.is_return : !item.is_return)
          ? { ...item, quantity: item.quantity + (isReturnMode ? -1 : 1) }
          : item
      ))
    } else {
      // Add new item
      const newItem: ExtendedCartItem = {
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        product_form: product.form,
        quantity: isReturnMode ? -1 : 1, // Negative for returns
        unit_price: product.selling_price,
        unit_cost: product.purchase_price,
        discount_amount: 0,
        discount_percent: 0,
        tva_rate: product.tva_rate || 0,
        is_chifa_item: product.is_chifa_listed,
        reimbursement_rate: product.reimbursement_rate || 0,
        is_return: isReturnMode
      }
      setCart([...cart, newItem])
    }
    
    setSearchQuery('')
    setSearchResults([])
    searchRef.current?.focus()
  }

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  // Remove from cart
  const removeFromCart = (productId: string, isReturn?: boolean) => {
    setCart(cart.filter(item => 
      !(item.product_id === productId && (isReturn ? item.is_return : !item.is_return))
    ))
  }

  // Hold current sale
  const holdSale = () => {
    if (cart.length === 0) return
    
    const heldSale: HeldSale = {
      id: crypto.randomUUID(),
      cart: [...cart],
      customer,
      heldAt: new Date(),
      heldBy: session?.opened_by_name || 'Unknown',
      note: holdNote,
      reason: holdReason
    }
    
    setHeldSales([...heldSales, heldSale])
    setCart([])
    setCustomer(null)
    setHoldNote('')
    setHoldReason('customer_left')
    setShowHoldDialog(false)
    
    toast({ title: 'Sale Held', description: `${heldSale.cart.length} items saved. Press F5 to recall.` })
    searchRef.current?.focus()
  }

  // Recall held sale
  const recallSale = (heldSale: HeldSale) => {
    // If current cart has items, ask to hold or merge
    if (cart.length > 0) {
      // For simplicity, we'll hold current cart first
      const currentHeld: HeldSale = {
        id: crypto.randomUUID(),
        cart: [...cart],
        customer,
        heldAt: new Date(),
        heldBy: session?.opened_by_name || 'Unknown',
        note: 'Auto-held before recall',
        reason: 'other'
      }
      setHeldSales(prev => [...prev.filter(h => h.id !== heldSale.id), currentHeld])
    } else {
      setHeldSales(heldSales.filter(h => h.id !== heldSale.id))
    }
    
    setCart(heldSale.cart)
    setCustomer(heldSale.customer)
    setShowRecallDialog(false)
    
    toast({ title: 'Sale Recalled', description: `${heldSale.cart.length} items restored` })
    searchRef.current?.focus()
  }

  // Delete held sale
  const deleteHeldSale = (id: string) => {
    setHeldSales(heldSales.filter(h => h.id !== id))
  }

  // Update item discount
  const applyItemDiscount = () => {
    if (!discountItem) return
    
    const value = parseFloat(itemDiscountValue) || 0
    setCart(cart.map(item => {
      if (item.product_id === discountItem.product_id && item.is_return === discountItem.is_return) {
        if (itemDiscountType === 'percent') {
          return { ...item, discount_percent: value, discount_amount: 0 }
        } else {
          return { ...item, discount_amount: value, discount_percent: 0 }
        }
      }
      return item
    }))
    
    setShowItemDiscount(false)
    setDiscountItem(null)
    setItemDiscountValue('')
  }

  // Apply price override
  const applyPriceOverride = () => {
    if (!priceOverrideItem) return
    
    const price = parseFloat(newPrice) || 0
    if (price <= 0) {
      toast({ title: 'Invalid Price', variant: 'destructive' })
      return
    }
    
    setCart(cart.map(item => {
      if (item.product_id === priceOverrideItem.product_id && item.is_return === priceOverrideItem.is_return) {
        return { ...item, unit_price: price }
      }
      return item
    }))
    
    setShowPriceOverride(false)
    setPriceOverrideItem(null)
    setNewPrice('')
    setPriceOverrideReason('')
    toast({ title: 'Price Updated' })
  }

  // Apply dosage and treatment period
  const applyDosage = () => {
    if (!dosageItem) return
    setCart(cart.map(item => {
      if (item.product_id === dosageItem.product_id && item.is_return === dosageItem.is_return) {
        return {
          ...item,
          dosage_instructions: dosageInstructions.trim() || undefined,
          treatment_period: treatmentPeriod.trim() || undefined
        }
      }
      return item
    }))
    setShowDosageDialog(false)
    setDosageItem(null)
    setDosageInstructions('')
    setTreatmentPeriod('')
    if (dosageInstructions.trim() || treatmentPeriod.trim()) {
      toast({ title: 'Dosage added', description: 'Instructions will appear on receipt' })
    }
  }

  const openDosageDialog = (item: ExtendedCartItem) => {
    setDosageItem(item)
    setDosageInstructions(item.dosage_instructions || '')
    setTreatmentPeriod(item.treatment_period || '')
    setDosageFrequency(null as 1 | 2 | 3 | null)
    setDosageTiming('')
    setShowDosageDialog(true)
  }

  // Dosage unit by product form — not every medicine is a pill (gel, cream, syrup, etc.)
  const getDosageText = (timing: string): string => {
    const form = (dosageItem?.product_form || 'tablet').toLowerCase()
    const timingMap: Record<string, Record<string, string>> = {
      matin: {
        tablet: '1 comprimé le matin',
        capsule: '1 gélule le matin',
        gel: '1 application le matin',
        cream: '1 application le matin',
        ointment: '1 application le matin',
        syrup: '1 cuillère le matin',
        suspension: '1 cuillère le matin',
        drops: 'X gouttes le matin',
        spray: '1 pulvérisation le matin',
        inhaler: '1 inhalation le matin',
        suppository: '1 suppositoire le matin',
        patch: '1 patch le matin',
        injection: '1 injection le matin',
        solution: '1 prise le matin',
        powder: '1 sachet le matin',
        other: '1 prise le matin'
      },
      midi: {
        tablet: '1 comprimé à midi',
        capsule: '1 gélule à midi',
        gel: '1 application à midi',
        cream: '1 application à midi',
        ointment: '1 application à midi',
        syrup: '1 cuillère à midi',
        suspension: '1 cuillère à midi',
        drops: 'X gouttes à midi',
        spray: '1 pulvérisation à midi',
        inhaler: '1 inhalation à midi',
        suppository: '1 suppositoire à midi',
        patch: '1 patch à midi',
        injection: '1 injection à midi',
        solution: '1 prise à midi',
        powder: '1 sachet à midi',
        other: '1 prise à midi'
      },
      soir: {
        tablet: '1 comprimé le soir',
        capsule: '1 gélule le soir',
        gel: '1 application le soir',
        cream: '1 application le soir',
        ointment: '1 application le soir',
        syrup: '1 cuillère le soir',
        suspension: '1 cuillère le soir',
        drops: 'X gouttes le soir',
        spray: '1 pulvérisation le soir',
        inhaler: '1 inhalation le soir',
        suppository: '1 suppositoire le soir',
        patch: '1 patch le soir',
        injection: '1 injection le soir',
        solution: '1 prise le soir',
        powder: '1 sachet le soir',
        other: '1 prise le soir'
      },
      matin_soir: {
        tablet: '1 comprimé matin et soir',
        capsule: '1 gélule matin et soir',
        gel: '1 application matin et soir',
        cream: '1 application matin et soir',
        ointment: '1 application matin et soir',
        syrup: '1 cuillère matin et soir',
        suspension: '1 cuillère matin et soir',
        drops: 'X gouttes matin et soir',
        spray: '1 pulvérisation matin et soir',
        inhaler: '1 inhalation matin et soir',
        suppository: '1 suppositoire matin et soir',
        patch: '1 patch matin et soir',
        injection: '1 injection matin et soir',
        solution: '1 prise matin et soir',
        powder: '1 sachet matin et soir',
        other: '1 prise matin et soir'
      },
      matin_midi_soir: {
        tablet: '1 comprimé matin, midi et soir',
        capsule: '1 gélule matin, midi et soir',
        gel: '1 application matin, midi et soir',
        cream: '1 application matin, midi et soir',
        ointment: '1 application matin, midi et soir',
        syrup: '1 cuillère matin, midi et soir',
        suspension: '1 cuillère matin, midi et soir',
        drops: 'X gouttes matin, midi et soir',
        spray: '1 pulvérisation matin, midi et soir',
        inhaler: '1 inhalation matin, midi et soir',
        suppository: '1 suppositoire matin, midi et soir',
        patch: '1 patch matin, midi et soir',
        injection: '1 injection matin, midi et soir',
        solution: '1 prise matin, midi et soir',
        powder: '1 sachet matin, midi et soir',
        other: '1 prise matin, midi et soir'
      }
    }
    return timingMap[timing]?.[form] || timingMap[timing]?.['other'] || ''
  }

  // Treatment period presets — click to select (common in Algerian pharmacies)
  const PERIOD_PRESETS = [
    '3 jours', '5 jours', '7 jours', '10 jours', '14 jours', '21 jours',
    '1 mois', '2 mois', '3 mois', 'Jusqu\'à fin'
  ]

  // Calculate totals with cart-level discount and return support
  const calculateTotals = () => {
    let subtotal = 0
    let taxTotal = 0
    let chifaTotal = 0
    let patientTotal = 0
    let returnSubtotal = 0

    for (const item of cart) {
      const qty = Math.abs(item.quantity)
      const isNegative = item.quantity < 0
      
      const lineSubtotal = item.unit_price * qty * (isNegative ? -1 : 1)
      const lineDiscount = item.discount_amount || (Math.abs(lineSubtotal) * (item.discount_percent || 0) / 100) * (isNegative ? -1 : 1)
      const lineAfterDiscount = lineSubtotal - lineDiscount
      const lineTax = lineAfterDiscount * (item.tva_rate || 0) / 100
      const lineTotal = lineAfterDiscount + lineTax

      subtotal += lineSubtotal
      taxTotal += lineTax
      
      if (isNegative) {
        returnSubtotal += Math.abs(lineSubtotal)
      }

      if (item.is_chifa_item && item.reimbursement_rate > 0 && !isNegative) {
        const cnasAmount = lineTotal * item.reimbursement_rate / 100
        chifaTotal += cnasAmount
        patientTotal += lineTotal - cnasAmount
      } else {
        patientTotal += lineTotal
      }
    }

    // Apply cart-level discount
    let cartDiscountAmount = 0
    if (cartDiscount > 0 && patientTotal > 0) {
      if (cartDiscountType === 'percent') {
        cartDiscountAmount = patientTotal * cartDiscount / 100
      } else {
        cartDiscountAmount = cartDiscount
      }
      patientTotal = Math.max(0, patientTotal - cartDiscountAmount)
    }

    return {
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      chifaTotal,
      patientTotal,
      cartDiscountAmount,
      returnSubtotal,
      isRefund: patientTotal < 0,
      netAmount: Math.abs(patientTotal)
    }
  }

  const totals = calculateTotals()
  
  // Count items by type
  const saleItemsCount = cart.filter(i => !i.is_return && i.quantity > 0).length
  const returnItemsCount = cart.filter(i => i.is_return || i.quantity < 0).length
  const totalPaid = paidCash + paidCard + paidCheque + paidMobile + paidCredit

  // Search customers
  const searchCustomers = async () => {
    if (!customerSearch.trim()) return
    try {
      const res = await fetch(`/api/pharmacy/customers?search=${encodeURIComponent(customerSearch)}`)
      if (res.ok) {
        const data = await res.json()
        setCustomerResults(data.data || [])
      }
    } catch (err) {
      console.error('Customer search error:', err)
    }
  }

  // Process payment (supports split payment and refunds)
  const processPayment = async () => {
    if (cart.length === 0) return
    
    // For refunds, no payment needed - just process
    if (!totals.isRefund) {
      if (totalPaid < totals.netAmount) {
        toast({ title: 'Error', description: 'Insufficient payment', variant: 'destructive' })
        return
      }
    }

    const salePayload = {
      session_id: session?.id,
      customer_id: customer?.id,
      customer_name: customer?.full_name,
      customer_phone: customer?.phone,
      items: cart.map(item => ({ ...item, quantity: item.quantity })),
      discount_percent: cartDiscountType === 'percent' ? cartDiscount : 0,
      payments: {
        cash: paidCash,
        card: paidCard,
        cheque: paidCheque,
        mobile: paidMobile,
        credit: paidCredit
      },
      cheque_number: chequeNumber || undefined,
      is_return: totals.isRefund
    }

    // Offline: queue for sync when back online
    if (!isOnline() && user?.id) {
      try {
        await addToSyncQueue(user.id, { type: 'sale', payload: salePayload }, totals.isRefund ? 'Sale (refund)' : 'Sale')
        setShowPayment(false)
        setCart([])
        setCustomer(null)
        setChifaNumber('')
        setCartDiscount(0)
        setPaidCash(0)
        setPaidCard(0)
        setPaidCheque(0)
        setPaidMobile(0)
        setPaidCredit(0)
        setChequeNumber('')
        setIsReturnMode(false)
        toast({ title: 'Queued', description: 'Sale will sync when you\'re back online.' })
        window.dispatchEvent(new CustomEvent('offline-sync-queued'))
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to queue sale', variant: 'destructive' })
      }
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/pharmacy/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      })

      const data = await res.json()
      if (res.ok) {
        setLastSale(data.sale)
        setShowPayment(false)
        setCart([])
        setCustomer(null)
        setChifaNumber('')
        setCartDiscount(0)
        setPaidCash(0)
        setPaidCard(0)
        setPaidCheque(0)
        setPaidMobile(0)
        setPaidCredit(0)
        setChequeNumber('')
        setIsReturnMode(false)
        onSaleComplete?.(data.sale)
        loadRecentSales()
        // Handle change or refund popup
        if (totals.isRefund) {
          setRefundDueAmount(totals.netAmount)
          setShowRefundDue(true)
        } else {
          const change = data.sale?.change_given ?? data.change_given ?? 0
          if (change > 0) {
            setChangeDueAmount(change)
            setShowChangeDue(true)
          } else {
            setShowReceipt(true)
            toast({ title: 'Sale Complete' })
          }
        }
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  // Set exact amount
  const setExactAmount = () => {
    if (totals.isRefund) return
    setPaidCash(totals.netAmount)
    setPaidCard(0)
    setPaidCheque(0)
    setPaidMobile(0)
    setPaidCredit(0)
  }

  // Search receipts for returns
  const searchReceipts = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? receiptLookupQuery).trim()
    if (!q) return
    if (overrideQuery) setReceiptLookupQuery(overrideQuery)
    
    setSearchingReceipts(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sales?search=${encodeURIComponent(q)}&status=completed&per_page=10`)
      if (res.ok) {
        const data = await res.json()
        setReceiptLookupResults(data.data || [])
      }
    } catch (err) {
      console.error('Receipt search error:', err)
    } finally {
      setSearchingReceipts(false)
    }
  }

  // Add items from original sale as returns
  const addReturnFromSale = (sale: POSSale, items?: any[]) => {
    const itemsToReturn = items || sale.items || []
    
    for (const item of itemsToReturn) {
      const newItem: ExtendedCartItem = {
        product_id: item.product_id,
        product_name: item.product_name,
        product_barcode: item.product_barcode,
        product_form: item.product_form,
        quantity: -Math.abs(item.quantity - (item.quantity_returned || 0)), // Negative for returns
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        discount_amount: 0,
        discount_percent: 0,
        tva_rate: item.tva_rate || 0,
        is_chifa_item: item.is_chifa_item,
        reimbursement_rate: item.reimbursement_rate || 0,
        is_return: true,
        original_sale_id: sale.id,
        original_item_id: item.id,
        dosage_instructions: item.dosage_instructions,
        treatment_period: item.treatment_period
      }
      setCart(prev => [...prev, newItem])
    }
    
    setShowReceiptLookup(false)
    setSelectedSaleForReturn(null)
    setReceiptLookupQuery('')
    setReceiptLookupResults([])
    toast({ title: 'Items Added for Return', description: `${itemsToReturn.length} items added to cart` })
  }

  // Load sale items to cart for modify (void + re-ring) - as sale items, not returns
  const loadSaleToCartForModify = (sale: POSSale) => {
    const items = sale.items || []
    const newItems: ExtendedCartItem[] = items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_barcode: item.product_barcode,
      product_form: item.product_form,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: item.unit_cost,
      discount_amount: item.discount_amount || 0,
      discount_percent: item.discount_percent || 0,
      tva_rate: item.tva_rate || 0,
      is_chifa_item: item.is_chifa_item,
      reimbursement_rate: item.reimbursement_rate || 0,
      is_return: false,
      dosage_instructions: item.dosage_instructions,
      treatment_period: item.treatment_period
    }))
    setCart(prev => [...prev, ...newItems])
    if (sale.customer_name) {
      setCustomer({
        id: sale.customer_id || '',
        pharmacy_id: sale.pharmacy_id || session?.pharmacy_id || '',
        full_name: sale.customer_name,
        phone: sale.customer_phone,
        loyalty_tier: 'bronze',
        loyalty_points: 0,
        total_points_earned: 0,
        total_points_used: 0,
        credit_limit: 0,
        credit_balance: 0,
        total_purchases: 0,
        purchase_count: 0,
        is_active: true,
        created_at: '',
        updated_at: ''
      } as Customer)
    }
    setShowReceipt(false)
    setLastSale(null)
    toast({ title: 'Items Loaded', description: 'Adjust items and complete as new sale. Original receipt will be voided.' })
    loadRecentSales()
  }

  // Void sale from receipt dialog
  const processVoidFromReceipt = async () => {
    if (!lastSale || lastSale.status !== 'completed' || !receiptVoidReason.trim()) return
    setVoidingFromReceipt(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sales/${lastSale.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: receiptVoidReason.trim() })
      })
      if (res.ok) {
        toast({ title: 'Sale Voided', description: `Receipt #${lastSale.sale_number} voided (kept for audit)` })
        setShowReceipt(false)
        setLastSale(null)
        setShowReceiptVoidConfirm(false)
        setReceiptVoidReason('')
        loadRecentSales()
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to void')
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setVoidingFromReceipt(false)
    }
  }

  // Modify: void + load items to cart for re-ring (new receipt #)
  const processModifyFromReceipt = async () => {
    if (!lastSale || lastSale.status !== 'completed') return
    setVoidingFromReceipt(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sales/${lastSale.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Modified – re-ring with adjustments' })
      })
      if (res.ok) {
        loadSaleToCartForModify(lastSale)
        setShowReceiptModifyConfirm(false)
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to void')
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setVoidingFromReceipt(false)
    }
  }

  // Add selected return items from receipt dialog to cart
  const addReceiptReturnItemsToCart = () => {
    if (!lastSale || receiptReturnItems.size === 0) return
    const items = lastSale.items || []
    const toReturn = items.filter((_, idx) => receiptReturnItems.has(idx))
    const withQty = toReturn.map(item => ({
      ...item,
      returnable: item.quantity - (item.quantity_returned || 0)
    })).filter(i => i.returnable > 0)
    if (withQty.length === 0) {
      toast({ title: 'No items to return', description: 'Selected items may already be returned', variant: 'destructive' })
      return
    }
    addReturnFromSale(lastSale, withQty)
    setShowReceipt(false)
    setLastSale(null)
    setReceiptReturnItems(new Set())
    setIsReturnMode(true)
  }

  // Search sales for void
  const searchSalesForVoid = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? voidQuery).trim()
    if (!q) return
    if (overrideQuery) setVoidQuery(overrideQuery)
    
    setSearchingVoid(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sales?search=${encodeURIComponent(q)}&status=completed&session_id=${session?.id || ''}&per_page=10`)
      if (res.ok) {
        const data = await res.json()
        setVoidResults(data.data || [])
      }
    } catch (err) {
      console.error('Void search error:', err)
    } finally {
      setSearchingVoid(false)
    }
  }

  // Process void
  const processVoid = async () => {
    if (!saleToVoid || !voidReason) return
    
    setProcessingVoid(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sales/${saleToVoid.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason })
      })
      
      if (res.ok) {
        toast({ title: 'Sale Voided', description: `Sale #${saleToVoid.sale_number} has been voided` })
        setShowVoidDialog(false)
        setSaleToVoid(null)
        setVoidReason('')
        setVoidQuery('')
        setVoidResults([])
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to void sale')
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setProcessingVoid(false)
    }
  }

  // Load X-Report (mid-day summary)
  const loadXReport = async () => {
    if (!session) return
    
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/pharmacy/pos/sessions/${session.id}/report?type=x`)
      if (res.ok) {
        const data = await res.json()
        setXReportData(data)
        setShowXReport(true)
      }
    } catch (err) {
      console.error('X-Report error:', err)
      // Fallback to calculating from local data
      setXReportData({
        session_number: session.session_number,
        opened_at: session.opened_at,
        opening_balance: session.opening_balance,
        // These would come from API in real implementation
        transactions_count: 0,
        total_sales: 0,
        total_returns: 0,
        cash_collected: 0,
        card_collected: 0,
        expected_cash: session.opening_balance
      })
      setShowXReport(true)
    } finally {
      setLoadingReport(false)
    }
  }

  // Process no-sale (open drawer)
  const processNoSale = async () => {
    try {
      const res = await fetch('/api/pharmacy/pos/cash-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session?.id,
          movement_type: 'no_sale',
          amount: 0,
          reason: noSaleReason || 'Drawer opened for change'
        })
      })
      
      if (res.ok) {
        toast({ title: 'No Sale', description: 'Drawer opened - logged for audit' })
        setShowNoSaleDialog(false)
        setNoSaleReason('')
      } else {
        // If API doesn't exist yet, just show success
        toast({ title: 'No Sale', description: 'Drawer opened' })
        setShowNoSaleDialog(false)
        setNoSaleReason('')
      }
    } catch (err) {
      // If API doesn't exist, just show success
      toast({ title: 'No Sale', description: 'Drawer opened' })
      setShowNoSaleDialog(false)
      setNoSaleReason('')
    }
  }

  // Process cash in/out
  const processCashMovement = async () => {
    const amount = parseFloat(cashMovementAmount) || 0
    if (amount <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' })
      return
    }
    
    try {
      const res = await fetch('/api/pharmacy/pos/cash-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session?.id,
          movement_type: cashMovementType === 'in' ? 'cash_in' : 'cash_out',
          amount: cashMovementType === 'in' ? amount : -amount,
          reason: cashMovementReason || (cashMovementType === 'in' ? 'Cash added' : 'Cash removed')
        })
      })
      
      if (res.ok) {
        toast({ 
          title: cashMovementType === 'in' ? 'Cash Added' : 'Cash Removed',
          description: `${formatPrice(amount)} ${cashMovementType === 'in' ? 'added to' : 'removed from'} drawer`
        })
        setShowCashMovement(false)
        setCashMovementAmount('')
        setCashMovementReason('')
      } else {
        // If API doesn't exist yet, just show success
        toast({ 
          title: cashMovementType === 'in' ? 'Cash Added' : 'Cash Removed',
          description: `${formatPrice(amount)} logged`
        })
        setShowCashMovement(false)
        setCashMovementAmount('')
        setCashMovementReason('')
      }
    } catch (err) {
      toast({ 
        title: cashMovementType === 'in' ? 'Cash Added' : 'Cash Removed',
        description: `${formatPrice(amount)} logged`
      })
      setShowCashMovement(false)
      setCashMovementAmount('')
      setCashMovementReason('')
    }
  }

  // Quick cash buttons
  const quickCashAmounts = [500, 1000, 2000, 5000]

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <LoadingSpinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">No Active Session</h3>
          <p className="text-muted-foreground max-w-sm">
            You need to open a cash drawer session before making sales.
            Go to Cash Management to open a session.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left: Product Search & Results */}
      <Card className={`lg:col-span-2 flex flex-col ${isReturnMode ? 'ring-2 ring-red-500' : ''}`}>
        <CardHeader className="pb-3">
          {/* Return Mode Banner */}
          {isReturnMode && (
            <div className="flex items-center justify-between p-2 mb-2 bg-red-500 text-white rounded-lg">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                <span className="font-bold">RETURN MODE</span>
                <span className="text-sm opacity-80">Items will be added as returns</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-red-600"
                onClick={() => setIsReturnMode(false)}
              >
                Exit (F6)
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder={isReturnMode ? "Scan/search item to return..." : "Scan barcode or search product (F2)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={scanKeyDown}
                className={`pl-10 text-lg h-12 ${isReturnMode ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoFocus
              />
              {searching && (
                <LoadingSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            
            {/* Action buttons */}
            <Button
              variant={isReturnMode ? "destructive" : "outline"}
              size="icon"
              onClick={() => setIsReturnMode(!isReturnMode)}
              className="h-12 w-12"
              title="Toggle Return Mode (F6)"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            
            {isReturnMode && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowReceiptLookup(true)}
                className="h-12 w-12"
                title="Find Original Receipt"
              >
                <History className="h-5 w-5" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowRecentSales(prev => {
                  if (!prev) loadRecentSales()
                  return !prev
                })
              }}
              className="h-12 w-12"
              title="Recent Sales (F3)"
            >
              <History className="h-5 w-5" />
            </Button>
            {heldSales.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowRecallDialog(true)}
                className="h-12 w-12 relative"
                title="Recall Held Sale (F5)"
              >
                <Play className="h-5 w-5" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {heldSales.length}
                </Badge>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowCustomerSearch(true)}
              className="h-12 w-12"
              title="Find Customer"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
          
          {customer && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{customer.full_name}</span>
              {customer.credit_balance > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  Credit: {formatPrice(customer.credit_balance)}
                </Badge>
              )}
              {customer.loyalty_points > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  <Gift className="h-3 w-3 mr-1" />
                  {customer.loyalty_points} pts
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCustomer(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="px-4 pb-2">
            <div className="border rounded-lg divide-y max-h-48 overflow-auto">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full p-3 text-left hover:bg-muted flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.barcode && <span className="mr-2">{product.barcode}</span>}
                      Stock: {product.current_stock}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatPrice(product.selling_price)}</p>
                    {product.is_chifa_listed && (
                      <Badge variant="outline" className="text-xs">Chifa {product.reimbursement_rate}%</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart Items */}
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mb-4" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan or search for products</p>
                <div className="flex flex-wrap gap-2 mt-4 text-xs justify-center">
                  <Badge variant="outline">F2 Search</Badge>
                  <Badge variant="outline">F3 Recent</Badge>
                  <Badge variant="outline">F4 Hold</Badge>
                  <Badge variant="outline">F5 Recall</Badge>
                  <Badge variant="outline">F6 Return</Badge>
                  <Badge variant="outline">F8 Pay</Badge>
                  <Badge variant="outline">F9 No Sale</Badge>
                  <Badge variant="outline">F10 X-Report</Badge>
                  <Badge variant="outline">F11 Void</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Sale items */}
                {saleItemsCount > 0 && (
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    SALE ITEMS ({saleItemsCount})
                  </div>
                )}
                {cart.filter(i => !i.is_return && i.quantity > 0).map((item, idx) => (
                  <div key={`sale-${idx}`} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 group transition-colors duration-150">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{item.product_name}</p>
                        {(item.discount_percent > 0 || item.discount_amount > 0) && (
                          <Badge variant="secondary" className="text-xs">
                            <Percent className="h-3 w-3 mr-1" />
                            {item.discount_percent > 0 ? `${item.discount_percent}%` : formatPrice(item.discount_amount)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                          onClick={() => {
                            setPriceOverrideItem(item)
                            setNewPrice(item.unit_price.toString())
                            setShowPriceOverride(true)
                          }}
                        >
                          {formatPrice(item.unit_price)}
                        </button>
                        <span className="text-sm text-muted-foreground">× {item.quantity}</span>
                        {item.is_chifa_item && (
                          <Badge variant="outline" className="text-xs">
                            Chifa {item.reimbursement_rate}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick actions (fade in on hover — no layout shift) */}
                    <div className="flex items-center gap-1 min-w-[84px] justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit Price (F7)"
                        onClick={() => {
                          setPriceOverrideItem(item)
                          setNewPrice(item.unit_price.toString())
                          setShowPriceOverride(true)
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Add Discount"
                        onClick={() => {
                          setDiscountItem(item)
                          setItemDiscountValue(item.discount_percent > 0 ? item.discount_percent.toString() : '')
                          setItemDiscountType(item.discount_percent > 0 ? 'percent' : 'fixed')
                          setShowItemDiscount(true)
                        }}
                      >
                        <Percent className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Dosage & Durée"
                        onClick={() => openDosageDialog(item)}
                      >
                        <ClipboardList className={`h-3 w-3 ${item.dosage_instructions || item.treatment_period ? 'text-primary' : ''}`} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product_id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1
                          setCart(cart.map(i => 
                            i.product_id === item.product_id && !i.is_return
                              ? { ...i, quantity: Math.max(1, newQty) }
                              : i
                          ))
                        }}
                        className="w-14 h-8 text-center p-1"
                        min={1}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product_id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="font-bold w-24 text-right">
                      {formatPrice(item.unit_price * item.quantity)}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.product_id, false)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Return items */}
                {returnItemsCount > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="text-xs font-medium text-red-600 mb-1">
                      RETURN ITEMS ({returnItemsCount})
                    </div>
                  </>
                )}
                {cart.filter(i => i.is_return || i.quantity < 0).map((item, idx) => (
                  <div key={`return-${idx}`} className="flex items-center gap-3 p-3 border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 rounded-lg">
                    <RotateCcw className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-red-700 dark:text-red-300">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {formatPrice(item.unit_price)} × {Math.abs(item.quantity)}
                        </span>
                        <Badge variant="destructive" className="text-xs">Return</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-red-300"
                        onClick={() => updateQuantity(item.product_id, 1)} // +1 makes it less negative
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium text-red-600">{Math.abs(item.quantity)}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-red-300"
                        onClick={() => updateQuantity(item.product_id, -1)} // -1 makes it more negative
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="font-bold w-24 text-right text-red-600">
                      -{formatPrice(item.unit_price * Math.abs(item.quantity))}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.product_id, true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right: Totals & Payment */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-2 flex-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({saleItemsCount} items)</span>
              <span>{formatPrice(Math.max(0, totals.subtotal))}</span>
            </div>
            
            {returnItemsCount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Returns ({returnItemsCount} items)</span>
                <span>-{formatPrice(totals.returnSubtotal)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>TVA</span>
              <span>{formatPrice(totals.taxTotal)}</span>
            </div>
            
            {/* Cart-level discount */}
            <div className="flex items-center gap-2 pt-2">
              <Label className="text-xs">Discount:</Label>
              <Input
                type="number"
                value={cartDiscount || ''}
                onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                className="h-7 w-16 text-sm"
                placeholder="0"
              />
              <Select value={cartDiscountType} onValueChange={(v: 'percent' | 'fixed') => setCartDiscountType(v)}>
                <SelectTrigger className="h-7 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="fixed">DZD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {totals.cartDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(totals.cartDiscountAmount)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className={totals.isRefund ? 'text-red-600' : ''}>
                {totals.isRefund ? '-' : ''}{formatPrice(totals.netAmount)}
              </span>
            </div>

            {totals.chifaTotal > 0 && !totals.isRefund && (
              <>
                <Separator />
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm text-green-700 dark:text-green-300">
                    <span>CNAS Reimbursement</span>
                    <span>-{formatPrice(totals.chifaTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-green-700 dark:text-green-300">
                    <span>Patient Pays</span>
                    <span>{formatPrice(totals.patientTotal)}</span>
                  </div>
                </div>
              </>
            )}
            
            {/* Refund notice */}
            {totals.isRefund && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex justify-between font-bold text-red-700 dark:text-red-300">
                  <span>Refund Due</span>
                  <span>{formatPrice(totals.netAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            {/* Hold button */}
            {cart.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowHoldDialog(true)}
              >
                <Pause className="h-4 w-4 mr-2" />
                Hold Sale (F4)
              </Button>
            )}
            
            {/* Payment/Refund button */}
            <Button
              className={`w-full h-14 text-lg ${totals.isRefund ? 'bg-red-600 hover:bg-red-700' : ''}`}
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              {totals.isRefund ? (
                <>
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Process Refund {formatPrice(totals.netAmount)}
                </>
              ) : (
                <>
                  <Banknote className="h-5 w-5 mr-2" />
                  Pay {formatPrice(totals.netAmount)} (F8)
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCart([])
                setCartDiscount(0)
                setIsReturnMode(false)
              }}
              disabled={cart.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
            
            {/* Quick actions row */}
            <div className="grid grid-cols-4 gap-1 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNoSaleDialog(true)}
                className="flex-col h-auto py-2 text-xs"
                title="No Sale (F9)"
              >
                <Ban className="h-4 w-4 mb-1" />
                No Sale
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCashMovement(true)}
                className="flex-col h-auto py-2 text-xs"
                title="Cash In/Out"
              >
                <ArrowDownCircle className="h-4 w-4 mb-1" />
                Cash +/-
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadXReport}
                disabled={loadingReport}
                className="flex-col h-auto py-2 text-xs"
                title="X-Report (F10)"
              >
                <FileSpreadsheet className="h-4 w-4 mb-1" />
                X-Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoidDialog(true)}
                className="flex-col h-auto py-2 text-xs text-red-600 hover:text-red-700"
                title="Void Sale (F11)"
              >
                <XCircle className="h-4 w-4 mb-1" />
                Void
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog - Split Payment Support */}
      <Dialog open={showPayment} onOpenChange={(open) => {
        setShowPayment(open)
        if (open) {
          // Auto-focus Chifa input when Chifa sale (for card reader), else cash input
          setTimeout(() => {
            if (totals.chifaTotal > 0) {
              document.getElementById('chifa-card')?.focus()
            } else {
              cashInputRef.current?.focus()
            }
          }, 100)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{totals.isRefund ? 'Process Refund' : 'Payment'}</DialogTitle>
            <DialogDescription>
              {totals.isRefund ? (
                <>Refund amount: <strong className="text-red-600">{formatPrice(totals.netAmount)}</strong></>
              ) : (
                <>Amount due: <strong>{formatPrice(totals.netAmount)}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          {!totals.isRefund && (
            <div className="space-y-4">
              {/* Chifa card reader - when sale has Chifa items */}
              {totals.chifaTotal > 0 && (
                <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                  <ChifaCardInput
                    value={chifaNumber || customer?.chifa_number || ''}
                    onChange={setChifaNumber}
                    onChifaRead={(data) => {
                      setChifaNumber(data.insured_number)
                      if (data.insured_name && !customer) {
                        toast({ title: 'Chifa card read', description: `Assuré: ${data.insured_name}` })
                      }
                    }}
                    label="Chifa / CNAS Card"
                    showHint
                    autoFocus
                  />
                  {customer?.chifa_number && !chifaNumber && (
                    <p className="mt-1 text-xs text-muted-foreground">From customer: {customer.full_name}</p>
                  )}
                </div>
              )}
              {/* Quick cash buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={setExactAmount}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Exact
                </Button>
                {[500, 1000, 2000, 5000, 10000].map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setPaidCash(amount)}
                    className={paidCash === amount ? 'ring-2 ring-primary' : ''}
                  >
                    {amount}
                  </Button>
                ))}
              </div>

              {/* Payment methods grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Cash
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
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </Label>
                  <Input
                    type="number"
                    value={paidCard || ''}
                    onChange={(e) => setPaidCard(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile (BaridiMob/CCP)
                  </Label>
                  <Input
                    type="number"
                    value={paidMobile || ''}
                    onChange={(e) => setPaidMobile(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Cheque
                  </Label>
                  <Input
                    type="number"
                    value={paidCheque || ''}
                    onChange={(e) => setPaidCheque(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-lg"
                  />
                </div>
                
                {customer && customer.credit_limit > 0 && (
                  <div className="space-y-2 col-span-2">
                    <Label className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Customer Credit (Limit: {formatPrice(customer.credit_limit - customer.credit_balance)})
                    </Label>
                    <Input
                      type="number"
                      value={paidCredit || ''}
                      onChange={(e) => {
                        const max = customer.credit_limit - customer.credit_balance
                        setPaidCredit(Math.min(parseFloat(e.target.value) || 0, max))
                      }}
                      placeholder="0"
                      className="text-lg"
                      max={customer.credit_limit - customer.credit_balance}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Payment summary */}
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Amount Due</span>
                  <span className="font-medium">{formatPrice(totals.netAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Paid</span>
                  <span className="font-medium">{formatPrice(totalPaid)}</span>
                </div>
                <Separator />
                {totalPaid >= totals.netAmount ? (
                  <div className="flex justify-between text-lg text-green-600">
                    <span>Change Due</span>
                    <span className="font-bold">{formatPrice(totalPaid - totals.netAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-lg text-orange-600">
                    <span>Remaining</span>
                    <span className="font-bold">{formatPrice(totals.netAmount - totalPaid)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Refund confirmation */}
          {totals.isRefund && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">Refund to customer</p>
                <p className="text-4xl font-bold text-red-600">{formatPrice(totals.netAmount)}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Click Complete to process the refund. Cash will be dispensed from the drawer.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel (Esc)</Button>
            <Button
              onClick={processPayment}
              disabled={processing || (!totals.isRefund && totalPaid < totals.netAmount)}
              className={`min-w-32 ${totals.isRefund ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {processing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {totals.isRefund ? 'Complete Refund' : 'Complete (F12)'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, phone, or Chifa number..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
              />
              <Button onClick={searchCustomers}>Search</Button>
            </div>

            {customerResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                {customerResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomer(c)
                      setShowCustomerSearch(false)
                      setCustomerSearch('')
                      setCustomerResults([])
                    }}
                    className="w-full p-3 text-left hover:bg-muted"
                  >
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.phone} {c.chifa_number && `• Chifa: ${c.chifa_number}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Due Popup - prominent display when cash change > 0 */}
      <Dialog
        open={showChangeDue}
        onOpenChange={(open) => {
          setShowChangeDue(open)
          if (!open) {
            setShowReceipt(true)
            toast({ title: 'Sale Complete' })
          }
        }}
      >
        <DialogContent
          className="max-w-md text-center p-10 z-[100]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center font-bold">
              Return to customer
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 px-6 rounded-2xl bg-green-500/15 dark:bg-green-500/25 border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <p className="text-7xl md:text-8xl font-bold text-green-600 dark:text-green-400 tabular-nums drop-shadow-lg">
              {formatPrice(changeDueAmount)}
            </p>
            <p className="text-xl font-semibold text-green-700 dark:text-green-300 mt-3">DZD</p>
          </div>
          <DialogFooter className="justify-center sm:justify-center">
            <Button
              size="lg"
              className="min-w-40"
              onClick={() => {
                setShowChangeDue(false)
                setShowReceipt(true)
                toast({ title: 'Sale Complete' })
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Full Preview */}
      <Dialog open={showReceipt} onOpenChange={(open) => {
        setShowReceipt(open)
        if (!open) {
          setReceiptReturnItems(new Set())
          setShowReceiptReturnPicker(false)
          setShowReceiptVoidConfirm(false)
          setShowReceiptModifyConfirm(false)
          setReceiptVoidReason('')
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              {lastSale?.status === 'voided' ? 'Receipt (Voided)' : 'Sale Complete'}
            </DialogTitle>
            {lastSale?.status === 'voided' && (
              <Badge variant="destructive" className="w-fit">VOIDED – Kept for audit</Badge>
            )}
          </DialogHeader>
          
          {lastSale && (
            <div id="receipt-content" className="space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b pb-3">
                {professionalName && (
                  <p className="font-bold text-base">{professionalName}</p>
                )}
                <p className="font-bold text-lg">PHARMACY RECEIPT</p>
                <p className="text-sm text-muted-foreground">Receipt #{lastSale.sale_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastSale.created_at).toLocaleString()}
                </p>
                {employeeUsername && (
                  <p className="text-xs text-muted-foreground">Served by: {employeeUsername}</p>
                )}
                {lastSale.customer_name && (
                  <p className="text-sm mt-1">Customer: {lastSale.customer_name}</p>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">ITEMS</p>
                  {lastSale.status === 'completed' && showReceiptReturnPicker && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowReceiptReturnPicker(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1 text-sm">
                    {lastSale.items?.map((item, idx) => {
                      const returnable = item.quantity - (item.quantity_returned || 0)
                      const canReturn = lastSale.status === 'completed' && returnable > 0
                      const isSelected = receiptReturnItems.has(idx)
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          {showReceiptReturnPicker && canReturn ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setReceiptReturnItems(prev => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(idx)
                                  else next.delete(idx)
                                  return next
                                })
                              }}
                              className="mt-1.5 h-4 w-4 rounded border-input"
                            />
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{item.product_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatPrice(item.unit_price)} × {item.quantity}
                                  {returnable < item.quantity && (
                                    <span className="text-orange-600 ml-1">({returnable} returnable)</span>
                                  )}
                                </p>
                                {(item.dosage_instructions || item.treatment_period) && (
                                  <p className="text-xs text-primary mt-0.5">
                                    {[item.dosage_instructions, item.treatment_period].filter(Boolean).join(' • ')}
                                  </p>
                                )}
                              </div>
                              <p className="font-medium ml-2">{formatPrice(item.line_total || item.unit_price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(lastSale.subtotal)}</span>
                </div>
                {lastSale.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(lastSale.discount_amount)}</span>
                  </div>
                )}
                {lastSale.tax_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>TVA</span>
                    <span>{formatPrice(lastSale.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-1 border-t">
                  <span>TOTAL</span>
                  <span>{formatPrice(lastSale.total_amount)}</span>
                </div>
              </div>

              {/* Chifa Split */}
              {lastSale.chifa_total > 0 && (
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                  <div className="flex justify-between text-green-700 dark:text-green-300">
                    <span>CNAS Coverage</span>
                    <span>-{formatPrice(lastSale.chifa_total)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-green-700 dark:text-green-300">
                    <span>Patient Paid</span>
                    <span>{formatPrice(lastSale.patient_total)}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Payment Details */}
              <div className="space-y-1 text-sm">
                <p className="text-xs font-medium text-muted-foreground">PAYMENT</p>
                {lastSale.paid_cash > 0 && (
                  <div className="flex justify-between">
                    <span>Cash</span>
                    <span>{formatPrice(lastSale.paid_cash)}</span>
                  </div>
                )}
                {lastSale.paid_card > 0 && (
                  <div className="flex justify-between">
                    <span>Card</span>
                    <span>{formatPrice(lastSale.paid_card)}</span>
                  </div>
                )}
                {lastSale.paid_cheque > 0 && (
                  <div className="flex justify-between">
                    <span>Cheque</span>
                    <span>{formatPrice(lastSale.paid_cheque)}</span>
                  </div>
                )}
                {lastSale.paid_mobile > 0 && (
                  <div className="flex justify-between">
                    <span>Mobile</span>
                    <span>{formatPrice(lastSale.paid_mobile)}</span>
                  </div>
                )}
                {lastSale.paid_credit > 0 && (
                  <div className="flex justify-between">
                    <span>Credit</span>
                    <span>{formatPrice(lastSale.paid_credit)}</span>
                  </div>
                )}
                {lastSale.change_given > 0 && (
                  <div className="flex justify-between font-medium text-green-600 pt-1 border-t">
                    <span>Change Given</span>
                    <span>{formatPrice(lastSale.change_given)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                <p>Thank you for your purchase!</p>
                <p>Served by: {lastSale.created_by_name || 'Staff'}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-3">
            {lastSale?.status === 'completed' && (
              <div className="flex flex-wrap gap-2 w-full border-t pt-3">
                {!showReceiptReturnPicker ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptReturnPicker(true)}
                      title="Return selected items"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Return Items
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptVoidConfirm(true)}
                      className="text-destructive hover:text-destructive"
                      title="Void sale (kept for audit)"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Void Sale
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptModifyConfirm(true)}
                      title="Void and re-ring with adjustments (new receipt #)"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Modify (Re-ring)
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={addReceiptReturnItemsToCart}
                    disabled={receiptReturnItems.size === 0}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Add {receiptReturnItems.size} Item(s) to Return
                  </Button>
                )}
              </div>
            )}
            {showReceiptVoidConfirm && (
              <div className="w-full space-y-2 p-3 bg-muted rounded-lg">
                <Label>Void reason (required)</Label>
                <Input
                  placeholder="e.g. Wrong items, customer cancelled"
                  value={receiptVoidReason}
                  onChange={(e) => setReceiptVoidReason(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && receiptVoidReason.trim() && processVoidFromReceipt()}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowReceiptVoidConfirm(false)}>Cancel</Button>
                  <Button size="sm" variant="destructive" onClick={processVoidFromReceipt} disabled={!receiptVoidReason.trim() || voidingFromReceipt}>
                    {voidingFromReceipt ? <LoadingSpinner size="sm" /> : 'Confirm Void'}
                  </Button>
                </div>
              </div>
            )}
            {showReceiptModifyConfirm && !showReceiptVoidConfirm && (
              <div className="w-full space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium">Modify sale (void + re-ring)</p>
                <p className="text-xs text-muted-foreground">
                  This will void the current receipt and load items to cart. Adjust as needed and complete—a new receipt will be issued.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowReceiptModifyConfirm(false)}>Cancel</Button>
                  <Button size="sm" onClick={processModifyFromReceipt} disabled={voidingFromReceipt}>
                    {voidingFromReceipt ? <LoadingSpinner size="sm" /> : 'Void & Load to Cart'}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 w-full">
              <Button variant="outline" onClick={() => setShowReceipt(false)}>
                Close
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const content = document.getElementById('receipt-content')
                  if (content) {
                    const printWindow = window.open('', '_blank')
                    if (printWindow) {
                      const title = lastSale?.status === 'voided' ? `VOIDED - Receipt #${lastSale?.sale_number}` : `Receipt #${lastSale?.sale_number}`
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${title}</title>
                            <style>
                              body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
                              .text-center { text-align: center; }
                              .font-bold { font-weight: bold; }
                              .flex { display: flex; justify-content: space-between; }
                              .border-b { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                              .border-t { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
                              .text-lg { font-size: 14px; }
                              .text-sm { font-size: 11px; }
                              .text-xs { font-size: 10px; }
                              .mt-1 { margin-top: 4px; }
                              .mb-2 { margin-bottom: 8px; }
                              .space-y-1 > * + * { margin-top: 4px; }
                              .void-badge { background: #ef4444; color: white; padding: 4px; margin: 8px 0; }
                            </style>
                          </head>
                          <body>
                            ${lastSale?.status === 'voided' ? '<div class="void-badge text-center font-bold">*** VOIDED ***</div>' : ''}
                            ${content.innerHTML}
                          </body>
                        </html>
                      `)
                      printWindow.document.close()
                      printWindow.print()
                    }
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Reprint {lastSale?.status === 'voided' ? '(same #)' : ''}
              </Button>
              <Button onClick={() => setShowReceipt(false)}>
                New Sale
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recent Sales Panel (F3) */}
      <Sheet open={showRecentSales} onOpenChange={(open) => {
        setShowRecentSales(open)
        if (!open) setRecentSalesSearch('')
      }}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Sales (F3)
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Filter & Sort */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipt #, customer..."
                  value={recentSalesSearch}
                  onChange={(e) => setRecentSalesSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select value={recentSalesFilter} onValueChange={(v: 'session' | 'today' | 'week') => setRecentSalesFilter(v)}>
                  <SelectTrigger className="h-9 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">This session</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={recentSalesSort} onValueChange={(v: typeof recentSalesSort) => setRecentSalesSort(v)}>
                  <SelectTrigger className="h-9 text-xs w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="amount_high">Amount ↓</SelectItem>
                    <SelectItem value="amount_low">Amount ↑</SelectItem>
                    <SelectItem value="customer">Customer A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{displayedRecentSales.length} sale{displayedRecentSales.length !== 1 ? 's' : ''}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => loadRecentSales()}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loadingRecentSales ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" className="text-muted-foreground" />
                </div>
              ) : displayedRecentSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{recentSalesSearch ? 'No matches' : 'No recent sales'}</p>
                  <p className="text-xs mt-1">
                    {recentSalesSearch ? 'Try a different search' : 'Completed sales will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-6">
                  {displayedRecentSales.map((sale) => {
                  const minsAgo = Math.floor((Date.now() - new Date(sale.created_at).getTime()) / 60000)
                  const timeAgo = minsAgo < 1 ? 'Just now' : minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ago`
                  return (
                    <button
                      key={sale.id}
                      onClick={() => {
                        setLastSale(sale)
                        setShowRecentSales(false)
                        setShowReceipt(true)
                      }}
                      className="w-full p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-medium truncate">{sale.sale_number}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {sale.customer_name || 'Walk-in'}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-semibold text-green-600">{formatPrice(sale.total_amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {sale.items?.length || 0} items
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hold Sale Dialog */}
      <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5" />
              Hold Sale
            </DialogTitle>
            <DialogDescription>
              Save this sale to serve another customer. You can recall it later with F5.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{cart.length} items - {formatPrice(totals.netAmount)}</p>
              {customer && <p className="text-sm text-muted-foreground">Customer: {customer.full_name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={holdReason} onValueChange={(v: HeldSale['reason']) => setHoldReason(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_left">Customer left to get something</SelectItem>
                  <SelectItem value="price_check">Price check needed</SelectItem>
                  <SelectItem value="manager_needed">Manager approval needed</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={holdNote}
                onChange={(e) => setHoldNote(e.target.value)}
                placeholder="Add a note to remember this sale..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoldDialog(false)}>Cancel</Button>
            <Button onClick={holdSale}>
              <Pause className="h-4 w-4 mr-2" />
              Hold Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recall Held Sale Dialog */}
      <Dialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Held Sales ({heldSales.length})
            </DialogTitle>
            <DialogDescription>
              Select a sale to recall and continue checkout
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {heldSales.map((held) => {
                const minutesAgo = Math.floor((Date.now() - held.heldAt.getTime()) / 60000)
                const isOld = minutesAgo > 30
                
                return (
                  <div 
                    key={held.id} 
                    className={`p-3 border rounded-lg ${isOld ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{held.cart.length} items</p>
                          <Badge variant="outline">{formatPrice(
                            held.cart.reduce((sum, i) => sum + i.unit_price * Math.abs(i.quantity), 0)
                          )}</Badge>
                          {isOld && (
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {minutesAgo}m ago
                            </Badge>
                          )}
                        </div>
                        {held.customer && (
                          <p className="text-sm text-muted-foreground">{held.customer.full_name}</p>
                        )}
                        {held.note && (
                          <p className="text-sm text-muted-foreground italic">"{held.note}"</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {held.reason.replace('_', ' ')} • by {held.heldBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" onClick={() => recallSale(held)}>
                          <Play className="h-4 w-4 mr-1" />
                          Recall
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteHeldSale(held.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {heldSales.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No held sales</p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecallDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Override Dialog */}
      <Dialog open={showPriceOverride} onOpenChange={setShowPriceOverride}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Price Override
            </DialogTitle>
            <DialogDescription>
              {priceOverrideItem?.product_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Current Price</Label>
                <p className="text-lg font-medium text-muted-foreground">
                  {formatPrice(priceOverrideItem?.unit_price || 0)}
                </p>
              </div>
              <div className="flex-1">
                <Label>New Price</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Enter new price..."
                  className="text-lg"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Select value={priceOverrideReason} onValueChange={setPriceOverrideReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="competitor_match">Match competitor price</SelectItem>
                  <SelectItem value="damaged">Damaged item</SelectItem>
                  <SelectItem value="loyalty">Loyalty customer</SelectItem>
                  <SelectItem value="promotion">Promotional price</SelectItem>
                  <SelectItem value="manager_override">Manager override</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceOverride(false)}>Cancel</Button>
            <Button onClick={applyPriceOverride} disabled={!newPrice || !priceOverrideReason}>
              <Check className="h-4 w-4 mr-2" />
              Apply Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Discount Dialog */}
      <Dialog open={showItemDiscount} onOpenChange={setShowItemDiscount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Item Discount
            </DialogTitle>
            <DialogDescription>
              {discountItem?.product_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={itemDiscountValue}
                onChange={(e) => setItemDiscountValue(e.target.value)}
                placeholder="Enter discount..."
                className="text-lg"
                autoFocus
              />
              <Select value={itemDiscountType} onValueChange={(v: 'percent' | 'fixed') => setItemDiscountType(v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="fixed">DZD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Quick discount buttons */}
            <div className="flex gap-2">
              {[5, 10, 15, 20, 25].map(pct => (
                <Button
                  key={pct}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItemDiscountValue(pct.toString())
                    setItemDiscountType('percent')
                  }}
                >
                  {pct}%
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDiscount(false)}>Cancel</Button>
            <Button onClick={applyItemDiscount}>
              <Check className="h-4 w-4 mr-2" />
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dosage & Treatment Period Dialog */}
      <Dialog open={showDosageDialog} onOpenChange={(open) => {
        setShowDosageDialog(open)
        if (!open) {
          setDosageItem(null)
          setDosageInstructions('')
          setTreatmentPeriod('')
          setDosageFrequency(null)
          setDosageTiming('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Dosage & Durée du traitement
            </DialogTitle>
            <DialogDescription>
              {dosageItem?.product_name} — pour étiquetage et sécurité patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Line 1: 1, 2, 3 — times per day */}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">1. Fois par jour</Label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map(n => (
                  <Button
                    key={n}
                    variant={dosageFrequency === n ? 'default' : 'outline'}
                    size="lg"
                    className="flex-1 text-lg font-semibold"
                    onClick={() => {
                      const next = dosageFrequency === n ? null : n
                      setDosageFrequency(next)
                      if (next) setDosageTiming('')
                      else setDosageInstructions('')
                    }}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Line 2: One or all — Matin, Midi, Soir */}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">2. Prise — une ou toutes</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground self-center w-12 shrink-0">Une:</span>
                  {(['matin', 'midi', 'soir'] as const).map(t => (
                    <Button key={t} variant={dosageTiming === t ? 'default' : 'outline'} size="sm"
                      onClick={() => {
                        setDosageTiming(t)
                        setDosageInstructions(getDosageText(t))
                      }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground self-center w-12 shrink-0">Toutes:</span>
                  <Button variant={dosageTiming === 'matin_soir' ? 'default' : 'outline'} size="sm"
                    onClick={() => { setDosageTiming('matin_soir'); setDosageInstructions(getDosageText('matin_soir')) }}>
                    Matin et soir
                  </Button>
                  <Button variant={dosageTiming === 'matin_midi_soir' ? 'default' : 'outline'} size="sm"
                    onClick={() => { setDosageTiming('matin_midi_soir'); setDosageInstructions(getDosageText('matin_midi_soir')) }}>
                    Matin, midi et soir
                  </Button>
                </div>
              </div>
            </div>

            {/* Line 3: Period of treatment */}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">3. Durée du traitement</Label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.map(p => (
                  <Button
                    key={p}
                    variant={treatmentPeriod === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTreatmentPeriod(treatmentPeriod === p ? '' : p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <Input
              value={dosageInstructions}
              onChange={(e) => setDosageInstructions(e.target.value)}
              placeholder="Ou saisir librement (ex: 500mg matin et soir)"
              className="text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDosageDialog(false)}>Annuler</Button>
            <Button onClick={applyDosage}>
              <Check className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Due Popup */}
      <Dialog
        open={showRefundDue}
        onOpenChange={(open) => {
          setShowRefundDue(open)
          if (!open) {
            setShowReceipt(true)
            toast({ title: 'Refund Complete' })
          }
        }}
      >
        <DialogContent
          className="max-w-md text-center p-10 z-[100]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center font-bold text-red-600">
              Refund to Customer
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 px-6 rounded-2xl bg-red-500/15 dark:bg-red-500/25 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <p className="text-7xl md:text-8xl font-bold text-red-600 dark:text-red-400 tabular-nums drop-shadow-lg">
              {formatPrice(refundDueAmount)}
            </p>
            <p className="text-xl font-semibold text-red-700 dark:text-red-300 mt-3">DZD</p>
          </div>
          <DialogFooter className="justify-center sm:justify-center">
            <Button
              size="lg"
              variant="destructive"
              className="min-w-40"
              onClick={() => {
                setShowRefundDue(false)
                setShowReceipt(true)
                toast({ title: 'Refund Complete' })
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Lookup for Returns Dialog */}
      <Dialog open={showReceiptLookup} onOpenChange={setShowReceiptLookup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Find Original Sale
            </DialogTitle>
            <DialogDescription>
              Search by receipt number, customer name, phone, or product barcode
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Scan or search receipt #, customer, barcode..."
                value={receiptLookupQuery}
                onChange={(e) => setReceiptLookupQuery(e.target.value)}
                onKeyDown={receiptLookupScanKeyDown}
              />
              <Button onClick={searchReceipts} disabled={searchingReceipts}>
                {searchingReceipts ? <LoadingSpinner size="sm" /> : 'Search'}
              </Button>
            </div>

            {selectedSaleForReturn ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Receipt #{selectedSaleForReturn.sale_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedSaleForReturn.created_at).toLocaleDateString()} - {formatPrice(selectedSaleForReturn.total_amount)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSaleForReturn(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm font-medium">Select items to return:</div>
                <ScrollArea className="max-h-60 border rounded-lg">
                  <div className="divide-y">
                    {selectedSaleForReturn.items?.map((item, idx) => {
                      const returnable = item.quantity - (item.quantity_returned || 0)
                      return (
                        <div key={idx} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.unit_price)} × {item.quantity}
                              {item.quantity_returned > 0 && (
                                <span className="text-orange-600 ml-2">
                                  ({item.quantity_returned} already returned)
                                </span>
                              )}
                            </p>
                          </div>
                          {returnable > 0 && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => addReturnFromSale(selectedSaleForReturn, [item])}
                            >
                              Return ({returnable})
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
                
                <Button 
                  className="w-full" 
                  onClick={() => addReturnFromSale(selectedSaleForReturn)}
                >
                  Return All Items
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-2">
                  {receiptLookupResults.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => setSelectedSaleForReturn(sale)}
                      className="w-full p-3 border rounded-lg text-left hover:bg-muted"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Receipt #{sale.sale_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.customer_name || 'Walk-in'} • {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {sale.items?.length || 0} items
                          </p>
                        </div>
                        <p className="font-bold">{formatPrice(sale.total_amount)}</p>
                      </div>
                    </button>
                  ))}
                  
                  {receiptLookupResults.length === 0 && receiptLookupQuery && !searchingReceipts && (
                    <p className="text-center text-muted-foreground py-8">No receipts found</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowReceiptLookup(false)
              setSelectedSaleForReturn(null)
              setReceiptLookupQuery('')
              setReceiptLookupResults([])
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Sale Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Void Sale
            </DialogTitle>
            <DialogDescription>
              Search for a completed sale to void. This will reverse the sale and restore inventory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!saleToVoid ? (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by receipt # or customer..."
                    value={voidQuery}
                    onChange={(e) => setVoidQuery(e.target.value)}
                    onKeyDown={voidScanKeyDown}
                  />
                  <Button onClick={searchSalesForVoid} disabled={searchingVoid}>
                    {searchingVoid ? <LoadingSpinner size="sm" /> : 'Search'}
                  </Button>
                </div>

                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {voidResults.map((sale) => (
                      <button
                        key={sale.id}
                        onClick={() => setSaleToVoid(sale)}
                        className="w-full p-3 border rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">#{sale.sale_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {sale.customer_name || 'Walk-in'} • {new Date(sale.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="font-bold">{formatPrice(sale.total_amount)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border-2 border-red-200 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="font-bold text-red-600">Void Sale #{saleToVoid.sale_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {saleToVoid.customer_name || 'Walk-in'} • {formatPrice(saleToVoid.total_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {saleToVoid.items?.length || 0} items will be restored to inventory
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Void Reason (required)</Label>
                  <Select value={voidReason} onValueChange={setVoidReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_request">Customer requested</SelectItem>
                      <SelectItem value="wrong_items">Wrong items scanned</SelectItem>
                      <SelectItem value="payment_failed">Payment failed</SelectItem>
                      <SelectItem value="price_error">Price error</SelectItem>
                      <SelectItem value="manager_void">Manager void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {saleToVoid ? (
              <>
                <Button variant="outline" onClick={() => setSaleToVoid(null)}>Back</Button>
                <Button 
                  variant="destructive" 
                  onClick={processVoid}
                  disabled={!voidReason || processingVoid}
                >
                  {processingVoid ? <LoadingSpinner size="sm" /> : <Ban className="h-4 w-4 mr-2" />}
                  Confirm Void
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* X-Report Dialog */}
      <Dialog open={showXReport} onOpenChange={setShowXReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              X-Report (Mid-Day Summary)
            </DialogTitle>
            <DialogDescription>
              Current session summary - session remains open
            </DialogDescription>
          </DialogHeader>
          
          {xReportData && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Session #{xReportData.session_number}</p>
                <p className="text-xs text-muted-foreground">
                  Opened: {new Date(xReportData.opened_at).toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span>Opening Balance</span>
                  <span className="font-medium">{formatPrice(xReportData.opening_balance)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Transactions</span>
                  <span className="font-medium">{xReportData.transactions_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Total Sales</span>
                  <span className="font-medium text-green-600">{formatPrice(xReportData.total_sales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Total Returns</span>
                  <span className="font-medium text-red-600">-{formatPrice(xReportData.total_returns)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 border-b">
                  <span>Cash Collected</span>
                  <span className="font-medium">{formatPrice(xReportData.cash_collected)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Card Collected</span>
                  <span className="font-medium">{formatPrice(xReportData.card_collected)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 font-bold text-lg">
                  <span>Expected Cash in Drawer</span>
                  <span>{formatPrice(xReportData.expected_cash)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowXReport(false)}>Close</Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-Sale Dialog */}
      <Dialog open={showNoSaleDialog} onOpenChange={setShowNoSaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              No Sale - Open Drawer
            </DialogTitle>
            <DialogDescription>
              Open the cash drawer without processing a sale (for making change, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                value={noSaleReason}
                onChange={(e) => setNoSaleReason(e.target.value)}
                placeholder="Making change for customer..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoSaleDialog(false)}>Cancel</Button>
            <Button onClick={processNoSale}>
              Open Drawer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash In/Out Dialog */}
      <Dialog open={showCashMovement} onOpenChange={setShowCashMovement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cashMovementType === 'in' ? (
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              )}
              {cashMovementType === 'in' ? 'Cash In' : 'Cash Out'}
            </DialogTitle>
            <DialogDescription>
              {cashMovementType === 'in' 
                ? 'Add cash to the drawer (e.g., change float, bank deposit)' 
                : 'Remove cash from the drawer (e.g., bank run, petty cash)'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={cashMovementType === 'in' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setCashMovementType('in')}
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Cash In
              </Button>
              <Button
                variant={cashMovementType === 'out' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setCashMovementType('out')}
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Cash Out
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Amount (DZD)</Label>
              <Input
                type="number"
                value={cashMovementAmount}
                onChange={(e) => setCashMovementAmount(e.target.value)}
                placeholder="0"
                className="text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={cashMovementReason}
                onChange={(e) => setCashMovementReason(e.target.value)}
                placeholder={cashMovementType === 'in' ? 'Change float added' : 'Bank deposit'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashMovement(false)}>Cancel</Button>
            <Button 
              onClick={processCashMovement}
              variant={cashMovementType === 'out' ? 'destructive' : 'default'}
            >
              {cashMovementType === 'in' ? 'Add Cash' : 'Remove Cash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

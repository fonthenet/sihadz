/**
 * Universal Business Storefront Types
 * Supports any business type: pharmacies, clinics, labs, etc.
 */

// ============================================================================
// STOREFRONT SETTINGS
// ============================================================================

export interface StorefrontSettings {
  id: string
  professional_id: string
  
  // Toggle
  is_enabled: boolean
  
  // Display
  storefront_name: string | null
  storefront_name_ar: string | null
  storefront_description: string | null
  storefront_description_ar: string | null
  banner_image_url: string | null
  
  // Fulfillment
  pickup_enabled: boolean
  delivery_enabled: boolean
  delivery_fee: number
  delivery_radius_km: number | null
  delivery_notes: string | null
  
  // Payment
  accept_cash_on_pickup: boolean
  accept_online_payment: boolean
  
  // Policies
  min_order_amount: number
  preparation_time_minutes: number
  
  // Operating hours
  order_hours: Record<string, { open: string; close: string }> | null
  
  created_at: string
  updated_at: string
}

export interface StorefrontSettingsFormData {
  is_enabled?: boolean
  storefront_name?: string
  storefront_name_ar?: string
  storefront_description?: string
  storefront_description_ar?: string
  banner_image_url?: string
  pickup_enabled?: boolean
  delivery_enabled?: boolean
  delivery_fee?: number
  delivery_radius_km?: number
  delivery_notes?: string
  accept_cash_on_pickup?: boolean
  accept_online_payment?: boolean
  min_order_amount?: number
  preparation_time_minutes?: number
  order_hours?: Record<string, { open: string; close: string }>
}

// ============================================================================
// STOREFRONT CATEGORIES
// ============================================================================

export interface StorefrontCategory {
  id: string
  professional_id: string
  name: string
  name_ar: string | null
  description: string | null
  slug: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Computed
  product_count?: number
}

export interface StorefrontCategoryFormData {
  name: string
  name_ar?: string
  description?: string
  slug?: string
  icon?: string
  display_order?: number
  is_active?: boolean
}

// ============================================================================
// STOREFRONT PRODUCTS
// ============================================================================

export type ProductType = 'product' | 'service' | 'package'

export interface StorefrontProduct {
  id: string
  professional_id: string
  category_id: string | null
  
  // Basic Info
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  
  // Categorization
  product_type: ProductType
  tags: string[]
  
  // Pricing
  price: number
  compare_at_price: number | null
  
  // Availability
  is_available: boolean
  stock_quantity: number | null
  track_inventory: boolean
  low_stock_threshold: number
  
  // Images
  image_url: string | null
  images: string[]
  
  // Pharmacy-specific
  pharmacy_product_id: string | null
  requires_prescription: boolean
  
  // Service-specific
  duration_minutes: number | null
  
  // Display
  display_order: number
  is_featured: boolean
  
  // SEO
  search_keywords: string[]
  
  created_at: string
  updated_at: string
  
  // Relations (when joined)
  category?: StorefrontCategory
}

export interface StorefrontProductFormData {
  category_id?: string | null
  name: string
  name_ar?: string
  description?: string
  description_ar?: string
  product_type?: ProductType
  tags?: string[]
  price: number
  compare_at_price?: number | null
  is_available?: boolean
  stock_quantity?: number | null
  track_inventory?: boolean
  low_stock_threshold?: number
  image_url?: string
  images?: string[]
  pharmacy_product_id?: string | null
  requires_prescription?: boolean
  duration_minutes?: number | null
  display_order?: number
  is_featured?: boolean
  search_keywords?: string[]
}

// ============================================================================
// STOREFRONT ORDERS
// ============================================================================

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export type FulfillmentType = 'pickup' | 'delivery'

export type PaymentMethod = 'cash' | 'wallet' | 'chargily'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface StorefrontOrder {
  id: string
  order_number: string
  
  // Parties
  professional_id: string
  customer_id: string | null
  
  // Customer Info
  customer_name: string
  customer_phone: string
  customer_email: string | null
  
  // Status
  status: OrderStatus
  
  // Totals
  subtotal: number
  delivery_fee: number
  discount_amount: number
  discount_code: string | null
  total: number
  
  // Fulfillment
  fulfillment_type: FulfillmentType
  estimated_pickup_time: string | null
  delivery_address: string | null
  delivery_notes: string | null
  
  // Payment
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_id: string | null
  
  // Notes
  customer_notes: string | null
  internal_notes: string | null
  
  // Timestamps
  created_at: string
  confirmed_at: string | null
  ready_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  cancelled_by: 'customer' | 'business' | null
  
  // Relations (when joined)
  items?: StorefrontOrderItem[]
  professional?: {
    id: string
    business_name: string
    phone: string
    address_line1: string
  }
}

export interface StorefrontOrderItem {
  id: string
  order_id: string
  product_id: string | null
  
  // Snapshot
  product_name: string
  product_name_ar: string | null
  product_image_url: string | null
  unit_price: number
  quantity: number
  total: number
  
  notes: string | null
  created_at: string
}

export interface CreateOrderData {
  professional_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  fulfillment_type: FulfillmentType
  estimated_pickup_time?: string
  delivery_address?: string
  delivery_notes?: string
  payment_method: PaymentMethod
  customer_notes?: string
  items: {
    product_id: string
    quantity: number
    notes?: string
  }[]
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface StorefrontPublicInfo {
  settings: StorefrontSettings
  professional: {
    id: string
    business_name: string
    business_name_ar: string | null
    type: string
    phone: string
    address_line1: string
    wilaya: string
    commune: string
    rating: number | null
    review_count: number
  }
  categories: StorefrontCategory[]
  products: StorefrontProduct[]
  featured_products: StorefrontProduct[]
}

// ============================================================================
// FILTERS
// ============================================================================

export interface StorefrontProductFilters {
  category_id?: string
  product_type?: ProductType
  is_available?: boolean
  is_featured?: boolean
  search?: string
  min_price?: number
  max_price?: number
}

export interface StorefrontOrderFilters {
  status?: OrderStatus | OrderStatus[]
  fulfillment_type?: FulfillmentType
  payment_status?: PaymentStatus
  date_from?: string
  date_to?: string
  search?: string // Order number or customer name
}

// ============================================================================
// CART (Client-side)
// ============================================================================

export interface CartItem {
  product_id: string
  product: StorefrontProduct
  quantity: number
  notes?: string
}

export interface Cart {
  professional_id: string
  items: CartItem[]
  subtotal: number
  delivery_fee: number
  total: number
}

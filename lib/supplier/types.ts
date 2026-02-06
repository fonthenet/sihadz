// ============================================================================
// SUPPLIER SYSTEM - TypeScript Types
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type SupplierType = 'pharma_supplier' | 'equipment_supplier'

export type BuyerType = 'pharmacy' | 'clinic' | 'laboratory' | 'doctor' | 'nurse' | 'ambulance'

export type LinkStatus = 'pending' | 'active' | 'suspended' | 'rejected'

export type PaymentTerms = 'cash' | '15_days' | '30_days' | '60_days' | '90_days' | 'after_2_orders' | 'after_3_orders'

export type OrderStatus = 
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export type InvoiceStatus = 
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'disputed'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'mobile_payment' | 'credit'

export type StorageCondition = 'room_temp' | 'refrigerated' | 'frozen'

export type ControlledTableau = 'A' | 'B' | 'C'

// ============================================================================
// PRODUCT CATEGORY
// ============================================================================

export interface SupplierProductCategory {
  id: string
  name: string
  name_ar?: string | null
  name_fr?: string | null
  description?: string | null
  parent_id?: string | null
  supplier_type?: 'pharma_supplier' | 'equipment_supplier' | 'both' | null
  sort_order: number
  is_active: boolean
  created_at: string
}

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

export interface SupplierProduct {
  id: string
  supplier_id: string
  
  // Identification
  sku?: string | null
  barcode?: string | null
  name: string
  name_ar?: string | null
  name_fr?: string | null
  description?: string | null
  
  // For medications
  dci_code?: string | null
  generic_name?: string | null
  form?: string | null
  dosage?: string | null
  packaging?: string | null
  
  // Classification
  category_id?: string | null
  category?: SupplierProductCategory | null
  manufacturer?: string | null
  country_of_origin?: string | null
  
  // Pricing
  unit_price: number
  min_order_qty: number
  pack_size: number
  bulk_discount_qty?: number | null
  bulk_discount_percent?: number | null
  
  // CNAS/Chifa
  is_chifa_listed: boolean
  reimbursement_rate: number
  tarif_reference?: number | null
  
  // Regulatory
  requires_prescription: boolean
  is_controlled: boolean
  controlled_tableau?: ControlledTableau | null
  storage_conditions?: StorageCondition | null
  
  // Availability & Inventory
  in_stock: boolean
  stock_quantity?: number | null
  reorder_point?: number | null
  lead_time_days: number
  
  // Expiry tracking (for medications)
  expiry_date?: string | null
  batch_number?: string | null
  
  // Equipment specific
  warranty_months?: number | null
  installation_included: boolean
  maintenance_available: boolean
  
  // Status
  is_active: boolean
  is_featured: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface SupplierProductInput {
  sku?: string
  barcode?: string
  name: string
  name_ar?: string
  name_fr?: string
  description?: string
  dci_code?: string
  generic_name?: string
  form?: string
  dosage?: string
  packaging?: string
  category_id?: string
  manufacturer?: string
  country_of_origin?: string
  unit_price: number
  min_order_qty?: number
  pack_size?: number
  bulk_discount_qty?: number
  bulk_discount_percent?: number
  is_chifa_listed?: boolean
  reimbursement_rate?: number
  tarif_reference?: number
  requires_prescription?: boolean
  is_controlled?: boolean
  controlled_tableau?: ControlledTableau
  storage_conditions?: StorageCondition
  in_stock?: boolean
  stock_quantity?: number
  reorder_point?: number
  lead_time_days?: number
  expiry_date?: string
  batch_number?: string
  warranty_months?: number
  installation_included?: boolean
  maintenance_available?: boolean
  is_active?: boolean
  is_featured?: boolean
}

// ============================================================================
// SUPPLIER-BUYER LINKS
// ============================================================================

export interface SupplierBuyerLink {
  id: string
  supplier_id: string
  buyer_id: string
  
  status: LinkStatus
  
  // Terms
  payment_terms: PaymentTerms
  pay_after_orders?: number | null  // Collect payment after N delivered orders
  credit_limit?: number | null
  discount_percent: number
  
  // Metadata
  notes?: string | null
  requested_by?: 'supplier' | 'buyer' | null
  
  // Timestamps
  created_at: string
  updated_at: string
  approved_at?: string | null
  approved_by?: string | null
  
  // Unpaid orders (from API enrichment)
  unpaid_order_count?: number
  unpaid_amount?: number
  has_unpaid?: boolean

  // Joined data
  supplier?: {
    id: string
    business_name: string
    type: SupplierType
    email?: string
    phone?: string
    wilaya?: string
    commune?: string
  }
  buyer?: {
    id: string
    business_name: string
    type: BuyerType
    email?: string
    phone?: string
    wilaya?: string
    commune?: string
  }
}

export interface LinkRequestInput {
  supplier_id: string
  buyer_id: string
  requested_by: 'supplier' | 'buyer'
  notes?: string
}

export interface LinkApprovalInput {
  payment_terms?: PaymentTerms
  pay_after_orders?: number  // Collect payment after N delivered orders (2, 3, etc.)
  credit_limit?: number
  discount_percent?: number
}

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export interface SupplierPurchaseOrder {
  id: string
  order_number: string
  
  buyer_id: string
  supplier_id: string
  link_id?: string | null
  
  status: OrderStatus
  
  // Financials
  subtotal: number
  discount_amount: number
  tax_amount: number
  shipping_cost: number
  total: number
  
  // Delivery
  expected_delivery_date?: string | null
  actual_delivery_date?: string | null
  delivery_address?: string | null
  delivery_wilaya?: string | null
  delivery_commune?: string | null
  
  // Tracking
  tracking_number?: string | null
  carrier?: string | null
  
  // Notes
  buyer_notes?: string | null
  supplier_notes?: string | null
  internal_notes?: string | null
  rejection_reason?: string | null
  
  // Payment (for credit terms: pay after N orders)
  paid_at?: string | null

  // Timestamps
  created_at: string
  updated_at: string
  submitted_at?: string | null
  confirmed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  
  // Joined data
  items?: SupplierPurchaseOrderItem[]
  supplier?: {
    id: string
    business_name: string
    email?: string
    phone?: string
  }
  buyer?: {
    id: string
    business_name: string
    email?: string
    phone?: string
  }
}

export interface SupplierPurchaseOrderItem {
  id: string
  order_id: string
  product_id: string
  
  quantity: number
  unit_price: number
  discount_percent: number
  line_total: number
  
  // Received
  quantity_received: number
  batch_number?: string | null
  lot_number?: string | null
  expiry_date?: string | null
  received_at?: string | null
  
  // Snapshot
  product_name: string
  product_sku?: string | null
  product_barcode?: string | null
  
  notes?: string | null
  created_at: string
  
  // Joined
  product?: SupplierProduct
}

export interface OrderInput {
  supplier_id: string
  delivery_address?: string
  delivery_wilaya?: string
  delivery_commune?: string
  expected_delivery_date?: string
  buyer_notes?: string
  items: OrderItemInput[]
}

export interface OrderItemInput {
  product_id: string
  quantity: number
  unit_price?: number  // Use product price if not specified
  notes?: string
}

export interface ReceiveOrderItemInput {
  item_id: string
  quantity_received: number
  batch_number?: string
  lot_number?: string
  expiry_date?: string
}

// ============================================================================
// INVOICES
// ============================================================================

export interface SupplierInvoice {
  id: string
  invoice_number: string
  
  supplier_id: string
  buyer_id: string
  order_id?: string | null
  
  status: InvoiceStatus
  
  // Financials
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  amount_paid: number
  balance: number
  
  // Terms
  payment_terms: PaymentTerms
  due_date?: string | null
  
  // Notes
  notes?: string | null
  payment_instructions?: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  sent_at?: string | null
  paid_at?: string | null
  
  // Joined data
  items?: SupplierInvoiceItem[]
  payments?: SupplierInvoicePayment[]
  order?: SupplierPurchaseOrder
  supplier?: {
    id: string
    business_name: string
    email?: string
    phone?: string
  }
  buyer?: {
    id: string
    business_name: string
    email?: string
    phone?: string
  }
}

export interface SupplierInvoiceItem {
  id: string
  invoice_id: string
  order_item_id?: string | null
  
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  tax_rate: number
  line_total: number
  
  created_at: string
}

export interface SupplierInvoicePayment {
  id: string
  invoice_id: string
  
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference?: string | null
  
  notes?: string | null
  recorded_by?: string | null
  
  created_at: string
}

export interface InvoiceInput {
  buyer_id: string
  order_id?: string
  subtotal: number
  tax_amount?: number
  discount_amount?: number
  total: number
  payment_terms?: PaymentTerms
  due_date?: string
  notes?: string
  payment_instructions?: string
  items: InvoiceItemInput[]
}

export interface InvoiceItemInput {
  order_item_id?: string
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
  tax_rate?: number
}

export interface PaymentInput {
  amount: number
  payment_method: PaymentMethod
  payment_date?: string
  reference?: string
  notes?: string
}

// ============================================================================
// SUPPLIER SETTINGS
// ============================================================================

export interface SupplierSettings {
  id: string
  supplier_id: string
  
  // Order settings
  min_order_value?: number | null
  free_shipping_threshold?: number | null
  default_shipping_cost: number
  default_payment_terms: PaymentTerms
  default_lead_time_days: number
  
  // Acceptance
  auto_accept_orders: boolean
  accept_orders_from_anyone: boolean
  
  // Business hours
  business_hours?: Record<string, { open: string; close: string }> | null
  
  // Notifications
  notify_new_orders: boolean
  notify_new_link_requests: boolean
  
  created_at: string
  updated_at: string
}

export interface SupplierSettingsInput {
  min_order_value?: number
  free_shipping_threshold?: number
  default_shipping_cost?: number
  default_payment_terms?: PaymentTerms
  default_lead_time_days?: number
  auto_accept_orders?: boolean
  accept_orders_from_anyone?: boolean
  business_hours?: Record<string, { open: string; close: string }>
  notify_new_orders?: boolean
  notify_new_link_requests?: boolean
}

// ============================================================================
// SUPPLIER STATS
// ============================================================================

export interface SupplierStats {
  total_products: number
  active_buyers: number
  pending_orders: number
  pending_invoices: number
  monthly_revenue: number
  outstanding_balance: number
  unpaid_orders_count?: number
  unpaid_amount?: number
  buyers_with_unpaid?: number
}

export interface BuyerSupplierStats {
  linked_suppliers: number
  pending_orders: number
  pending_invoices: number
  outstanding_balance: number
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface SupplierDirectory {
  id: string
  business_name: string
  type: SupplierType
  email?: string
  phone?: string
  wilaya?: string
  commune?: string
  address_line1?: string
  product_count: number
  is_linked: boolean
  link_status?: LinkStatus
}

// ============================================================================
// LABELS & DISPLAY HELPERS
// ============================================================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; fr: string; ar: string }> = {
  draft: { en: 'Draft', fr: 'Brouillon', ar: 'مسودة' },
  submitted: { en: 'Submitted', fr: 'Soumise', ar: 'مُرسَلة' },
  confirmed: { en: 'Confirmed', fr: 'Confirmée', ar: 'مؤكدة' },
  processing: { en: 'Processing', fr: 'En cours', ar: 'قيد المعالجة' },
  shipped: { en: 'Shipped', fr: 'Expédiée', ar: 'تم الشحن' },
  delivered: { en: 'Delivered', fr: 'Livrée', ar: 'تم التسليم' },
  completed: { en: 'Completed', fr: 'Terminée', ar: 'مكتملة' },
  cancelled: { en: 'Cancelled', fr: 'Annulée', ar: 'ملغاة' },
  rejected: { en: 'Rejected', fr: 'Rejetée', ar: 'مرفوضة' },
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, { en: string; fr: string; ar: string }> = {
  draft: { en: 'Draft', fr: 'Brouillon', ar: 'مسودة' },
  sent: { en: 'Sent', fr: 'Envoyée', ar: 'مُرسَلة' },
  partial: { en: 'Partial', fr: 'Partielle', ar: 'جزئية' },
  paid: { en: 'Paid', fr: 'Payée', ar: 'مدفوعة' },
  overdue: { en: 'Overdue', fr: 'En retard', ar: 'متأخرة' },
  cancelled: { en: 'Cancelled', fr: 'Annulée', ar: 'ملغاة' },
  disputed: { en: 'Disputed', fr: 'Contestée', ar: 'متنازع عليها' },
}

export const LINK_STATUS_LABELS: Record<LinkStatus, { en: string; fr: string; ar: string }> = {
  pending: { en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' },
  active: { en: 'Active', fr: 'Active', ar: 'نشط' },
  suspended: { en: 'Suspended', fr: 'Suspendue', ar: 'معلق' },
  rejected: { en: 'Rejected', fr: 'Rejetée', ar: 'مرفوض' },
}

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, { en: string; fr: string; ar: string }> = {
  cash: { en: 'Cash on Delivery', fr: 'Paiement à la livraison', ar: 'الدفع عند التسليم' },
  '15_days': { en: 'Net 15 Days', fr: '15 jours net', ar: '15 يوم صافي' },
  '30_days': { en: 'Net 30 Days', fr: '30 jours net', ar: '30 يوم صافي' },
  '60_days': { en: 'Net 60 Days', fr: '60 jours net', ar: '60 يوم صافي' },
  '90_days': { en: 'Net 90 Days', fr: '90 jours net', ar: '90 يوم صافي' },
  after_2_orders: { en: 'Pay after 2 orders', fr: 'Payer après 2 commandes', ar: 'الدفع بعد طلبين' },
  after_3_orders: { en: 'Pay after 3 orders', fr: 'Payer après 3 commandes', ar: 'الدفع بعد 3 طلبات' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { en: string; fr: string; ar: string }> = {
  cash: { en: 'Cash', fr: 'Espèces', ar: 'نقداً' },
  bank_transfer: { en: 'Bank Transfer', fr: 'Virement bancaire', ar: 'تحويل بنكي' },
  cheque: { en: 'Cheque', fr: 'Chèque', ar: 'شيك' },
  mobile_payment: { en: 'Mobile Payment', fr: 'Paiement mobile', ar: 'دفع بالهاتف' },
  credit: { en: 'Store Credit', fr: 'Crédit magasin', ar: 'رصيد المتجر' },
}

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, { en: string; fr: string; ar: string }> = {
  pharma_supplier: { en: 'Pharmaceutical Supplier', fr: 'Grossiste Pharmaceutique', ar: 'موزع أدوية' },
  equipment_supplier: { en: 'Medical Equipment Supplier', fr: 'Fournisseur Équipements Médicaux', ar: 'مورد معدات طبية' },
}

// Helper function to get label by language
export function getLabel<T extends string>(
  labels: Record<T, { en: string; fr: string; ar: string }>,
  key: T,
  language: 'en' | 'fr' | 'ar' = 'fr'
): string {
  return labels[key]?.[language] || key
}

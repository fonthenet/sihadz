/**
 * Pharmacy POS System - TypeScript Types
 * Covers: warehouses, cash drawers, sales, customers, loyalty, purchase orders
 */

// ============================================================================
// WAREHOUSES
// ============================================================================

export type WarehouseType = 'storage' | 'sales_floor' | 'refrigerated' | 'controlled'

export interface Warehouse {
  id: string
  pharmacy_id: string
  code: string
  name: string
  name_ar?: string
  warehouse_type: WarehouseType
  description?: string
  address?: string
  is_default: boolean
  is_sales_enabled: boolean
  temperature_controlled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WarehouseFormData {
  code: string
  name: string
  name_ar?: string
  warehouse_type?: WarehouseType
  description?: string
  is_default?: boolean
  is_sales_enabled?: boolean
  temperature_controlled?: boolean
}

// ============================================================================
// WAREHOUSE TRANSFERS
// ============================================================================

export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled'

export interface WarehouseTransfer {
  id: string
  pharmacy_id: string
  transfer_number: string
  from_warehouse_id: string
  to_warehouse_id: string
  from_warehouse?: Warehouse
  to_warehouse?: Warehouse
  status: TransferStatus
  requested_at: string
  shipped_at?: string
  received_at?: string
  notes?: string
  requested_by?: string
  shipped_by?: string
  received_by?: string
  items?: TransferItem[]
  created_at: string
}

export interface TransferItem {
  id: string
  transfer_id: string
  product_id: string
  inventory_id?: string
  quantity_requested: number
  quantity_shipped?: number
  quantity_received?: number
  batch_number?: string
  expiry_date?: string
  notes?: string
  product?: {
    id: string
    name: string
    barcode?: string
  }
}

// ============================================================================
// CASH DRAWERS & SESSIONS
// ============================================================================

export interface CashDrawer {
  id: string
  pharmacy_id: string
  name: string
  code: string
  warehouse_id?: string
  warehouse?: Warehouse
  is_active: boolean
  created_at: string
}

export type SessionStatus = 'open' | 'closing' | 'closed'

export interface CashDrawerSession {
  id: string
  pharmacy_id: string
  drawer_id: string
  drawer?: CashDrawer
  session_number: string
  
  // Opening
  opened_at: string
  opened_by: string
  opened_by_name?: string
  opening_balance: number
  opening_notes?: string
  
  // Closing
  closed_at?: string
  closed_by?: string
  closed_by_name?: string
  
  // Counted
  counted_cash?: number
  counted_cheques?: number
  counted_cards?: number
  
  // System calculated
  system_cash?: number
  system_cheques?: number
  system_cards?: number
  system_chifa?: number
  
  // Variance
  variance_cash?: number
  variance_notes?: string
  
  status: SessionStatus
  created_at: string
}

export interface OpenSessionData {
  drawer_id: string
  opening_balance: number
  opening_notes?: string
}

export interface CloseSessionData {
  counted_cash: number
  counted_cheques?: number
  counted_cards?: number
  variance_notes?: string
}

// ============================================================================
// POS SALES
// ============================================================================

export type SaleStatus = 'draft' | 'completed' | 'voided' | 'returned'
export type PaymentMethod = 'cash' | 'card' | 'cheque' | 'mobile' | 'credit' | 'chifa'

export interface POSSale {
  id: string
  pharmacy_id: string
  sale_number: string
  receipt_number?: string
  
  session_id?: string
  drawer_id?: string
  warehouse_id?: string
  
  // Customer
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  customer?: Customer
  
  // Prescription link
  prescription_id?: string
  
  // Totals
  subtotal: number
  discount_amount: number
  discount_percent: number
  tax_amount: number
  total_amount: number
  
  // Chifa split
  chifa_total: number
  patient_total: number
  
  // Payments
  paid_cash: number
  paid_card: number
  paid_cheque: number
  paid_mobile: number
  paid_credit: number
  change_given: number
  
  // Status
  status: SaleStatus
  voided_at?: string
  voided_by?: string
  void_reason?: string
  
  // Loyalty
  loyalty_points_earned: number
  loyalty_points_used: number
  
  // Audit
  created_by?: string
  created_by_name?: string
  created_at: string
  
  // Joins
  items?: SaleItem[]
  session?: CashDrawerSession
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  inventory_id?: string
  
  product_name: string
  product_barcode?: string
  
  quantity: number
  unit_price: number
  unit_cost?: number
  
  discount_amount: number
  discount_percent: number
  
  tva_rate: number
  tva_amount: number
  
  // Chifa
  is_chifa_item: boolean
  reimbursement_rate: number
  chifa_amount: number
  patient_amount: number
  
  line_total: number
  
  batch_number?: string
  expiry_date?: string
  
  quantity_returned: number
  
  /** Dosage: how to take (e.g. 1 comprimé 3 fois/jour) */
  dosage_instructions?: string
  /** Treatment period: duration (e.g. 7 jours, 2 semaines) */
  treatment_period?: string
  
  // Joined product
  product?: {
    id: string
    name: string
    barcode?: string
    is_chifa_listed: boolean
    reimbursement_rate: number
    selling_price: number
    purchase_price?: number
    tva_rate: number
  }
}

// Cart for building a sale
export interface CartItem {
  product_id: string
  inventory_id?: string
  product_name: string
  product_barcode?: string
  /** Product form for dosage text: tablet, gel, syrup, etc. */
  product_form?: string
  quantity: number
  unit_price: number
  unit_cost?: number
  discount_amount: number
  discount_percent: number
  tva_rate: number
  is_chifa_item: boolean
  reimbursement_rate: number
  batch_number?: string
  expiry_date?: string
  /** Dosage: how to take (e.g. 1 comprimé 3 fois/jour) */
  dosage_instructions?: string
  /** Treatment period: duration (e.g. 7 jours, 2 semaines) */
  treatment_period?: string
}

export interface CreateSaleData {
  session_id?: string
  warehouse_id?: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  /** Chifa insured number (from card reader or customer) - for Chifa claims */
  patient_chifa_number?: string
  prescription_id?: string
  items: CartItem[]
  discount_percent?: number
  payments: {
    cash?: number
    card?: number
    cheque?: number
    mobile?: number
    credit?: number
  }
  loyalty_points_used?: number
  notes?: string
}

// ============================================================================
// CHIFA CLAIMS
// ============================================================================

export type ClaimStatus = 'pending' | 'submitted' | 'accepted' | 'rejected' | 'paid'

export interface ChifaClaim {
  id: string
  pharmacy_id: string
  batch_number?: string
  sale_id?: string
  sale_item_id?: string
  
  patient_name?: string
  patient_chifa_number?: string
  patient_nss?: string
  beneficiary_type?: string
  
  product_id?: string
  product_name?: string
  quantity?: number
  
  tarif_reference?: number
  reimbursement_rate?: number
  amount_claimed: number
  amount_paid?: number
  
  status: ClaimStatus
  rejection_reason?: string
  
  sale_date?: string
  submitted_at?: string
  response_at?: string
  paid_at?: string
  
  created_at: string
}

// ============================================================================
// CUSTOMERS & LOYALTY
// ============================================================================

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Customer {
  id: string
  pharmacy_id: string
  customer_code?: string
  first_name?: string
  last_name?: string
  full_name: string
  phone?: string
  phone_secondary?: string
  email?: string
  
  // Chifa
  chifa_number?: string
  nss?: string
  
  // Address
  address?: string
  wilaya?: string
  commune?: string
  
  // Loyalty
  loyalty_card_number?: string
  loyalty_tier: LoyaltyTier
  loyalty_points: number
  total_points_earned: number
  total_points_used: number
  
  // Credit
  credit_limit: number
  credit_balance: number
  
  // Stats
  total_purchases: number
  purchase_count: number
  last_purchase_at?: string
  
  notes?: string
  allergies?: string
  
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  first_name?: string
  last_name?: string
  full_name: string
  phone?: string
  email?: string
  chifa_number?: string
  nss?: string
  address?: string
  wilaya?: string
  commune?: string
  notes?: string
  allergies?: string
  credit_limit?: number
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjust' | 'expire'

export interface LoyaltyTransaction {
  id: string
  pharmacy_id: string
  customer_id: string
  transaction_type: LoyaltyTransactionType
  points: number
  sale_id?: string
  description?: string
  points_before: number
  points_after: number
  created_by?: string
  created_at: string
}

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export type POStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface PurchaseOrder {
  id: string
  pharmacy_id: string
  po_number: string
  
  supplier_id?: string
  supplier_name?: string
  supplier?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  
  warehouse_id?: string
  warehouse?: Warehouse
  
  status: POStatus
  
  order_date: string
  expected_date?: string
  received_date?: string
  
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  
  payment_terms?: string
  payment_status: PaymentStatus
  amount_paid: number
  
  notes?: string
  internal_notes?: string
  
  created_by?: string
  created_by_name?: string
  approved_by?: string
  approved_at?: string
  
  items?: PurchaseOrderItem[]
  
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id?: string
  product_name: string
  product_barcode?: string
  
  quantity_ordered: number
  quantity_received: number
  
  unit_price?: number
  discount_percent: number
  line_total?: number
  
  suggested_quantity?: number
  suggestion_reason?: string
  
  product?: {
    id: string
    name: string
    barcode?: string
    purchase_price?: number
    min_stock_level?: number
  }
}

export interface CreatePOData {
  supplier_id?: string
  supplier_name?: string
  warehouse_id?: string
  expected_date?: string
  payment_terms?: string
  notes?: string
  items: Array<{
    product_id?: string
    product_name: string
    product_barcode?: string
    quantity_ordered: number
    unit_price?: number
    discount_percent?: number
  }>
}

// Order suggestion from wizard
export interface OrderSuggestion {
  product_id: string
  product_name: string
  product_barcode?: string
  current_stock: number
  min_stock_level: number
  avg_daily_sales: number
  suggested_quantity: number
  reason: 'low_stock' | 'out_of_stock' | 'rotation' | 'seasonal'
  supplier_id?: string
  supplier_name?: string
  last_purchase_price?: number
}

// ============================================================================
// DAILY SUMMARY / REPORTS
// ============================================================================

export interface DailySalesSummary {
  id: string
  pharmacy_id: string
  summary_date: string
  
  total_transactions: number
  total_items_sold: number
  total_customers: number
  
  gross_sales: number
  discounts: number
  returns: number
  net_sales: number
  
  cash_collected: number
  card_collected: number
  cheque_collected: number
  mobile_collected: number
  chifa_pending: number
  
  total_cost: number
  gross_profit: number
  gross_margin_percent: number
  
  tva_collected: number
  
  points_earned: number
  points_redeemed: number
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface POSStatsResponse {
  today: {
    sales_count: number
    total_revenue: number
    cash_collected: number
    chifa_pending: number
    items_sold: number
  }
  active_session?: CashDrawerSession
  low_stock_count: number
  pending_claims_count: number
}

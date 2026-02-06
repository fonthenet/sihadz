/**
 * Pharmacy Inventory & POS System - TypeScript Types
 * Phase 1: Inventory Management
 */

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ProductCategory {
  id: string
  name: string
  name_ar?: string
  description?: string
  parent_id?: string
  sort_order: number
  created_at: string
}

export type ProductForm = 
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'suspension'
  | 'injection'
  | 'cream'
  | 'ointment'
  | 'gel'
  | 'drops'
  | 'spray'
  | 'inhaler'
  | 'patch'
  | 'suppository'
  | 'powder'
  | 'solution'
  | 'other'

export type StorageCondition = 'room_temp' | 'refrigerated' | 'frozen' | 'protected_light'

export type ControlledTableau = 'A' | 'B' | 'C' | null

export type ProductSource = 'manual' | 'lncpp' | 'import'

export interface PharmacyProduct {
  id: string
  pharmacy_id: string
  
  // Identification
  barcode?: string
  sku?: string
  name: string
  name_ar?: string
  generic_name?: string
  dci_code?: string
  
  // Classification
  category_id?: string
  category?: ProductCategory
  form?: string
  dosage?: string
  packaging?: string
  manufacturer?: string
  country_of_origin?: string
  
  // Pricing
  purchase_price?: number
  selling_price: number
  margin_percent?: number
  
  // CNAS/Chifa
  is_chifa_listed: boolean
  reimbursement_rate: number  // 0, 80, or 100
  tarif_reference?: number
  
  // Regulatory
  requires_prescription: boolean
  is_controlled: boolean
  controlled_tableau?: ControlledTableau
  storage_conditions?: StorageCondition
  
  // Stock management
  min_stock_level: number
  reorder_quantity: number
  
  // TVA
  tva_rate: number  // 0, 9, or 19
  
  // Source
  source: ProductSource
  external_id?: string
  
  // Status
  is_active: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
  created_by?: string
  
  // Computed fields (from joins)
  current_stock?: number
  available_stock?: number
  total_value?: number
}

export interface ProductFormData {
  barcode?: string
  sku?: string
  name: string
  name_ar?: string
  generic_name?: string
  dci_code?: string
  category_id?: string
  form?: string
  dosage?: string
  packaging?: string
  manufacturer?: string
  country_of_origin?: string
  purchase_price?: number
  selling_price: number
  is_chifa_listed?: boolean
  reimbursement_rate?: number
  tarif_reference?: number
  requires_prescription?: boolean
  is_controlled?: boolean
  controlled_tableau?: ControlledTableau
  storage_conditions?: StorageCondition
  min_stock_level?: number
  reorder_quantity?: number
  tva_rate?: number
}

// ============================================================================
// SUPPLIER TYPES
// ============================================================================

export type PaymentTerms = 'cash' | '15_days' | '30_days' | '60_days' | '90_days'

export interface PharmacySupplier {
  id: string
  pharmacy_id: string
  
  name: string
  contact_person?: string
  phone?: string
  phone_secondary?: string
  email?: string
  fax?: string
  
  address?: string
  wilaya?: string
  commune?: string
  
  payment_terms?: PaymentTerms
  credit_limit?: number
  
  notes?: string
  is_active: boolean
  
  created_at: string
  updated_at: string
}

export interface SupplierFormData {
  name: string
  contact_person?: string
  phone?: string
  phone_secondary?: string
  email?: string
  fax?: string
  address?: string
  wilaya?: string
  commune?: string
  payment_terms?: PaymentTerms
  credit_limit?: number
  notes?: string
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface PharmacyInventory {
  id: string
  pharmacy_id: string
  product_id: string
  
  // Batch tracking
  batch_number?: string
  lot_number?: string
  
  // Quantities
  quantity: number
  reserved_quantity: number
  
  // Pricing
  purchase_price_unit?: number
  
  // Dates
  expiry_date?: string
  received_date: string
  
  // References
  supplier_id?: string
  supplier?: PharmacySupplier
  purchase_order_id?: string
  
  // Location
  location?: string
  
  // Status
  is_active: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Joined data
  product?: PharmacyProduct
}

export interface InventoryFormData {
  product_id: string
  batch_number?: string
  lot_number?: string
  quantity: number
  purchase_price_unit?: number
  expiry_date?: string
  supplier_id?: string
  location?: string
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export type TransactionType =
  | 'purchase'
  | 'sale'
  | 'prescription'
  | 'adjustment_add'
  | 'adjustment_remove'
  | 'return_supplier'
  | 'return_customer'
  | 'expired'
  | 'damage'
  | 'transfer_in'
  | 'transfer_out'

export type AdjustmentReasonCode =
  | 'count_correction'
  | 'damage'
  | 'theft'
  | 'expiry'
  | 'quality_issue'
  | 'data_entry_error'
  | 'initial_stock'
  | 'other'

export interface InventoryTransaction {
  id: string
  pharmacy_id: string
  product_id: string
  inventory_id?: string
  
  // Transaction details
  transaction_type: TransactionType
  quantity_change: number
  quantity_before: number
  quantity_after: number
  
  // Pricing
  unit_price?: number
  total_value?: number
  
  // Reference
  reference_type?: string
  reference_id?: string
  
  // Batch info
  batch_number?: string
  expiry_date?: string
  
  // Reason
  reason_code?: AdjustmentReasonCode
  notes?: string
  
  // Audit
  created_by?: string
  created_by_name?: string
  created_at: string
  
  // Approval
  requires_approval: boolean
  approved_by?: string
  approved_at?: string
  approval_status: 'pending' | 'approved' | 'rejected'
  
  // Joined data
  product?: PharmacyProduct
}

export interface StockAdjustmentData {
  product_id: string
  inventory_id?: string
  adjustment_type: 'add' | 'remove'
  quantity: number
  reason_code: AdjustmentReasonCode
  notes?: string
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertType = 'low_stock' | 'expiring_30' | 'expiring_7' | 'expired'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface StockAlert {
  id: string
  pharmacy_id: string
  product_id: string
  inventory_id?: string
  
  alert_type: AlertType
  severity: AlertSeverity
  message?: string
  
  // Alert data
  current_quantity?: number
  min_stock_level?: number
  expiry_date?: string
  days_until_expiry?: number
  
  // Status
  is_active: boolean
  acknowledged_at?: string
  acknowledged_by?: string
  resolved_at?: string
  
  created_at: string
  updated_at: string
  
  // Joined data
  product?: PharmacyProduct
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ProductImport {
  id: string
  pharmacy_id: string
  
  filename?: string
  file_size?: number
  
  total_rows: number
  imported_count: number
  updated_count: number
  skipped_count: number
  error_count: number
  
  status: ImportStatus
  error_log?: ImportError[]
  
  started_at?: string
  completed_at?: string
  created_by?: string
  created_at: string
}

export interface ImportError {
  row: number
  field?: string
  value?: string
  message: string
}

export interface ImportColumnMapping {
  source_column: string
  target_field: keyof ProductFormData | 'skip'
}

export interface ImportPreview {
  headers: string[]
  sample_rows: Record<string, string>[]
  suggested_mappings: ImportColumnMapping[]
}

// ============================================================================
// DASHBOARD STATS TYPES
// ============================================================================

export interface InventoryStats {
  total_products: number
  active_products: number
  total_stock_value: number
  low_stock_count: number
  expiring_soon_count: number
  expired_count: number
  total_suppliers: number
}

export interface StockSummary {
  product_id: string
  product_name: string
  category_name?: string
  total_quantity: number
  reserved_quantity: number
  available_quantity: number
  min_stock_level: number
  is_low_stock: boolean
  earliest_expiry?: string
  days_until_expiry?: number
  total_value: number
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ProductsListResponse extends PaginatedResponse<PharmacyProduct> {
  stats?: {
    total_active: number
    low_stock: number
    out_of_stock: number
  }
}

export interface InventoryListResponse extends PaginatedResponse<PharmacyInventory> {
  total_value?: number
}

export interface TransactionsListResponse extends PaginatedResponse<InventoryTransaction> {
  summary?: {
    total_in: number
    total_out: number
    net_change: number
  }
}

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

export interface ProductFilters {
  search?: string
  category_id?: string
  is_chifa_listed?: boolean
  requires_prescription?: boolean
  is_controlled?: boolean
  is_active?: boolean
  low_stock_only?: boolean
  out_of_stock_only?: boolean
}

export interface ProductSort {
  field: 'name' | 'selling_price' | 'current_stock' | 'created_at' | 'updated_at'
  direction: 'asc' | 'desc'
}

export interface InventoryFilters {
  product_id?: string
  supplier_id?: string
  expiring_within_days?: number
  expired_only?: boolean
  low_stock_only?: boolean
}

export interface TransactionFilters {
  product_id?: string
  transaction_type?: TransactionType
  date_from?: string
  date_to?: string
  reference_type?: string
}

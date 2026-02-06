// ============================================================================
// ORDONNANCIER (Controlled Substances Register) - TypeScript Types
// ============================================================================

export type ControlledTableau = 'A' | 'B' | 'C'

// ============================================================================
// ORDONNANCIER REGISTERS
// ============================================================================
export interface OrdonnancierRegister {
  id: string
  pharmacy_id: string
  register_number: string
  year: number
  tableau: ControlledTableau
  is_active: boolean
  opened_at: string
  closed_at?: string
  closed_by?: string
  created_at: string
  created_by?: string
}

// ============================================================================
// ORDONNANCIER ENTRIES
// ============================================================================
export interface OrdonnancierEntry {
  id: string
  pharmacy_id: string
  register_id: string
  entry_number: number
  entry_date: string
  
  // Product
  product_id?: string
  product_name: string
  product_dci?: string
  dosage?: string
  tableau: ControlledTableau
  
  // Stock
  inventory_id?: string
  batch_number?: string
  quantity_dispensed: number
  unit: string
  stock_before: number
  stock_after: number
  
  // Patient
  patient_name: string
  patient_id_type?: string
  patient_id_number?: string
  patient_id_verified: boolean
  patient_address?: string
  patient_phone?: string
  
  // Prescriber
  prescriber_name: string
  prescriber_specialty?: string
  prescriber_order_number?: string
  prescriber_address?: string
  
  // Prescription
  prescription_number: string
  prescription_date: string
  treatment_duration_days?: number
  
  // POS link
  sale_id?: string
  sale_item_index?: number
  
  // Pharmacist
  dispensed_by: string
  dispensed_by_name: string
  verified_by?: string
  verified_by_name?: string
  
  notes?: string
  created_at: string
  updated_at: string
}

// Form data for creating entry
export interface OrdonnancierEntryInput {
  product_id?: string
  product_name: string
  product_dci?: string
  dosage?: string
  tableau: ControlledTableau
  inventory_id?: string
  batch_number?: string
  quantity_dispensed: number
  unit?: string
  patient_name: string
  patient_id_type?: string
  patient_id_number?: string
  patient_id_verified?: boolean
  patient_address?: string
  patient_phone?: string
  prescriber_name: string
  prescriber_specialty?: string
  prescriber_order_number?: string
  prescriber_address?: string
  prescription_number: string
  prescription_date: string
  treatment_duration_days?: number
  sale_id?: string
  sale_item_index?: number
  notes?: string
}

// ============================================================================
// ORDONNANCIER RECONCILIATION
// ============================================================================
export type ReconciliationStatus = 'pending' | 'approved' | 'discrepancy'

export interface OrdonnancierReconciliation {
  id: string
  pharmacy_id: string
  register_id: string
  reconciliation_date: string
  reconciliation_number: string
  product_id: string
  product_name: string
  system_quantity: number
  physical_count: number
  variance: number
  status: ReconciliationStatus
  variance_explanation?: string
  approved_by?: string
  approved_by_name?: string
  approved_at?: string
  created_by: string
  created_by_name: string
  created_at: string
}

// ============================================================================
// B2B CUSTOMERS
// ============================================================================
export interface B2BCustomer {
  id: string
  pharmacy_id: string
  company_name: string
  company_name_ar?: string
  legal_form?: string
  nif?: string
  nis?: string
  rc?: string
  article_imposition?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  wilaya?: string
  commune?: string
  payment_terms: number
  credit_limit: number
  is_active: boolean
  current_balance: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface B2BCustomerInput {
  company_name: string
  company_name_ar?: string
  legal_form?: string
  nif?: string
  nis?: string
  rc?: string
  article_imposition?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  wilaya?: string
  commune?: string
  payment_terms?: number
  credit_limit?: number
}

// ============================================================================
// B2B INVOICES
// ============================================================================
export type B2BInvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export interface B2BInvoice {
  id: string
  pharmacy_id: string
  customer_id: string
  customer?: B2BCustomer
  invoice_number: string
  invoice_date: string
  due_date: string
  sale_ids: string[]
  subtotal_ht: number
  tva_0_base: number
  tva_9_base: number
  tva_9_amount: number
  tva_19_base: number
  tva_19_amount: number
  total_tva: number
  total_ttc: number
  amount_paid: number
  status: B2BInvoiceStatus
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  items?: B2BInvoiceItem[]
}

export interface B2BInvoiceItem {
  id: string
  invoice_id: string
  product_id?: string
  product_name: string
  product_barcode?: string
  quantity: number
  unit_price_ht: number
  tva_rate: number
  tva_amount: number
  line_total_ht: number
  line_total_ttc: number
  created_at: string
}

// ============================================================================
// B2B PAYMENTS
// ============================================================================
export interface B2BPayment {
  id: string
  pharmacy_id: string
  customer_id: string
  invoice_id?: string
  payment_date: string
  amount: number
  payment_method: string
  reference?: string
  notes?: string
  created_at: string
  created_by?: string
}

// ============================================================================
// CHIFA STATUS HISTORY
// ============================================================================
export interface ChifaStatusHistoryEntry {
  status: string
  changed_at: string
  changed_by?: string
  changed_by_name?: string
  notes?: string
}

// ============================================================================
// G50 EXPORT
// ============================================================================
export interface G50ExportData {
  pharmacy_id: string
  pharmacy_name: string
  pharmacy_nif?: string
  pharmacy_nis?: string
  pharmacy_rc?: string
  pharmacy_article?: string
  pharmacy_address?: string
  period_year: number
  period_month: number
  period_label: string
  
  // TVA Collectée (on sales)
  tva_collectee_19_base: number
  tva_collectee_19_amount: number
  tva_collectee_9_base: number
  tva_collectee_9_amount: number
  tva_collectee_0_base: number
  total_tva_collectee: number
  
  // TVA Déductible (on purchases)
  tva_deductible_19_base: number
  tva_deductible_19_amount: number
  tva_deductible_9_base: number
  tva_deductible_9_amount: number
  total_tva_deductible: number
  
  // Net
  tva_a_decaisser: number
  credit_tva: number
  
  // Status
  status: 'draft' | 'ready' | 'filed'
  g50_reference?: string
  generated_at: string
}

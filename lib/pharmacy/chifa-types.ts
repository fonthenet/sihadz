// ============================================================================
// CHIFA/CNAS SYSTEM - TYPE DEFINITIONS
// ============================================================================

// Insurance types
export type InsuranceType = 'CNAS' | 'CASNOS' | 'CVM' | 'HORS_CHIFA'

// ============================================================================
// CHRONIC DISEASE CODES (ALD)
// ============================================================================
export interface ChronicDiseaseCode {
  id: string
  code: string                // ALD-01, ALD-02, etc.
  name_fr: string
  name_ar?: string
  category: string            // cardiovascular, neurological, etc.
  coverage_rate: number       // Always 100 for ALD
  is_active: boolean
}

// ============================================================================
// CHIFA INVOICES (Factures Chifa)
// ============================================================================
export interface ChifaInvoice {
  id: string
  pharmacy_id: string
  invoice_number: string
  invoice_date: string
  
  // Link to POS
  sale_id?: string
  sale?: {
    sale_number: string
    total_amount: number
  }
  
  // Patient/Insured info
  insured_number: string
  insured_name: string
  insured_rank: number        // 1=principal, 2+=ayant-droit
  beneficiary_name?: string
  beneficiary_relationship?: string
  
  // Insurance
  insurance_type: InsuranceType
  is_chronic: boolean
  chronic_code?: string
  chronic_disease?: ChronicDiseaseCode
  
  // Prescription
  prescriber_name?: string
  prescriber_specialty?: string
  prescription_date?: string
  prescription_number?: string
  treatment_duration: number  // Days
  
  // Financials
  total_tarif_reference: number
  total_chifa: number         // What CNAS pays
  total_patient: number       // What patient pays
  total_majoration: number    // 20% local product bonus
  grand_total: number
  
  // Status
  status: ChifaInvoiceStatus
  bordereau_id?: string
  
  // Rejection
  rejection_code?: string
  rejection_reason?: string
  rejection_date?: string
  
  // Payment
  paid_amount?: number
  paid_date?: string
  payment_reference?: string
  
  // Items
  items?: ChifaInvoiceItem[]
  
  // Audit
  created_by?: string
  created_at: string
  updated_at: string
}

export type ChifaInvoiceStatus = 
  | 'pending'      // Created, not in any bordereau
  | 'in_bordereau' // Added to a bordereau
  | 'submitted'    // Bordereau submitted to CNAS
  | 'paid'         // Payment received
  | 'rejected'     // Rejected by CNAS

// ============================================================================
// CHIFA INVOICE ITEMS
// ============================================================================
export interface ChifaInvoiceItem {
  id: string
  invoice_id: string
  
  // Product
  product_id?: string
  product_name: string
  product_barcode?: string
  cnas_code?: string          // N°Enregistrement CNAS
  
  // Batch
  batch_number?: string
  expiry_date?: string
  
  // Quantities
  quantity: number
  
  // Pricing
  unit_price: number
  tarif_reference?: number    // CNAS reference price
  purchase_price?: number
  
  // Reimbursement
  reimbursement_rate: number  // 0, 60, 80, 100
  chifa_amount: number        // CNAS pays
  patient_amount: number      // Patient pays
  
  // Local product bonus
  is_local_product: boolean
  majoration_amount: number   // 20% bonus
  
  // Total
  line_total: number
}

// ============================================================================
// BORDEREAUX (Batch submissions)
// ============================================================================
export interface ChifaBordereau {
  id: string
  pharmacy_id: string
  bordereau_number: string
  insurance_type: InsuranceType
  
  // Period
  period_start: string
  period_end: string
  
  // Counts
  invoice_count: number
  total_tarif_reference: number
  total_chifa_amount: number
  total_patient_amount: number
  total_majoration: number
  
  // Status
  status: BordereauStatus
  
  // Dates
  finalized_at?: string
  submitted_at?: string
  response_date?: string
  
  // Submission
  submitted_by?: string
  submitted_by_name?: string
  submission_notes?: string
  
  // Payment
  amount_paid?: number
  payment_date?: string
  payment_reference?: string
  
  // Rejections
  rejected_count: number
  rejection_total: number
  
  // Notes
  notes?: string
  
  // Invoices
  invoices?: ChifaInvoice[]
  
  // Audit
  created_by?: string
  created_at: string
  updated_at: string
}

export type BordereauStatus = 
  | 'draft'       // Being prepared
  | 'finalized'   // Locked for submission
  | 'submitted'   // Submitted to CNAS
  | 'processing'  // Being processed by CNAS
  | 'paid'        // Fully paid
  | 'partial'     // Partially paid (some rejections)
  | 'rejected'    // Fully rejected

// ============================================================================
// CHIFA REJECTIONS
// ============================================================================
export interface ChifaRejection {
  id: string
  pharmacy_id: string
  invoice_id: string
  bordereau_id?: string
  
  // Details
  rejection_date: string
  rejection_code?: string
  rejection_motif: string
  rejected_amount: number
  
  // Resolution
  status: RejectionStatus
  corrected_invoice_id?: string
  resolution_notes?: string
  resolved_at?: string
  resolved_by?: string
  
  // Resubmission
  new_bordereau_id?: string
  
  // Relations
  invoice?: ChifaInvoice
  
  created_at: string
  updated_at: string
}

export type RejectionStatus = 
  | 'pending'     // Needs attention
  | 'corrected'   // Invoice corrected
  | 'resubmitted' // Added to new bordereau
  | 'written_off' // Passed as loss

// ============================================================================
// FORM DATA TYPES
// ============================================================================
export interface ChifaInvoiceFormData {
  sale_id?: string
  insured_number: string
  insured_name: string
  insured_rank: number
  beneficiary_name?: string
  beneficiary_relationship?: string
  insurance_type: InsuranceType
  is_chronic: boolean
  chronic_code?: string
  prescriber_name?: string
  prescriber_specialty?: string
  prescription_date?: string
  prescription_number?: string
  treatment_duration: number
  items: ChifaInvoiceItemFormData[]
}

export interface ChifaInvoiceItemFormData {
  product_id: string
  product_name: string
  product_barcode?: string
  cnas_code?: string
  batch_number?: string
  expiry_date?: string
  quantity: number
  unit_price: number
  tarif_reference?: number
  purchase_price?: number
  reimbursement_rate: number
  is_local_product: boolean
}

export interface BordereauFormData {
  insurance_type: InsuranceType
  period_start: string
  period_end: string
  invoice_ids: string[]
  notes?: string
}

export interface RejectionResolutionData {
  status: RejectionStatus
  resolution_notes?: string
  corrected_invoice_id?: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
export interface ChifaDashboardStats {
  pending_invoices: number
  pending_amount: number
  in_bordereau_invoices: number
  in_bordereau_amount: number
  submitted_amount: number
  pending_bordereaux: number
  pending_rejections: number
  this_month_claims: number
  this_month_amount: number
  paid_this_month: number
}

export interface ChifaSplitCalculation {
  chifa_amount: number
  patient_amount: number
  majoration_amount: number
  line_total: number
}

// ============================================================================
// COMMON REJECTION CODES (from CNAS)
// ============================================================================
export const REJECTION_CODES = {
  'R01': 'Numéro d\'assuré invalide',
  'R02': 'Carte Chifa expirée',
  'R03': 'Médicament non remboursable',
  'R04': 'Dépassement du plafond mensuel',
  'R05': 'Ordonnance expirée',
  'R06': 'Doublon de facture',
  'R07': 'Quantité excessive',
  'R08': 'Tarif de référence incorrect',
  'R09': 'Prescripteur non agréé',
  'R10': 'Bénéficiaire non couvert',
  'R99': 'Autre motif'
} as const

export type RejectionCode = keyof typeof REJECTION_CODES

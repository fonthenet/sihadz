// ============================================================================
// ACCOUNTING SYSTEM - TYPE DEFINITIONS (SCF-COMPLIANT)
// ============================================================================

// ============================================================================
// FISCAL YEARS
// ============================================================================
export interface FiscalYear {
  id: string
  pharmacy_id: string
  name: string                // "Exercice 2026"
  code: string                // "2026"
  start_date: string
  end_date: string
  status: FiscalYearStatus
  is_current: boolean
  closed_at?: string
  closed_by?: string
  created_at: string
  updated_at: string
}

export type FiscalYearStatus = 'open' | 'closing' | 'closed'

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================
export interface Account {
  id: string
  pharmacy_id: string
  code: string                // "411", "531", "700"
  name: string
  name_ar?: string
  account_class: AccountClass // 1-7
  account_type: AccountType
  parent_code?: string
  normal_balance: 'debit' | 'credit'
  is_detail: boolean          // FALSE for summary accounts
  tva_applicable: boolean
  default_tva_rate?: number
  account_subtype?: AccountSubtype
  is_active: boolean
  is_system: boolean          // Cannot delete
  created_at: string
  updated_at: string
  
  // Computed (for display)
  balance?: number
  debit_total?: number
  credit_total?: number
}

export type AccountClass = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type AccountType = 
  | 'asset'     // Classes 2, 3, 5 (debit increases)
  | 'liability' // Class 4 - payables (credit increases)
  | 'equity'    // Class 1 (credit increases)
  | 'expense'   // Class 6 (debit increases)
  | 'revenue'   // Class 7 (credit increases)

export type AccountSubtype = 
  | 'client'
  | 'supplier'
  | 'bank'
  | 'cash'
  | 'cnas'
  | 'casnos'
  | 'cvm'

// Account class names (SCF)
export const ACCOUNT_CLASSES: Record<AccountClass, { name_fr: string; name_ar: string }> = {
  1: { name_fr: 'Capitaux', name_ar: 'رأس المال' },
  2: { name_fr: 'Immobilisations', name_ar: 'الأصول الثابتة' },
  3: { name_fr: 'Stocks', name_ar: 'المخزون' },
  4: { name_fr: 'Tiers', name_ar: 'الغير' },
  5: { name_fr: 'Financiers', name_ar: 'المالية' },
  6: { name_fr: 'Charges', name_ar: 'الأعباء' },
  7: { name_fr: 'Produits', name_ar: 'الإيرادات' }
}

// ============================================================================
// JOURNAL TYPES
// ============================================================================
export interface JournalType {
  id: string
  pharmacy_id: string
  code: string                // VT, AC, CA, BQ, OD, SA
  name: string
  name_ar?: string
  description?: string
  default_debit_account?: string
  default_credit_account?: string
  prefix?: string
  is_active: boolean
  is_system: boolean
  created_at: string
}

// Standard journal codes
export const JOURNAL_CODES = {
  VT: 'Journal des Ventes',
  AC: 'Journal des Achats',
  CA: 'Journal de Caisse',
  BQ: 'Journal de Banque',
  OD: 'Journal des Opérations Diverses',
  SA: 'Journal des Salaires',
  AN: 'Journal des À-Nouveaux'
} as const

export type JournalCode = keyof typeof JOURNAL_CODES

// ============================================================================
// JOURNAL ENTRIES (Écritures comptables)
// ============================================================================
export interface JournalEntry {
  id: string
  pharmacy_id: string
  entry_number: string        // VT-2026-00001
  journal_type_id?: string
  journal_type?: JournalType
  fiscal_year_id?: string
  entry_date: string
  description: string         // Libellé
  
  // Reference
  reference_type?: string     // pos_sale, purchase, chifa_payment
  reference_id?: string
  reference_number?: string
  
  // Totals (must balance)
  total_debit: number
  total_credit: number
  
  // Status
  status: EntryStatus
  posted_at?: string
  posted_by?: string
  
  // Lines
  lines?: JournalEntryLine[]
  
  // Audit
  is_auto_generated: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export type EntryStatus = 'draft' | 'posted' | 'cancelled'

// ============================================================================
// JOURNAL ENTRY LINES
// ============================================================================
export interface JournalEntryLine {
  id: string
  entry_id: string
  line_number: number
  account_id: string
  account_code: string        // Denormalized
  account?: Account
  description?: string
  
  // Amounts (one must be 0)
  debit_amount: number
  credit_amount: number
  
  // Third party (for AR/AP)
  third_party_type?: 'client' | 'supplier' | 'cnas' | 'casnos'
  third_party_id?: string
  third_party_name?: string
  due_date?: string
  
  // TVA
  tva_rate?: number
  tva_amount?: number
  
  // Reconciliation
  is_reconciled: boolean
  reconciled_at?: string
  reconciliation_ref?: string
  
  created_at: string
}

// ============================================================================
// TVA TRACKING
// ============================================================================
export interface TVAEntry {
  id: string
  pharmacy_id: string
  period_year: number
  period_month: number
  tva_type: 'collectee' | 'deductible'
  
  // Per rate
  tva_19_base: number
  tva_19_amount: number
  tva_9_base: number
  tva_9_amount: number
  tva_0_base: number          // Exempt
  
  // Totals
  total_base: number
  total_tva: number
  
  // Status
  status: 'open' | 'closed' | 'declared'
  g50_reference?: string
  declared_at?: string
  
  created_at: string
  updated_at: string
}

// ============================================================================
// POSTING RULES
// ============================================================================
export interface PostingRule {
  id: string
  pharmacy_id: string
  rule_code: string           // pos_sale_cash, pos_sale_chifa
  name: string
  description?: string
  source_type: string         // pos_sale, chifa_payment, stock_receipt
  journal_type_code: string
  description_template: string
  lines_template: PostingLineTemplate[]
  is_active: boolean
  created_at: string
}

export interface PostingLineTemplate {
  account_code: string
  side: 'debit' | 'credit'
  field: string               // Field from source document
  description?: string
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================
export interface JournalEntryFormData {
  journal_type_code: string
  entry_date: string
  description: string
  reference_type?: string
  reference_number?: string
  lines: JournalEntryLineFormData[]
}

export interface JournalEntryLineFormData {
  account_code: string
  description?: string
  debit_amount: number
  credit_amount: number
  third_party_type?: string
  third_party_id?: string
  third_party_name?: string
  due_date?: string
}

// ============================================================================
// REPORT TYPES
// ============================================================================

// Trial Balance (Balance Générale)
export interface TrialBalanceRow {
  account_code: string
  account_name: string
  account_class: AccountClass
  opening_debit: number
  opening_credit: number
  period_debit: number
  period_credit: number
  closing_debit: number
  closing_credit: number
}

export interface TrialBalanceReport {
  pharmacy_id: string
  period_start: string
  period_end: string
  fiscal_year: string
  rows: TrialBalanceRow[]
  totals: {
    opening_debit: number
    opening_credit: number
    period_debit: number
    period_credit: number
    closing_debit: number
    closing_credit: number
  }
}

// General Ledger (Grand Livre)
export interface GeneralLedgerEntry {
  entry_date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  balance: number
}

export interface GeneralLedgerAccount {
  account_code: string
  account_name: string
  opening_balance: number
  entries: GeneralLedgerEntry[]
  closing_balance: number
  total_debit: number
  total_credit: number
}

export interface GeneralLedgerReport {
  pharmacy_id: string
  period_start: string
  period_end: string
  accounts: GeneralLedgerAccount[]
}

// Income Statement (Compte de Résultat)
export interface IncomeStatementReport {
  pharmacy_id: string
  period_start: string
  period_end: string
  
  // Revenue (Class 7)
  sales_medications: number
  sales_parapharmacy: number
  other_revenue: number
  financial_income: number
  total_revenue: number
  
  // Expenses (Class 6)
  purchases: number
  stock_variation: number
  external_services: number
  personnel: number
  taxes: number
  depreciation: number
  financial_charges: number
  other_expenses: number
  total_expenses: number
  
  // Results
  gross_margin: number
  operating_result: number
  net_result_before_tax: number
  income_tax: number
  net_result: number
}

// Balance Sheet (Bilan)
export interface BalanceSheetReport {
  pharmacy_id: string
  as_of_date: string
  
  // Assets (Actif)
  assets: {
    fixed_assets: number      // Class 2
    inventory: number         // Class 3
    receivables: number       // Class 4 (debit)
    cash_bank: number         // Class 5
    total: number
  }
  
  // Liabilities & Equity (Passif)
  liabilities: {
    equity: number            // Class 1
    payables: number          // Class 4 (credit)
    total: number
  }
}

// TVA Summary for G50
export interface G50Summary {
  pharmacy_id: string
  period_year: number
  period_month: number
  
  // TVA Collectée (on sales)
  tva_collectee_19: number
  tva_collectee_9: number
  total_collectee: number
  
  // TVA Déductible (on purchases)
  tva_deductible_19: number
  tva_deductible_9: number
  total_deductible: number
  
  // Net
  tva_a_decaisser: number     // If positive, pay to DGI
  credit_tva: number          // If negative, carry forward
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================
export interface AccountingDashboardStats {
  // Current period
  total_revenue: number
  total_expenses: number
  net_result: number
  
  // Cash position
  cash_balance: number
  bank_balance: number
  
  // Receivables
  client_receivables: number
  cnas_receivables: number
  casnos_receivables: number
  
  // Payables
  supplier_payables: number
  
  // TVA
  tva_collectee_month: number
  tva_deductible_month: number
  tva_net_month: number
  
  // Entries
  unposted_entries: number
  entries_this_month: number
}

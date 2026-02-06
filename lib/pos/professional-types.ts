/**
 * Professional POS types - manual line items, cash-focused
 */

export interface ProfessionalCashDrawer {
  id: string
  professional_id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
  current_session?: ProfessionalCashDrawerSession | null
}

export type ProfessionalSessionStatus = 'open' | 'closing' | 'closed'

export interface ProfessionalCashDrawerSession {
  id: string
  professional_id: string
  drawer_id: string
  drawer?: ProfessionalCashDrawer
  session_number: string
  opened_at: string
  opened_by: string
  opened_by_name?: string
  opening_balance: number
  opening_notes?: string
  closed_at?: string
  closed_by?: string
  closed_by_name?: string
  counted_cash?: number
  counted_cheques?: number
  counted_cards?: number
  system_cash?: number
  system_cheques?: number
  system_cards?: number
  system_chifa?: number
  variance_cash?: number
  variance_notes?: string
  status: ProfessionalSessionStatus
  created_at: string
}

export interface ProfessionalPOSSale {
  id: string
  professional_id: string
  sale_number: string
  receipt_number?: string
  session_id?: string
  drawer_id?: string
  customer_name?: string
  customer_phone?: string
  appointment_id?: string | null
  patient_id?: string | null
  subtotal: number
  discount_amount: number
  discount_percent: number
  tax_amount: number
  total_amount: number
  chifa_total: number
  patient_total: number
  paid_cash: number
  paid_card: number
  paid_cheque: number
  paid_mobile: number
  paid_credit: number
  change_given: number
  status: string
  created_by_name?: string
  created_at: string
  items?: ProfessionalPOSSaleItem[]
}

export interface ProfessionalPOSSaleItem {
  id: string
  sale_id: string
  service_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_amount: number
  discount_percent: number
  line_total: number
  is_chifa_item: boolean
  reimbursement_rate: number
  chifa_amount: number
  patient_amount: number
  created_at: string
}

export interface ProfessionalPOSSettings {
  id: string
  professional_id: string
  chifa_enabled: boolean
  card_enabled: boolean
  created_at: string
  updated_at: string
}

/** Cart item for professional POS - can be from service catalog or manual entry */
export interface ProfessionalCartItem {
  service_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_amount?: number
  discount_percent?: number
  is_chifa_item?: boolean
  reimbursement_rate?: number
}

export interface CreateProfessionalSaleData {
  session_id?: string
  customer_name?: string
  customer_phone?: string
  patient_chifa_number?: string
  appointment_id?: string | null
  patient_id?: string | null
  items: ProfessionalCartItem[]
  discount_percent?: number
  payments: {
    cash?: number
    card?: number
    cheque?: number
    mobile?: number
    credit?: number
  }
  notes?: string
}

/** Service from the professional's catalog */
export interface ProfessionalService {
  id: string
  professional_id: string
  service_name: string
  name_ar?: string
  service_description?: string
  description_ar?: string
  price: number
  duration?: number
  image_url?: string
  category?: string
  is_chifa_eligible?: boolean
  chifa_reimbursement_rate?: number
  display_order?: number
  is_active: boolean
}

/** Appointment data pre-filled for POS checkout */
export interface AppointmentForPOS {
  appointment_id: string
  patient_id: string | null
  patient_name: string
  patient_phone: string
  patient_email: string
  appointment_date: string
  appointment_time: string
  visit_type: string
  status: string
  payment_status: string
  already_paid: boolean
  service: {
    id: string | null
    name: string
    price: number
    is_chifa_eligible: boolean
    chifa_reimbursement_rate: number
  }
}

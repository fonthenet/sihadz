/**
 * Data Exporter
 * Export data from database for backup
 */

import { createAdminClient } from '@/lib/supabase/server'
import { BackupData, BackupType, PharmacyBackupData, ProfessionalBackupData, PatientBackupData, SettingsBackupData } from './types'

// =====================================================
// MAIN EXPORT FUNCTIONS
// =====================================================

/**
 * Export full backup data based on type
 */
export async function exportBackupData(
  userId: string,
  backupType: BackupType,
  professionalId?: string
): Promise<BackupData> {
  const metadata = {
    backup_type: backupType,
    created_at: new Date().toISOString(),
    user_id: userId,
    professional_id: professionalId,
    version: '1.0'
  }
  
  const backupData: BackupData = { metadata }
  
  switch (backupType) {
    case 'full':
      // Export everything for this user/professional
      if (professionalId) {
        backupData.professional = await exportProfessionalData(professionalId)
        
        // Check if it's a pharmacy
        const supabase = createAdminClient()
        const { data: prof } = await supabase
          .from('professionals')
          .select('type')
          .eq('id', professionalId)
          .single()
        
        if (prof?.type === 'pharmacy') {
          backupData.pharmacy = await exportPharmacyData(professionalId)
        }
      }
      backupData.settings = await exportSettingsData(userId, professionalId)
      break
      
    case 'pharmacy':
      if (!professionalId) throw new Error('Professional ID required for pharmacy backup')
      backupData.pharmacy = await exportPharmacyData(professionalId)
      break
      
    case 'professional':
      if (!professionalId) throw new Error('Professional ID required for professional backup')
      backupData.professional = await exportProfessionalData(professionalId)
      break
      
    case 'patient':
      backupData.patient = await exportPatientData(userId)
      break
  }
  
  return backupData
}

// =====================================================
// PHARMACY DATA EXPORT
// =====================================================

/**
 * Export all pharmacy-related data
 */
async function exportPharmacyData(pharmacyId: string): Promise<PharmacyBackupData> {
  const supabase = createAdminClient()
  
  // Fetch all pharmacy data in parallel
  const [
    productsResult,
    stockResult,
    salesResult,
    sessionsResult,
    cashMovementsResult,
    suppliersResult,
    purchaseOrdersResult,
    chifaInvoicesResult,
    chifaBordereauxResult,
    chifaRejectionsResult,
    accountsResult,
    journalTypesResult,
    journalEntriesResult
  ] = await Promise.all([
    supabase.from('pharmacy_products').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('pharmacy_stock').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('pos_sales').select('*, pos_sale_items(*)').eq('pharmacy_id', pharmacyId),
    supabase.from('pos_sessions').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('pos_cash_movements').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('suppliers').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('purchase_orders').select('*, purchase_order_items(*)').eq('pharmacy_id', pharmacyId),
    supabase.from('chifa_invoices').select('*, chifa_invoice_items(*)').eq('pharmacy_id', pharmacyId),
    supabase.from('chifa_bordereaux').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('chifa_rejections').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('accounting_accounts').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('accounting_journal_types').select('*').eq('pharmacy_id', pharmacyId),
    supabase.from('accounting_journal_entries').select('*, accounting_journal_lines(*)').eq('pharmacy_id', pharmacyId)
  ])
  
  return {
    products: productsResult.data || [],
    stock: stockResult.data || [],
    sales: salesResult.data || [],
    pos_sessions: sessionsResult.data || [],
    cash_movements: cashMovementsResult.data || [],
    suppliers: suppliersResult.data || [],
    purchase_orders: purchaseOrdersResult.data || [],
    chifa_invoices: chifaInvoicesResult.data || [],
    chifa_bordereaux: chifaBordereauxResult.data || [],
    chifa_rejections: chifaRejectionsResult.data || [],
    accounting_accounts: accountsResult.data || [],
    accounting_journals: journalTypesResult.data || [],
    accounting_entries: journalEntriesResult.data || []
  }
}

// =====================================================
// PROFESSIONAL DATA EXPORT
// =====================================================

/**
 * Export all professional-related data
 */
async function exportProfessionalData(professionalId: string): Promise<ProfessionalBackupData> {
  const supabase = createAdminClient()
  
  // Fetch professional data in parallel
  const [
    profileResult,
    employeesResult,
    appointmentsResult,
    availabilityResult,
    servicesResult,
    prescriptionsResult,
    labRequestsResult,
    medicalRecordsResult
  ] = await Promise.all([
    supabase.from('professionals').select('*').eq('id', professionalId).single(),
    supabase.from('employees').select('*').eq('professional_id', professionalId),
    supabase.from('appointments').select('*').eq('doctor_id', professionalId).order('created_at', { ascending: false }).limit(1000),
    supabase.from('professional_availability').select('*').eq('professional_id', professionalId),
    supabase.from('professional_services').select('*').eq('professional_id', professionalId),
    supabase.from('prescriptions').select('*, prescription_items(*)').eq('doctor_id', professionalId).order('created_at', { ascending: false }).limit(1000),
    supabase.from('lab_requests').select('*, lab_test_items(*)').eq('doctor_id', professionalId).order('created_at', { ascending: false }).limit(1000),
    supabase.from('medical_records').select('*').eq('doctor_id', professionalId).order('created_at', { ascending: false }).limit(1000)
  ])
  
  return {
    profile: profileResult.data || {},
    employees: employeesResult.data || [],
    appointments: appointmentsResult.data || [],
    availability: availabilityResult.data || [],
    services: servicesResult.data || [],
    prescriptions: prescriptionsResult.data || [],
    lab_requests: labRequestsResult.data || [],
    medical_records: medicalRecordsResult.data || []
  }
}

// =====================================================
// PATIENT DATA EXPORT
// =====================================================

/**
 * Export all patient-related data
 */
async function exportPatientData(userId: string): Promise<PatientBackupData> {
  const supabase = createAdminClient()
  
  // Fetch patient data in parallel
  const [
    profileResult,
    appointmentsResult,
    prescriptionsResult,
    labResultsResult,
    medicalRecordsResult,
    paymentsResult
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('appointments').select('*').eq('patient_id', userId).order('created_at', { ascending: false }).limit(500),
    supabase.from('prescriptions').select('*, prescription_items(*)').eq('patient_id', userId).order('created_at', { ascending: false }).limit(500),
    supabase.from('lab_requests').select('*, lab_test_items(*)').eq('patient_id', userId).order('created_at', { ascending: false }).limit(500),
    supabase.from('medical_records').select('*').eq('patient_id', userId).order('created_at', { ascending: false }).limit(500),
    supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500)
  ])
  
  return {
    profile: profileResult.data || {},
    appointments: appointmentsResult.data || [],
    prescriptions: prescriptionsResult.data || [],
    lab_results: labResultsResult.data || [],
    medical_records: medicalRecordsResult.data || [],
    payments: paymentsResult.data || []
  }
}

// =====================================================
// SETTINGS DATA EXPORT
// =====================================================

/**
 * Export user/professional settings
 */
async function exportSettingsData(userId: string, professionalId?: string): Promise<SettingsBackupData> {
  const supabase = createAdminClient()
  
  const settings: SettingsBackupData = {
    user_settings: {},
    notification_preferences: {},
    scanner_settings: {},
    pos_settings: {}
  }
  
  // User settings from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences, timezone, preferred_language')
    .eq('id', userId)
    .single()
  
  if (profile) {
    settings.user_settings = {
      timezone: profile.timezone,
      preferred_language: profile.preferred_language
    }
    settings.notification_preferences = profile.notification_preferences || {}
  }
  
  // Professional-specific settings
  if (professionalId) {
    const { data: scannerSettings } = await supabase
      .from('scanner_settings')
      .select('*')
      .eq('professional_id', professionalId)
      .single()
    
    if (scannerSettings) {
      settings.scanner_settings = scannerSettings
    }
    
    // POS settings would go here
  }
  
  return settings
}

// =====================================================
// IMPORT FUNCTIONS (FOR RESTORE)
// =====================================================

/**
 * Import backup data (restore)
 * This is admin-only and should be called carefully
 */
export async function importBackupData(
  backupData: BackupData,
  options: {
    dry_run?: boolean
    selected_sections?: string[]
  } = {}
): Promise<{
  restored_counts: Record<string, number>
  errors: string[]
  warnings: string[]
}> {
  const supabase = createAdminClient()
  const restored_counts: Record<string, number> = {}
  const errors: string[] = []
  const warnings: string[] = []
  
  if (options.dry_run) {
    // Just count what would be restored
    if (backupData.pharmacy) {
      restored_counts['pharmacy_products'] = backupData.pharmacy.products.length
      restored_counts['pharmacy_stock'] = backupData.pharmacy.stock.length
      restored_counts['pos_sales'] = backupData.pharmacy.sales.length
      restored_counts['chifa_invoices'] = backupData.pharmacy.chifa_invoices.length
      restored_counts['accounting_entries'] = backupData.pharmacy.accounting_entries.length
    }
    if (backupData.professional) {
      restored_counts['appointments'] = backupData.professional.appointments.length
      restored_counts['prescriptions'] = backupData.professional.prescriptions.length
      restored_counts['employees'] = backupData.professional.employees.length
    }
    if (backupData.patient) {
      restored_counts['patient_appointments'] = backupData.patient.appointments.length
      restored_counts['patient_prescriptions'] = backupData.patient.prescriptions.length
    }
    return { restored_counts, errors, warnings }
  }
  
  // Actual restore - this is complex and needs careful handling
  // For now, just return a warning
  warnings.push('Full restore requires admin supervision. Contact support.')
  
  // TODO: Implement actual restore logic with:
  // - Conflict resolution (skip existing, overwrite, merge)
  // - Transaction support
  // - Foreign key handling
  // - Audit logging
  
  return { restored_counts, errors, warnings }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Estimate backup size before creating
 */
export async function estimateBackupSize(
  userId: string,
  backupType: BackupType,
  professionalId?: string
): Promise<number> {
  // Rough estimation based on row counts
  const supabase = createAdminClient()
  let estimatedBytes = 0
  
  if (backupType === 'full' || backupType === 'pharmacy') {
    if (professionalId) {
      const { count: productCount } = await supabase
        .from('pharmacy_products')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', professionalId)
      
      const { count: salesCount } = await supabase
        .from('pos_sales')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', professionalId)
      
      // Rough estimate: 500 bytes per product, 200 bytes per sale
      estimatedBytes += (productCount || 0) * 500
      estimatedBytes += (salesCount || 0) * 200
    }
  }
  
  if (backupType === 'full' || backupType === 'professional') {
    if (professionalId) {
      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', professionalId)
      
      // Rough estimate: 300 bytes per appointment
      estimatedBytes += (appointmentCount || 0) * 300
    }
  }
  
  if (backupType === 'full' || backupType === 'patient') {
    const { count: appointmentCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', userId)
    
    // Rough estimate: 300 bytes per appointment
    estimatedBytes += (appointmentCount || 0) * 300
  }
  
  // Add overhead for JSON structure
  estimatedBytes = Math.ceil(estimatedBytes * 1.2)
  
  return estimatedBytes
}

/**
 * Get data summary for backup preview
 */
export async function getBackupDataSummary(
  userId: string,
  backupType: BackupType,
  professionalId?: string
): Promise<Record<string, number>> {
  const supabase = createAdminClient()
  const summary: Record<string, number> = {}
  
  if (professionalId) {
    // Pharmacy counts
    const { count: products } = await supabase
      .from('pharmacy_products')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', professionalId)
    summary['Products'] = products || 0
    
    const { count: sales } = await supabase
      .from('pos_sales')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', professionalId)
    summary['Sales'] = sales || 0
    
    const { count: appointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', professionalId)
    summary['Appointments'] = appointments || 0
    
    const { count: employees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
    summary['Employees'] = employees || 0
  }
  
  return summary
}

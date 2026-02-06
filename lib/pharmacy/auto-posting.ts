// ============================================================================
// AUTO-POSTING SERVICE
// Creates accounting journal entries from POS sales, purchases, etc.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

interface AutoPostResult {
  success: boolean
  entry_id?: string
  entry_number?: string
  error?: string
}

// Auto-post a POS sale to accounting
export async function autoPostPOSSale(saleId: string): Promise<AutoPostResult> {
  try {
    const supabase = await createAdminClient()

    // Get sale with items
    const { data: sale, error: saleError } = await supabase
      .from('pos_sales')
      .select(`
        *,
        items:pos_sale_items(*)
      `)
      .eq('id', saleId)
      .single()

    if (saleError || !sale) {
      return { success: false, error: 'Sale not found' }
    }

    if (sale.status !== 'completed') {
      return { success: false, error: 'Sale not completed' }
    }

    const pharmacyId = sale.pharmacy_id

    // Get journal type for sales (VT)
    const { data: journalType } = await supabase
      .from('accounting_journal_types')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('code', 'VT')
      .single()

    if (!journalType) {
      return { success: false, error: 'Sales journal not found' }
    }

    // Get current fiscal year
    const { data: fiscalYear } = await supabase
      .from('accounting_fiscal_years')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_current', true)
      .single()

    // Generate entry number
    const { data: entryNumber } = await supabase
      .rpc('generate_journal_entry_number', {
        p_pharmacy_id: pharmacyId,
        p_journal_code: 'VT'
      })

    // Get accounts
    const { data: accounts } = await supabase
      .from('accounting_accounts')
      .select('id, code')
      .eq('pharmacy_id', pharmacyId)
      .in('code', ['531', '512', '4113', '4114', '4115', '7001', '7002', '4457'])

    const accountMap = new Map(accounts?.map(a => [a.code, a.id]) || [])

    // Calculate amounts per category
    let medicationSales = 0
    let parapharmacySales = 0
    let tvaCollected = 0

    for (const item of (sale.items || [])) {
      // For now, consider all as medication sales
      // In production, would check category
      medicationSales += item.line_total - (item.tva_amount || 0)
      tvaCollected += item.tva_amount || 0
    }

    // Build journal lines
    const lines: any[] = []
    let lineNumber = 1

    // Debit: Cash received (531)
    if (sale.paid_cash > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: accountMap.get('531'),
        account_code: '531',
        description: `Encaissement espèces - ${sale.sale_number}`,
        debit_amount: sale.paid_cash,
        credit_amount: 0
      })
    }

    // Debit: Card payment (512 - simplified, should be card receivable)
    if (sale.paid_card > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: accountMap.get('512'),
        account_code: '512',
        description: `Encaissement carte - ${sale.sale_number}`,
        debit_amount: sale.paid_card,
        credit_amount: 0
      })
    }

    // Debit: CNAS receivable (4113)
    if (sale.chifa_total > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: accountMap.get('4113'),
        account_code: '4113',
        description: `Créance CNAS - ${sale.sale_number}`,
        debit_amount: sale.chifa_total,
        credit_amount: 0,
        third_party_type: 'cnas'
      })
    }

    // Credit: Medication sales (7001)
    if (medicationSales > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: accountMap.get('7001'),
        account_code: '7001',
        description: `Ventes médicaments - ${sale.sale_number}`,
        debit_amount: 0,
        credit_amount: medicationSales
      })
    }

    // Credit: Parapharmacy sales (7002)
    if (parapharmacySales > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: accountMap.get('7002'),
        account_code: '7002',
        description: `Ventes parapharmacie - ${sale.sale_number}`,
        debit_amount: 0,
        credit_amount: parapharmacySales
      })
    }

    // Credit: TVA collected (4457)
    if (tvaCollected > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: accountMap.get('4457'),
        account_code: '4457',
        description: `TVA collectée - ${sale.sale_number}`,
        debit_amount: 0,
        credit_amount: tvaCollected
      })
    }

    // Calculate totals
    const totalDebit = lines.reduce((sum, l) => sum + l.debit_amount, 0)
    const totalCredit = lines.reduce((sum, l) => sum + l.credit_amount, 0)

    // Validate balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { 
        success: false, 
        error: `Entry not balanced: Debit ${totalDebit} ≠ Credit ${totalCredit}` 
      }
    }

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('accounting_journal_entries')
      .insert({
        pharmacy_id: pharmacyId,
        entry_number: entryNumber,
        journal_type_id: journalType.id,
        fiscal_year_id: fiscalYear?.id,
        entry_date: sale.created_at.split('T')[0],
        description: `Vente ${sale.sale_number}${sale.customer_name ? ` - ${sale.customer_name}` : ''}`,
        reference_type: 'pos_sale',
        reference_id: saleId,
        reference_number: sale.sale_number,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'posted', // Auto-post immediately
        posted_at: new Date().toISOString(),
        is_auto_generated: true
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Create lines
    const linesToInsert = lines.map(line => ({
      ...line,
      entry_id: entry.id
    }))

    const { error: linesError } = await supabase
      .from('accounting_journal_lines')
      .insert(linesToInsert)

    if (linesError) throw linesError

    // Update TVA tracking
    await updateTVATracking(supabase, pharmacyId, sale.created_at, 'collectee', tvaCollected, 0)

    return { 
      success: true, 
      entry_id: entry.id, 
      entry_number: entry.entry_number 
    }

  } catch (error: any) {
    console.error('Auto-post POS sale error:', error)
    return { success: false, error: error.message }
  }
}

// Auto-post Chifa payment to accounting
export async function autoPostChifaPayment(bordereauId: string): Promise<AutoPostResult> {
  try {
    const supabase = await createAdminClient()

    // Get bordereau
    const { data: bordereau, error: bordereauError } = await supabase
      .from('chifa_bordereaux')
      .select('*')
      .eq('id', bordereauId)
      .single()

    if (bordereauError || !bordereau) {
      return { success: false, error: 'Bordereau not found' }
    }

    if (!bordereau.amount_paid || bordereau.amount_paid <= 0) {
      return { success: false, error: 'No payment recorded' }
    }

    const pharmacyId = bordereau.pharmacy_id

    // Get journal type for bank (BQ)
    const { data: journalType } = await supabase
      .from('accounting_journal_types')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('code', 'BQ')
      .single()

    if (!journalType) {
      return { success: false, error: 'Bank journal not found' }
    }

    // Get fiscal year
    const { data: fiscalYear } = await supabase
      .from('accounting_fiscal_years')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_current', true)
      .single()

    // Generate entry number
    const { data: entryNumber } = await supabase
      .rpc('generate_journal_entry_number', {
        p_pharmacy_id: pharmacyId,
        p_journal_code: 'BQ'
      })

    // Get accounts
    const { data: accounts } = await supabase
      .from('accounting_accounts')
      .select('id, code')
      .eq('pharmacy_id', pharmacyId)
      .in('code', ['512', '4113', '4114', '4115'])

    const accountMap = new Map(accounts?.map(a => [a.code, a.id]) || [])

    // Determine receivable account based on insurance type
    const receivableAccount = bordereau.insurance_type === 'CASNOS' ? '4114' : 
                              bordereau.insurance_type === 'CVM' ? '4115' : '4113'

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('accounting_journal_entries')
      .insert({
        pharmacy_id: pharmacyId,
        entry_number: entryNumber,
        journal_type_id: journalType.id,
        fiscal_year_id: fiscalYear?.id,
        entry_date: bordereau.payment_date || new Date().toISOString().split('T')[0],
        description: `Règlement ${bordereau.insurance_type} - ${bordereau.bordereau_number}`,
        reference_type: 'chifa_payment',
        reference_id: bordereauId,
        reference_number: bordereau.bordereau_number,
        total_debit: bordereau.amount_paid,
        total_credit: bordereau.amount_paid,
        status: 'posted',
        posted_at: new Date().toISOString(),
        is_auto_generated: true
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Create lines
    const lines = [
      {
        entry_id: entry.id,
        line_number: 1,
        account_id: accountMap.get('512'),
        account_code: '512',
        description: `Encaissement ${bordereau.insurance_type}`,
        debit_amount: bordereau.amount_paid,
        credit_amount: 0
      },
      {
        entry_id: entry.id,
        line_number: 2,
        account_id: accountMap.get(receivableAccount),
        account_code: receivableAccount,
        description: `Règlement créance ${bordereau.insurance_type}`,
        debit_amount: 0,
        credit_amount: bordereau.amount_paid,
        third_party_type: bordereau.insurance_type.toLowerCase()
      }
    ]

    const { error: linesError } = await supabase
      .from('accounting_journal_lines')
      .insert(lines)

    if (linesError) throw linesError

    return { 
      success: true, 
      entry_id: entry.id, 
      entry_number: entry.entry_number 
    }

  } catch (error: any) {
    console.error('Auto-post Chifa payment error:', error)
    return { success: false, error: error.message }
  }
}

// Helper: Update TVA tracking
async function updateTVATracking(
  supabase: any, 
  pharmacyId: string, 
  date: string, 
  tvaType: 'collectee' | 'deductible',
  tva19Amount: number,
  tva9Amount: number
) {
  const dateObj = new Date(date)
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1

  // Upsert TVA entry
  const { data: existing } = await supabase
    .from('accounting_tva_entries')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('period_year', year)
    .eq('period_month', month)
    .eq('tva_type', tvaType)
    .single()

  if (existing) {
    // Update existing
    await supabase
      .from('accounting_tva_entries')
      .update({
        tva_19_amount: (existing.tva_19_amount || 0) + tva19Amount,
        tva_9_amount: (existing.tva_9_amount || 0) + tva9Amount,
        total_tva: (existing.total_tva || 0) + tva19Amount + tva9Amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Create new
    await supabase
      .from('accounting_tva_entries')
      .insert({
        pharmacy_id: pharmacyId,
        period_year: year,
        period_month: month,
        tva_type: tvaType,
        tva_19_amount: tva19Amount,
        tva_9_amount: tva9Amount,
        total_tva: tva19Amount + tva9Amount,
        status: 'open'
      })
  }
}

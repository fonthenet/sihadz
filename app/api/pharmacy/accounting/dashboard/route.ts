import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/accounting/dashboard - Get accounting dashboard stats
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Get current fiscal year
    const { data: fiscalYear } = await supabase
      .from('accounting_fiscal_years')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_current', true)
      .single()

    // Helper: Get account balance
    const getAccountBalance = async (accountCodePrefix: string, dateEnd?: string) => {
      const { data } = await supabase
        .from('accounting_journal_lines')
        .select(`
          debit_amount,
          credit_amount,
          entry:accounting_journal_entries!inner(
            id, pharmacy_id, status, entry_date
          )
        `)
        .eq('entry.pharmacy_id', pharmacyId)
        .eq('entry.status', 'posted')
        .like('account_code', `${accountCodePrefix}%`)
        .lte('entry.entry_date', dateEnd || endOfMonth)

      let balance = 0
      data?.forEach((line: any) => {
        balance += (line.debit_amount || 0) - (line.credit_amount || 0)
      })
      return balance
    }

    // Get monthly totals for class 7 (revenue) and class 6 (expenses)
    const getMonthlyClassTotal = async (classPrefix: string) => {
      const { data } = await supabase
        .from('accounting_journal_lines')
        .select(`
          debit_amount,
          credit_amount,
          entry:accounting_journal_entries!inner(
            id, pharmacy_id, status, entry_date
          )
        `)
        .eq('entry.pharmacy_id', pharmacyId)
        .eq('entry.status', 'posted')
        .like('account_code', `${classPrefix}%`)
        .gte('entry.entry_date', startOfMonth)
        .lte('entry.entry_date', endOfMonth)

      let total = 0
      data?.forEach((line: any) => {
        // For class 7 (revenue): credit increases
        // For class 6 (expenses): debit increases
        if (classPrefix === '7') {
          total += (line.credit_amount || 0) - (line.debit_amount || 0)
        } else {
          total += (line.debit_amount || 0) - (line.credit_amount || 0)
        }
      })
      return total
    }

    // Calculate stats
    const [
      total_revenue,
      total_expenses,
      cash_balance,
      bank_balance,
      client_receivables,
      cnas_receivables,
      casnos_receivables,
      supplier_payables
    ] = await Promise.all([
      getMonthlyClassTotal('7'),
      getMonthlyClassTotal('6'),
      getAccountBalance('53'),  // Caisse
      getAccountBalance('51'),  // Banque
      getAccountBalance('411'), // Clients
      getAccountBalance('4113'), // CNAS
      getAccountBalance('4114'), // CASNOS
      getAccountBalance('401')  // Fournisseurs (will be negative = credit balance)
    ])

    // Unposted entries
    const { count: unposted_entries } = await supabase
      .from('accounting_journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'draft')

    // Entries this month
    const { count: entries_this_month } = await supabase
      .from('accounting_journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .gte('entry_date', startOfMonth)
      .lte('entry_date', endOfMonth)

    // TVA this month (from TVA entries table or calculate from lines)
    const { data: tvaData } = await supabase
      .from('accounting_tva_entries')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('period_year', now.getFullYear())
      .eq('period_month', now.getMonth() + 1)

    const tva_collectee = tvaData?.find(t => t.tva_type === 'collectee')
    const tva_deductible = tvaData?.find(t => t.tva_type === 'deductible')

    const tva_collectee_month = tva_collectee?.total_tva || 0
    const tva_deductible_month = tva_deductible?.total_tva || 0
    const tva_net_month = tva_collectee_month - tva_deductible_month

    return NextResponse.json({
      // Period
      fiscal_year: fiscalYear?.name,
      period: `${startOfMonth} to ${endOfMonth}`,
      
      // P&L
      total_revenue,
      total_expenses,
      net_result: total_revenue - total_expenses,
      
      // Cash position
      cash_balance,
      bank_balance,
      total_cash: cash_balance + bank_balance,
      
      // Receivables
      client_receivables,
      cnas_receivables,
      casnos_receivables,
      total_receivables: client_receivables + cnas_receivables + casnos_receivables,
      
      // Payables
      supplier_payables: Math.abs(supplier_payables), // Show as positive
      
      // TVA
      tva_collectee_month,
      tva_deductible_month,
      tva_net_month,
      
      // Entries
      unposted_entries: unposted_entries || 0,
      entries_this_month: entries_this_month || 0
    })

  } catch (error: any) {
    console.error('Error fetching accounting dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

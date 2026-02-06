import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/accounting/reports - Generate accounting reports
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const report_type = searchParams.get('type') // trial_balance, income_statement, balance_sheet, general_ledger, g50
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!report_type) {
      return NextResponse.json({ error: 'Report type required' }, { status: 400 })
    }

    switch (report_type) {
      case 'trial_balance':
        return generateTrialBalance(supabase, pharmacyId, start_date, end_date)
      case 'income_statement':
        return generateIncomeStatement(supabase, pharmacyId, start_date, end_date)
      case 'balance_sheet':
        return generateBalanceSheet(supabase, pharmacyId, end_date)
      case 'general_ledger':
        const account_code = searchParams.get('account_code')
        return generateGeneralLedger(supabase, pharmacyId, account_code, start_date, end_date)
      case 'g50':
        return generateG50Summary(supabase, pharmacyId, parseInt(year || '2026'), parseInt(month || '1'))
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Trial Balance (Balance Générale)
async function generateTrialBalance(supabase: any, pharmacyId: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date()
  const start = startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const end = endDate || now.toISOString().split('T')[0]

  // Get all accounts
  const { data: accounts } = await supabase
    .from('accounting_accounts')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('is_active', true)
    .eq('is_detail', true)
    .order('code')

  // Get all posted lines in period
  const { data: lines } = await supabase
    .from('accounting_journal_lines')
    .select(`
      account_code,
      debit_amount,
      credit_amount,
      entry:accounting_journal_entries!inner(
        id, pharmacy_id, status, entry_date
      )
    `)
    .eq('entry.pharmacy_id', pharmacyId)
    .eq('entry.status', 'posted')
    .gte('entry.entry_date', start)
    .lte('entry.entry_date', end)

  // Get opening balances (before start date)
  const { data: openingLines } = await supabase
    .from('accounting_journal_lines')
    .select(`
      account_code,
      debit_amount,
      credit_amount,
      entry:accounting_journal_entries!inner(
        id, pharmacy_id, status, entry_date
      )
    `)
    .eq('entry.pharmacy_id', pharmacyId)
    .eq('entry.status', 'posted')
    .lt('entry.entry_date', start)

  // Build maps
  const openingMap = new Map<string, { debit: number; credit: number }>()
  openingLines?.forEach((line: any) => {
    const existing = openingMap.get(line.account_code) || { debit: 0, credit: 0 }
    existing.debit += line.debit_amount || 0
    existing.credit += line.credit_amount || 0
    openingMap.set(line.account_code, existing)
  })

  const periodMap = new Map<string, { debit: number; credit: number }>()
  lines?.forEach((line: any) => {
    const existing = periodMap.get(line.account_code) || { debit: 0, credit: 0 }
    existing.debit += line.debit_amount || 0
    existing.credit += line.credit_amount || 0
    periodMap.set(line.account_code, existing)
  })

  // Build rows
  const rows = accounts?.map((acc: any) => {
    const opening = openingMap.get(acc.code) || { debit: 0, credit: 0 }
    const period = periodMap.get(acc.code) || { debit: 0, credit: 0 }
    
    return {
      account_code: acc.code,
      account_name: acc.name,
      account_class: acc.account_class,
      opening_debit: opening.debit,
      opening_credit: opening.credit,
      period_debit: period.debit,
      period_credit: period.credit,
      closing_debit: opening.debit + period.debit,
      closing_credit: opening.credit + period.credit
    }
  }).filter((row: any) => 
    row.opening_debit > 0 || row.opening_credit > 0 || 
    row.period_debit > 0 || row.period_credit > 0
  ) || []

  // Calculate totals
  const totals = rows.reduce((acc: any, row: any) => ({
    opening_debit: acc.opening_debit + row.opening_debit,
    opening_credit: acc.opening_credit + row.opening_credit,
    period_debit: acc.period_debit + row.period_debit,
    period_credit: acc.period_credit + row.period_credit,
    closing_debit: acc.closing_debit + row.closing_debit,
    closing_credit: acc.closing_credit + row.closing_credit
  }), {
    opening_debit: 0, opening_credit: 0,
    period_debit: 0, period_credit: 0,
    closing_debit: 0, closing_credit: 0
  })

  return NextResponse.json({
    report_type: 'trial_balance',
    pharmacy_id: pharmacyId,
    period_start: start,
    period_end: end,
    rows,
    totals
  })
}

// Income Statement (Compte de Résultat)
async function generateIncomeStatement(supabase: any, pharmacyId: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date()
  const start = startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const end = endDate || now.toISOString().split('T')[0]

  const getClassTotal = async (accountCodeStart: string, isCredit: boolean) => {
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
      .like('account_code', `${accountCodeStart}%`)
      .gte('entry.entry_date', start)
      .lte('entry.entry_date', end)

    let total = 0
    data?.forEach((line: any) => {
      if (isCredit) {
        total += (line.credit_amount || 0) - (line.debit_amount || 0)
      } else {
        total += (line.debit_amount || 0) - (line.credit_amount || 0)
      }
    })
    return total
  }

  // Revenue (Class 7)
  const sales_medications = await getClassTotal('7001', true)
  const sales_parapharmacy = await getClassTotal('7002', true)
  const other_revenue = await getClassTotal('75', true)
  const financial_income = await getClassTotal('76', true)
  const total_revenue = sales_medications + sales_parapharmacy + other_revenue + financial_income

  // Expenses (Class 6)
  const purchases = await getClassTotal('600', false)
  const stock_variation = await getClassTotal('603', false)
  const external_services = await getClassTotal('61', false) + await getClassTotal('62', false)
  const personnel = await getClassTotal('63', false)
  const taxes = await getClassTotal('64', false)
  const depreciation = await getClassTotal('68', false)
  const financial_charges = await getClassTotal('66', false)
  const other_expenses = await getClassTotal('65', false)
  const total_expenses = purchases + stock_variation + external_services + personnel + taxes + depreciation + financial_charges + other_expenses

  // Results
  const gross_margin = total_revenue - purchases - stock_variation
  const operating_result = gross_margin - external_services - personnel - taxes - depreciation - other_expenses
  const net_result_before_tax = operating_result + financial_income - financial_charges
  const income_tax = await getClassTotal('695', false)
  const net_result = net_result_before_tax - income_tax

  return NextResponse.json({
    report_type: 'income_statement',
    pharmacy_id: pharmacyId,
    period_start: start,
    period_end: end,
    revenue: {
      sales_medications,
      sales_parapharmacy,
      other_revenue,
      financial_income,
      total_revenue
    },
    expenses: {
      purchases,
      stock_variation,
      external_services,
      personnel,
      taxes,
      depreciation,
      financial_charges,
      other_expenses,
      total_expenses
    },
    results: {
      gross_margin,
      operating_result,
      net_result_before_tax,
      income_tax,
      net_result
    }
  })
}

// Balance Sheet (Bilan)
async function generateBalanceSheet(supabase: any, pharmacyId: string, asOfDate?: string | null) {
  const end = asOfDate || new Date().toISOString().split('T')[0]

  const getClassBalance = async (accountCodeStart: string) => {
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
      .like('account_code', `${accountCodeStart}%`)
      .lte('entry.entry_date', end)

    let balance = 0
    data?.forEach((line: any) => {
      balance += (line.debit_amount || 0) - (line.credit_amount || 0)
    })
    return balance
  }

  // Assets
  const fixed_assets = await getClassBalance('2')
  const inventory = await getClassBalance('3')
  const receivables_411 = await getClassBalance('411')
  const receivables_other = await getClassBalance('46')
  const receivables = receivables_411 + receivables_other
  const cash_bank = await getClassBalance('5')
  const total_assets = fixed_assets + inventory + receivables + cash_bank

  // Equity (Class 1)
  const equity = -await getClassBalance('1') // Credit balance shown positive

  // Payables (Class 4 - credit side)
  const suppliers = -await getClassBalance('40')
  const other_payables = -await getClassBalance('43') - await getClassBalance('44')
  const total_payables = suppliers + other_payables

  return NextResponse.json({
    report_type: 'balance_sheet',
    pharmacy_id: pharmacyId,
    as_of_date: end,
    assets: {
      fixed_assets,
      inventory,
      receivables,
      cash_bank,
      total: total_assets
    },
    liabilities: {
      equity,
      suppliers,
      other_payables,
      total_payables,
      total: equity + total_payables
    }
  })
}

// General Ledger (Grand Livre)
async function generateGeneralLedger(supabase: any, pharmacyId: string, accountCode?: string | null, startDate?: string | null, endDate?: string | null) {
  if (!accountCode) {
    return NextResponse.json({ error: 'Account code required for general ledger' }, { status: 400 })
  }

  const now = new Date()
  const start = startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const end = endDate || now.toISOString().split('T')[0]

  // Get account
  const { data: account } = await supabase
    .from('accounting_accounts')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('code', accountCode)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Get opening balance
  const { data: openingLines } = await supabase
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
    .eq('account_code', accountCode)
    .lt('entry.entry_date', start)

  let opening_balance = 0
  openingLines?.forEach((line: any) => {
    if (account.normal_balance === 'debit') {
      opening_balance += (line.debit_amount || 0) - (line.credit_amount || 0)
    } else {
      opening_balance += (line.credit_amount || 0) - (line.debit_amount || 0)
    }
  })

  // Get period entries
  const { data: periodLines } = await supabase
    .from('accounting_journal_lines')
    .select(`
      *,
      entry:accounting_journal_entries!inner(
        id, pharmacy_id, status, entry_date, entry_number, description
      )
    `)
    .eq('entry.pharmacy_id', pharmacyId)
    .eq('entry.status', 'posted')
    .eq('account_code', accountCode)
    .gte('entry.entry_date', start)
    .lte('entry.entry_date', end)
    .order('entry.entry_date')

  let running_balance = opening_balance
  const entries = periodLines?.map((line: any) => {
    const debit = line.debit_amount || 0
    const credit = line.credit_amount || 0
    
    if (account.normal_balance === 'debit') {
      running_balance += debit - credit
    } else {
      running_balance += credit - debit
    }

    return {
      entry_date: line.entry.entry_date,
      entry_number: line.entry.entry_number,
      description: line.description || line.entry.description,
      debit,
      credit,
      balance: running_balance
    }
  }) || []

  const total_debit = entries.reduce((sum: number, e: any) => sum + e.debit, 0)
  const total_credit = entries.reduce((sum: number, e: any) => sum + e.credit, 0)

  return NextResponse.json({
    report_type: 'general_ledger',
    pharmacy_id: pharmacyId,
    period_start: start,
    period_end: end,
    account_code: accountCode,
    account_name: account.name,
    opening_balance,
    entries,
    closing_balance: running_balance,
    total_debit,
    total_credit
  })
}

// G50 Summary
async function generateG50Summary(supabase: any, pharmacyId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  // Get TVA entries for the period
  const { data: tvaEntries } = await supabase
    .from('accounting_tva_entries')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('period_year', year)
    .eq('period_month', month)

  const collectee = tvaEntries?.find((t: any) => t.tva_type === 'collectee')
  const deductible = tvaEntries?.find((t: any) => t.tva_type === 'deductible')

  const tva_collectee_19 = collectee?.tva_19_amount || 0
  const tva_collectee_9 = collectee?.tva_9_amount || 0
  const total_collectee = tva_collectee_19 + tva_collectee_9

  const tva_deductible_19 = deductible?.tva_19_amount || 0
  const tva_deductible_9 = deductible?.tva_9_amount || 0
  const total_deductible = tva_deductible_19 + tva_deductible_9

  const net = total_collectee - total_deductible

  return NextResponse.json({
    report_type: 'g50',
    pharmacy_id: pharmacyId,
    period_year: year,
    period_month: month,
    period: `${year}-${String(month).padStart(2, '0')}`,
    tva_collectee: {
      tva_19: tva_collectee_19,
      tva_9: tva_collectee_9,
      total: total_collectee
    },
    tva_deductible: {
      tva_19: tva_deductible_19,
      tva_9: tva_deductible_9,
      total: total_deductible
    },
    tva_a_decaisser: net > 0 ? net : 0,
    credit_tva: net < 0 ? Math.abs(net) : 0,
    status: collectee?.status || 'open',
    g50_reference: collectee?.g50_reference
  })
}

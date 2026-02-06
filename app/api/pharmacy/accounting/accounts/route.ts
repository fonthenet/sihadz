import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/accounting/accounts - List chart of accounts
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const account_class = searchParams.get('class')
    const account_type = searchParams.get('type')
    const is_detail = searchParams.get('detail')
    const with_balances = searchParams.get('with_balances') === 'true'

    let query = supabase
      .from('accounting_accounts')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .order('code')

    if (account_class) {
      query = query.eq('account_class', parseInt(account_class))
    }
    if (account_type) {
      query = query.eq('account_type', account_type)
    }
    if (is_detail === 'true') {
      query = query.eq('is_detail', true)
    }

    const { data: accounts, error } = await query

    if (error) throw error

    // Calculate balances if requested
    if (with_balances && accounts) {
      const { data: lines } = await supabase
        .from('accounting_journal_lines')
        .select(`
          account_code,
          debit_amount,
          credit_amount,
          entry:accounting_journal_entries!inner(
            id, pharmacy_id, status
          )
        `)
        .eq('entry.pharmacy_id', pharmacyId)
        .eq('entry.status', 'posted')

      // Build balance map
      const balanceMap = new Map<string, { debit: number; credit: number }>()
      lines?.forEach((line: any) => {
        const existing = balanceMap.get(line.account_code) || { debit: 0, credit: 0 }
        existing.debit += line.debit_amount || 0
        existing.credit += line.credit_amount || 0
        balanceMap.set(line.account_code, existing)
      })

      // Attach balances to accounts
      accounts.forEach((acc: any) => {
        const bal = balanceMap.get(acc.code)
        if (bal) {
          acc.debit_total = bal.debit
          acc.credit_total = bal.credit
          // Balance depends on normal_balance
          if (acc.normal_balance === 'debit') {
            acc.balance = bal.debit - bal.credit
          } else {
            acc.balance = bal.credit - bal.debit
          }
        } else {
          acc.debit_total = 0
          acc.credit_total = 0
          acc.balance = 0
        }
      })
    }

    return NextResponse.json({ accounts })

  } catch (error: any) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pharmacy/accounting/accounts - Create custom account
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body = await request.json()

    // Validate account class
    const accountClass = parseInt(body.code.charAt(0))
    if (isNaN(accountClass) || accountClass < 1 || accountClass > 7) {
      return NextResponse.json({ 
        error: 'Account code must start with digit 1-7' 
      }, { status: 400 })
    }

    // Determine account type from class
    let account_type: string
    let normal_balance: string
    switch (accountClass) {
      case 1:
        account_type = 'equity'
        normal_balance = 'credit'
        break
      case 2:
      case 3:
      case 5:
        account_type = 'asset'
        normal_balance = 'debit'
        break
      case 4:
        // Class 4 can be asset (receivables) or liability (payables)
        account_type = body.account_type || 'asset'
        normal_balance = account_type === 'asset' ? 'debit' : 'credit'
        break
      case 6:
        account_type = 'expense'
        normal_balance = 'debit'
        break
      case 7:
        account_type = 'revenue'
        normal_balance = 'credit'
        break
      default:
        account_type = 'asset'
        normal_balance = 'debit'
    }

    const { data: account, error } = await supabase
      .from('accounting_accounts')
      .insert({
        pharmacy_id: pharmacyId,
        code: body.code,
        name: body.name,
        name_ar: body.name_ar,
        account_class: accountClass,
        account_type,
        parent_code: body.parent_code,
        normal_balance,
        is_detail: body.is_detail ?? true,
        tva_applicable: body.tva_applicable ?? false,
        default_tva_rate: body.default_tva_rate,
        account_subtype: body.account_subtype,
        is_active: true,
        is_system: false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(account, { status: 201 })

  } catch (error: any) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

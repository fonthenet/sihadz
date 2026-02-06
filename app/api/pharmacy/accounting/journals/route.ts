import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { JournalEntryFormData } from '@/lib/pharmacy/accounting-types'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

// GET /api/pharmacy/accounting/journals - List journal entries
export async function GET(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const journal_code = searchParams.get('journal_code')
    const status = searchParams.get('status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const account_code = searchParams.get('account_code')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('accounting_journal_entries')
      .select(`
        *,
        journal_type:accounting_journal_types(id, code, name),
        lines:accounting_journal_lines(
          *,
          account:accounting_accounts(id, code, name)
        )
      `, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false })
      .range(offset, offset + limit - 1)

    if (journal_code) {
      query = query.eq('journal_type.code', journal_code)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (start_date) {
      query = query.gte('entry_date', start_date)
    }
    if (end_date) {
      query = query.lte('entry_date', end_date)
    }

    const { data: entries, error, count } = await query

    if (error) throw error

    // Filter by account if specified
    let filteredEntries = entries
    if (account_code && entries) {
      filteredEntries = entries.filter(entry =>
        entry.lines?.some((line: any) => line.account_code.startsWith(account_code))
      )
    }

    return NextResponse.json({
      entries: filteredEntries,
      total: account_code ? filteredEntries?.length : count,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    })

  } catch (error: any) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pharmacy/accounting/journals - Create journal entry
export async function POST(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body: JournalEntryFormData = await request.json()

    // Validate: debits must equal credits
    const totalDebit = body.lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0)
    const totalCredit = body.lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ 
        error: `Entry not balanced: Debit ${totalDebit} ≠ Credit ${totalCredit}` 
      }, { status: 400 })
    }

    // Get journal type
    const { data: journalType } = await supabase
      .from('accounting_journal_types')
      .select('id, code')
      .eq('pharmacy_id', pharmacyId)
      .eq('code', body.journal_type_code)
      .single()

    if (!journalType) {
      return NextResponse.json({ error: 'Journal type not found' }, { status: 404 })
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
        p_journal_code: body.journal_type_code
      })

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('accounting_journal_entries')
      .insert({
        pharmacy_id: pharmacyId,
        entry_number: entryNumber,
        journal_type_id: journalType.id,
        fiscal_year_id: fiscalYear?.id,
        entry_date: body.entry_date,
        description: body.description,
        reference_type: body.reference_type,
        reference_number: body.reference_number,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft',
        is_auto_generated: false,
        created_by: auth.actorId
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Get accounts
    const accountCodes = body.lines.map(l => l.account_code)
    const { data: accounts } = await supabase
      .from('accounting_accounts')
      .select('id, code')
      .eq('pharmacy_id', pharmacyId)
      .in('code', accountCodes)

    const accountMap = new Map(accounts?.map(a => [a.code, a.id]) || [])

    // Create lines
    const linesToInsert = body.lines.map((line, idx) => ({
      entry_id: entry.id,
      line_number: idx + 1,
      account_id: accountMap.get(line.account_code),
      account_code: line.account_code,
      description: line.description,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
      third_party_type: line.third_party_type,
      third_party_id: line.third_party_id,
      third_party_name: line.third_party_name,
      due_date: line.due_date
    }))

    const { error: linesError } = await supabase
      .from('accounting_journal_lines')
      .insert(linesToInsert)

    if (linesError) throw linesError

    // Fetch complete entry
    const { data: completeEntry } = await supabase
      .from('accounting_journal_entries')
      .select(`
        *,
        journal_type:accounting_journal_types(id, code, name),
        lines:accounting_journal_lines(
          *,
          account:accounting_accounts(id, code, name)
        )
      `)
      .eq('id', entry.id)
      .single()

    return NextResponse.json(completeEntry, { status: 201 })

  } catch (error: any) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/pharmacy/accounting/journals - Post or cancel entry
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const pharmacyId = auth.pharmacyId

    const supabase = createAdminClient()
    const body = await request.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    // Get current entry
    const { data: entry, error: fetchError } = await supabase
      .from('accounting_journal_entries')
      .select('*')
      .eq('id', id)
      .eq('pharmacy_id', pharmacyId)
      .single()

    if (fetchError) throw fetchError
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    let updateData: any = { updated_at: new Date().toISOString() }

    switch (action) {
      case 'post':
        if (entry.status !== 'draft') {
          return NextResponse.json({ error: 'Can only post draft entries' }, { status: 400 })
        }
        updateData.status = 'posted'
        updateData.posted_at = new Date().toISOString()
        updateData.posted_by = auth.actorId
        break

      case 'cancel':
        if (entry.status !== 'draft') {
          return NextResponse.json({ error: 'Can only cancel draft entries' }, { status: 400 })
        }
        updateData.status = 'cancelled'
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('accounting_journal_entries')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        journal_type:accounting_journal_types(id, code, name),
        lines:accounting_journal_lines(
          *,
          account:accounting_accounts(id, code, name)
        )
      `)
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)

  } catch (error: any) {
    console.error('Error updating journal entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

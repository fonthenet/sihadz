import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!wallet) {
      return NextResponse.json({ transactions: [] })
    }

    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('id, type, amount, balance_after, reference_type, reference_id, description, created_at')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[wallet/transactions] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      transactions: (transactions || []).map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balance_after: t.balance_after != null ? Number(t.balance_after) : null,
        reference_type: t.reference_type,
        reference_id: t.reference_id,
        description: t.description,
        created_at: t.created_at,
      })),
    })
  } catch (error: any) {
    console.error('[wallet/transactions] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

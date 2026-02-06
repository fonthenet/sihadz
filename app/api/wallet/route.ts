import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError) {
      console.error('[wallet] Error fetching wallet:', walletError)
      return NextResponse.json({ error: walletError.message }, { status: 500 })
    }

    if (!wallet) {
      const { data: newWallet, error: insertError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id })
        .select('id, balance, currency, updated_at')
        .single()
      if (insertError) {
        console.error('[wallet] Error creating wallet:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      wallet = newWallet
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance),
        currency: wallet.currency,
        updated_at: wallet.updated_at,
      },
    })
  } catch (error: any) {
    console.error('[wallet] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

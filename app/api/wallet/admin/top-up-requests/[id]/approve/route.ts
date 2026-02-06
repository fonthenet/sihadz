import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.user_type || !['admin', 'super_admin'].includes(profile.user_type)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { action } = body
    const isApprove = action === 'approve'

    const admin = createAdminClient()

    const { data: topUp, error: fetchError } = await admin
      .from('top_up_requests')
      .select('id, request_number, user_id, amount_dzd, status')
      .eq('id', requestId)
      .single()

    if (fetchError || !topUp) {
      return NextResponse.json({ error: 'Top-up request not found' }, { status: 404 })
    }
    if (topUp.status !== 'pending') {
      return NextResponse.json(
        { error: `Request already ${topUp.status}` },
        { status: 400 }
      )
    }

    if (isApprove) {
      const amount = Number(topUp.amount_dzd)
      let { data: wallet } = await admin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', topUp.user_id)
        .maybeSingle()

      if (!wallet) {
        const { data: newWallet, error: insertWallet } = await admin
          .from('wallets')
          .insert({ user_id: topUp.user_id })
          .select('id, balance')
          .single()
        if (insertWallet) {
          console.error('[wallet/approve] Insert wallet error:', insertWallet)
          return NextResponse.json({ error: insertWallet.message }, { status: 500 })
        }
        wallet = newWallet!
      }

      const newBalance = Number(wallet.balance) + amount
      const { error: updateWalletError } = await admin
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      if (updateWalletError) {
        console.error('[wallet/approve] Update wallet error:', updateWalletError)
        return NextResponse.json({ error: updateWalletError.message }, { status: 500 })
      }

      const { error: txError } = await admin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'top_up',
        amount,
        balance_after: newBalance,
        reference_type: 'top_up_request',
        reference_id: topUp.id,
        description: `Top-up approved (${topUp.request_number ?? requestId.slice(0, 8)})`,
      })

      if (txError) {
        console.error('[wallet/approve] Insert transaction error:', txError)
        return NextResponse.json({ error: txError.message }, { status: 500 })
      }
    }

    const { error: updateRequestError } = await admin
      .from('top_up_requests')
      .update({
        status: isApprove ? 'approved' : 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_notes: body.admin_notes || null,
      })
      .eq('id', requestId)

    if (updateRequestError) {
      console.error('[wallet/approve] Update request error:', updateRequestError)
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: isApprove ? 'approved' : 'rejected',
    })
  } catch (error: any) {
    console.error('[wallet/approve] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount_dzd, proof_reference } = body

    const amount = Number(amount_dzd)
    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 DZD' },
        { status: 400 }
      )
    }

    const { data: topUp, error } = await supabase
      .from('top_up_requests')
      .insert({
        user_id: user.id,
        amount_dzd: amount,
        status: 'pending',
        proof_reference: proof_reference?.trim() || null,
      })
      .select('id, request_number, amount_dzd, status, created_at')
      .single()

    if (error) {
      console.error('[wallet/top-up] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      top_up_request: {
        id: topUp.id,
        request_number: topUp.request_number ?? undefined,
        amount_dzd: Number(topUp.amount_dzd),
        status: topUp.status,
        created_at: topUp.created_at,
      },
    })
  } catch (error: any) {
    console.error('[wallet/top-up] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

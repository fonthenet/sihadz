import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requests, error } = await supabase
      .from('top_up_requests')
      .select('id, request_number, amount_dzd, status, proof_reference, created_at, processed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[wallet/my-top-up-requests] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      requests: (requests || []).map((r) => ({
        id: r.id,
        request_number: r.request_number ?? undefined,
        amount_dzd: Number(r.amount_dzd),
        status: r.status,
        proof_reference: r.proof_reference,
        created_at: r.created_at,
        processed_at: r.processed_at,
      })),
    })
  } catch (error: any) {
    console.error('[wallet/my-top-up-requests] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

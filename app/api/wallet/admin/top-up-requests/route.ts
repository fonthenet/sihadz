import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super-admin/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authError === 'Admin access required' ? 403 : 401 })
    }

    const admin = createAdminClient()
    const { data: requests, error } = await admin
      .from('top_up_requests')
      .select(`
        id,
        request_number,
        user_id,
        amount_dzd,
        status,
        proof_reference,
        admin_notes,
        created_at,
        processed_at,
        processed_by
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[wallet/admin/top-up-requests] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error: any) {
    console.error('[wallet/admin/top-up-requests] Error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
